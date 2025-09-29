const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated } = require('../middlewares/auth');

// 🔐 Dashboard utilisateur (historique des recharges)
router.get('/dashboard', ensureAuthenticated, userController.showDashboard);

// Afficher le formulaire de modification des infos personnelles
router.get('/profil/modifier', ensureAuthenticated, userController.showEditForm);

// Traiter la modification
router.post('/profil/modifier', ensureAuthenticated, userController.updateProfile);

// Détail d’un ticket
router.get('/ticket/:id', ensureAuthenticated, userController.showTicketDetail);

router.get('/ticket/:id/pdf', ensureAuthenticated, userController.downloadTicketPdf);

module.exports = router;
