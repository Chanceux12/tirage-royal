const fs = require('fs'); 
const path = require('path');
const Jeu = require('../models/Jeu');
const Tirage = require('../models/Tirage');
const Ticket = require('../models/Ticket'); 
const Avis = require('../models/Avis');

exports.afficherAccueil = async (req, res) => {
  try {
    const maintenant = new Date();
    const tiragesAVenir = await Tirage.find({ dateTirage: { $gte: maintenant } });
    const tousLesJeux = await Jeu.find({ statut: { $regex: /^ouvert$/i } });

    const jeuxAvecTirage = tousLesJeux.filter(j =>
      tiragesAVenir.find(t => t.jeu.toString() === j._id.toString())
    );

    jeuxAvecTirage.forEach(j => {
      const tirage = tiragesAVenir.find(t => t.jeu.toString() === j._id.toString());
      j.prochainTirage = tirage?.dateTirage;
    });

    const tiragesPasses = await Tirage.find({ resultatPublie: true })
      .sort({ dateTirage: -1 })
      .limit(10);

    const avis = await Avis.find({ approuvé: true }).sort({ date: -1 }).limit(6);


    const baseGains = 10_000_000_000;
    const baseGagnants = 875_000;
    const baseTickets = 5_664_324;
    
    const totalTickets = await Ticket.countDocuments();
    const totalGagnants = await Ticket.countDocuments({ statut: 'gagnant' });

    const totalGains = await Ticket.aggregate([
      { $match: { statut: 'gagnant' } },
      { $group: { _id: null, total: { $sum: "$gain" } } }
    ]);
    const montantTotalGagne = totalGains[0]?.total || 0;

    res.render('pages/home', {
      jeux: jeuxAvecTirage,
      tiragesPasses,
      avis,
      totalTickets: baseTickets + totalTickets,
      totalGagnants: baseGagnants + totalGagnants,
      montantTotalGagne: baseGains + montantTotalGagne,
      user: req.user
    });
  } catch (err) {
    console.error("Erreur page accueil :", err);
    res.status(500).send("Erreur serveur");
  }
};
