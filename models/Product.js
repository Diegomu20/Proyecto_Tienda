'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      Product.hasMany(models.OrderItem, { 
        foreignKey: 'productId', 
        as: 'orderItems', 
        onDelete: 'CASCADE' 
      });
    }
  }

  Product.init({
    nombre: { 
      type: DataTypes.STRING(150), 
      allowNull: false,
      validate: { notEmpty: true, len: [2, 150] }
    },
    descripcion: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    categoria: { 
      type: DataTypes.ENUM('agricola', 'veterinaria', 'ferreteria'), 
      allowNull: false,
      validate: { isIn: [['agricola', 'veterinaria', 'ferreteria']] }
    },
    precio: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: { min: 0, isDecimal: true }
    },
    stock: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0,
      validate: { min: 0, isInt: true }
    },
    imagen: { 
      type: DataTypes.STRING(255), 
      defaultValue: 'default.jpg' 
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true
  });

  return Product;
};