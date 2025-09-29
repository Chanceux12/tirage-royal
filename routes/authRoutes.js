const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authController = require('../controllers/authController');

// ========== INSCRIPTION ==========
router.get('/register', authController.showRegisterForm);
router.post('/register', authController.registerUser);

// ========== CONNEXION ==========
router.get('/connexion', authController.showLoginForm);

// 🔐 Connexion via Passport
router.post('/connexion', passport.authenticate('local', {
  failureRedirect: '/connexion',
  failureFlash: true
}), (req, res) => {
  const redirectTo = req.session.returnTo || '/';
  delete req.session.returnTo;
  res.redirect(redirectTo);
});

// ========== DÉCONNEXION ==========
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/connexion');
    });
  });
});

// ========== MOT DE PASSE OUBLIÉ ==========
router.get('/mot-de-passe-oublie', (req, res) => {
  res.render('auth/forgot-password', {
    message: null,
    messageType: ''
  });
});

router.post('/mot-de-passe-oublie', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.render('auth/forgot-password', {
      message: "Aucun compte trouvé avec cet e-mail.",
      messageType: "error"
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiration = Date.now() + 3600000;

  user.resetPasswordToken = token;
  user.resetPasswordExpires = expiration;
  await user.save();

  const resetLink = `http://localhost:3000/auth/reinitialiser-mot-de-passe/${token}`;
  console.log('🔗 Lien de réinitialisation généré :', resetLink);

  res.render('auth/forgot-password', {
    message: "Un lien de réinitialisation vous a été envoyé (simulation).",
    messageType: "success"
  });
});

// ========== RÉINITIALISATION ==========
router.get('/reinitialiser-mot-de-passe/:token', async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.render('auth/reset-password', {
      message: "Lien invalide ou expiré.",
      messageType: "error",
      showForm: false
    });
  }

  res.render('auth/reset-password', {
    token,
    message: null,
    messageType: null,
    showForm: true
  });
});

router.post('/reinitialiser-mot-de-passe/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirm } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.render('auth/reset-password', {
      message: "Lien invalide ou expiré.",
      messageType: "error",
      showForm: false
    });
  }

  if (!password || password.length < 6) {
    return res.render('auth/reset-password', {
      token,
      message: "Le mot de passe doit contenir au moins 6 caractères.",
      messageType: "error",
      showForm: true
    });
  }

  if (password !== confirm) {
    return res.render('auth/reset-password', {
      token,
      message: "Les mots de passe ne correspondent pas.",
      messageType: "error",
      showForm: true
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.render('auth/reset-password', {
    message: "✅ Votre mot de passe a été mis à jour avec succès !",
    messageType: "success",
    showForm: false
  });
});

module.exports = router;
