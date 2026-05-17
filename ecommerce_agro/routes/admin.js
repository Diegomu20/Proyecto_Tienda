const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

const { Product } = require('../models');
const authAdmin = require('../middleware/authAdmin');

module.exports = (upload) => {
  // Login simulado para pruebas
  router.get('/admin/login', (req, res) => {
    req.session.isAdmin = true;
    res.redirect('/admin');
  });

  // Logout admin
  router.get('/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/');
  });

  // Dashboard admin
  router.get('/admin', authAdmin, async (req, res) => {
    try {
      const products = await Product.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.render('admin/dashboard', { products });
    } catch (error) {
      console.error('Error al cargar dashboard:', error);

      res.status(500).render('pages/error', {
        message: 'Error al cargar dashboard'
      });
    }
  });

  // Formulario crear producto
  router.get('/admin/crear', authAdmin, (req, res) => {
    res.render('admin/crear', {
      error: null,
      product: {},
      categorias: ['agricola', 'veterinaria', 'ferreteria']
    });
  });

  // Crear producto
  router.post('/admin/crear', authAdmin, upload.single('imagen'), async (req, res) => {
    try {
      const { nombre, categoria, precio, stock } = req.body;

      if (!nombre?.trim() || !categoria || !precio || Number(precio) <= 0) {
        return res.status(400).render('admin/crear', {
          error: 'Datos inválidos',
          product: req.body,
          categorias: ['agricola', 'veterinaria', 'ferreteria']
        });
      }

      const imagen = req.file ? `uploads/${req.file.filename}` : 'default.jpg';

      await Product.create({
        nombre: nombre.trim(),
        categoria,
        precio: Number(precio),
        stock: Number(stock) || 0,
        imagen
      });

      res.redirect('/admin');
    } catch (error) {
      console.error('Error al crear producto:', error);

      res.status(500).render('admin/crear', {
        error: 'Error interno',
        product: req.body,
        categorias: ['agricola', 'veterinaria', 'ferreteria']
      });
    }
  });

  // Formulario editar producto
  router.get('/admin/editar/:id', authAdmin, async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return res.status(404).render('pages/error', {
          message: 'Producto no encontrado'
        });
      }

      res.render('admin/editar', {
        product,
        error: null,
        categorias: ['agricola', 'veterinaria', 'ferreteria']
      });
    } catch (error) {
      console.error('Error al cargar producto:', error);

      res.status(500).render('pages/error', {
        message: 'Error al cargar producto'
      });
    }
  });

  // Editar producto
  router.post('/admin/editar/:id', authAdmin, upload.single('imagen'), async (req, res) => {
    try {
      const { nombre, categoria, precio, stock } = req.body;
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return res.status(404).render('pages/error', {
          message: 'Producto no encontrado'
        });
      }

      const imagen = req.file ? `uploads/${req.file.filename}` : product.imagen;

      await product.update({
        nombre: nombre.trim(),
        categoria,
        precio: Number(precio),
        stock: Number(stock) || 0,
        imagen
      });

      res.redirect('/admin');
    } catch (error) {
      console.error('Error al actualizar producto:', error);

      res.status(500).render('admin/editar', {
        error: 'Error al actualizar',
        product: req.body,
        categorias: ['agricola', 'veterinaria', 'ferreteria']
      });
    }
  });

  // Eliminar producto
  router.post('/admin/eliminar/:id', authAdmin, async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return res.redirect('/admin');
      }

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