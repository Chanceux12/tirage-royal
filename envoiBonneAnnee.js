require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('./models/User'); // chemin vers ton modèle User

// 🔹 Paramètres d'envoi
const BATCH_SIZE = 20;     // nombre d'emails par batch
const PAUSE_MS = 1500;     // pause entre chaque batch (ms)

// 🔹 Transport email Zoho
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});


// 🔹 Fonction pour générer le HTML personnalisé
function generateEmailHTML(prenom, nom) {
  return `
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
                     alt="Bonne année Tirage Royale" 
                     style="width:100%;display:block;">
              </td>
            </tr>
            <tr>
              <td style="padding:30px;color:#333;">
                <h1 style="color:#d4af37;text-align:center;">
                  🎉 Bonne année 2026 !
                </h1>
                <p>Chère ${prenom} ${nom},</p>
                <p>Toute l’équipe <strong>Tirage Royale</strong> vous remercie pour votre confiance.</p>
                <p>Cette nouvelle année arrive avec :</p>
                <ul>
                  <li>🎁 De nouveaux jeux exclusifs</li>
                  <li>💰 Des gains encore plus attractifs</li>
                  <li>🔐 Une plateforme plus sécurisée</li>
                </ul>
                <p style="text-align:center;margin:30px 0;">
                  <a href="https://tirageroyale.com"
                     style="background:#d4af37;color:#000;padding:14px 24px;text-decoration:none;border-radius:5px;font-weight:bold;">
                    Accéder au site
                  </a>
                </p>
                <p>Nous vous souhaitons une année pleine de succès 🍀</p>
                <p><strong>— L’équipe Tirage Royale</strong><br><small>support@tirageroyale.com</small></p>
              </td>
            </tr>
          </table>
          <p style="color:#999;font-size:12px;margin-top:20px;">
            © 2026 Tirage Royal – Tous droits réservés
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

// 🔹 Fonction principale
async function envoyerEmails() {
  try {
    // 🔹 Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');

    // 🔹 Récupérer tous les utilisateurs avec email
    const users = await User.find({ email: { $exists: true } });
    console.log(`ℹ️ ${users.length} utilisateurs trouvés.`);

    // 🔹 Envoyer par batch
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (user) => {
        try {
          await transporter.sendMail({
            from: `"Tirage Royal" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: '🎉 Bonne année 2026 – Tirage Royal',
            html: generateEmailHTML(user.prenom, user.nom)
          });
          console.log(`✅ Email envoyé à ${user.email}`);
        } catch (err) {
          console.error(`❌ Erreur pour ${user.email} :`, err.message);
        }
      }));

      // 🔹 Pause avant le batch suivant
      if (i + BATCH_SIZE < users.length) {
        console.log(`⏸ Pause de ${PAUSE_MS / 1000}s avant le batch suivant...`);
        await new Promise(r => setTimeout(r, PAUSE_MS));
      }
    }

    // 🔹 Déconnexion
    await mongoose.disconnect();
    console.log('✅ Tous les emails envoyés, MongoDB déconnecté');

  } catch (err) {
    console.error('❌ Erreur globale :', err.message);
  }
}

// 🔹 Lancer l’envoi
envoyerEmails();

