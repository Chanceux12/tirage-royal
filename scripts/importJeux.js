const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Jeu = require('../models/Jeu'); // Assure-toi que ce chemin est correct

const jeuxDataPath = path.join(__dirname, '../data/jeux.json');

async function importerJeux() {
  try {
    await mongoose.connect('mongodb://localhost:27017/tirage-royal', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connecté à MongoDB');

    // Suppression des anciens jeux
    await Jeu.deleteMany({});
    console.log('🗑️ Ancien jeux supprimés');

    // Lecture du fichier JSON
    const data = fs.readFileSync(jeuxDataPath, 'utf-8');
    const jeux = JSON.parse(data);

    // Ajout dans la base
    await Jeu.insertMany(jeux);
    console.log(`✅ ${jeux.length} jeux importés avec succès`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de l\'importation :', err);
    process.exit(1);
  }
}

importerJeux();
