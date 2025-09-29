const Avis = require('../models/Avis');

// ✅ Avis visibles par le public
exports.afficherAvis = async (req, res) => {
  try {
    const avis = await Avis.find({ approuvé: true }).sort({ date: -1 });
    res.render('pages/temoignages', { avis });
  } catch (err) {
    console.error("Erreur affichage des avis :", err);
    res.status(500).send("Erreur serveur");
  }
};

// ✅ Enregistrement d’un avis
exports.ajouterAvis = async (req, res) => {
  try {
    const { nom, commentaire, note, honeypot } = req.body;
    if (honeypot) return res.status(400).send("Spam détecté");

    const nouvelAvis = new Avis({ nom, commentaire, note });
    await nouvelAvis.save();
    res.redirect('/avis?merci=1');
  } catch (err) {
    console.error("Erreur ajout avis :", err);
    res.status(500).send("Erreur serveur");
  }
};

// ✅ Admin : liste des avis en attente
exports.afficherAdminAvis = async (req, res) => {
  try {
    const avis = await Avis.find().sort({ date: -1 });
    res.render('admin/avis', { avis });
  } catch (err) {
    res.status(500).send("Erreur serveur admin");
  }
};

// ✅ Admin : approuver un avis
exports.approuverAvis = async (req, res) => {
  try {
    await Avis.findByIdAndUpdate(req.params.id, { approuvé: true });
    res.redirect('/avis/admin');
  } catch (err) {
    res.status(500).send("Erreur serveur admin");
  }
};

// ✅ Admin : supprimer un avis
exports.supprimerAvis = async (req, res) => {
  try {
    await Avis.findByIdAndDelete(req.params.id);
    res.redirect('/avis/admin');
  } catch (err) {
    res.status(500).send("Erreur serveur admin");
  }
};

