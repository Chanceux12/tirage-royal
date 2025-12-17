require("dotenv").config();
const sendVantexCode = require("./services/sendVantexCode");

(async () => {
  try {
    console.log("🚀 Test SMTP VANTEX en cours...");

    const info = await sendVantexCode(
      "tirageroyal033@gmail.com",
      "123456"
    );

    console.log("✅ TEST RÉUSSI");
    console.log("📨 Message ID :", info.messageId);

    process.exit(0);
  } catch (err) {
    console.error("❌ TEST ÉCHOUÉ");
    console.error(err);
    process.exit(1);
  }
})();
