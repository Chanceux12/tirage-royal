const express = require('express');
const router = express.Router();

// Page vidéo : aide réinitialisation mot de passe
router.get('/reinitialiser-mot-de-passe/video', (req, res) => {
  res.render('public/reset-password-video');
});

module.exports = router;
