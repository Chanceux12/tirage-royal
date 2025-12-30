// models/Retrait.js
const mongoose = require('mongoose');

const retraitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  date: {
    type: String,
    required: true
  },

  method: {
    type: String,
    required: true
  },

  currency: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  iban: {
    type: String,
    required: true
  },

  bic: {
    type: String,
    required: true
  },

  benef_name: {
    type: String,
    required: true
  },

  bank_name: {
    type: String,
    required: true
  },

  motif: {
    type: String,
    required: true
  },

  statut: {
    type: String,
    enum: ['en_attente', 'échoué', 'réussi'],
    default: 'en_attente'
  },
  
  raison: {
    type: String,  // 🔹 ajouter ce champ pour stocker la raison d'échec
    default: null
  },

  // 🔹 NOUVEAU – Ordre de virement bancaire (VANTEX)
  ordreVirement: {
    type: String,
    unique: true,
    sparse: true // évite conflit avec anciens retraits
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Retrait', retraitSchema);
