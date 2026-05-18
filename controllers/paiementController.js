const Retrait = require('../models/Retrait'); 
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const axios = require('axios'); // 🚀 Interconnexion API BPER
const nodemailer = require('nodemailer'); // 🚀 AJOUTÉ : Transport de notifications bancaires

// =====================
// Configuration du Transporteur Email (Flux Financiers)
// =====================
const paiementTransporter = nodemailer.createTransport({
  host: process.env.PAIEMENT_EMAIL_HOST,
  port: parseInt(process.env.PAIEMENT_EMAIL_PORT) || 465,
  secure: process.env.PAIEMENT_EMAIL_SECURE === 'true',
  auth: {
    user: process.env.PAIEMENT_EMAIL_USER,
    pass: process.env.PAIEMENT_EMAIL_PASS,
  },
});

// =====================
// Stripe
// =====================
const Stripe = require('stripe');
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Clé Stripe manquante ! Vérifie ton fichier .env');
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// =====================
// PayPal
// =====================
const paypal = require('@paypal/checkout-server-sdk');

function paypalClient() {
  let environment;
  if (process.env.PAYPAL_MODE === "live") {
    environment = new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );
  } else {
    environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );
  }
  return new paypal.core.PayPalHttpClient(environment);
}

// =====================
// Page Recharge
// =====================
exports.showRechargePage = (req, res) => {
  res.render('paiement/recharger', { user: req.user, messages: req.flash() });
};

// =====================
// Stripe : créer session
// =====================
exports.createStripeSession = async (req, res) => {
  const { amount } = req.body;
  const euros = parseFloat(amount);

  if (isNaN(euros) || euros <= 0) {
    req.flash('error', 'Montant invalide');
    return res.redirect('/paiement/recharger');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Recharge Tirage Royal' },
          unit_amount: Math.round(euros * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:3000/paiement/success?amount=${euros}`,
      cancel_url: `http://localhost:3000/paiement/cancel`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error('❌ Erreur Stripe :', error);
    req.flash('error', 'Erreur lors du paiement.');
    res.redirect('/paiement/recharger');
  }
};

// =====================
// Stripe : succès
// =====================
exports.stripeSuccess = async (req, res) => {
  const amount = parseFloat(req.query.amount);
  if (isNaN(amount) || amount <= 0) return res.redirect('/paiement/recharger');

  try {
    const user = await User.findById(req.user._id);
    user.solde += amount;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'recharge',
      amount,
      status: 'réussi',
      description: 'Recharge via Stripe',
    });

    res.render('paiement/success', { amount, user, method: "Stripe" });
  } catch (err) {
    console.error('Erreur solde:', err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/paiement/recharger');
  }
};

// =====================
// Stripe : cancel
// =====================
exports.stripeCancel = (req, res) => {
  res.render('paiement/cancel', { user: req.user, message: "Paiement Stripe annulé." });
};

// =====================
// PayPal : créer un paiement
// =====================
exports.createPaypalPayment = async (req, res) => {
  const { amount } = req.body;
  const euros = parseFloat(amount);

  if (isNaN(euros) || euros <= 0) {
    req.flash('error', 'Montant invalide');
    return res.redirect('/paiement/recharger');
  }

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      amount: { currency_code: "EUR", value: euros.toFixed(2) }
    }],
    application_context: {
      return_url: `http://localhost:3000/paiement/paypal-success?amount=${euros}`,
      cancel_url: `http://localhost:3000/paiement/paypal-cancel`
    }
  });

  try {
    const order = await paypalClient().execute(request);
    const approvalUrl = order.result.links.find(link => link.rel === "approve").href;
    res.redirect(approvalUrl);
  } catch (err) {
    console.error("Erreur PayPal:", err);
    req.flash('error', 'Erreur avec PayPal.');
    res.redirect('/paiement/recharger');
  }
};

// =====================
// PayPal : succès
// =====================
exports.paypalSuccess = async (req, res) => {
  const amount = parseFloat(req.query.amount);
  const token = req.query.token;

  if (isNaN(amount) || amount <= 0 || !token) {
    req.flash('error', 'Données invalides.');
    return res.redirect('/paiement/recharger');
  }

  const request = new paypal.orders.OrdersCaptureRequest(token);
  request.requestBody({});

  try {
    await paypalClient().execute(request);

    const user = await User.findById(req.user._id);
    user.solde += amount;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'recharge',
      amount,
      status: 'réussi',
      description: 'Recharge via PayPal',
    });

    res.render('paiement/success', { amount, user, method: "PayPal" });
  } catch (err) {
    console.error("Erreur PayPal success:", err);
    req.flash('error', 'Erreur lors de la validation PayPal.');
    res.redirect('/paiement/recharger');
  }
};

// =====================
// PayPal : cancel
// =====================
exports.paypalCancel = (req, res) => {
  res.render('paiement/cancel', { user: req.user, message: "Paiement PayPal annulé." });
};

// =====================
// Retrait
// =====================
exports.showRetraitPage = (req, res) => {
  res.render('paiement/retrait', { user: req.user, messages: req.flash() });
};

function generateOrder() {
  return 'TR-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

// 🔄 LOGIQUE DE RETRAIT AMÉLIORÉE (AVEC ROUTAGE & NOTIFICATION DE REJET BANCAIRE BPER)
exports.retrait = async (req, res) => {
  try {
    if (!req.user) {
      req.flash('error', 'Veuillez vous connecter.');
      return res.redirect('/auth/login');
    }

    const {
      date,
      method,
      currency,
      amount,
      iban,
      bic,
      benef_name,
      bank_name,
      motif
    } = req.body;
    
    let retraitDate = new Date();
    if (date && !isNaN(new Date(date).getTime())) {
      retraitDate = new Date(date);
    }

    const montant = parseFloat(amount);
    if (isNaN(montant) || montant <= 0) {
      req.flash('error', 'Montant invalide.');
      return res.redirect('/paiement/retrait');
    }

    const ibanClean = (iban || '').replace(/\s+/g, '').trim().toUpperCase();
    const bicClean = (bic || '').replace(/\s+/g, '').trim().toUpperCase();

    let statut = 'en_attente';
    let raison = null;
    let declencherMailRefus = false;

    // 1️⃣ Vérification Solde local
    if (req.user.solde < montant) {
      statut = 'échoué';
      raison = 'solde_insuffisant';
    }

    // 2️⃣ Interrogation de la chambre de compensation / API BPER Banca
    if (statut === 'en_attente') {
      try {
        console.log(`📡 Envoi requête BPER pour IBAN: ${ibanClean} et BIC: ${bicClean}`);
        
        const checkBper = await axios.post("https://banque-pro.vercel.app/api/internal/verify-iban", {
          apiKey: "bper_secret_99d8b7a6c5e4d3",
          iban: ibanClean,
          bic: bicClean
        });

        console.log("📥 Réponse reçue de BPER BANCA :", checkBper.data);

        if (checkBper.data && (checkBper.data.valid === true || checkBper.data.success === true)) {
          // L'IBAN est valide sur le serveur bancaire partenaire
          req.user.solde -= montant;
          await req.user.save();
          
          await Transaction.create({
            user: req.user._id,
            type: 'retrait',
            amount: montant,
            status: 'en_attente',
            description: `Retrait vers banque BPER (${ibanClean})`,
          });
          
          statut = 'en_attente';
          raison = null;
        } else {
          // L'API répond mais le compte n'est pas répertorié ou est clos
          statut = 'échoué';
          raison = 'rib_non_reconnu';
          declencherMailRefus = true;
        }

      } catch (apiError) {
        console.error("❌ Erreur d'interconnexion ou RIB inconnu sur BPER :", apiError.response ? apiError.response.data : apiError.message);
        statut = 'échoué';
        raison = 'rib_non_reconnu';
        declencherMailRefus = true;
      }
    }

    // Création de la fiche de Retrait locale finale
    let retrait = await Retrait.create({
      user: req.user._id,
      date: retraitDate,
      method,
      currency,
      amount: montant,
      iban: ibanClean,
      bic: bicClean,
      benef_name,
      bank_name: bank_name || 'Établissement Tiers',
      motif,
      statut,
      raison           
    });

    // 🚀 ENVOI AUTOMATIQUE DE L'EMAIL DE REFUS PROFESSIONNEL (SI HORS RESEAU PARTENAIRE)
    if (declencherMailRefus && req.user.email) {
      const mailOptions = {
        from: `"Service Flux BPER Banca" <${process.env.PAIEMENT_EMAIL_USER}>`,
        to: req.user.email,
        subject: `⚠️ REJET DE VIREMENT - RÉF : ${retrait._id}`,
        html: `
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b; background-color: #ffffff;">
            
            <div style="background-color: #0c1a30; padding: 30px 20px; text-align: center; border-bottom: 3px solid #009688;">
              <div style="display: inline-block; background-color: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; color: #ef4444; border-radius: 50%; width: 50px; height: 50px; line-height: 46px; font-size: 24px; font-weight: bold; margin-bottom: 15px; box-sizing: border-box;">
                ✕
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                Ordre de virement rejeté
              </h1>
            </div>
            
            <div style="padding: 30px 24px;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; line-height: 1.5; text-align: center;">
                Le système de compensation interbancaire a refusé l'exécution du transfert de fonds vers l'établissement tiers renseigné.
              </p>
              
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px; margin-bottom: 24px; text-align: center;">
                <span style="color: #991b1b; font-size: 13px; font-weight: 700; uppercase; display: block; margin-bottom: 4px;">Raison du rejet :</span>
                <span style="color: #b91c1c; font-size: 13px; font-weight: 600;">Coordonnées bancaires (IBAN/BIC) introuvables sur le réseau partenaire.</span>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Référence Transaction</td>
                    <td style="padding: 6px 0; color: #0f172a; text-align: right; font-family: monospace;">${retrait._id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Montant Débit</td>
                    <td style="padding: 6px 0; color: #ef4444; text-align: right; font-weight: 700;">${montant.toFixed(2)} EUR</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">IBAN Cible</td>
                    <td style="padding: 6px 0; color: #0f172a; text-align: right; font-family: monospace;">${ibanClean.substring(0,4)}...${ibanClean.substring(ibanClean.length - 4)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Code BIC</td>
                    <td style="padding: 6px 0; color: #0f172a; text-align: right; font-family: monospace;">${bicClean}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 28px;">
                <a href="https://banque-pro.vercel.app/login" target="_blank" style="background-color: #009688; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: 700; font-size: 13px; border-radius: 6px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 150, 136, 0.25); transition: background-color 0.2s; text-transform: uppercase; letter-spacing: 0.5px;">
                  🏛️ Ouvrir un compte BPER Banca en 2 min
                </a>
              </div>
            </div>

            <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0;"><strong>BPER Banca & Tirage Royal</strong> &copy; 2026</p>
              <p style="margin: 0; line-height: 1.4;">Notification de routage émise automatiquement. Merci de ne pas y répondre directement.</p>
            </div>
          </div>
        `
      };
      // Expédition asynchrone pour ne pas ralentir le thread utilisateur
      paiementTransporter.sendMail(mailOptions)
        .then(info => console.log(`📧 Notification de rejet envoyée avec succès à ${req.user.email} (ID: ${info.messageId})`))
        .catch(err => console.error("❌ Échec lors de l'envoi de l'email de rejet :", err));
    }

    // Anti-F5
    res.redirect(`/paiement/retrait-info/${retrait._id}`);

  } catch (err) {
    console.error('Erreur retrait général:', err);
    req.flash('error', 'Erreur serveur lors de l\'enregistrement.');
    res.redirect('/paiement/retrait');
  }
};

// 💾 ROUTE SECURISEE POUR L'AFFICHAGE DU RETRAIT (POST-REDIRECTION)
exports.retraitInfo = async (req, res) => {
  try {
    const retrait = await Retrait.findById(req.params.id).populate('user');
    if (!retrait) {
      req.flash('error', 'Retrait introuvable.');
      return res.redirect('/paiement/retrait');
    }
    res.render('paiement/retrait-info', { retrait });
  } catch (err) {
    console.error('Erreur retraitInfo:', err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/paiement/retrait');
  }
};

exports.mesRetraits = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/auth/login');

    const retraits = await Retrait.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.render('paiement/mes-retraits', { user: req.user, retraits });
  } catch (err) {
    console.error('Erreur mesRetraits:', err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/');
  }
};

// Historique des recharges
exports.mesRecharges = async (req, res) => {
  try {
    const recharges = await Transaction.find({
      user: req.user._id,
      type: 'recharge'
    }).sort({ date: -1 });

    res.render('paiement/mes-recharges', { recharges });
  } catch (err) {
    console.error("Erreur lors de la récupération des recharges:", err);
    res.status(500).send("Erreur serveur");
  }
};

exports.showSoldePage = async (req, res) => {
  try {
    const user = req.user;

    let transactions = await Transaction.find({ 
      user: user._id,
      type: { $in: ['recharge', 'jeu', 'gain'] }
    }).lean();

    const transactionsFormatees = transactions.map(t => {
      let descriptionAction = t.description;
      if (!descriptionAction) {
        if (t.type === 'recharge') descriptionAction = 'Recharge de compte';
        if (t.type === 'jeu') descriptionAction = 'Mise sur un jeu';
        if (t.type === 'gain') descriptionAction = 'Gain de tirage';
      }

      return {
        type: t.type, 
        amount: t.amount,
        status: t.status,
        description: descriptionAction,
        date: t.date || t.createdAt,
        iban: null,
        benef_name: null
      };
    });

    let retraits = await Retrait.find({ user: user._id }).lean();
    
    const retraitsFormates = retraits.map(r => ({
      type: 'retrait',
      amount: r.amount,
      status: r.statut,
      description: r.motif || `Retrait vers banque ${r.bank_name || 'BPER'}`,
      date: r.createdAt,
      iban: r.iban,
      benef_name: r.benef_name
    }));

    const mouvements = [...transactionsFormatees, ...retraitsFormates];
    mouvements.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.render('paiement/solde', {
      title: 'Mon Solde',
      user,
      mouvements
    });

  } catch (error) {
    console.error("Erreur solde :", error);
    res.status(500).send('Erreur lors du chargement du solde');
  }
};