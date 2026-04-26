/**
 * Calcul consommation IRREGULIERE - Cours GFB §5.1 et §5.2
 * Algorithme fidèle aux tableaux pages 58-60
 */

const MOIS_LABELS = ['D', 'J', 'F', 'M', 'A', 'M', 'J', 'Ju', 'A', 'S', 'O', 'N', 'D'];

/* ════════════════════════════════════════════════════════════════
   §5.1 — QUANTITÉS CONSTANTES
   Algorithme exact du cours :
   1) Calculer stock_rupture = stock sans aucune livraison
   2) Parcourir mois par mois :
      - Si stock_rupture[i] <= 0 ET pas encore de livraison planifiée
        pour couvrir ce creux → passer commande
      - Livraison arrive au mois (i + delai + marge)
   3) Stock rectifié = recalcul avec toutes les livraisons planifiées
   ════════════════════════════════════════════════════════════════ */
function simulerQuantitesConstantes({
  consommations,
  stock_initial,
  qe,
  delai,
  marge_securite = 1,
  stock_securite = 0,
}) {
  const n  = consommations.length;
  const SI = parseFloat(stock_initial);
  const QE = parseFloat(qe);
  const d  = Math.round(parseFloat(delai));
  const ms = Math.round(parseFloat(marge_securite));
  const Ss = parseFloat(stock_securite);
  // marge de sécurité = anticipation du besoin,
  // le délai de livraison reste strictement le délai d'approvisionnement.
  const horizon_anticipation = d + ms;

  /* ── ÉTAPE 1 : init colonne "stock avec rupture éventuelle" ── */
  // Cette colonne est calculée après planification des livraisons (étape 3),
  // car elle représente le stock "avant livraison du mois".
  const stock_rupture = new Array(n + 1).fill(0);
  stock_rupture[0] = SI;

  /* ── ÉTAPE 2 : déterminer les commandes nécessaires ── */
  // On parcourt stock_rupture. Dès qu'il va tomber à 0 ou en dessous,
  // il faut qu'une livraison soit déjà arrivée.
  // La commande est passée (delai_total) mois AVANT la livraison.
  
  const livraisons = new Array(n + 2).fill(0);
  const commandes  = [];

  // stock_rectifie_courant pour décider si une nouvelle commande est nécessaire
  // On simule avec les livraisons déjà planifiées
  const sr_temp = new Array(n + 2).fill(0);
  sr_temp[0] = SI;
  for (let i = 1; i <= n; i++) {
    sr_temp[i] = sr_temp[i - 1] + livraisons[i] - consommations[i - 1];
  }

  // Algorithme fidèle au cours :
  // - on anticipe la rupture à l'horizon (d + marge)
  // - si rupture attendue, on commande maintenant
  // - la livraison arrive dans d mois (pas d + marge)

  // Pour reproduire EXACTEMENT le cours :
  // - La commande est passée au "début" d'un mois
  // - La livraison arrive au début du mois (commande + delai_total)
  // On parcourt les mois 0..n et on vérifie si une commande est nécessaire
  
  for (let i = 0; i < n; i++) {
    // Recalculer sr_temp avec les livraisons déjà planifiées
    sr_temp[0] = SI;
    for (let k = 1; k <= n; k++) {
      sr_temp[k] = sr_temp[k - 1] + livraisons[k] - consommations[k - 1];
    }

    // Stock projeté à l'horizon d'anticipation (d + marge)
    const mois_cible = i + horizon_anticipation;
    const stock_a_cible = mois_cible <= n ? sr_temp[mois_cible] : sr_temp[n];

    // Livraison au délai d'approvisionnement strict
    const mois_livraison = Math.min(i + d, n + 1);
    
    if (stock_a_cible <= Ss && livraisons[mois_livraison] === 0) {
      // Vérifier qu'on n'a pas déjà commandé pour ce creux
      const dejaCommande = commandes.some(
        (c) => c.mois_livraison_index === mois_livraison
      );
      if (!dejaCommande) {
        livraisons[mois_livraison] = QE;
        commandes.push({
          mois_commande_index : i,
          mois_commande_label : `début ${MOIS_LABELS[i] || `M${i}`}`,
          mois_livraison_index: mois_livraison,
          mois_livraison_label: `début ${MOIS_LABELS[mois_livraison] || `M${mois_livraison}`}`,
          quantite            : QE,
        });
      }
    }
  }

  /* ── ÉTAPE 3 : stock rectifié final ── */
  const sr = new Array(n + 1).fill(0);
  sr[0] = SI;
  for (let i = 1; i <= n; i++) {
    sr[i] = sr[i - 1] + livraisons[i] - consommations[i - 1];
  }

  // Colonne cours : stock disponible en fin de mois en l'absence
  // de la livraison du mois courant ("rupture éventuelle").
  // Concrètement : stock rectifié du mois précédent - consommation du mois.
  for (let i = 1; i <= n; i++) {
    stock_rupture[i] = sr[i - 1] - consommations[i - 1];
  }

  /* ── ÉTAPE 4 : tableau, synthèse, stats ── */
  const tableau      = _construireTableau(n, SI, consommations, stock_rupture, livraisons, sr, commandes);
  const synthese     = _construireSynthese(tableau);
  const statistiques = _calculerStatistiques(tableau);

  return {
    methode: 'quantites_constantes',
    tableau, synthese, statistiques, commandes,
    livraisons_planifiees: commandes.map((c) => ({
      mois_index: c.mois_livraison_index,
      mois_label: MOIS_LABELS[c.mois_livraison_index] || `M${c.mois_livraison_index}`,
      quantite  : c.quantite,
    })),
    resume: tableau,
  };
}

function _construireTableau(n, SI, consommations, stock_rupture, livraisons, sr, commandes) {
  const tableau = [];

  // Ligne D (stock initial)
  tableau.push({
    mois_index   : 0,
    mois_label   : MOIS_LABELS[0],
    consommation : null,
    stock_rupture: Math.round(SI * 100) / 100,
    livraison    : null,
    stock_rectifie: Math.round(SI * 100) / 100,
    commande     : commandes.find((c) => c.mois_commande_index === 0) || null,
  });

  // Lignes J → D
  for (let i = 1; i <= n; i++) {
    const lv  = livraisons[i] > 0 ? Math.round(livraisons[i] * 100) / 100 : null;
    const cmd = commandes.find((c) => c.mois_commande_index === i) || null;

    tableau.push({
      mois_index   : i,
      mois_label   : MOIS_LABELS[i] || `M${i}`,
      consommation : consommations[i - 1],
      stock_rupture: Math.round(stock_rupture[i] * 100) / 100,
      livraison    : lv,
      stock_rectifie: Math.round(sr[i] * 100) / 100,
      commande     : cmd,
    });
  }

  return tableau;
}

function _construireSynthese(tableau) {
  const commandes_row  = {};
  const livraisons_row = {};
  const sorties_row    = {};
  const stock_row      = {};

  tableau.forEach((row) => {
    const k = row.mois_index;
    if (row.commande) commandes_row[k] = row.commande.quantite;
    if (row.livraison) livraisons_row[k] = row.livraison;
    if (row.consommation !== null && row.consommation !== undefined)
      sorties_row[k] = row.consommation;
    stock_row[k] = row.stock_rectifie;
  });

  return {
    mois      : tableau.map((r) => r.mois_label),
    commandes : commandes_row,
    livraisons: livraisons_row,
    sorties   : sorties_row,
    stock     : stock_row,
  };
}

function _calculerStatistiques(tableau) {
  if (!tableau || !Array.isArray(tableau) || tableau.length === 0) {
    return { stock_moyen: 0, stock_min: 0, stock_max: 0, nb_ruptures: 0, nb_livraisons: 0 };
  }

  const lignes = tableau.slice(1);
  if (lignes.length === 0) {
    return { stock_moyen: 0, stock_min: 0, stock_max: 0, nb_ruptures: 0, nb_livraisons: 0 };
  }

  const stocks        = lignes.map((r) => r.stock_rectifie);
  const nb_ruptures   = stocks.filter((s) => s < 0).length;
  const nb_livraisons = lignes.filter((r) => r.livraison !== null).length;
  const stock_moyen   = stocks.reduce((a, b) => a + b, 0) / stocks.length;

  return {
    stock_moyen  : Math.round(stock_moyen * 100) / 100,
    stock_min    : Math.round(Math.min(...stocks) * 100) / 100,
    stock_max    : Math.round(Math.max(...stocks) * 100) / 100,
    nb_ruptures,
    nb_livraisons,
  };
}

function calculerStatistiques(tableau) {
  return _calculerStatistiques(tableau);
}

module.exports = {
  simulerQuantitesConstantes,
  calculerStatistiques,
};