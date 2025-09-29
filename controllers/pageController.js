const nodemailer = require("nodemailer"); 

exports.politiqueConfidentialite = (req, res) => {
  res.render('pages/politique-confidentialite', { 
    title: 'Politique de confidentialité',
    user: req.user || null
  });
};


exports.partenaires = (req, res) => {
  res.render('pages/partenaires', { 
    title: 'Partenaires',
    user: req.user || null
  });
};

exports.cookies = (req, res) => {
  res.render('pages/cookies', { 
    title: 'Cookies',
    user: req.user || null
  });
};

exports.siteOfficiel = (req, res) => {
  res.render('pages/site-officiel', { title: 'Site officiel', user: req.user || null });
};

exports.joueurs = (req, res) => {
  res.render('pages/joueurs', { title: 'Joueurs', user: req.user || null });
};

exports.detaillants = (req, res) => {
  res.render('pages/detaillants', { title: 'Détaillants', user: req.user || null });
};

exports.candidats = (req, res) => {
  res.render('pages/candidats', { title: 'Candidats', user: req.user || null });
};

exports.journalistes = (req, res) => {
  res.render('pages/journalistes', { title: 'Journalistes', user: req.user || null });
};

exports.groupe = (req, res) => {
  res.render('pages/groupe', { title: 'Groupe', user: req.user || null });
};

exports.fondation = (req, res) => {
  res.render('pages/fondation', { title: 'Fondation', user: req.user || null });
};

exports.contact = (req, res) => { 
  res.render("pages/contact", { 
    title: "Contact",
    user: req.user || null,
    message: null,
    messageType: null,
    formData: { nom:'', email:'', objet:'', message:'' }
  });
};

exports.envoyerContact = async (req, res) => {
  const { nom, email, objet, message } = req.body || {};

  // 🔒 Vérification des champs
  if (!nom || !email || !objet || !message) {
    return res.render("pages/contact", {
      title: "Contact",
      user: req.user || null,
      message: "Veuillez remplir tous les champs.",
      messageType: "error",
      formData: { nom, email, objet, message }
    });
  }

  try {
    let transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
      }
    });

    await transporter.sendMail({
      from: `"${nom}" <${email}>`,
      to: process.env.EMAIL_USER,
      subject: objet,
      html: `
        <p><strong>Nom :</strong> ${nom}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Objet :</strong> ${objet}</p>
        <p><strong>Message :</strong><br>${message}</p>
      `
    });

    res.render("pages/contact", {
      title: "Contact",
      user: req.user || null,
      message: "Votre message a été envoyé avec succès.",
      messageType: "success",
      formData: { nom:'', email:'', objet:'', message:'' }
    });

  } catch (err) {
    console.error("❌ Erreur envoi mail :", err);
    res.render("pages/contact", {
      title: "Contact",
      user: req.user || null,
      message: "Une erreur est survenue, votre message n'a pas pu être envoyé.",
      messageType: "error",
      formData: { nom, email, objet, message }
    });
  }
};

exports.conditions = (req, res) => {
  res.render('pages/conditions', {
    title: 'Conditions d\'Utilisation',
    user: req.user || null
  });
};
