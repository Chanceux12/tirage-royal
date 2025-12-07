const express = require("express");
const router = express.Router();
const paiementController = require("../controllers/paiementController");

// Route pour soumettre une demande VANTEX
router.post("/paiement/vantex/submit", paiementController.vantexOpenSubmit);

module.exports = router;
