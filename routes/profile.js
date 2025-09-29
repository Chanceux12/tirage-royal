const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middlewares/auth'); // middleware pour protéger la route

// Page profil
router.get('/profil', ensureAuthenticated, (req, res) => {
  res.render('profil', { user: req.user });
});

module.exports = router;
