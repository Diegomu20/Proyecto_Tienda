CREATE DATABASE IF NOT EXISTS agroferre_db;
USE agroferre_db;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profileImage VARCHAR(255) DEFAULT 'default-avatar.png',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS products (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  categoria ENUM('agricola', 'veterinaria', 'ferreteria') NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  imagen VARCHAR(255) DEFAULT 'default.jpg',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente', 'pagado', 'enviado', 'entregado') DEFAULT 'pendiente',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (userId) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT NOT NULL AUTO_INCREMENT,
  orderId INT NOT NULL,
  productId INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precioUnitario DECIMAL(10,2) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (orderId) REFERENCES orders(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (productId) REFERENCES products(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);