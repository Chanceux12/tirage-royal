const nodemailer = require('nodemailer');
const Ticket = require('../models/Ticket');
const Tirage = require('../models/Tirage');
const User = require('../models/User');
const Jeu = require('../models/Jeu');




function comparerNumeros(gagnants, numerosJoues) {
  if (!gagnants || !numerosJoues) return false;
  if (gagnants.length !== numerosJoues.length) return false;
  const sortedGagnants = [...gagnants].sort((a, b) => a - b);
  const sortedJoues = [...numerosJoues].sort((a, b) => a - b);
  return sortedGagnants.every((num, i) => num === sortedJoues[i]);
}

module.exports = async function sendResultMail(tirageId) {
  try {
    const tirage = await Tirage.findById(tirageId).populate('jeu');
    if (!tirage) return console.log("❌ Tirage introuvable pour l'envoi d'email.");

    const tickets = await Ticket.find({
  jeu: tirage.jeu,
  dateTirage: tirage.dateTirage
}).populate('user');

if (!tickets.length) {
  // Si aucun trouvé par date exacte, on tente sans la date (au cas où légère différence)
  const ticketsSansDate = await Ticket.find({ jeu: tirage.jeu }).populate('user');
  if (ticketsSansDate.length) {
    console.log(`⚠️ ${ticketsSansDate.length} tickets trouvés sans correspondance exacte de date pour ${tirage._id}`);
    tickets.push(...ticketsSansDate);
  }
}


    if (!tickets.length) return console.log("⚠️ Aucun ticket trouvé pour ce tirage.");

    const transporter = nodemailer.createTransport({
      host: process.env.VALIDATION_EMAIL_HOST,
      port: process.env.VALIDATION_EMAIL_PORT,
      secure: process.env.VALIDATION_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.VALIDATION_EMAIL_USER,
        pass: process.env.VALIDATION_EMAIL_PASS
      }
    });

    for (const ticket of tickets) {
      const user = ticket.user;
      if (!user?.email) continue;

      const estGagnant = comparerNumeros(tirage.numerosGagnants, ticket.numerosChoisis);
      const sujet = estGagnant
        ? `🏆 Félicitations ${user.username} ! Tirage ${tirage.jeu.nom}`
        : `🎯 Résultats du tirage ${tirage.jeu.nom}`;

      const logoUrl = "https://tirageroyale.com/image/logo.png";

      const formatBulle = (nums, color="#080032") => {
        return nums.map(n => `
          <span style="
            display:inline-block;
            background:${color};
            color:white;
            font-weight:bold;
            border-radius:50%;
            width:38px;
            height:38px;
            line-height:38px;
            text-align:center;
            margin:3px;
            font-size:16px;
          ">${n}</span>
        `).join('');
      };

      const messageHTML = `
      <div style="font-family:Arial,sans-serif; background:#f4f4f4; padding:20px;">
        <div style="background:white; border-radius:12px; padding:30px; max-width:600px; margin:auto; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          <!-- Logo -->
          <div style="text-align:center; margin-bottom:20px;">
            <img src="${logoUrl}" alt="Tirage Royal" style="width:140px; max-width:100%; height:auto;"/>
          </div>

          <!-- En-tête -->
          <h2 style="text-align:center; color:#080032;">🎲 Tirage Royal - Résultats</h2>

          <!-- Message principal -->
          <p style="font-size:16px;">Bonjour <strong>${user.username}</strong>,</p>
          <p style="font-size:15px;">Le tirage de <strong>${tirage.jeu.nom}</strong> est terminé !</p>

          <!-- Numéros joués -->
          <div style="margin:15px 0;">
            <p style="margin:5px 0;"><strong>🎟️ Vos numéros :</strong></p>
            <div style="display:flex; flex-wrap:wrap; justify-content:center;">${formatBulle(ticket.numerosChoisis)}</div>
            ${ticket.etoilesChoisies?.length ? `
            <p style="margin:5px 0;"><strong>⭐ Vos étoiles :</strong></p>
            <div style="display:flex; flex-wrap:wrap; justify-content:center;">${formatBulle(ticket.etoilesChoisies,"#ff9900")}</div>` : ''}
          </div>

          <!-- Numéros gagnants + gain potentiel -->
          <div style="margin:15px 0;">
            <p style="margin:5px 0;"><strong>🎯 Numéros gagnants :</strong></p>
            <div style="display:flex; flex-wrap:wrap; justify-content:center;">${formatBulle(tirage.numerosGagnants)}</div>
            <p style="margin-top:10px; font-size:15px;"><strong>💰 Gain potentiel :</strong> ${ticket.gainPotentiel.toLocaleString()} €</p>
          </div>

          ${
            estGagnant
            ? `<p style="margin-top:20px; color:green; font-weight:bold; font-size:16px;">
                 🎉 Félicitations ! 💰 Gain potentiel : ${ticket.gainPotentiel.toLocaleString()} €
               </p>
               <div style="text-align:center; margin-top:15px;">
                 <a href="https://tirageroyale.com/jeu/mes-participations"
                    style="display:inline-block; background:#080032; color:white; padding:14px 26px; border-radius:8px; text-decoration:none; font-weight:bold;">
                    🔗 Mes tickets
                 </a>
               </div>
               <p style="margin-top:20px; font-size:13px; color:#555;">
                 Pour plus d'infos, contactez l'administrateur : 
                 <a href="mailto:contact@tirageroyale.com">Email</a> | 
                 <a href="https://wa.me/+33774137061">WhatsApp</a>
               </p>`
            : `<p style="margin-top:20px; color:#555;">
                 La chance vous échappe cette fois, mais elle vous tend déjà la main à nouveau.
               </p>
               <div style="text-align:center; margin-top:15px;">
                 <a href="https://tirageroyale.com/jeu/jouer"
                    style="display:inline-block; background:#008000B3; color:#080032; padding:14px 26px; border-radius:8px; text-decoration:none; font-weight:bold;">
                    🎟️ Tentez à nouveau
                 </a>
               </div>`
          }

          <hr style="margin:25px 0; border:none; border-top:1px solid #ddd;"/>

          <p style="font-size:12px; color:#888; text-align:center;">
            Cet email automatique a été envoyé par <strong>Tirage Royal</strong>.<br/>
            Merci de ne pas répondre directement à ce message.
          </p>

        </div>
      </div>
      `;

      await transporter.sendMail({
        from: `"Tirage Royal - Résultats" <${process.env.VALIDATION_EMAIL_USER}>`,
        to: user.email,
        subject: sujet,
        html: messageHTML
      });

      console.log(`📩 Email envoyé à ${user.email} (${estGagnant ? 'GAGNANT' : 'Perdant'})`);
    }
  } catch (err) {
    console.error("❌ Erreur lors de l'envoi des emails :", err);
  }
};
