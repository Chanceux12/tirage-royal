const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Tirage = require('../models/Tirage');
const Jeu = require('../models/Jeu');

const MONGO_URI = 'mongodb://127.0.0.1:27017/tirage-royal';

async function corrigerJeuSlug() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connecté à MongoDB");

  // Corriger les tickets
  const tickets = await Ticket.find({});
  for (let ticket of tickets) {
    if (!(ticket.jeuSlug instanceof mongoose.Types.ObjectId)) {
      const jeu = await Jeu.findOne({ slug: ticket.jeuSlug });
      if (jeu) {
        console.log(`✅ Correction Ticket ${ticket._id}: ${ticket.jeuSlug} → ${jeu._id}`);
        ticket.jeuSlug = jeu._id;
        await ticket.save();
      } else {
        console.log(`❌ Ticket ${ticket._id} : jeu introuvable pour slug/id : ${ticket.jeuSlug}`);
      }
    }
  }

  // Corriger les tirages
  const tirages = await Tirage.find({});
  for (let tirage of tirages) {
    if (!(tirage.jeuSlug instanceof mongoose.Types.ObjectId)) {
      const jeu = await Jeu.findOne({ slug: tirage.jeuSlug });
      if (jeu) {
        console.log(`✅ Correction Tirage ${tirage._id}: ${tirage.jeuSlug} → ${jeu._id}`);
        tirage.jeuSlug = jeu._id;
        await tirage.save();
      } else {
        console.log(`❌ Tirage ${tirage._id} : jeu introuvable pour slug/id : ${tirage.jeuSlug}`);
      }
    }
  }

  console.log("\n🎉 Correction terminée.");
  mongoose.disconnect();
}

corrigerJeuSlug();
