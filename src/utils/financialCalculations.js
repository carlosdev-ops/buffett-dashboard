/**
 * Calculs financiers basés sur les principes de Carlos
 *
 * Toutes les formules sont commentées pour assurer la précision
 */

import {
  DCF_DEFAULTS,
  DCF_SCENARIOS,
  GRAHAM,
  ROIC_DEFAULTS,
  MOAT_THRESHOLDS,
  MOAT_POINTS,
  COMPOSITE_THRESHOLDS,
  RISK_THRESHOLDS,
  VERDICT_THRESHOLDS,
  THESIS_THRESHOLDS,
  SECTOR_PROFILES,
  SECTOR_ADJUSTMENT_POINTS,
  SECTOR_RISK_PROFILES,
} from './constants.js';

/**
 * Calcule la valeur intrinsèque via un modèle DCF en deux phases :
 *
 * Phase 1 (explicite) : Projette les FCF année par année sur `years` ans au taux `growthRate`,
 *   et actualise chaque flux à `discountRate`.
 * Phase 2 (valeur terminale) : Après la phase 1, applique un taux de croissance terminal
 *   conservateur (`terminalGrowthRate`, par défaut 3%) pour le modèle de Gordon.
 *
 * Ce modèle fonctionne même quand growthRate >= discountRate (contrairement au modèle
 * single-stage qui diverge dans ce cas).
 *
 * @param {number} freeCashFlow - FCF actuel en millions
 * @param {number} growthRate - Taux de croissance phase 1 (0.10 = 10%)
 * @param {number} discountRate - Taux d'actualisation (0.10 = 10%)
 * @param {number} years - Nombre d'années de projection (phase 1)
 * @returns {number} Valeur intrinsèque
 */
export function calculateIntrinsicValue(
  freeCashFlow,
  growthRate = DCF_DEFAULTS.growthRate,
  discountRate = DCF_DEFAULTS.discountRate,
  years = DCF_DEFAULTS.projectionYears
) {
  if (!freeCashFlow || freeCashFlow <= 0) return 0;
  if (discountRate <= 0) return 0;

  const terminalGrowthRate = DCF_DEFAULTS.terminalGrowthRate;

  // Phase 1 : Somme des FCF actualisés année par année
  let phase1PV = 0;
  let projectedFCF = freeCashFlow;
  for (let i = 1; i <= years; i++) {
    projectedFCF *= (1 + growthRate);
    phase1PV += projectedFCF / Math.pow(1 + discountRate, i);
  }

  // Phase 2 : Valeur terminale (Gordon Growth Model avec taux terminal conservateur)
  // Le FCF de l'année suivante pour la perpetuity croît au taux terminal
  const terminalFCF = projectedFCF * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
  const phase2PV = terminalValue / Math.pow(1 + discountRate, years);

  const totalPV = phase1PV + phase2PV;
  return totalPV > 0 ? totalPV : 0;
}

/**
 * Calcule la valeur intrinsèque selon la formule de Benjamin Graham
 *
 * Formule: VI = EPS × (8.5 + 2g) × 4.4 / Y
 * Où:
 * - EPS = Earnings Per Share
 * - g = taux de croissance attendu sur 7-10 ans (en %)
 * - Y = taux d'obligation AAA (rendement sans risque, typiquement 4.4%)
 * - 8.5 = P/E de base pour une entreprise sans croissance
 * - 4.4 = rendement obligataire historique de Graham
 *
 * @param {number} eps - Earnings per share
 * @param {number} growthRate - Taux de croissance (10 = 10%)
 * @param {number} bondYield - Taux obligataire AAA (défaut 4.4)
 * @returns {number} Valeur intrinsèque par action
 */
export function calculateGrahamNumber(eps, growthRate = GRAHAM.defaultGrowthRate, bondYield = GRAHAM.bondYield) {
  if (!eps || eps <= 0) return 0;

  const baseValue = eps * (GRAHAM.baseMultiplier + GRAHAM.growthMultiplier * growthRate);
  const intrinsicValue = (baseValue * GRAHAM.bondYield) / bondYield;

  return intrinsicValue;
}

/**
 * Calcule les Owner Earnings (bénéfices propriétaire)
 *
 * Formule de Carlos: OE = Net Income + D&A - CapEx - ΔWC
 * Où:
 * - D&A = Depreciation & Amortization
 * - CapEx = Capital Expenditures (dépenses d'investissement)
 * - ΔWC = Variation du besoin en fonds de roulement
 *
 * Simplification si ΔWC non disponible: OE ≈ Net Income + D&A - CapEx
 *
 * @param {number} netIncome - Bénéfice net
 * @param {number} depreciation - Dépréciation et amortissement
 * @param {number} capex - Dépenses d'investissement
 * @param {number} workingCapitalChange - Variation BFR (optionnel)
 * @returns {number} Owner Earnings
 */
export function calculateOwnerEarnings(
  netIncome,
  depreciation,
  capex,
  workingCapitalChange = 0
) {
  return netIncome + depreciation - capex - workingCapitalChange;
}

/**
 * Calcule le Return on Invested Capital (ROIC)
 *
 * Formule: ROIC = NOPAT / Invested Capital
 * Où:
 * - NOPAT = Net Operating Profit After Tax = EBIT × (1 - Tax Rate)
 * - Invested Capital = Total Debt + Total Equity - Cash
 *
 * Simplification: ROIC = Operating Income / (Debt + Equity)
 *
 * @param {number} operatingIncome - EBIT (résultat opérationnel)
 * @param {number} totalDebt - Dette totale
 * @param {number} totalEquity - Capitaux propres
 * @param {number} taxRate - Taux d'imposition (0.25 = 25%)
 * @returns {number} ROIC en pourcentage
 */
export function calculateROIC(
  operatingIncome,
  totalDebt,
  totalEquity,
  taxRate = ROIC_DEFAULTS.taxRate
) {
  const nopat = operatingIncome * (1 - taxRate);
  const investedCapital = totalDebt + totalEquity;

  if (investedCapital === 0) return 0;

  return (nopat / investedCapital) * 100;
}

/**
 * Calcule le score de "moat" (avantage concurrentiel)
 *
 * Basé sur la consistance des métriques clés:
 * - ROE stable et élevé (> 15%)
 * - Marge nette stable (> 10%)
 * - Croissance régulière des revenus
 * - Free Cash Flow positif et croissant
 *
 * @param {object} metrics - Objet contenant les métriques historiques
 * @returns {number} Score de 0 à 100
 */
export function calculateMoatScore(metrics) {
  let score = 0;

  // ROE élevé et stable (+25 points)
  if (metrics.roe && metrics.roe >= MOAT_THRESHOLDS.roe.good) {
    score += MOAT_POINTS.roe.base;
    if (metrics.roe >= MOAT_THRESHOLDS.roe.excellent) score += MOAT_POINTS.roe.bonus;
  }

  // Marge nette élevée (+20 points)
  if (metrics.netMargin && metrics.netMargin >= MOAT_THRESHOLDS.netMargin.good) {
    score += MOAT_POINTS.netMargin.base;
    if (metrics.netMargin >= MOAT_THRESHOLDS.netMargin.excellent) score += MOAT_POINTS.netMargin.bonus;
  }

  // Croissance des revenus (+20 points)
  if (metrics.revenueGrowth && metrics.revenueGrowth > MOAT_THRESHOLDS.revenueGrowth.positive) {
    score += MOAT_POINTS.revenueGrowth.base;
    if (metrics.revenueGrowth >= MOAT_THRESHOLDS.revenueGrowth.strong) score += MOAT_POINTS.revenueGrowth.bonus;
  }

  // Free Cash Flow positif (+15 points)
  if (metrics.freeCashFlow && metrics.freeCashFlow > 0) {
    score += MOAT_POINTS.freeCashFlow.base;
  }

  return Math.min(score, MOAT_POINTS.max);
}

/**
 * Calcule la marge de sécurité
 *
 * Formule: Marge de sécurité = (Valeur Intrinsèque - Prix Actuel) / Valeur Intrinsèque × 100
 *
 * Carlos recherche généralement une marge de sécurité d'au moins 25-30%
 *
 * @param {number} intrinsicValue - Valeur intrinsèque calculée
 * @param {number} currentPrice - Prix actuel du marché
 * @returns {number} Marge de sécurité en pourcentage
 */
export function calculateMarginOfSafety(intrinsicValue, currentPrice) {
  if (!intrinsicValue || intrinsicValue === 0) return 0;

  return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
}

/**
 * Calcule le ratio Price/FCF de manière sécurisée
 *
 * @param {number} marketCap - Capitalisation boursière (en millions)
 * @param {number} freeCashFlow - Free Cash Flow (en millions)
 * @returns {number|null} Ratio Price/FCF ou null si invalide
 */
export function calculatePriceToFCF(marketCap, freeCashFlow) {
  if (
    typeof marketCap !== 'number' ||
    typeof freeCashFlow !== 'number' ||
    !Number.isFinite(marketCap) ||
    !Number.isFinite(freeCashFlow) ||
    freeCashFlow <= 0
  ) {
    return null;
  }

  const ratio = marketCap / freeCashFlow;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

/**
 * Calcule un CAGR (taux de croissance annualisé) entre deux valeurs.
 *
 * @param {number} startValue - Valeur initiale
 * @param {number} endValue - Valeur finale
 * @param {number} years - Nombre d'années
 * @returns {number|null} CAGR en pourcentage
 */
export function calculateCAGR(startValue, endValue, years) {
  if (
    typeof startValue !== 'number' ||
    typeof endValue !== 'number' ||
    !Number.isFinite(startValue) ||
    !Number.isFinite(endValue) ||
    startValue <= 0 ||
    endValue <= 0 ||
    typeof years !== 'number' ||
    years <= 0
  ) {
    return null;
  }

  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calcule une valorisation DCF selon 3 scénarios (bear/base/bull).
 *
 * Garanties :
 * - Chaque scénario produit une valeur > 0 si le FCF est positif
 * - L'ordre Bear < Base < Bull est vérifié
 * - Un flag `dcfQuality` indique si le DCF est fiable ou suspect
 *
 * @param {number} freeCashFlow - Free cash-flow actuel (en millions)
 * @param {number} years - Période de projection
 * @returns {object} Valeurs DCF par scénario + borne basse/haute + dcfQuality
 */
export function calculateIntrinsicValueScenarios(freeCashFlow, years = DCF_DEFAULTS.projectionYears) {
  const values = Object.entries(DCF_SCENARIOS).reduce((acc, [name, params]) => {
    acc[name] = calculateIntrinsicValue(
      freeCashFlow,
      params.growthRate,
      params.discountRate,
      years
    );
    return acc;
  }, {});

  // Vérification de cohérence
  const hasPositiveFCF = typeof freeCashFlow === 'number' && freeCashFlow > 0;
  const allPositive = hasPositiveFCF && values.bear > 0 && values.base > 0 && values.bull > 0;
  const orderValid = values.bear < values.base && values.base < values.bull;

  let dcfQuality = 'fiable';
  if (!hasPositiveFCF) {
    dcfQuality = 'indisponible';
  } else if (!allPositive) {
    dcfQuality = 'suspect';
  } else if (!orderValid) {
    dcfQuality = 'suspect';
  }

  return {
    ...values,
    low: values.bear,
    high: values.bull,
    dcfQuality,
  };
}

/**
 * Ajuste le score selon le secteur (banques/energy/software n'ont pas les mêmes standards).
 *
 * @param {object} stock - Action enrichie
 * @param {number} baseScore - Score Carlos brut
 * @returns {number} Score ajusté secteur (0-100)
 */
export function calculateSectorAdjustedScore(stock, baseScore) {
  const sector = (stock.sector || '').toLowerCase();
  let profile = { ...SECTOR_PROFILES.default };

  if (sector.includes('financial')) {
    profile = { ...SECTOR_PROFILES.financial };
  } else if (sector.includes('technology')) {
    profile = { ...SECTOR_PROFILES.technology };
  } else if (sector.includes('energy') || sector.includes('utility')) {
    profile = { ...SECTOR_PROFILES.energy };
  }

  let adjustment = 0;

  if (typeof stock.debtToEquity === 'number') {
    adjustment += stock.debtToEquity <= profile.maxDebtToEquity
      ? SECTOR_ADJUSTMENT_POINTS.debtToEquity
      : -SECTOR_ADJUSTMENT_POINTS.debtToEquity;
  }
  if (typeof stock.pe === 'number') {
    adjustment += stock.pe <= profile.maxPE
      ? SECTOR_ADJUSTMENT_POINTS.pe
      : -SECTOR_ADJUSTMENT_POINTS.pe;
  }
  if (typeof stock.pb === 'number') {
    adjustment += stock.pb <= profile.maxPB
      ? SECTOR_ADJUSTMENT_POINTS.pb
      : -SECTOR_ADJUSTMENT_POINTS.pb;
  }
  if (typeof stock.currentRatio === 'number') {
    adjustment += stock.currentRatio >= profile.minCurrentRatio
      ? SECTOR_ADJUSTMENT_POINTS.currentRatio
      : -SECTOR_ADJUSTMENT_POINTS.currentRatio;
  }

  return Math.max(0, Math.min(100, Math.round(baseScore + adjustment)));
}

/**
 * Calcule un score composite basé sur les critères de Carlos
 *
 * Pondération:
 * - Qualité du business (40%) : ROE, marge nette, croissance
 * - Solidité financière (30%) : ratio dette, current ratio
 * - Valorisation (30%) : P/E, P/B, P/FCF, marge de sécurité
 *
 * @param {object} stock - Objet action avec toutes les métriques
 * @returns {number} Score de 0 à 100
 */
export function calculateCompositeScore(stock) {
  let score = 0;
  const t = COMPOSITE_THRESHOLDS;

  // Qualité du business (40 points max)
  let businessQuality = 0;

  // ROE > 15% (15 points)
  if (stock.roe >= t.roe.excellent) {
    businessQuality += t.roePoints.excellent;
  } else if (stock.roe >= t.roe.good) {
    businessQuality += t.roePoints.good;
  } else if (stock.roe >= t.roe.fair) {
    businessQuality += t.roePoints.fair;
  }

  // Marge nette > 10% (10 points)
  if (stock.netMargin >= t.netMargin.good) {
    businessQuality += t.netMarginPoints.good;
  } else if (stock.netMargin >= t.netMargin.fair) {
    businessQuality += t.netMarginPoints.fair;
  }

  // Croissance des revenus positive (10 points)
  if (stock.revenueGrowth5Y >= t.revenueGrowth.strong) {
    businessQuality += t.revenueGrowthPoints.strong;
  } else if (stock.revenueGrowth5Y >= t.revenueGrowth.good) {
    businessQuality += t.revenueGrowthPoints.good;
  } else if (stock.revenueGrowth5Y > t.revenueGrowth.positive) {
    businessQuality += t.revenueGrowthPoints.positive;
  }

  // FCF positif (5 points)
  if (stock.freeCashFlow > 0) {
    businessQuality += t.fcfPoints;
  }

  score += businessQuality;

  // Solidité financière (30 points max)
  let financialStrength = 0;

  // Ratio dette/equity < 0.5 (15 points)
  if (stock.debtToEquity < t.debtToEquity.low) {
    financialStrength += t.debtToEquityPoints.low;
  } else if (stock.debtToEquity < t.debtToEquity.medium) {
    financialStrength += t.debtToEquityPoints.medium;
  } else if (stock.debtToEquity < t.debtToEquity.high) {
    financialStrength += t.debtToEquityPoints.high;
  }

  // Current ratio > 1.5 (15 points)
  if (stock.currentRatio >= t.currentRatio.excellent) {
    financialStrength += t.currentRatioPoints.excellent;
  } else if (stock.currentRatio >= t.currentRatio.good) {
    financialStrength += t.currentRatioPoints.good;
  } else if (stock.currentRatio >= t.currentRatio.fair) {
    financialStrength += t.currentRatioPoints.fair;
  }

  score += financialStrength;

  // Valorisation (30 points max)
  let valuation = 0;

  // P/E ratio raisonnable (10 points)
  if (stock.pe > 0 && stock.pe < t.pe.cheap) {
    valuation += t.pePoints.cheap;
  } else if (stock.pe >= t.pe.cheap && stock.pe < t.pe.fair) {
    valuation += t.pePoints.fair;
  } else if (stock.pe >= t.pe.fair && stock.pe < t.pe.moderate) {
    valuation += t.pePoints.moderate;
  }

  // P/B ratio (5 points)
  if (stock.pb > 0 && stock.pb < t.pb.cheap) {
    valuation += t.pbPoints.cheap;
  } else if (stock.pb >= t.pb.cheap && stock.pb < t.pb.fair) {
    valuation += t.pbPoints.fair;
  }

  // Price/FCF (10 points)
  const priceFCF = calculatePriceToFCF(stock.marketCap, stock.freeCashFlow);
  if (priceFCF !== null && priceFCF < t.priceFCF.cheap) {
    valuation += t.priceFCFPoints.cheap;
  } else if (priceFCF !== null && priceFCF < t.priceFCF.fair) {
    valuation += t.priceFCFPoints.fair;
  }

  // Marge de sécurité (5 points)
  if (stock.marginOfSafety >= t.marginOfSafety.strong) {
    valuation += t.marginOfSafetyPoints.strong;
  } else if (stock.marginOfSafety >= t.marginOfSafety.acceptable) {
    valuation += t.marginOfSafetyPoints.acceptable;
  }

  score += valuation;

  // Pénalité ROE : plafonner le score si ROE sous le seuil d'excellence
  if (typeof stock.roe === 'number' && stock.roe < t.roe.excellent) {
    score = Math.min(score, t.roePenaltyCap);
  }

  return Math.round(score);
}

/**
 * Retourne le détail du calcul du score composite (preuve).
 * Chaque ligne indique la métrique, la valeur, les points obtenus et le max.
 *
 * @param {object} stock - Action enrichie
 * @returns {object} { businessQuality: [...], financialStrength: [...], valuation: [...], penalty, baseTotal, adjustedTotal }
 */
export function calculateScoreBreakdown(stock) {
  const t = COMPOSITE_THRESHOLDS;

  function item(label, value, format, points, max) {
    return { label, value, format, points, max };
  }

  // Qualité du business (40 pts max)
  let roePoints = 0;
  if (stock.roe >= t.roe.excellent) roePoints = t.roePoints.excellent;
  else if (stock.roe >= t.roe.good) roePoints = t.roePoints.good;
  else if (stock.roe >= t.roe.fair) roePoints = t.roePoints.fair;

  let netMarginPts = 0;
  if (stock.netMargin >= t.netMargin.good) netMarginPts = t.netMarginPoints.good;
  else if (stock.netMargin >= t.netMargin.fair) netMarginPts = t.netMarginPoints.fair;

  let growthPts = 0;
  if (stock.revenueGrowth5Y >= t.revenueGrowth.strong) growthPts = t.revenueGrowthPoints.strong;
  else if (stock.revenueGrowth5Y >= t.revenueGrowth.good) growthPts = t.revenueGrowthPoints.good;
  else if (stock.revenueGrowth5Y > t.revenueGrowth.positive) growthPts = t.revenueGrowthPoints.positive;

  const fcfPts = stock.freeCashFlow > 0 ? t.fcfPoints : 0;

  const businessQuality = [
    item('ROE', stock.roe, 'pct', roePoints, 15),
    item('Marge nette', stock.netMargin, 'pct', netMarginPts, 10),
    item('Croissance CA', stock.revenueGrowth5Y, 'pct', growthPts, 10),
    item('FCF positif', stock.freeCashFlow, 'num', fcfPts, 5),
  ];

  // Solidité financière (30 pts max)
  let dePts = 0;
  if (stock.debtToEquity < t.debtToEquity.low) dePts = t.debtToEquityPoints.low;
  else if (stock.debtToEquity < t.debtToEquity.medium) dePts = t.debtToEquityPoints.medium;
  else if (stock.debtToEquity < t.debtToEquity.high) dePts = t.debtToEquityPoints.high;

  let crPts = 0;
  if (stock.currentRatio >= t.currentRatio.excellent) crPts = t.currentRatioPoints.excellent;
  else if (stock.currentRatio >= t.currentRatio.good) crPts = t.currentRatioPoints.good;
  else if (stock.currentRatio >= t.currentRatio.fair) crPts = t.currentRatioPoints.fair;

  const financialStrength = [
    item('Dette/Equity', stock.debtToEquity, 'num', dePts, 15),
    item('Current Ratio', stock.currentRatio, 'num', crPts, 15),
  ];

  // Valorisation (30 pts max)
  let pePts = 0;
  if (stock.pe > 0 && stock.pe < t.pe.cheap) pePts = t.pePoints.cheap;
  else if (stock.pe >= t.pe.cheap && stock.pe < t.pe.fair) pePts = t.pePoints.fair;
  else if (stock.pe >= t.pe.fair && stock.pe < t.pe.moderate) pePts = t.pePoints.moderate;

  let pbPts = 0;
  if (stock.pb > 0 && stock.pb < t.pb.cheap) pbPts = t.pbPoints.cheap;
  else if (stock.pb >= t.pb.cheap && stock.pb < t.pb.fair) pbPts = t.pbPoints.fair;

  const priceFCF = calculatePriceToFCF(stock.marketCap, stock.freeCashFlow);
  let pfcfPts = 0;
  if (priceFCF !== null && priceFCF < t.priceFCF.cheap) pfcfPts = t.priceFCFPoints.cheap;
  else if (priceFCF !== null && priceFCF < t.priceFCF.fair) pfcfPts = t.priceFCFPoints.fair;

  let mosPts = 0;
  if (stock.marginOfSafety >= t.marginOfSafety.strong) mosPts = t.marginOfSafetyPoints.strong;
  else if (stock.marginOfSafety >= t.marginOfSafety.acceptable) mosPts = t.marginOfSafetyPoints.acceptable;

  const valuation = [
    item('P/E', stock.pe, 'num', pePts, 10),
    item('P/B', stock.pb, 'num', pbPts, 5),
    item('P/FCF', priceFCF, 'num', pfcfPts, 10),
    item('Marge sécurité', stock.marginOfSafety, 'pct', mosPts, 5),
  ];

  const rawTotal = businessQuality.reduce((s, i) => s + i.points, 0)
    + financialStrength.reduce((s, i) => s + i.points, 0)
    + valuation.reduce((s, i) => s + i.points, 0);

  const penaltyCapped = typeof stock.roe === 'number' && stock.roe < t.roe.excellent;
  const baseTotal = penaltyCapped ? Math.min(rawTotal, t.roePenaltyCap) : rawTotal;

  const sectorAdj = (stock.compositeScore ?? baseTotal) - baseTotal;

  return {
    businessQuality,
    financialStrength,
    valuation,
    penaltyCapped,
    penaltyCap: t.roePenaltyCap,
    rawTotal,
    baseTotal: Math.round(baseTotal),
    sectorAdj,
    adjustedTotal: stock.compositeScore ?? Math.round(baseTotal),
  };
}

/**
 * Calcule un score de risque (0 = faible risque, 100 = risque élevé).
 *
 * @param {object} stock - Action enrichie
 * @returns {number} Score de risque arrondi
 */
export function calculateRiskScore(stock) {
  let risk = 0;
  const t = RISK_THRESHOLDS;

  // Risque sectoriel de base
  const sectorKey = (stock.sector || '').toLowerCase();
  let sectorProfile = SECTOR_RISK_PROFILES.default;
  if (sectorKey.includes('financial')) sectorProfile = SECTOR_RISK_PROFILES.financial;
  else if (sectorKey.includes('energy') || sectorKey.includes('utility')) sectorProfile = SECTOR_RISK_PROFILES.energy;
  else if (sectorKey.includes('technology')) sectorProfile = SECTOR_RISK_PROFILES.technology;
  risk += sectorProfile.baseRisk;

  if (typeof stock.debtToEquity === 'number') {
    if (stock.debtToEquity > t.debtToEquity.high) risk += t.debtToEquityRisk.high;
    else if (stock.debtToEquity > t.debtToEquity.medium) risk += t.debtToEquityRisk.medium;
    else if (stock.debtToEquity > t.debtToEquity.low) risk += t.debtToEquityRisk.low;
  } else {
    risk += t.debtToEquityMissing;
  }

  if (typeof stock.currentRatio === 'number') {
    if (stock.currentRatio < t.currentRatio.danger) risk += t.currentRatioRisk.danger;
    else if (stock.currentRatio < t.currentRatio.warning) risk += t.currentRatioRisk.warning;
  } else {
    risk += t.currentRatioMissing;
  }

  if (typeof stock.marginOfSafety === 'number') {
    if (stock.marginOfSafety < t.marginOfSafety.negative) risk += t.marginOfSafetyRisk.negative;
    else if (stock.marginOfSafety < t.marginOfSafety.low) risk += t.marginOfSafetyRisk.low;
  } else {
    risk += t.marginOfSafetyMissing;
  }

  if (typeof stock.pe === 'number' && stock.pe > 0) {
    if (stock.pe > t.pe.extreme) risk += t.peRisk.extreme;
    else if (stock.pe > t.pe.high) risk += t.peRisk.high;
  } else {
    risk += t.peMissing;
  }

  if (typeof stock.freeCashFlow === 'number') {
    if (stock.freeCashFlow <= 0) risk += t.fcfNegativeRisk;
  } else {
    risk += t.fcfMissing;
  }

  if (typeof stock.dataQualityScore === 'number') {
    if (stock.dataQualityScore < t.dataQuality.poor) risk += t.dataQualityRisk.poor;
    else if (stock.dataQualityScore < t.dataQuality.fair) risk += t.dataQualityRisk.fair;
  }

  return Math.max(0, Math.min(100, Math.round(risk)));
}

/**
 * Génère une mini-thèse d'investissement basée sur les métriques clés.
 *
 * @param {object} stock - Action enrichie
 * @returns {{strengths: string[], risks: string[], verdict: string}}
 */
export function buildInvestmentThesis(stock) {
  const strengths = [];
  const risks = [];
  const t = THESIS_THRESHOLDS;
  const v = VERDICT_THRESHOLDS;

  if (stock.roe >= t.roeGood) strengths.push('Rentabilité élevée (ROE > 15%).');
  else risks.push('Rentabilité limitée (ROE sous le seuil de qualité).');

  if (stock.netMargin >= t.netMarginGood) strengths.push('Marge nette robuste, signe de pouvoir de pricing.');
  else risks.push('Marge nette faible, vulnérable à la pression concurrentielle.');

  if (stock.freeCashFlow > 0) strengths.push('Génération de cash-flow libre positive.');
  else risks.push('Free cash-flow négatif ou insuffisant.');

  if (stock.debtToEquity <= t.debtToEquityMax) strengths.push('Leverage maîtrisé (dette raisonnable).');
  else risks.push('Leverage élevé, risque en cas de hausse des taux.');

  if (stock.marginOfSafety >= t.marginOfSafetyGood) strengths.push('Valorisation avec marge de sécurité acceptable.');
  else if (typeof stock.marginOfSafety === 'number') risks.push('Marge de sécurité faible, exposition à une correction.');

  if (typeof stock.priceCagr10Y === 'number' && stock.priceCagr10Y >= t.priceCagrGood) {
    strengths.push('Track record long terme solide (CAGR prix 10 ans élevé).');
  }

  if (typeof stock.dataQualityScore === 'number' && stock.dataQualityScore < t.dataQualityWarning) {
    risks.push('Qualité de données partielle: prudence sur la conclusion.');
  }

  const riskScore = calculateRiskScore(stock);
  let verdict = 'Profil équilibré, nécessite validation qualitative.';
  if (riskScore <= v.riskThreshold && stock.compositeScore >= v.compositeThreshold) {
    verdict = 'Candidat de qualité avec risque maîtrisé pour une watchlist long terme.';
  } else if (riskScore >= v.highRisk) {
    verdict = 'Dossier risqué: exiger une marge de sécurité plus élevée ou attendre.';
  }

  return {
    strengths,
    risks,
    verdict,
  };
}

/**
 * Calcule le FCF Yield (rendement du free cash-flow)
 *
 * Formule: FCF Yield = FCF / Market Cap × 100
 *
 * @param {number} marketCap - Capitalisation boursière (en millions)
 * @param {number} freeCashFlow - Free Cash Flow (en millions)
 * @returns {number|null} FCF Yield en pourcentage
 */
export function calculateFCFYield(marketCap, freeCashFlow) {
  if (
    typeof marketCap !== 'number' ||
    typeof freeCashFlow !== 'number' ||
    !Number.isFinite(marketCap) ||
    !Number.isFinite(freeCashFlow) ||
    marketCap <= 0
  ) {
    return null;
  }

  return (freeCashFlow / marketCap) * 100;
}

/**
 * Calcule le PEG Ratio (Price/Earnings to Growth)
 *
 * Formule: PEG = P/E / Croissance des bénéfices
 *
 * @param {number} pe - Price/Earnings ratio
 * @param {number} earningsGrowth - Croissance des bénéfices (en %)
 * @returns {number|null} PEG ratio
 */
export function calculatePEGRatio(pe, earningsGrowth) {
  if (
    typeof pe !== 'number' ||
    typeof earningsGrowth !== 'number' ||
    !Number.isFinite(pe) ||
    !Number.isFinite(earningsGrowth) ||
    pe <= 0 ||
    earningsGrowth <= 0
  ) {
    return null;
  }

  return pe / earningsGrowth;
}

/**
 * Détermine si une action passe les filtres de Carlos
 *
 * @param {object} stock - Objet action
 * @param {object} filters - Critères de filtrage
 * @returns {boolean} true si l'action passe tous les filtres
 */
export function passesCarlosCriteria(stock, filters) {
  const priceToFCF = calculatePriceToFCF(stock.marketCap, stock.freeCashFlow);
  return (
    stock.roe >= filters.minROE &&
    stock.netMargin >= filters.minNetMargin &&
    stock.revenueGrowth5Y >= filters.minRevenueGrowth &&
    stock.freeCashFlow >= filters.minFCF &&
    stock.debtToEquity <= filters.maxDebtToEquity &&
    stock.currentRatio >= filters.minCurrentRatio &&
    stock.pe <= filters.maxPE &&
    stock.pb <= filters.maxPB &&
    priceToFCF !== null &&
    priceToFCF <= filters.maxPriceFCF
  );
}
