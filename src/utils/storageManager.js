/**
 * Gestion du stockage local (watchlist, comparaison)
 */

// S&P/TSX 60 — Les 60 plus grandes capitalisations du TSX (Toronto)
export const DEFAULT_WATCHLIST = [
  'RY.TO', 'TD.TO', 'BNS.TO', 'BMO.TO', 'CM.TO', 'NA.TO',        // Banques
  'MFC.TO', 'SLF.TO', 'IFC.TO', 'GWO.TO',                         // Assurances/Finance
  'ENB.TO', 'TRP.TO', 'PPL.TO',                                    // Pipelines
  'CNQ.TO', 'SU.TO', 'CVE.TO', 'IMO.TO', 'TOU.TO', 'ARX.TO',     // Energie
  'ABX.TO', 'FNV.TO', 'WPM.TO', 'FM.TO', 'TECK.TO',              // Mines/Metaux
  'CP.TO', 'CNR.TO',                                                // Transport ferroviaire
  'SHOP.TO', 'CSU.TO', 'OTEX.TO', 'CGI.TO',                       // Technologie
  'BCE.TO', 'T.TO', 'RCI-B.TO',                                    // Telecoms
  'ATD.TO', 'L.TO', 'MRU.TO', 'DOL.TO', 'CTC-A.TO',              // Commerce/Detail
  'WSP.TO', 'CAE.TO', 'FSV.TO',                                    // Services/Industriels
  'FTS.TO', 'EMA.TO', 'H.TO',                                      // Utilities
  'CCJ.TO',                                                         // Uranium
  'WCN.TO',                                                         // Environnement
  'QSR.TO',                                                         // Restauration
  'BAM.TO', 'BN.TO', 'BIP-UN.TO', 'BEP-UN.TO',                    // Brookfield
  'NTR.TO', 'WFG.TO',                                              // Ressources/Foret
  'GIB-A.TO', 'SAP.TO',                                            // Tech/Services
  'K.TO',                                                           // Kinross Gold
  'GSY.TO',                                                         // Finance alternative
  'IVN.TO',                                                         // Mines
  'MG.TO',                                                          // Automobile
];

const WATCHLIST_KEY = 'carlos-watchlist';
const COMPARE_KEY = 'carlos-compare-tickers';

/**
 * Charge la watchlist depuis localStorage (ou retourne la liste par défaut)
 */
export function loadWatchlist() {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_WATCHLIST];
}

/**
 * Sauvegarde la watchlist dans localStorage
 */
export function saveWatchlist(tickers) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(tickers));
}

/**
 * Charge les tickers sélectionnés pour la comparaison
 */
export function loadCompareTickers() {
  try {
    const stored = localStorage.getItem(COMPARE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Sauvegarde les tickers sélectionnés pour la comparaison
 */
export function saveCompareTickers(tickers) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(tickers));
}
