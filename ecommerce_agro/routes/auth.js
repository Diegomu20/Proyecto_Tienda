const express = require('express');
const router = express.Router();
const { User } = require('../models');
const authUser = require('../middleware/authUser');
const checkGuest = require('../middleware/checkGuest');

// ✅ Registro (GET)
router.get('/register', checkGuest, (req, res) => {
  res.render('pages/register', { error: null, success: null });
});

// ✅ Registro (POST) - usa req.uploadProfile (definido en server.js)
router.post('/register', checkGuest, (req, res, next) => {
  // Ejecuta el middleware de multer para subir la imagen de perfil
  req.uploadProfile.single('profileImage')(req, res, async (err) => {
    if (err) {
      return res.render('pages/register', { 
        error: 'Error al subir la imagen: ' + err.message, 
        success: null 
      });
    }
    next(); // Continúa si no hay error
  });
}, async (req, res) => {
  try {
    const { nombre, email, password, confirmPassword } = req.body;
    
    if (!nombre || !email || !password) throw new Error('Todos los campos son obligatorios');
    if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

    const profileImage = req.file ? `profiles/${req.file.filename}` : 'default-avatar.png';

    // ✅ SEQUELIZE: Crea y ejecuta hooks (bcrypt) automáticamente
    await User.create({ nombre, email, password, profileImage });

    res.render('pages/register', { error: null, success: '✅ Registro exitoso. Ahora puedes iniciar sesión.' });
  } catch (err) {
    // Manejo de errores nativos de Sequelize (ej: email duplicado)
    const errorMsg = err.name === 'SequelizeUniqueConstraintError' 
      ? 'El email ya está registrado' 
      : err.message;
    res.render('pages/register', { error: errorMsg, success: null });
  }
});

// ✅ Login (GET)
router.get('/login', checkGuest, (req, res) => {
  res.render('pages/login', { error: null, returnUrl: req.query.returnUrl || '/' });
});

// ✅ Login (POST)
router.post('/login', checkGuest, async (req, res) => {
  try {
    const { email, password, rememberMe, returnUrl } = req.body;

    // ✅ SEQUELIZE: Busca usuario
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Email o contraseña incorrectos');

    // ✅ SEQUELIZE: Usa el método personalizado del modelo
    const isValid = await user.validatePassword(password);
    if (!isValid) throw new Error('Email o contraseña incorrectos');

    req.session.userId = user.id;
    req.session.userName = user.nombre;
    req.session.userEmail = user.email;

    if (rememberMe) {
      res.cookie('rememberMe', user.id, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
    }

    res.redirect(returnUrl || '/');
  } catch (err) {
    res.render('pages/login', { error: err.message, returnUrl: req.body.returnUrl || '/' });
  }
});

// ✅ Logout
router.get('/logout', (req, res) => {
  req.session.userId = null;
  req.session.userName = null;
  req.session.userEmail = null;
  res.clearCookie('rememberMe');
  res.redirect('/');
});

module.exports = router;