import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  loadWatchlist,
  saveWatchlist,
  DEFAULT_WATCHLIST,
} from '../utils/storageManager';
import { fetchStocksFromAPI, searchTickers } from '../utils/apiClient';
import { loadStocksData } from '../utils/dataExport';
import {
  calculateCompositeScore,
  calculateIntrinsicValue,
  calculateIntrinsicValueScenarios,
  calculateMarginOfSafety,
  calculatePriceToFCF,
  calculateROIC,
  calculateMoatScore,
  calculateSectorAdjustedScore,
  calculateCAGR,
  calculateRiskScore,
  buildInvestmentThesis,
  calculateGrahamNumber,
  calculateFCFYield,
} from '../utils/financialCalculations';

const AppContext = createContext();

const CRITICAL_METRICS = [
  'marketCap',
  'price',
  'pe',
  'pb',
  'roe',
  'debtToEquity',
  'netMargin',
  'freeCashFlow',
  'revenueGrowth5Y',
  'currentRatio',
  'operatingIncome',
  'totalDebt',
  'totalEquity',
];

function getDataQuality(stock) {
  const availableCount = CRITICAL_METRICS.reduce((count, field) => {
    const value = stock[field];
    return count + (typeof value === 'number' && Number.isFinite(value) ? 1 : 0);
  }, 0);

  const missingFields = CRITICAL_METRICS.filter((field) => {
    const value = stock[field];
    return !(typeof value === 'number' && Number.isFinite(value));
  });

  return {
    dataQualityScore: Math.round((availableCount / CRITICAL_METRICS.length) * 100),
    missingCriticalFields: missingFields,
  };
}

export function enrichStocks(data) {
  const enrichedData = data.map((stock) => {
    const intrinsicValue = calculateIntrinsicValue(
      stock.freeCashFlow,
      0.08,
      0.10,
      10
    );

    const sharesOutstanding = stock.marketCap / stock.price;
    const intrinsicValuePerShare = sharesOutstanding > 0 ? intrinsicValue / sharesOutstanding : 0;
    const intrinsicValueScenarios = calculateIntrinsicValueScenarios(stock.freeCashFlow, 10);
    const intrinsicBearPerShare = sharesOutstanding > 0 ? intrinsicValueScenarios.bear / sharesOutstanding : 0;
    const intrinsicBasePerShare = sharesOutstanding > 0 ? intrinsicValueScenarios.base / sharesOutstanding : 0;
    const intrinsicBullPerShare = sharesOutstanding > 0 ? intrinsicValueScenarios.bull / sharesOutstanding : 0;
    const intrinsicRangeLow = sharesOutstanding > 0 ? intrinsicValueScenarios.low / sharesOutstanding : 0;
    const intrinsicRangeHigh = sharesOutstanding > 0 ? intrinsicValueScenarios.high / sharesOutstanding : 0;
    let dcfQuality = intrinsicValueScenarios.dcfQuality;

    // Sanity check : un Bear case > 2x le prix est suspect
    if (dcfQuality === 'fiable' && stock.price > 0 && intrinsicBearPerShare > 2 * stock.price) {
      dcfQuality = 'suspect';
    }

    const marginOfSafety = calculateMarginOfSafety(
      intrinsicValuePerShare,
      stock.price
    );

    const roic = calculateROIC(
      stock.operatingIncome,
      stock.totalDebt,
      stock.totalEquity
    );

    const moatScore = calculateMoatScore({
      roe: stock.roe,
      netMargin: stock.netMargin,
      revenueGrowth: stock.revenueGrowth5Y,
      freeCashFlow: stock.freeCashFlow,
    });

    const priceToFCF = calculatePriceToFCF(stock.marketCap, stock.freeCashFlow);
    const { dataQualityScore, missingCriticalFields } = getDataQuality(stock);
    const priceHistory10Y = Array.isArray(stock.priceHistory10Y) ? stock.priceHistory10Y : [];
    const historyStartPrice = priceHistory10Y.length > 0 ? priceHistory10Y[0].close : null;
    const historyEndPrice = priceHistory10Y.length > 0 ? priceHistory10Y[priceHistory10Y.length - 1].close : null;
    const priceCagr10Y = calculateCAGR(historyStartPrice, historyEndPrice, 10);
    const riskScore = calculateRiskScore({
      ...stock,
      marginOfSafety,
      dataQualityScore,
      priceCagr10Y,
    });
    const investmentThesis = buildInvestmentThesis({
      ...stock,
      marginOfSafety,
      dataQualityScore,
      compositeScore: 0,
      priceCagr10Y,
    });

    // Graham value per share
    const grahamValue = calculateGrahamNumber(stock.eps, stock.revenueGrowth5Y || 5);
    const grahamValuePerShare = grahamValue;

    // FCF Yield
    const fcfYield = calculateFCFYield(stock.marketCap, stock.freeCashFlow);

    const enrichedStock = {
      ...stock,
      intrinsicValue: intrinsicValuePerShare,
      intrinsicBearPerShare,
      intrinsicBasePerShare,
      intrinsicBullPerShare,
      intrinsicRangeLow,
      intrinsicRangeHigh,
      dcfQuality,
      marginOfSafety,
      roic,
      moatScore,
      priceToFCF,
      dataQualityScore,
      missingCriticalFields,
      priceHistory10Y,
      priceCagr10Y,
      riskScore,
      investmentThesis,
      grahamValuePerShare,
      fcfYield,
    };

    enrichedStock.baseScore = calculateCompositeScore(enrichedStock);
    enrichedStock.compositeScore = calculateSectorAdjustedScore(enrichedStock, enrichedStock.baseScore);
    enrichedStock.investmentThesis = buildInvestmentThesis(enrichedStock);

    return enrichedStock;
  });

  // Calculer les moyennes sectorielles
  const sectorStats = {};
  const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  enrichedData.forEach(s => {
    const sector = s.sector || 'N/A';
    if (!sectorStats[sector]) {
      sectorStats[sector] = { tickers: [], pe: [], roe: [], netMargin: [], priceToFCF: [], dividendYield: [] };
    }
    sectorStats[sector].tickers.push(s.ticker);
    if (typeof s.pe === 'number' && s.pe > 0) sectorStats[sector].pe.push(s.pe);
    if (typeof s.roe === 'number') sectorStats[sector].roe.push(s.roe);
    if (typeof s.netMargin === 'number') sectorStats[sector].netMargin.push(s.netMargin);
    if (typeof s.priceToFCF === 'number') sectorStats[sector].priceToFCF.push(s.priceToFCF);
    if (typeof s.dividendYield === 'number') sectorStats[sector].dividendYield.push(s.dividendYield);
  });

  enrichedData.forEach(s => {
    const sector = s.sector || 'N/A';
    const stats = sectorStats[sector];
    s.sectorAvg = {
      peers: stats.tickers.filter(t => t !== s.ticker),
      pe: avg(stats.pe),
      roe: avg(stats.roe),
      netMargin: avg(stats.netMargin),
      priceToFCF: avg(stats.priceToFCF),
      dividendYield: avg(stats.dividendYield),
    };
  });

  return enrichedData;
}

export function AppProvider({ children }) {
  // --- Notification state ---
  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);

  const showNotification = useCallback((message, type = 'success', action = null) => {
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    setNotification({ message, type, action });
    notificationTimeoutRef.current = setTimeout(() => setNotification(null), 6000);
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  // --- Data loading state ---
  const [allStocks, setAllStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading');
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // --- Watchlist state ---
  const [watchlist, setWatchlist] = useState(loadWatchlist);

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Charge les données (API d'abord, fallback CSV)
  const loadData = useCallback(async (tickers) => {
    setLoading(true);
    try {
      const data = await fetchStocksFromAPI(tickers);
      if (data.length > 0) {
        setAllStocks(enrichStocks(data));
        setDataSource('api');
        setLastFetchTime(new Date());
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API indisponible, fallback CSV:', err.message);
    }

    const csvData = await loadStocksData();
    setAllStocks(enrichStocks(csvData));
    setDataSource('csv');
    setLastFetchTime(null);
    setLoading(false);
  }, []);

  // Charger les données au montage
  useEffect(() => {
    loadData(watchlist);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recherche avec debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchTickers(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // --- Watchlist actions ---
  const addTicker = useCallback(async (symbol) => {
    if (watchlist.includes(symbol)) return;
    const newWatchlist = [...watchlist, symbol];
    setWatchlist(newWatchlist);
    saveWatchlist(newWatchlist);
    setSearchQuery('');
    setSearchResults([]);

    try {
      const data = await fetchStocksFromAPI([symbol]);
      if (data.length > 0) {
        const enriched = enrichStocks(data);
        setAllStocks(prev => [...prev, ...enriched]);
        showNotification(`${symbol} ajoute a la watchlist`);
      } else {
        showNotification(`Aucune donnee trouvee pour ${symbol}`, 'warning');
      }
    } catch {
      showNotification(`Erreur lors du chargement de ${symbol}`, 'error');
    }
  }, [watchlist, showNotification]);

  const removeTicker = useCallback((symbol) => {
    const newWatchlist = watchlist.filter(t => t !== symbol);
    setWatchlist(newWatchlist);
    saveWatchlist(newWatchlist);
    setAllStocks(prev => prev.filter(s => s.ticker !== symbol));
  }, [watchlist]);

  const resetWatchlist = useCallback(() => {
    const defaults = [...DEFAULT_WATCHLIST];
    setWatchlist(defaults);
    saveWatchlist(defaults);
    loadData(defaults);
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData(watchlist);
  }, [loadData, watchlist]);

  const value = {
    // Notification
    notification,
    showNotification,
    dismissNotification,
    // Data loading
    allStocks,
    setAllStocks,
    loading,
    dataSource,
    lastFetchTime,
    // Watchlist
    watchlist,
    addTicker,
    removeTicker,
    resetWatchlist,
    refresh,
    // Search
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    // enrichStocks (for detail loading)
    enrichStocks,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
