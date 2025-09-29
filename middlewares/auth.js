exports.ensureAuthenticated = (req, res, next) => {
  if (req.user) {
    if (req.user.isApproved) {
      return next(); // ✅ L'utilisateur est connecté ET approuvé par l'admin
    } else {
      // Déconnexion de l'utilisateur non approuvé
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        req.flash('error', 'Votre compte est en attente de validation par un administrateur.');
        res.redirect('/auth/login');
      });
    }
  } else {
    // Non connecté
    req.session.redirectTo = req.originalUrl; // pour revenir après connexion
    res.redirect('/auth/login?message=loginRequired');
  }
};    

exports.ensureAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next(); // ✅ accès autorisé
  }
  res.status(403).send('Accès interdit. Réservé aux administrateurs.');
};