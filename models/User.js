'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }
    
    static associate(models) {
      User.hasMany(models.Order, { 
        foreignKey: 'userId', 
        as: 'orders', 
        onDelete: 'CASCADE' 
      });
    }
  }

  User.init({
    nombre: { 
      type: DataTypes.STRING(100), 
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] }
    },
    email: { 
      type: DataTypes.STRING(100), 
      allowNull: false, 
      unique: true,
      validate: { isEmail: true, notEmpty: true }
    },
    password: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      validate: { len: [6, 255] }
    },
    profileImage: { 
      type: DataTypes.STRING(255), 
      defaultValue: 'default-avatar.png' 
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  return User;
};