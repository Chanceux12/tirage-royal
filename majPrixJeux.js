// majPrixJeux.js

require('dotenv').config();
const mongoose = require('mongoose');
const Jeu = require('./models/Jeu'); // ✅ Utilise le modèle central

// Connexion à la base MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tirage-royal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ Connecté à MongoDB');

    // 🔁 Exemple : mettre à jour le prix de tous les jeux
    const result = await Jeu.updateMany({}, { $set: { montant: 200 } });
    console.log(`✅ Mise à jour terminée : ${result.modifiedCount} jeux modifiés`);

    mongoose.disconnect(); // ✅ Fermer la connexion proprement
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB :', err);
  });
