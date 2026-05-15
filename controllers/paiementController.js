const Retrait = require('../models/Retrait'); 
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const axios = require('axios'); // 🚀 AJOUTÉ pour l'interconnexion API

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

// 🔄 NOUVELLE LOGIQUE DE RETRAIT PAR INTERCONNEXION API 
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

    const ibanClean = (iban || '').replace(/\s+/g, '').toUpperCase();
    const bicClean = (bic || '').trim().toUpperCase();

    let statut = 'en_attente';
    let raison = null;

    // 1️⃣ Vérification Solde local
    if (req.user.solde < montant) {
      statut = 'échoué';
      raison = 'solde_insuffisant';
    }

    // 2️⃣ Interrogation du 2ème PC (Banque BPER) si le solde est OK
    if (statut === 'en_attente') {
      try {
        // Remplace par l'IP de ton second PC ou l'URL finale (ex: https://banque-pro.vercel.app)
        const checkBper = await axios.post("https://banque-pro.vercel.app/api/internal/verify-iban", {
          apiKey: "bper_secret_99d8b7a6c5e4d3", // La clé secrète configurée
          iban: ibanClean,
          bic: bicClean
        });

        // 3️⃣ Si le compte existe, on valide l'état "en attente" et on débite l'utilisateur
        if (checkBper.data.valid) {
          req.user.solde -= montant;
          await req.user.save();
          
          // Création d'une transaction locale pour l'historique de solde
          await Transaction.create({
            user: req.user._id,
            type: 'retrait',
            amount: montant,
            status: 'en_attente',
            description: `Retrait vers banque BPER (${ibanClean})`,
          });
        }
      } catch (apiError) {
        // Si l'API renvoie 404 ou une erreur : le RIB n'existe pas ou serveur injoignable
        statut = 'échoué';
        raison = 'rib_non_reconnu';
      }
    }

    // Création de la fiche de Retrait locale
    let retrait = await Retrait.create({
      user: req.user._id,
      date: retraitDate,
      method,
      currency,
      amount: montant,
      iban: ibanClean,
      bic: bicClean,
      benef_name,
      bank_name,
      motif,
      statut,
      raison           
    });

    retrait = await retrait.populate('user');

    res.render('paiement/retrait-info', {
      retrait,
      delai: '3h à 24h'
    });

  } catch (err) {
    console.error('Erreur retrait général:', err);
    req.flash('error', 'Erreur serveur lors de l\'enregistrement.');
    res.redirect('/paiement/retrait');
  }
};

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

    let transactions = await Transaction.find({ user: user._id }).lean();
    transactions = transactions.map(t => ({
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description || '',
      date: t.date || t.createdAt,
      motif: t.description || 'N/A'
    }));

    let retraits = await Retrait.find({ user: user._id }).lean();
    retraits = retraits.map(r => ({
      type: 'retrait',
      amount: r.amount,
      status: r.statut,
      description: `Retrait via ${r.method}`,
      date: r.createdAt,
      motif: r.motif
    }));

    const mouvements = [...transactions, ...retraits];
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