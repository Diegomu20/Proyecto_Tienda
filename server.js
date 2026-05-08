// server.js
const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const cookieParser = require("cookie-parser"); // ← NUEVO para "remember me"
const db = require("./utils/jsonDb");
const userDb = require("./utils/userDb"); // ← NUEVO
const authAdmin = require("./middleware/authAdmin");
const authUser = require("./middleware/authUser"); // ← NUEVO
const checkGuest = require("./middleware/checkGuest"); // ← NUEVO

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Configuración
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); // ← NUEVO: para leer cookies de "remember me"

// 🔹 Session
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'agro-secret-dev',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// 🔹 Middleware global: restaurar sesión desde "remember me" + exponer usuario a vistas
app.use(async (req, res, next) => {
  // Si no hay sesión pero sí cookie "rememberMe", restaurar usuario
  if (!req.session.userId && req.cookies.rememberMe) {
    try {
      const user = await userDb.findById(parseInt(req.cookies.rememberMe));
      if (user) {
        req.session.userId = user.id;
        req.session.userName = user.nombre;
        req.session.userEmail = user.email;
      }
    } catch (err) {
      console.error('Error restaurando sesión:', err);
    }
  }
  
  // Hacer usuario disponible en TODAS las vistas EJS
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    nombre: req.session.userName,
    email: req.session.userEmail
  } : null;
  
  next();
});

// 🔹 Multer para uploads (sin cambios)
const uploadDir = path.join(__dirname, "public/img/uploads");
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i;
    cb(null, allowed.test(path.extname(file.originalname)) && allowed.test(file.mimetype));
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

// 🔹 RUTAS DE AUTENTICACIÓN (Sprint 5) 🆕
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// 🔹 RUTAS PÚBLICAS 🛒

// 🏠 Home
app.get("/", async (req, res) => {
  try {
    const allProducts = await db.getAll();
    const featured = allProducts.slice(0, 4);
    res.render("pages/index", { 
      featuredProducts: featured,
      categorias: ["agricola", "veterinaria", "ferreteria"]
    });
  } catch (err) {
    console.error("Error en home:", err);
    res.render("pages/index", { featuredProducts: [], categorias: [] });
  }
});

// 📦 Catálogo PÚBLICO
app.get("/productos", async (req, res) => {
  try {
    let products = await db.getAll();
    const { categoria, buscar } = req.query;
    if (categoria && categoria !== "todos") {
      products = products.filter(p => p.categoria === categoria);
    }
    if (buscar) {
      products = products.filter(p => p.nombre.toLowerCase().includes(buscar.toLowerCase()));
    }
    res.render("pages/productos", { 
      products, 
      categoria: categoria || "todos", 
      buscar: buscar || "",
      isAdmin: false
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).render("pages/productos", { products: [], error: "Error al cargar", categoria: "todos", buscar: "", isAdmin: false });
  }
});

// 🛒 Carrito (público)
app.get("/carrito", (req, res) => res.render("pages/carrito", { carrito: [] }));

// 👤 Mi Cuenta (SOLO usuarios logueados) 🆕
app.get("/mi-cuenta", authUser, async (req, res) => {
  try {
    // Aquí podrías cargar historial de compras, datos del usuario, etc.
    res.render("pages/account", { 
      user: { 
        id: req.session.userId, 
        nombre: req.session.userName, 
        email: req.session.userEmail 
      } 
    });
  } catch (err) {
    res.redirect('/login');
  }
});

// 🔹 RUTAS ADMIN 🔐 (sin cambios en lógica, solo aseguramos que funcionen)

// Login simulado para pruebas (solo desarrollo - eliminar en producción)
app.get("/admin/login", (req, res) => {
  req.session.isAdmin = true;
  res.redirect("/admin");
});

// Logout admin
app.get("/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/");
});

// Dashboard admin
app.get("/admin", authAdmin, async (req, res) => {
  try {
    const products = await db.getAll();
    res.render("admin/dashboard", { products });
  } catch (err) {
    res.status(500).render("pages/error", { message: "Error al cargar dashboard" });
  }
});

// Crear producto (admin)
app.get("/admin/crear", authAdmin, (req, res) => {
  res.render("admin/crear", { error: null, product: {}, categorias: ["agricola","veterinaria","ferreteria"] });
});

app.post("/admin/crear", authAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, categoria, precio, stock } = req.body;
    if (!nombre?.trim() || !categoria || !precio || precio <= 0) {
      return res.status(400).render("admin/crear", { error: "Datos inválidos", product: req.body, categorias: ["agricola","veterinaria","ferreteria"] });
    }
    const imagen = req.file ? `uploads/${req.file.filename}` : "default.jpg";
    await db.create({ nombre: nombre.trim(), categoria, precio: Number(precio), stock: Number(stock)||0, imagen });
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).render("admin/crear", { error: "Error interno", product: req.body, categorias: ["agricola","veterinaria","ferreteria"] });
  }
});

// Editar producto (admin)
app.get("/admin/editar/:id", authAdmin, async (req, res) => {
  try {
    const product = await db.getById(req.params.id);
    if (!product) return res.status(404).render("pages/error", { message: "No encontrado" });
    res.render("admin/editar", { product, error: null, categorias: ["agricola","veterinaria","ferreteria"] });
  } catch (err) {
    res.status(500).render("pages/error", { message: "Error al cargar" });
  }
});

app.post("/admin/editar/:id", authAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, categoria, precio, stock } = req.body;
    const product = await db.getById(req.params.id);
    if (!product) return res.status(404).render("pages/error", { message: "No encontrado" });
    const imagen = req.file ? `uploads/${req.file.filename}` : product.imagen;
    await db.update(req.params.id, { nombre: nombre.trim(), categoria, precio: Number(precio), stock: Number(stock)||0, imagen });
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).render("admin/editar", { error: "Error al actualizar", product: req.body, categorias: ["agricola","veterinaria","ferreteria"] });
  }
});

// Eliminar producto (admin)
app.post("/admin/eliminar/:id", authAdmin, async (req, res) => {
  try {
    const product = await db.getById(req.params.id);
    if (product?.imagen && product.imagen !== 'default.jpg') {
      const oldPath = path.join(__dirname, 'public/img', product.imagen);
      await fs.unlink(oldPath).catch(() => {});
    }
    await db.remove(req.params.id);
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al eliminar");
  }
});

// 404
app.use((req, res) => res.status(404).render("pages/error", { message: "Página no encontrada" }));

// 🔹 Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor en http://localhost:${PORT}`);
  console.log(`🔐 Admin: /admin (visita /admin/login?demo=1 para activar)`);
  console.log(`👤 Auth: /login | /register | /mi-cuenta`);
});

