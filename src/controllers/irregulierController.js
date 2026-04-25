const pool = require('../config/db');
const {
  simulerQuantitesConstantes,
  simulerPeriodesConstantes: calcSimulerPeriodesConstantes, // RENOMMAGE pour éviter le conflit
  calculerStatistiques,
} = require('../utils/irregulierCalculator');
const { calculerWilson } = require('../utils/wilsonCalculator');

/**
 * Simulation consommation irrégulière — Quantités constantes
 */
const simulerQtesConstantes = async (req, res) => {
  try {
    const {
      consommations,
      stock_initial,
      prix_unitaire,
      cout_passation,
      taux_possession,
      delai_approvisionnement,
      marge_securite,
      stock_securite,
      sauvegarder,
      article_id,
    } = req.body;

    // Validations
    if (!consommations || !Array.isArray(consommations) || consommations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le tableau des consommations est requis (tableau de nombres)',
      });
    }
    if (!prix_unitaire || !cout_passation || !taux_possession) {
      return res.status(400).json({
        success: false,
        message: 'Prix unitaire, coût de passation et taux de possession sont requis',
      });
    }

    // Consommation annuelle totale
    const consommation_annuelle = consommations.reduce(
      (a, b) => a + parseFloat(b), 0
    );

    // Calcul Wilson pour avoir la Qe optimale
    const wilson = calculerWilson({
      consommation_annuelle,
      prix_unitaire,
      cout_passation,
      taux_possession,
      stock_initial: stock_initial || 0,
      delai_approvisionnement: delai_approvisionnement || 0,
      stock_securite: stock_securite || 0,
    });

    const qe = wilson.Qe;

    // Simulation quantités constantes
    const simulation = simulerQuantitesConstantes({
      consommations: consommations.map(Number),
      stock_initial: parseFloat(stock_initial || 0),
      qe,
      delai: parseFloat(delai_approvisionnement || 0),
      marge_securite: parseFloat(marge_securite || 1),
      stock_securite: parseFloat(stock_securite || 0),
    });

    const stats = calculerStatistiques(simulation.resume);

    const resultat = {
      wilson_base: wilson,
      simulation,
      statistiques: stats,
      consommation_annuelle,
      consommations_saisies: consommations.map(Number),
    };

    // Sauvegarde optionnelle
    if (sauvegarder) {
      await pool.query(
        `INSERT INTO simulations_irregulieres 
         (article_id, methode, consommations, stock_initial, prix_unitaire,
          cout_passation, taux_possession, delai_approvisionnement,
          marge_securite, stock_securite, qe_utilisee, nb_commandes,
          stock_moyen, nb_ruptures)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          article_id || null,
          'quantites_constantes',
          JSON.stringify(consommations),
          stock_initial || 0,
          prix_unitaire,
          cout_passation,
          taux_possession,
          delai_approvisionnement || 0,
          marge_securite || 1,
          stock_securite || 0,
          qe,
          stats.nb_livraisons,
          stats.stock_moyen,
          stats.nb_ruptures,
        ]
      );
    }

    res.json({ success: true, data: resultat });
  } catch (error) {
    console.error('Erreur simulation qtés constantes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Historique des simulations irrégulières
 */
const getHistoriqueIrregulier = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT si.*, a.nom as article_nom
      FROM simulations_irregulieres si
      LEFT JOIN articles a ON si.article_id = a.id
      ORDER BY si.created_at DESC LIMIT 30
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  simulerQtesConstantes,
  getHistoriqueIrregulier,
};