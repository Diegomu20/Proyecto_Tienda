// routes/orders.js — Sprint 7 Extra: Factura electrónica PDF
const express = require('express');
const router = express.Router();

const { Order, OrderItem, Product, User, sequelize } = require('../models');
const authUser = require('../middleware/authUser');
const { generarFacturaPDF } = require('../utils/factura');

// ── POST /checkout — Crear orden ─────────────────────────────────────────────
router.post('/checkout', authUser, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { items, medioPago } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ ok: false, message: 'El carrito está vacío' });
    }

    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.id, { transaction });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ ok: false, message: `Producto no encontrado: ${item.nombre || item.id}` });
      }

      const cantidad = Number(item.cantidad) || 1;

      if (cantidad <= 0) {
        await transaction.rollback();
        return res.status(400).json({ ok: false, message: 'Cantidad inválida' });
      }

      if (product.stock < cantidad) {
        await transaction.rollback();
        return res.status(400).json({ ok: false, message: `Stock insuficiente para ${product.nombre}` });
      }

      const precioUnitario = Number(product.precio);
      total += precioUnitario * cantidad;
      orderItemsData.push({ product, cantidad, precioUnitario });
    }

    // Guardar medio de pago en la orden (campo JSON o string)
    const order = await Order.create({
      userId: req.session.userId,
      total,
      estado: 'pendiente',
      medioPago: medioPago || 'Efectivo'
    }, { transaction });

    for (const item of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.product.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario
      }, { transaction });

      await item.product.update(
        { stock: item.product.stock - item.cantidad },
        { transaction }
      );
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
    res.status(500).json({ ok: false, message: 'Error al finalizar la compra' });
  }
});

// ── GET /factura/:id — Descargar factura PDF ──────────────────────────────────
router.get('/factura/:id', authUser, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.session.userId },
      include: [{
        model: OrderItem,
        as: 'orderItems',
        include: [{ model: Product, as: 'product' }]
      }]
    });

    if (!order) {
      return res.status(404).render('pages/error', {
        message: 'Factura no encontrada',
      });
    }

    const cliente = await User.findByPk(req.session.userId);

    // Headers para descarga de PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="factura-${String(order.id).padStart(6,'0')}.pdf"`
    );

    generarFacturaPDF({
      orden: {
        id: order.id,
        total: order.total,
        estado: order.estado,
        medioPago: order.medioPago || 'Efectivo',
        createdAt: order.createdAt
      },
      cliente: {
        nombre: cliente?.nombre || 'Cliente',
        email: cliente?.email || '',
        createdAt: cliente?.createdAt
      },
      items: order.orderItems,
      medioPago: order.medioPago || 'Efectivo'
    }, res);

  } catch (error) {
    console.error('Error al generar factura:', error);
    res.status(500).render('pages/error', { message: 'Error al generar la factura' });
  }
});

module.exports = router;
