// server.js
const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const multer = require("multer");
const cookieParser = require("cookie-parser");
const session = require("express-session");
 
// ✅ MODELOS SEQUELIZE (reemplazan a jsonDb y userDb)
const { User, Product } = require('./models');
 
// Middlewares
const authUser = require("./middleware/authUser");
 
const app = express();
const PORT = process.env.PORT || 3000;
 
// 🔹 Configuración EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
 
// 🔹 Middleware base
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
 
// 🔹 Session
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
  if (!req.session.userId && req.cookies.rememberMe) {
    try {
      // ✅ SEQUELIZE: Buscar usuario por ID
      const user = await User.findByPk(parseInt(req.cookies.rememberMe));
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
 
// 🔹 Multer para uploads de PRODUCTOS
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
 
// 🔹 Multer para uploads de PERFIL DE USUARIO (para routes/auth.js)
const profileUploadDir = path.join(__dirname, "public/img/profiles");
fs.mkdir(profileUploadDir, { recursive: true }).catch(console.error);
 
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "profile-" + Date.now() + ext);
  }
});
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i;
    cb(null, allowed.test(path.extname(file.originalname)) && allowed.test(file.mimetype));
  },
  limits: { fileSize: 1 * 1024 * 1024 }
});
 
// 🔹 Pasar uploadProfile a routes/auth.js (para que funcione el registro con foto)
app.use((req, res, next) => {
  req.uploadProfile = uploadProfile;
  next();
});
 
//RUTAS DE AUTENTICACIÓN
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);
 
const productRoutes = require('./routes/products');
app.use('/', productRoutes);
 
const adminRoutes = require('./routes/admin');
app.use('/', adminRoutes(upload));
 
const orderRoutes = require('./routes/orders');
app.use('/', orderRoutes);
 
// 🔹 RUTAS PÚBLICAS 🛒
 
// 🏠 Home (con productos destacados desde Sequelize)
app.get("/", async (req, res) => {
  try {
    // ✅ SEQUELIZE: Traer últimos 4 productos
    const featured = await Product.findAll({ 
      order: [['createdAt', 'DESC']], 
      limit: 4 
    });
    
    res.render("pages/index", { 
      featuredProducts: featured,
      categorias: ["agricola", "veterinaria", "ferreteria"]
    });
  } catch (err) {
    console.error("Error en home:", err);
    res.render("pages/index", { featuredProducts: [], categorias: [] });
  }
});
 
// 🛒 Carrito (público)
app.get("/carrito", (req, res) => res.render("pages/carrito", { carrito: [] }));
 
// 👤 Mi Cuenta (SOLO usuarios logueados)
app.get("/mi-cuenta", authUser, async (req, res) => {
  try {
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
 
// 📸 Actualizar foto de perfil (SOLO usuarios logueados)
app.post("/mi-cuenta/update", authUser, uploadProfile.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.redirect('/mi-cuenta');
    
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect('/login');
    
    // Eliminar foto anterior si no es default
    if (user.profileImage && user.profileImage !== 'default-avatar.png') {
      const oldPath = path.join(__dirname, 'public/img', user.profileImage);
      await fs.unlink(oldPath).catch(() => {});
    }
    
    // ✅ SEQUELIZE: Actualizar solo el campo profileImage
    await user.update({ profileImage: `profiles/${req.file.filename}` });
    
    req.session.userProfileImage = `profiles/${req.file.filename}`;
    res.redirect('/mi-cuenta');
  } catch (err) {
    console.error('Error actualizando foto:', err);
    res.redirect('/mi-cuenta');
  }
});
 
// ✅ Página de confirmación de compra
app.get("/confirmacion", (req, res) => {
  const { orderId, medioPago } = req.query;
  if (!orderId) return res.redirect('/');
  res.render("pages/confirmacion", {
    orderId,
    medioPago: medioPago || 'Efectivo'
  });
});
 
// 📄 Páginas legales
app.get("/terminos", (req, res) => res.render("pages/terminos"));
app.get("/politica-datos", (req, res) => res.render("pages/politica-datos"));
 
// 404
app.use((req, res) => res.status(404).render("pages/error", { message: "Página no encontrada" }));
 
// 🔹 Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor en http://localhost:${PORT}`);
  console.log(`🔐 Admin: /admin (visita /admin/login?demo=1 para activar)`);
  console.log(`👤 Auth: /login | /register | /mi-cuenta`);
  console.log(`📊 DB: MySQL con Sequelize`);
});