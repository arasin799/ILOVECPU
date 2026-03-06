const Database = require("better-sqlite3");

// สร้างไฟล์ DB ชื่อ store.db ในโฟลเดอร์ backend อัตโนมัติ
const db = new Database("store.db");

// สร้างตาราง products (ถ้ายังไม่มี)
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  imageUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerName TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  slipUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL,
  FOREIGN KEY(orderId) REFERENCES orders(id),
  FOREIGN KEY(productId) REFERENCES products(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

try {
  db.prepare("ALTER TABLE orders ADD COLUMN userId INTEGER").run();
} catch (e) {
  // column exists already -> ignore
}

module.exports = db;

