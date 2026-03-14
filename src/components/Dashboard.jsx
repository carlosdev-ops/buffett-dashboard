import { useState, useMemo, useCallback } from 'react';
import StocksTable from './StocksTable';
import StockDetail from './StockDetail';
import DashboardHeader from './DashboardHeader';
import NotificationToast from './NotificationToast';
import StatsCards from './StatsCards';
import GuideSection from './GuideSection';
import IndicesTicker from './IndicesTicker';
import Portfolio from './Portfolio';
import { useApp, enrichStocks } from '../context/AppContext';
import { exportToCSV } from '../utils/dataExport';
import { fetchStockDetailFromAPI } from '../utils/apiClient';

/**
 * Composant principal du dashboard
 */
export default function Dashboard() {
  const {
    allStocks,
    setAllStocks,
    loading,
    dataSource,
    lastFetchTime,
    watchlist,
    addTicker,
    removeTicker,
    resetWatchlist,
    refresh,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    notification,
    dismissNotification,
  } = useApp();

  const [selectedStock, setSelectedStock] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('watchlist');

  // Statistiques agrégées
  const stats = useMemo(() => {
    if (allStocks.length === 0) {
      return { totalStocks: 0, avgScore: 0, avgROE: 0, avgMarginOfSafety: 0 };
    }

    return {
      totalStocks: allStocks.length,
      avgScore:
        allStocks.reduce((sum, s) => sum + s.compositeScore, 0) /
        allStocks.length,
      avgROE:
        allStocks.reduce((sum, s) => sum + (s.roe || 0), 0) /
        allStocks.length,
      avgMarginOfSafety:
        allStocks.reduce((sum, s) => sum + (s.marginOfSafety || 0), 0) /
        allStocks.length,
    };
  }, [allStocks]);

  const handleSelectStock = useCallback(async (stock) => {
    setSelectedStock(stock);
    setShowDetail(true);

    try {
      const detailed = await fetchStockDetailFromAPI(stock.ticker);
      const enrichedDetailed = enrichStocks([detailed])[0];

      setAllStocks((prev) => prev.map((item) => (
        item.ticker === enrichedDetailed.ticker ? enrichedDetailed : item
      )));

      setSelectedStock((current) => (
        current?.ticker === enrichedDetailed.ticker ? enrichedDetailed : current
      ));
    } catch {
      // Fallback silencieux: on conserve les données déjà chargées
    }
  }, [setAllStocks]);

  const handleCloseDetail = () => {
    setShowDetail(false);
  };

  const handleRemoveTicker = useCallback((symbol) => {
    removeTicker(symbol);
    if (selectedStock?.ticker === symbol) {
      setSelectedStock(null);
      setShowDetail(false);
    }
  }, [removeTicker, selectedStock]);

  const handleExport = () => {
    const exportData = allStocks.map((stock) => ({
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      price: stock.price,
      compositeScore: stock.compositeScore,
      roe: stock.roe,
      netMargin: stock.netMargin,
      debtToEquity: stock.debtToEquity,
      currentRatio: stock.currentRatio,
      pe: stock.pe,
      pb: stock.pb,
      marginOfSafety: stock.marginOfSafety,
      intrinsicValue: stock.intrinsicValue,
      freeCashFlow: stock.freeCashFlow,
      revenueGrowth5Y: stock.revenueGrowth5Y,
      priceToFCF: stock.priceToFCF,
      baseScore: stock.baseScore,
      intrinsicBearPerShare: stock.intrinsicBearPerShare,
      intrinsicBasePerShare: stock.intrinsicBasePerShare,
      intrinsicBullPerShare: stock.intrinsicBullPerShare,
      intrinsicRangeLow: stock.intrinsicRangeLow,
      intrinsicRangeHigh: stock.intrinsicRangeHigh,
      priceCagr10Y: stock.priceCagr10Y,
      riskScore: stock.riskScore,
      investmentVerdict: stock.investmentThesis?.verdict,
      dataQualityScore: stock.dataQualityScore,
      missingCriticalFields: stock.missingCriticalFields.join('|'),
    }));

    exportToCSV(exportData, 'carlos-stocks.csv');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader
        dataSource={dataSource}
        lastFetchTime={lastFetchTime}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        watchlist={watchlist}
        stockCount={allStocks.length}
        onSearchChange={setSearchQuery}
        onAddTicker={addTicker}
        onResetWatchlist={resetWatchlist}
        onRefresh={refresh}
        onExport={handleExport}
      />

      <NotificationToast
        notification={notification}
        onDismiss={dismissNotification}
      />

      {/* Onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6" aria-label="Onglets">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'watchlist'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Watchlist
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'portfolio'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Portefeuille
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'watchlist' ? (
          showDetail ? (
            <StockDetail stock={selectedStock} onClose={handleCloseDetail} />
          ) : (
            <>
              <IndicesTicker />
              <StatsCards
                stats={stats}
                totalCount={allStocks.length}
              />

              <StocksTable
                stocks={allStocks}
                onSelectStock={handleSelectStock}
                selectedStock={selectedStock}
                onRemoveTicker={handleRemoveTicker}
              />

              <GuideSection />
            </>
          )
        ) : (
          <Portfolio />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            Dashboard d'analyse fondamentale - Les donnees sont a titre
            d'exemple uniquement - Toujours faire vos propres recherches avant
            d'investir
          </p>
        </div>
      </footer>
    </div>
  );
}
