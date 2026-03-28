-- Canonical SQLite schema for the hardware store application.
-- Connection-level pragmas are configured in backend/db.js.

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  imageUrl TEXT,
  imageUrls TEXT,
  specs TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  firstName TEXT,
  lastName TEXT,
  username TEXT,
  phone TEXT,
  position TEXT,
  salary INTEGER,
  nickname TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

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
  userId INTEGER,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS user_favorites (
  userId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (userId, productId),
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_brand
ON products(brand);

CREATE INDEX IF NOT EXISTS idx_product_reviews_productId
ON product_reviews(productId);

CREATE INDEX IF NOT EXISTS idx_order_items_orderId
ON order_items(orderId);

CREATE INDEX IF NOT EXISTS idx_order_items_productId
ON order_items(productId);

CREATE INDEX IF NOT EXISTS idx_orders_userId_createdAt
ON orders(userId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_createdAt
ON orders(status, createdAt DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paymentCode_unique
ON orders(paymentCode)
WHERE paymentCode IS NOT NULL AND TRIM(paymentCode) <> '';
