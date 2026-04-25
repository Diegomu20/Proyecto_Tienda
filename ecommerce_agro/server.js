// server.js
const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const db = require("./utils/jsonDb");
const authAdmin = require("./middleware/authAdmin");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Configuración
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🔹 Session simple (para simular login)
const session = require('express-session');
app.use(session({
  secret: 'agro-secret-dev', // En producción: variable de entorno
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // true si usas HTTPS
}));

// 🔹 Multer para uploads
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

// 🔹 RUTAS PÚBLICAS 🛒

// 🏠 Home
app.get("/", async (req, res) => {
  try {
    const allProducts = await db.getAll();
    
    // Tomamos los primeros 4 (o usa .sort() para aleatorios)
    const featured = allProducts.slice(0, 4);
    
    // ✅ IMPORTANTE: Enviar 'featuredProducts' a la vista
    res.render("pages/index", { 
      featuredProducts: featured,
      categorias: ["agricola", "veterinaria", "ferreteria"]
    });
  } catch (err) {
    console.error("Error en home:", err);
    // ✅ Fallback: enviar array vacío para que no rompa el EJS
    res.render("pages/index", { 
      featuredProducts: [], 
      categorias: [] 
    });
  }
});

// 📦 Catálogo PÚBLICO: solo ver + agregar al carrito
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
    // ✅ Renderiza sin botones de admin
    res.render("pages/productos", { 
      products, 
      categoria: categoria || "todos", 
      buscar: buscar || "",
      isAdmin: false // ← Importante para la vista
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).render("pages/productos", { products: [], error: "Error al cargar", categoria: "todos", buscar: "", isAdmin: false });
  }
});

app.get("/carrito", (req, res) => res.render("pages/carrito", { carrito: [] }));

// 🔹 RUTAS ADMIN 🔐 (protegidas)

// Login simulado para pruebas (elimina en producción)
app.get("/admin/login", (req, res) => {
  req.session.isAdmin = true;
  res.redirect("/admin");
});

// Logout
app.get("/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/");
});

// Dashboard admin: lista con acciones CRUD
app.get("/admin", authAdmin, async (req, res) => {
  try {
    const products = await db.getAll();
    res.render("admin/dashboard", { products });
  } catch (err) {
    res.status(500).render("pages/error", { message: "Error al cargar dashboard" });
  }
});

// Crear
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

// Editar
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

// Eliminar
app.post("/admin/eliminar/:id", authAdmin, async (req, res) => {
  try {
    const product = await db.getById(req.params.id);
    // Eliminar imagen asociada si no es default
    if (product?.imagen && product.imagen !== 'default.jpg') {
      const oldPath = path.join(__dirname, 'public/img', product.imagen);
      await fs.unlink(oldPath).catch(() => {}); // Silencioso
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

app.listen(PORT, () => {
  console.log(`✅ Servidor en http://localhost:${PORT}`);
  console.log(`🔐 Admin: /admin (visita /admin/login?demo=1 para activar)`);
});

