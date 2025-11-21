const Tirage = require('../models/Tirage');
const Ticket = require('../models/Ticket');
const Jeu = require('../models/Jeu');
const moment = require('moment'); // npm install moment si pas déjà

exports.afficherGagnantsDuJour = async (req, res) => {
  try {
    // 1️⃣ Début et fin de la journée
    const debutJournee = moment().startOf('day').toDate();
    const finJournee = moment().endOf('day').toDate();

    // 2️⃣ Tirages du jour avec tickets gagnants
    const tiragesDuJour = await Tirage.find({
      dateTirage: { $gte: debutJournee, $lte: finJournee },
      resultatPublie: true
    })
      .populate('jeu')
      .sort({ dateTirage: -1 });

    // 3️⃣ Récupérer les tickets gagnants
    for (const tirage of tiragesDuJour) {
      tirage.tickets = await Ticket.find({ tirage: tirage._id, statut: 'Gagnant' })
        .populate('utilisateur'); // pour accéder aux étoiles
      tirage.tickets.forEach(ticket => {
        ticket.nombreGagnants = 1; // chaque ticket correspond à un gagnant (tu peux adapter si plusieurs)
      });
    }

    // 4️⃣ Rendu de la page
    res.render('pages/archive-gagnants', {
      tiragesDuJour,
      user: req.user
    });

  } catch (err) {
    console.error("❌ Erreur affichage gagnants du jour :", err);
    res.status(500).send("Erreur serveur");
  }
};
