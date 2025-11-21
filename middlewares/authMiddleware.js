  // middlewares/authMiddleware.js
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/connexion');
  
};

exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).send('Accès refusé');
};

exports.isVerified = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    return next();
  }
  res.redirect('/en-attente');
};



