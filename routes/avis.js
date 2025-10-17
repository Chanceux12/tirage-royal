const express = require('express');
const router = express.Router();
const avisController = require('../controllers/avisController');
const { ensureAuthenticated } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/authMiddleware');

// 🚀 Routes publiques
router.get('/', avisController.afficherAvis);
router.post('/ajouter', ensureAuthenticated, avisController.ajouterAvis);

// 🔐 Routes admin sécurisées
router.get('/admin', ensureAuthenticated, isAdmin, avisController.afficherAdminAvis);
router.post('/admin/:id/approuver', ensureAuthenticated, isAdmin, avisController.approuverAvis);
router.post('/admin/:id/supprimer', ensureAuthenticated, isAdmin, avisController.supprimerAvis);

module.exports = router;
