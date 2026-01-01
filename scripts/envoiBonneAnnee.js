require('dotenv').config(); 
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 🔹 Transport email Zoho
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT, // 465 pour SSL/TLS, 587 pour STARTTLS
  secure: true, // true si port 465, false si 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔹 Charger le HTML depuis le même dossier que le script
const htmlTemplate = fs.readFileSync(
  path.join(__dirname, 'emails/bonne-annee2026.html'),
  'utf8'
);


// 🔹 Remplacer les placeholders pour cet email
const htmlFinal = htmlTemplate
  .replace('{{prenom}}', 'Tirage')
  .replace('{{nom}}', 'Royal');

async function envoyerEmail() {
  try {
    await transporter.sendMail({
      from: `"Tirage Royale" <${process.env.EMAIL_USER}>`,
      to: 'tirageroyal033@gmail.com',
      subject: '🎉 Bonne année 2026 – Tirage Royale',
      html: htmlFinal
    });
    console.log('✅ Email envoyé à tirageroyal033@gmail.com');
  } catch (err) {
    console.error('❌ Erreur lors de l’envoi de l’email:', err.message);
  }
}

envoyerEmail();

