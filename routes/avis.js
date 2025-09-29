const express = require('express');
const router = express.Router();
const avisController = require('../controllers/avisController');
const { ensureAuthenticated, ensureAdmin } = require('../middlewares/auth');

router.get('/', avisController.afficherAvis);
router.post('/ajouter', avisController.ajouterAvis);
router.get('/admin', ensureAuthenticated, ensureAdmin, avisController.afficherAdminAvis);
router.post('/admin/:id/approuver', ensureAuthenticated, ensureAdmin, avisController.approuverAvis);
router.post('/admin/:id/supprimer', ensureAuthenticated, ensureAdmin, avisController.supprimerAvis);


module.exports = router;
