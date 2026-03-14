# CLAUDE.md

## Projet

Carlos Dashboard — outil d'analyse boursiere React base sur les principes de Carlos.
Watchlist par defaut : S&P/TSX 60 (60 plus grandes capitalisations canadiennes, tickers au format `.TO`).
Stack : React 19, Vite 4, Tailwind CSS 4, Recharts 3. Backend API sur le port 3001 (proxy via Vite).

## Commandes

- `npm run dev` — Serveur de dev (Vite)
- `npm run build` — Build de production
- `npm run test` — Tests unitaires (Vitest)
- `npx vitest run` — Tests en mode CI (une seule execution)
- `npm run preview` — Previsualisation du build de production
- `npm run lint` — Linting ESLint

## Architecture

```
src/
  App.jsx                          # Point d'entree, wraps Dashboard avec AppProvider
  context/
    AppContext.jsx                  # React Context (state partage : watchlist, notifications, recherche, donnees)
  components/
    Dashboard.jsx                  # Orchestrateur principal (selection, export, onglets watchlist/portfolio)
    DashboardHeader.jsx            # Header : titre, badge source, boutons, barre de recherche
    IndicesTicker.jsx              # Bandeau defilant des indices boursiers mondiaux (S&P/TSX, S&P 500, NASDAQ, etc.)
    NotificationToast.jsx          # Toast auto-dismiss
    StatsCards.jsx                 # 4 cartes de stats agregees
    StocksTable.jsx                # Tableau des actions (colonnes fixes, layout table-fixed)
    StockDetail.jsx                # Vue detail enrichie plein ecran (valorisation, profitabilite, cash-flow, bilan, momentum, these, preuve score)
    GuideSection.jsx               # Guide d'interpretation statique
    Portfolio.jsx                  # Onglet portefeuille
  utils/
    constants.js                   # Toutes les constantes financieres (seuils, ponderations, parametres DCF/Graham, seuils enrichis)
    financialCalculations.js       # Calculs Carlos (DCF, Graham, ROIC, Moat, Composite, ScoreBreakdown, Risk, Thesis, FCF Yield, PEG)
    csvParser.js                   # Barrel file — re-exporte storageManager + apiClient + dataExport
    storageManager.js              # localStorage : watchlist, DEFAULT_WATCHLIST (S&P/TSX 60)
    apiClient.js                   # Appels API : fetchStocksFromAPI, fetchStockDetailFromAPI, fetchIndices, fetchETFDistributions, fetchUSDCADRate, searchTickers
    dataExport.js                  # Parsing CSV, export CSV/rapport texte
    portfolioParser.js             # Parsing des fichiers portefeuille (positions, transactions)
    __tests__/                     # Tests Vitest
```

### Backend (`server/index.js`)

Endpoints :
- `GET /api/stock/:symbol` — Donnees completes d'une action (incluant historique 10 ans + variations 1J/5J/1M/6M/YTD/1A/5A)
- `GET /api/stocks/batch?symbols=...` — Donnees batch (sans historique)
- `GET /api/indices` — 8 indices boursiers mondiaux (cache 5 min)
- `GET /api/etf/distributions?symbols=...` — Distributions ETF
- `GET /api/forex/usdcad` — Taux de change USD/CAD (cache 15 min)
- `GET /api/search?q=...` — Recherche de tickers

## Conventions

- Langue du code : anglais (noms de variables, fonctions). Commentaires et UI en francais.
- Les constantes financieres (seuils, ponderations) sont centralisees dans `constants.js`. Ne pas hardcoder de magic numbers dans les calculs.
- `csvParser.js` est un barrel file de retrocompatibilite. Pour les nouveaux imports, preferer les modules specifiques (`storageManager`, `apiClient`, `dataExport`).
- Le state partage (watchlist, notifications, donnees, recherche) est gere par `AppContext`.
- Les sous-composants du dashboard recoivent leurs donnees via props (pas de useApp() dans les sous-composants presentationnels simples).
- `IndicesTicker` gere son propre fetch (composant autonome, pas de state dans AppContext).

## Tests

Les tests sont dans `src/utils/__tests__/`. Ils couvrent :
- `financialCalculations.test.js` — 51 tests (DCF, Graham, ROIC, Moat, Composite, Risk, Thesis, CAGR, FCF Yield, PEG, etc.)
- `storageManager.test.js` — 10 tests (localStorage mock, load/save watchlist et compare)
- `dataExport.test.js` — 15 tests (parsing CSV, parseNumber, parseStocksCSV)
- `portfolioParser.test.js` — 15 tests (parsing portefeuille)

Lancer les tests avant tout merge : `npx vitest run`
