'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      userId: { 
        type: Sequelize.INTEGER, 
        allowNull: false, 
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      estado: { type: Sequelize.ENUM('pendiente', 'pagado', 'enviado', 'entregado'), defaultValue: 'pendiente' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  }
};