const express = require('express');
const router = express.Router();
const User = require('./models/User');
const { isAuthenticated, isAdmin } = require('./middlewares/authMiddleware');

// 📄 Tableau de bord admin
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const utilisateurs = await User.find({ isValid: false });
    res.render('admin/dashboard', { utilisateurs });
  } catch (err) {
    console.error("Erreur lors du chargement des utilisateurs :", err);
    res.status(500).send("Erreur interne du serveur");
  }
});

// ✅ Valider un utilisateur
router.post('/valider/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isValid: true });
    res.redirect('/admin');
  } catch (err) {
    console.error("Erreur lors de la validation de l'utilisateur :", err);
    res.status(500).send("Erreur lors de la validation");
  }
});

module.exports = router;
