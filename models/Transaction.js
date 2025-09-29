const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Type de transaction
  type: { 
    type: String, 
    enum: ['recharge', 'jeu', 'gain'], 
    required: true 
  },

  // Montant en euros
  amount: { type: Number, required: true },

  // Méthode de paiement (utile surtout pour recharge)
  methode: { 
    type: String, 
    enum: ['stripe', 'paypal', 'bonus', 'autre'], 
    default: 'autre' 
  },

  // Statut (important pour différencier paiement en attente, validé, refusé)
  status: { 
    type: String, 
    enum: ['en_attente', 'réussi', 'échoué'], 
    default: 'en_attente' 
  },

  // Référence externe (id Stripe session ou id PayPal order)
  reference: { type: String },

  // Description libre (ex: "Recharge via carte Visa", "Gain tirage #123")
  description: { type: String },

  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
