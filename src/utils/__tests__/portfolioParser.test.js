import { describe, it, expect } from 'vitest';
import { parsePortfolioCSV } from '../portfolioParser.js';

const SAMPLE_CSV = `sep=;
ACTIONS CAD
Compte;Symbole;Description;Quantité;Coût moyen;Coût total;Dernier prix;Variation $;Variation %;Valeur marchande;Profit/Perte;Profit/Perte %
CELI-123;RY.TO;BANQUE ROYALE DU CANADA;50;120,50;6025,00;135,75;1,25;0,93;6787,50;762,50;12,66
REER-456;RY.TO;BANQUE ROYALE DU CANADA;30;118,00;3540,00;135,75;1,25;0,93;4072,50;532,50;15,04
CELI-123;ENB.TO;ENBRIDGE INC;100;48,30;4830,00;55,10;-0,50;-0,90;5510,00;680,00;14,08
REER-456;CASH-C;ENCAISSE CAD;0;0;0;0;0;0;1500,00;0;0
ACTIONS USD
Compte;Symbole;Description;Quantité;Coût moyen;Coût total;Dernier prix;Variation $;Variation %;Valeur marchande;Profit/Perte;Profit/Perte %
CELI-123;AAPL;APPLE INC;20;150,25;3005,00;185,50;2,30;1,25;3710,00;705,00;23,46
REER-456;MSFT;MICROSOFT CORP;15;280,00;4200,00;310,45;-1,10;-0,35;4656,75;456,75;10,88`;

// Format reel Disnat avec \r line endings et en-tetes specifiques
const DISNAT_CSV = [
  'sep=;',
  'Compte;Symbole;Nom;Qté;Coût Moyen $;Coût Total $;Heure différé;Prix actuel $;Variation du jour $;Variation du jour %;Qté x valeur du jour $;Valeur au marché $;Valeur d\'emprunt $;Profits non réalisés $;Profits non réalisés %',
  'ACTIONS CAD',
  '65LPA12;BK-C;CANADIAN BANC CORP;20;11,138;222,76;2026-02-24 16:00:10.0;14,54;-0,01;-0,069;-0,2;290,8;N/D;68,04;30,544',
  '65LPAZ5;CASH-C;;315;50,02;15756,3;2026-02-24 16:00:11.0;50,02;0;0;0;15756,3;N/D;0;0',
  '65LPAZ5;HXQ-C;GLB X NSDQ-100 ETF;167;87,874;14675,03;2026-02-24 15:59:59.0;98,22;1,07;1,101;178,69;16402,74;N/D;1727,71;11,773',
  'ACTIONS USD',
  '65LPAS0;QQQ-U;INVESCO QQQ TRUST ETF;49;366,04;17935,96;2026-02-24 16:01:46.0;607,8;6,39;1,063;313,11;29782,2;N/D;11846,24;66,047',
].join('\r');

describe('parsePortfolioCSV', () => {
  it('parse correctement les positions CAD et USD', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    expect(result.holdings.length).toBe(4);

    const aapl = result.holdings.find((h) => h.symbol === 'AAPL');
    expect(aapl).toBeDefined();
    expect(aapl.currency).toBe('USD');
    expect(aapl.quantity).toBe(20);
    expect(aapl.currentPrice).toBeCloseTo(185.50);

    const enb = result.holdings.find((h) => h.symbol === 'ENB.TO');
    expect(enb).toBeDefined();
    expect(enb.currency).toBe('CAD');
  });

  it('ignore la ligne sep=; et les en-tetes de section', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    expect(result.holdings.find((h) => h.symbol.includes('sep'))).toBeUndefined();
    expect(result.holdings.find((h) => h.symbol.includes('ACTIONS'))).toBeUndefined();
  });

  it('consolide les doublons (meme ticker, comptes differents)', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    const ry = result.holdings.find((h) => h.symbol === 'RY.TO');
    expect(ry).toBeDefined();
    expect(ry.quantity).toBe(80);
    expect(ry.totalCost).toBeCloseTo(9565.00);
    expect(ry.marketValue).toBeCloseTo(10860.00);
    expect(ry.unrealizedPL).toBeCloseTo(1295.00);
    expect(ry.accounts).toEqual(['CELI-123', 'REER-456']);
  });

  it('recalcule le cout moyen apres consolidation', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    const ry = result.holdings.find((h) => h.symbol === 'RY.TO');
    expect(ry.avgCost).toBeCloseTo(119.5625);
  });

  it('recalcule le P&L % apres consolidation', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    const ry = result.holdings.find((h) => h.symbol === 'RY.TO');
    expect(ry.unrealizedPLPct).toBeCloseTo(13.539, 1);
  });

  it('gere les nombres avec virgule comme separateur decimal', () => {
    const csv = `ACTIONS CAD
Compte;Symbole;Description;Quantité;Coût moyen;Coût total;Dernier prix;Variation $;Variation %;Valeur marchande;Profit/Perte;Profit/Perte %
CELI;TEST.TO;TEST CORP;100;11,138;1113,80;12,50;0,25;2,04;1250,00;136,20;12,23`;
    const result = parsePortfolioCSV(csv);
    const test = result.holdings.find((h) => h.symbol === 'TEST.TO');
    expect(test.avgCost).toBeCloseTo(11.138);
    expect(test.totalCost).toBeCloseTo(1113.80);
  });

  it('filtre le cash separement', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    expect(result.cashHoldings.length).toBe(1);
    expect(result.cashHoldings[0].symbol).toBe('CASH-C');
    expect(result.cashHoldings[0].marketValue).toBe(1500);
    expect(result.holdings.find((h) => h.symbol === 'CASH-C')).toBeUndefined();
  });

  it('calcule le resume correctement', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    const { summary } = result;
    expect(summary.totalMarketValue).toBeCloseTo(6787.50 + 4072.50 + 5510 + 1500 + 3710 + 4656.75);
    expect(summary.totalCost).toBeCloseTo(6025 + 3540 + 4830 + 3005 + 4200);
    expect(summary.totalPL).toBeCloseTo(762.50 + 532.50 + 680 + 705 + 456.75);
    expect(summary.positionCount).toBe(4);
    expect(summary.totalCash).toBe(1500);
  });

  it('calcule la repartition CAD/USD', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    const { summary } = result;
    expect(summary.cadValue).toBeCloseTo(17870);
    expect(summary.usdValue).toBeCloseTo(8366.75);
  });

  it('retourne la ventilation par compte', () => {
    const result = parsePortfolioCSV(SAMPLE_CSV);
    expect(result.accounts.length).toBe(2);
    const celi = result.accounts.find((a) => a.account === 'CELI-123');
    expect(celi).toBeDefined();
    expect(celi.positionCount).toBe(3);
    const reer = result.accounts.find((a) => a.account === 'REER-456');
    expect(reer).toBeDefined();
    expect(reer.positionCount).toBe(3);
  });

  it('ignore les lignes vides', () => {
    const csv = `ACTIONS CAD

Compte;Symbole;Description;Quantité;Coût moyen;Coût total;Dernier prix;Variation $;Variation %;Valeur marchande;Profit/Perte;Profit/Perte %

CELI;TD.TO;TD BANK;10;80,00;800,00;85,00;0;0;850,00;50,00;6,25

`;
    const result = parsePortfolioCSV(csv);
    expect(result.holdings.length).toBe(1);
    expect(result.holdings[0].symbol).toBe('TD.TO');
  });

  it('gere un CSV vide', () => {
    const result = parsePortfolioCSV('');
    expect(result.holdings).toEqual([]);
    expect(result.accounts).toEqual([]);
    expect(result.summary.totalMarketValue).toBe(0);
  });

  it('parse le format Disnat avec \\r line endings', () => {
    const result = parsePortfolioCSV(DISNAT_CSV);
    expect(result.holdings.length).toBe(3); // BK-C, HXQ-C, QQQ-U (pas CASH)
    expect(result.cashHoldings.length).toBe(1);

    const bk = result.holdings.find((h) => h.symbol === 'BK-C');
    expect(bk).toBeDefined();
    expect(bk.currency).toBe('CAD');
    expect(bk.quantity).toBe(20);
    expect(bk.avgCost).toBeCloseTo(11.138);
    expect(bk.marketValue).toBeCloseTo(290.8);
    expect(bk.unrealizedPL).toBeCloseTo(68.04);

    const qqq = result.holdings.find((h) => h.symbol === 'QQQ-U');
    expect(qqq).toBeDefined();
    expect(qqq.currency).toBe('USD');
    expect(qqq.currentPrice).toBeCloseTo(607.8);
  });

  it('gere les valeurs N/D du format Disnat', () => {
    const result = parsePortfolioCSV(DISNAT_CSV);
    // N/D dans "Valeur d'emprunt" ne doit pas casser le parsing
    expect(result.holdings.length).toBeGreaterThan(0);
  });

  it('parse les en-tetes Disnat avec suffixes $ et %', () => {
    const result = parsePortfolioCSV(DISNAT_CSV);
    const hxq = result.holdings.find((h) => h.symbol === 'HXQ-C');
    expect(hxq).toBeDefined();
    expect(hxq.totalCost).toBeCloseTo(14675.03);
    expect(hxq.currentPrice).toBeCloseTo(98.22);
    expect(hxq.marketValue).toBeCloseTo(16402.74);
    expect(hxq.unrealizedPLPct).toBeCloseTo(11.773, 1);
  });
});
