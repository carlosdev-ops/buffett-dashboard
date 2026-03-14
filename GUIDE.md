# Guide d'utilisation - Buffett Stock Analyzer

## Demarrage rapide

```bash
# Lancer le backend (donnees en temps reel)
cd server && node index.js

# Dans un autre terminal, lancer le frontend
npm run dev
```

Ouvrez votre navigateur sur `http://localhost:5173`

> Si le backend n'est pas lance, l'application fonctionne en mode demo avec des donnees CSV statiques. Un badge jaune "Mode demo (CSV)" s'affiche dans l'en-tete.

## Apercu de l'application

### 1. En-tete et recherche

- **Badge de source** : Vert = API en direct, Jaune = Mode demo (CSV)
- **Heure de mise a jour** : Derniere actualisation des donnees
- **Barre de recherche** : Tapez un ticker (ex: `RY.TO`) ou un nom d'entreprise. Les resultats apparaissent en autocomplete. Cliquez pour ajouter a la watchlist.
- **Reinitialiser** : Restaure les 60 actions du S&P/TSX 60
- **Actualiser** : Recharge les donnees depuis l'API
- **Exporter CSV** : Telecharge les actions filtrees

### 2. Panneau de statistiques

Affiche 4 metriques agregees des actions filtrees :
- **Actions filtrees** : Nombre d'actions correspondant aux criteres (sur le total)
- **Score moyen** : Score composite moyen (0-100)
- **ROE moyen** : Return on Equity moyen
- **Marge de securite moyenne** : Ecart moyen entre valeur intrinseque et prix

### 3. Panneau de filtres

Trois categories de criteres selon Buffett :

#### Qualite du business
- **ROE minimum** (defaut 18%) : Critere Buffett = 15%+
- **Marge nette minimum** (defaut 12%) : Critere Buffett = 10%+
- **Croissance revenus 5Y** (defaut 5%) : Preference pour croissance positive
- **Free Cash Flow minimum** (defaut 0) : Doit etre positif

#### Solidite financiere
- **Dette/Equity maximum** (defaut 0.80) : Critere Buffett < 0.5
- **Current Ratio minimum** (defaut 1.0) : Critere Buffett > 1.5

#### Valorisation
- **P/E ratio maximum** (defaut 22) : Eviter > 25
- **P/B ratio maximum** (defaut 5) : Variable selon le ROE
- **Price/FCF maximum** (defaut 18) : Critere Buffett < 15
- **Marge de securite minimum** (defaut 30%) : Buffett recherche 25-30%

#### Toggle des filtres
Le bandeau bleu sous les filtres permet de les desactiver temporairement pour voir toutes les actions de la watchlist.

### 4. Tableau des actions

- **Tri** : Cliquez sur les en-tetes de colonnes
- **Selection** : Cliquez sur une ligne pour voir les details
- **Suppression** : Bouton X pour retirer une action de la watchlist
- **Comparaison** : Case a cocher pour ajouter au comparateur (max 4)
- **Colonnes** : Ticker, Nom, Secteur, Score, ROE, Marge nette, Dette/Equity, P/E, Marge de securite (MdS), Prix

### 5. Panneau de details (apparait a droite)

- **En-tete** : Ticker, nom, secteur, prix, score composite et score de risque
- **Graphique radar** : Vue d'ensemble de la qualite
- **Valorisation DCF** :
  - 3 scenarios : Bear (conservateur), Base, Bull (optimiste)
  - Fourchette de valeur intrinseque par action
  - CAGR du prix sur 10 ans (si disponible)
- **Metriques detaillees** : 3 sections (qualite, solidite, valorisation)
- **These d'investissement** : Forces, points de vigilance, verdict automatique
- **Qualite des donnees** : Score indiquant la completude des metriques
- **Export rapport** : Telecharge un fichier texte detaille

### 6. Panneau de comparaison

Selectionnez 2 a 4 actions via les cases a cocher du tableau. Le panneau en bas affiche les metriques cles cote a cote pour faciliter la comparaison.

## Interpretation des scores

### Score composite (0-100)
- **75-100** : Excellent candidat selon Buffett
- **50-74** : Bon candidat, a analyser plus en detail
- **0-49** : A eviter ou approfondir l'analyse

Le score est ajuste selon le secteur :
- **Finance** : Seuils de dette et P/E plus tolerants
- **Technologie** : P/B et P/E plus tolerants
- **Energie** : Profil intermediaire

### Score de risque (0-100)
- **0-35** : Risque faible
- **35-65** : Risque modere
- **65-100** : Risque eleve

### Marge de securite
- **> 30%** : Excellente opportunite
- **20-30%** : Bonne marge selon Buffett
- **10-20%** : Acceptable mais risque
- **0-10%** : Peu de marge d'erreur
- **< 0%** : Action surevaluee

### Code couleur des metriques
Dans le tableau :
- **Vert** : Respecte les criteres de Buffett
- **Jaune** : Acceptable mais pas optimal
- **Rouge** : En dessous des standards

### Verdicts de la these d'investissement
- **"Candidat de qualite avec risque maitrise"** : Risque <= 35 et score >= 70
- **"Dossier risque"** : Risque >= 65
- **"Profil equilibre"** : Tous les autres cas

## Formules utilisees

### 1. Valeur intrinseque (DCF simplifie)
```
Valeur future FCF = FCF actuel x (1 + taux croissance)^annees
Valeur terminale = Valeur future FCF / (taux actualisation - taux croissance)
Valeur presente = Valeur terminale / (1 + taux actualisation)^annees
```

Parametres par defaut :
- Taux de croissance : 8%
- Taux d'actualisation : 10%
- Periode : 10 ans

3 scenarios :
| Scenario | Croissance | Actualisation |
|---|---|---|
| Bear | 4% | 11% |
| Base | 8% | 10% |
| Bull | 12% | 9% |

### 2. Formule de Graham
```
VI = EPS x (8.5 + 2g) x 4.4 / Y
```
- EPS = Benefice par action
- g = taux de croissance attendu (en %)
- Y = taux obligataire AAA (defaut 4.4%)

### 3. Marge de securite
```
Marge = (Valeur intrinseque - Prix actuel) / Valeur intrinseque x 100
```

### 4. ROIC (Return on Invested Capital)
```
NOPAT = Operating Income x (1 - Tax Rate)
ROIC = NOPAT / (Dette totale + Equity) x 100
```
Tax Rate par defaut : 25%

### 5. Score composite
Ponderation :
- **40%** Qualite du business (ROE, marge, croissance, FCF)
- **30%** Solidite financiere (dette, liquidite)
- **30%** Valorisation (P/E, P/B, Price/FCF, marge de securite)

### 6. Score Moat (avantage concurrentiel)
- ROE >= 15% : +25 pts (bonus +10 si >= 20%)
- Marge nette >= 10% : +20 pts (bonus +10 si >= 20%)
- Croissance revenus > 0 : +20 pts (bonus +10 si >= 10%)
- FCF positif : +15 pts
- Maximum : 100

## Exemples d'utilisation

### Scenario 1 : Recherche d'entreprises de qualite
1. Regler ROE minimum a 20%
2. Marge nette minimum a 15%
3. Dette/Equity maximum a 0.3
4. Regarder les entreprises avec score > 70

### Scenario 2 : Recherche de bonnes affaires (value investing)
1. Marge de securite minimum a 25%
2. P/E maximum a 15
3. Dette/Equity maximum a 0.5
4. FCF positif

### Scenario 3 : Recherche d'entreprises en croissance
1. Croissance revenus minimum a 10%
2. ROE minimum a 15%
3. Marge nette minimum a 10%
4. Accepter un P/E plus eleve (ajuster le slider)

## Gestion de la watchlist

### Ajouter des actions
1. Tapez dans la barre de recherche (ticker ou nom)
2. Cliquez sur le resultat souhaite
3. L'action est chargee depuis l'API et ajoutee au tableau
4. Si elle ne passe pas les filtres, une notification propose de desactiver les filtres

### Retirer des actions
Cliquez sur le bouton X a gauche de la ligne dans le tableau.

### Persistance
La watchlist et la selection de comparaison sont sauvegardees dans le navigateur (localStorage). Elles persistent entre les sessions.

### Reinitialisation
Le bouton "Reinitialiser" restaure les 60 actions du S&P/TSX 60 (marche canadien). La liste inclut les grandes capitalisations canadiennes : RY.TO, TD.TO, SHOP.TO, ENB.TO, CNQ.TO, BMO.TO, BNS.TO, CP.TO, CNR.TO, ABX.TO, etc.

## Export des resultats

### Export CSV
Cliquez sur "Exporter CSV" dans l'en-tete. Le fichier contient :
- Donnees de base (ticker, nom, secteur, prix)
- Metriques de qualite (ROE, marge, croissance, FCF)
- Metriques financieres (dette, liquidite)
- Valorisation (P/E, P/B, valeur intrinseque, 3 scenarios DCF)
- Scores (composite, base, risque)
- Verdict d'investissement
- Qualite des donnees et champs manquants

### Rapport texte
Depuis la vue detail d'une action, exportez un rapport complet incluant toutes les metriques, la these d'investissement et le verdict.

## Donnees

### Mode API (recommande)
Lancez le backend (`cd server && node index.js`). Il interroge Yahoo Finance en temps reel et fournit :
- Donnees fondamentales (prix, ratios, marges, dette, etc.)
- Historique de prix sur 10 ans (pour le calcul du CAGR)

### Mode CSV (fallback)
Si le backend est indisponible, l'application charge `public/stocks-data.csv`. Vous pouvez editer ce fichier pour ajouter vos propres donnees :

```csv
ticker,name,sector,marketCap,price,pe,pb,roe,debtToEquity,netMargin,freeCashFlow,revenueGrowth5Y,currentRatio,dividendYield,eps,operatingIncome,totalDebt,totalEquity
```

Utilisez `NaN` pour les valeurs manquantes.

## Limitations et avertissements

1. **Calculs simplifies** : Les calculs DCF utilisent un taux de croissance constant (pas de variation dans le temps)
2. **Analyse qualitative absente** : L'outil ne peut pas evaluer la qualite du management, les avantages concurrentiels qualitatifs, les perspectives sectorielles ou les risques geopolitiques
3. **Dependance a Yahoo Finance** : Les donnees API dependent de la disponibilite de Yahoo Finance
4. **Pas de conseil financier** : Toujours faire vos propres recherches

## Checklist avant d'investir

- [ ] ROE > 15% sur 5-10 ans
- [ ] Marge nette > 10% de facon consistante
- [ ] Croissance stable et previsible
- [ ] FCF positif et croissant
- [ ] Dette gerable (Dette/Equity < 0.5)
- [ ] Business simple et comprehensible
- [ ] Avantage concurrentiel durable (moat)
- [ ] Management de qualite et integre
- [ ] Prix avec marge de securite (25-30%)
- [ ] Horizon d'investissement long terme

## Principes de Warren Buffett a retenir

> "Le prix est ce que vous payez. La valeur est ce que vous obtenez."

> "Il vaut mieux acheter une entreprise extraordinaire a un prix correct qu'une entreprise correcte a un prix extraordinaire."

> "Notre periode de detention preferee est : pour toujours."

> "Regle n°1 : Ne jamais perdre d'argent. Regle n°2 : Ne jamais oublier la regle n°1."

---

**Disclaimer** : Cet outil est a but educatif uniquement. Ne constitue pas un conseil en investissement. Consultez un professionnel avant toute decision financiere.
