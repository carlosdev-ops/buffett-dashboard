/**
 * Client API pour les données Yahoo Finance via le backend
 */

/**
 * Récupère les données d'actions depuis l'API backend (batch)
 */
export async function fetchStocksFromAPI(tickers) {
  const response = await fetch(`/api/stocks/batch?symbols=${tickers.join(',')}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  return data.stocks || [];
}

/**
 * Récupère le détail d'une action (incluant l'historique 10 ans)
 */
export async function fetchStockDetailFromAPI(symbol) {
  const response = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    throw new Error(`API detail error: ${response.status}`);
  }
  return response.json();
}

/**
 * Récupère les données de distribution pour les ETF (dividendes, fréquence, dates)
 */
export async function fetchETFDistributions(tickers) {
  const response = await fetch(`/api/etf/distributions?symbols=${tickers.join(',')}`);
  if (!response.ok) {
    throw new Error(`API distributions error: ${response.status}`);
  }
  const data = await response.json();
  return data.distributions || [];
}

/**
 * Récupère le taux de change USD/CAD en temps réel
 */
export async function fetchUSDCADRate() {
  const response = await fetch('/api/forex/usdcad');
  if (!response.ok) {
    throw new Error(`Forex API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Récupère les principaux indices boursiers mondiaux
 */
export async function fetchIndices() {
  const response = await fetch('/api/indices');
  if (!response.ok) {
    throw new Error(`Indices API error: ${response.status}`);
  }
  const data = await response.json();
  return data.indices || [];
}

/**
 * Recherche de tickers via l'API
 */
export async function searchTickers(query) {
  if (!query || query.trim().length < 1) return [];
  const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error(`Search error: ${response.status}`);
  }
  return response.json();
}
