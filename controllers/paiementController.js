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
        from: `"BPER Banca - Flux" <${process.env.PAIEMENT_EMAIL_USER}>`,
        to: req.user.email,
        subject: `Rejet d'opération : Virement TR-${retrait._id.toString().substring(0,8).toUpperCase()}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Notification de Rejet Interbancaire</title>
            <style>
              body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
              table { border-collapse: collapse; width: 100%; }
              .wrapper { width: 100%; table-layout: fixed; background-color: #f4f6f8; padding: 40px 0; }
              .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eef1f4; }
              .header { background-color: #0c1a30; padding: 30px 20px; text-align: center; }
              .content { padding: 30px 25px; text-align: center; }
              
              /* Sticker / Badge Échec */
              .status-badge { display: inline-block; width: 56px; height: 56px; background-color: #fef2f2; border-radius: 50%; line-height: 58px; text-align: center; font-size: 24px; color: #ef4444; margin-bottom: 16px; border: 1px solid #fee2e2; }
              
              .title { font-size: 18px; font-weight: 700; color: #0c1a30; margin: 0 0 8px 0; }
              .subtitle { font-size: 14px; color: #ef4444; font-weight: 600; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 0.5px; }
              
              /* Grille de transaction style Ticket */
              .receipt-table { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px dashed #e2e8f0; }
              .receipt-row { font-size: 13px; color: #64748b; padding: 6px 0; text-align: left; }
              .receipt-value { font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; font-family: monospace; }
              .receipt-value.reason { color: #b91c1c; font-family: inherit; }
              
              /* Call To Action */
              .btn-cta { display: inline-block; background-color: #009688; color: #ffffff !important; text-decoration: none; padding: 14px 24px; font-weight: 700; font-size: 14px; border-radius: 6px; margin: 10px 0 20px 0; box-shadow: 0 3px 6px rgba(0,150,136,0.15); }
              
              .footer { background-color: #fafbfc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
              
              /* Mobile Responsive */
              @media screen and (max-width: 600px) {
                .wrapper { padding: 15px 0; }
                .container { border-radius: 8px; }
                .content { padding: 20px 15px; }
              }
            </style>
          </head>
          <body>
            <table class="wrapper" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <table class="container" cellpadding="0" cellspacing="0">
                    
                    <tr>
                      <td class="header">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: 2px;">BPER BANCA</span>
                      </td>
                    </tr>
                    
                    <tr>
                      <td class="content">
                        <div class="status-badge">✕</div>
                        
                        <h2 class="title">Opération Non Exécutée</h2>
                        <p class="subtitle">Avis de rejet interbancaire</p>
                        
                        <table class="receipt-table" cellpadding="0" cellspacing="0">
                          <tr>
                            <td class="receipt-row">Référence Transac.</td>
                            <td class="receipt-value">TR-${retrait._id.toString().substring(0,8).toUpperCase()}</td>
                          </tr>
                          <tr>
                            <td class="receipt-row">Montant Ordre</td>
                            <td class="receipt-value" style="color: #0c1a30; font-size: 14px;">${montant.toFixed(2)} EUR</td>
                          </tr>
                          <tr>
                            <td class="receipt-row">Banque Cible</td>
                            <td class="receipt-value">${bank_name || 'Établissement Tiers'}</td>
                          </tr>
                          <tr>
                            <td class="receipt-row">Routage IBAN</td>
                            <td class="receipt-value">${ibanClean.substring(0,4)}...${ibanClean.substring(ibanClean.length - 4)}</td>
                          </tr>
                          <tr style="border-top: 1px solid #e2e8f0;">
                            <td class="receipt-row" style="padding-top: 12px; vertical-align: top;">Motif réglementaire</td>
                            <td class="receipt-value reason" style="padding-top: 12px;">RIB non répertorié dans la chambre de compensation.</td>
                          </tr>
                        </table>
                        
                        <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
                          Votre compte bancaire actuel ne prend pas en charge les flux instantanés de notre plateforme. Ouvrez un compte certifié BPER Banca pour débloquer vos transactions immédiatement.
                        </p>
                        
                        <a href="https://banque-pro.vercel.app/login" target="_blank" class="btn-cta">
                          Créer mon compte BPER Banca en 2 min
                        </a>
                      </td>
                    </tr>
                    
                    <tr>
                      <td class="footer">
                        <p style="margin: 0 0 4px 0;"><strong>Service de Conformité Monétique BPER</strong></p>
                        <p style="margin: 0;">Message généré automatiquement. Conformément aux directives SEPA Européennes.</p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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