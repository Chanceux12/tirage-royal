const mongoose = require('mongoose');  
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  parrainage: { type: String },
  password: { type: String, required: true },
  langue: { type: String, required: true },
  devise: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },

  // 💶 Nouveau champ solde
  solde: { type: Number, default: 0 },

  // ✅ Pièce d’identité
  pieceIdentite: { type: String },

  // Champs pour réinitialisation par token classique
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  // ✅ Champs pour code à 6 chiffres
  resetCode: String,
  resetCodeExpiration: Date
}, { timestamps: true });

// ✅ Middleware : hash du mot de passe avant sauvegarde, sauf s'il l'est déjà
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // 🔒 Vérifie si le mot de passe est déjà un hash bcrypt
  const isAlreadyHashed = /^\$2[aby]\$.{56}$/.test(this.password);
  if (isAlreadyHashed) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Méthode pour comparer le mot de passe lors de la connexion
userSchema.methods.comparePassword = async function (motDePasseClient) {
  return bcrypt.compare(motDePasseClient, this.password);
};

module.exports = mongoose.model('User', userSchema);
