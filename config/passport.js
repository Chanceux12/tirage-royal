const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function (passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await User.findOne({ email });

        if (!user) {
          console.log('❌ Utilisateur non trouvé:', email);
          return done(null, false, { message: 'Utilisateur non trouvé' });
        }

        // Vérifie que le compte est approuvé
        if (!user.isApproved) {
          console.log('⚠️ Compte en attente de validation:', email);
          return done(null, false, { message: 'Compte en attente de validation' });
        }

        // 🔑 Vérifie le mot de passe
        console.log('👉 Email trouvé:', email);
        console.log('Mot de passe reçu:', password);
        console.log('Hash stocké en base:', user.password);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Résultat bcrypt.compare:', isMatch);

        if (!isMatch) {
          return done(null, false, { message: 'Mot de passe incorrect' });
        }

        console.log('✅ Connexion réussie pour:', email);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
