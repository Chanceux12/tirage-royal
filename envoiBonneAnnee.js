require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const User = require('./models/User'); // Chemin vers ton User.js

// 🔹 Transport email Zoho avec les variables VALIDATION_EMAIL_*
const transporter = nodemailer.createTransport({
  host: process.env.VALIDATION_EMAIL_HOST,
  port: Number(process.env.VALIDATION_EMAIL_PORT),
  secure: process.env.VALIDATION_EMAIL_SECURE === 'true', // true si 465
  auth: {
    user: process.env.VALIDATION_EMAIL_USER,
    pass: process.env.VALIDATION_EMAIL_PASS
  }
});

// 🔹 Contenu HTML du mail
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bonne année 2026 - Tirage Royal</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td>
              <img src="https://tirageroyale.com/images/new-year-banner.png" 
                   alt="Bonne année Tirage Royal" 
                   style="width:100%;display:block;">
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:#333;">
              <h1 style="color:#d4af37;text-align:center;">🎉 Bonne année 2026 !</h1>
              <p>Chère {{prenom}} {{nom}},</p>
              <p>
                Toute l’équipe <strong>Tirage Royal</strong> vous remercie
                pour votre confiance.
              </p>
              <p>
                Cette nouvelle année arrive avec :
              </p>
              <ul>
                <li>🎁 De nouveaux jeux exclusifs</li>
                <li>💰 Des gains encore plus attractifs</li>
                <li>🔐 Une plateforme plus sécurisée</li>
              </ul>
              <p style="text-align:center;margin:30px 0;">
                <a href="https://tirageroyale.com"
                   style="background:#d4af37;color:#000;
                          padding:14px 24px;
                          text-decoration:none;
                          border-radius:5px;
                          font-weight:bold;">
                  Accéder au site
                </a>
              </p>
              <p>Nous vous souhaitons une année pleine de succès 🍀</p>
              <p>
                <strong>— L’équipe Tirage Royal</strong><br>
                <small>support@tirageroyale.com</small>
              </p>
            </td>
          </tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">
          © 2026 Tirage Royale – Tous droits réservés
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 🔹 Petite fonction pause
const delay = ms => new Promise(res => setTimeout(res, ms));

// 🔹 Fonction principale
async function envoyerEmails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    const users = await User.find({ email: { $exists: true } });
    console.log(`ℹ️ ${users.length} utilisateurs trouvés.`);

    for (const user of users) {
      const htmlFinal = htmlTemplate
        .replace('{{prenom}}', user.prenom)
        .replace('{{nom}}', user.nom);

      try {
        await transporter.sendMail({
          from: `"Tirage Royal" <${process.env.VALIDATION_EMAIL_USER}>`,
          to: user.email,
          subject: '🎉 Bonne année 2026 – Tirage Royal',
          html: htmlFinal
        });
        console.log(`✅ Email envoyé à ${user.email}`);
      } catch (err) {
        console.error(`❌ Erreur pour ${user.email} :`, err.message);
      }

      // Pause de 1,5s avant le prochain email
      await delay(1500);
    }

    console.log('✅ Tous les emails traités');
  } catch (err) {
    console.error('❌ Erreur globale :', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB déconnecté');
  }
}

envoyerEmails();



