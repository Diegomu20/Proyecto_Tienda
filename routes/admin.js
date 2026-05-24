// routes/admin.js — Sprint 7: validaciones back-end con express-validator
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const { Product } = require('../models');
const authAdmin = require('../middleware/authAdmin');
const {
  validateProducto,
  handleProductoErrors,
} = require('../middleware/validators');

const CATEGORIAS = ['agricola', 'veterinaria', 'ferreteria'];

// Helper: validar tipo de imagen subida por multer
const checkImageType = (req, res, next) => {
  if (!req.file) return next(); // imagen opcional en editar
  const allowed = /\.(jpg|jpeg|png|gif)$/i;
  if (!allowed.test(req.file.originalname)) {
    return res.status(400).render('admin/crear', {
      error: 'La imagen debe ser JPG, JPEG, PNG o GIF.',
      product: req.body,
      categorias: CATEGORIAS,
    });
  }
  next();
};

module.exports = (upload) => {

  // ── Login simulado (demo) ────────────────────────────────────────────────
  router.get('/admin/login', (req, res) => {
    req.session.isAdmin = true;
    res.redirect('/admin');
  });

  router.get('/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/');
  });

  // ── Dashboard ────────────────────────────────────────────────────────────
  router.get('/admin', authAdmin, async (req, res) => {
    try {
      const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
      res.render('admin/dashboard', { products });
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      res.status(500).render('pages/error', { message: 'Error al cargar dashboard' });
    }
  });

  // ── Formulario crear ─────────────────────────────────────────────────────
  router.get('/admin/crear', authAdmin, (req, res) => {
    res.render('admin/crear', { error: null, product: {}, categorias: CATEGORIAS });
  });

  // ── Crear producto ───────────────────────────────────────────────────────
  router.post(
    '/admin/crear',
    authAdmin,
    // 1) Subir imagen
    upload.single('imagen'),
    // 2) Validar tipo de imagen
    checkImageType,
    // 3) Validar imagen obligatoria en creación
    (req, res, next) => {
      if (!req.file) {
        return res.status(400).render('admin/crear', {
          error: 'La imagen del producto es obligatoria.',
          product: req.body,
          categorias: CATEGORIAS,
        });
      }
      next();
    },
    // 4) Validar campos del formulario
    validateProducto,
    handleProductoErrors('admin/crear'),
    // 5) Guardar en BD
    async (req, res) => {
      try {
        const { nombre, descripcion, categoria, precio, stock } = req.body;
        const imagen = `uploads/${req.file.filename}`;

        await Product.create({
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          categoria,
          precio: Number(precio),
          stock: Number(stock) || 0,
          imagen,
        });

        res.redirect('/admin');
      } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).render('admin/crear', {
          error: 'Error interno al guardar el producto.',
          product: req.body,
          categorias: CATEGORIAS,
        });
      }
    }
  );

  // ── Formulario editar ────────────────────────────────────────────────────
  router.get('/admin/editar/:id', authAdmin, async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).render('pages/error', { message: 'Producto no encontrado' });
      }
      res.render('admin/editar', { product, error: null, categorias: CATEGORIAS });
    } catch (error) {
      console.error('Error al cargar producto:', error);
      res.status(500).render('pages/error', { message: 'Error al cargar producto' });
    }
  });

  // ── Editar producto ──────────────────────────────────────────────────────
  router.post(
    '/admin/editar/:id',
    authAdmin,
    // 1) Subir imagen (opcional en editar)
    upload.single('imagen'),
    // 2) Validar tipo de imagen si se subió una
    checkImageType,
    // 3) Validar campos
    validateProducto,
    // Manejador de error especial para editar (necesita el product de BD)
    async (req, res, next) => {
      const { validationResult } = require('express-validator');
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Recuperar el producto original para mostrar la vista de edición
        try {
          const product = await Product.findByPk(req.params.id);
          return res.status(400).render('admin/editar', {
            error: errors.array()[0].msg,
            product: { ...product?.dataValues, ...req.body, id: req.params.id },
            categorias: CATEGORIAS,
          });
        } catch {
          return res.status(400).render('pages/error', { message: 'Error de validación' });
        }
      }
      next();
    },
    // 4) Guardar cambios
    async (req, res) => {
      try {
        const { nombre, descripcion, categoria, precio, stock } = req.body;
        const product = await Product.findByPk(req.params.id);

        if (!product) {
          return res.status(404).render('pages/error', { message: 'Producto no encontrado' });
        }

        const imagen = req.file ? `uploads/${req.file.filename}` : product.imagen;

        await product.update({
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          categoria,
          precio: Number(precio),
          stock: Number(stock) || 0,
          imagen,
        });

        res.redirect('/admin');
      } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).render('pages/error', { message: 'Error al actualizar producto' });
      }
    }
  );

  // ── Eliminar producto ────────────────────────────────────────────────────
  router.post('/admin/eliminar/:id', authAdmin, async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) return res.redirect('/admin');

      if (product.imagen && product.imagen !== 'default.jpg') {
        const imagePath = path.join(__dirname, '..', 'public', 'img', product.imagen);
        await fs.unlink(imagePath).catch(() => {});
      }

      await product.destroy();
      res.redirect('/admin');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).send('Error al eliminar producto');
    }
  });

  return router;
};
