require('dotenv').config();
const mongoose = require('mongoose');
const sendResultMail = require('./sendResultMail'); // Chemin vers ton fichier sendResultMail
const Tirage = require('../models/Tirage');

(async () => {
  try {
    // 1️⃣ Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connecté à MongoDB");

    // 2️⃣ Tirage spécifique (ID que tu as fourni)
    const tirageId = "690ba96456f64b30957c6c73";
    const tirage = await Tirage.findById(tirageId).populate('jeu');

    if (!tirage) return console.log("❌ Tirage introuvable");

    console.log(`📨 Envoi des emails pour le tirage : ${tirage._id} (${tirage.jeu.nom})`);

    // 3️⃣ Appel de sendResultMail pour ce tirage
    // ✅ IMPORTANT : assure-toi que sendResultMail ne filtre plus sur "statut: En attente"
    await sendResultMail(tirageId);

    console.log("🎉 Tous les emails pour ce tirage ont été envoyés !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", err);
    process.exit(1);
  }
})();
