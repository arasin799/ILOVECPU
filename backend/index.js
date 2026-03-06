const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "dev_secret_change_me";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ✅ API products
app.get("/api/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json(rows);
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG or JPEG images are allowed"), false);
    }
  }
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(row);
});

// ✅ list orders ของ user คนนี้ (Your Orders)
app.get("/api/my/orders", requireAuth, (req, res) => {
  const userId = req.user.id;

  const rows = db.prepare(
    "SELECT id, total, status, slipUrl, createdAt FROM orders WHERE userId = ? ORDER BY id DESC"
  ).all(userId);

  res.json(rows);
});

// ✅ ดูรายละเอียด order ของ user คนนี้
app.get("/api/my/orders/:id", requireAuth, (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND userId = ?")
    .get(id, userId);

  if (!order) return res.status(404).json({ message: "Order not found" });

  const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(id);
  res.json({ ...order, items });
});

// สร้าง Order (checkout)
app.post("/api/orders", requireAuth, (req, res) => {
  const userId = req.user.id;
  const { customerName, phone, address, items } = req.body;

  if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Invalid order payload" });
  }

  const getProduct = db.prepare("SELECT * FROM products WHERE id = ?");
  let total = 0;

  for (const it of items) {
    if (!it.productId || !it.qty || it.qty <= 0) {
      return res.status(400).json({ message: "Invalid items" });
    }
    const p = getProduct.get(it.productId);
    if (!p) return res.status(400).json({ message: `Product not found: ${it.productId}` });
    if (p.stock < it.qty) return res.status(400).json({ message: `Stock not enough: ${p.name}` });
    total += p.price * it.qty;
  }

  const tx = db.transaction(() => {
    const orderInfo = db
      .prepare(
        "INSERT INTO orders (customerName, phone, address, total, userId) VALUES (?, ?, ?, ?, ?)"
      )
      .run(customerName, phone, address, total, userId);

    const orderId = orderInfo.lastInsertRowid;

    const insertItem = db.prepare(
      "INSERT INTO order_items (orderId, productId, qty, price) VALUES (?, ?, ?, ?)"
    );
    const decStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

    for (const it of items) {
      const p = getProduct.get(it.productId);
      insertItem.run(orderId, it.productId, it.qty, p.price);
      decStock.run(it.qty, it.productId);
    }

    return orderId;
  });

  const orderId = tx();
  res.json({ orderId, total, status: "PENDING_PAYMENT" });
});

// อัปโหลดสลิป (ต้องเป็นเจ้าของ order) + จำกัดไฟล์ png/jpeg ไว้แล้วใน multer
app.post("/api/my/orders/:id/slip", requireAuth, (req, res) => {
  upload.single("slip")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const id = Number(req.params.id);

    // ✅ เช็คว่า order นี้เป็นของ user นี้จริง
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND userId = ?")
      .get(id, req.user.id);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const slipUrl = `/uploads/${req.file.filename}`;

    // ✅ อัปเดตสถานะเป็น PAID หลังอัปโหลดสลิป
    db.prepare("UPDATE orders SET slipUrl = ?, status = 'PAID' WHERE id = ?").run(slipUrl, id);

    res.json({ slipUrl, status: "PAID" });
  });
});

// ดูรายละเอียด order ของ user คนนี้ (กันแอบดูของคนอื่น)
app.get("/api/my/orders/:id", requireAuth, (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  const order = db.prepare(
    "SELECT * FROM orders WHERE id = ? AND userId = ?"
  ).get(id, userId);

  if (!order) return res.status(404).json({ message: "Order not found" });

  const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(id);
  res.json({ ...order, items });
});


// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ message: "Email and password (>=6) required" });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return res.status(409).json({ message: "Email already used" });

  const passwordHash = await bcrypt.hash(password, 10);
  const info = db.prepare("INSERT INTO users (email, passwordHash) VALUES (?, ?)").run(email, passwordHash);
  const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Me (เช็กว่า token ใช้ได้)
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});

const cors = require("cors");

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ilovecpu-frontend.vercel.app"
  ],
  credentials: true,
}));