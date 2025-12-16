const nodemailer = require("nodemailer");

module.exports = async function sendVantexCode(email, code) {
  console.log("📧 Tentative d'envoi du code VANTEX vers :", email);

  const transporter = nodemailer.createTransport({
    host: process.env.VANTEX_EMAIL_HOST,
    port: parseInt(process.env.VANTEX_EMAIL_PORT || 465),
    secure: process.env.VANTEX_EMAIL_SECURE === "true",
    auth: {
      user: process.env.VANTEX_EMAIL_USER,
      pass: process.env.VANTEX_EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"VANTEX – Tirage Royal" <${process.env.VANTEX_EMAIL_USER}>`,
      to: email,
      subject: "Code de confirmation VANTEX",
      html: `
        <div style="font-family:Arial;max-width:600px;margin:auto">
          <h2 style="color:#0A9999">Confirmation de votre e-mail</h2>
          <p>Voici votre code de validation :</p>

          <div style="font-size:32px;font-weight:bold;text-align:center;letter-spacing:6px">
            ${code}
          </div>

          <p>⏳ Ce code expire dans <strong>2 minutes</strong>.</p>
          <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>

          <hr>
          <small>© Tirage Royal – VANTEX</small>
        </div>
      `
    });

    console.log("✅ Mail envoyé avec succès :", info.messageId);

  } catch (err) {
    console.error("❌ Erreur lors de l'envoi du mail :", err);
    throw err; // permet à paiementController.sendVerificationCode de retourner success:false
  }
};
