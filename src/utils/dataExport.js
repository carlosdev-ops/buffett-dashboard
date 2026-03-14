/**
 * Parsing CSV et export de données
 */

/**
 * Parse une ligne CSV en tenant compte des guillemets
 */
export function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Convertit une valeur CSV en nombre ou null si NaN
 */
export function parseNumber(value) {
  if (!value || value === '' || value.toUpperCase() === 'NAN') {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Charge et parse le fichier CSV des actions
 *
 * @param {string} csvContent - Contenu du fichier CSV
 * @returns {Array} Tableau d'objets représentant les actions
 */
export function parseStocksCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Première ligne = en-têtes
  const headers = parseCSVLine(lines[0]);

  // Parse chaque ligne de données
  const stocks = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const stock = {};

    headers.forEach((header, index) => {
      const value = values[index];

      // Les champs texte
      if (['ticker', 'name', 'sector'].includes(header)) {
        stock[header] = value || '';
      } else {
        // Tous les autres champs sont numériques
        stock[header] = parseNumber(value);
      }
    });

    return stock;
  });

  return stocks;
}

/**
 * Charge le fichier CSV depuis le serveur (fallback)
 *
 * @param {string} path - Chemin vers le fichier CSV
 * @returns {Promise<Array>} Promise qui résout avec le tableau d'actions
 */
export async function loadStocksData(path = '/stocks-data.csv') {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const csvContent = await response.text();
    return parseStocksCSV(csvContent);
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    return [];
  }
}

/**
 * Exporte un rapport texte d'analyse pour une entreprise.
 */
export function exportStockReport(stock) {
  if (!stock?.ticker) {
    console.warn('Impossible d\'exporter: action invalide');
    return;
  }

  const fmt = (value, decimals = 2, suffix = '') => {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
    if (typeof value === 'number') return `${value.toFixed(decimals)}${suffix}`;
    return `${value}${suffix}`;
  };

  const lines = [
    `Rapport d'analyse - ${stock.ticker} (${stock.name || 'N/A'})`,
    `Date: ${new Date().toLocaleString('fr-FR')}`,
    '---',
    `Secteur: ${stock.sector || 'N/A'}`,
    `Prix: $${fmt(stock.price, 2)}`,
    `Score Carlos: ${fmt(stock.compositeScore, 0)}/100 (base: ${fmt(stock.baseScore, 0)})`,
    `Score risque: ${fmt(stock.riskScore, 0)}/100`,
    `Marge de sécurité: ${fmt(stock.marginOfSafety, 1, '%')}`,
    `ROE: ${fmt(stock.roe, 1, '%')}`,
    `Marge nette: ${fmt(stock.netMargin, 1, '%')}`,
    `Dette/Equity: ${fmt(stock.debtToEquity, 2)}`,
    `P/E: ${fmt(stock.pe, 1)}`,
    `P/B: ${fmt(stock.pb, 1)}`,
    `Price/FCF: ${fmt(stock.priceToFCF, 1)}`,
    `CAGR prix 10 ans: ${fmt(stock.priceCagr10Y, 2, '%')}`,
    '',
    'Valorisation DCF (par action)',
    `- Bear: $${fmt(stock.intrinsicBearPerShare, 2)}`,
    `- Base: $${fmt(stock.intrinsicBasePerShare, 2)}`,
    `- Bull: $${fmt(stock.intrinsicBullPerShare, 2)}`,
    `- Fourchette: $${fmt(stock.intrinsicRangeLow, 2)} - $${fmt(stock.intrinsicRangeHigh, 2)}`,
    '',
    `Qualité des données: ${fmt(stock.dataQualityScore, 0, '%')}`,
  ];

  const strengths = stock.investmentThesis?.strengths || [];
  const risks = stock.investmentThesis?.risks || [];
  const verdict = stock.investmentThesis?.verdict;

  if (strengths.length > 0) {
    lines.push('', 'Forces:');
    strengths.forEach((item) => lines.push(`- ${item}`));
  }

  if (risks.length > 0) {
    lines.push('', 'Points de vigilance:');
    risks.forEach((item) => lines.push(`- ${item}`));
  }

  if (verdict) {
    lines.push('', `Verdict: ${verdict}`);
  }

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport-${stock.ticker}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Exporte des données au format CSV
 *
 * @param {Array} data - Tableau d'objets à exporter
 * @param {string} filename - Nom du fichier de sortie
 */
export function exportToCSV(data, filename = 'filtered-stocks.csv') {
  if (!data || data.length === 0) {
    console.warn('Aucune donnée à exporter');
    return;
  }

  // Obtenir tous les en-têtes
  const headers = Object.keys(data[0]);

  // Créer la ligne d'en-têtes
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          // Gérer les valeurs null/undefined
          if (value === null || value === undefined) return 'NaN';
          // Mettre les chaînes entre guillemets si elles contiennent des virgules
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  // Créer un blob et le télécharger
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
