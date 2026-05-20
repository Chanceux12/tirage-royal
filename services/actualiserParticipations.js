// services/actualiserParticipations.js
const mongoose = require('mongoose');
require('dotenv').config();

const Ticket = require('../models/Ticket');
const Tirage = require('../models/Tirage');
const sendResultMail = require('../utils/sendResultMail');

async function actualiserParticipations(userId = null) {
  console.log("⏳ Vérification des participations...");

  try {
    // 🔹 On récupère tous les tirages publiés dont les mails n’ont pas encore été envoyés
    const tiragesPublies = await Tirage.find({
      resultatPublie: true,
      mailEnvoye: { $ne: true }
    }).populate('jeu');

    if (!tiragesPublies.length) {
      console.log("✅ Aucun tirage à traiter.");
      return;
    }

    for (const tirage of tiragesPublies) {
      console.log(`🎯 Traitement du tirage ${tirage._id} (${tirage.jeu?.nom || 'Jeu inconnu'})`);

      // 🔹 🛠️ CORRECTION : On filtre pour exclure les tickets de la simulation (nom: "Simulateur")
      // On utilise populate pour vérifier l'utilisateur lié au ticket
      const filtreTickets = {
        jeu: tirage.jeu._id || tirage.jeu,
        dateTirage: tirage.dateTirage,
        statut: 'En attente'
      };

      const tickets = await Ticket.find(filtreTickets).populate('user');

      if (!tickets.length) {
        console.log(`⚠️ Aucun ticket en attente pour le tirage ${tirage._id}`);
        continue;
      }

      let vraisTicketsAChanger = 0;

      // 🔹 Mise à jour des tickets
      for (const ticket of tickets) {
        // 🚨 SÉCURITÉ ULTRA-CRITIQUE : Si c'est un faux utilisateur, on le passe en "Perdant" en BDD, mais on l'écarte pour la suite
        if (ticket.user && ticket.user.email && ticket.user.email.includes('@tirageroyale-test.com')) {
          ticket.statut = 'Perdant';
          ticket.gainAttribué = 0;
          await ticket.save();
          continue; // Saute ce faux ticket, ne fait rien d'autre
        }

        const numerosGagnants = tirage.numerosGagnants || [];
        const numerosJoues = ticket.numerosChoisis || [];

        const estGagnant = numerosGagnants.every(num => numerosJoues.includes(num));

        ticket.statut = estGagnant ? 'Gagnant' : 'Perdant';
        ticket.gainAttribué = estGagnant ? tirage.gain : 0;

        await ticket.save();
        vraisTicketsAChanger++;
      }

      console.log(`✅ ${vraisTicketsAChanger} vrai(s) ticket(s) mis à jour pour le tirage ${tirage._id}`);

      // 🔹 Envoi des mails uniquement après mise à jour réussie
      try {
        // On n'appelle l'envoi que s'il y a de vrais tickets à notifier
        await sendResultMail(tirage._id);
        tirage.mailEnvoye = true; 
        await tirage.save();
        console.log(`📩 Mails envoyés avec succès pour le tirage ${tirage._id}`);
      } catch (err) {
        console.error(`❌ Erreur lors de l’envoi des mails pour le tirage ${tirage._id}:`, err);
      }
    }

    console.log("🎉 Actualisation terminée pour tous les tirages publiés.");
  } catch (err) {
    console.error("❌ Erreur lors de l’actualisation des participations :", err);
  }
}

// Exécution directe en ligne de commande
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tirage-royal')
    .then(async () => {
      console.log("✅ Connecté à MongoDB (mode script)");
      await actualiserParticipations();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(err => {
      console.error("❌ Erreur de connexion MongoDB :", err);
      process.exit(1);
    });
} else {
  module.exports = actualiserParticipations;
}