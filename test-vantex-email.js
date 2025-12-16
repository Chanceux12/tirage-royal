require("dotenv").config();
const nodemailer = require("nodemailer");

async function testEmail() {
  console.log("🚀 Test SMTP VANTEX démarré");

  console.log("ENV:", {
    host: process.env.VANTEX_EMAIL_HOST,
    port: process.env.VANTEX_EMAIL_PORT,
    user: process.env.VANTEX_EMAIL_USER,
    secure: process.env.VANTEX_EMAIL_SECURE
  });

  const transporter = nodemailer.createTransport({
    host: process.env.VANTEX_EMAIL_HOST,
    port: parseInt(process.env.VANTEX_EMAIL_PORT, 10),
    secure: process.env.VANTEX_EMAIL_SECURE === "true",
    auth: {
      user: process.env.VANTEX_EMAIL_USER,
      pass: process.env.VANTEX_EMAIL_PASS
    },
    logger: true,
    debug: true
  });

  try {
    const info = await transporter.sendMail({
      from: `"TEST VANTEX" <${process.env.VANTEX_EMAIL_USER}>`,
      to: process.env.VANTEX_EMAIL_USER, // envoi à toi-même
      subject: "✅ Test SMTP VANTEX",
      text: "Si tu reçois ce mail, le SMTP VANTEX fonctionne.",
      html: `
        <h2>Test SMTP VANTEX</h2>
        <p>Si tu lis ce message, le serveur mail fonctionne correctement.</p>
      `
    });

    console.log("✅ MAIL ENVOYÉ AVEC SUCCÈS");
    console.log("MessageId:", info.messageId);

  } catch (err) {
    console.error("❌ ERREUR SMTP :", err);
  }
}

testEmail();
