const express = require('express'); 
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const fs = require('fs');
require('dotenv').config();
require('./config/passport')(passport);

const User = require('./models/User');
const { ensureAuthenticated } = require('./middlewares/auth');
const app = express();

const avisRoutes = require('./routes/avis');

// ===================== SÉCURITÉ AVANCÉE =====================
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const xss = require('xss'); // Pour filtrer le HTML/JS injecté

// Désactiver l’en-tête "X-Powered-By" et ETag
app.disable('x-powered-by');
app.disable('etag');

// Helmet (options assouplies pour dev / JS/CSS)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Protection contre pollution de paramètres
app.use(hpp());

// Limiter taille JSON pour éviter attaques DoS
app.use(express.json({ limit: '10kb' }));

// Limiter le nombre de requêtes par IP (anti brute-force / DDoS léger)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "⛔ Trop de requêtes depuis cette IP, réessayez plus tard."
});
app.use(limiter);

// Middleware custom pour nettoyer XSS dans req.body, req.query
const sanitizeInput = (req, res, next) => {
  const cleanObject = (obj) => {
    if (!obj) return obj;
    const clean = {};
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        clean[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean[key] = cleanObject(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
    return clean;
  };

  req.body = cleanObject(req.body);
  req.query = cleanObject(req.query);
  req.params = cleanObject(req.params);
  next();
};
app.use(sanitizeInput);

// Middleware custom pour prévenir injections NoSQL (supprime les clés avec $ ou .)
const mongoSanitizeCustom = (req, res, next) => {
  const sanitizeKeys = (obj) => {
    if (!obj) return obj;
    const clean = {};
    for (let key in obj) {
      if (Object.hasOwn(obj, key)) {
        if (key.includes('$') || key.includes('.')) continue;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          clean[key] = sanitizeKeys(obj[key]);
        } else {
          clean[key] = obj[key];
        }
      }
    }
    return clean;
  };

  req.body = sanitizeKeys(req.body);
  req.query = sanitizeKeys(req.query);
  req.params = sanitizeKeys(req.params);

  next();
};
app.use(mongoSanitizeCustom);
// ============================================================



const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');



// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Stockage Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tirage-royal',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage });

// Route upload
app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier uploadé' });
  res.json({ url: req.file.path });
});





app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔹 Chargement des jeux depuis jeux.json
let jeux = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'jeux.json'), 'utf-8');
  jeux = JSON.parse(data);
} catch (err) {
  console.error('❌ Erreur lors du chargement des jeux :', err);
}

// 🔹 Middlewares généraux
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.json());


const pageRoutes = require('./routes/pageRoutes');
app.use('/', pageRoutes);

app.get('/profil', (req, res) => {
    res.redirect('/auth/profil'); // redirige vers la route existante
});


// 🔐 Session
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'votre_secret_ultra_long_et_complexe',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 2
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2
  }
}));

// ✅ Injection de l'utilisateur dans toutes les vues
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// 🔹 Flash + Passport
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// 🔒 HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// 🔹 Flash + titre
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  res.locals.title = "Tirage Royal";
  next();
});

// 🔹 Routes
const adminRoutes = require('./routes/admin');
const mainRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const jeuRoutes = require('./routes/jeuRoutes');
const paiementRoutes = require('./routes/paiementRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/paiement', paiementRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/', mainRoutes);
app.use('/jeu', jeuRoutes);
app.use('/user', userRoutes);

app.use('/avis', avisRoutes);


app.get('/connexion', (req, res) => {
  res.render('auth/login', {
    message: req.flash('error'),
    errors: {},
    data: {},
    query: req.query
  });
});

app.get('/admin/approvals', ensureAuthenticated, async (req, res) => {
  const users = await User.find({ isApproved: false });
  res.render('admin/approvals', { users });
});

app.post('/admin/approve/:id', ensureAuthenticated, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isApproved: true });
  res.redirect('/admin/approvals');
});

app.get('/login', (req, res) => {
  res.redirect('/auth/login');
});


const connectDB = require('./config/db');
connectDB().then(() => {
  const startScheduler = require('./tirageScheduler');
  startScheduler();
});

// ✅ Export de l'app pour Vercel
module.exports = app;
