const express = require('express');
const router = express.Router();
const {
  simulerQtesConstantes,
  getHistoriqueIrregulier,
  getDetailIrregulier,
  deleteIrregulier,
} = require('../controllers/irregulierController');

router.post('/quantites-constantes', simulerQtesConstantes);
router.get('/historique', getHistoriqueIrregulier);
router.get('/:id', getDetailIrregulier);
router.delete('/:id', deleteIrregulier);

module.exports = router;