const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Always use a single sqlite file path, regardless of the current working directory.
// You can override with DB_PATH if needed.
const defaultDbPath = path.join(__dirname, "store.db");
const resolvedDbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : defaultDbPath;

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

// One-time migration: if app used to create DB in project root, copy it to backend/store.db.
if (!process.env.DB_PATH) {
  const legacyDbPath = path.resolve(process.cwd(), "store.db");
  const shouldCopyLegacy =
    !fs.existsSync(defaultDbPath) &&
    fs.existsSync(legacyDbPath) &&
    path.resolve(legacyDbPath) !== path.resolve(defaultDbPath);

  if (shouldCopyLegacy) {
    fs.copyFileSync(legacyDbPath, defaultDbPath);
  }
}

const db = new Database(resolvedDbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  imageUrl TEXT,
  specs TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS product_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER NOT NULL,
  userId INTEGER,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
);
`);

db.exec(`
CREATE INDEX IF NOT EXISTS idx_product_reviews_productId
ON product_reviews(productId);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerName TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  paymentMethod TEXT,
  paymentCode TEXT,
  paymentVerifiedAt TEXT,
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

db.exec(`
CREATE TABLE IF NOT EXISTS account_deletion_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  email TEXT NOT NULL,
  firstName TEXT,
  lastName TEXT,
  username TEXT,
  phone TEXT,
  reason TEXT NOT NULL,
  deletedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  nickname TEXT NOT NULL,
  position TEXT NOT NULL,
  salary INTEGER NOT NULL,
  birthDate TEXT NOT NULL,
  hireDate TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

try {
  db.prepare("ALTER TABLE orders ADD COLUMN userId INTEGER").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN firstName TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN lastName TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN username TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN position TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN salary INTEGER").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE users ADD COLUMN nickname TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE products ADD COLUMN imageUrls TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE products ADD COLUMN specs TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE employees ADD COLUMN birthDate TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE employees ADD COLUMN hireDate TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE orders ADD COLUMN paymentMethod TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE orders ADD COLUMN paymentCode TEXT").run();
} catch {
  // column exists already
}

try {
  db.prepare("ALTER TABLE orders ADD COLUMN paymentVerifiedAt TEXT").run();
} catch {
  // column exists already
}

module.exports = db;
