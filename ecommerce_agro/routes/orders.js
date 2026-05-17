const express = require('express');
const router = express.Router();

const { Order, OrderItem, Product, sequelize } = require('../models');
const authUser = require('../middleware/authUser');

router.post('/checkout', authUser, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();

      return res.status(400).json({
        ok: false,
        message: 'El carrito está vacío'
      });
    }

    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.id, { transaction });

      if (!product) {
        await transaction.rollback();

        return res.status(404).json({
          ok: false,
          message: `Producto no encontrado: ${item.nombre || item.id}`
        });
      }

      const cantidad = Number(item.cantidad) || 1;

      if (cantidad <= 0) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          message: 'Cantidad inválida'
        });
      }

      if (product.stock < cantidad) {
        await transaction.rollback();

        return res.status(400).json({
          ok: false,
          message: `Stock insuficiente para ${product.nombre}`
        });
      }

      const precioUnitario = Number(product.precio);
      total += precioUnitario * cantidad;

      orderItemsData.push({
        product,
        cantidad,
        precioUnitario
      });
    }

    const order = await Order.create({
      userId: req.session.userId,
      total,
      estado: 'pendiente'
    }, { transaction });

    for (const item of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.product.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario
      }, { transaction });

      await item.product.update({
        stock: item.product.stock - item.cantidad
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      ok: true,
      message: 'Compra registrada correctamente',
      orderId: order.id
    });
  } catch (error) {
    await transaction.rollback();

    console.error('Error al finalizar compra:', error);

    res.status(500).json({
      ok: false,
      message: 'Error al finalizar la compra'
    });
  }
});

module.exports = router;