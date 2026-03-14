import { describe, it, expect } from 'vitest';
import {
  calculateIntrinsicValue,
  calculateGrahamNumber,
  calculateROIC,
  calculateMoatScore,
  calculateCompositeScore,
  calculateRiskScore,
  buildInvestmentThesis,
  calculateMarginOfSafety,
  calculatePriceToFCF,
  calculateCAGR,
  calculateIntrinsicValueScenarios,
  calculateOwnerEarnings,
} from '../financialCalculations.js';

// --- calculateIntrinsicValue ---
describe('calculateIntrinsicValue', () => {
  it('returns a positive value for valid inputs', () => {
    const result = calculateIntrinsicValue(1000, 0.08, 0.10, 10);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for null FCF', () => {
    expect(calculateIntrinsicValue(null)).toBe(0);
  });

  it('returns 0 for zero FCF', () => {
    expect(calculateIntrinsicValue(0)).toBe(0);
  });

  it('returns 0 for negative FCF', () => {
    expect(calculateIntrinsicValue(-500)).toBe(0);
  });

  it('returns positive value even when growthRate >= discountRate (two-stage model)', () => {
    const result1 = calculateIntrinsicValue(1000, 0.12, 0.10, 10);
    expect(result1).toBeGreaterThan(0);
    expect(Number.isFinite(result1)).toBe(true);

    const result2 = calculateIntrinsicValue(1000, 0.10, 0.10, 10);
    expect(result2).toBeGreaterThan(0);
    expect(Number.isFinite(result2)).toBe(true);
  });

  it('higher growth rate produces higher valuation', () => {
    const low = calculateIntrinsicValue(1000, 0.04, 0.11, 10);
    const mid = calculateIntrinsicValue(1000, 0.08, 0.10, 10);
    const high = calculateIntrinsicValue(1000, 0.12, 0.09, 10);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it('uses default parameters', () => {
    const result = calculateIntrinsicValue(1000);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });
});

// --- calculateGrahamNumber ---
describe('calculateGrahamNumber', () => {
  it('returns positive value for positive EPS', () => {
    const result = calculateGrahamNumber(5, 10, 4.4);
    expect(result).toBeGreaterThan(0);
    // EPS=5, g=10 => 5 * (8.5 + 20) = 142.5, * 4.4/4.4 = 142.5
    expect(result).toBeCloseTo(142.5);
  });

  it('returns 0 for zero EPS', () => {
    expect(calculateGrahamNumber(0)).toBe(0);
  });

  it('returns 0 for negative EPS', () => {
    expect(calculateGrahamNumber(-3)).toBe(0);
  });

  it('returns 0 for null EPS', () => {
    expect(calculateGrahamNumber(null)).toBe(0);
  });

  it('handles zero growth rate', () => {
    const result = calculateGrahamNumber(5, 0, 4.4);
    // 5 * (8.5 + 0) * 4.4/4.4 = 42.5
    expect(result).toBeCloseTo(42.5);
  });
});

// --- calculateROIC ---
describe('calculateROIC', () => {
  it('calculates ROIC correctly', () => {
    // NOPAT = 100 * (1 - 0.25) = 75
    // Invested Capital = 200 + 300 = 500
    // ROIC = 75/500 * 100 = 15%
    const result = calculateROIC(100, 200, 300, 0.25);
    expect(result).toBeCloseTo(15);
  });

  it('returns 0 when invested capital is 0', () => {
    expect(calculateROIC(100, 0, 0)).toBe(0);
  });

  it('uses default tax rate', () => {
    const result = calculateROIC(100, 200, 300);
    expect(result).toBeCloseTo(15);
  });
});

// --- calculateMoatScore ---
describe('calculateMoatScore', () => {
  it('returns max score for excellent metrics', () => {
    const result = calculateMoatScore({
      roe: 25,
      netMargin: 25,
      revenueGrowth: 15,
      freeCashFlow: 1000,
    });
    // 25+10 + 20+10 + 20+10 + 15 = 110 => capped to 100
    expect(result).toBe(100);
  });

  it('returns 0 for poor metrics', () => {
    const result = calculateMoatScore({
      roe: 5,
      netMargin: 3,
      revenueGrowth: -2,
      freeCashFlow: -100,
    });
    expect(result).toBe(0);
  });

  it('handles partial metrics', () => {
    const result = calculateMoatScore({
      roe: 16,
      netMargin: 5,
      revenueGrowth: 3,
      freeCashFlow: 100,
    });
    // ROE>=15: 25, netMargin<10: 0, growth>0: 20, FCF>0: 15 = 60
    expect(result).toBe(60);
  });

  it('handles null/undefined metrics', () => {
    const result = calculateMoatScore({});
    expect(result).toBe(0);
  });
});

// --- calculateMarginOfSafety ---
describe('calculateMarginOfSafety', () => {
  it('calculates positive margin of safety', () => {
    // (200 - 100) / 200 * 100 = 50%
    expect(calculateMarginOfSafety(200, 100)).toBeCloseTo(50);
  });

  it('calculates negative margin of safety', () => {
    // (100 - 200) / 100 * 100 = -100%
    expect(calculateMarginOfSafety(100, 200)).toBeCloseTo(-100);
  });

  it('returns 0 when intrinsic value is 0', () => {
    expect(calculateMarginOfSafety(0, 100)).toBe(0);
  });

  it('returns 0 when intrinsic value is null', () => {
    expect(calculateMarginOfSafety(null, 100)).toBe(0);
  });
});

// --- calculatePriceToFCF ---
describe('calculatePriceToFCF', () => {
  it('calculates ratio correctly', () => {
    expect(calculatePriceToFCF(1000, 100)).toBeCloseTo(10);
  });

  it('returns null for zero FCF', () => {
    expect(calculatePriceToFCF(1000, 0)).toBeNull();
  });

  it('returns null for negative FCF', () => {
    expect(calculatePriceToFCF(1000, -50)).toBeNull();
  });

  it('returns null for non-number inputs', () => {
    expect(calculatePriceToFCF('1000', 100)).toBeNull();
    expect(calculatePriceToFCF(1000, null)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(calculatePriceToFCF(Infinity, 100)).toBeNull();
  });
});

// --- calculateCAGR ---
describe('calculateCAGR', () => {
  it('calculates CAGR correctly', () => {
    // (200/100)^(1/10) - 1 = ~7.18%
    const result = calculateCAGR(100, 200, 10);
    expect(result).toBeCloseTo(7.177, 1);
  });

  it('returns null for negative start value', () => {
    expect(calculateCAGR(-100, 200, 10)).toBeNull();
  });

  it('returns null for negative end value', () => {
    expect(calculateCAGR(100, -200, 10)).toBeNull();
  });

  it('returns null for zero years', () => {
    expect(calculateCAGR(100, 200, 0)).toBeNull();
  });

  it('returns null for non-number inputs', () => {
    expect(calculateCAGR('100', 200, 10)).toBeNull();
  });

  it('returns 0% when start equals end', () => {
    expect(calculateCAGR(100, 100, 10)).toBeCloseTo(0);
  });
});

// --- calculateCompositeScore ---
describe('calculateCompositeScore', () => {
  it('returns high score for excellent stock', () => {
    const stock = {
      roe: 25,
      netMargin: 15,
      revenueGrowth5Y: 12,
      freeCashFlow: 5000,
      debtToEquity: 0.3,
      currentRatio: 2.5,
      pe: 12,
      pb: 1.2,
      marketCap: 100000,
      marginOfSafety: 35,
    };
    const score = calculateCompositeScore(stock);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns low score for poor stock', () => {
    const stock = {
      roe: 2,
      netMargin: 2,
      revenueGrowth5Y: -5,
      freeCashFlow: -100,
      debtToEquity: 3,
      currentRatio: 0.5,
      pe: 50,
      pb: 8,
      marketCap: 100000,
      marginOfSafety: -20,
    };
    const score = calculateCompositeScore(stock);
    expect(score).toBeLessThanOrEqual(10);
  });

  it('score is between 0 and 100', () => {
    const stock = {
      roe: 10,
      netMargin: 7,
      revenueGrowth5Y: 3,
      freeCashFlow: 100,
      debtToEquity: 0.8,
      currentRatio: 1.2,
      pe: 18,
      pb: 2,
      marketCap: 50000,
      marginOfSafety: 15,
    };
    const score = calculateCompositeScore(stock);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// --- calculateRiskScore ---
describe('calculateRiskScore', () => {
  it('returns low risk for safe stock', () => {
    const stock = {
      debtToEquity: 0.3,
      currentRatio: 2.0,
      marginOfSafety: 30,
      pe: 15,
      freeCashFlow: 5000,
      dataQualityScore: 90,
    };
    const risk = calculateRiskScore(stock);
    expect(risk).toBeLessThan(20);
  });

  it('returns high risk for risky stock', () => {
    const stock = {
      debtToEquity: 3,
      currentRatio: 0.5,
      marginOfSafety: -20,
      pe: 50,
      freeCashFlow: -100,
      dataQualityScore: 40,
    };
    const risk = calculateRiskScore(stock);
    expect(risk).toBeGreaterThan(60);
  });

  it('adds risk for missing data', () => {
    const withData = calculateRiskScore({
      debtToEquity: 0.3,
      currentRatio: 2.0,
      marginOfSafety: 30,
      pe: 15,
      freeCashFlow: 5000,
      dataQualityScore: 90,
    });
    const withoutData = calculateRiskScore({});
    expect(withoutData).toBeGreaterThan(withData);
  });

  it('is bounded between 0 and 100', () => {
    const risk = calculateRiskScore({
      debtToEquity: 10,
      currentRatio: 0.1,
      marginOfSafety: -100,
      pe: 200,
      freeCashFlow: -10000,
      dataQualityScore: 10,
    });
    expect(risk).toBeLessThanOrEqual(100);
    expect(risk).toBeGreaterThanOrEqual(0);
  });
});

// --- buildInvestmentThesis ---
describe('buildInvestmentThesis', () => {
  it('returns excellent verdict for quality stock', () => {
    const stock = {
      roe: 20,
      netMargin: 15,
      freeCashFlow: 5000,
      debtToEquity: 0.3,
      marginOfSafety: 30,
      compositeScore: 80,
      dataQualityScore: 90,
      currentRatio: 2.0,
      pe: 15,
    };
    const thesis = buildInvestmentThesis(stock);
    expect(thesis.strengths.length).toBeGreaterThan(0);
    expect(thesis.verdict).toContain('qualité');
  });

  it('returns risky verdict for poor stock', () => {
    const stock = {
      roe: 5,
      netMargin: 3,
      freeCashFlow: -100,
      debtToEquity: 3,
      marginOfSafety: -20,
      compositeScore: 20,
      dataQualityScore: 40,
      currentRatio: 0.5,
      pe: 50,
    };
    const thesis = buildInvestmentThesis(stock);
    expect(thesis.risks.length).toBeGreaterThan(0);
    expect(thesis.verdict).toContain('risqué');
  });

  it('returns balanced verdict for average stock', () => {
    const stock = {
      roe: 12,
      netMargin: 8,
      freeCashFlow: 500,
      debtToEquity: 0.6,
      marginOfSafety: 15,
      compositeScore: 50,
      dataQualityScore: 85,
      currentRatio: 1.5,
      pe: 20,
    };
    const thesis = buildInvestmentThesis(stock);
    expect(thesis.verdict).toContain('équilibré');
  });
});

// --- calculateIntrinsicValueScenarios ---
describe('calculateIntrinsicValueScenarios', () => {
  it('returns bear < base < bull for valid FCF', () => {
    const result = calculateIntrinsicValueScenarios(1000);
    expect(result.bear).toBeGreaterThan(0);
    expect(result.base).toBeGreaterThan(0);
    expect(result.bull).toBeGreaterThan(0);
    expect(result.bear).toBeLessThan(result.base);
    expect(result.base).toBeLessThan(result.bull);
  });

  it('low equals bear and high equals bull', () => {
    const result = calculateIntrinsicValueScenarios(1000);
    expect(result.low).toBe(result.bear);
    expect(result.high).toBe(result.bull);
  });

  it('returns 0 for all scenarios with zero FCF', () => {
    const result = calculateIntrinsicValueScenarios(0);
    expect(result.bear).toBe(0);
    expect(result.base).toBe(0);
    expect(result.bull).toBe(0);
  });

  it('dcfQuality is fiable when all scenarios are positive and ordered', () => {
    const result = calculateIntrinsicValueScenarios(1000);
    expect(result.dcfQuality).toBe('fiable');
  });

  it('dcfQuality is indisponible for zero or negative FCF', () => {
    expect(calculateIntrinsicValueScenarios(0).dcfQuality).toBe('indisponible');
    expect(calculateIntrinsicValueScenarios(-100).dcfQuality).toBe('indisponible');
  });
});

// --- calculateOwnerEarnings ---
describe('calculateOwnerEarnings', () => {
  it('calculates correctly', () => {
    expect(calculateOwnerEarnings(100, 20, 30, 5)).toBe(85);
  });

  it('uses default working capital change of 0', () => {
    expect(calculateOwnerEarnings(100, 20, 30)).toBe(90);
  });
});
