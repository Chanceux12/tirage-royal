// scripts/cleanupTickets.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
require('dotenv').config(); // si tu utilises .env pour MONGO_URI

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tirage-royal';

async function cleanupTickets() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const ticketsÀCorriger = await Ticket.find({
      $or: [
        { numeros: { $exists: false } },
        { etoiles: { $exists: false } },
        { numeros: { $not: { $type: 'array' } } },
        { etoiles: { $not: { $type: 'array' } } }
      ]
    });

    console.log(`🔧 Tickets à corriger : ${ticketsÀCorriger.length}`);

    for (const ticket of ticketsÀCorriger) {
      if (!Array.isArray(ticket.numeros)) {
        ticket.numeros = [];
      }
      if (!Array.isArray(ticket.etoiles)) {
        ticket.etoiles = [];
      }

      await ticket.save();
      console.log(`✅ Ticket corrigé : ${ticket._id}`);
    }

    console.log('✅ Nettoyage terminé.');
    process.exit();
  } catch (err) {
    console.error('❌ Erreur nettoyage :', err);
    process.exit(1);
  }
}

cleanupTickets();
