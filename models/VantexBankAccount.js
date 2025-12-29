const mongoose = require('mongoose');

const VantexBankAccountSchema = new mongoose.Schema({
  bank_name: String,
  benef_name: String,
  iban: {
    type: String,
    unique: true,
    required: true
  },
  bic: {
    type: String,
    required: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VantexBankAccount', VantexBankAccountSchema);
