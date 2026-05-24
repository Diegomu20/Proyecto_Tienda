// middleware/validators.js
// Sprint 7 — Validaciones de back-end con express-validator

const { body, validationResult } = require('express-validator');

// ─── Helper: extrae errores y los manda a la vista ───────────────────────────
const handleValidationErrors = (viewName, extraData = {}) => (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Tomamos solo el primer mensaje de error para mostrarlo en el error-box
    const errorMsg = errors.array()[0].msg;
    return res.status(400).render(viewName, {
      error: errorMsg,
      success: null,
      ...extraData(req)
    });
  }
  next();
};

// ─── Reglas: Registro de usuario ─────────────────────────────────────────────
const validateRegister = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres.'),

  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio.')
    .isEmail().withMessage('El email no tiene un formato válido.'),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una letra mayúscula.')
    .matches(/[a-z]/).withMessage('La contraseña debe tener al menos una letra minúscula.')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número.')
    .matches(/[^A-Za-z0-9]/).withMessage('La contraseña debe contener al menos un carácter especial (ej: @, #, !).'),

  body('confirmPassword')
    .notEmpty().withMessage('Debes confirmar tu contraseña.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
];

const handleRegisterErrors = handleValidationErrors('pages/register', () => ({}));

// ─── Reglas: Login de usuario ─────────────────────────────────────────────────
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio.')
    .isEmail().withMessage('Ingresa un email con formato válido.'),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

const handleLoginErrors = handleValidationErrors('pages/login', (req) => ({
  returnUrl: req.body.returnUrl || '/'
}));

// ─── Reglas: Crear producto (admin) ──────────────────────────────────────────
const validateProducto = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre del producto es obligatorio.')
    .isLength({ min: 5 }).withMessage('El nombre debe tener al menos 5 caracteres.'),

  body('descripcion')
    .optional({ checkFalsy: true })
    .isLength({ min: 20 }).withMessage('La descripción debe tener al menos 20 caracteres.'),

  body('categoria')
    .notEmpty().withMessage('La categoría es obligatoria.')
    .isIn(['agricola', 'veterinaria', 'ferreteria']).withMessage('Categoría no válida.'),

  body('precio')
    .notEmpty().withMessage('El precio es obligatorio.')
    .isFloat({ min: 0.01 }).withMessage('El precio debe ser mayor a 0.'),

  body('stock')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('El stock no puede ser negativo.'),
];

const handleProductoErrors = (viewName) =>
  handleValidationErrors(viewName, (req) => ({
    product: req.body,
    categorias: ['agricola', 'veterinaria', 'ferreteria']
  }));

// ─── Validación de imagen (archivo) ──────────────────────────────────────────
const validateImageFile = (fieldName, required = false) => (req, res, next) => {
  if (!req.file) {
    if (required) {
      // Detectar qué vista usar según la ruta
      const isAdmin = req.path.includes('admin') || req.originalUrl.includes('admin');
      const viewName = isAdmin ? 'admin/crear' : 'pages/register';
      const extraData = isAdmin
        ? { product: req.body, categorias: ['agricola', 'veterinaria', 'ferreteria'] }
        : { success: null };
      return res.status(400).render(viewName, {
        error: 'La imagen es obligatoria.',
        ...extraData
      });
    }
    return next(); // imagen opcional → seguir
  }

  const allowed = /\.(jpg|jpeg|png|gif)$/i;
  if (!allowed.test(req.file.originalname)) {
    const isAdmin = req.path.includes('admin') || req.originalUrl.includes('admin');
    const viewName = isAdmin ? 'admin/crear' : 'pages/register';
    const extraData = isAdmin
      ? { product: req.body, categorias: ['agricola', 'veterinaria', 'ferreteria'] }
      : { success: null };
    return res.status(400).render(viewName, {
      error: 'La imagen debe ser JPG, JPEG, PNG o GIF.',
      ...extraData
    });
  }

  next();
};

module.exports = {
  validateRegister,
  handleRegisterErrors,
  validateLogin,
  handleLoginErrors,
  validateProducto,
  handleProductoErrors,
  validateImageFile,
};
