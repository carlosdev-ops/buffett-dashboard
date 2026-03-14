# Carlos Dashboard — Analyse Boursière

![License: MIT](https://img.shields.io/badge/Licence-MIT-yellow.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-91%20passés-brightgreen?logo=vitest)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)

Dashboard interactif d'analyse fondamentale d'actions selon les principes de Carlos, avec données en temps réel via Yahoo Finance. Watchlist par défaut : les 60 actions du S&P/TSX 60 (marché canadien).

## Fonctionnalités

- **Watchlist personnalisable** : S&P/TSX 60 par défaut (60 actions canadiennes), ajout/suppression libre via recherche
- **Données en temps réel** : API Yahoo Finance avec fallback CSV automatique
- **Filtrage avancé** : Critères ajustables (ROE, marge, dette, P/E, marge de sécurité, etc.)
- **Analyse détaillée** : Vue détail par action avec graphiques radar, valorisation DCF en 3 scénarios, thèse d'investissement
- **Comparaison** : Jusqu'à 4 actions côte à côte
- **Score composite** : Notation 0–100 ajustée par secteur
- **Score de risque** : Évaluation des points de vigilance
- **Portefeuille** : Suivi des positions personnelles
- **Indices en direct** : Bandeau défilant (S&P/TSX, S&P 500, NASDAQ, etc.)
- **Export** : CSV des résultats filtrés + rapport texte par action
- **Persistance** : Watchlist sauvegardée en localStorage

## Installation

```bash
# Frontend
npm install

# Backend (dans un second terminal)
cd server
npm install
```

## Démarrage

```bash
# Terminal 1 — Backend API (port 3001)
cd server
node index.js

# Terminal 2 — Frontend (port 5173)
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

Si le backend n'est pas disponible, l'application bascule automatiquement en mode démo avec les données CSV statiques (`public/stocks-data.csv`).

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (Vite) |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build de production |
| `npm run test` | Tests unitaires (Vitest, mode watch) |
| `npx vitest run` | Tests en mode CI (exécution unique) |
| `npm run lint` | Linting ESLint |

## Utilisation

### Recherche et watchlist
- Tapez un ticker ou un nom d'entreprise dans la barre de recherche
- Cliquez sur un résultat pour l'ajouter à la watchlist
- Cliquez sur le bouton ✕ d'une ligne pour retirer une action
- Le bouton « Réinitialiser » restaure les 60 actions du S&P/TSX 60

### Filtres
Ajustez les curseurs du panneau de filtres. Chaque critère peut être activé ou désactivé indépendamment.

### Tableau des actions
- Cliquez sur les en-têtes de colonnes pour trier
- Cliquez sur une ligne pour ouvrir le panneau de détail
- Cochez la case de comparaison pour ajouter une action au comparateur (max 4)

### Détail d'une action
- Score composite et score de risque
- Graphique radar de performance globale
- Valorisation DCF en 3 scénarios (bear / base / bull)
- Thèse d'investissement automatique (forces, risques, verdict)
- Export du rapport en fichier texte

### Onglet Portefeuille
- Importez vos positions via fichier CSV
- Suivi de la valeur, du rendement et de l'allocation sectorielle

### Export
- **CSV** : Bouton « Exporter CSV » dans l'en-tête (exporte les actions filtrées)
- **Rapport texte** : Depuis la vue détail d'une action

## Principes Carlos appliqués

### 1. Qualité du business (40 % du score)
- ROE > 15 % — Rendement sur capitaux propres élevé
- Marge nette > 10 % — Rentabilité forte
- Croissance stable des revenus
- Free Cash Flow positif

### 2. Solidité financière (30 % du score)
- Dette/Equity < 0,5 — Faible endettement
- Current Ratio > 1,5 — Bonne liquidité

### 3. Valorisation raisonnable (30 % du score)
- P/E < 15–20 — Prix raisonnable par rapport aux bénéfices
- P/B < 1,5–3 — Cohérent avec le ROE
- Price/FCF < 15 — Bon rapport prix/cash généré
- Marge de sécurité > 25–30 %

## Calculs

### Valeur intrinsèque (DCF)
```
VI = FCF × (1 + g)^n × (1 / (r - g))
```
- `g` = taux de croissance (défaut 8 %)
- `r` = taux d'actualisation (défaut 10 %)
- `n` = période de projection (défaut 10 ans)

3 scénarios : Bear (g = 4 %, r = 11 %), Base (g = 8 %, r = 10 %), Bull (g = 12 %, r = 9 %)

### Score composite (0–100)
| Plage | Interprétation |
|---|---|
| 75–100 | Excellent candidat |
| 50–74 | Bon candidat, à analyser |
| < 50 | À éviter |

Le score est ajusté selon le secteur (finance, technologie, énergie ont des seuils différents).

### Score de risque (0–100)
Évalue l'endettement, la liquidité, la marge de sécurité, le P/E, le FCF et la qualité des données.

### ROIC
```
ROIC = NOPAT / (Dette + Equity)
NOPAT = Résultat opérationnel × (1 - 25 %)
```

## Structure du projet

```
buffett-dashboard/
  server/
    index.js                         # Backend Express (proxy Yahoo Finance)
  public/
    stocks-data.csv                  # Données de fallback (mode démo)
  src/
    App.jsx                          # Point d'entrée, wraps Dashboard avec AppProvider
    context/
      AppContext.jsx                 # State partagé (watchlist, notifications, données)
    components/
      Dashboard.jsx                  # Orchestrateur principal (onglets watchlist/portefeuille)
      DashboardHeader.jsx            # En-tête : titre, badge source, recherche, boutons
      IndicesTicker.jsx              # Bandeau défilant des indices boursiers mondiaux
      NotificationToast.jsx          # Notifications auto-dismiss
      StatsCards.jsx                 # 4 cartes de statistiques agrégées
      StocksTable.jsx                # Tableau des actions (tri, sélection, comparaison)
      StockDetail.jsx                # Vue détail enrichie (DCF, radar, thèse, score)
      GuideSection.jsx               # Guide d'interprétation statique
      Portfolio.jsx                  # Onglet portefeuille
    utils/
      constants.js                   # Constantes financières centralisées (seuils, pondérations)
      financialCalculations.js       # Calculs Carlos (DCF, Graham, ROIC, Moat, Score, etc.)
      storageManager.js              # localStorage : watchlist, DEFAULT_WATCHLIST S&P/TSX 60
      apiClient.js                   # Appels API (actions, indices, ETF, forex, recherche)
      dataExport.js                  # Parsing CSV, export CSV/rapport texte
      portfolioParser.js             # Parsing des fichiers portefeuille
      csvParser.js                   # Barrel file (rétrocompatibilité)
      __tests__/                     # 91 tests unitaires (Vitest)
```

## Technologies

| Couche | Technologie |
|---|---|
| Frontend | React 19, Vite 4 |
| Style | Tailwind CSS 4 |
| Graphiques | Recharts 3 |
| Tests | Vitest |
| Backend | Node.js, Express |
| Données | Yahoo Finance (yfinance) |

## Données

### Mode API (recommandé)
Le backend Express interroge Yahoo Finance en temps réel. Les données incluent l'historique de prix sur 10 ans et les variations 1J / 5J / 1M / 6M / YTD / 1A / 5A.

### Mode CSV (fallback)
Si le backend est indisponible, l'application charge `public/stocks-data.csv`. Format attendu :

```csv
ticker,name,sector,marketCap,price,pe,pb,roe,debtToEquity,netMargin,freeCashFlow,revenueGrowth5Y,currentRatio,dividendYield,eps,operatingIncome,totalDebt,totalEquity
```

Utilisez `NaN` pour les valeurs manquantes.

## Avertissement

Ce dashboard est un outil d'analyse éducatif. Les données et calculs sont fournis à titre indicatif uniquement. Faites toujours vos propres recherches et consultez un conseiller financier agréé avant de prendre toute décision d'investissement.

## Licence

MIT
