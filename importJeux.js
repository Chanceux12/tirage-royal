const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Jeu = require('./models/Jeu');

const MONGODB_URI = 'mongodb://localhost:27017/tirage-royal';

async function importerJeux() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const filePath = path.join(__dirname, 'data/jeux.json');
    const jeuxData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!Array.isArray(jeuxData)) {
      throw new Error('❌ Le fichier data/jeux.json ne contient pas un tableau de jeux.');
    }

    await Jeu.deleteMany({});
    console.log('🗑️ Collection "jeux" vidée');

    const jeuxFinal = jeuxData.map(j => ({
      nom: j.nom,
      slug: j.slug,
      image: j.image || 'default.jpg',
      description: j.description || '',
      montant: Number(j.montant) || 2,
      recompense: Number(j.recompense) || 1000,
      archive: j.archive || false
    }));

    await Jeu.insertMany(jeuxFinal);
    console.log('🚀 Import terminé : tous les jeux ont été importés avec leur prix et récompense depuis data/jeux.json');

    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  } catch (err) {
    console.error('❌ Erreur lors de l\'import des jeux :', err.message);
  }
}

importerJeux();
