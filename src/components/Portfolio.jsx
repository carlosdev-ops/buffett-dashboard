import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { parsePortfolioCSV } from '../utils/portfolioParser';
import { fetchETFDistributions, fetchUSDCADRate } from '../utils/apiClient';

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#e11d48', '#65a30d', '#c026d3', '#ea580c',
  '#6b7280',
];

function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('fr-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(value, decimals = 2) {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(decimals);
}

function plColor(value) {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
}

export default function Portfolio() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loadDate, setLoadDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'weight', direction: 'desc' });
  const [etfDistributions, setEtfDistributions] = useState({});
  const [distLoading, setDistLoading] = useState(false);
  const [usdCadRate, setUsdCadRate] = useState(null);
  const fileInputRef = useRef(null);

  // Charger le taux USD/CAD au montage
  useEffect(() => {
    fetchUSDCADRate()
      .then((data) => setUsdCadRate(data.rate))
      .catch(() => setUsdCadRate(1.44)); // fallback
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = parsePortfolioCSV(event.target.result);
      setPortfolioData(result);
      setFileName(file.name);
      setLoadDate(new Date());
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Ajouter le poids (%) a chaque position
  const holdingsWithWeight = useMemo(() => {
    if (!portfolioData) return [];
    const totalValue = portfolioData.summary.totalMarketValue;
    return portfolioData.holdings.map((h) => ({
      ...h,
      weight: totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0,
    }));
  }, [portfolioData]);

  // Tri des positions
  const sortedHoldings = useMemo(() => {
    const sorted = [...holdingsWithWeight];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return sorted;
  }, [holdingsWithWeight, sortConfig]);

  // Analyse ETF vs actions individuelles
  const etfAnalysis = useMemo(() => {
    if (!holdingsWithWeight.length) return null;
    const totalValue = portfolioData.summary.totalMarketValue;

    const etfKeywords = ['ETF', 'FNB', 'INDEX', 'ISHARES', 'VANGUARD', 'BMO', 'INVESCO', 'HORIZONS', 'TRUST', 'SCHWAB', 'SPDR', 'PROSHARES', 'WISDOMTREE', 'GLOBAL X', 'PURPOSE', 'CI ', 'FIDELITY', 'MACKENZIE', 'FRANKLIN', 'JPMORGAN'];
    // Symboles connus comme ETF (tickers du courtier)
    const knownETFSymbols = ['SCHD', 'QQQ', 'SPY', 'VOO', 'VTI', 'VIG', 'ARKK', 'ARKW', 'ARKG', 'JEPI', 'JEPQ', 'DIVO', 'NUSI', 'QYLD', 'XYLD', 'RYLD', 'DGRO', 'VYM', 'HDV', 'DVY', 'NOBL', 'SDY', 'FIE', 'XDV', 'CDZ', 'VDY', 'ZDV', 'HAL', 'ZWB', 'ZWC', 'ZWK', 'BTCC', 'BTCX', 'EBIT', 'ETHH', 'ETHX'];
    const isETF = (h) => {
      const nameUpper = h.name.toUpperCase();
      const symbolBase = h.symbol.replace(/-[CU]$/, '').toUpperCase();
      return (
        etfKeywords.some((kw) => nameUpper.includes(kw)) ||
        knownETFSymbols.includes(symbolBase) ||
        // Suffixes -C/-U sur le TSX sont typiquement des ETF
        /-(C|U)$/.test(h.symbol)
      );
    };
    const etfs = holdingsWithWeight.filter(isETF);
    const stocks = holdingsWithWeight.filter((h) => !isETF(h));

    const etfValue = etfs.reduce((sum, h) => sum + h.marketValue, 0);
    const stockValue = stocks.reduce((sum, h) => sum + h.marketValue, 0);
    const etfPct = totalValue > 0 ? (etfValue / totalValue) * 100 : 0;
    const stockPct = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;

    const etfPL = etfs.reduce((sum, h) => sum + h.unrealizedPL, 0);
    const etfCost = etfs.reduce((sum, h) => sum + h.totalCost, 0);
    const etfReturnPct = etfCost > 0 ? (etfPL / etfCost) * 100 : 0;

    const stockPL = stocks.reduce((sum, h) => sum + h.unrealizedPL, 0);
    const stockCost = stocks.reduce((sum, h) => sum + h.totalCost, 0);
    const stockReturnPct = stockCost > 0 ? (stockPL / stockCost) * 100 : 0;

    // Constats d'expert
    const insights = [];

    if (etfs.length === 0) {
      insights.push({
        type: 'info',
        text: 'Portefeuille 100% actions individuelles. Considerer un ETF indiciel (ex: XIU, VFV, ZSP) pour la diversification de base.',
      });
    } else {
      if (etfPct > 80) {
        insights.push({
          type: 'warning',
          text: `Forte concentration en ETF (${etfPct.toFixed(0)}%). L\'alpha potentiel est limite — les rendements refletent principalement les indices sous-jacents.`,
        });
      } else if (etfPct >= 40 && etfPct <= 70) {
        insights.push({
          type: 'success',
          text: `Bonne balance ETF/actions (${etfPct.toFixed(0)}%/${stockPct.toFixed(0)}%). Le noyau indiciel assure la diversification, les actions individuelles apportent de l\'alpha.`,
        });
      } else if (etfPct < 20 && etfs.length > 0) {
        insights.push({
          type: 'info',
          text: `Faible allocation ETF (${etfPct.toFixed(0)}%). Les ETF pourraient stabiliser le portefeuille en marche baissier.`,
        });
      }

      if (Math.abs(etfReturnPct - stockReturnPct) > 5) {
        const better = etfReturnPct > stockReturnPct ? 'ETF' : 'Actions';
        const diff = Math.abs(etfReturnPct - stockReturnPct).toFixed(1);
        insights.push({
          type: etfReturnPct > stockReturnPct ? 'warning' : 'success',
          text: `Les ${better} surperforment de ${diff} pts. ${better === 'ETF' ? 'La selection d\'actions individuelle ne genere pas d\'alpha — revoir la these de chaque position.' : 'Le stock-picking ajoute de la valeur par rapport aux indices.'}`,
        });
      }

      // Chevauchement potentiel
      const hasCanadianETF = etfs.some((h) => ['XIU', 'XIC', 'ZCN', 'VCN', 'HXT'].some((t) => h.symbol.includes(t)));
      const hasUSETF = etfs.some((h) => ['VFV', 'ZSP', 'XUS', 'HXS', 'QQQ', 'SPY', 'VOO'].some((t) => h.symbol.includes(t)));
      const hasCanadianStocks = stocks.some((h) => h.currency === 'CAD');

      if (hasCanadianETF && hasCanadianStocks) {
        insights.push({
          type: 'warning',
          text: 'Chevauchement possible : ETF indiciel canadien + actions canadiennes individuelles. Verifier que les actions detenues ne sont pas deja dans l\'ETF (double exposition).',
        });
      }

      if (hasUSETF && etfs.filter((h) => ['VFV', 'ZSP', 'XUS', 'HXS', 'QQQ', 'SPY', 'VOO'].some((t) => h.symbol.includes(t))).length > 1) {
        insights.push({
          type: 'warning',
          text: 'Plusieurs ETF americains avec correlation elevee detectes. Consolider en un seul pour reduire les frais de gestion.',
        });
      }
    }

    // Frais implicites
    if (etfs.length > 3) {
      insights.push({
        type: 'info',
        text: `${etfs.length} ETF detenus. Chaque ETF comporte un RFG (ratio de frais de gestion). Verifier que les mandats ne se chevauchent pas.`,
      });
    }

    return {
      etfs,
      stocks,
      etfValue,
      stockValue,
      etfPct,
      stockPct,
      etfReturnPct,
      stockReturnPct,
      insights,
    };
  }, [holdingsWithWeight, portfolioData]);

  // Convertir symbole courtier en format Yahoo
  // -C = classe CAD sur TSX -> .TO
  // -U = classe USD sur TSX ou ETF US direct -> tester .TO d'abord, fallback sans suffixe
  const toYahooSymbol = useCallback((s) => {
    const clean = s.replace(/-[CU]$/, '');
    if (clean.includes('.')) return clean;
    return `${clean}.TO`;
  }, []);

  // Charger les donnees de distribution des ETF depuis l'API
  const fetchDistributions = useCallback(async (etfSymbols) => {
    if (!etfSymbols.length) return;
    setDistLoading(true);
    try {
      const yahooSymbols = etfSymbols.map(toYahooSymbol);
      const distributions = await fetchETFDistributions(yahooSymbols);
      const distMap = {};
      distributions.forEach((dist) => {
        // Retrouver le symbole original du courtier
        const original = etfSymbols.find((s) => toYahooSymbol(s) === dist.symbol) || dist.symbol;
        distMap[original] = dist;
      });
      setEtfDistributions(distMap);
    } catch (err) {
      console.error('Erreur chargement distributions ETF:', err);
    } finally {
      setDistLoading(false);
    }
  }, [toYahooSymbol]);

  useEffect(() => {
    if (etfAnalysis?.etfs?.length > 0) {
      const symbols = etfAnalysis.etfs.map((e) => e.symbol);
      fetchDistributions(symbols);
    }
  }, [etfAnalysis, fetchDistributions]);

  // Donnees pour le bar chart CAD vs USD
  const currencyData = useMemo(() => {
    if (!portfolioData) return [];
    return [
      { name: 'CAD', value: portfolioData.summary.cadValue },
      { name: 'USD', value: portfolioData.summary.usdValue },
    ].filter((d) => d.value > 0);
  }, [portfolioData]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  // Etat initial : bouton d'upload
  if (!portfolioData) {
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun portefeuille charge
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          Importez le fichier CSV exporte de votre courtier (Disnat/Desjardins)
          pour analyser la performance de votre portefeuille.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
        >
          Importer portefeuille CSV
        </button>
      </div>
    );
  }

  const { summary, accounts, cashHoldings } = portfolioData;

  return (
    <div>
      {/* En-tete avec info fichier et bouton re-upload */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{fileName}</span>
          {loadDate && (
            <span className="ml-2 text-gray-400">
              charge le {loadDate.toLocaleDateString('fr-CA')} a {loadDate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded transition-colors text-sm"
          >
            Recharger CSV
          </button>
        </div>
      </div>

      {/* 4 cartes de stats */}
      {(() => {
        const fx = usdCadRate || 1.44;
        const usdInCad = summary.usdValue * fx;
        const totalCAD = summary.cadValue + usdInCad; // cadValue inclut le cash
        const investedCAD = totalCAD - summary.totalCash;
        const totalCostCAD = holdingsWithWeight.reduce((sum, h) => sum + h.totalCost * (h.currency === 'USD' ? fx : 1), 0);
        const totalPLCAD = investedCAD - totalCostCAD;
        const totalPLPctCAD = totalCostCAD > 0 ? (totalPLCAD / totalCostCAD) * 100 : 0;
        return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Valeur marche</p>
            <span className="text-[10px] text-gray-400">en CAD</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(investedCAD, 0)} $
          </p>
          {summary.usdValue > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              dont {formatCurrency(usdInCad, 0)} $ (USD x {fx.toFixed(2)})
            </p>
          )}
          {summary.totalCash > 0 && (
            <>
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">Cash disponible</span>
                <span className="text-sm font-bold text-emerald-700">{formatCurrency(summary.totalCash, 0)} $</span>
              </div>
              <div className="mt-1.5 border-t border-gray-200 pt-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Total</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(totalCAD, 0)} $ CAD</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Cout total</p>
            <span className="text-[10px] text-gray-400">en CAD</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalCostCAD, 0)} $
          </p>
          <p className="text-xs text-gray-500 mt-1">base de cout investie</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Profit / Perte</p>
            <span className="text-[10px] text-gray-400">en CAD</span>
          </div>
          <p className={`text-2xl font-bold ${plColor(totalPLCAD)}`}>
            {totalPLCAD >= 0 ? '+' : ''}{formatCurrency(totalPLCAD, 0)} $
          </p>
          <p className={`text-xs mt-1 ${plColor(totalPLPctCAD)}`}>
            {totalPLPctCAD >= 0 ? '+' : ''}{formatPct(totalPLPctCAD)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Positions</p>
          <p className="text-2xl font-bold text-purple-600">
            {summary.positionCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {accounts.length} compte(s)
          </p>
          {usdCadRate && (
            <p className="text-[10px] text-gray-400 mt-1">USD/CAD : {usdCadRate.toFixed(4)}</p>
          )}
        </div>
      </div>
        );
      })()}

      {/* Tableau des positions */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: 'symbol', label: 'Symbole', align: 'left' },
                  { key: 'name', label: 'Nom', align: 'left' },
                  { key: 'currency', label: 'Devise', align: 'left' },
                  { key: 'quantity', label: 'Qte', align: 'right' },
                  { key: 'avgCost', label: 'Cout moy.', align: 'right' },
                  { key: 'currentPrice', label: 'Prix actuel', align: 'right' },
                  { key: 'marketValue', label: 'Valeur', align: 'right' },
                  { key: 'unrealizedPL', label: 'P&L $', align: 'right' },
                  { key: 'unrealizedPLPct', label: 'P&L %', align: 'right' },
                  { key: 'weight', label: 'Poids', align: 'right' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-${col.align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label} {getSortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedHoldings.map((h) => (
                <tr key={h.symbol} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {h.symbol}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">
                    {h.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {h.currency}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {h.quantity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {formatCurrency(h.avgCost)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {formatCurrency(h.currentPrice)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {formatCurrency(h.marketValue, 0)}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${plColor(h.unrealizedPL)}`}>
                    {h.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(h.unrealizedPL, 0)}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${plColor(h.unrealizedPLPct)}`}>
                    {h.unrealizedPLPct >= 0 ? '+' : ''}{formatPct(h.unrealizedPLPct)}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {formatPct(h.weight, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
          {sortedHoldings.length} position(s)
          {cashHoldings.length > 0 && ` — Cash : ${formatCurrency(summary.totalCash, 0)} $`}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Analyse ETF — constats d'expert */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Analyse ETF — Constats d'expert</h3>
          {etfAnalysis && (
            <div className="space-y-3">
              {/* Repartition ETF vs Actions */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">ETF</p>
                  <p className="text-lg font-bold text-blue-700">{formatPct(etfAnalysis.etfPct, 1)}%</p>
                  <p className="text-xs text-blue-500">{etfAnalysis.etfs.length} position(s)</p>
                  <p className={`text-xs font-medium mt-1 ${plColor(etfAnalysis.etfReturnPct)}`}>
                    {etfAnalysis.etfReturnPct >= 0 ? '+' : ''}{formatPct(etfAnalysis.etfReturnPct)}%
                  </p>
                </div>
                <div className="flex-1 bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-600 font-medium">Actions</p>
                  <p className="text-lg font-bold text-purple-700">{formatPct(etfAnalysis.stockPct, 1)}%</p>
                  <p className="text-xs text-purple-500">{etfAnalysis.stocks.length} position(s)</p>
                  <p className={`text-xs font-medium mt-1 ${plColor(etfAnalysis.stockReturnPct)}`}>
                    {etfAnalysis.stockReturnPct >= 0 ? '+' : ''}{formatPct(etfAnalysis.stockReturnPct)}%
                  </p>
                </div>
              </div>

              {/* ETF detenus */}
              {etfAnalysis.etfs.length > 0 && (
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">ETF en portefeuille</p>
                  <div className="flex flex-wrap gap-1">
                    {etfAnalysis.etfs.map((etf) => (
                      <span
                        key={etf.symbol}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                        title={etf.name}
                      >
                        {etf.symbol} ({formatPct(etf.weight, 1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Constats */}
              <div className="border-t border-gray-100 pt-2 space-y-2">
                {etfAnalysis.insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${
                      insight.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : insight.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    <span className="font-medium">
                      {insight.type === 'success' ? 'Positif' : insight.type === 'warning' ? 'Attention' : 'Info'}
                    </span>{' '}
                    — {insight.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar chart : CAD vs USD */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Repartition par devise</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currencyData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k $`} />
              <YAxis type="category" dataKey="name" width={40} />
              <Tooltip formatter={(value) => `${formatCurrency(value, 0)} $`} />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]}>
                {currencyData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#2563eb' : '#16a34a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distributions ETF */}
      {etfAnalysis?.etfs?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Distributions ETF</h3>
            {distLoading && (
              <span className="text-xs text-gray-400 animate-pulse">Chargement des donnees Yahoo Finance...</span>
            )}
          </div>
          {Object.keys(etfDistributions).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETF</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rendement</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dist./part/an</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Frequence</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Moy. 5 ans</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Derniere dist.</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Proch. estimee</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenu/an</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {etfAnalysis.etfs.map((etf) => {
                    const dist = etfDistributions[etf.symbol];
                    if (!dist) return null;

                    const annualIncome = dist.annualDistribution && etf.quantity
                      ? dist.annualDistribution * etf.quantity
                      : null;

                    return (
                      <tr key={etf.symbol} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{etf.symbol}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{dist.name}</div>
                        </td>
                        {dist.isSwapBased ? (
                          <td className="px-4 py-3 text-center" colSpan={7}>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              ETF a structure swap — aucune distribution (croissance integree au prix)
                            </span>
                          </td>
                        ) : !dist.annualDistribution && dist.lastDistribution ? (
                          <td className="px-4 py-3 text-center" colSpan={7}>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Aucune distribution recente — derniere le {new Date(dist.lastDistribution.date).toLocaleDateString('fr-CA')} ({formatCurrency(dist.lastDistribution.amount, 4)} $)
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <span className={dist.distributionYield > 3 ? 'text-green-600 font-medium' : 'text-gray-700'}>
                                {formatPct(dist.distributionYield)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                              {formatCurrency(dist.annualDistribution)} $
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                {dist.frequency || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                              {dist.fiveYearAvgYield != null ? `${formatPct(dist.fiveYearAvgYield)}%` : 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {dist.lastDistribution ? (
                                <div>
                                  <div className="text-xs text-gray-600">
                                    {new Date(dist.lastDistribution.date).toLocaleDateString('fr-CA')}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {formatCurrency(dist.lastDistribution.amount, 4)} $
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {dist.nextEstimatedExDate ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                  ~{new Date(dist.nextEstimatedExDate).toLocaleDateString('fr-CA')}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                              {annualIncome != null && annualIncome > 0 ? `${formatCurrency(annualIncome, 0)} $` : 'N/A'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700" colSpan={7}>
                      Revenu total estime (ETF distribuants)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                      {(() => {
                        const total = etfAnalysis.etfs.reduce((sum, etf) => {
                          const dist = etfDistributions[etf.symbol];
                          if (dist?.annualDistribution && etf.quantity) {
                            return sum + dist.annualDistribution * etf.quantity;
                          }
                          return sum;
                        }, 0);
                        return total > 0 ? `${formatCurrency(total, 0)} $/an` : '—';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : !distLoading ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              Aucune donnee de distribution disponible
            </div>
          ) : null}
        </div>
      )}

      {/* Ventilation par compte */}
      {accounts.length > 1 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Ventilation par compte</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valeur</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cout</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Positions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((a) => (
                  <tr key={a.account}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.account}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(a.totalValue, 0)} $</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(a.totalCost, 0)} $</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${plColor(a.totalPL)}`}>
                      {a.totalPL >= 0 ? '+' : ''}{formatCurrency(a.totalPL, 0)} $
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{a.positionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
