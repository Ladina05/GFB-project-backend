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
  // total mois entre commande et livraison
  const delai_total = d + ms;

  /* ── ÉTAPE 1 : stock avec rupture éventuelle (sans livraison) ── */
  const stock_rupture = new Array(n + 1).fill(0);
  stock_rupture[0] = SI;
  for (let i = 1; i <= n; i++) {
    stock_rupture[i] = stock_rupture[i - 1] - consommations[i - 1];
  }

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

  // Algorithme : on regarde chaque mois si le stock (rectifié) va descendre
  // en dessous de Ss dans les prochains (delai_total) mois
  // Si oui → on passe une commande maintenant, livraison dans (delai_total) mois

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

    // Stock projeté dans delai_total mois (après les livraisons déjà planifiées)
    const mois_cible = i + delai_total;
    const stock_a_cible = mois_cible <= n ? sr_temp[mois_cible] : sr_temp[n];

    // Si le stock sera insuffisant et pas encore de livraison planifiée dans la zone
    const mois_livraison = Math.min(i + delai_total, n + 1);
    
    if (stock_a_cible < Ss && livraisons[mois_livraison] === 0) {
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

/* ════════════════════════════════════════════════════════════════
   §5.2 — PÉRIODES CONSTANTES
   Algorithme exact du cours pages 59-60 :
   - On commande tous les T mois (T = 12/N arrondi)
   - Quantité = consommation des T prochains mois après livraison
   - Commande passée d mois avant livraison
   - Première livraison : au mois où le stock rupture passe sous Ss,
     arrondi au multiple de T le plus proche
   ════════════════════════════════════════════════════════════════ */
function simulerPeriodesConstantes({
  consommations,
  stock_initial,
  periode,
  delai,
  stock_securite = 0,
}) {
  const n  = consommations.length;
  const SI = parseFloat(stock_initial);
  const T  = Math.round(parseFloat(periode));
  const d  = Math.round(parseFloat(delai));
  const Ss = parseFloat(stock_securite);

  /* ── ÉTAPE 1 : stock avec rupture éventuelle ── */
  const stock_rupture = new Array(n + 1).fill(0);
  stock_rupture[0] = SI;
  for (let i = 1; i <= n; i++) {
    stock_rupture[i] = stock_rupture[i - 1] - consommations[i - 1];
  }

  /* ── ÉTAPE 2 : trouver premier mois de rupture ── */
  // Premier mois où stock_rupture <= Ss
  let premier_besoin = n + 1;
  for (let i = 1; i <= n; i++) {
    if (stock_rupture[i] <= Ss) {
      premier_besoin = i;
      break;
    }
  }

  // Premier mois de livraison = premier mois où on a besoin
  // (en respectant le délai : commande passée avant)
  // On prend le mois de besoin lui-même si delai permet
  let premier_mois_liv = premier_besoin;
  // La commande doit être passée d mois avant → début = premier_mois_liv - d
  // Si premier_mois_liv - d < 0, on décale
  if (premier_mois_liv - d < 0) {
    premier_mois_liv = d;
  }

  /* ── ÉTAPE 3 : planifier livraisons à période fixe T ── */
  const livraisons = new Array(n + 2).fill(0);
  const commandes  = [];

  for (let mois_liv = premier_mois_liv; mois_liv <= n + 1; mois_liv += T) {
    // Quantité = consommation des T mois suivant la livraison
    let qte = 0;
    for (let j = mois_liv; j < mois_liv + T && j <= n; j++) {
      qte += consommations[j - 1];
    }
    if (qte === 0) continue;

    livraisons[mois_liv] = Math.round(qte * 100) / 100;

    const mois_cmd = Math.max(0, mois_liv - d);
    commandes.push({
      mois_commande_index : mois_cmd,
      mois_commande_label : `début ${MOIS_LABELS[mois_cmd] || `M${mois_cmd}`}`,
      mois_livraison_index: mois_liv,
      mois_livraison_label: `début ${MOIS_LABELS[mois_liv] || `M${mois_liv}`}`,
      quantite            : Math.round(qte * 100) / 100,
    });
  }

  /* ── ÉTAPE 4 : stock rectifié ── */
  const sr = new Array(n + 1).fill(0);
  sr[0] = SI;
  for (let i = 1; i <= n; i++) {
    sr[i] = sr[i - 1] + livraisons[i] - consommations[i - 1];
  }

  /* ── ÉTAPE 5 : tableau, synthèse, stats ── */
  const tableau      = _construireTableau(n, SI, consommations, stock_rupture, livraisons, sr, commandes);
  const synthese     = _construireSynthese(tableau);
  const statistiques = _calculerStatistiques(tableau);

  return {
    methode: 'periodes_constantes',
    tableau, synthese, statistiques, commandes,
    livraisons_planifiees: commandes.map((c) => ({
      mois_index: c.mois_livraison_index,
      mois_label: MOIS_LABELS[c.mois_livraison_index] || `M${c.mois_livraison_index}`,
      quantite  : c.quantite,
    })),
    resume: tableau,
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */
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
  simulerPeriodesConstantes,
  calculerStatistiques,
};