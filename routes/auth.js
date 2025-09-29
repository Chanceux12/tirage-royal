const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const authController = require('../controllers/authController');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const upload = require('../middlewares/uploadCloudinary');


const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/profil', ensureAuthenticated, (req, res) => {
  res.render('profil', { user: req.user });
});


// Middleware de validation inscription
const validateRegister = async (req, res, next) => {
  const {
    nom, prenom, username, email,
    password, confirmPassword,
    langue, devise, terms
  } = req.body;

  const errors = {};
  const data = req.body;

  if (!nom || nom.trim() === '') errors.nom = "Le nom est requis.";
  if (!prenom || prenom.trim() === '') errors.prenom = "Le prénom est requis.";
  if (!username || username.trim() === '') errors.username = "Le nom d'utilisateur est requis.";
  if (!email || email.trim() === '') {
    errors.email = "L'adresse e-mail est requise.";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Adresse e-mail invalide.";
  }
  if (!password || password.length < 8) errors.password = "Mot de passe trop court (min. 8 caractères).";
  if (password !== confirmPassword) errors.confirmPassword = "Les mots de passe ne correspondent pas.";
  if (!langue) errors.langue = "Veuillez choisir une langue.";
  if (!devise) errors.devise = "Veuillez choisir une devise.";
  if (!terms) errors.terms = "Vous devez accepter les conditions.";
// ✅ Validation obligatoire de la pièce d'identité
  if (!req.file) errors.pieceIdentite = "Veuillez uploader votre pièce d'identité.";

  const [existingEmail, existingUser] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ username })
  ]);
  if (existingEmail) errors.email = "Cette adresse e-mail est déjà utilisée.";
  if (existingUser) errors.username = "Ce nom d'utilisateur est déjà pris.";

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('auth/register', {
      data,
      errors,
      message: null
    });
  }

  next();
};

// Debug : liste les fichiers dans views/auth
router.get('/test-views', (req, res) => {
  const viewsPath = path.join(__dirname, '..', 'views', 'auth');
  fs.readdir(viewsPath, (err, files) => {
    if (err) return res.send('Erreur : ' + err.message);
    res.send('Fichiers dans views/auth : ' + files.join(', '));
  });
});

// Formulaires
router.get('/login', (req, res) => {
  let message = null;

  if (req.query.message === 'loginRequired') {
    message = "Veuillez vous connecter pour accéder à cette page.";
  } else if (req.query.message === 'waitApproval') {
    message = null;
  } else {
    message = req.query.message || (req.flash('error')?.[0] || null);
  }

  res.render('auth/login', {
    query: req.query || {},
    data: {},
    errors: {},
    message
  });
});

router.get('/register', (req, res) => {
  res.render('auth/register', {
    data: {},
    errors: {},
    message: null
  });
});

router.get('/en-attente', (req, res) => {
  res.render('auth/awaiting');
});

// Auth actions
router.post(
  '/register',
  upload.single('pieceIdentite'), // ← d’abord multer
  validateRegister,               // ← puis validation
  authController.registerUser
);



router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).render('auth/login', {
        query: {},
        data: { email: req.body.email },
        errors: {
          email: info?.message || 'Adresse e-mail ou mot de passe incorrect.',
          password: info?.message || 'Adresse e-mail ou mot de passe incorrect.'
        },
        message: info?.message || null
      });
    }

    if (!user.isApproved) {
      return res.redirect('/auth/login?message=waitApproval');
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success', 'Déconnecté avec succès.');
    res.redirect('/auth/login');
  });
});

// ---------------------
// 🔐 Réinitialisation mot de passe par code à 6 chiffres
// ---------------------

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tirageroyal033@gmail.com',
    pass: 'yzmz ylbi nqvh prvn'
  }
});

// 1. Formulaire mot de passe oublié
router.get('/mot-de-passe-oublie', (req, res) => {
  res.render('auth/forgot', { success: null, error: null });
});

// 2. Envoi du code
router.post('/mot-de-passe-oublie', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/forgot', {
        error: "Aucun compte trouvé avec cet email.",
        success: null
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpiration = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: 'tirage royal <no-reply@tirageroyal033.com>',
      to: email,
      subject: 'Code de réinitialisation',
      html: `<p>Voici votre code : <strong>${code}</strong> (valide 10 minutes)</p>`
    });

    res.render('auth/verify_code', {
      email,
      message: "Un code a été envoyé à votre email.",
      error: null
    });

  } catch (err) {
    console.error(err);
    res.render('auth/forgot', {
      error: "Erreur lors de l'envoi du code.",
      success: null
    });
  }
});

// 3. Vérification du code
router.post('/verifier-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.resetCode !== code || Date.now() > user.resetCodeExpiration) {
      return res.render('auth/verify_code', {
        email,
        message: null,
        error: "Code invalide ou expiré."
      });
    }

    res.render('auth/reset_password', {
      email: req.body.email,
      code: req.body.code,
      message: 'Votre code est valide, veuillez saisir un nouveau mot de passe.',
      messageType: 'success',
      showForm: true
    });



  } catch (err) {
    console.error(err);
    res.render('auth/verify_code', {
      email,
      message: null,
      error: "Erreur lors de la vérification."
    });
  }
});

// 4. Changement du mot de passe
router.post('/reset-password', async (req, res) => {
  const { email, code, password, confirmPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.resetCode !== code || Date.now() > user.resetCodeExpiration) {
      return res.render('auth/reset_password', {
        email,
        code,
        error: "Code expiré ou invalide."
      });
    }

    if (password !== confirmPassword) {
      return res.render('auth/reset_password', {
        email,
        code,
        error: "Les mots de passe ne correspondent pas."
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetCode = null;
    user.resetCodeExpiration = null;
    await user.save();

    res.redirect('/auth/login?message=Mot de passe modifié avec succès');

  } catch (err) {
    console.error(err);
    res.render('auth/reset_password', {
      email,
      code,
      error: "Erreur lors du changement de mot de passe."
    });
  }
});

module.exports = router;
