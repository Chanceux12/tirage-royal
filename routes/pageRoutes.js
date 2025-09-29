const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Politique de confidentialité
router.get('/politique-confidentialite', pageController.politiqueConfidentialite);

// Partenaires
router.get('/partenaires', pageController.partenaires);

// Cookies
router.get('/cookies', pageController.cookies);

router.get('/site-officiel', pageController.siteOfficiel);
router.get('/joueurs', pageController.joueurs);
router.get('/detaillants', pageController.detaillants);
router.get('/candidats', pageController.candidats);
router.get('/journalistes', pageController.journalistes);
router.get('/groupe', pageController.groupe);
router.get('/fondation', pageController.fondation);

router.get('/contact', pageController.contact);
router.post('/contact', pageController.envoyerContact);
router.get('/conditions', pageController.conditions);

module.exports = router;
