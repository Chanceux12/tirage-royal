
const mongoose = require('mongoose');

const tirageSchema = new mongoose.Schema({
  jeu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Jeu',
    required: true
  },
  numerosGagnants: {
    type: [Number],
    required: true
  },
  dateTirage: {
    type: Date,
    required: true
  },
  resultatPublie: {
    type: Boolean,
    default: false
  },
  gain: {
    type: Number,
    default: 100
  },
  mailEnvoye: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Tirage', tirageSchema);
