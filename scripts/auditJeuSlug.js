const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Tirage = require('../models/Tirage');

// 👉 Remplace par ton URI MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/tirage-royal';

async function auditJeuSlug() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connecté à MongoDB");

  // Vérifier les Tickets
  const tickets = await Ticket.find({});
  const ticketsInvalide = tickets.filter(t => !(t.jeuSlug instanceof mongoose.Types.ObjectId));

  // Vérifier les Tirages
  const tirages = await Tirage.find({});
  const tiragesInvalide = tirages.filter(t => !(t.jeuSlug instanceof mongoose.Types.ObjectId));

  console.log("\n--- AUDIT DES CHAMPS `jeuSlug` ---");
  console.log(`🎟️ Tickets vérifiés : ${tickets.length}`);
  console.log(`❌ Tickets avec jeuSlug NON ObjectId : ${ticketsInvalide.length}`);
  console.log(`📦 Tirages vérifiés : ${tirages.length}`);
  console.log(`❌ Tirages avec jeuSlug NON ObjectId : ${tiragesInvalide.length}`);

  if (ticketsInvalide.length > 0) {
    console.log("\n❗ Tickets invalides (IDs):");
    ticketsInvalide.forEach(t => console.log(`- Ticket ${t._id}: jeuSlug=${t.jeuSlug}`));
  }

  if (tiragesInvalide.length > 0) {
    console.log("\n❗ Tirages invalides (IDs):");
    tiragesInvalide.forEach(t => console.log(`- Tirage ${t._id}: jeuSlug=${t.jeuSlug}`));
  }

  if (ticketsInvalide.length === 0 && tiragesInvalide.length === 0) {
    console.log("\n✅ Tous les champs `jeuSlug` sont valides (ObjectId)");
  }

  mongoose.disconnect();
}

auditJeuSlug();
