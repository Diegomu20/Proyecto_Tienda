const fs = require('fs').promises;
const path = require('path');
const DB_PATH = path.join(__dirname, '../data/products.json');

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
  getAll: readDB,
  getById: async (id) => (await readDB()).find(p => p.id === parseInt(id)),
  create: async (product) => {
    const products = await readDB();
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct = { id: newId, ...product, precio: Number(product.precio), stock: Number(product.stock || 0) };
    products.push(newProduct);
    await writeDB(products);
    return newProduct;
  },
  update: async (id, updates) => {
    const products = await readDB();
    const idx = products.findIndex(p => p.id === parseInt(id));
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates, precio: Number(updates.precio || products[idx].precio), stock: Number(updates.stock || products[idx].stock) };
    await writeDB(products);
    return products[idx];
  },
  remove: async (id) => {
    const products = await readDB();
    const filtered = products.filter(p => p.id !== parseInt(id));
    if (filtered.length === products.length) return null;
    await writeDB(filtered);
    return true;
  }
};