const express = require('express');
const router = express.Router();
const userDb = require('../utils/userDb');
const authUser = require('../middleware/authUser');
const checkGuest = require('../middleware/checkGuest');

//Registro (GET)
router.get('/register', checkGuest, (req, res) => {
  res.render('pages/register', { error: null, success: null });
});

//Registro (POST)
router.post('/register', checkGuest, async (req, res) => {
  try {
    const { nombre, email, password, confirmPassword } = req.body;
    
    // Validaciones
    if (!nombre || !email || !password) {
      return res.render('pages/register', { 
        error: 'Todos los campos son obligatorios',
        success: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('pages/register', { 
        error: 'Las contraseñas no coinciden',
        success: null
      });
    }
    
    if (password.length < 6) {
      return res.render('pages/register', { 
        error: 'La contraseña debe tener al menos 6 caracteres',
        success: null
      });
    }
    
    await userDb.create({ nombre, email, password });
    
    res.render('pages/register', { 
      error: null,
      success: '✅ Registro exitoso. Ahora puedes iniciar sesión.'
    });
  } catch (err) {
    res.render('pages/register', { 
      error: err.message || 'Error al registrar',
      success: null
    });
  }
});

//Login (GET)
router.get('/login', checkGuest, (req, res) => {
  const returnUrl = req.query.returnUrl || '/';
  res.render('pages/login', { error: null, returnUrl });
});

// Login (POST)
router.post('/login', checkGuest, async (req, res) => {
  try {
    const { email, password, rememberMe, returnUrl } = req.body;
    
    const user = await userDb.findByEmail(email);
    if (!user) {
      return res.render('pages/login', { 
        error: 'Email o contraseña incorrectos',
        returnUrl: returnUrl || '/'
      });
    }
    
    const users = await userDb.findAll();
    const userWithPass = users.find(u => u.email === email);
    
    const isValid = await userDb.validatePassword(password, userWithPass.password);
    if (!isValid) {
      return res.render('pages/login', { 
        error: 'Email o contraseña incorrectos',
        returnUrl: returnUrl || '/'
      });
    }
    
    // Crear sesión
    req.session.userId = user.id;
    req.session.userName = user.nombre;
    req.session.userEmail = user.email;
    
    // "Remember me" con cookie de 30 días
    if (rememberMe) {
      res.cookie('rememberMe', user.id, { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        httpOnly: true 
      });
    }
    
    res.redirect(returnUrl || '/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('pages/login', { 
      error: 'Error al iniciar sesión',
      returnUrl: req.body.returnUrl || '/'
    });
  }
});

//  Logout
router.get('/logout', (req, res) => {
  req.session.userId = null;
  req.session.userName = null;
  req.session.userEmail = null;
  res.clearCookie('rememberMe');
  res.redirect('/');
});

module.exports = router;