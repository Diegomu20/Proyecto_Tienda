const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const DB_PATH = path.join(__dirname, '../data/users.json');

async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  findAll: readDB,
  
  findById: async (id) => (await readDB()).find(u => u.id === parseInt(id)),
  
  findByEmail: async (email) => (await readDB()).find(u => u.email === email),
  
  create: async (userData) => {
    const users = await readDB();
    const existing = users.find(u => u.email === userData.email);
    if (existing) throw new Error('El email ya está registrado');
    
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
    
    const newUser = {
      id: newId,
      nombre: userData.nombre,
      email: userData.email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await writeDB(users);
    
    // No devolver la contraseña
    const { password, ...userWithoutPass } = newUser;
    return userWithoutPass;
  },
  
  validatePassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};