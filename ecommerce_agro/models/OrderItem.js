'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      OrderItem.belongsTo(models.Order, { 
        foreignKey: 'orderId', 
        as: 'order' 
      });
      OrderItem.belongsTo(models.Product, { 
        foreignKey: 'productId', 
        as: 'product' 
      });
    }
  }

  OrderItem.init({
    orderId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: { model: 'orders', key: 'id' }
    },
    productId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: { model: 'products', key: 'id' }
    },
    cantidad: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 1,
      validate: { min: 1, isInt: true }
    },
    precioUnitario: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: { min: 0, isDecimal: true }
    }
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true
  });

  return OrderItem;
};