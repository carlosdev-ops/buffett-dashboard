import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Yahoo Finance cookies/crumb management
let crumb = null;
let cookies = null;
let crumbTimestamp = 0;
const CRUMB_TTL = 5 * 60 * 1000; // 5 min

const UA = 'Mozilla/5.0';

/**
 * Fetch Yahoo crumb and cookies for authenticated API requests.
 * Uses fc.yahoo.com which sets the A3 cookie needed for the API.
 */
async function getCrumbAndCookies() {
  if (crumb && cookies && (Date.now() - crumbTimestamp < CRUMB_TTL)) {
    return { crumb, cookies };
  }

  // Step 1: Hit fc.yahoo.com to get the A3 cookie
  const res1 = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });

  // Collect all Set-Cookie headers
  const rawHeaders = res1.headers;
  let cookieParts = [];

  // Node 18 headers.getSetCookie() or fallback
  if (typeof rawHeaders.getSetCookie === 'function') {
    cookieParts = rawHeaders.getSetCookie().map(c => c.split(';')[0]);
  } else {
    const raw = rawHeaders.get('set-cookie');
    if (raw) {
      cookieParts = raw.split(/,(?=\s*\w+=)/).map(c => c.split(';')[0].trim());
    }
  }

  const cookieJar = cookieParts.join('; ');
  if (!cookieJar) {
    throw new Error('No cookies received from Yahoo');
  }

  // Step 2: Get crumb using the cookies
  const res2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': UA,
      'Cookie': cookieJar,
    },
  });

  if (!res2.ok) {
    const text = await res2.text();
    throw new Error(`Failed to get crumb: ${res2.status} - ${text.substring(0, 100)}`);
  }

  const newCrumb = await res2.text();
  if (!newCrumb || newCrumb.length < 5) {
    throw new Error(`Invalid crumb received: ${newCrumb}`);
  }

  crumb = newCrumb;
  cookies = cookieJar;
  crumbTimestamp = Date.now();

  console.log(`Got Yahoo crumb: ${crumb.substring(0, 8)}...`);
  return { crumb, cookies };
}

/**
 * Invalidate cached crumb so next request fetches a new one.
 */
function invalidateCrumb() {
  crumb = null;
  cookies = null;
  crumbTimestamp = 0;
}

/**
 * Fetch data from Yahoo Finance API with retry on auth failure.
 */
async function yahooFetch(url, retried = false) {
  const { crumb: c, cookies: ck } = await getCrumbAndCookies();
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}crumb=${encodeURIComponent(c)}&formatted=false`;

  const res = await fetch(fullUrl, {
    headers: {
      'User-Agent': UA,
      'Cookie': ck,
      'Accept': 'application/json',
    },
  });

  if (res.status === 401 || res.status === 403) {
    if (!retried) {
      invalidateCrumb();
      return yahooFetch(url, true);
    }
    throw new Error(`Yahoo API auth failed: ${res.status}`);
  }

  if (res.status === 429) {
    throw new Error('Yahoo rate limited (429). Try again later.');
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!retried) {
      invalidateCrumb();
      return yahooFetch(url, true);
    }
    throw new Error(`Yahoo returned non-JSON: ${text.substring(0, 200)}`);
  }
}

/**
 * Helper to safely extract a raw numeric value from Yahoo's response.
 * Yahoo may return { raw: 123, fmt: "123" } or just a number.
 */
function raw(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'raw' in val) return val.raw;
  return null;
}

/**
 * Maps Yahoo Finance quoteSummary data to the stock schema used by the frontend.
 * Units match the CSV: marketCap in millions, percentages as plain numbers.
 */
function mapYahooToStock(result, historicalData = null) {
  const price = result.price || {};
  const summaryDetail = result.summaryDetail || {};
  const financialData = result.financialData || {};
  const balanceSheet = result.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
  const stats = result.defaultKeyStatistics || {};
  const profile = result.assetProfile || {};

  const ticker = price.symbol || 'N/A';
  const name = price.shortName || price.longName || ticker;
  const sector = profile.sector || 'N/A';
  const description = profile.longBusinessSummary || null;
  const currentPrice = raw(price.regularMarketPrice);
  const marketCapRaw = raw(price.marketCap) || 0;
  const marketCap = marketCapRaw / 1e6;

  const pe = raw(summaryDetail.trailingPE) ?? raw(stats.trailingPE);
  const pb = raw(stats.priceToBook);
  const roeVal = raw(financialData.returnOnEquity);
  const roe = roeVal != null ? roeVal * 100 : null;
  const deVal = raw(financialData.debtToEquity);
  const debtToEquity = deVal != null ? deVal / 100 : null;
  const pmVal = raw(financialData.profitMargins);
  const netMargin = pmVal != null ? pmVal * 100 : null;
  const fcfVal = raw(financialData.freeCashflow);
  const freeCashFlow = fcfVal != null ? fcfVal / 1e6 : null;
  const currentRatio = raw(financialData.currentRatio);
  const eps = raw(stats.trailingEps);
  const dyVal = raw(summaryDetail.dividendYield);
  const dividendYield = dyVal != null ? dyVal * 100 : 0;

  const omVal = raw(financialData.operatingMargins);
  const trVal = raw(financialData.totalRevenue);
  const operatingIncome = omVal != null && trVal != null ? (omVal * trVal) / 1e6 : null;

  const tdVal = raw(financialData.totalDebt);
  const totalDebt = tdVal != null ? tdVal / 1e6 : null;
  const teVal = raw(balanceSheet.totalStockholderEquity);
  const totalEquity = teVal != null ? teVal / 1e6 : null;

  const rgVal = raw(financialData.revenueGrowth);
  const revenueGrowth5Y = rgVal != null ? rgVal * 100 : null;

  // regularMarketTime is a unix timestamp (seconds)
  const regularMarketTime = raw(price.regularMarketTime);
  const lastUpdated = regularMarketTime ? new Date(regularMarketTime * 1000).toISOString() : null;

  // Valorisation enrichie
  const forwardPE = raw(summaryDetail.forwardPE) ?? raw(stats.forwardPE);
  const evToEbitda = raw(stats.enterpriseToEbitda);
  const priceToSales = raw(stats.priceToSalesTrailing12Months);
  const evRaw = raw(stats.enterpriseValue);
  const enterpriseValue = evRaw != null ? evRaw / 1e6 : null;
  const ebitdaVal = raw(financialData.ebitda);
  const ebitda = ebitdaVal != null ? ebitdaVal / 1e6 : null;

  // Qualité & efficacité
  const gmVal = raw(financialData.grossMargins);
  const grossMargin = gmVal != null ? gmVal * 100 : null;
  const emVal = raw(financialData.ebitdaMargins);
  const ebitdaMargin = emVal != null ? emVal * 100 : null;
  const operatingMargin = omVal != null ? omVal * 100 : null;
  const roaVal = raw(financialData.returnOnAssets);
  const returnOnAssets = roaVal != null ? roaVal * 100 : null;
  const ocfVal = raw(financialData.operatingCashflow);
  const operatingCashflow = ocfVal != null ? ocfVal / 1e6 : null;
  const prVal = raw(summaryDetail.payoutRatio);
  const payoutRatio = prVal != null ? prVal * 100 : null;
  const bookValue = raw(stats.bookValue);

  // Risque & momentum
  const beta = raw(summaryDetail.beta);
  const fiftyTwoWeekHigh = raw(summaryDetail.fiftyTwoWeekHigh);
  const fiftyTwoWeekLow = raw(summaryDetail.fiftyTwoWeekLow);
  const fiftyDayAverage = raw(summaryDetail.fiftyDayAverage);
  const twoHundredDayAverage = raw(summaryDetail.twoHundredDayAverage);

  // Croissance
  const egVal = raw(financialData.earningsGrowth);
  const earningsGrowth = egVal != null ? egVal * 100 : null;
  const rgqVal = raw(financialData.revenueGrowth);
  const revenueGrowthQuarterly = rgqVal != null ? rgqVal * 100 : null;

  // Variation journalière (Yahoo retourne le % comme ratio, ex: 0.017 = 1.7%)
  const dailyChange = raw(price.regularMarketChange);
  const dailyChangePercentRaw = raw(price.regularMarketChangePercent);
  const dailyChangePercent = dailyChangePercentRaw != null ? dailyChangePercentRaw * 100 : null;

  // Dividendes enrichis
  const dividendRate = raw(summaryDetail.dividendRate);
  const exDividendDateRaw = raw(summaryDetail.exDividendDate);
  const exDividendDate = exDividendDateRaw ? new Date(exDividendDateRaw * 1000).toISOString().slice(0, 10) : null;
  const fyAvgDyVal = raw(summaryDetail.fiveYearAvgDividendYield);
  const fiveYearAvgDividendYield = fyAvgDyVal != null ? fyAvgDyVal : null;

  // Historique des états financiers annuels (revenus, bénéfices, FCF)
  const incomeStatements = result.incomeStatementHistory?.incomeStatementHistory || [];
  const cashflowStatements = result.cashflowStatementHistory?.cashflowStatements || [];

  const financialHistory = incomeStatements
    .map((stmt) => {
      const endDate = stmt.endDate?.fmt || (stmt.endDate?.raw ? new Date(stmt.endDate.raw * 1000).toISOString().slice(0, 10) : null);
      const year = endDate ? endDate.slice(0, 4) : null;
      const revenue = raw(stmt.totalRevenue);
      const netIncome = raw(stmt.netIncome);
      const grossProfit = raw(stmt.grossProfit);
      const opIncome = raw(stmt.operatingIncome);

      // Chercher le FCF correspondant dans cashflowStatements (même année)
      const matchingCf = cashflowStatements.find((cf) => {
        const cfDate = cf.endDate?.fmt || (cf.endDate?.raw ? new Date(cf.endDate.raw * 1000).toISOString().slice(0, 10) : null);
        return cfDate && cfDate.slice(0, 4) === year;
      });
      const opCashflow = matchingCf ? raw(matchingCf.totalCashFromOperatingActivities) : null;
      const capex = matchingCf ? raw(matchingCf.capitalExpenditures) : null;
      const fcf = opCashflow != null && capex != null ? opCashflow + capex : null; // capex is negative

      return { year, revenue, netIncome, grossProfit, operatingIncome: opIncome, freeCashFlow: fcf };
    })
    .filter((item) => item.year != null)
    .sort((a, b) => a.year.localeCompare(b.year));

  return {
    ticker, name, sector, description, marketCap,
    price: currentPrice, pe, pb, roe, debtToEquity, netMargin,
    freeCashFlow, revenueGrowth5Y, currentRatio, dividendYield,
    eps, operatingIncome, totalDebt, totalEquity, lastUpdated,
    dailyChange, dailyChangePercent,
    priceHistory10Y: historicalData,
    // Valorisation enrichie
    forwardPE, evToEbitda, priceToSales, enterpriseValue, ebitda,
    // Qualité & efficacité
    grossMargin, ebitdaMargin, operatingMargin, returnOnAssets,
    operatingCashflow, payoutRatio, bookValue,
    // Risque & momentum
    beta, fiftyTwoWeekHigh, fiftyTwoWeekLow,
    fiftyDayAverage, twoHundredDayAverage,
    // Croissance
    earningsGrowth, revenueGrowthQuarterly,
    // Dividendes enrichis
    dividendRate, exDividendDate, fiveYearAvgDividendYield,
    // Historique financier annuel
    financialHistory,
  };
}

/**
 * Fetches monthly adjusted close prices over 10 years.
 */
async function fetchPriceHistory10Y(symbol) {
  const data = await yahooFetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1mo&events=div,splits`
  );

  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length === 0) {
    return [];
  }

  return timestamps.reduce((acc, ts, idx) => {
    const close = closes[idx];
    if (typeof close !== 'number' || !Number.isFinite(close)) return acc;
    acc.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close,
    });
    return acc;
  }, []);
}

/**
 * Fetches 5-year daily/weekly chart to compute price changes over multiple periods.
 * Returns: 5d, 1m, 6m, ytd, 1y, 5y changes.
 */
async function fetchPriceChanges(symbol) {
  const data = await yahooFetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1wk`
  );

  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  const empty = { weeklyChangePercent: null, monthlyChangePercent: null, sixMonthChangePercent: null, ytdChangePercent: null, yearlyChangePercent: null, fiveYearChangePercent: null };
  if (timestamps.length < 2) return empty;

  const currentPrice = closes.findLast(c => typeof c === 'number' && Number.isFinite(c));
  if (!currentPrice) return empty;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Find the closest valid close at or before a target timestamp
  function findPriceAt(targetMs) {
    let best = null;
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (typeof closes[i] === 'number' && Number.isFinite(closes[i]) && timestamps[i] * 1000 <= targetMs) {
        best = closes[i];
        break;
      }
    }
    return best;
  }

  function pctChange(oldPrice) {
    if (!oldPrice) return null;
    return ((currentPrice - oldPrice) / oldPrice) * 100;
  }

  const ytdStart = new Date(new Date().getFullYear(), 0, 2).getTime(); // Jan 2

  return {
    weeklyChangePercent: pctChange(findPriceAt(now - 5 * DAY)),
    monthlyChangePercent: pctChange(findPriceAt(now - 30 * DAY)),
    sixMonthChangePercent: pctChange(findPriceAt(now - 182 * DAY)),
    ytdChangePercent: pctChange(findPriceAt(ytdStart)),
    yearlyChangePercent: pctChange(findPriceAt(now - 365 * DAY)),
    fiveYearChangePercent: pctChange(findPriceAt(now - 5 * 365 * DAY)),
  };
}

/**
 * Fetches full stock data for a single symbol.
 */
async function fetchStockData(symbol, options = {}) {
  const { includeHistory = false } = options;
  const modules = 'price,summaryDetail,financialData,balanceSheetHistory,defaultKeyStatistics,assetProfile,incomeStatementHistory,cashflowStatementHistory';
  const quoteSummaryData = await yahooFetch(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`
  );

  let historyData = [];
  if (includeHistory) {
    historyData = await fetchPriceHistory10Y(symbol).catch(() => []);
  }

  const result = quoteSummaryData?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No data returned for ${symbol}`);

  const stock = mapYahooToStock(result, historyData);

  // Fetch weekly/monthly changes for detail view
  if (includeHistory) {
    const changes = await fetchPriceChanges(symbol).catch(() => ({}));
    Object.assign(stock, changes);
  }

  return stock;
}

// GET /api/stock/:symbol - Single stock data
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const stock = await fetchStockData(req.params.symbol.toUpperCase(), { includeHistory: true });
    res.json(stock);
  } catch (error) {
    console.error(`Error fetching ${req.params.symbol}:`, error.message);
    res.status(500).json({ error: `Failed to fetch data for ${req.params.symbol}` });
  }
});

// GET /api/stocks/batch?symbols=AAPL,MSFT,... - Batch stock data
app.get('/api/stocks/batch', async (req, res) => {
  const symbols = req.query.symbols?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (!symbols || symbols.length === 0) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // Process in small batches to avoid rate limits
  const BATCH_SIZE = 5;
  const stocks = [];
  const errors = [];

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(symbol => fetchStockData(symbol, { includeHistory: false }))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        stocks.push(result.value);
      } else {
        errors.push({ symbol: batch[idx], error: result.reason?.message });
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  res.json({ stocks, errors });
});

// GET /api/etf/distributions?symbols=XIU.TO,VFV.TO - Distribution data for ETFs
app.get('/api/etf/distributions', async (req, res) => {
  const symbols = req.query.symbols?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (!symbols || symbols.length === 0) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      // Fetch 5 years of data with dividend events
      // Try the symbol as-is first, then fallback without .TO for US ETFs
      let data;
      let resolvedSymbol = symbol;
      try {
        data = await yahooFetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1mo&events=div`
        );
        if (!data?.chart?.result?.[0]) throw new Error('no data');
      } catch {
        // If .TO fails, try without suffix (US-listed ETF)
        if (symbol.endsWith('.TO')) {
          const usSym = symbol.replace('.TO', '');
          data = await yahooFetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(usSym)}?range=5y&interval=1mo&events=div`
          );
          resolvedSymbol = usSym;
        } else {
          throw new Error(`No chart data for ${symbol}`);
        }
      }

      const chartResult = data?.chart?.result?.[0];
      if (!chartResult) throw new Error(`No chart data for ${resolvedSymbol}`);

      const meta = chartResult.meta || {};
      const currentPrice = meta.regularMarketPrice || meta.previousClose || null;

      // Extract dividend events
      const divEvents = chartResult.events?.dividends || {};
      const dividends = Object.values(divEvents)
        .map(d => ({
          date: new Date(d.date * 1000).toISOString().slice(0, 10),
          amount: d.amount,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

      // Determine if this is a swap-based / non-distributing ETF
      if (dividends.length === 0) {
        return {
          symbol,
          name: meta.shortName || meta.longName || symbol,
          currentPrice,
          isSwapBased: true,
          dividends: [],
          lastDistribution: null,
          annualDistribution: null,
          distributionYield: null,
          frequency: null,
          nextEstimatedExDate: null,
          fiveYearAvgYield: null,
        };
      }

      // Last distribution
      const lastDiv = dividends[0];

      // Calculate annual distribution (sum of last 12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const last12m = dividends.filter(d => new Date(d.date) >= oneYearAgo);
      const annualDistribution = last12m.reduce((sum, d) => sum + d.amount, 0);

      // Distribution yield
      const distributionYield = currentPrice && annualDistribution > 0
        ? (annualDistribution / currentPrice) * 100
        : 0;

      // Determine frequency from last 12 months
      let frequency = null;
      if (last12m.length >= 11) frequency = 'Mensuelle';
      else if (last12m.length >= 5 && last12m.length <= 7) frequency = `${last12m.length}x/an`;
      else if (last12m.length >= 3 && last12m.length <= 4) frequency = 'Trimestrielle';
      else if (last12m.length === 2) frequency = 'Semestrielle';
      else if (last12m.length === 1) frequency = 'Annuelle';
      else if (last12m.length > 7) frequency = `${last12m.length}x/an`;

      // Estimate next ex-dividend date based on frequency pattern
      let nextEstimatedExDate = null;
      if (dividends.length >= 2) {
        const lastDate = new Date(dividends[0].date);
        const prevDate = new Date(dividends[1].date);
        const intervalMs = lastDate - prevDate;
        const nextDate = new Date(lastDate.getTime() + intervalMs);
        if (nextDate > new Date()) {
          nextEstimatedExDate = nextDate.toISOString().slice(0, 10);
        }
      }

      // 5-year average yield (annual distributions / average price per year)
      const years = {};
      dividends.forEach(d => {
        const yr = d.date.slice(0, 4);
        if (!years[yr]) years[yr] = 0;
        years[yr] += d.amount;
      });
      const yearKeys = Object.keys(years).sort();
      // Use price history to estimate average prices by year
      const timestamps = chartResult.timestamp || [];
      const closes = chartResult.indicators?.quote?.[0]?.close || [];
      const yearPrices = {};
      timestamps.forEach((ts, i) => {
        const yr = new Date(ts * 1000).toISOString().slice(0, 4);
        const close = closes[i];
        if (typeof close === 'number' && Number.isFinite(close)) {
          if (!yearPrices[yr]) yearPrices[yr] = [];
          yearPrices[yr].push(close);
        }
      });

      const yearlyYields = yearKeys
        .filter(yr => years[yr] > 0 && yearPrices[yr]?.length > 0)
        .map(yr => {
          const avgPrice = yearPrices[yr].reduce((s, p) => s + p, 0) / yearPrices[yr].length;
          return (years[yr] / avgPrice) * 100;
        });
      const fiveYearAvgYield = yearlyYields.length > 0
        ? yearlyYields.reduce((s, y) => s + y, 0) / yearlyYields.length
        : null;

      return {
        symbol,
        name: meta.shortName || meta.longName || symbol,
        currentPrice,
        isSwapBased: false,
        dividends: dividends.slice(0, 12), // Last 12 distributions
        lastDistribution: lastDiv,
        annualDistribution,
        distributionYield,
        frequency,
        nextEstimatedExDate,
        fiveYearAvgYield,
      };
    })
  );

  const distributions = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      distributions.push(r.value);
    } else {
      errors.push({ symbol: symbols[i], error: r.reason?.message });
    }
  });

  res.json({ distributions, errors });
});

// GET /api/forex/usdcad - Taux de change USD/CAD en temps reel
let cachedFxRate = null;
let cachedFxTimestamp = 0;
const FX_CACHE_TTL = 15 * 60 * 1000; // 15 min

app.get('/api/forex/usdcad', async (req, res) => {
  try {
    // Cache pour eviter les appels excessifs
    if (cachedFxRate && (Date.now() - cachedFxTimestamp < FX_CACHE_TTL)) {
      return res.json(cachedFxRate);
    }

    const data = await yahooFetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/USDCAD=X?range=1d&interval=1d`
    );

    const result = data?.chart?.result?.[0];
    const meta = result?.meta || {};
    const rate = meta.regularMarketPrice || meta.previousClose || null;

    if (!rate) {
      throw new Error('Could not fetch USD/CAD rate');
    }

    cachedFxRate = { rate, timestamp: new Date().toISOString() };
    cachedFxTimestamp = Date.now();

    console.log(`USD/CAD rate: ${rate}`);
    res.json(cachedFxRate);
  } catch (error) {
    console.error('Forex error:', error.message);
    // Fallback raisonnable si l'API echoue
    res.json({ rate: 1.44, timestamp: null, fallback: true });
  }
});

// GET /api/indices - Major stock market indices
let cachedIndices = null;
let cachedIndicesTimestamp = 0;
const INDICES_CACHE_TTL = 5 * 60 * 1000; // 5 min

const INDICES_SYMBOLS = [
  { symbol: '^GSPTSE', name: 'S&P/TSX' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^FCHI', name: 'CAC 40' },
  { symbol: '^FTSE', name: 'FTSE 100' },
  { symbol: '^GDAXI', name: 'DAX' },
  { symbol: '^N225', name: 'Nikkei 225' },
];

app.get('/api/indices', async (req, res) => {
  try {
    if (cachedIndices && (Date.now() - cachedIndicesTimestamp < INDICES_CACHE_TTL)) {
      return res.json(cachedIndices);
    }

    const results = await Promise.allSettled(
      INDICES_SYMBOLS.map(async ({ symbol, name }) => {
        const data = await yahooFetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`
        );
        const result = data?.chart?.result?.[0];
        const meta = result?.meta || {};
        const price = meta.regularMarketPrice || null;
        const previousClose = meta.chartPreviousClose || meta.previousClose || null;
        const change = price && previousClose ? price - previousClose : null;
        const changePercent = price && previousClose ? ((price - previousClose) / previousClose) * 100 : null;

        return { symbol, name, price, change, changePercent };
      })
    );

    const indices = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    cachedIndices = { indices, timestamp: new Date().toISOString() };
    cachedIndicesTimestamp = Date.now();

    res.json(cachedIndices);
  } catch (error) {
    console.error('Indices error:', error.message);
    res.status(500).json({ error: 'Failed to fetch indices' });
  }
});

// GET /api/search?q=apple - Search tickers
app.get('/api/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Missing q parameter' });
  }

  try {
    const data = await yahooFetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
    );

    const quotes = (data.quotes || [])
      .filter(q => q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange,
      }));

    res.json(quotes);
  } catch (error) {
    console.error(`Search error for "${query}":`, error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Carlos Dashboard API running on http://localhost:${PORT}`);
  // Pre-warm crumb after a short delay
  setTimeout(() => {
    getCrumbAndCookies()
      .then(() => console.log('Crumb pre-warmed successfully'))
      .catch(err => console.warn('Initial crumb fetch failed (will retry on first request):', err.message));
  }, 2000);
});
