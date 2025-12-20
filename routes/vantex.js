const express = require("express");
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middlewares/auth');
const paiementController = require("../controllers/paiementController");
const EmailVerification = require("../models/EmailVerification");


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
  (req, res, next) => {
    // Sécurité : vérifier que req.body existe
    if (!req.body) {
      req.flash('error', "Formulaire invalide. Veuillez réessayer.");
      return res.redirect("/paiement/vantex");
    }
    next();
  },
  paiementController.vantexOpenSubmit
);

// Page Merci après soumission
router.get("/paiement/vantex/merci", ensureAuthenticated, (req, res) => {
  res.render("paiement/merci", {
    success: req.flash('success'),
    error: req.flash('error')
  });
});

/* ============================= */
/*  ENVOI DU CODE EMAIL          */
/* ============================= */
router.post(
  "/vantex/send-code",
  paiementController.sendVerificationCode
);


/* ============================= */
/*  VERIFICATION DU CODE         */
/* ============================= */
router.post(
  "/vantex/verify-code",
   paiementController.verifyEmailCode
);

module.exports = router;