const express = require('express');
const router = express.Router();
const { Product } = require('../models');

router.get('/productos', async (req, res) => {
  try {
    const { categoria, buscar, search } = req.query;
    const textoBusqueda = buscar || search || '';

    let products = await Product.findAll({
      order: [['createdAt', 'DESC']]
    });

    if (categoria && categoria !== 'todos') {
      products = products.filter(product => product.categoria === categoria);
    }

    if (textoBusqueda) {
      products = products.filter(product =>
        product.nombre.toLowerCase().includes(textoBusqueda.toLowerCase())
      );
    }

    res.render('pages/productos', {
      products,
      categoria: categoria || 'todos',
      buscar: textoBusqueda,
      isAdmin: false
    });
  } catch (error) {
    console.error('Error al cargar productos:', error);

    res.status(500).render('pages/productos', {
      products: [],
      categoria: 'todos',
      buscar: '',
      isAdmin: false,
      error: 'Error al cargar productos'
    });
  }
});

module.exports = router;