const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jeu: { type: mongoose.Schema.Types.ObjectId, ref: 'Jeu', required: true }, 
  numerosChoisis: [Number],
  // 🔍 Ajout d'une clé d'empreinte textuelle ordonnée (ex: "1-2-3-4-5") pour le verrouillage strict
  combinaisonCle: { type: String, required: true },
  etoilesChoisies: [Number],
  prix: Number,
  dateParticipation: { type: Date, default: Date.now },
  dateTirage: { type: Date }, 
  gainPotentiel: { type: Number, default: 0 },
  gainAttribué: { type: Number, default: 0 },
  transfere: { type: Boolean, default: false },
  statut: {
    type: String,
    enum: ['En attente', 'Gagnant', 'Perdant'],
    default: 'En attente'
  }
});

// 🔥 UNICITÉ STRICTE : Un utilisateur ne peut pas avoir deux fois la même combinaisonClé pour un même tirage
ticketSchema.index({ tirage: 1, combinaisonCle: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);