const Retrait = require('../models/Retrait'); 
const Transaction = require('../models/Transaction');
const User = require('../models/User');

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

exports.demanderRetrait = async (req, res) => {
  const { montant, methode, info } = req.body;
  const euros = parseFloat(montant);

  if (!req.user) {
    req.flash('error', 'Connectez-vous pour faire un retrait.');
    return res.redirect('/auth/login');
  }

  if (isNaN(euros) || euros <= 0) {
    req.flash('error', 'Montant invalide.');
    return res.redirect('/paiement/retrait');
  }

  if (euros > req.user.solde) {
    req.flash('error', 'Solde insuffisant.');
    return res.redirect('/paiement/retrait');
  }

  try {
    const user = await User.findById(req.user._id);
    user.solde -= euros;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'retrait',
      amount: euros,
      status: 'en attente',
      description: `Retrait via ${methode} (${info})`,
    });

    req.flash('success', 'Votre demande de retrait est en attente de validation.');
    res.redirect('/paiement/retrait');
  } catch (err) {
    console.error('Erreur retrait:', err);
    req.flash('error', 'Erreur serveur, contactez l\'administrateur.');
    res.redirect('/paiement/retrait');
  }
};

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

    const montant = parseFloat(amount);
    if (isNaN(montant) || montant <= 0) {
      req.flash('error', 'Montant invalide.');
      return res.redirect('/paiement/retrait');
    }

    const ibanClean = (iban || '').replace(/\s+/g, '').toUpperCase();
    const bicClean = (bic || '').trim().toUpperCase();

    let statut = 'en_attente';
    let message = null;

    if (req.user.solde < montant) {
      statut = 'échoué';
      message = `Votre demande de retrait de ${montant} ${currency} n’a pas pu être finalisée (solde insuffisant).`;
    }

    let retrait = new Retrait({
      user: req.user._id,
      date: date || new Date().toLocaleDateString('fr-FR'),
      method,
      currency,
      amount: montant,
      iban: ibanClean,
      bic: bicClean,
      benef_name,
      bank_name,
      motif,
      statut
    });

    await retrait.save();
    retrait = await retrait.populate('user');

    res.render('paiement/retrait-info', { retrait, message });
  } catch (err) {
    console.error('Erreur retrait:', err);
    req.flash('error', 'Erreur serveur.');
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

    // ================================
    // 1. Récupération des TRANSACTIONS
    // ================================
    let transactions = await Transaction.find({ user: user._id }).lean();

    transactions = transactions.map(t => ({
      type: t.type,                         // recharge, jeu, gain
      amount: t.amount,
      status: t.status,                     // en_attente, réussi, échoué
      description: t.description || '',
      date: t.date || t.createdAt,          // sécurité
      motif: t.description || 'N/A'
    }));

    // ============================
    // 2. Récupération des RETRAITS
    // ============================
    let retraits = await Retrait.find({ user: user._id }).lean();

    retraits = retraits.map(r => ({
      type: 'retrait',
      amount: r.amount,
      status: r.statut,                     // en_attente, réussi, échoué
      description: `Retrait via ${r.method}`,
      date: r.createdAt,                    // date réelle
      motif: r.motif
    }));

    // =======================
    // 3. Fusion des mouvements
    // =======================
    const mouvements = [...transactions, ...retraits];

    // ============================
    // 4. Tri par date DESC (pro)
    // ============================
    mouvements.sort((a, b) => new Date(b.date) - new Date(a.date));

    // =======================
    // 5. Rendu
    // =======================
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


exports.vantexPage = (req, res) => {
  res.render('paiement/vantex', { user: req.user, messages: req.flash() });
};


exports.vantexOpenPage = (req, res) => {
  res.render('paiement/vantex-open', { user: req.user, messages: req.flash() });
};

// =====================
// Soumission formulaire VANTEX
// =====================
exports.vantexOpenSubmit = async (req, res) => {
  try {
    const {
      civility,
      firstname,
      lastname,
      email,
      phone,
      profession,
      id_type,
      id_number,
      country,
      region,
      street,
      city,
      zip,
      terms
    } = req.body;

    // Validation simple côté serveur
    if (!civility || !firstname || !lastname || !email || !phone || !profession || 
        !id_type || !id_number || !country || !region || !street || !city || !zip || !terms) {
      req.flash('error', 'Tous les champs obligatoires doivent être remplis.');
      return res.redirect('/paiement/vantex-open');
    }

    // Vérification fichiers
    if (!req.files || !req.files.id_front || !req.files.id_back) {
      req.flash('error', 'Veuillez télécharger les deux documents d’identité.');
      return res.redirect('/paiement/vantex-open');
    }

    // Sauvegarde des fichiers côté serveur (ex: /uploads/vantex)
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'vantex');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const frontFile = req.files.id_front;
    const backFile = req.files.id_back;

    const frontPath = path.join(uploadDir, `${Date.now()}-front-${frontFile.name}`);
    const backPath = path.join(uploadDir, `${Date.now()}-back-${backFile.name}`);

    await frontFile.mv(frontPath);
    await backFile.mv(backPath);

    // Ici tu peux soit enregistrer dans une collection spécifique "VantexAccounts"
    // Pour simplifier on met à jour l'utilisateur connecté avec infos VANTEX
    const user = await User.findById(req.user._id);
    user.vantexAccount = {
      civility,
      firstname,
      lastname,
      email,
      phone,
      profession,
      id_type,
      id_number,
      country,
      region,
      street,
      city,
      zip,
      id_front: `/uploads/vantex/${path.basename(frontPath)}`,
      id_back: `/uploads/vantex/${path.basename(backPath)}`,
      status: 'en_attente'
    };

    await user.save();

    req.flash('success', 'Votre demande d’ouverture de compte VANTEX a été envoyée avec succès. Elle sera vérifiée par l’administrateur.');
    res.redirect('/paiement/vantex');
  } catch (err) {
    console.error('Erreur ouverture compte VANTEX:', err);
    req.flash('error', 'Erreur serveur, veuillez réessayer.');
    res.redirect('/paiement/vantex-open');
  }
};