/**
 * Parser pour les fichiers CSV exportes de courtiers (Disnat/Desjardins)
 * Format : separateur `;`, sections "ACTIONS CAD" / "ACTIONS USD",
 * nombres avec virgule comme separateur decimal
 */

/**
 * Convertit un nombre au format francais (virgule decimale) en float
 */
function parseDecimal(value) {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (str === '' || str === '-' || str === 'N/D' || str === 'n/d') return 0;
  // Remplacer la virgule decimale par un point
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Detecte si une ligne est un en-tete de colonnes
 */
function detectHeader(fields) {
  const lower = fields.map((f) => f.toLowerCase().trim());
  return (
    lower.includes('symbole') ||
    lower.includes('symbol')
  );
}

/**
 * Normalise un nom de colonne pour le mapping (retire $, %, accents, espaces)
 */
function normalizeColumnName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[$%]/g, '')
    .trim();
}

/**
 * Parse le contenu CSV du courtier et retourne les positions
 */
export function parsePortfolioCSV(csvContent) {
  // Supporter les fins de ligne \r\n, \n, ou \r seul (Mac classique / Disnat)
  const lines = csvContent.split(/\r\n|\n|\r/);
  const holdings = [];
  const accountMap = {};
  let currentCurrency = 'CAD';
  let headerIndices = null;
  let headerFields = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Ignorer les lignes vides et la directive sep=
    if (!trimmed || trimmed.startsWith('sep=')) continue;

    // Detecter les sections de devise
    const upperTrimmed = trimmed.toUpperCase();
    if (upperTrimmed === 'ACTIONS CAD' || upperTrimmed === 'ACTIONS CANADIENNES') {
      currentCurrency = 'CAD';
      continue;
    }
    if (upperTrimmed === 'ACTIONS USD' || upperTrimmed === 'ACTIONS AMÉRICAINES' || upperTrimmed === 'ACTIONS AMERICAINES') {
      currentCurrency = 'USD';
      continue;
    }

    // Ignorer les autres lignes de section (FNB, OPTIONS, etc.)
    if (upperTrimmed.match(/^(FNB|OPTIONS|OBLIGATIONS|FONDS|REVENUS|TOTAL|ACTIONS)/)) {
      continue;
    }

    const fields = trimmed.split(';').map((f) => f.trim());

    // Detecter la ligne d'en-tete (skip si deja detecte — meme header repete par section)
    if (detectHeader(fields)) {
      if (headerIndices) continue; // Deja parse, ignorer les doublons
      headerFields = fields;
      headerIndices = {};
      fields.forEach((f, i) => {
        const key = normalizeColumnName(f);
        if (key === 'compte' || key === 'account') headerIndices.account = i;
        if (key === 'symbole' || key === 'symbol') headerIndices.symbol = i;
        if (key === 'description' || key === 'titre' || key === 'nom') headerIndices.name = i;
        // Qte/Quantite mais PAS "qte x valeur" qui est une colonne calculee
        if (/^(qt[eé]?|qty|quantit[eé])$/.test(key)) headerIndices.quantity = i;
        if (key.includes('moyen') || key === 'avg cost') headerIndices.avgCost = i;
        if (key.includes('total') && key.includes('co')) headerIndices.totalCost = i;
        if (key.includes('prix actuel') || key.includes('dernier prix') || key === 'prix' || key === 'last price' || key === 'price') headerIndices.currentPrice = i;
        if (key.includes('variation du jour') && !f.includes('%')) headerIndices.dailyChange = i;
        if (key.includes('variation du jour') && f.includes('%')) headerIndices.dailyChangePct = i;
        if (key.startsWith('variation') && !key.includes('jour') && !f.includes('%')) headerIndices.dailyChange = i;
        if (key.startsWith('variation') && !key.includes('jour') && f.includes('%')) headerIndices.dailyChangePct = i;
        if (key.includes('valeur') && key.includes('march')) headerIndices.marketValue = i;
        if ((key.includes('profit') || key.includes('gain/perte') || key === 'p/l') && !f.includes('%')) headerIndices.unrealizedPL = i;
        if ((key.includes('profit') || key.includes('gain/perte') || key === 'p/l') && f.includes('%')) headerIndices.unrealizedPLPct = i;
      });
      continue;
    }

    // Pas d'en-tete detecte, ignorer
    if (!headerIndices) continue;

    // Verifier que la ligne a assez de champs
    if (fields.length < 3) continue;

    const symbol = fields[headerIndices.symbol] || '';
    if (!symbol || symbol === '') continue;

    // Ignorer les totaux et sous-totaux
    if (symbol.toUpperCase().startsWith('TOTAL') || symbol.toUpperCase().startsWith('SOUS-TOTAL')) continue;

    const account = headerIndices.account !== undefined ? fields[headerIndices.account] : '';
    const name = headerIndices.name !== undefined ? fields[headerIndices.name] : '';
    const quantity = parseDecimal(headerIndices.quantity !== undefined ? fields[headerIndices.quantity] : '0');
    const avgCost = parseDecimal(headerIndices.avgCost !== undefined ? fields[headerIndices.avgCost] : '0');
    const totalCost = parseDecimal(headerIndices.totalCost !== undefined ? fields[headerIndices.totalCost] : '0');
    const currentPrice = parseDecimal(headerIndices.currentPrice !== undefined ? fields[headerIndices.currentPrice] : '0');
    const dailyChange = parseDecimal(headerIndices.dailyChange !== undefined ? fields[headerIndices.dailyChange] : '0');
    const dailyChangePct = parseDecimal(headerIndices.dailyChangePct !== undefined ? fields[headerIndices.dailyChangePct] : '0');
    const marketValue = parseDecimal(headerIndices.marketValue !== undefined ? fields[headerIndices.marketValue] : '0');
    const unrealizedPL = parseDecimal(headerIndices.unrealizedPL !== undefined ? fields[headerIndices.unrealizedPL] : '0');
    const unrealizedPLPct = parseDecimal(headerIndices.unrealizedPLPct !== undefined ? fields[headerIndices.unrealizedPLPct] : '0');

    const holding = {
      account,
      symbol,
      name,
      quantity,
      avgCost,
      totalCost,
      currentPrice,
      dailyChange,
      dailyChangePct,
      marketValue,
      unrealizedPL,
      unrealizedPLPct,
      currency: currentCurrency,
    };

    holdings.push(holding);

    // Ventilation par compte
    if (account) {
      if (!accountMap[account]) {
        accountMap[account] = { account, holdings: [], totalValue: 0, totalCost: 0, totalPL: 0 };
      }
      accountMap[account].holdings.push(holding);
      accountMap[account].totalValue += marketValue;
      accountMap[account].totalCost += totalCost;
      accountMap[account].totalPL += unrealizedPL;
    }
  }

  // Separer cash et actions
  const cashHoldings = holdings.filter((h) => h.symbol.toUpperCase().includes('CASH'));
  const stockHoldings = holdings.filter((h) => !h.symbol.toUpperCase().includes('CASH'));

  // Consolider les doublons (meme ticker dans plusieurs comptes)
  const consolidated = new Map();
  for (const h of stockHoldings) {
    const key = h.symbol;
    if (consolidated.has(key)) {
      const existing = consolidated.get(key);
      existing.quantity += h.quantity;
      existing.totalCost += h.totalCost;
      existing.marketValue += h.marketValue;
      existing.unrealizedPL += h.unrealizedPL;
      existing.accounts.push(h.account);
    } else {
      consolidated.set(key, {
        symbol: h.symbol,
        name: h.name,
        currency: h.currency,
        quantity: h.quantity,
        avgCost: h.avgCost,
        totalCost: h.totalCost,
        currentPrice: h.currentPrice,
        marketValue: h.marketValue,
        unrealizedPL: h.unrealizedPL,
        accounts: [h.account],
      });
    }
  }

  // Recalculer cout moyen et P&L % pour les positions consolidees
  const consolidatedHoldings = Array.from(consolidated.values()).map((h) => ({
    ...h,
    avgCost: h.quantity > 0 ? h.totalCost / h.quantity : 0,
    unrealizedPLPct: h.totalCost > 0 ? (h.unrealizedPL / h.totalCost) * 100 : 0,
  }));

  // Calcul du resume
  const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = stockHoldings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalPL = stockHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);
  const totalCash = cashHoldings.reduce((sum, h) => sum + h.marketValue, 0);

  const cadValue = holdings.filter((h) => h.currency === 'CAD').reduce((sum, h) => sum + h.marketValue, 0);
  const usdValue = holdings.filter((h) => h.currency === 'USD').reduce((sum, h) => sum + h.marketValue, 0);

  const accounts = Object.values(accountMap).map((a) => ({
    ...a,
    positionCount: a.holdings.length,
  }));

  return {
    holdings: consolidatedHoldings,
    cashHoldings,
    accounts,
    summary: {
      totalMarketValue,
      totalCost,
      totalPL,
      totalPLPct: totalCost > 0 ? (totalPL / totalCost) * 100 : 0,
      totalCash,
      positionCount: consolidatedHoldings.length,
      cadValue,
      usdValue,
    },
  };
}
