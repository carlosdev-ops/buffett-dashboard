# Buffett Stock Analyzer

Dashboard interactif d'analyse fondamentale d'actions selon les principes de Warren Buffett, avec donnees en temps reel via Yahoo Finance. Watchlist par defaut : les 60 actions du S&P/TSX 60 (marche canadien).

## Fonctionnalites

- **Watchlist personnalisable** : S&P/TSX 60 par defaut (60 actions canadiennes), ajout/suppression libre via recherche
- **Donnees en temps reel** : API Yahoo Finance avec fallback CSV automatique
- **Filtrage avance** : Criteres ajustables (ROE, marge, dette, P/E, marge de securite, etc.)
- **Analyse detaillee** : Vue detail par action avec graphiques radar, valorisation DCF 3 scenarios, these d'investissement
- **Comparaison** : Jusqu'a 4 actions cote a cote
- **Score composite** : Notation 0-100 ajustee par secteur
- **Score de risque** : Evaluation des points de vigilance
- **Export** : CSV des resultats filtres + rapport texte par action
- **Persistance** : Watchlist et selection de comparaison sauvegardees en localStorage

## Installation

```bash
# Frontend
npm install

# Backend (dans un second terminal)
cd server
npm install
```

## Demarrage

```bash
# Terminal 1 : Backend API (port 3001)
cd server
node index.js

# Terminal 2 : Frontend (port 5173)
npm run dev
```

L'application sera accessible sur `http://localhost:5173`.

Si le backend n'est pas disponible, l'application bascule automatiquement en mode demo avec les donnees CSV statiques (`public/stocks-data.csv`).

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de dev (Vite) |
| `npm run build` | Build de production |
| `npm run test` | Tests unitaires (Vitest, mode watch) |
| `npx vitest run` | Tests en mode CI |
| `npm run lint` | Linting ESLint |

## Utilisation

### Recherche et watchlist
- Tapez un ticker ou un nom d'entreprise dans la barre de recherche
- Cliquez sur un resultat pour l'ajouter a la watchlist
- Cliquez sur le bouton X d'une ligne du tableau pour retirer une action
- Le bouton "Reinitialiser" restaure les 60 actions du S&P/TSX 60

### Filtres Buffett
Ajustez les sliders du panneau de filtres. Les filtres peuvent etre actives/desactives globalement via le toggle sous le panneau.

### Tableau des actions
- Cliquez sur les en-tetes de colonnes pour trier
- Cliquez sur une ligne pour ouvrir le panneau de detail
- Cochez la case de comparaison pour ajouter une action au comparateur

### Detail d'une action
- Score composite et score de risque
- Graphique radar de performance globale
- Valorisation DCF en 3 scenarios (bear / base / bull)
- These d'investissement automatique (forces, risques, verdict)
- Export du rapport en fichier texte

### Comparaison
- Selectionnez jusqu'a 4 actions via les cases a cocher du tableau
- Le panneau de comparaison affiche les metriques cles cote a cote

### Export
- **CSV** : Bouton "Exporter CSV" dans l'en-tete (exporte les actions filtrees)
- **Rapport texte** : Depuis la vue detail d'une action

## Principes de Buffett appliques

### 1. Qualite du business (40% du score)
- ROE > 15% : Retour sur capitaux propres eleve
- Marge nette > 10% : Rentabilite forte
- Croissance stable des revenus
- Free Cash Flow positif

### 2. Solidite financiere (30% du score)
- Dette/Equity < 0.5 : Faible endettement
- Current Ratio > 1.5 : Bonne liquidite

### 3. Valorisation raisonnable (30% du score)
- P/E < 15-20 : Prix raisonnable par rapport aux benefices
- P/B < 1.5-3 : Coherent avec le ROE
- Price/FCF < 15 : Bon rapport prix/cash genere
- Marge de securite > 25-30%

## Calculs

### Valeur intrinseque (DCF)
```
VI = FCF x (1 + g)^n x (1 / (r - g))
```
- g = taux de croissance (defaut 8%)
- r = taux d'actualisation (defaut 10%)
- n = periode de projection (defaut 10 ans)

3 scenarios : Bear (g=4%, r=11%), Base (g=8%, r=10%), Bull (g=12%, r=9%)

### Score composite (0-100)
- 75-100 : Excellent candidat
- 50-74 : Bon candidat, a analyser
- < 50 : A eviter

Le score est ajuste selon le secteur (finance, technologie, energie ont des seuils differents).

### Score de risque (0-100)
Evalue l'endettement, la liquidite, la marge de securite, le P/E, le FCF et la qualite des donnees.

### ROIC
```
ROIC = NOPAT / (Dette + Equity)
NOPAT = Operating Income x (1 - 25%)
```

## Structure du projet

```
buffett-dashboard/
  server/
    index.js                       # Backend Express (proxy Yahoo Finance)
  public/
    stocks-data.csv                # Donnees de fallback
  src/
    App.jsx                        # Point d'entree, AppProvider
    context/
      AppContext.jsx               # State partage (watchlist, notifications, donnees)
    components/
      Dashboard.jsx                # Orchestrateur principal
      DashboardHeader.jsx          # Header, recherche, boutons
      NotificationToast.jsx        # Notifications
      StatsCards.jsx               # Cartes de stats
      FilterPanel.jsx              # Sliders de filtres
      FilterToggle.jsx             # Toggle filtres actifs/inactifs
      StocksTable.jsx              # Tableau des actions
      StockDetail.jsx              # Vue detail
      ComparisonPanel.jsx          # Comparaison cote a cote
      GuideSection.jsx             # Guide d'interpretation
    utils/
      constants.js                 # Constantes financieres centralisees
      financialCalculations.js     # Calculs Buffett
      storageManager.js            # localStorage (watchlist S&P/TSX 60, comparaison)
      apiClient.js                 # Appels API backend
      dataExport.js                # Parsing CSV, export
      csvParser.js                 # Re-export (retrocompatibilite)
      __tests__/                   # 73 tests unitaires (Vitest)
```

## Technologies

- **React 19** + **Vite 4**
- **Tailwind CSS 4**
- **Recharts 3** (graphiques)
- **Vitest** (tests unitaires)
- **Express** (backend API)

## Donnees

### Mode API (recommande)
Le backend Express interroge Yahoo Finance en temps reel. Les donnees incluent l'historique de prix sur 10 ans.

### Mode CSV (fallback)
Si le backend est indisponible, l'application charge `public/stocks-data.csv`. Format attendu :

```csv
ticker,name,sector,marketCap,price,pe,pb,roe,debtToEquity,netMargin,freeCashFlow,revenueGrowth5Y,currentRatio,dividendYield,eps,operatingIncome,totalDebt,totalEquity
```

Utilisez `NaN` pour les valeurs manquantes.

## Avertissement

Ce dashboard est un outil d'analyse educatif. Les donnees et calculs sont fournis a titre indicatif. Faites toujours vos propres recherches et consultez un conseiller financier avant d'investir.

## Licence

MIT
