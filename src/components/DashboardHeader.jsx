export default function DashboardHeader({
  dataSource,
  lastFetchTime,
  searchQuery,
  searchResults,
  searchLoading,
  watchlist,
  stockCount,
  onSearchChange,
  onAddTicker,
  onResetWatchlist,
  onRefresh,
  onExport,
}) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Carlos Stock Analyzer
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Analyse fondamentale selon les principes de Carlos
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicateur de source */}
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                dataSource === 'api'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dataSource === 'api' ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              ></span>
              {dataSource === 'api' ? 'API en direct' : 'Mode demo (CSV)'}
            </span>
            {lastFetchTime && (
              <span className="text-xs text-gray-500">
                Maj: {lastFetchTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={onResetWatchlist}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded transition-colors text-sm"
              title="Recharger les 23 actions par defaut"
            >
              Reinitialiser
            </button>
            <button
              onClick={onRefresh}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded transition-colors text-sm"
            >
              Actualiser
            </button>
            <button
              onClick={onExport}
              disabled={stockCount === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Exporter CSV ({stockCount})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mt-4 relative">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un ticker ou une entreprise..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Résultats de recherche */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      onClick={() => onAddTicker(result.symbol)}
                      disabled={watchlist.includes(result.symbol)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-center text-sm disabled:opacity-50 disabled:cursor-default"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {result.symbol}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {result.name}
                        </span>
                      </div>
                      {watchlist.includes(result.symbol) ? (
                        <span className="text-xs text-gray-400">
                          Deja ajoute
                        </span>
                      ) : (
                        <span className="text-xs text-blue-600">
                          + Ajouter
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
