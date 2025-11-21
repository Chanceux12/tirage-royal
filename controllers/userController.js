const Transaction = require('../models/Transaction');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

// 🔐 Affichage du tableau de bord utilisateur
exports.showDashboard = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id, type: 'recharge' }).sort({ createdAt: -1 });
    const participations = await Ticket.find({ user: req.user._id }).sort({ dateParticipation: -1 });

    res.render('user/dashboard', {
      user: req.user,
      transactions,
      participations
    });
  } catch (err) {
    console.error('Erreur chargement dashboard :', err);
    res.status(500).send('Erreur serveur');
  }
};

// 📝 Afficher le formulaire de modification des infos personnelles
exports.showEditForm = (req, res) => {
  res.render('user/editProfile', { user: req.user, errors: null });
};

// ✅ Traiter la modification du profil utilisateur
exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, email } = req.body;

    if (!nom || !prenom || !email) {
      return res.render('user/editProfile', {
        user: req.body,
        errors: ['Tous les champs sont obligatoires.']
      });
    }

    const user = await User.findById(req.user._id);

    user.nom = nom;
    user.prenom = prenom;
    user.email = email;

    await user.save();

    req.flash('success_msg', 'Profil mis à jour avec succès.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erreur mise à jour profil :', error);
    res.render('user/editProfile', {
      user: req.body,
      errors: ['Une erreur est survenue, veuillez réessayer.']
    });
  }
};

exports.showTicketDetail = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user._id });

    if (!ticket) {
      req.flash('error_msg', 'Ticket introuvable');
      return res.redirect('/dashboard');
    }

    res.render('user/ticketDetail', { ticket });
  } catch (err) {
    console.error('Erreur chargement ticket :', err);
    res.status(500).send('Erreur serveur');
  }
};

exports.downloadTicketPdf = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user._id });

    if (!ticket) {
      return res.status(404).send('Ticket introuvable');
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket_${ticket._id}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text('🎫 Tirage Royal – Ticket de jeu', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Jeu : ${ticket.jeu}`);
    doc.text(`Date de participation : ${ticket.dateParticipation.toLocaleDateString('fr-FR')}`);
    doc.text(`Numéros joués : ${ticket.numeros.join(', ')}`);
    doc.text(`Étoiles : ${ticket.etoiles.join(', ')}`);
    doc.text(`Statut : ${ticket.statut}`);
    doc.text(`Gain : ${ticket.gain ? ticket.gain.toFixed(2) + ' €' : '0.00 €'}`);

    doc.end();
  } catch (err) {
    console.error('Erreur PDF ticket :', err);
    res.status(500).send('Erreur lors de la génération du PDF.');
  }
};
