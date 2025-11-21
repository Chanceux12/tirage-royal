// models/Retrait.js
const mongoose = require('mongoose');

const retraitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // référence à l'utilisateur
  date: { type: String, required: true }, // on gardera la date en format FR (string) pour affichage
  method: { type: String, required: true }, // ex: 'iban'
  currency: { type: String, required: true }, // ex: 'EUR'
  amount: { type: Number, required: true }, // montant en unité décimale
  iban: { type: String, required: true },
  bic: { type: String, required: true },
  benef_name: { type: String, required: true },
  bank_name: { type: String, required: true },
  motif: { type: String, required: true },
  statut: { type: String, enum: ['en_attente', 'échoué', 'réussi'], default: 'en_attente' }
}, { timestamps: true });

module.exports = mongoose.model('Retrait', retraitSchema);
