// config/db.js
const mongoose = require('mongoose');

let isConnected;

async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = conn.connections[0].readyState;
    console.log('✅ Connecté à MongoDB Atlas');
  } catch (err) {
    console.error('❌ Erreur MongoDB :', err);
    throw err;
  }
}

module.exports = connectDB;

