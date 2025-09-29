// checkAdmin.js
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(
  'mongodb+srv://tirage-royal-Admin:Chanceux@tirage-royal-admin.6xsznqn.mongodb.net/tirage-royal?retryWrites=true&w=majority&tls=true'
);

async function check() {
  const user = await User.findOne({ email: 'tirageroyal033@gmail.com' });
  if (!user) {
    console.log('❌ Aucun admin trouvé');
  } else {
    console.log('✅ Admin trouvé :');
    console.log('email:', user.email);
    console.log('hash password:', user.password);
    console.log('isAdmin:', user.isAdmin);
    console.log('isApproved:', user.isApproved);
  }
  mongoose.disconnect();
}

check();
