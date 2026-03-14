export default function StatsCards({ stats, totalCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">Actions suivies</p>
        <p className="text-2xl font-bold text-gray-900">
          {totalCount}
        </p>
        <p className="text-xs text-gray-500 mt-1">dans la watchlist</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">Score moyen</p>
        <p className="text-2xl font-bold text-blue-600">
          {stats.avgScore.toFixed(1)}
        </p>
        <p className="text-xs text-gray-500 mt-1">/ 100</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">ROE moyen</p>
        <p className="text-2xl font-bold text-green-600">
          {stats.avgROE.toFixed(1)}%
        </p>
        <p className="text-xs text-gray-500 mt-1">Return on Equity</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">Marge de securite moy.</p>
        <p className="text-2xl font-bold text-purple-600">
          {stats.avgMarginOfSafety.toFixed(1)}%
        </p>
        <p className="text-xs text-gray-500 mt-1">Carlos: &gt; 25%</p>
      </div>
    </div>
  );
}
