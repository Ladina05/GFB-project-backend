/**
 * Calcul consommation IRREGULIERE - Cours GFB Chapitre IV §5 et §5.2
 * 
 * Méthode 1 : Commandes à quantités constantes (dates variables)
 *   - On commande toujours Qe unités
 *   - La date de commande dépend du niveau du stock
 *   - Point de commande = (C_mois_suivant * marge_securite) + Ss
 * 
 * Méthode 2 : Commandes par périodes constantes (quantités variables)
 *   - On commande tous les T = 12/N mois
 *   - La quantité commandée couvre la consommation jusqu'à la prochaine livraison
 */

/**
 * Simule la gestion de stock avec QUANTITES CONSTANTES
 * @param {number[]} consommations - tableau des consommations mensuelles (12 mois)
 * @param {number} stock_initial - stock en début de période
 * @param {number} qe - quantité économique (lot fixe)
 * @param {number} delai - délai d'approvisionnement en mois
 * @param {number} marge_securite - marge de sécurité en mois
 * @param {number} stock_securite - stock de sécurité (Ss)
 */
function simulerQuantitesConstantes({
    consommations,
    stock_initial,
    qe,
    delai,
    marge_securite = 1,
    stock_securite = 0,
  }) {
    const mois = ['D', 'J', 'F', 'M', 'A', 'M', 'J', 'Ju', 'A', 'S', 'O', 'N', 'D'];
    const n = consommations.length;
  
    // Résultats par mois
    const tableau = [];
    let stock_courant = parseFloat(stock_initial);
    const commandes_en_cours = {}; // mois_livraison -> quantite
  
    // Stock avec rupture éventuelle
    let stocks_rupture = [stock_courant];
    const commandes = {}; // date_commande -> { quantite, date_livraison }
    const livraisons = {}; // date_livraison -> quantite
  
    // On calcule d'abord les stocks avec rupture éventuelle
    let s = stock_courant;
    const stocks_bruts = [s];
    for (let i = 0; i < n; i++) {
      s -= consommations[i];
      stocks_bruts.push(s);
    }
  
    // Maintenant on détermine les commandes nécessaires
    // Point de commande : stock qui déclenche une commande
    // SCM = consommation pendant (delai + marge_securite) + Ss
    const total_delai_marge = delai + marge_securite;
  
    // Reset
    stock_courant = parseFloat(stock_initial);
    const livraisons_planifiees = {}; // mois_index -> quantite
  
    // Simulation mois par mois
    for (let i = 0; i <= n; i++) {
      const mois_label = i === 0 ? 'D (initial)' : mois[i] || `M${i}`;
  
      // Réception des livraisons de ce mois
      const livraison_recue = livraisons_planifiees[i] || 0;
      const stock_apres_livraison = stock_courant + livraison_recue;
  
      // Consommation du mois
      const conso = i < n ? consommations[i] : 0;
      const stock_fin = stock_apres_livraison - conso;
  
      // Calculer consommation future pour le point de commande
      let conso_future = 0;
      for (let j = i; j < Math.min(i + Math.ceil(total_delai_marge), n); j++) {
        conso_future += consommations[j];
      }
      const point_commande_dynamique = conso_future + stock_securite;
  
      // Faut-il commander ? Stock fin < point de commande
      let commande_passee = null;
      if (i < n && stock_fin < point_commande_dynamique) {
        // Chercher quand livrer : i + delai + 1
        const mois_livraison = i + Math.ceil(delai) + 1;
        if (!livraisons_planifiees[mois_livraison]) {
          livraisons_planifiees[mois_livraison] = qe;
          commande_passee = {
            date_commande: `début ${mois[i + 1] || `M${i+1}`}`,
            date_livraison: `début ${mois[mois_livraison] || `M${mois_livraison}`}`,
            quantite: qe,
            mois_livraison,
          };
        }
      }
  
      // Stock rectifié (avec les livraisons planifiées)
      let stock_rectifie = stock_fin;
      // Ajouter les livraisons futures déjà planifiées
      for (let futur in livraisons_planifiees) {
        if (parseInt(futur) > i) {
          // déjà comptabilisé dans la simulation
        }
      }
  
      tableau.push({
        mois_index: i,
        mois_label,
        stock_debut: Math.round(stock_courant * 100) / 100,
        livraison_recue: Math.round(livraison_recue * 100) / 100,
        consommation: i < n ? consommations[i] : 0,
        stock_fin: Math.round(stock_fin * 100) / 100,
        point_commande: Math.round(point_commande_dynamique * 100) / 100,
        commande: commande_passee,
        rupture: stock_fin < 0,
      });
  
      stock_courant = stock_apres_livraison - conso;
    }
  
    // Générer tableau résumé commandes/livraisons/sorties/stock
    const resume = genererResumeStock(
      consommations,
      stock_initial,
      livraisons_planifiees,
      mois
    );
  
    return {
      methode: 'quantites_constantes',
      parametres: { stock_initial, qe, delai, marge_securite, stock_securite },
      tableau_detail: tableau,
      resume,
      livraisons_planifiees: Object.entries(livraisons_planifiees).map(([m, q]) => ({
        mois_index: parseInt(m),
        mois_label: mois[parseInt(m)] || `M${m}`,
        quantite: q,
      })),
    };
  }
  
  /**
   * Simule la gestion de stock avec PERIODES CONSTANTES
   * @param {number[]} consommations - tableau des consommations mensuelles
   * @param {number} stock_initial - stock initial
   * @param {number} periode - période de commande en mois (T = 12/N)
   * @param {number} delai - délai d'approvisionnement en mois
   * @param {number} stock_securite - stock de sécurité
   */
  function simulerPeriodesConstantes({
    consommations,
    stock_initial,
    periode,
    delai,
    stock_securite = 0,
  }) {
    const mois_labels = ['D', 'J', 'F', 'M', 'A', 'M', 'J', 'Ju', 'A', 'S', 'O', 'N', 'D'];
    const n = consommations.length;
    const T = Math.round(periode); // période arrondie en mois entiers
  
    const livraisons_planifiees = {};
    const commandes_planifiees = {};
  
    // Déterminer les dates de livraison (début Février, début Avril, etc.)
    // Première livraison : mois 1 (début Février si D = mois 0)
    // Commande correspondante : mois 1 - delai
    
    let mois_premiere_livraison = 1; // début de l'exercice
    
    // Planifier toutes les livraisons
    for (let liv = mois_premiere_livraison; liv <= n + 1; liv += T) {
      const mois_commande = Math.max(0, liv - Math.ceil(delai));
      
      // Calculer la quantité nécessaire : couvrir T mois de consommation + stock sécu
      let conso_a_couvrir = 0;
      for (let j = liv; j < Math.min(liv + T, n + 1); j++) {
        if (j <= n && consommations[j - 1] !== undefined) {
          conso_a_couvrir += consommations[j - 1];
        }
      }
      
      // Quantité = consommation à couvrir (variable selon les prévisions)
      const quantite = conso_a_couvrir > 0 ? conso_a_couvrir : 0;
      
      if (quantite > 0 || liv === mois_premiere_livraison) {
        livraisons_planifiees[liv] = quantite > 0 ? quantite : 0;
        commandes_planifiees[mois_commande] = {
          quantite,
          date_livraison: liv,
          mois_livraison_label: mois_labels[liv] || `M${liv}`,
        };
      }
    }
  
    // Simulation avec les livraisons
    const resume = genererResumeStock(
      consommations,
      stock_initial,
      livraisons_planifiees,
      mois_labels
    );
  
    // Tableau détaillé avec commandes
    const tableau_detail = resume.map((row, i) => {
      const cmd = commandes_planifiees[row.mois_index];
      return {
        ...row,
        commande: cmd ? {
          date_commande: `début ${mois_labels[row.mois_index] || `M${row.mois_index}`}`,
          date_livraison: `début ${cmd.mois_livraison_label}`,
          quantite: cmd.quantite,
        } : null,
      };
    });
  
    return {
      methode: 'periodes_constantes',
      parametres: { stock_initial, periode: T, delai, stock_securite },
      tableau_detail,
      resume,
      livraisons_planifiees: Object.entries(livraisons_planifiees).map(([m, q]) => ({
        mois_index: parseInt(m),
        mois_label: mois_labels[parseInt(m)] || `M${m}`,
        quantite: Math.round(q * 100) / 100,
      })),
      commandes: Object.entries(commandes_planifiees).map(([m, c]) => ({
        mois_commande_index: parseInt(m),
        mois_commande_label: mois_labels[parseInt(m)] || `M${m}`,
        ...c,
      })),
    };
  }
  
  /**
   * Génère le tableau résumé : commandes / livraisons / sorties / stock
   */
  function genererResumeStock(consommations, stock_initial, livraisons_planifiees, mois_labels) {
    const n = consommations.length;
    const tableau = [];
    let stock = parseFloat(stock_initial);
  
    // Mois 0 = Décembre initial (stock initial seulement)
    tableau.push({
      mois_index: 0,
      mois_label: mois_labels[0] || 'D',
      commandes: null,
      livraisons: null,
      sorties: null,
      stock: Math.round(stock * 100) / 100,
    });
  
    for (let i = 1; i <= n; i++) {
      const livraison = livraisons_planifiees[i] || 0;
      stock += livraison;
      const conso = consommations[i - 1] || 0;
      stock -= conso;
  
      tableau.push({
        mois_index: i,
        mois_label: mois_labels[i] || `M${i}`,
        commandes: null, // rempli après
        livraisons: livraison > 0 ? Math.round(livraison * 100) / 100 : null,
        sorties: conso > 0 ? conso : null,
        stock: Math.round(stock * 100) / 100,
        rupture: stock < 0,
      });
    }
  
    return tableau;
  }
  
  /**
   * Calcule les statistiques de la simulation
   */
  function calculerStatistiques(resume) {
    const stocks = resume.map((r) => r.stock).filter((s) => s !== null);
    const ruptures = resume.filter((r) => r.rupture).length;
    const livraisons = resume.filter((r) => r.livraisons).length;
    const stock_moyen = stocks.reduce((a, b) => a + b, 0) / stocks.length;
    const stock_min = Math.min(...stocks);
    const stock_max = Math.max(...stocks);
  
    return {
      stock_moyen: Math.round(stock_moyen * 100) / 100,
      stock_min: Math.round(stock_min * 100) / 100,
      stock_max: Math.round(stock_max * 100) / 100,
      nb_ruptures: ruptures,
      nb_livraisons: livraisons,
    };
  }
  
  module.exports = {
    simulerQuantitesConstantes,
    simulerPeriodesConstantes,
    calculerStatistiques,
  };