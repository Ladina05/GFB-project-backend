const express = require('express');
const router = express.Router();
const {
  simulerQtesConstantes,
  simulerPeriodes,          // nom corrigé
  comparerMethodes,
  getHistoriqueIrregulier,
} = require('../controllers/irregulierController');

router.post('/quantites-constantes', simulerQtesConstantes);
router.get('/historique', getHistoriqueIrregulier);

module.exports = router;