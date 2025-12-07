// models/VantexRequest.js
const mongoose = require("mongoose");

const VantexRequestSchema = new mongoose.Schema({
  civility: String,
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  profession: String,
  country: String,
  region: String,
  street: String,
  city: String,
  zip: String,

  // fichiers stockés en base64 (compatible Vercel)
  id_front: { type: String },       // base64 string
  id_front_mime: { type: String },  // image/jpeg, application/pdf, ...
  id_back: { type: String },
  id_back_mime: { type: String },

  status: { type: String, enum: ["en-attente","valider","rejeter"], default: "en-attente" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.VantexRequest || mongoose.model("VantexRequest", VantexRequestSchema);
