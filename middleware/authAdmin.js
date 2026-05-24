module.exports = (req, res, next) => {
  // ✅ Si ya existe la sesión, continúa
  if (req.session?.isAdmin) return next();

  
  // Activa sesión automáticamente si estamos en localhost
  if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
    req.session.isAdmin = true;
    return next();
  }

  
  res.status(403).render('pages/error', { 
    message: '⛔ Acceso restringido', 
    error: 'Esta área es solo para administradores.' 
  });
};