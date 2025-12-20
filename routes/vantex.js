const express = require("express");
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middlewares/auth');
const paiementController = require("../controllers/paiementController");
const EmailVerification = require("../models/EmailVerification");


// Multer pour gérer les fichiers en mémoire (compatible Vercel)
const storage = multer.memoryStorage();
const upload = multer({ storage });



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