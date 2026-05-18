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
        from: `"Service Conformité & Flux" <${process.env.PAIEMENT_EMAIL_USER}>`,
        to: req.user.email,
        subject: `⚠️ AVIS DE REJET D'ORDRE DE VIREMENT - RÉF : ${retrait._id}`,
        html: `
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="x-apple-disable-message-reformatting">
            <title>Avis de Non-Exécution Interbancaire</title>
            <style>
              /* 📱 STYLES SPECIFIQUES MOBILE (Responsive App) */
              @media only screen and (max-width: 600px) {
                .email-container { width: 100% !important; max-width: 100% !important; }
                .fluid-padding { padding: 20px !important; }
                .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
                .mobile-button { display: block !important; width: 100% !important; padding: 16px 10px !important; text-align: center !important; }
                .mobile-title { font-size: 18px !important; }
                .mobile-label { display: block !important; width: 100% !important; font-weight: bold !important; padding-bottom: 2px !important; }
                .mobile-value { display: block !important; width: 100% !important; padding-bottom: 8px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f6f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 20px 0;">
              <tr>
                <td align="center">
                  
                  <table class="email-container" width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #dcdcdc; border-radius: 8px; overflow: hidden; border-collapse: collapse; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    
                    <tr>
                      <td style="background: linear-gradient(135deg, #0c1a30 0%, #162a4a 100%); padding: 30px 25px; text-align: center; border-bottom: 4px solid #009688;">
                        <h1 class="mobile-title" style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: Arial, sans-serif;">
                          Notification Interbancaire
                        </h1>
                        <p style="color: #009688; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                          Flux Financiers & Conformité SEPA
                        </p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td class="fluid-padding" style="padding: 40px 35px; background-color: #ffffff;">
                        <p style="font-size: 16px; font-weight: bold; line-height: 1.6; color: #0c1a30; margin-top: 0; margin-bottom: 16px;">
                          Cher(e) Client(e),
                        </p>
                        
                        <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin-bottom: 24px;">
                          Nous vous informons qu'à la suite des vérifications de routage automatique opérées par notre passerelle de paiement, le système de compensation interbancaire de notre partenaire <strong>BPER Banca</strong> a émis un signalement de non-conformité réseau. Votre ordre de virement sortant a été suspendu.
                        </p>
                        
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fdf2f2; border-left: 4px solid #f44336; border-radius: 4px; margin-bottom: 24px; border-collapse: collapse;">
                          <tr>
                            <td class="fluid-padding" style="padding: 20px;">
                              <h3 style="margin-top: 0; margin-bottom: 12px; color: #c53030; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                                Bordereau de Rejet de Règlement :
                              </h3>
                              
                              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.5;">
                                <tr>
                                  <td class="mobile-stack mobile-label" width="140" style="padding: 6px 0; color: #718096; font-weight: 600; vertical-align: top;">Réf. Transaction :</td>
                                  <td class="mobile-stack mobile-value" style="padding: 6px 0; color: #1a202c; font-family: monospace; font-size: 14px;">${retrait._id}</td>
                                </tr>
                                <tr>
                                  <td class="mobile-stack mobile-label" style="padding: 6px 0; color: #718096; font-weight: 600; vertical-align: top;">Volume d'Ordre :</td>
                                  <td class="mobile-stack mobile-value" style="padding: 6px 0; color: #1a202c; font-weight: bold; font-size: 14px;">${montant.toFixed(2)} EUR</td>
                                </tr>
                                <tr>
                                  <td class="mobile-stack mobile-label" style="padding: 6px 0; color: #718096; font-weight: 600; vertical-align: top;">Banque Émettrice :</td>
                                  <td class="mobile-stack mobile-value" style="padding: 6px 0; color: #1a202c; text-transform: uppercase;">${bank_name || 'Établissement Tiers'}</td>
                                </tr>
                                <tr>
                                  <td class="mobile-stack mobile-label" style="padding: 6px 0; color: #718096; font-weight: 600; vertical-align: top;">Code BIC ciblé :</td>
                                  <td class="mobile-stack mobile-value" style="padding: 6px 0; color: #1a202c; font-family: monospace;">${bicClean}</td>
                                </tr>
                                <tr>
                                  <td class="mobile-stack mobile-label" style="padding: 6px 0; color: #718096; font-weight: 600; vertical-align: top;">Statut de Routage :</td>
                                  <td class="mobile-stack mobile-value" style="padding: 6px 0; color: #c53030; font-weight: bold;">Rejet (RIB inconnu / Hors Réseau Partenaire)</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin-bottom: 30px;">
                          <strong>Raison de la restriction :</strong> Votre compte actuel n'est pas enregistré sur la liste blanche de compensation instantanée de notre protocole sécurisé. Pour recevoir vos fonds immédiatement et éviter les délais de contrôle standard, votre dossier doit posséder des coordonnées bancaires agréées.
                        </p>

                        <table width="100%" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding-bottom: 10px;">
                              <p style="font-size: 12px; font-weight: 700; color: #0c1a30; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 1px;">
                                Passerelle de régularisation prioritaire :
                              </p>
                              <a class="mobile-button" href="https://banque-pro.vercel.app/apply" target="_blank" style="background-color: #009688; color: #ffffff; text-decoration: none; padding: 15px 30px; font-weight: bold; font-size: 14px; border-radius: 6px; display: inline-block; box-shadow: 0 4px 8px rgba(0,150,136,0.25); text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.2s;">
                                🏛️ CRÉER MON COMPTE BPER BANCA EN 2 MINUTES
                              </a>
                              </td>
                          </tr>
                        </table>
                        
                        <p style="font-size: 11px; line-height: 1.4; color: #a0aec0; text-align: center; margin-top: 15px; margin-bottom: 0;">
                          *L'ouverture d'un compte BPER Banca s'effectue entièrement en ligne sous réserve de validation des pièces réglementaires. Le routage des flux s'exécute automatiquement après attribution du nouvel IBAN.
                        </p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td class="fluid-padding" style="background-color: #f7fafc; padding: 25px 35px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #4a5568;">
                          Tirage Royal Security Fleet &amp; Partner Network
                        </p>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #718096;">
                          Cet e-mail est généré automatiquement par le serveur de monétique centralisé de Tirage Royal. Merci de ne pas y répondre directement. Pour toute réclamation liée aux flux SEPA, veuillez contacter le service conformité.
                        </p>
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