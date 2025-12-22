const express = require("express");
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middlewares/auth');
const paiementController = require("../controllers/paiementController");
const EmailVerification = require("../models/EmailVerification");



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