import { useState, useMemo } from 'react';

/**
 * Tableau des actions avec tri et sélection
 */
export default function StocksTable({
  stocks,
  onSelectStock,
  selectedStock,
  onRemoveTicker,
}) {
  const [sortConfig, setSortConfig] = useState({
    key: 'compositeScore',
    direction: 'desc',
  });

  // Trier les actions
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks];

    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Gérer les valeurs null
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [stocks, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600 font-semibold';
    if (margin >= 20) return 'text-green-500';
    if (margin >= 10) return 'text-yellow-600';
    if (margin > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getDataQualityColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 65) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getGrowthColor = (value) => {
    if (value === null || value === undefined) return 'text-gray-400';
    if (value >= 15) return 'text-green-600 font-semibold';
    if (value >= 5) return 'text-green-500';
    if (value >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getYieldColor = (value) => {
    if (value === null || value === undefined) return 'text-gray-400';
    if (value >= 5) return 'text-green-600 font-semibold';
    if (value >= 3) return 'text-green-500';
    if (value >= 1) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-[6%]" />   {/* Ticker */}
            <col className="w-[12%]" />  {/* Nom */}
            <col className="w-[9%]" />   {/* Secteur */}
            <col className="w-[5%]" />   {/* Score */}
            <col className="w-[5%]" />   {/* ROE */}
            <col className="w-[6%]" />   {/* Marge */}
            <col className="w-[6%]" />   {/* Dette/Eq */}
            <col className="w-[5%]" />   {/* P/E */}
            <col className="w-[6%]" />   {/* Cr. Rev. */}
            <col className="w-[6%]" />   {/* Cr. Bén. */}
            <col className="w-[5%]" />   {/* FCF Yield */}
            <col className="w-[5%]" />   {/* Div. */}
            <col className="w-[6%]" />   {/* MdS */}
            <col className="w-[6%]" />   {/* Données */}
            <col className="w-[6%]" />   {/* Prix */}
            {onRemoveTicker && <col className="w-[3%]" />}
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('ticker')}
                title="Symbole boursier de l'action"
              >
                Ticker {getSortIcon('ticker')}
              </th>
              <th
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
                title="Nom complet de l'entreprise"
              >
                Nom {getSortIcon('name')}
              </th>
              <th
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sector')}
                title="Secteur d'activité de l'entreprise"
              >
                Secteur {getSortIcon('sector')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('compositeScore')}
                title="Score composite Carlos (/100) — qualité business, solidité financière et valorisation"
              >
                Score {getSortIcon('compositeScore')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('roe')}
                title="Return on Equity — rentabilité des capitaux propres. Cible : >= 15%"
              >
                ROE {getSortIcon('roe')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('netMargin')}
                title="Marge nette — % du chiffre d'affaires converti en profit net. Cible : >= 10%"
              >
                Marge {getSortIcon('netMargin')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('debtToEquity')}
                title="Dette / Capitaux propres — niveau d'endettement. Cible : <= 0.5"
              >
                D/Eq {getSortIcon('debtToEquity')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('pe')}
                title="Price/Earnings — prix payé par dollar de bénéfice. Cible : <= 20"
              >
                P/E {getSortIcon('pe')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('revenueGrowthQuarterly')}
                title="Croissance des revenus (dernier trimestre vs même trimestre l'an passé)"
              >
                Cr. Rev. {getSortIcon('revenueGrowthQuarterly')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('earningsGrowth')}
                title="Croissance des bénéfices (dernier trimestre vs même trimestre l'an passé)"
              >
                Cr. Bén. {getSortIcon('earningsGrowth')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('fcfYield')}
                title="FCF Yield — flux de trésorerie libre / capitalisation. Cible : >= 5%"
              >
                FCF Y. {getSortIcon('fcfYield')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dividendYield')}
                title="Rendement du dividende annuel en % du prix actuel"
              >
                Div. {getSortIcon('dividendYield')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('marginOfSafety')}
                title="Marge de sécurité — écart entre la valeur intrinsèque (DCF) et le prix actuel. Plus c'est élevé, plus l'action est sous-évaluée"
              >
                MdS {getSortIcon('marginOfSafety')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('dataQualityScore')}
                title="Qualité des données — % des champs financiers critiques disponibles pour cette action"
              >
                Données {getSortIcon('dataQualityScore')}
              </th>
              <th
                className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
                title="Dernier prix de marché"
              >
                Prix {getSortIcon('price')}
              </th>
              {onRemoveTicker && (
                <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStocks.length === 0 ? (
              <tr>
                <td
                  colSpan={15 + (onRemoveTicker ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Aucune action dans la watchlist
                </td>
              </tr>
            ) : (
              sortedStocks.map((stock) => (
                <tr
                  key={stock.ticker}
                  onClick={() => onSelectStock(stock)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedStock?.ticker === stock.ticker ? 'bg-blue-100' : ''
                  }`}
                >
                  <td className="px-2 py-3 text-sm font-medium text-gray-900 truncate">
                    {stock.ticker}
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-700 truncate" title={stock.name}>
                    {stock.name}
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-600 truncate" title={stock.sector}>
                    {stock.sector}
                  </td>
                  <td className="px-2 py-3 text-sm text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(
                        stock.compositeScore
                      )}`}
                    >
                      {stock.compositeScore}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-sm text-right text-gray-700">
                    {formatNumber(stock.roe, 1)}%
                  </td>
                  <td className="px-2 py-3 text-sm text-right text-gray-700">
                    {formatNumber(stock.netMargin, 1)}%
                  </td>
                  <td className="px-2 py-3 text-sm text-right text-gray-700">
                    {formatNumber(stock.debtToEquity, 2)}
                  </td>
                  <td className="px-2 py-3 text-sm text-right text-gray-700">
                    {formatNumber(stock.pe, 1)}
                  </td>
                  <td
                    className={`px-2 py-3 text-sm text-right ${getGrowthColor(
                      stock.revenueGrowthQuarterly
                    )}`}
                    title="Croissance des revenus"
                  >
                    {stock.revenueGrowthQuarterly != null
                      ? `${formatNumber(stock.revenueGrowthQuarterly, 1)}%`
                      : 'N/A'}
                  </td>
                  <td
                    className={`px-2 py-3 text-sm text-right ${getGrowthColor(
                      stock.earningsGrowth
                    )}`}
                    title="Croissance des bénéfices"
                  >
                    {stock.earningsGrowth != null
                      ? `${formatNumber(stock.earningsGrowth, 1)}%`
                      : 'N/A'}
                  </td>
                  <td
                    className={`px-2 py-3 text-sm text-right ${getYieldColor(
                      stock.fcfYield
                    )}`}
                    title="FCF Yield"
                  >
                    {stock.fcfYield != null
                      ? `${formatNumber(stock.fcfYield, 1)}%`
                      : 'N/A'}
                  </td>
                  <td
                    className={`px-2 py-3 text-sm text-right ${getYieldColor(
                      stock.dividendYield
                    )}`}
                    title="Rendement du dividende"
                  >
                    {stock.dividendYield != null
                      ? `${formatNumber(stock.dividendYield, 1)}%`
                      : 'N/A'}
                  </td>
                  <td
                    className={`px-2 py-3 text-sm text-right ${getMarginColor(
                      stock.marginOfSafety
                    )}`}
                  >
                    {formatNumber(stock.marginOfSafety, 1)}%
                  </td>
                  <td className="px-2 py-3 text-sm text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getDataQualityColor(
                        stock.dataQualityScore
                      )}`}
                      title={
                        stock.missingCriticalFields?.length
                          ? `Champs manquants: ${stock.missingCriticalFields.join(', ')}`
                          : 'Toutes les données critiques sont disponibles'
                      }
                    >
                      {formatNumber(stock.dataQualityScore, 0)}%
                    </span>
                  </td>
                  <td className="px-2 py-3 text-sm text-right text-gray-700">
                    ${formatNumber(stock.price, 2)}
                  </td>
                  {onRemoveTicker && (
                    <td className="px-1 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTicker(stock.ticker);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                        title={`Retirer ${stock.ticker}`}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedStocks.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
          Affichage de {sortedStocks.length} action(s) - Cliquez sur une ligne
          pour voir les details
        </div>
      )}
    </div>
  );
}
