const express = require("express");
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middlewares/auth');
const paiementController = require("../controllers/paiementController");

// Multer pour gérer les fichiers en mémoire (compatible Vercel)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Soumission de la demande VANTEX
router.post(
  "/paiement/vantex/submit",
  ensureAuthenticated,
  upload.fields([
    { name: "id_front", maxCount: 1 },
    { name: "id_back", maxCount: 1 }
  ]),
  paiementController.vantexOpenSubmit
);

// Page Merci
router.get("/paiement/vantex/merci", ensureAuthenticated, (req, res) => {
  res.render("paiement/merci", {
    success: req.flash('success'),
    error: req.flash('error')
  });
});

module.exports = router;

