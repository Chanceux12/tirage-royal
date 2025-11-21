const mongoose = require('mongoose');

const jeuSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true, 
    lowercase: true 
  },
  image: {
    type: String,
    default: 'default.jpg'
  },
  description: {
    type: String,
    default: ''
  },
  montant: {
    type: Number,
    default: 100
  },
  archive: {
    type: Boolean,
    default: false
  },
  billetsRestants: {
    type: Number,
    default: 100
  },
  statut: {
  type: String,
  enum: ['Ouvert', 'Fermé', 'Archivé'], 
  default: 'Ouvert'
},
  createdAt: {
    type: Date,
    default: Date.now
  },
  recompense: {
    type: Number,
    default: 1000
  }
});

module.exports = mongoose.model('Jeu', jeuSchema, 'jeux'); 



