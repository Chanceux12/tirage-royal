const mongoose = require('mongoose');
require('dotenv').config();

const Ticket = require('../models/Ticket');
const Tirage = require('../models/Tirage');

async function actualiserParticipations(userId = null) {
  console.log("⏳ Vérification des participations...");

  try {
    const tiragesPublies = await Tirage.find({ resultatPublie: true });

    for (const tirage of tiragesPublies) {
      const filtreTickets = {
        jeu: tirage.jeu,
        dateTirage: tirage.dateTirage,
        statut: 'En attente'
      };

      if (userId) {
        filtreTickets.user = userId;
      }

      const tickets = await Ticket.find(filtreTickets);

      for (const ticket of tickets) {
        const numerosGagnants = tirage.numerosGagnants || [];
        const numerosJoues = ticket.numerosChoisis || [];

        const estGagnant = numerosGagnants.every(num => numerosJoues.includes(num));

        ticket.statut = estGagnant ? 'Gagnant' : 'Perdant';
        ticket.gainAttribué = estGagnant ? tirage.gain : 0;

        await ticket.save();
      }
    }

    console.log("✅ Participations mises à jour.");
  } catch (err) {
    console.error("❌ Erreur lors de l’actualisation des participations :", err);
  }
}

// 👉 Si exécuté en ligne de commande
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
  // 👉 Si importé dans app.js
  module.exports = actualiserParticipations;
}
