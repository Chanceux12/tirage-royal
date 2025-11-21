const nodemailer = require('nodemailer');

// Configure le transporteur SMTP
const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com', // Remplace par ton serveur SMTP
    port:  587,                     // ou 465 si SSL
    secure: false,                 // true si port 465
    auth: {
        user: 'validation@tirage-royal.com', // Ton adresse e-mail d'envoi
        pass: 'Chanceux@'    // Le mot de passe SMTP
    }
});

// Fonction pour envoyer un e-mail
async function sendMail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: '"Tirage Royal" <validation@tirage-royal.com>',
            to,
            subject,
            html
        });
        console.log(`E-mail envoyé à ${to}`);
    } catch (err) {
        console.error('Erreur lors de l’envoi du mail :', err);
    }
}

module.exports = sendMail;
