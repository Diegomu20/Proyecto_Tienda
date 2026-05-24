// routes/auth.js — Sprint 7: validaciones back-end con express-validator
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const authUser = require('../middleware/authUser');
const checkGuest = require('../middleware/checkGuest');
const {
  validateRegister,
  handleRegisterErrors,
  validateLogin,
  handleLoginErrors,
} = require('../middleware/validators');

// ── Registro (GET) ────────────────────────────────────────────────────────────
router.get('/register', checkGuest, (req, res) => {
  res.render('pages/register', { error: null, success: null });
});

// ── Registro (POST) ───────────────────────────────────────────────────────────
// Orden: subir imagen → validar campos → manejar errores → procesar
router.post(
  '/register',
  checkGuest,
  // 1) Multer: subir foto de perfil antes de validar
  (req, res, next) => {
    req.uploadProfile.single('profileImage')(req, res, (err) => {
      if (err) {
        return res.render('pages/register', {
          error: 'Error al subir la imagen: ' + err.message,
          success: null,
        });
      }
      next();
    });
  },
  // 2) Validar tipo de imagen
  (req, res, next) => {
    if (req.file) {
      const allowed = /\.(jpg|jpeg|png|gif)$/i;
      if (!allowed.test(req.file.originalname)) {
        return res.status(400).render('pages/register', {
          error: 'La imagen de perfil debe ser JPG, JPEG, PNG o GIF.',
          success: null,
        });
      }
    }
    next();
  },
  // 3) Reglas de express-validator
  validateRegister,
  // 4) Mostrar errores de validación si los hay
  handleRegisterErrors,
  // 5) Lógica de negocio (solo llega aquí si todo está OK)
  async (req, res) => {
    try {
      const { nombre, email, password } = req.body;

      // Verificar email duplicado manualmente (sequelize lo haría igual, pero
      // así damos un mensaje más claro que el error de constraint)
      const existe = await User.findOne({ where: { email } });
      if (existe) {
        return res.render('pages/register', {
          error: 'Ese email ya está registrado. Prueba con otro.',
          success: null,
        });
      }

      const profileImage = req.file
        ? `profiles/${req.file.filename}`
        : 'default-avatar.png';

      await User.create({ nombre, email, password, profileImage });

      res.render('pages/register', {
        error: null,
        success: '✅ Registro exitoso. Ahora puedes iniciar sesión.',
      });
    } catch (err) {
      console.error('Error en registro:', err);
      res.render('pages/register', {
        error: 'Ocurrió un error inesperado. Intenta de nuevo.',
        success: null,
      });
    }
  }
);

// ── Login (GET) ───────────────────────────────────────────────────────────────
router.get('/login', checkGuest, (req, res) => {
  res.render('pages/login', { error: null, returnUrl: req.query.returnUrl || '/' });
});

// ── Login (POST) ──────────────────────────────────────────────────────────────
router.post(
  '/login',
  checkGuest,
  // 1) Reglas express-validator
  validateLogin,
  // 2) Mostrar errores de formato
  handleLoginErrors,
  // 3) Lógica de autenticación
  async (req, res) => {
    try {
      const { email, password, rememberMe, returnUrl } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.render('pages/login', {
          error: 'Email o contraseña incorrectos.',
          returnUrl: returnUrl || '/',
        });
      }

      const isValid = await user.validatePassword(password);
      if (!isValid) {
        return res.render('pages/login', {
          error: 'Email o contraseña incorrectos.',
          returnUrl: returnUrl || '/',
        });
      }

      req.session.userId = user.id;
      req.session.userName = user.nombre;
      req.session.userEmail = user.email;

      if (rememberMe) {
        res.cookie('rememberMe', user.id, {
          maxAge: 30 * 24 * 60 * 60 * 1000,
          httpOnly: true,
        });
      }

      res.redirect(returnUrl || '/');
    } catch (err) {
      console.error('Error en login:', err);
      res.render('pages/login', {
        error: 'Ocurrió un error inesperado. Intenta de nuevo.',
        returnUrl: req.body.returnUrl || '/',
      });
    }
  }
);

// ── Logout ────────────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.userId = null;
  req.session.userName = null;
  req.session.userEmail = null;
  res.clearCookie('rememberMe');
  res.redirect('/');
});

module.exports = router;
