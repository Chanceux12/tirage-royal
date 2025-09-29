console.log("✅ jeuController chargé correctement");
console.log("✅ Route mes-participations exécutée");

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Tirage = require('../models/Tirage');
const actualiserParticipations = require('../services/actualiserParticipations');
const Jeu = require('../models/Jeu');





exports.afficherAccueil = async (req, res) => {
  try {
    const jeux = await Jeu.find({ statut: /ouvert/i });

    const jeuxAvecTirage = [];

    for (const jeu of jeux) {
      const prochainTirage = await Tirage.findOne({
        jeu: jeu._id,
        dateTirage: { $gte: new Date() }
      }).sort({ dateTirage: 1 });

      jeuxAvecTirage.push({
        ...jeu.toObject(),
        prochainTirage: prochainTirage ? prochainTirage.dateTirage : null,
        billetsRestants: jeu.billetsRestants || 1000
      });
    }

    res.render('home', { jeux: jeuxAvecTirage, user: req.user });
  } catch (error) {
    console.error("Erreur dans homeController.afficherAccueil :", error);
    res.status(500).send("Erreur serveur");
  }
};




exports.accueil = async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const totalGagnants = await Ticket.countDocuments({ statut: 'gagnant' });
    const totalGains = await Ticket.aggregate([
      { $match: { statut: 'gagnant' } },
      { $group: { _id: null, total: { $sum: "$gain" } } }
    ]);
    const montantTotalGagne = totalGains[0]?.total || 0;

    const jeux = await Jeu.find({ statut: 'actif', resultatPublie: false });

    res.render('pages/home', {
      totalTickets,
      totalGagnants,
      montantTotalGagne,
      jeux
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur serveur');
  }
};





exports.commentJouer = async (req, res) => {
  try {
    const tiragesAVenir = await Tirage.find({ resultatPublie: false }).populate('jeu');

    const jeux = tiragesAVenir
      .map(t => t.jeu)
      .filter((jeu, index, self) => jeu && self.findIndex(j => j._id.equals(jeu._id)) === index);

    res.render('pages/comment-jouer', { jeux });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.jouer = async (req, res) => {
  try {
    const jeux = await Jeu.find({ statut: 'Ouvert' });

    const jeuxAvecTirage = await Promise.all(
      jeux.map(async (jeu) => {
        const prochainTirage = await Tirage.findOne({
          jeu: jeu._id,
          dateTirage: { $gte: new Date() }
        }).sort({ dateTirage: 1 });

        return {
          ...jeu.toObject(),
          prochainTirage: prochainTirage ? prochainTirage.dateTirage : null,
          billetsRestants: jeu.billetsRestants || 1000
        };
      })
    );

    res.render('pages/jouer', { jeux: jeuxAvecTirage });
  } catch (err) {
    console.error("Erreur dans le contrôleur 'jouer':", err);
    res.status(500).send("Erreur serveur");
  }
};

exports.jouerAvecTirages = async (req, res) => {
  try {
    const jeux = await Jeu.find({ statut: { $regex: /^ouvert$/i } });

    const jeuxAvecTirage = [];

    for (const jeu of jeux) {
      const prochainTirage = await Tirage.findOne({
        jeu: jeu._id,
        dateTirage: { $gte: new Date() }
      }).sort({ dateTirage: 1 });

      // ⚠️ On n'ajoute le jeu que s'il a un tirage à venir
      if (prochainTirage) {
        jeuxAvecTirage.push({
          ...jeu.toObject(),
          prochainTirage: prochainTirage.dateTirage,
          billetsRestants: jeu.billetsRestants || 1000
        });
      }
    }

    res.render('pages/jouer', { jeux: jeuxAvecTirage });
  } catch (err) {
    console.error("Erreur dans le contrôleur 'jouerAvecTirages':", err);
    res.status(500).send("Erreur serveur");
  }
};

exports.detailJeu = async (req, res) => {
  const slug = req.params.slug;

  try {
    const jeu = await Jeu.findOne({ slug });

    if (!jeu) return res.status(404).send('Jeu introuvable');

    const prochainTirage = await Tirage.findOne({
      jeu: jeu._id,
      dateTirage: { $gte: new Date() }
    }).sort({ dateTirage: 1 });

    res.render('pages/jeu', {
      jeu,
      tirage: prochainTirage || null,
      user: req.session.user,
      messages: req.flash()
    });

  } catch (err) {
    console.error('Erreur lors de la recherche du tirage :', err);
    res.status(500).send('Erreur interne du serveur.');
  }
};

exports.participerJeu = async (req, res) => {
  const slug = req.params.slug;

  try {
    const NUM_MIN = 1, NUM_MAX = 50;
    const ETOILE_MIN = 1, ETOILE_MAX = 12;

    let numeros = req.body.numeros || [];
    let etoiles = req.body.etoiles || [];

    if (!Array.isArray(numeros)) numeros = [numeros];
    if (!Array.isArray(etoiles)) etoiles = [etoiles];

    if (numeros.length !== 5 || etoiles.length !== 2) {
      req.flash('error_msg', 'Vous devez sélectionner exactement 5 numéros et 2 étoiles.');
      return res.redirect(`/jeu/${slug}`);
    }

    const numerosValides = numeros.every(n => {
      const num = Number(n);
      return Number.isInteger(num) && num >= NUM_MIN && num <= NUM_MAX;
    });
    const etoilesValides = etoiles.every(e => {
      const num = Number(e);
      return Number.isInteger(num) && num >= ETOILE_MIN && num <= ETOILE_MAX;
    });

    if (!numerosValides || !etoilesValides) {
      req.flash('error_msg', 'Numéros ou étoiles invalides.');
      return res.redirect(`/jeu/${slug}`);
    }

    const jeu = await Jeu.findOneAndUpdate(
      { slug, billetsRestants: { $gt: 0 } },
      { $inc: { billetsRestants: -1 } },
      { new: true }
    );

    if (!jeu) {
      req.flash('error_msg', 'Tous les billets ont été vendus pour ce jeu.');
      return res.redirect(`/jeu/${slug}`);
    }

    const prix = typeof jeu.montant === 'number' ? jeu.montant : (jeu.prix || 0);
    const user = await User.findById(req.user._id);

    if (user.solde < prix) {
      req.flash('error_msg', 'Solde insuffisant pour participer à ce jeu.');
      await Jeu.findByIdAndUpdate(jeu._id, { $inc: { billetsRestants: 1 } });
      return res.redirect(`/jeu/${slug}`);
    }

    const tirage = await Tirage.findOne({
      jeu: jeu._id,
      resultatPublie: false
    }).sort({ dateTirage: 1 });

    if (!tirage) {
      req.flash('error_msg', 'Aucun tirage planifié pour ce jeu actuellement.');
      await Jeu.findByIdAndUpdate(jeu._id, { $inc: { billetsRestants: 1 } });
      return res.redirect(`/jeu/${slug}`);
    }

    const ticket = new Ticket({
      user: user._id,
      jeu: jeu._id,
      tirage: tirage._id,
      prix,
      numerosChoisis: numeros.map(Number),
      etoilesChoisies: etoiles.map(Number),
      dateTirage: tirage.dateTirage,
      statut: 'En attente',
      gainPotentiel: tirage.gain || 0
    });

    await ticket.save();

    user.solde -= prix;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'jeu',
      amount: prix,
      description: `Participation au jeu ${jeu.nom}`,
      status: 'réussi'
    });

    if (jeu.billetsRestants <= 0) {
      jeu.statut = "Fermé";
    }
    await jeu.save();

    res.render('pages/confirmation', {
      ticket,
      jeu,
      numeros,
      etoiles,
      messages: req.flash()
    });

  } catch (err) {
    console.error("❌ ERREUR attrapée :", err);
    req.flash('error_msg', 'Une erreur est survenue.');
    res.redirect(`/jeu/${slug}`);
  }
};

exports.mesParticipations = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/auth/login');

    await actualiserParticipations(req.user._id);

       const filtre = { user: req.user._id };
        console.log("🔐 Utilisateur connecté :", req.user._id);

       if (req.query.statut) {
        filtre.statut = req.query.statut;
       }

       let tickets = await Ticket.find(filtre);
       console.log("🎟️ Tickets trouvés SANS populate :", tickets.length);

        tickets = await Ticket.find(filtre)
         .sort({ dateParticipation: -1 })
         .populate({ path: 'jeu', model: 'Jeu' });

      console.log("🎯 Tickets APRÈS populate :", tickets.length);

        tickets = tickets.filter(ticket => {
        if (!ticket.jeu || !ticket.jeu.nom) {
        console.warn("⚠️ Ticket sans jeu trouvé :", ticket._id);
         return false;
        }
        return true;
      });

    const participations = tickets.map(ticket => {
      const jeu = ticket.jeu;

      return {
        jeuNom: jeu.nom,
        jeuSlug: jeu.slug,
        dateTirage: ticket.dateTirage || ticket.dateParticipation,
        numerosChoisis: ticket.numerosChoisis,
        etoilesChoisies: ticket.etoilesChoisies,
        prix: ticket.prix,
        statut: ticket.statut,
        gainAttribué: ticket.gainAttribué || 0,
        gainPotentiel: ticket.gainPotentiel || 0,
        transfere: ticket.transfere || false
      };
    });

    const totalGagne = participations.reduce((total, p) => {
      return total + (
        p.statut === 'Gagnant' &&
        typeof p.gainAttribué === 'number' &&
        !p.transfere
          ? p.gainAttribué
          : 0
      );
    }, 0);

    res.render('pages/mes-participations', {
      participations,
      totalGagne,
      filtreStatut: req.query.statut || null,
      user: req.user,
      messages: req.flash()
    });

  } catch (err) {
    console.error("❌ ERREUR mesParticipations :", err);
    res.status(500).send("Erreur serveur");
  }
};

exports.afficherTousLesResultats = async (req, res) => {
  try {
    // On récupère tous les tirages actifs, publiés ou pas
    const tirages = await Tirage.find()
      .populate({ path: 'jeu', model: 'Jeu' })
      .sort({ dateTirage: -1 });

    const resultats = [];

    for (const tirage of tirages) {
      const jeu = tirage.jeu;

      if (!jeu) {
        console.warn(`⚠️ Jeu introuvable pour le tirage : ${tirage._id}`);
        continue;
      }

      // Recherche par tirage._id et jeu._id (plus sûr)
      const tickets = await Ticket.find({
           jeu: jeu._id,
           dateTirage: tirage.dateTirage
          }).populate('user');

      const participants = tickets.map(ticket => ({
        username: ticket.user?.username || 'Utilisateur inconnu',
        numerosJoues: ticket.numerosChoisis,
        etoilesJouees: ticket.etoilesChoisies,
        gain: ticket.gainAttribué || 0,
        prix: ticket.prix || 0,
        statut: ticket.statut || 'En attente'
      }));

      resultats.push({
        jeuNom: jeu.nom,
        jeuSlug: jeu.slug,
        jeuImage: jeu.image,
        dateTirage: tirage.dateTirage,
        numerosGagnants: tirage.resultatPublie ? tirage.numerosGagnants : null,
        etoilesGagnantes: tirage.resultatPublie ? tirage.etoilesGagnantes || [] : [],
        gainTotal: tirage.gain || 0,
        prix: jeu.montant || 0,
        resultatPublie: tirage.resultatPublie,
        participants
      });
    }

    res.render('pages/resultats', { resultats });
  } catch (error) {
    console.error("Erreur lors de l'affichage des résultats :", error);
    res.status(500).send('Erreur serveur');
  }
};


exports.transfertGains = async (req, res) => {
  try {
    const userId = req.user._id;

    const tickets = await Ticket.find({
      user: userId,
      statut: 'Gagnant',
      gainAttribué: { $gt: 0 },
      transfere: false
    });

    if (!tickets || tickets.length === 0) {
      req.flash('error_msg', 'Aucun gain à transférer ou déjà transféré.');
      return res.redirect('/jeu/mes-participations');
    }

    const totalGains = tickets.reduce((sum, t) => sum + (t.gainAttribué || 0), 0);

    if (totalGains === 0) {
      req.flash('error_msg', 'Aucun gain à transférer.');
      return res.redirect('/jeu/mes-participations');
    }

    const user = await User.findById(userId);
    user.solde += totalGains;
    await user.save();

    await Transaction.create({
      user: userId,
      type: 'gain',
      amount: totalGains,
      description: 'Transfert des gains vers le solde',
      status: 'réussi'
    });

    for (const ticket of tickets) {
      ticket.gainAttribué = 0;
      ticket.transfere = true;
      await ticket.save();
    }

    req.flash('success_msg', `💸 ${totalGains.toFixed(2)} € transférés vers votre solde.`);
    res.redirect('/jeu/mes-participations');

  } catch (err) {
    console.error("❌ Erreur transfert gains :", err);
    req.flash('error_msg', 'Erreur lors du transfert des gains.');
    res.redirect('/jeu/mes-participations');
  }
};

exports.archiveJeux = async (req, res) => {
  try {
    const tirages = await Tirage.find({ resultatPublie: true })
      .populate('jeu')
      .sort({ dateTirage: -1 });

    const resultatsParJeu = [];

    for (const tirage of tirages) {
      const tickets = await Ticket.find({
        jeu: tirage.jeu._id,
        dateTirage: tirage.dateTirage,
        statut: 'gagnant' // uniquement les gagnants
      }).populate('user');

      const participants = tickets.map(ticket => ({
        username: ticket.user?.username || 'Utilisateur inconnu',
        statut: ticket.statut,
        gain: ticket.gain || 0
      }));

      resultatsParJeu.push({
        jeu: tirage.jeu,
        tirage: {
          dateTirage: tirage.dateTirage,
          numerosGagnants: tirage.numerosGagnants,
          etoilesGagnantes: tirage.etoilesGagnantes || [],
          gainTotal: tirage.gain || 0,
          participants
        }
      });
    }

    res.render('pages/archives', {
      resultatsParJeu,
      user: req.user
    });
  } catch (err) {
    console.error("Erreur dans /jeux/archive :", err);
    res.status(500).send("Erreur serveur");
  }
};

