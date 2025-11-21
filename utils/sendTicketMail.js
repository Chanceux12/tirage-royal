const nodemailer = require('nodemailer');

// Transporteur SMTP pour les e-mails "ticket"
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true, // ✅ true pour SSL sur le port 465
  auth: {
    user: 'validation@tirage-royal.com', // ta nouvelle adresse
    pass: 'Chanceux@',       // mot de passe SMTP exact
  },
});

// Fonction pour envoyer un e-mail avec cette adresse
async function sendTicketMail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: '"Tirage Royal - Tickets de Jeu" <validation@tirage-royal.com>',
      to,
      subject,
      html,
    });
    console.log(`🎟️ E-mail ticket envoyé à ${to}`);
  } catch (err) {
    console.error('❌ Erreur lors de l’envoi du mail ticket :', err);
  }
}

module.exports = sendTicketMail;
