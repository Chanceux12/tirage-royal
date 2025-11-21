const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureAdmin } = require('../middleware/auth');

router.get('/admin/users', ensureAdmin, async (req, res) => {
  const users = await User.find();
  res.render('admin/users', { users });
});

router.post('/admin/users/validate/:id', ensureAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isVerified: true });
  res.redirect('/admin/users');
});

module.exports = router;       