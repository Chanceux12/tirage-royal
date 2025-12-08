const express = require('express');  
const router = express.Router();
const User = require('../models/User');
const Retrait = require('../models/Retrait');
const { ensureAuthenticated } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/authMiddleware');
const sendMail = require('../utils/sendMail');
const VantexRequest = require("../models/VantexRequest");


// ✅ Route pour afficher la page des utilisateurs à approuver
router.get('/approvals', ensureAuthenticated,isAdmin, async (req, res) => {
  const users = await User.find({});
  res.render('admin/approvals', {
    users,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// ✅ Route pour approuver un utilisateur + envoi automatique d’un mail
router.post('/approve/:id', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin/approvals');
    }

    // ✅ Envoi du mail d’approbation
    const message = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compte approuvé</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin:0; padding:0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
          .header { text-align: center; padding-bottom: 20px; }
          .header img { max-width: 150px; }
          h2 { color: #080032; }
          p { color: #333333; font-size: 16px; line-height: 1.5; }
          .button { display: inline-block; padding: 10px 20px; background-color: #080032; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { font-size: 12px; color: #888888; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://tirage-royal.com/image/logo.png" alt="Tirage Royal">
          </div>
          <h2>Votre compte a été approuvé 🎉</h2>
          <p>Bonjour ${user.nom || user.username},</p>
          <p>Bonne nouvelle ! Votre compte sur <strong>Tirage Royal</strong> vient d’être validé. Vous pouvez désormais vous connecter et participer à nos tirages exclusifs.</p>
          <p><a href="https://tirage-royal.com/login" class="button">Se connecter</a></p>
          <p class="footer">Cet e-mail est envoyé automatiquement par Tirage Royal — ne pas répondre.</p>
        </div>
      </body>
      </html>
    `;

    await sendMail(user.email, 'Votre compte Tirage Royal est approuvé 🎉', message);

    req.flash('success', `Utilisateur ${user.email} approuvé et notification envoyée.`);
    res.redirect('/admin/approvals');
  } catch (err) {
    console.error('❌ Erreur lors de l’approbation :', err);
    req.flash('error', "Erreur lors de l’approbation de l’utilisateur.");
    res.redirect('/admin/approvals');
  }
});

// ✅ Route pour créditer un utilisateur
router.post('/crediter/:id', ensureAuthenticated,isAdmin, async (req, res) => {
  const userId = req.params.id;
  const montant = parseFloat(req.body.montant);

  if (isNaN(montant) || montant <= 0) {
    req.flash('error', 'Montant invalide.');
    return res.redirect('/admin/approvals');
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin/approvals');
    }

    user.solde += montant;
    await user.save();

    req.flash('success', `💰 ${montant} € crédités à ${user.username}`);
    res.redirect('/admin/approvals');
  } catch (err) {
    console.error(err);
    req.flash('error', "Erreur lors du crédit.");
    res.redirect('/admin/approvals');
  }
});


// Liste des retraits en attente
router.get('/retraits', ensureAuthenticated,isAdmin, async (req, res) => {
  try {
    const statutFilter = req.query.statut || ''; // valeur par défaut
    const query = statutFilter ? { statut: statutFilter } : {};
    const retraits = await Retrait.find(query).populate('user').sort({ createdAt: -1 });

    res.render('admin/retraits', {
      retraits,
      statut: statutFilter,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/admin');
  }
});


// Valider un retrait
router.post('/retraits/valider/:id', ensureAuthenticated,isAdmin, async (req, res) => {
  try {
    const retrait = await Retrait.findById(req.params.id).populate('user');
    if (!retrait) return res.redirect('/admin/retraits');

    // Vérifie que l'utilisateur a le solde suffisant
    if (retrait.user.solde < retrait.amount) {
      retrait.statut = 'échoué';
      await retrait.save();
      req.flash('error', `Solde insuffisant pour ${retrait.user.username}. Retrait refusé.`);
      return res.redirect('/admin/retraits');
    }

    // Déduire le solde
    retrait.user.solde -= retrait.amount;
    await retrait.user.save();

    // Statut réussi
    retrait.statut = 'réussi';
    await retrait.save();

    req.flash('success', `Retrait de ${retrait.user.username} validé.`);
    res.redirect('/admin/retraits');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/admin/retraits');
  }
});

// Refuser un retrait
router.post('/retraits/refuser/:id', ensureAuthenticated,isAdmin, async (req, res) => {
  try {
    await Retrait.findByIdAndUpdate(req.params.id, { statut: 'échoué' });
    req.flash('success', 'Retrait refusé avec succès.');
    res.redirect('/admin/retraits');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/admin/retraits');
  }
});











// Liste des demandes VANTEX en attente
router.get('/vantex', ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    const demandes = await VantexRequest.find().sort({ createdAt: -1 });
    res.render('admin/vantex', { demandes, success: req.flash('success'), error: req.flash('error') });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/admin');
  }
});



// Approuver une demande
router.post("/vantex/approve/:id", ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    await VantexRequest.findByIdAndUpdate(req.params.id, { status: "approuvé" });
    req.flash("success", "Demande approuvée !");
    res.redirect("/admin/vantex");
  } catch (err) {
    console.error(err);
    req.flash("error", "Erreur serveur.");
    res.redirect("/admin/vantex");
  }
});

// Refuser une demande
router.post("/vantex/refuse/:id", ensureAuthenticated, isAdmin, async (req, res) => {
  try {
    await VantexRequest.findByIdAndUpdate(req.params.id, { status: "refusé" });
    req.flash("success", "Demande refusée !");
    res.redirect("/admin/vantex");
  } catch (err) {
    console.error(err);
    req.flash("error", "Erreur serveur.");
    res.redirect("/admin/vantex");
  }
});




module.exports = router; 