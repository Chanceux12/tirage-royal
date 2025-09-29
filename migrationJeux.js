
const mongoose = require('mongoose');
require('dotenv').config();

const Ticket = require('./models/Ticket');
const Tirage = require('./models/Tirage');
const Jeu = require('./models/Jeu');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tirage-royal')
  .then(async () => {
    console.log('✅ Connecté à MongoDB');

    // 🎯 Migrer les tickets qui ont encore `jeu` sous forme de string (slug)
    const ticketsSlug = await Ticket.find({ jeu: { $type: 'string' } });
    for (const ticket of ticketsSlug) {
      const jeu = await Jeu.findOne({ slug: ticket.jeu });
      if (jeu) {
        ticket.jeu = jeu._id;
        await ticket.save();
        console.log(`✅ Ticket ${ticket._id} mis à jour avec jeu=${jeu._id}`);
      } else {
        console.warn(`❌ Jeu introuvable pour ticket ${ticket._id} avec slug=${ticket.jeu}`);
      }
    }

    // 🎯 Vérifier tous les tickets ont un ObjectId pour `jeu`
    const ticketsSansJeu = await Ticket.find({ jeu: { $exists: false } });
    for (const ticket of ticketsSansJeu) {
      console.warn(`⚠️ Ticket sans champ jeu : ${ticket._id}`);
    }

    // 🎯 Migrer les tirages qui ont encore `jeu` sous forme de string (slug)
    const tiragesSlug = await Tirage.find({ jeu: { $type: 'string' } });
    for (const tirage of tiragesSlug) {
      const jeu = await Jeu.findOne({ slug: tirage.jeu });
      if (jeu) {
        tirage.jeu = jeu._id;
        await tirage.save();
        console.log(`✅ Tirage ${tirage._id} mis à jour avec jeu=${jeu._id}`);
      } else {
        console.warn(`❌ Jeu introuvable pour tirage ${tirage._id} avec slug=${tirage.jeu}`);
      }
    }

    // ✅ Optionnel : publier tous les résultats pour affichage test
    await Tirage.updateMany({ resultatPublie: false }, { resultatPublie: true });
    console.log('📢 Tous les résultats ont été publiés pour les tests');

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion à MongoDB :', err);
  });
