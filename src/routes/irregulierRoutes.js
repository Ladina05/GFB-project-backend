const express = require('express');
const router = express.Router();
const {
  simulerQtesConstantes,
  simulerPeriodes,          // nom corrigé
  comparerMethodes,
  getHistoriqueIrregulier,
} = require('../controllers/irregulierController');

router.post('/quantites-constantes', simulerQtesConstantes);
router.post('/periodes-constantes', simulerPeriodes);   // nom corrigé
router.post('/comparer', comparerMethodes);
router.get('/historique', getHistoriqueIrregulier);

module.exports = router;