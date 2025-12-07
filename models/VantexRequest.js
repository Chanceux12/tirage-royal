const mongoose = require('mongoose');

const VantexRequestSchema = new mongoose.Schema({
  civility: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  profession: { type: String, required: true },
  country: { type: String, required: true },
  region: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  zip: { type: String, required: true },

  // fichiers d'identité en base64
  id_front: { type: String },
  id_front_mime: { type: String },
  id_back: { type: String },
  id_back_mime: { type: String },

  status: { type: String, default: "en attente" }, // en attente / approuvé / refusé
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VantexRequest', VantexRequestSchema);
