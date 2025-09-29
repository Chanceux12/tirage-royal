const express = require('express');  
const router = express.Router();
const User = require('../models/User');
const Retrait = require('../models/Retrait');
const { ensureAuthenticated } = require('../middlewares/auth');

// ✅ Route pour afficher la page des utilisateurs à approuver
router.get('/approvals', ensureAuthenticated, async (req, res) => {
  const users = await User.find({});
  res.render('admin/approvals', {
    users,
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// ✅ Route pour approuver un utilisateur
router.post('/approve/:id', ensureAuthenticated, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isApproved: true });
  req.flash('success', 'Utilisateur approuvé avec succès.');
  res.redirect('/admin/approvals');
});

// ✅ Route pour créditer un utilisateur
router.post('/crediter/:id', ensureAuthenticated, async (req, res) => {
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
router.get('/retraits', ensureAuthenticated, async (req, res) => {
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
router.post('/retraits/valider/:id', ensureAuthenticated, async (req, res) => {
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
router.post('/retraits/refuser/:id', ensureAuthenticated, async (req, res) => {
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



module.exports = router; 