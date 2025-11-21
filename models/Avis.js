const mongoose = require('mongoose');

const avisSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  commentaire: { type: String, required: true },
  note: { type: Number, required: true, min: 1, max: 5 },
  photo: { type: String }, // <-- nouveau champ
  approuvé: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Avis', avisSchema);
