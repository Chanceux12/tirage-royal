const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jeu: { type: mongoose.Schema.Types.ObjectId, ref: 'Jeu', required: true }, 
  numerosChoisis: [Number],
  etoilesChoisies: [Number],
  prix: Number,
  dateParticipation: { type: Date, default: Date.now },
  dateTirage: { type: Date }, 
  
  gainPotentiel: {
  type: Number,
  default: 0
},

  gainAttribué: { type: Number, default: 0 },
  transfere: { type: Boolean, default: false },
  statut: {
    type: String,
    enum: ['En attente', 'Gagnant', 'Perdant'],
    default: 'En attente'
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);
