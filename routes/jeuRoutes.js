const express = require('express'); 
const router = express.Router();
const jeuController = require('../controllers/jeuController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Jeu = require('../models/Jeu');
const archiveController = require('../controllers/archiveController');


// ✅ Route vers /jouer
router.get('/jouer', isAuthenticated, jeuController.jouer);

// ✅ Routes fixes AVANT le slug dynamique
router.get('/resultats', isAuthenticated, jeuController.afficherTousLesResultats);
router.get('/mes-participations', isAuthenticated, jeuController.mesParticipations);
router.post('/transfert-gains', isAuthenticated, jeuController.transfertGains);

// ✅ Historique et archives
router.get('/historique', isAuthenticated, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.session.user._id }).sort({ dateParticipation: -1 });
    return res.render('pages/historique', { tickets });
  } catch (err) {
    console.error('Erreur historique :', err);
    return res.status(500).send('Erreur serveur');
  }
});

router.get('/archive', async (req, res) => {
  try {
    const jeux = await Jeu.find({ archive: true });
    console.log('Jeux archivés trouvés :', jeux);
    res.render('pages/archives', { jeux });
  } catch (error) {
    console.error('Erreur dans /archive :', error);
    res.status(500).send('Erreur serveur');
  }
});


router.get('/gagnants-du-jour', archiveController.afficherGagnantsDuJour);
 

// ✅ Participer à un jeu (par slug)
router.post('/:slug/participer', isAuthenticated, jeuController.participerJeu);


router.get('/test', (req, res) => {
  res.send('Test OK');
});

// ✅ La route dynamique slug DOIT être la dernière !
router.get('/:slug', isAuthenticated, jeuController.detailJeu);

// ✅ Redirection de /jeu vers la racine
router.get('/', (req, res) => {
  return res.redirect('/');
});

module.exports = router;
