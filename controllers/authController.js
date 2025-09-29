const bcrypt = require('bcryptjs');  
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 👉 Affiche le formulaire d'inscription
const showRegisterForm = (req, res) => {
  res.render('auth/register', {
    data: {},
    errors: {},
    message: null
  });
};

// 👉 Enregistre un utilisateur
const registerUser = async (req, res) => {
  const {
    nom, prenom, username, email, password,
    confirmPassword, parrainage, langue, devise, terms
  } = req.body;

  const data = req.body;
  const errors = {};

  // --- VALIDATIONS ---
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

  if (!req.file) errors.pieceIdentite = "Veuillez uploader votre pièce d'identité.";

  // Vérifie si l'email ou le username sont déjà utilisés
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

  try {
     
    const hashedPassword = await bcrypt.hash(password, 10);

    let pieceFilename = null;
    if (req.file) {
    pieceFilename = req.file.path; // ✅ Cloudinary renvoie l'URL du fichier
  }


    const newUser = new User({
      nom,
      prenom,
      username,
      email,
      password: hashedPassword,
      parrainage: parrainage || null,
      langue,
      devise,
      isApproved: false,
      isAdmin: false,
      pieceIdentite: pieceFilename
 
    });

    await newUser.save();
    return res.redirect('/login?message=waitApproval');
  } catch (err) {
    console.error(err);
    return res.status(500).render('auth/register', {
      data,
      errors: {},
      message: "Une erreur est survenue. Veuillez réessayer."
    });
  }
};

// 👉 Affiche le formulaire de connexion
const showLoginForm = (req, res) => {
  res.render('auth/login', {
    data: {},
    errors: {},
    query: req.query
  });
};

// 👉 Connexion de l'utilisateur (avec Passport)
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  const data = { email };
  const errors = {};

  if (!email || !password) {
    if (!email) errors.email = "L'adresse e-mail est requise.";
    if (!password) errors.password = "Le mot de passe est requis.";
    return res.status(422).render('auth/login', {
      data,
      errors,
      query: {}
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).render('auth/login', {
        data,
        errors: { email: "Aucun compte trouvé avec cet e-mail." },
        query: {}
      });
    }

    if (!user.isApproved) {
      return res.status(403).render('auth/login', {
        data,
        errors: { email: "Votre compte doit être approuvé par un administrateur." },
        query: {}
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).render('auth/login', {
        data,
        errors: { password: "Mot de passe incorrect." },
        query: {}
      });
    }

    // Connexion avec Passport (important pour garder req.user à jour)
    req.logIn(user, (err) => {
      if (err) return next(err);

      // Redirection après login vers l'URL initialement demandée ou vers /dashboard
      const redirectTo = req.session.redirectAfterLogin || '/dashboard';
      delete req.session.redirectAfterLogin;
      return res.redirect(redirectTo);
    });

  } catch (err) {
    console.error(err);
    return res.status(500).render('auth/login', {
      data,
      errors: {},
      query: {}
    });
  }
};

// 👉 Affiche le formulaire de réinitialisation du mot de passe
const showResetPasswordForm = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.render('auth/reset-password', {
        message: "Lien invalide ou utilisateur introuvable.",
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
  } catch (err) {
    return res.render('auth/reset-password', {
      message: "Lien expiré ou invalide. Veuillez refaire une demande.",
      messageType: "error",
      showForm: false
    });
  }
};

// 👉 Traite la soumission du nouveau mot de passe
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirm } = req.body;

  if (!password || password.length < 8) {
    return res.render('auth/reset-password', {
      token,
      message: "Le mot de passe doit contenir au moins 8 caractères.",
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.render('auth/reset-password', {
        message: "Utilisateur introuvable.",
        messageType: "error",
        showForm: false
      });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    return res.render('auth/reset-password', {
      message: "Mot de passe mis à jour avec succès !",
      messageType: "success",
      showForm: false
    });
  } catch (err) {
    return res.render('auth/reset-password', {
      message: "Lien expiré ou invalide. Veuillez refaire une demande.",
      messageType: "error",
      showForm: false
    });
  }
};

module.exports = {
  showRegisterForm,
  registerUser,
  showLoginForm,
  loginUser,
  showResetPasswordForm,
  resetPassword
};
