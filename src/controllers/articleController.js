const pool = require('../config/db');

// Récupérer tous les articles
const getArticles = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM articles ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error('Erreur getArticles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Récupérer un article par ID
const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM articles WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Article non trouvé' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Créer un article
const createArticle = async (req, res) => {
  try {
    const { nom, description, prix_unitaire } = req.body;

    if (!nom || !prix_unitaire) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et le prix unitaire sont obligatoires',
      });
    }

    const result = await pool.query(
      `INSERT INTO articles (nom, description, prix_unitaire)
       VALUES ($1, $2, $3) RETURNING *`,
      [nom, description || '', prix_unitaire]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mettre à jour un article
const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, prix_unitaire } = req.body;

    const result = await pool.query(
      `UPDATE articles SET nom=$1, description=$2, prix_unitaire=$3
       WHERE id=$4 RETURNING *`,
      [nom, description, prix_unitaire, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Article non trouvé' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprimer un article
const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM articles WHERE id = $1', [id]);
    res.json({ success: true, message: 'Article supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
};