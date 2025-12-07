// routes/vantex.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const VantexRequest = require("../models/VantexRequest");

// multer memory storage (Vercel friendly)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

router.post("/paiement/vantex/submit", upload.fields([
  { name: "id_front", maxCount: 1 },
  { name: "id_back", maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      civility, firstname, lastname, email, phone,
      profession, country, region, street, city, zip
    } = req.body;

    const idFrontFile = req.files?.id_front?.[0];
    const idBackFile  = req.files?.id_back?.[0];

    const doc = new VantexRequest({
      civility, firstname, lastname, email, phone,
      profession, country, region, street, city, zip,
      id_front: idFrontFile ? idFrontFile.buffer.toString("base64") : null,
      id_front_mime: idFrontFile ? idFrontFile.mimetype : null,
      id_back: idBackFile ? idBackFile.buffer.toString("base64") : null,
      id_back_mime: idBackFile ? idBackFile.mimetype : null
    });

    await doc.save();

    // redirect où tu veux (merci page, etc.)
    return res.redirect("/merci");
  } catch (err) {
    console.error("VANTEX SUBMIT ERROR:", err);
    return res.status(500).send("Erreur lors de la soumission");
  }
});

module.exports = router;
