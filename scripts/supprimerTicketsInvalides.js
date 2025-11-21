// scripts/supprimerTicketsInvalides.js
require('dotenv').config();
const mongoose = require('mongoose');

// 🔁 Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connecté à MongoDB');
  supprimerTicketsInvalides();
})
.catch((err) => {
  console.error('Erreur de connexion à MongoDB:', err);
  process.exit(1);
});

const Ticket = require('../models/Ticket');
const Jeu = require('../models/Jeu');

async function supprimerTicketsInvalides() {
  try {
    console.log('🔍 Vérification des tickets invalides...');

    const tickets = await Ticket.find({});
    let totalSupprimes = 0;

    for (const ticket of tickets) {
      const jeuExiste = await Jeu.exists({ _id: ticket.jeu });
      if (!jeuExiste) {
        await Ticket.deleteOne({ _id: ticket._id });
        console.log(`🗑️ Ticket supprimé (jeu introuvable): ${ticket._id}`);
        totalSupprimes++;
      }
    }

    console.log(`✅ ${totalSupprimes} ticket(s) invalide(s) supprimé(s).`);
    process.exit();
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des tickets invalides:', error);
    process.exit(1);
  }
}
