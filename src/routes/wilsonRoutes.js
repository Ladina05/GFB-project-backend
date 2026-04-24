const express = require('express');
const router = express.Router();
const {
  calculerEtSauvegarder,
  calculerRapide,
  getHistorique,
  getCalculDetail,
  deleteCalcul,
} = require('../controllers/wilsonController');

router.post('/calculer', calculerEtSauvegarder);
router.post('/calculer-rapide', calculerRapide);
router.get('/historique', getHistorique);
router.get('/:id', getCalculDetail);
router.delete('/:id', deleteCalcul);

module.exports = router;