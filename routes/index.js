const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { isAuthenticated, isAdmin } = require('../middlewares/authMiddleware');
const User = require('../models/User');
const Jeu = require('../models/Jeu');
const Ticket = require('../models/Ticket');
const Tirage = require('../models/Tirage');

const paiementController = require('../controllers/paiementController');
const jeuController = require('../controllers/jeuController');
const homeController = require('../controllers/homeController');

// 📄 Charger les jeux depuis le fichier JSON
function chargerJeux() {
  const filePath = path.join(__dirname, '../data/jeux.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// 📍 Routes dans le bon ordre !!!!

router.get('/', homeController.afficherAccueil);

router.get('/jeux', async (req, res) => {
  try {
    const jeux = chargerJeux();
    for (let jeu of jeux) {
      const jeuEnBase = await Jeu.findOne({ slug: jeu.slug });
      if (jeuEnBase) {
        const tirage = await Tirage.findOne({
          jeu: jeuEnBase._id,
          dateTirage: { $gte: new Date() }
        }).sort({ dateTirage: 1 });
        jeu.prochainTirage = tirage ? tirage.dateTirage : null;
      } else {
        jeu.prochainTirage = null;
      }
    }
    res.render('pages/home', { jeux, user: req.user });
  } catch (err) {
    console.error('Erreur dans /jeux :', err);
    res.status(500).send('Erreur serveur');
  }
});

// 🔐 Espace admin
router.get('/admin', isAdmin, async (req, res) => {
  const utilisateurs = await User.find({ isApproved: false });
  res.render('admin', { utilisateurs });
});
router.post('/admin/valider/:id', isAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isApproved: true });
  res.redirect('/admin');
});

// 💳 Paiement
router.get('/recharge', isAuthenticated, paiementController.showRechargePage);
router.post('/paiement/stripe', isAuthenticated, paiementController.createStripeSession);
router.get('/paiement/success', isAuthenticated, paiementController.stripeSuccess);

// 🎮 Jouer
router.get('/jouer', jeuController.jouer);
router.get('/jeu/jouer', jeuController.jouerAvecTirages);
router.get('/comment-jouer', jeuController.commentJouer);

// ✅ Routes critiques (ordre important)
router.get('/jeu/mes-participations', isAuthenticated, jeuController.mesParticipations);
router.get('/jeu/resultats', isAuthenticated, jeuController.afficherTousLesResultats);

// 📅 Tirages (admin)
router.get('/admin/tirage/create', isAdmin, async (req, res) => {
  try {
    const jeux = await Jeu.find(); 
    res.render('pages/admin-tirage-create', {
      jeux,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Erreur récupération jeux:', err);
    req.flash('error', 'Erreur chargement des jeux.');
    res.redirect('/admin');
  }
});

router.post('/admin/tirage/create', isAdmin, async (req, res) => {
  try {
    const { jeu, numerosGagnants, dateTirage, gain } = req.body;
    const jeuObj = await Jeu.findById(jeu);
    if (!jeuObj) {
      req.flash('error', '❌ Jeu introuvable.');
      return res.redirect('/admin/tirage/create');
    }

    const existe = await Tirage.findOne({ jeu: jeuObj._id, resultatPublie: false });
    if (existe) {
      req.flash('error', '⚠️ Un tirage non publié existe déjà pour ce jeu.');
      return res.redirect('/admin/tirage/create');
    }

    await Tirage.create({
      jeu: jeuObj._id,
      numerosGagnants: numerosGagnants.split(',').map(n => parseInt(n.trim())),
      dateTirage: new Date(dateTirage),
      gain: parseInt(gain) || 100,
      resultatPublie: false
    });

    await Ticket.updateMany(
      { jeu: jeuObj._id, dateTirage: { $exists: false } },
      { $set: { dateTirage: new Date(dateTirage) } }
    );

    req.flash('success', '✅ Tirage planifié avec succès.');
    res.redirect('/admin/tirage/create');
  } catch (err) {
    console.error("❌ Erreur planification tirage :", err);
    req.flash('error', 'Erreur lors de la planification.');
    res.redirect('/admin/tirage/create');
  }
});

// rediriger /resultat vers /resultats
router.get('/jeu/:slug/resultat', (req, res) => {
  const { slug } = req.params;
  res.redirect(`/jeu/${slug}/resultats`);
});

// 🎯 Résultat d’un tirage pour un jeu donné
router.get('/jeu/:slug/resultats', isAuthenticated, async (req, res) => {
  const { slug } = req.params;

  try {
    const jeu = await Jeu.findOne({ slug });
    if (!jeu) {
      req.flash('error', 'Jeu introuvable.');
      return res.redirect('/jeu/mes-participations');
    }

    // 🔍 On récupère TOUS les tirages, peu importe resultatPublie
    const tirages = await Tirage.find({ jeu: jeu._id })
      .populate('jeu')
      .sort({ dateTirage: -1 });

    if (!tirages || tirages.length === 0) {
      req.flash('error', 'Aucun tirage disponible pour ce jeu.');
      return res.redirect('/jeu/mes-participations');
    }

    const resultats = [];

    for (const tirage of tirages) {
      // 🔍 On récupère TOUS les tickets pour ce tirage
      const tickets = await Ticket.find({
        jeu: jeu._id,
        dateTirage: tirage.dateTirage
      }).populate('user');

      const participants = tickets.map(ticket => ({
        username: ticket.user?.username || 'Utilisateur inconnu',
        numerosJoues: ticket.numerosChoisis,
        etoilesJouees: ticket.etoilesChoisies,
        statut: ticket.statut || 'en attente',
        prix: ticket.prix,
        gain: ticket.gainAttribué
      }));

      resultats.push({
        jeuNom: jeu.nom,
        jeuSlug: jeu.slug,
        jeuImage: jeu.image,
        dateTirage: tirage.dateTirage,
        numerosGagnants: tirage.numerosGagnants,
        etoilesGagnantes: tirage.etoilesGagnantes || [],
        gainTotal: tirage.gain,
        prix: jeu.montant || 0,
        resultatPublie: tirage.resultatPublie,
        participants
      });
    }

    res.render('pages/resultats', {
      resultats,
      user: req.user
    });

  } catch (err) {
    console.error("❌ Erreur chargement résultat :", err);
    req.flash('error', 'Erreur lors de l’affichage du résultat.');
    res.redirect('/jeu/mes-participations');
  }
});




// 📄 Archive des jeux
router.get('/jeux/archive', jeuController.archiveJeux);

// 🧩 Détail d’un jeu (⚠️ tout à la fin !)
router.get('/jeu/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const jeu = await Jeu.findOne({ slug });
    if (!jeu) {
      return res.status(404).send("Jeu introuvable.");
    }

    const tirage = await Tirage.findOne({
      jeu: jeu._id,
      dateTirage: { $gte: new Date() }
    }).sort({ dateTirage: 1 });

    console.log("🎯 Jeu trouvé:", jeu._id.toString());
    console.log("🎯 Tirage trouvé:", tirage);

    res.render('pages/jeu', {
      jeu,
      tirage,
      user: req.user,
      messages: req.flash()
    });
  } catch (err) {
    console.error("❌ Erreur dans /jeu/:slug :", err);
    res.status(500).send("Erreur interne du serveur");
  }
});


module.exports = router;



