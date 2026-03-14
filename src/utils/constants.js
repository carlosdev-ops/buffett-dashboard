/**
 * Constantes financières utilisées dans les calculs Carlos
 */

// --- Paramètres DCF ---
export const DCF_DEFAULTS = {
  growthRate: 0.08,
  discountRate: 0.10,
  projectionYears: 10,
  terminalGrowthRate: 0.03,  // Taux de croissance terminal (phase 2, perpetuity)
};

export const DCF_SCENARIOS = {
  bear: { growthRate: 0.04, discountRate: 0.11 },
  base: { growthRate: 0.08, discountRate: 0.10 },
  bull: { growthRate: 0.12, discountRate: 0.09 },
};

// --- Paramètres Graham ---
export const GRAHAM = {
  baseMultiplier: 8.5,
  growthMultiplier: 2,
  bondYield: 4.4,
  defaultGrowthRate: 5,
};

// --- ROIC ---
export const ROIC_DEFAULTS = {
  taxRate: 0.25,
};

// --- Seuils du Moat Score ---
export const MOAT_THRESHOLDS = {
  roe: { good: 15, excellent: 20 },
  netMargin: { good: 10, excellent: 20 },
  revenueGrowth: { positive: 0, strong: 10 },
};

export const MOAT_POINTS = {
  roe: { base: 25, bonus: 10 },
  netMargin: { base: 20, bonus: 10 },
  revenueGrowth: { base: 20, bonus: 10 },
  freeCashFlow: { base: 15 },
  max: 100,
};

// --- Pondérations du Composite Score ---
export const COMPOSITE_WEIGHTS = {
  quality: 40,
  strength: 30,
  valuation: 30,
};

// --- Seuils du Composite Score ---
export const COMPOSITE_THRESHOLDS = {
  roe: { excellent: 15, good: 10, fair: 5 },
  roePoints: { excellent: 15, good: 10, fair: 5 },
  netMargin: { good: 10, fair: 5 },
  netMarginPoints: { good: 10, fair: 5 },
  revenueGrowth: { strong: 10, good: 5, positive: 0 },
  revenueGrowthPoints: { strong: 10, good: 7, positive: 3 },
  fcfPoints: 5,
  debtToEquity: { low: 0.5, medium: 1.0, high: 1.5 },
  debtToEquityPoints: { low: 15, medium: 10, high: 5 },
  currentRatio: { excellent: 2.0, good: 1.5, fair: 1.0 },
  currentRatioPoints: { excellent: 15, good: 10, fair: 5 },
  pe: { cheap: 15, fair: 20, moderate: 25 },
  pePoints: { cheap: 10, fair: 7, moderate: 3 },
  pb: { cheap: 1.5, fair: 3 },
  pbPoints: { cheap: 5, fair: 3 },
  priceFCF: { cheap: 15, fair: 20 },
  priceFCFPoints: { cheap: 10, fair: 5 },
  marginOfSafety: { strong: 30, acceptable: 20 },
  marginOfSafetyPoints: { strong: 5, acceptable: 3 },
  roePenaltyCap: 70,
};

// --- Seuils du Risk Score ---
export const RISK_THRESHOLDS = {
  debtToEquity: { high: 2, medium: 1, low: 0.6 },
  debtToEquityRisk: { high: 22, medium: 14, low: 8 },
  debtToEquityMissing: 10,
  currentRatio: { danger: 1, warning: 1.3 },
  currentRatioRisk: { danger: 15, warning: 8 },
  currentRatioMissing: 8,
  marginOfSafety: { negative: 0, low: 10 },
  marginOfSafetyRisk: { negative: 18, low: 10 },
  marginOfSafetyMissing: 8,
  pe: { extreme: 40, high: 30 },
  peRisk: { extreme: 14, high: 8 },
  peMissing: 6,
  fcfNegativeRisk: 14,
  fcfMissing: 8,
  dataQuality: { poor: 60, fair: 80 },
  dataQualityRisk: { poor: 15, fair: 8 },
};

// --- Seuils du verdict (Investment Thesis) ---
export const VERDICT_THRESHOLDS = {
  riskThreshold: 35,
  compositeThreshold: 70,
  highRisk: 65,
};

// --- Seuils de l'Investment Thesis ---
export const THESIS_THRESHOLDS = {
  roeGood: 15,
  netMarginGood: 10,
  debtToEquityMax: 0.8,
  marginOfSafetyGood: 20,
  priceCagrGood: 8,
  dataQualityWarning: 75,
};

// --- Sector-adjusted score profiles ---
export const SECTOR_PROFILES = {
  default: { maxDebtToEquity: 0.5, maxPE: 20, maxPB: 3, minCurrentRatio: 1.5 },
  financial: { maxDebtToEquity: 1.5, maxPE: 16, maxPB: 2.2, minCurrentRatio: 1.0 },
  technology: { maxDebtToEquity: 0.8, maxPE: 28, maxPB: 10, minCurrentRatio: 1.2 },
  energy: { maxDebtToEquity: 1.0, maxPE: 18, maxPB: 2.5, minCurrentRatio: 1.0 },
};

export const SECTOR_ADJUSTMENT_POINTS = {
  debtToEquity: 3,
  pe: 3,
  pb: 2,
  currentRatio: 2,
};

// --- Risque sectoriel ---
export const SECTOR_RISK_PROFILES = {
  financial: { baseRisk: 12, label: 'Sensibilité aux taux, risque actuariel, réglementaire' },
  energy:    { baseRisk: 10, label: 'Volatilité matières premières, transition énergétique' },
  technology:{ baseRisk: 5,  label: 'Disruption technologique, concentration revenus' },
  default:   { baseRisk: 0,  label: null },
};

// --- Seuils pour les métriques enrichies ---
export const ENRICHED_THRESHOLDS = {
  beta: { low: 0.8, neutral: 1.0, high: 1.3 },
  evToEbitda: { cheap: 10, fair: 15, expensive: 20 },
  fcfYield: { excellent: 8, good: 5, fair: 3 },
  peg: { cheap: 1, fair: 1.5, expensive: 2 },
  grossMargin: { excellent: 60, good: 40, fair: 20 },
  ebitdaMargin: { excellent: 30, good: 20, fair: 10 },
  operatingMargin: { excellent: 25, good: 15, fair: 8 },
  payoutRatio: { conservative: 40, moderate: 60, high: 80 },
};
