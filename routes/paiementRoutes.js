const express = require('express');  
const router = express.Router();
const paiementController = require('../controllers/paiementController');

// Middleware auth
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/login');
}

// =========================
// Recharge
// =========================
router.get('/recharger', ensureAuthenticated, paiementController.showRechargePage);

// =========================
// STRIPE
// =========================
router.post('/stripe', ensureAuthenticated, paiementController.createStripeSession);
router.get('/success', ensureAuthenticated, paiementController.stripeSuccess);
router.get('/cancel', ensureAuthenticated, paiementController.stripeCancel);

// =========================
// PAYPAL
// =========================
router.post('/paypal', ensureAuthenticated, paiementController.createPaypalPayment);
router.get('/paypal-success', ensureAuthenticated, paiementController.paypalSuccess);
router.get('/paypal-cancel', ensureAuthenticated, paiementController.paypalCancel);

// =========================
// Retrait
// =========================
router.get('/retrait', ensureAuthenticated, paiementController.showRetraitPage);
router.post('/retrait', ensureAuthenticated, paiementController.retrait);
router.get('/retrait-info/:id', ensureAuthenticated, paiementController.retraitInfo);

router.get('/vantex', ensureAuthenticated, paiementController.vantexPage); 

// Page formulaire ouverture compte VANTEX
router.get('/vantex-open', ensureAuthenticated, paiementController.vantexOpenPage);

// Soumission formulaire ouverture compte VANTEX
router.post('/vantex/submit', ensureAuthenticated, paiementController.vantexOpenSubmit);


// Page historique des retraits
router.get('/mes-retraits', ensureAuthenticated, paiementController.mesRetraits);

// Page historique des recharges
router.get('/mes-recharges', ensureAuthenticated, paiementController.mesRecharges);


// Solde (Portefeuille)
router.get('/solde', ensureAuthenticated, paiementController.showSoldePage);


module.exports = router;
