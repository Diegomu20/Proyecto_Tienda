const express = require("express");
const path = require("path");

const app = express();

// Configurar EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

//RUTAS

// Inicio
app.get("/", (req, res) => {
  res.render("pages/index");
});

// Productos (SIN enviar productos, porque los maneja main.js)
app.get("/productos", (req, res) => {
  res.render("pages/productos");
});

// Crear producto
app.get("/productos/crear", (req, res) => {
  res.render("pages/crear");
});

// Guardar producto
app.post("/productos", (req, res) => {
  const { nombre, precio } = req.body;

  console.log("Producto creado:", nombre, precio);

  res.redirect("/productos");
});

// Carrito
app.get("/carrito", (req, res) => {
  const carrito = [];
  res.render("pages/carrito", { carrito });
});

//EDITAR PRODUCTO
app.get("/productos/editar/:id", (req, res) => {

  const producto = {
    id: req.params.id,
    nombre: "Producto " + req.params.id,
    precio: 1000 * req.params.id
  };

  res.render("pages/editar", { producto });
});

// Procesar edición
app.post("/productos/editar/:id", (req, res) => {

  const { nombre, precio } = req.body;

  console.log("Producto actualizado:", nombre, precio);

  res.redirect("/productos");
});

// Servidor
app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});