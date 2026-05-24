'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, { 
        foreignKey: 'userId', 
        as: 'user' 
      });
      Order.hasMany(models.OrderItem, { 
        foreignKey: 'orderId', 
        as: 'orderItems', 
        onDelete: 'CASCADE' 
      });
    }
  }

  Order.init({
    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    total: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: { min: 0, isDecimal: true }
    },
    estado: { 
      type: DataTypes.ENUM('pendiente', 'pagado', 'enviado', 'entregado'), 
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'pagado', 'enviado', 'entregado']] }
    },
    medioPago: {
      type: DataTypes.STRING(50),
      defaultValue: 'Efectivo',
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};