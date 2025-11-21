require('dotenv').config();
const mongoose = require('mongoose');
const sendResultMail = require('./sendResultMail'); // Chemin correct si ton fichier est dans utils/
const Tirage = require('../models/Tirage');

(async () => {
  try {
    // 1️⃣ Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");

    // 2️⃣ Trouver tous les tirages ayant un résultat publié
    const tirages = await Tirage.find({ resultatPublie: true });
    console.log(`🎯 ${tirages.length} tirages trouvés avec resultatPublie:true`);

    if (!tirages.length) {
      console.log("⚠️ Aucun tirage avec resultatPublie:true");
      process.exit(0);
    }

    // 3️⃣ Pour chaque tirage, on relance l'envoi
    for (const tirage of tirages) {
      console.log(`📨 Relance des emails pour le tirage : ${tirage._id} (${tirage.jeu})`);
      await sendResultMail(tirage._id);
      console.log(`✅ Emails envoyés pour le tirage ${tirage._id}`);
    }

    console.log("🎉 Tous les emails ont été traités.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", err);
    process.exit(1);
  }
})();
