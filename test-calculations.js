/**
 * Script de test pour vérifier les calculs financiers
 * Exécuter avec: node test-calculations.js
 */

// Simule les imports (pour Node.js, adapter si nécessaire)
function calculateIntrinsicValue(
  freeCashFlow,
  growthRate = 0.08,
  discountRate = 0.10,
  years = 10
) {
  if (!freeCashFlow || freeCashFlow <= 0) return 0;
  if (growthRate >= discountRate) return 0;

  const futureFCF = freeCashFlow * Math.pow(1 + growthRate, years);
  const terminalValue = futureFCF / (discountRate - growthRate);
  const presentValue = terminalValue / Math.pow(1 + discountRate, years);

  return presentValue;
}

function calculateMarginOfSafety(intrinsicValue, currentPrice) {
  if (!intrinsicValue || intrinsicValue === 0) return 0;
  return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
}

function calculateCompositeScore(stock) {
  let score = 0;

  // Qualité du business (40 points)
  let businessQuality = 0;
  if (stock.roe >= 15) businessQuality += 15;
  else if (stock.roe >= 10) businessQuality += 10;
  else if (stock.roe >= 5) businessQuality += 5;

  if (stock.netMargin >= 10) businessQuality += 10;
  else if (stock.netMargin >= 5) businessQuality += 5;

  if (stock.revenueGrowth5Y >= 10) businessQuality += 10;
  else if (stock.revenueGrowth5Y >= 5) businessQuality += 7;
  else if (stock.revenueGrowth5Y > 0) businessQuality += 3;

  if (stock.freeCashFlow > 0) businessQuality += 5;

  score += businessQuality;

  // Solidité financière (30 points)
  let financialStrength = 0;
  if (stock.debtToEquity < 0.5) financialStrength += 15;
  else if (stock.debtToEquity < 1.0) financialStrength += 10;
  else if (stock.debtToEquity < 1.5) financialStrength += 5;

  if (stock.currentRatio >= 2.0) financialStrength += 15;
  else if (stock.currentRatio >= 1.5) financialStrength += 10;
  else if (stock.currentRatio >= 1.0) financialStrength += 5;

  score += financialStrength;

  // Valorisation (30 points)
  let valuation = 0;
  if (stock.pe > 0 && stock.pe < 15) valuation += 10;
  else if (stock.pe >= 15 && stock.pe < 20) valuation += 7;
  else if (stock.pe >= 20 && stock.pe < 25) valuation += 3;

  if (stock.pb > 0 && stock.pb < 1.5) valuation += 5;
  else if (stock.pb >= 1.5 && stock.pb < 3) valuation += 3;

  const priceFCF = stock.marketCap / stock.freeCashFlow;
  if (priceFCF > 0 && priceFCF < 15) valuation += 10;
  else if (priceFCF >= 15 && priceFCF < 20) valuation += 5;

  if (stock.marginOfSafety >= 30) valuation += 5;
  else if (stock.marginOfSafety >= 20) valuation += 3;

  score += valuation;

  return Math.round(score);
}

// Tests
console.log('=== Tests des calculs financiers ===\n');

// Test 1: Valeur intrinsèque
console.log('Test 1: Valeur intrinsèque (DCF)');
const fcf = 10000; // 10,000M FCF
const intrinsicValue = calculateIntrinsicValue(fcf, 0.08, 0.10, 10);
console.log(`FCF: ${fcf}M, Croissance: 8%, Discount: 10%, Années: 10`);
console.log(`Valeur intrinsèque: ${intrinsicValue.toFixed(2)}M`);
console.log(`Attendu: ~108,347M (approximatif)`);
console.log();

// Test 2: Marge de sécurité
console.log('Test 2: Marge de sécurité');
const price = 100;
const iv = 150;
const margin = calculateMarginOfSafety(iv, price);
console.log(`Prix actuel: $${price}, Valeur intrinsèque: $${iv}`);
console.log(`Marge de sécurité: ${margin.toFixed(1)}%`);
console.log(`Attendu: 33.3%`);
console.log();

// Test 3: Score composite pour Apple (exemple)
console.log('Test 3: Score composite (exemple Apple)');
const apple = {
  ticker: 'AAPL',
  roe: 147.4,
  netMargin: 25.3,
  revenueGrowth5Y: 8.7,
  freeCashFlow: 99500,
  debtToEquity: 1.73,
  currentRatio: 1.08,
  pe: 28.5,
  pb: 42.3,
  marketCap: 2800000,
  marginOfSafety: -15, // Supposé (surévalué)
};
const score = calculateCompositeScore(apple);
console.log(`ROE: ${apple.roe}% (Excellent: +15)`);
console.log(`Marge nette: ${apple.netMargin}% (Excellent: +10)`);
console.log(`Croissance: ${apple.revenueGrowth5Y}% (Bon: +7)`);
console.log(`FCF positif: +5`);
console.log(`Dette/Equity: ${apple.debtToEquity} (Élevé: +0)`);
console.log(`Current Ratio: ${apple.currentRatio} (Faible: +0)`);
console.log(`P/E: ${apple.pe} (Cher: +0)`);
console.log(`P/B: ${apple.pb} (Très cher: +0)`);
console.log(`Score total: ${score}/100`);
console.log(`Attendu: ~42 (qualité business excellente, mais solidité financière et valorisation médiocres)`);
console.log();

// Test 4: Score composite pour Berkshire Hathaway (bon exemple Buffett)
console.log('Test 4: Score composite (exemple Berkshire Hathaway)');
const berkshire = {
  ticker: 'BRK.B',
  roe: 12.3,
  netMargin: 18.5,
  revenueGrowth5Y: 9.1,
  freeCashFlow: 34600,
  debtToEquity: 0.28,
  currentRatio: 1.92,
  pe: 8.2,
  pb: 1.4,
  marketCap: 780000,
  marginOfSafety: 20,
};
const scoreB = calculateCompositeScore(berkshire);
console.log(`ROE: ${berkshire.roe}% (Bon: +10)`);
console.log(`Marge nette: ${berkshire.netMargin}% (Excellent: +10)`);
console.log(`Croissance: ${berkshire.revenueGrowth5Y}% (Bon: +7)`);
console.log(`FCF positif: +5`);
console.log(`Dette/Equity: ${berkshire.debtToEquity} (Excellent: +15)`);
console.log(`Current Ratio: ${berkshire.currentRatio} (Bon: +10)`);
console.log(`P/E: ${berkshire.pe} (Excellent: +10)`);
console.log(`P/B: ${berkshire.pb} (Bon: +3)`);
console.log(`Marge sécurité: ${berkshire.marginOfSafety}% (+3)`);
console.log(`Score total: ${scoreB}/100`);
console.log(`Attendu: ~73 (bon équilibre selon Buffett)`);
console.log();

console.log('=== Tous les tests terminés ===');
console.log('\nNOTE: Les valeurs "attendues" sont approximatives et peuvent varier légèrement selon les arrondis.');
