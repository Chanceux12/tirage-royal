const cron = require('node-cron');
const Tirage = require('./models/Tirage');
const Ticket = require('./models/Ticket');
const User = require('./models/User');
const mongoose = require('mongoose');

// 🔍 Compare deux tableaux triés de numéros
function comparerNumeros(gagnants, numerosJoues) {
  if (!Array.isArray(gagnants) || !Array.isArray(numerosJoues)) return false;
  if (gagnants.length !== numerosJoues.length) return false;

  const sortedGagnants = [...gagnants].sort((a, b) => a - b);
  const sortedJoues = [...numerosJoues].sort((a, b) => a - b);

  return sortedGagnants.every((num, i) => num === sortedJoues[i]);
}

function startScheduler() {
  console.log('⏰ Cron de tirage démarré');

  // 🔁 Exécution chaque minute
  cron.schedule('* * * * *', async () => {
    console.log('🕒 Vérification des tirages à exécuter...');
    const now = new Date();

    try {
      const tirages = await Tirage.find({
        dateTirage: { $lte: now },
        resultatPublie: false
      }).populate('jeu');

      if (tirages.length === 0) {
        console.log('⏳ Aucun tirage à traiter pour le moment.');
        return;
      }

      for (const tirage of tirages) {
        console.log(`🎰 Traitement du tirage ${tirage._id} pour le jeu : ${tirage.jeu?.nom || 'Inconnu'}`);

        const tickets = await Ticket.find({
          jeu: tirage.jeu,
          dateTirage: tirage.dateTirage,
          statut: 'En attente'
        });

        if (tickets.length === 0) {
          console.log(`⚠️ Aucun ticket trouvé pour le tirage ${tirage._id}.`);
        }

        for (const ticket of tickets) {
          const estGagnant = comparerNumeros(tirage.numerosGagnants, ticket.numerosChoisis);

          ticket.statut = estGagnant ? 'Gagnant' : 'Perdant';
          ticket.gainAttribué = estGagnant ? tirage.gain : 0;

          await ticket.save();

          if (estGagnant) {
            const user = await User.findById(ticket.user);
            console.log(`🏆 Ticket gagnant : ${ticket._id} - Joueur : ${user?.username || 'Inconnu'}`);
          }
        }

        // ✅ Publication des résultats
        tirage.resultatPublie = true;
        await tirage.save();

        // ✅ Envoi automatique des mails
        console.log(`📨 Envoi automatique des mails pour le tirage ${tirage._id}`);
        const sendResultMail = require('./utils/sendResultMail');
        await sendResultMail(tirage._id);

        console.log(`✅ Tirage ${tirage._id} terminé et résultats publiés.`);
      }

    } catch (err) {
      console.error('❌ Erreur lors de l\'exécution du cron des tirages :', err);
    }
  });
}

module.exports = startScheduler;
