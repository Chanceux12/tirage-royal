const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
const Jeu = require('./models/Jeu');

mongoose.connect('mongodb://localhost:27017/tirage-royal');

(async () => {
  try {
    const ticket = await Ticket.findOne().populate('jeu');
    
    if (!ticket) {
      console.log("❌ Aucun ticket trouvé.");
    } else {
      console.log("🎟️ Ticket trouvé :", ticket._id);
      if (ticket.jeu) {
        console.log("✅ Jeu associé :", ticket.jeu.nom);
      } else {
        console.warn("⚠️ ticket.jeu est null -> ObjectId invalide ? =>", ticket.jeu);
      }
    }
    process.exit();
  } catch (err) {
    console.error("❌ Erreur populate test :", err);
    process.exit(1);
  }
})();
