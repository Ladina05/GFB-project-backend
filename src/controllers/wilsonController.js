const pool = require('../config/db');
const { calculerWilson } = require('../utils/wilsonCalculator');

// Effectuer un calcul Wilson et le sauvegarder
const calculerEtSauvegarder = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      article_id,
      consommation_annuelle,
      prix_unitaire,
      cout_passation,
      taux_possession,
      stock_initial,
      delai_approvisionnement,
      stock_securite,
    } = req.body;

    // Validation
    if (!consommation_annuelle || !prix_unitaire || !cout_passation || !taux_possession) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants: consommation, prix, coût de passation et taux de possession requis',
      });
    }

    // Calcul Wilson
    const resultat = calculerWilson({
      consommation_annuelle,
      prix_unitaire,
      cout_passation,
      taux_possession,
      stock_initial: stock_initial || 0,
      delai_approvisionnement: delai_approvisionnement || 0,
      stock_securite: stock_securite || 0,
    });

    await client.query('BEGIN');

    // Sauvegarde du calcul principal
    const calcul = await client.query(
      `INSERT INTO calculs_wilson (
        article_id, consommation_annuelle, prix_unitaire, cout_passation,
        taux_possession, stock_initial, delai_approvisionnement, stock_securite,
        n_optimal, qe_economique, periode_commande, cout_stockage_min,
        cout_passation_total, cout_possession_total, point_commande
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        article_id || null,
        consommation_annuelle,
        prix_unitaire,
        cout_passation,
        taux_possession,
        stock_initial || 0,
        delai_approvisionnement || 0,
        stock_securite || 0,
        resultat.N_optimal,
        resultat.Qe,
        resultat.periode_mois,
        resultat.cout_stockage_min,
        resultat.cout_passation_total,
        resultat.cout_possession_total,
        resultat.point_commande,
      ]
    );

    const calcul_id = calcul.rows[0].id;

    // Sauvegarde des simulations par cadence
    for (const sim of resultat.simulations) {
      await client.query(
        `INSERT INTO simulations_cadence (calcul_id, cadence_n, cout_passation, cout_possession, cout_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [calcul_id, sim.cadence_n, sim.cout_passation, sim.cout_possession, sim.cout_total]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        calcul_id,
        ...resultat,
        db_record: calcul.rows[0],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur calcul Wilson:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// Calcul rapide sans sauvegarde
const calculerRapide = async (req, res) => {
  try {
    const {
      consommation_annuelle,
      prix_unitaire,
      cout_passation,
      taux_possession,
      stock_initial,
      delai_approvisionnement,
      stock_securite,
    } = req.body;

    if (!consommation_annuelle || !prix_unitaire || !cout_passation || !taux_possession) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres incomplets',
      });
    }

    const resultat = calculerWilson({
      consommation_annuelle,
      prix_unitaire,
      cout_passation,
      taux_possession,
      stock_initial: stock_initial || 0,
      delai_approvisionnement: delai_approvisionnement || 0,
      stock_securite: stock_securite || 0,
    });

    res.json({ success: true, data: resultat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupérer l'historique des calculs
const getHistorique = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cw.*,
        a.nom as article_nom,
        a.description as article_description
      FROM calculs_wilson cw
      LEFT JOIN articles a ON cw.article_id = a.id
      ORDER BY cw.created_at DESC
      LIMIT 50
    `);

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupérer un calcul avec ses simulations
const getCalculDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const calcul = await pool.query(
      `SELECT cw.*, a.nom as article_nom
       FROM calculs_wilson cw
       LEFT JOIN articles a ON cw.article_id = a.id
       WHERE cw.id = $1`,
      [id]
    );

    if (calcul.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Calcul non trouvé' });
    }

    const simulations = await pool.query(
      'SELECT * FROM simulations_cadence WHERE calcul_id = $1 ORDER BY cadence_n',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...calcul.rows[0],
        simulations: simulations.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprimer un calcul
const deleteCalcul = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM calculs_wilson WHERE id = $1', [id]);
    res.json({ success: true, message: 'Calcul supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  calculerEtSauvegarder,
  calculerRapide,
  getHistorique,
  getCalculDetail,
  deleteCalcul,
};