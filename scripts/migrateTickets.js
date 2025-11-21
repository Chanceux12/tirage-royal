// scripts/migrateTickets.js

const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Jeu = require('../models/Jeu');

// Connecte-toi à MongoDB (modifie si besoin)
mongoose.connect('mongodb://localhost:27017/tirage-royal', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function migrateTickets() {
  try {
    const tickets = await Ticket.find({ jeu: { $type: 'string' } }); // ancien format
    console.log(`🎯 ${tickets.length} tickets à corriger`);

    for (const ticket of tickets) {
      const jeu = await Jeu.findOne({ slug: ticket.jeu }); // jeu est un slug
      if (jeu) {
        ticket.jeu = jeu._id; // remplace par l'ObjectId
        await ticket.save();
        console.log(`✅ Ticket ${ticket._id} corrigé pour jeu ${jeu.nom}`);
      } else {
        console.warn(`⚠️ Jeu introuvable pour slug "${ticket.jeu}"`);
      }
    }

    console.log("✅ Migration terminée.");
    process.exit();
  } catch (err) {
    console.error("❌ Erreur :", err);
    process.exit(1);
  }
}

migrateTickets();
