
// createAdmin.js
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(
  'mongodb+srv://tirage-royal-Admin:Chanceux@tirage-royal-admin.6xsznqn.mongodb.net/tirage-royal?retryWrites=true&w=majority&tls=true',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

async function createAdmin() {
  try {
    const admin = new User({
      nom: 'Admin',
      prenom: 'Principal',
      username: 'admin',
      email: 'tirageroyal033@gmail.com',
      password: 'Chanceux@12', // mot de passe en clair (sera hashé automatiquement par User.js)
      langue: 'fr',
      devise: 'EUR',
      isAdmin: true,
      isApproved: true
    });

    await admin.save();
    console.log('✅ Admin créé avec succès dans MongoDB Atlas !');
  } catch (err) {
    console.error('❌ Erreur lors de la création de l’admin :', err);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();

