// controllers/homeController.js

const fs = require('fs');
const path = require('path');
const moment = require('moment'); // npm install moment
require('moment/locale/fr');
moment.locale('fr');

const Jeu = require('../models/Jeu');
const Tirage = require('../models/Tirage');
const Ticket = require('../models/Ticket');
const Avis = require('../models/Avis');

exports.afficherAccueil = async (req, res) => {
  try {
    const maintenant = new Date();

    // ✅ 1. Tirages à venir
    const tiragesAVenir = await Tirage.find({ dateTirage: { $gte: maintenant } });

    // ✅ 2. Jeux ouverts
    const tousLesJeux = await Jeu.find({ statut: { $regex: /^ouvert$/i } });

    // ✅ 3. Associer les jeux à leur tirage
    const jeuxAvecTirage = tousLesJeux.filter(j =>
      tiragesAVenir.find(t => t.jeu.toString() === j._id.toString())
    );

    for (const j of jeuxAvecTirage) {
      const tirage = tiragesAVenir.find(t => t.jeu.toString() === j._id.toString());
      j.prochainTirage = tirage?.dateTirage || null;

      if (tirage) {
        const tickets = await Ticket.find({ tirage: tirage._id });

        let totalGain = 0;
        for (const ticket of tickets) {
          if (ticket.statut === 'En attente') {
            totalGain += ticket.gainPotentiel || tirage.gain || 0;
          } else if (ticket.statut === 'Gagnant') {
            totalGain += ticket.gainAttribué || 0;
          }
        }

        j.recompense = totalGain > 0 ? totalGain : (tirage.gain || 0);
      } else {
        j.recompense = 0;
      }
    }

    // ✅ 4. Tirages passés
    const tiragesPasses = await Tirage.find({ resultatPublie: true })
      .sort({ dateTirage: -1 })
      .limit(10);

    // ✅ 5. Avis clients
    const avis = await Avis.find({ approuvé: true })
      .sort({ date: -1 })
      .limit(6);

    // ✅ 6. Statistiques globales
    const baseGains = 10_000_000_000;
    const baseGagnants = 875_000;
    const baseTickets = 5_664_324;

    const totalTickets = await Ticket.countDocuments();
    const totalGagnants = await Ticket.countDocuments({ statut: 'Gagnant' });

    const totalGainsAgg = await Ticket.aggregate([
      { $match: { statut: 'Gagnant' } },
      { $group: { _id: null, total: { $sum: "$gainAttribué" } } }
    ]);
    const montantTotalGagne = totalGainsAgg[0]?.total || 0;

    // ✅ 7. Tickets gagnants récents (du jour ou derniers tirages publiés)
    const ticketsGagnantsBruts = await Ticket.find({ statut: 'Gagnant' })
      .populate('jeu')
      .sort({ dateTirage: -1 })
      .limit(50);

    // ✅ Supprimer les doublons (même jeu + même tirage + même utilisateur)
    const ticketsGagnantsUniques = [];
    const dejaVu = new Set();

    for (const t of ticketsGagnantsBruts) {
      const cle = `${t.jeu?._id || ''}_${moment(t.dateTirage).format('YYYYMMDD')}_${t.utilisateur}`;
      if (!dejaVu.has(cle)) {
        dejaVu.add(cle);
        ticketsGagnantsUniques.push(t);
      }
    }

    // ✅ Calcul du nombre de gagnants par tirage ET par jeu (clé composite)
const gagnantsParTirage = {};

for (const t of ticketsGagnantsUniques) {
  const dateCle = moment(t.dateTirage).format('YYYY-MM-DD'); // ex: "2025-10-29"
  const jeuId = t.jeu?._id ? t.jeu._id.toString() : 'nogame';
  const cleComposite = `${jeuId}_${dateCle}`; // ex: "68ed..._2025-10-29"

  if (!gagnantsParTirage[cleComposite]) {
    const debut = moment(t.dateTirage).startOf('day').toDate();
    const fin = moment(t.dateTirage).endOf('day').toDate();

    const count = await Ticket.countDocuments({
      statut: 'Gagnant',
      jeu: t.jeu?._id,
      dateTirage: { $gte: debut, $lte: fin }
    });

    gagnantsParTirage[cleComposite] = count;
  }
}


    // ✅ On garde les 10 plus récents
    const ticketsGagnants = ticketsGagnantsUniques.slice(0, 10);

    // ✅ 8. Nombre total de gagnants du jour (stat globale)
    const debutJour = moment().startOf('day').toDate();
    const finJour = moment().endOf('day').toDate();

    const nombreGagnantsJour = await Ticket.countDocuments({
      statut: 'Gagnant',
      dateTirage: { $gte: debutJour, $lte: finJour }
    });

    // ✅ 9. Rendu final
    res.render('pages/home', {
      jeux: jeuxAvecTirage,
      tiragesPasses,
      ticketsGagnants,
      gagnantsParTirage,
      nombreGagnantsJour,
      avis,
      totalTickets: baseTickets + totalTickets,
      totalGagnants: baseGagnants + totalGagnants,
      montantTotalGagne: baseGains + montantTotalGagne,
      user: req.user,
      moment
    });

  } catch (err) {
    console.error("❌ Erreur page accueil :", err);
    res.status(500).send("Erreur serveur");
  }
};
