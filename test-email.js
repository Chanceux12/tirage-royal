require('dotenv').config();
const { sendResetPasswordCode } = require('./services/emailService');

async function testEmail() {
  try {
    console.log('🚀 Test envoi email Zoho...');

    await sendResetPasswordCode({
      to: 'tirageroyal033@gmail.com', // 🔴 mets TON email ici
      code: '123456'
    });

    console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS');
  } catch (error) {
    console.error('❌ ERREUR ENVOI EMAIL :');
    console.error(error.message);
    if (error.response) {
      console.error('Réponse SMTP :', error.response);
    }
  }
}

testEmail();
