import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { calculatePriceToFCF, calculatePEGRatio, calculateScoreBreakdown } from '../utils/financialCalculations';
import { exportStockReport } from '../utils/csvParser';
import { ENRICHED_THRESHOLDS, DCF_SCENARIOS, DCF_DEFAULTS } from '../utils/constants';

/**
 * Barre visuelle de position dans une plage (ex: prix vs 52 semaines)
 */
function RangeBar({ value, low, high, label }) {
  if (typeof value !== 'number' || typeof low !== 'number' || typeof high !== 'number' || high <= low) {
    return null;
  }
  const pct = Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
  return (
    <div className="mt-1">
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full"
          style={{ width: '100%' }}
        />
        <div
          className="absolute top-0 w-2 h-full bg-gray-800 rounded-full border border-white"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>${typeof low === 'number' ? low.toFixed(2) : 'N/A'}</span>
        <span>${typeof high === 'number' ? high.toFixed(2) : 'N/A'}</span>
      </div>
    </div>
  );
}

/**
 * Barre visuelle pour les marges en cascade
 */
function MarginCascade({ grossMargin, ebitdaMargin, operatingMargin, netMargin }) {
  const margins = [
    { label: 'Marge brute', value: grossMargin, color: 'bg-blue-400' },
    { label: 'Marge EBITDA', value: ebitdaMargin, color: 'bg-blue-500' },
    { label: 'Marge opérat.', value: operatingMargin, color: 'bg-blue-600' },
    { label: 'Marge nette', value: netMargin, color: 'bg-blue-700' },
  ].filter(m => typeof m.value === 'number' && Number.isFinite(m.value));

  if (margins.length === 0) return null;

  const maxVal = Math.max(...margins.map(m => Math.abs(m.value)), 1);

  return (
    <div className="space-y-2">
      {margins.map((m) => (
        <div key={m.label} className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-28 text-xs">{m.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
            <div
              className={`${m.color} h-full rounded-full`}
              style={{ width: `${Math.max(0, (m.value / maxVal) * 100)}%` }}
            />
          </div>
          <span className="font-medium text-xs w-14 text-right">{m.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Popover affichant la décomposition du Score Carlos
 */
function ScoreBreakdownPopover({ stock }) {
  const bd = calculateScoreBreakdown(stock);

  const formatVal = (item) => {
    if (item.value == null) return 'N/A';
    if (item.format === 'pct') return `${item.value.toFixed(1)}%`;
    return typeof item.value === 'number' ? item.value.toFixed(2) : String(item.value);
  };

  const pointsColor = (pts, max) => {
    if (pts === max) return 'text-green-600';
    if (pts > 0) return 'text-yellow-600';
    return 'text-red-500';
  };

  const Section = ({ title, items, maxTotal }) => (
    <div>
      <p className="font-semibold text-gray-700 text-[11px] mb-1 uppercase tracking-wide">{title} ({items.reduce((s, i) => s + i.points, 0)}/{maxTotal})</p>
      {items.map((item) => (
        <div key={item.label} className="flex justify-between text-[11px] leading-relaxed">
          <span className="text-gray-500">{item.label} <span className="text-gray-400">({formatVal(item)})</span></span>
          <span className={`font-medium ${pointsColor(item.points, item.max)}`}>{item.points}/{item.max}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="invisible group-hover:visible absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-2">
      <Section title="Qualité business" items={bd.businessQuality} maxTotal={40} />
      <Section title="Solidité financière" items={bd.financialStrength} maxTotal={30} />
      <Section title="Valorisation" items={bd.valuation} maxTotal={30} />
      <div className="border-t border-gray-100 pt-1.5 text-[11px] space-y-0.5">
        {bd.penaltyCapped && (
          <p className="text-orange-600">Plafonné à {bd.penaltyCap} (ROE &lt; 15%)</p>
        )}
        <div className="flex justify-between font-semibold text-gray-700">
          <span>Base</span>
          <span>{bd.baseTotal}/100</span>
        </div>
        {bd.sectorAdj !== 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Ajust. sectoriel</span>
            <span>{bd.sectorAdj > 0 ? '+' : ''}{bd.sectorAdj}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900">
          <span>Final</span>
          <span>{bd.adjustedTotal}/100</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Graphique de progression financière annuelle (revenus, bénéfices, FCF)
 */
function FinancialProgressionChart({ financialHistory }) {
  const data = useMemo(() => {
    if (!Array.isArray(financialHistory) || financialHistory.length === 0) return [];
    return financialHistory.map((item) => ({
      year: item.year,
      revenue: item.revenue != null ? item.revenue / 1e6 : null,
      netIncome: item.netIncome != null ? item.netIncome / 1e6 : null,
      grossProfit: item.grossProfit != null ? item.grossProfit / 1e6 : null,
      operatingIncome: item.operatingIncome != null ? item.operatingIncome / 1e6 : null,
      freeCashFlow: item.freeCashFlow != null ? item.freeCashFlow / 1e6 : null,
    }));
  }, [financialHistory]);

  const growthRates = useMemo(() => {
    if (data.length < 2) return [];
    return data.slice(1).map((item, i) => {
      const prev = data[i];
      const revenueGrowth = prev.revenue && item.revenue ? ((item.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100 : null;
      const netIncomeGrowth = prev.netIncome && item.netIncome ? ((item.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100 : null;
      const fcfGrowth = prev.freeCashFlow && item.freeCashFlow ? ((item.freeCashFlow - prev.freeCashFlow) / Math.abs(prev.freeCashFlow)) * 100 : null;
      return { year: item.year, revenueGrowth, netIncomeGrowth, fcfGrowth };
    });
  }, [data]);

  if (data.length === 0) return null;

  const formatM = (value) => {
    if (value == null) return 'N/A';
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}B`;
    return `${value.toFixed(0)}M`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: ${formatM(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const GrowthTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {entry.value != null ? `${entry.value.toFixed(1)}%` : 'N/A'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Progression financière annuelle
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graphique valeurs absolues */}
        <div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Revenus, bénéfices & FCF</p>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatM} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" fill="#dbeafe" stroke="#3b82f6" strokeWidth={2} name="Revenus" />
              <Bar dataKey="grossProfit" fill="#86efac" name="Profit brut" barSize={20} />
              <Bar dataKey="netIncome" fill="#fbbf24" name="Bénéfice net" barSize={20} />
              <Line type="monotone" dataKey="freeCashFlow" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="FCF" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique taux de croissance */}
        {growthRates.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">Taux de croissance annuels</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={growthRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<GrowthTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenueGrowth" fill="#3b82f6" name="Croiss. revenus" barSize={16} />
                <Bar dataKey="netIncomeGrowth" fill="#fbbf24" name="Croiss. bénéfices" barSize={16} />
                <Bar dataKey="fcfGrowth" fill="#ef4444" name="Croiss. FCF" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tableau récapitulatif */}
      <div className="mt-4 overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="text-left py-1.5 pr-3">Année</th>
              <th className="text-right py-1.5 px-2">Revenus</th>
              <th className="text-right py-1.5 px-2">Profit brut</th>
              <th className="text-right py-1.5 px-2">Rés. opérat.</th>
              <th className="text-right py-1.5 px-2">Bénéfice net</th>
              <th className="text-right py-1.5 px-2">FCF</th>
              <th className="text-right py-1.5 pl-2">Marge nette</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const margin = item.revenue && item.netIncome ? (item.netIncome / item.revenue) * 100 : null;
              return (
                <tr key={item.year} className="border-b border-gray-100">
                  <td className="py-1.5 pr-3 font-medium">{item.year}</td>
                  <td className="text-right py-1.5 px-2">${formatM(item.revenue)}</td>
                  <td className="text-right py-1.5 px-2">${formatM(item.grossProfit)}</td>
                  <td className="text-right py-1.5 px-2">${formatM(item.operatingIncome)}</td>
                  <td className="text-right py-1.5 px-2">${formatM(item.netIncome)}</td>
                  <td className="text-right py-1.5 px-2">${formatM(item.freeCashFlow)}</td>
                  <td className={`text-right py-1.5 pl-2 font-medium ${margin != null && margin >= 10 ? 'text-green-600' : margin != null && margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {margin != null ? `${margin.toFixed(1)}%` : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Panneau de détails pour une action sélectionnée
 */
export default function StockDetail({ stock, onClose }) {
  const [aboutOpen, setAboutOpen] = useState(false);

  if (!stock) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">
          Sélectionnez une action dans le tableau pour voir les détails
        </p>
      </div>
    );
  }

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };

  const formatLargeNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}T`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A';
  };

  // Données pour le graphique radar (qualité globale)
  const radarData = [
    {
      metric: 'ROE',
      value: Math.min((stock.roe / 30) * 100, 100),
      fullMark: 100,
    },
    {
      metric: 'Marge nette',
      value: Math.min((stock.netMargin / 25) * 100, 100),
      fullMark: 100,
    },
    {
      metric: 'Croissance',
      value: Math.min(((stock.revenueGrowth5Y + 5) / 25) * 100, 100),
      fullMark: 100,
    },
    {
      metric: 'Liquidité',
      value: Math.min((stock.currentRatio / 3) * 100, 100),
      fullMark: 100,
    },
    {
      metric: 'Dette faible',
      value: Math.max(100 - (stock.debtToEquity / 2) * 100, 0),
      fullMark: 100,
    },
    {
      metric: 'Valorisation',
      value: stock.pe ? Math.max(100 - (stock.pe / 50) * 100, 0) : 50,
      fullMark: 100,
    },
  ];

  // Données pour le graphique des métriques financières
  const financialMetrics = [
    { name: 'ROE', value: stock.roe, benchmark: 15 },
    { name: 'Marge', value: stock.netMargin, benchmark: 10 },
    { name: 'Croissance', value: stock.revenueGrowth5Y, benchmark: 5 },
  ];

  const valuationMetrics = [
    { name: 'P/E', value: stock.pe, benchmark: 20 },
    { name: 'P/B', value: stock.pb, benchmark: 3 },
    {
      name: 'P/FCF',
      value: stock.priceToFCF ?? calculatePriceToFCF(stock.marketCap, stock.freeCashFlow),
      benchmark: 15,
    },
  ];

  const dataQualityScore = stock.dataQualityScore ?? 0;
  const missingCriticalFields = stock.missingCriticalFields ?? [];
  const priceHistory10Y = Array.isArray(stock.priceHistory10Y) ? stock.priceHistory10Y : [];

  const pegRatio = calculatePEGRatio(stock.pe, stock.earningsGrowth);

  const getDataQualityColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 65) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (risk) => {
    if (risk <= 35) return 'bg-green-100 text-green-800';
    if (risk <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 20) return 'text-green-500';
    if (margin >= 10) return 'text-yellow-600';
    if (margin > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getMoatLabel = (score) => {
    if (score >= 70) return { text: 'Moat large', color: 'bg-green-100 text-green-800' };
    if (score >= 40) return { text: 'Moat modéré', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Moat faible', color: 'bg-red-100 text-red-800' };
  };

  const getBetaLabel = (beta) => {
    if (beta == null) return null;
    const t = ENRICHED_THRESHOLDS.beta;
    if (beta < t.low) return { text: 'Défensif', color: 'text-green-600' };
    if (beta <= t.high) return { text: 'Neutre', color: 'text-gray-600' };
    return { text: 'Agressif', color: 'text-red-600' };
  };

  const moatInfo = getMoatLabel(stock.moatScore ?? 0);
  const betaInfo = getBetaLabel(stock.beta);

  // Signal moyennes mobiles
  const getMaSignal = () => {
    if (typeof stock.fiftyDayAverage !== 'number' || typeof stock.twoHundredDayAverage !== 'number') return null;
    if (stock.fiftyDayAverage > stock.twoHundredDayAverage) {
      return { text: 'Golden Cross (MM50 > MM200)', color: 'text-green-600' };
    }
    return { text: 'Death Cross (MM50 < MM200)', color: 'text-red-600' };
  };
  const maSignal = getMaSignal();

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* En-tête enrichi */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {stock.ticker} - {stock.name}
            </h2>
            <p className="text-gray-600 mt-1">{stock.sector}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => exportStockReport(stock)}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded transition-colors"
          >
            Exporter rapport (.txt)
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">Prix actuel</p>
            <p className="text-xl font-bold text-gray-800">
              ${formatNumber(stock.price, 2)}
            </p>
            {stock.lastUpdated && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(stock.lastUpdated).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            {/* Progression multi-périodes */}
            <div className="flex gap-x-3 mt-1.5 overflow-hidden">
              {[
                { label: '1J', value: stock.dailyChangePercent },
                { label: '1M', value: stock.monthlyChangePercent },
                { label: 'YTD', value: stock.ytdChangePercent },
                { label: '1A', value: stock.yearlyChangePercent },
              ].map(({ label, value }) => (
                <span key={label} className="text-xs whitespace-nowrap">
                  <span className="text-gray-400">{label}</span>{' '}
                  {typeof value === 'number' ? (
                    <span className={value >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Capitalisation</p>
            <p className="text-xl font-bold text-gray-800">
              {formatLargeNumber(stock.marketCap)}
            </p>
          </div>
          <div className="relative group">
            <p className="text-sm text-gray-600">Score Carlos</p>
            <p
              className={`text-xl font-bold ${getScoreColor(
                stock.compositeScore
              )}`}
            >
              {stock.compositeScore}/100
              <span className="ml-1 text-xs text-gray-400 font-normal cursor-help" title="Voir le détail">?</span>
            </p>
            {typeof stock.baseScore === 'number' && (
              <p className="text-xs text-gray-500 mt-0.5">
                Base: {formatNumber(stock.baseScore, 0)} | Ajusté: {formatNumber(stock.compositeScore, 0)}
              </p>
            )}
            {/* Popover détail score au survol */}
            <ScoreBreakdownPopover stock={stock} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Marge de sécurité</p>
            <p
              className={`text-xl font-bold ${getMarginColor(
                stock.marginOfSafety
              )}`}
            >
              {formatNumber(stock.marginOfSafety, 1)}%
            </p>
          </div>
        </div>

        {/* Badges Moat & Risque */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${moatInfo.color}`}>
            {moatInfo.text} ({stock.moatScore ?? 0}/100)
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(stock.riskScore ?? 50)}`}>
            Risque: {formatNumber(stock.riskScore, 0)}/100
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDataQualityColor(dataQualityScore)}`}>
            Données: {formatNumber(dataQualityScore, 0)}%
          </span>
          {missingCriticalFields.length > 0 && (
            <span className="text-gray-500 text-xs">
              Manquants: {missingCriticalFields.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Section À propos */}
      {stock.description && (
        <div className="border-b border-gray-200 px-6 py-3">
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <span className={`inline-block transition-transform ${aboutOpen ? 'rotate-90' : ''}`}>▶</span>
            À propos de {stock.name}
          </button>
          {aboutOpen && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {stock.description}
            </p>
          )}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Analyse de la qualité */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Analyse de la qualité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Graphique radar */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Métriques financières */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financialMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" name="Valeur actuelle" />
                  <Bar
                    dataKey="benchmark"
                    fill="#10b981"
                    name="Critère Carlos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Guide pedagogique des metriques (accordeon) */}
          <details className="mt-4 bg-slate-50 border border-slate-200 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-800 select-none flex items-center gap-2">
              <svg className="w-4 h-4 transition-transform details-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              Comment lire cette analyse ?
            </summary>
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white rounded p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-semibold text-slate-700">ROE (Return on Equity)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Rendement des capitaux propres. Mesure combien de profit l'entreprise genere avec l'argent des actionnaires.
                  <span className="block mt-1 text-emerald-600 font-medium">Cible : &ge; 15%. Score radar : normalise sur 30%.</span>
                </p>
                <p className="text-[11px] mt-1">
                  <span className="font-medium text-slate-600">Actuel :</span>{' '}
                  <span className={stock.roe >= 15 ? 'text-emerald-600 font-medium' : stock.roe >= 10 ? 'text-amber-600' : 'text-red-500'}>
                    {formatPercent(stock.roe)}
                  </span>
                </p>
              </div>
              <div className="bg-white rounded p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-semibold text-slate-700">Marge nette</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Pourcentage du chiffre d'affaires qui se transforme en profit net apres toutes les depenses.
                  Une marge elevee signale un avantage competitif durable (moat).
                  <span className="block mt-1 text-emerald-600 font-medium">Cible : &ge; 10%. Score radar : normalise sur 25%.</span>
                </p>
                <p className="text-[11px] mt-1">
                  <span className="font-medium text-slate-600">Actuel :</span>{' '}
                  <span className={stock.netMargin >= 10 ? 'text-emerald-600 font-medium' : stock.netMargin >= 5 ? 'text-amber-600' : 'text-red-500'}>
                    {formatPercent(stock.netMargin)}
                  </span>
                </p>
              </div>
              <div className="bg-white rounded p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-semibold text-slate-700">Croissance du CA (5 ans)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Taux de croissance annuel moyen du chiffre d'affaires. Une entreprise qui croit regulierement
                  vaut plus cher qu'une entreprise stagnante.
                  <span className="block mt-1 text-emerald-600 font-medium">Cible : &ge; 5%. Score radar : ajuste +5 pts, normalise sur 25%.</span>
                </p>
                <p className="text-[11px] mt-1">
                  <span className="font-medium text-slate-600">Actuel :</span>{' '}
                  <span className={stock.revenueGrowth5Y >= 5 ? 'text-emerald-600 font-medium' : stock.revenueGrowth5Y >= 0 ? 'text-amber-600' : 'text-red-500'}>
                    {formatPercent(stock.revenueGrowth5Y)}
                  </span>
                </p>
              </div>
              <div className="bg-white rounded p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-semibold text-slate-700">Liquidite (Current Ratio)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ratio actifs courants / passifs courants. Mesure la capacite a payer ses dettes a court terme.
                  En dessous de 1, l'entreprise pourrait avoir du mal a honorer ses obligations.
                  <span className="block mt-1 text-emerald-600 font-medium">Cible : &ge; 1.5. Score radar : normalise sur 3.</span>
                </p>
                <p className="text-[11px] mt-1">
                  <span className="font-medium text-slate-600">Actuel :</span>{' '}
                  <span className={stock.currentRatio >= 1.5 ? 'text-emerald-600 font-medium' : stock.currentRatio >= 1 ? 'text-amber-600' : 'text-red-500'}>
                    {stock.currentRatio != null ? stock.currentRatio.toFixed(2) : 'N/A'}
                  </span>
                </p>
              </div>
              <div className="bg-white rounded p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-semibold text-slate-700">Dette faible (D/E)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ratio dette/capitaux propres. Un ratio bas indique que l'entreprise ne depend pas
                  excessivement de l'endettement. Carlos preferait les entreprises peu endettees.
                  <span className="block mt-1 text-emerald-600 font-medium">Cible : &le; 0.5. Score radar : inverse (100 - D/E x 50).</span>
                </p>
                <p className="text-[11px] mt-1">
                  <span className="font-medium text-slate-600">Actuel :</span>{' '}
                  <span className={stock.debtToEquity <= 0.5 ? 'text-emerald-600 font-medium' : stock.debtToEquity <= 1 ? 'text-amber-600' : 'text-red-500'}>
                    {stock.debtToEquity != null ? stock.debtToEquity.toFixed(2) : 'N/A'}
                  </span>
                </p>
              </div>
              <div className="bg-white rounded p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-semibold text-slate-700">Valorisation (P/E)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ratio cours/benefice. Combien d'annees de benefices faut-il pour rembourser le prix paye.
                  Plus c'est bas, plus l'action est "abordable" relativement a ses profits.
                  <span className="block mt-1 text-emerald-600 font-medium">Cible : &le; 20. Score radar : inverse (100 - P/E x 2).</span>
                </p>
                <p className="text-[11px] mt-1">
                  <span className="font-medium text-slate-600">Actuel :</span>{' '}
                  <span className={stock.pe != null && stock.pe <= 20 ? 'text-emerald-600 font-medium' : stock.pe != null && stock.pe <= 30 ? 'text-amber-600' : 'text-red-500'}>
                    {stock.pe != null ? stock.pe.toFixed(1) : 'N/A'}
                  </span>
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
              Le graphique radar normalise chaque metrique sur 100 pour permettre une comparaison visuelle rapide.
              Plus la surface coloree est grande, plus l'entreprise est de qualite selon les criteres Carlos.
              Le graphique a barres compare les valeurs reelles aux seuils minimaux recommandes.
            </p>
          </details>
        </div>

        {/* Valorisation complète */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Valorisation complète
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={valuationMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#f59e0b" name="Valeur actuelle" />
              <Bar dataKey="benchmark" fill="#10b981" name="Cible max" />
            </BarChart>
          </ResponsiveContainer>

          {/* Ratios enrichis */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">Forward P/E</p>
              <p className="font-semibold">{formatNumber(stock.forwardPE, 1)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">EV/EBITDA</p>
              <p className="font-semibold">{formatNumber(stock.evToEbitda, 1)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">Price/Sales</p>
              <p className="font-semibold">{formatNumber(stock.priceToSales, 1)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">PEG implicite</p>
              <p className="font-semibold">{formatNumber(pegRatio, 2)}</p>
            </div>
          </div>

          {/* Scénarios DCF + Graham */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-red-50 border border-red-100 rounded p-3">
              <p className="text-red-700 font-medium">DCF Bear</p>
              <p className="text-gray-800 font-semibold">
                ${formatNumber(stock.intrinsicBearPerShare, 2)}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded p-3">
              <p className="text-blue-700 font-medium">DCF Base</p>
              <p className="text-gray-800 font-semibold">
                ${formatNumber(stock.intrinsicBasePerShare, 2)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-3">
              <p className="text-green-700 font-medium">DCF Bull</p>
              <p className="text-gray-800 font-semibold">
                ${formatNumber(stock.intrinsicBullPerShare, 2)}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded p-3">
              <p className="text-purple-700 font-medium">Graham</p>
              <p className="text-gray-800 font-semibold">
                ${formatNumber(stock.grahamValuePerShare, 2)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-gray-500">
              Fourchette DCF: ${formatNumber(stock.intrinsicRangeLow, 2)} - ${formatNumber(stock.intrinsicRangeHigh, 2)}
            </p>
            {stock.dcfQuality && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stock.dcfQuality === 'fiable'
                  ? 'bg-green-100 text-green-700'
                  : stock.dcfQuality === 'suspect'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                DCF {stock.dcfQuality}
              </span>
            )}
          </div>

          {/* Hypothèses DCF */}
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1 font-medium">Hypothèses DCF</p>
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1 pr-3">Scénario</th>
                  <th className="text-right py-1 px-2">Croissance FCF</th>
                  <th className="text-right py-1 px-2">WACC</th>
                  <th className="text-right py-1 px-2">Terminal</th>
                  <th className="text-right py-1 pl-2">Années</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(DCF_SCENARIOS).map(([name, params]) => (
                  <tr key={name} className="border-b border-gray-100">
                    <td className="py-1 pr-3 capitalize font-medium">{name}</td>
                    <td className="text-right py-1 px-2">{(params.growthRate * 100).toFixed(0)}%</td>
                    <td className="text-right py-1 px-2">{(params.discountRate * 100).toFixed(0)}%</td>
                    <td className="text-right py-1 px-2">{(DCF_DEFAULTS.terminalGrowthRate * 100).toFixed(0)}%</td>
                    <td className="text-right py-1 pl-2">{DCF_DEFAULTS.projectionYears}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Position prix vs plage 52 semaines */}
          <RangeBar
            value={stock.price}
            low={stock.fiftyTwoWeekLow}
            high={stock.fiftyTwoWeekHigh}
            label="Position dans la plage 52 semaines"
          />
        </div>

        {/* Comparables sectoriels */}
        {stock.sectorAvg && stock.sectorAvg.peers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Comparables sectoriels
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {stock.sector} — {stock.sectorAvg.peers.length} pair{stock.sectorAvg.peers.length > 1 ? 's' : ''} dans la watchlist
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {[
                { label: 'P/E', val: stock.pe, avg: stock.sectorAvg.pe },
                { label: 'ROE', val: stock.roe, avg: stock.sectorAvg.roe, pct: true },
                { label: 'Marge nette', val: stock.netMargin, avg: stock.sectorAvg.netMargin, pct: true },
                { label: 'P/FCF', val: stock.priceToFCF, avg: stock.sectorAvg.priceToFCF },
                { label: 'Div. Yield', val: stock.dividendYield, avg: stock.sectorAvg.dividendYield, pct: true },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 rounded p-3">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className="font-semibold">
                    {typeof m.val === 'number' ? m.val.toFixed(1) : 'N/A'}{m.pct ? '%' : ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    Moy: {typeof m.avg === 'number' ? m.avg.toFixed(1) : 'N/A'}{m.pct ? '%' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profitabilité & efficacité */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Profitabilité & efficacité
          </h3>

          <MarginCascade
            grossMargin={stock.grossMargin}
            ebitdaMargin={stock.ebitdaMargin}
            operatingMargin={stock.operatingMargin}
            netMargin={stock.netMargin}
          />

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">ROE</p>
              <p className="font-semibold">{formatPercent(stock.roe)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">ROA</p>
              <p className="font-semibold">{formatPercent(stock.returnOnAssets)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">ROIC</p>
              <p className="font-semibold">{formatPercent(stock.roic)}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-gray-500 text-xs">Croissance 5Y</p>
              <p className="font-semibold">{formatPercent(stock.revenueGrowth5Y)}</p>
            </div>
          </div>
        </div>

        {/* Progression financière annuelle */}
        <FinancialProgressionChart financialHistory={stock.financialHistory} />

        {/* Cash-flow & dividendes */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Cash-flow & dividendes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Free Cash Flow</p>
              <p className="font-semibold">{formatLargeNumber(stock.freeCashFlow)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Operating Cash Flow</p>
              <p className="font-semibold">{formatLargeNumber(stock.operatingCashflow)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">FCF Yield</p>
              <p className="font-semibold">{formatPercent(stock.fcfYield)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Dividend Yield</p>
              <p className="font-semibold">{formatPercent(stock.dividendYield)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Payout Ratio</p>
              <p className="font-semibold">{formatPercent(stock.payoutRatio)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Price/FCF</p>
              <p className="font-semibold">
                {formatNumber(stock.priceToFCF ?? calculatePriceToFCF(stock.marketCap, stock.freeCashFlow), 1)}
              </p>
            </div>
          </div>
        </div>

        {/* Solidité du bilan */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Solidité du bilan
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Dette/Equity</p>
              <p className="font-semibold">{formatNumber(stock.debtToEquity, 2)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Current Ratio</p>
              <p className="font-semibold">{formatNumber(stock.currentRatio, 2)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Book Value/Action</p>
              <p className="font-semibold">${formatNumber(stock.bookValue, 2)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Total Debt</p>
              <p className="font-semibold">{formatLargeNumber(stock.totalDebt)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Total Equity</p>
              <p className="font-semibold">{formatLargeNumber(stock.totalEquity)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Enterprise Value</p>
              <p className="font-semibold">{formatLargeNumber(stock.enterpriseValue)}</p>
            </div>
          </div>

          {/* Visualisation dette vs equity */}
          {typeof stock.totalDebt === 'number' && typeof stock.totalEquity === 'number' && stock.totalEquity > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Proportion dette vs equity</p>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div
                  className="bg-red-400"
                  style={{ width: `${(stock.totalDebt / (stock.totalDebt + stock.totalEquity)) * 100}%` }}
                  title={`Dette: ${formatLargeNumber(stock.totalDebt)}`}
                />
                <div
                  className="bg-green-400"
                  style={{ width: `${(stock.totalEquity / (stock.totalDebt + stock.totalEquity)) * 100}%` }}
                  title={`Equity: ${formatLargeNumber(stock.totalEquity)}`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Dette ({((stock.totalDebt / (stock.totalDebt + stock.totalEquity)) * 100).toFixed(0)}%)</span>
                <span>Equity ({((stock.totalEquity / (stock.totalDebt + stock.totalEquity)) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Momentum & risque technique */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Momentum & risque technique
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">Beta</p>
              <p className="font-semibold">
                {formatNumber(stock.beta, 2)}
                {betaInfo && <span className={`ml-1 text-xs ${betaInfo.color}`}>({betaInfo.text})</span>}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">MM 50 jours</p>
              <p className="font-semibold">${formatNumber(stock.fiftyDayAverage, 2)}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-500 text-xs">MM 200 jours</p>
              <p className="font-semibold">${formatNumber(stock.twoHundredDayAverage, 2)}</p>
            </div>
          </div>

          {maSignal && (
            <p className={`mt-2 text-sm font-medium ${maSignal.color}`}>
              {maSignal.text}
            </p>
          )}

          <RangeBar
            value={stock.price}
            low={stock.fiftyTwoWeekLow}
            high={stock.fiftyTwoWeekHigh}
            label="Position dans la plage 52 semaines"
          />
        </div>

        {/* Historique de prix */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Historique de prix (10 ans)
          </h3>
          {priceHistory10Y.length > 1 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={priceHistory10Y}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} dot={false} name="Prix" />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-2 text-sm text-gray-600">
                CAGR prix 10 ans: <span className="font-semibold">{formatNumber(stock.priceCagr10Y, 2)}%</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Historique indisponible pour cette action.</p>
          )}
        </div>

        {/* Interprétation selon Carlos */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            Analyse selon les principes de Carlos
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            {stock.roe >= 15 ? (
              <p>✓ ROE excellent (&gt; 15%) - Entreprise très rentable</p>
            ) : (
              <p>✗ ROE sous le seuil Carlos (&lt; 15%)</p>
            )}
            {stock.netMargin >= 10 ? (
              <p>✓ Forte marge nette - Avantage concurrentiel probable</p>
            ) : (
              <p>✗ Marge nette faible (&lt; 10%)</p>
            )}
            {stock.debtToEquity <= 0.5 ? (
              <p>✓ Faible endettement - Bilan solide</p>
            ) : (
              <p>✗ Endettement élevé (&gt; 0.5)</p>
            )}
            {stock.freeCashFlow > 0 ? (
              <p>✓ Free Cash Flow positif - Génère du cash</p>
            ) : (
              <p>✗ Free Cash Flow négatif</p>
            )}
            {stock.marginOfSafety >= 25 ? (
              <p>
                ✓ Excellente marge de sécurité (&gt; 25%) - Opportunité
                d'achat
              </p>
            ) : stock.marginOfSafety > 0 ? (
              <p>
                ⚠ Marge de sécurité modérée ({formatNumber(stock.marginOfSafety, 1)}%)
              </p>
            ) : (
              <p>✗ Aucune marge de sécurité - Action surévaluée</p>
            )}
            {typeof stock.grossMargin === 'number' && stock.grossMargin >= 40 ? (
              <p>✓ Marge brute élevée ({formatNumber(stock.grossMargin, 1)}%) - Pouvoir de pricing</p>
            ) : typeof stock.grossMargin === 'number' ? (
              <p>⚠ Marge brute modérée ({formatNumber(stock.grossMargin, 1)}%)</p>
            ) : null}
            {typeof stock.beta === 'number' && stock.beta < 1 ? (
              <p>✓ Beta défensif ({formatNumber(stock.beta, 2)}) - Moins volatile que le marché</p>
            ) : typeof stock.beta === 'number' ? (
              <p>⚠ Beta élevé ({formatNumber(stock.beta, 2)}) - Plus volatile que le marché</p>
            ) : null}
            {typeof stock.grahamValuePerShare === 'number' && stock.grahamValuePerShare > 0 && (
              stock.price <= stock.grahamValuePerShare ? (
                <p>✓ Prix sous la valeur Graham (${formatNumber(stock.grahamValuePerShare, 2)})</p>
              ) : (
                <p>✗ Prix au-dessus de la valeur Graham (${formatNumber(stock.grahamValuePerShare, 2)})</p>
              )
            )}
          </div>
        </div>

        {/* Risque & thèse d'investissement */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h4 className="font-semibold text-gray-800">Thèse d'investissement</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(stock.riskScore ?? 50)}`}>
              Risque: {formatNumber(stock.riskScore, 0)}/100
            </span>
          </div>

          {stock.investmentThesis?.verdict && (
            <p className="text-sm text-gray-700 mb-4">
              <span className="font-medium">Verdict:</span> {stock.investmentThesis.verdict}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-green-50 border border-green-100 rounded p-3">
              <p className="font-medium text-green-800 mb-2">Forces</p>
              {stock.investmentThesis?.strengths?.length ? (
                <ul className="space-y-1 text-green-900">
                  {stock.investmentThesis.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-900">Aucun point fort détecté automatiquement.</p>
              )}
            </div>

            <div className="bg-red-50 border border-red-100 rounded p-3">
              <p className="font-medium text-red-800 mb-2">Points de vigilance</p>
              {stock.investmentThesis?.risks?.length ? (
                <ul className="space-y-1 text-red-900">
                  {stock.investmentThesis.risks.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-900">Aucun risque majeur détecté automatiquement.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
