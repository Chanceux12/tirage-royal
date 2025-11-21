const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureVerified } = require('../middleware/authMiddleware');

router.get('/', ensureAuthenticated, ensureVerified, (req, res) => {
  res.render('dashboard', { user: req.user });
});

module.exports = router;
