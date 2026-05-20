const nodemailer = require('nodemailer');

// Transporteur SMTP pour les e-mails "ticket"
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true, // ✅ true pour SSL sur le port 465
  auth: {
    user: 'support@tirageroyale.com', // ta nouvelle adresse
    pass: 'Chanceux12@',       // mot de passe SMTP exact
  },
});

// Fonction pour envoyer un e-mail avec cette adresse
async function sendTicketMail(to, subject, html) {
  try {
    // 🚨 SÉCURITÉ RADICALE : Si l'adresse de destination contient l'extension de test, on bloque l'envoi immédiatement !
    if (to && to.includes('@tirageroyale-test.com')) {
      console.log(`🚫 [BLOCAGE SIMULATION] Aucun e-mail envoyé à l'adresse fictive : ${to}`);
      return; // 👈 On arrête la fonction ici, Nodemailer n'est jamais déclenché
    }

    await transporter.sendMail({
      from: '"Tirage Royal - Tickets de Jeu" <support@tirageroyale.com>',
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