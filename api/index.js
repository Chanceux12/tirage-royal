// api/index.js
const app = require('../app');
const connectDB = require('../config/db');

// ⚡ Connexion MongoDB (une seule fois, pas à chaque requête)
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ Impossible de se connecter à MongoDB :", err);
  }
})();

// ✅ Export pour Vercel
module.exports = app;
