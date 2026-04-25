const express = require('express');
const router = express.Router();
const db = require('../utils/jsonDb');

// 📖 Listar productos (con filtros)
router.get('/', async (req, res) => {
  let products = await db.getAll();
  const { categoria, buscar } = req.query;
  
  if (categoria && categoria !== 'todos') {
    products = products.filter(p => p.categoria === categoria);
  }
  if (buscar) {
    products = products.filter(p => p.nombre.toLowerCase().includes(buscar.toLowerCase()));
  }
  
  res.render('pages/productos', { products, categoria: categoria || 'todos', buscar: buscar || '' });
});

// ➕ Mostrar formulario crear
router.get('/crear', (req, res) => {
  res.render('pages/crear', { error: null, product: {}, categorias: ['agricola','veterinaria','ferreteria'] });
});

// 💾 Guardar nuevo producto
router.post('/crear', async (req, res) => {
  try {
    const { nombre, categoria, precio, stock, imagen } = req.body;
    if (!nombre || !categoria || !precio || precio <= 0) {
      return res.status(400).render('pages/crear', { error: 'Completa nombre, categoría y precio válido.', product: req.body, categorias: ['agricola','veterinaria','ferreteria'] });
    }
    await db.create({ nombre, categoria, precio, stock, imagen: imagen || 'default.jpg' });
    res.redirect('/productos');
  } catch (err) {
    res.status(500).render('pages/crear', { error: 'Error al guardar en BD.', product: req.body, categorias: ['agricola','veterinaria','ferreteria'] });
  }
});

// ✏️ Mostrar formulario editar
router.get('/editar/:id', async (req, res) => {
  const product = await db.getById(req.params.id);
  if (!product) return res.status(404).render('error', { message: 'Producto no encontrado' });
  res.render('pages/editar', { product, error: null, categorias: ['agricola','veterinaria','ferreteria'] });
});

// 🔄 Actualizar producto
router.post('/editar/:id', async (req, res) => {
  try {
    const updated = await db.update(req.params.id, req.body);
    if (!updated) return res.status(404).render('error', { message: 'No encontrado' });
    res.redirect('/productos');
  } catch (err) {
    res.status(500).render('pages/editar', { error: 'Error al actualizar', product: req.body, categorias: ['agricola','veterinaria','ferreteria'] });
  }
});

// 🗑️ Eliminar producto
router.post('/eliminar/:id', async (req, res) => {
  await db.remove(req.params.id);
  res.redirect('/productos');
});

module.exports = router;