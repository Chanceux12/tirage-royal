// importJeux.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Chemin vers ton modèle Jeu
const Jeu = require('./models/Jeu'); // adapte le chemin si nécessaire

async function importJeux() {
  try {
    // Connexion à MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecté à MongoDB Atlas ✅');

    // Lecture du fichier data/jeux.json
    const jeuxData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data/jeux.json'), 'utf-8')
    );

    // Import ou mise à jour de chaque jeu selon le slug
    for (let jeu of jeuxData) {
      await Jeu.updateOne({ slug: jeu.slug }, jeu, { upsert: true });
    }

    console.log('Tous les jeux ont été importés avec succès ! 🎉');
  } catch (err) {
    console.error('Erreur lors de l’import des jeux :', err);
  } finally {
    mongoose.disconnect();
  }
}

// Exécuter le script
importJeux();
