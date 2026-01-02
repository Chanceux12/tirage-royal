const nodemailer = require('nodemailer');

/**
 * 🔐 Transporteur EMAIL SÉCURITÉ
 * Utilisé pour :
 * - Mot de passe oublié
 * - Codes sensibles
 * - Actions critiques
 */
const validationTransporter = nodemailer.createTransport({
  host: process.env.VALIDATION_EMAIL_HOST,
  port: Number(process.env.VALIDATION_EMAIL_PORT),
  secure: process.env.VALIDATION_EMAIL_SECURE === 'true',
  auth: {
    user: process.env.VALIDATION_EMAIL_USER,
    pass: process.env.VALIDATION_EMAIL_PASS
  }
});

// Vérification SMTP au démarrage
validationTransporter.verify()
  .then(() => console.log('✅ SMTP VALIDATION prêt'))
  .catch(err => console.error('❌ SMTP VALIDATION erreur:', err));

/**
 * ✉️ Envoi du code de réinitialisation
 */
async function sendResetPasswordCode({ to, code }) {
  return validationTransporter.sendMail({
    from: `"Tirage Royale – Sécurité" <${process.env.VALIDATION_EMAIL_USER}>`,
    to,
    replyTo: process.env.VALIDATION_EMAIL_USER,
    subject: '🔐 Code de sécurité – Réinitialisation du mot de passe',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#111;color:#d4af37;padding:20px;text-align:center;">
              <h2 style="margin:0;">Tirage Royal</h2>
              <p style="margin:5px 0 0;font-size:13px;">Sécurité du compte</p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px;color:#333;">
              <p>Bonjour,</p>

              <p>
                Une demande de <strong>réinitialisation de mot de passe</strong>
                a été effectuée pour votre compte Tirage Royal.
              </p>

              <p style="margin:30px 0;text-align:center;">
                <span style="
                  display:inline-block;
                  background:#f1f1f1;
                  padding:18px 30px;
                  font-size:28px;
                  letter-spacing:6px;
                  font-weight:bold;
                  border-radius:6px;
                ">
                  ${code}
                </span>
              </p>

              <p>
                ⏱ <strong>Ce code est valable 10 minutes.</strong><br>
                Si vous n’êtes pas à l’origine de cette demande,
                veuillez ignorer cet email.
              </p>

              <p style="margin-top:30px;">
                Pour votre sécurité, ne partagez jamais ce code avec qui que ce soit.
              </p>

              <p style="margin-top:40px;">
                Cordialement,<br>
                <strong>L’équipe Tirage Royal</strong>
              </p>
            </td>
          </tr>
        </table>

        <p style="color:#999;font-size:12px;margin-top:20px;">
          © 2026 Tirage Royal – Sécurité & confidentialité
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`
  });
}

module.exports = {
  sendResetPasswordCode
};
