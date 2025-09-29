// resetAdminPassword.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(
  'mongodb+srv://tirage-royal-Admin:Chanceux@tirage-royal-admin.6xsznqn.mongodb.net/tirage-royal?retryWrites=true&w=majority&tls=true'
);

async function resetPassword() {
  try {
    const email = 'tirageroyal033@gmail.com';  // identifiant de l'admin
    const newPassword = 'Chanceux@12';          // mot de passe provisoire

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Aucun admin trouvé avec cet email.');
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    console.log(`✅ Mot de passe réinitialisé avec succès ! Nouveau mot de passe : ${newPassword}`);
  } catch (err) {
    console.error('Erreur :', err);
  } finally {
    mongoose.disconnect();
  }
}

resetPassword();
