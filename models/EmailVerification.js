const mongoose = require("mongoose");

const EmailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },

  code: {
    type: String,
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  },

  attempts: {
    type: Number,
    default: 0
  },

  blockedUntil: {
    type: Date,
    default: null
  }
});

/* Suppression automatique après expiration */
EmailVerificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports =
  mongoose.models.EmailVerification ||
  mongoose.model("EmailVerification", EmailVerificationSchema);
