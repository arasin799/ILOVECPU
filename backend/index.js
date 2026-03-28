// Load environment variables from .env before anything else reads process.env.
require("dotenv").config();

// Express is the main HTTP server framework.
const express = require("express");
// cors controls which frontend origins are allowed to call this backend.
const cors = require("cors");
// Shared SQLite connection plus schema/bootstrap logic.
const db = require("./db");
// path helps build absolute paths safely across environments.
const path = require("path");
// multer handles multipart/form-data file uploads.
const multer = require("multer");
// bcrypt is used to hash and verify user passwords.
const bcrypt = require("bcrypt");
// jsonwebtoken creates and verifies login tokens.
const jwt = require("jsonwebtoken");

// Secret used to sign/verify JWT tokens.
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
// Shared code that grants access to staff-only backoffice routes.
const STAFF_BACKOFFICE_CODE =
  process.env.STAFF_BACKOFFICE_CODE || "123456";

// Build a whitelist of allowed frontend origins from env.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Directory where uploaded files are stored.
const UPLOADS_DIR = path.join(__dirname, "uploads");
// Directory for built-in static product images.
const IMAGES_DIR = path.join(__dirname, "images");
// Reject uploads larger than 5 MB.
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
// Only accept PNG and JPEG files for image uploads.
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

// Create the Express application instance.
const app = express();

// Enable CORS with a dynamic origin check based on the env whitelist.
app.use(
  cors({
    origin: function (origin, callback) {
      // อนุญาต request ที่ไม่มี origin เช่น Postman / server-to-server
      if (!origin) return callback(null, true);

      if (CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Parse incoming JSON request bodies.
app.use(express.json());
// Expose uploaded files under /uploads.
app.use("/uploads", express.static(UPLOADS_DIR));
// Expose bundled image assets under /images.
app.use("/images", express.static(IMAGES_DIR));

// Basic root route for a quick manual connectivity check.
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Small test endpoint used by the frontend to confirm API connectivity.
app.get("/api/test", (req, res) => {
  res.json({ message: "frontend connected to backend" });
});

// Health endpoint for uptime checks or deployment probes.
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Server is healthy",
  });
});

// Normalize image URL input so the API always works with a clean array of up to 4 URLs.
function normalizeImageUrls(input) {
  let raw = [];

  if (Array.isArray(input)) {
    raw = input;
  } else if (typeof input === "string" && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      raw = Array.isArray(parsed) ? parsed : [input];
    } catch {
      raw = [input];
    }
  }

  return raw
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

// Normalize product specs from JSON/string/object input into a clean label/value array.
function normalizeSpecs(input) {
  let raw = [];

  if (Array.isArray(input)) {
    raw = input;
  } else if (typeof input === "string" && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      raw = Array.isArray(parsed) ? parsed : [];
    } catch {
      raw = [];
    }
  } else if (input && typeof input === "object") {
    raw = Object.entries(input).map(([label, value]) => ({ label, value }));
  }

  return raw
    .map((item) => {
      if (Array.isArray(item)) {
        return {
          label: String(item[0] || "").trim(),
          value: String(item[1] || "").trim(),
        };
      }

      return {
        label: String(item?.label || "").trim(),
        value: String(item?.value || "").trim(),
      };
    })
    .filter((item) => item.label && item.value)
    .slice(0, 20);
}

// Convert a raw product row into the shape expected by the frontend.
function toProductDto(row) {
  if (!row) return row;
  const imageUrls = normalizeImageUrls(row.imageUrls);
  const imageUrl = String(row.imageUrl || "").trim() || imageUrls[0] || null;
  const specs = normalizeSpecs(row.specs);
  return {
    ...row,
    imageUrl,
    imageUrls,
    specs,
  };
}

// Generate a human-friendly transfer/payment code.
function generatePaymentCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 8; i += 1) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TRX${randomPart}`;
}

// Keep generating a payment code until it does not collide with an existing order.
function getUniquePaymentCode() {
  const existsStmt = db.prepare("SELECT id FROM orders WHERE paymentCode = ? LIMIT 1");
  for (let i = 0; i < 20; i += 1) {
    const code = generatePaymentCode();
    if (!existsStmt.get(code)) return code;
  }
  return `TRX${Date.now().toString(36).toUpperCase()}`;
}

// Extract the bearer token from the Authorization header.
function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

// Factory that creates auth middleware for normal users or staff routes.
function createAuthMiddleware({ assignKey, requiredRole = null }) {
  return (req, res, next) => {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: "Not logged in" });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);

      if (requiredRole && payload?.role !== requiredRole) {
        return res.status(403).json({ message: "Staff permission required" });
      }

      req[assignKey] = payload;
      next();
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
}

// Require any logged-in user and attach the decoded JWT payload to req.user.
const requireAuth = createAuthMiddleware({ assignKey: "user" });
// Require a staff token and attach the decoded JWT payload to req.staff.
const requireStaff = createAuthMiddleware({ assignKey: "staff", requiredRole: "staff" });

// Public product routes used by the storefront.
app.get("/api/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json(rows.map(toProductDto));
});

// Return one product by id for the product detail page.
app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);

  if (!row) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(toProductDto(row));
});

// --- REVIEWS ---
// Return all reviews for a product.
app.get("/api/products/:id/reviews", (req, res) => {
  const productId = Number(req.params.id);
  try {
    const rows = db.prepare(`
      SELECT r.*, u.firstName, u.lastName 
      FROM product_reviews r
      LEFT JOIN users u ON r.userId = u.id
      WHERE r.productId = ?
      ORDER BY r.createdAt DESC
    `).all(productId);

    const statsMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    
    const formattedReviews = rows.map(r => {
      statsMap[r.rating] = (statsMap[r.rating] || 0) + 1;
      totalRating += r.rating;
      return {
        id: r.id,
        stars: r.rating,
        text: r.comment,
        name: r.firstName ? `${r.firstName} ${r.lastName || ''}`.trim() : "ผู้ใช้งาน",
        createdAt: r.createdAt
      };
    });

    const totalReviews = rows.length;
    const averageRating = totalReviews > 0 ? +(totalRating / totalReviews).toFixed(1) : 0;
    
    const ratingStats = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: statsMap[stars],
      percent: totalReviews > 0 ? Math.round((statsMap[stars] / totalReviews) * 100) : 0
    }));

    res.json({
      reviews: formattedReviews,
      totalReviews,
      averageRating,
      ratingStats
    });
  } catch (err) {
    if (err.message.includes("no such table")) {
      return res.json({ reviews: [], totalReviews: 0, averageRating: 0, ratingStats: [] });
    }
    throw err;
  }
});

// Check if a user can review a product
app.get("/api/products/:id/can-review", requireAuth, (req, res) => {
  const productId = Number(req.params.id);
  const userId = req.user.id;

  const boughtStmt = db.prepare(`
    SELECT 1 FROM order_items oi
    JOIN orders o ON oi.orderId = o.id
    WHERE o.userId = ? AND oi.productId = ?
    LIMIT 1
  `).get(userId, productId);

  if (!boughtStmt) {
    return res.json({ canReview: false });
  }

  const reviewedStmt = db.prepare(`
    SELECT 1 FROM product_reviews
    WHERE userId = ? AND productId = ?
    LIMIT 1
  `).get(userId, productId);

  if (reviewedStmt) {
    return res.json({ canReview: false });
  }

  res.json({ canReview: true });
});

// Post a review
app.post("/api/products/:id/reviews", requireAuth, (req, res) => {
  const productId = Number(req.params.id);
  const userId = req.user.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Invalid rating" });
  }

  const boughtStmt = db.prepare(`
    SELECT 1 FROM order_items oi
    JOIN orders o ON oi.orderId = o.id
    WHERE o.userId = ? AND oi.productId = ?
    LIMIT 1
  `).get(userId, productId);

  if (!boughtStmt) {
    return res.status(403).json({ message: "You must purchase this product before reviewing" });
  }

  db.prepare(`DELETE FROM product_reviews WHERE userId = ? AND productId = ?`).run(userId, productId);
  
  db.prepare(`
    INSERT INTO product_reviews (productId, userId, rating, comment)
    VALUES (?, ?, ?, ?)
  `).run(productId, userId, rating, comment || "");

  res.json({ success: true });
});

// --- FAVORITES ---
app.post("/api/favorites/:id", requireAuth, (req, res) => {
  const productId = Number(req.params.id);
  const userId = req.user.id;
  const { liked } = req.body;

  try {
    if (liked) {
      db.prepare("INSERT OR IGNORE INTO user_favorites (userId, productId) VALUES (?, ?)").run(userId, productId);
    } else {
      db.prepare("DELETE FROM user_favorites WHERE userId = ? AND productId = ?").run(userId, productId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Favorites table might not exist yet" });
  }
});

app.get("/api/favorites", requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const rows = db.prepare(`
      SELECT p.* FROM products p
      JOIN user_favorites f ON p.id = f.productId
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `).all(userId);
    res.json(rows.map(toProductDto));
  } catch (err) {
    res.json([]);
  }
});

app.get("/api/favorites/ids", requireAuth, (req, res) => {
  const userId = req.user.id;
  try {
    const rows = db.prepare('SELECT productId FROM user_favorites WHERE userId = ?').all(userId);
    res.json(rows.map(r => r.productId));
  } catch (err) {
    res.json([]);
  }
});

// Shared uploader configuration for staff product image uploads.
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG or JPEG images are allowed"), false);
    }
  },
});

// Implement missing image upload endpoint for StaffEditProduct form.
app.post("/api/staff/uploads/products", requireStaff, upload.array("images", 4), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

// Customer auth: register a new account and return a JWT for immediate login.
app.post("/api/auth/register", async (req, res) => {
  const {
    firstName = "",
    lastName = "",
    email = "",
    phone = "",
    password = "",
  } = req.body || {};

  const nextFirstName = String(firstName).trim();
  const nextLastName = String(lastName).trim();
  const nextEmail = String(email).trim().toLowerCase();
  const nextPhone = String(phone).trim();
  const nextPassword = String(password);

  if (!nextFirstName || !nextLastName || !nextEmail || !nextPhone || !nextPassword) {
    return res.status(400).json({ message: "firstName, lastName, email, phone and password are required" });
  }

  if (nextPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(nextEmail);
  if (exists) {
    return res.status(409).json({ message: "Email already used" });
  }

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  const info = db
    .prepare("INSERT INTO users (email, passwordHash, firstName, lastName, phone) VALUES (?, ?, ?, ?, ?)")
    .run(nextEmail, passwordHash, nextFirstName, nextLastName, nextPhone);

  const token = jwt.sign(
    { id: info.lastInsertRowid, email: nextEmail },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// Customer auth: verify credentials and issue a fresh JWT.
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const nextEmail = String(email || "").trim().toLowerCase();

  if (!nextEmail || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(nextEmail);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// Staff auth uses a shared backoffice code instead of email/password accounts.
function handleStaffLogin(req, res) {
  const code = String(req.body?.code || "").trim();
  if (!code) {
    return res.status(400).json({ message: "Backoffice code is required" });
  }

  if (code !== STAFF_BACKOFFICE_CODE) {
    return res.status(401).json({ message: "Invalid backoffice code" });
  }

  const token = jwt.sign(
    { role: "staff", staffName: "Backoffice Staff" },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, role: "staff" });
}

// Support both prefixed and legacy staff login URLs.
app.post("/api/staff/login", handleStaffLogin);
app.post("/staff/login", handleStaffLogin);

// Return the current logged-in user's profile.
app.get("/api/auth/me", requireAuth, (req, res) => {
  const me = db
    .prepare("SELECT id, email, firstName, lastName, username, phone, createdAt FROM users WHERE id = ?")
    .get(req.user.id);

  if (!me) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(me);
});

// Update the logged-in user's profile and optionally rotate their password/JWT.
app.patch("/api/auth/me", requireAuth, async (req, res) => {
  const { firstName, lastName, username, email, phone, newPassword } = req.body || {};
  const userId = req.user.id;

  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!current) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextEmail = (email ?? current.email ?? "").trim();
  if (!nextEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  const emailOwner = db.prepare("SELECT id FROM users WHERE email = ?").get(nextEmail);
  if (emailOwner && emailOwner.id !== userId) {
    return res.status(409).json({ message: "Email already used" });
  }

  let nextPasswordHash = current.passwordHash;
  if (typeof newPassword === "string" && newPassword.trim() !== "") {
    if (newPassword.trim().length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    nextPasswordHash = await bcrypt.hash(newPassword.trim(), 10);
  }

  db.prepare(
    `UPDATE users
     SET firstName = ?, lastName = ?, username = ?, email = ?, phone = ?, passwordHash = ?
     WHERE id = ?`
  ).run(
    typeof firstName === "string" ? firstName.trim() : current.firstName,
    typeof lastName === "string" ? lastName.trim() : current.lastName,
    typeof username === "string" ? username.trim() : current.username,
    nextEmail,
    typeof phone === "string" ? phone.trim() : current.phone,
    nextPasswordHash,
    userId
  );

  const updated = db
    .prepare("SELECT id, email, firstName, lastName, username, phone, createdAt FROM users WHERE id = ?")
    .get(userId);

  const token = jwt.sign(
    { id: updated.id, email: updated.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ ...updated, token });
});

// Save an account deletion log, then remove the user account in one transaction.
app.post("/api/auth/delete-account", requireAuth, (req, res) => {
  const userId = Number(req.user?.id);
  const reason = String(req.body?.reason || "").trim();

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  if (!reason) {
    return res.status(400).json({ message: "reason is required" });
  }
  if (reason.length > 1000) {
    return res.status(400).json({ message: "reason is too long (max 1000 chars)" });
  }

  const user = db
    .prepare("SELECT id, email, firstName, lastName, username, phone FROM users WHERE id = ?")
    .get(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO account_deletion_logs (userId, email, firstName, lastName, username, phone, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.id,
      String(user.email || "").trim(),
      String(user.firstName || "").trim(),
      String(user.lastName || "").trim(),
      String(user.username || "").trim(),
      String(user.phone || "").trim(),
      reason
    );

    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  tx();
  return res.json({ ok: true });
});

// Staff view: list customer account deletion requests/logs.
function handleStaffAccountDeletions(req, res) {
  const rows = db
    .prepare(
      `SELECT
        id,
        userId,
        email,
        COALESCE(firstName, '') AS firstName,
        COALESCE(lastName, '') AS lastName,
        COALESCE(username, '') AS username,
        COALESCE(phone, '') AS phone,
        reason,
        deletedAt
      FROM account_deletion_logs
      ORDER BY id DESC`
    )
    .all();

  res.json({
    totalDeletedAccounts: rows.length,
    rows,
  });
}

// Keep multiple route aliases pointing at the same handler.
app.get("/api/staff/account-deletions", requireStaff, handleStaffAccountDeletions);
app.get("/staff/account-deletions", requireStaff, handleStaffAccountDeletions);
app.get("/api/account-deletions", requireStaff, handleStaffAccountDeletions);

// Staff view: list employee records.
function handleStaffEmployees(req, res) {
  const rows = db
    .prepare(
      `SELECT
        id,
        firstName,
        lastName,
        nickname,
        position,
        salary,
        hireDate,
        createdAt
      FROM employees
      ORDER BY id DESC`
    )
    .all();

  res.json(rows);
}

// Employee list route aliases.
app.get("/api/staff/employees", requireStaff, handleStaffEmployees);
app.get("/staff/employees", requireStaff, handleStaffEmployees);
app.get("/api/employees", requireStaff, handleStaffEmployees);

// Validate YYYY-MM-DD text before inserting dates into the database.
function isValidDateInput(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(text);
  return !Number.isNaN(d.getTime());
}

// Staff action: create a new employee row after validating required fields.
function handleCreateEmployee(req, res) {
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const nickname = String(req.body?.nickname || "").trim();
  const position = String(req.body?.position || "").trim();
  const salary = Number(req.body?.salary);
  const hireDate = String(req.body?.hireDate || "").trim();

  if (!firstName || !lastName || !nickname || !position) {
    return res.status(400).json({ message: "firstName, lastName, nickname and position are required" });
  }
  if (!Number.isFinite(salary) || salary < 0) {
    return res.status(400).json({ message: "salary must be a non-negative number" });
  }
  if (!isValidDateInput(hireDate)) {
    return res.status(400).json({ message: "hireDate must be a valid date (YYYY-MM-DD)" });
  }

  const info = db
    .prepare(
      `INSERT INTO employees (firstName, lastName, nickname, position, salary, birthDate, hireDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      firstName,
      lastName,
      nickname,
      position,
      Math.round(salary),
      "",
      hireDate
    );

  const created = db
    .prepare(
      `SELECT id, firstName, lastName, nickname, position, salary, hireDate, createdAt
       FROM employees
       WHERE id = ?`
    )
    .get(info.lastInsertRowid);

  return res.status(201).json(created);
}

// Employee creation route aliases.
app.post("/api/staff/employees", requireStaff, handleCreateEmployee);
app.post("/staff/employees", requireStaff, handleCreateEmployee);
app.post("/api/employees", requireStaff, handleCreateEmployee);

// Staff action: delete one employee by id.
function handleDeleteEmployee(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  const current = db.prepare("SELECT id FROM employees WHERE id = ?").get(id);
  if (!current) {
    return res.status(404).json({ message: "Employee not found" });
  }

  db.prepare("DELETE FROM employees WHERE id = ?").run(id);
  return res.json({ ok: true });
}

// Employee delete route aliases.
app.delete("/api/staff/employees/:id", requireStaff, handleDeleteEmployee);
app.delete("/staff/employees/:id", requireStaff, handleDeleteEmployee);
app.delete("/api/employees/:id", requireStaff, handleDeleteEmployee);

// Staff view: list only customer accounts, excluding staff-like profiles.
function handleStaffCustomers(req, res) {
  const rows = db
    .prepare(
      `SELECT
        id,
        email,
        COALESCE(firstName, '') AS firstName,
        COALESCE(lastName, '') AS lastName,
        COALESCE(username, '') AS username,
        COALESCE(phone, '') AS phone,
        createdAt
      FROM users
      WHERE
        TRIM(COALESCE(position, '')) = ''
        AND salary IS NULL
        AND TRIM(COALESCE(nickname, '')) = ''
      ORDER BY id DESC`
    )
    .all();

  res.json(rows);
}

// Customer list routes for staff.
app.get("/api/staff/customers", requireStaff, handleStaffCustomers);
app.get("/staff/customers", requireStaff, handleStaffCustomers);

// Staff upload endpoint: accept up to 4 product images and return public URLs.
app.post("/api/staff/uploads/products", requireStaff, (req, res) => {
  upload.array("images", 4)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const urls = files.map((file) => `/uploads/${file.filename}`);
    return res.json({ urls });
  });
});

// Staff product management: list all products with full editable fields.
app.get("/api/staff/products", requireStaff, (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, brand, category, price, stock, imageUrl, imageUrls, specs, createdAt FROM products ORDER BY id DESC"
    )
    .all();
  res.json(rows.map(toProductDto));
});

// Staff dashboard helper: compute stock totals and low-stock statistics.
app.get("/api/staff/products/stock", requireStaff, (req, res) => {
  const rows = db
    .prepare("SELECT id, name, category, stock FROM products ORDER BY stock ASC, id DESC")
    .all();

  const totalProducts = rows.length;
  const totalStockUnits = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  const outOfStock = rows.filter((row) => Number(row.stock || 0) === 0).length;
  const lowStock = rows.filter((row) => Number(row.stock || 0) > 0 && Number(row.stock || 0) <= 5).length;

  res.json({
    totalProducts,
    totalStockUnits,
    outOfStock,
    lowStock,
    rows,
  });
});

// Staff view: fetch one product for editing.
app.get("/api/staff/products/:id", requireStaff, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const row = db
    .prepare("SELECT id, name, brand, category, price, stock, imageUrl, imageUrls, specs, createdAt FROM products WHERE id = ?")
    .get(id);

  if (!row) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(toProductDto(row));
});

// Convert a joined review row into a frontend-friendly DTO.
function toReviewDto(row) {
  return {
    id: Number(row?.id || 0),
    name: String(row?.reviewerName || "User"),
    text: String(row?.comment || "").trim(),
    stars: Number(row?.rating || 0),
    createdAt: row?.createdAt || null,
  };
}

// Build aggregate review stats such as average rating and per-star breakdown.
function summarizeReviews(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const ratingCounts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let scoreTotal = 0;
  for (const row of safeRows) {
    const stars = Number(row?.rating || 0);
    if (stars >= 1 && stars <= 5) {
      ratingCounts[stars] += 1;
      scoreTotal += stars;
    }
  }

  const totalReviews = safeRows.length;
  const averageRating = totalReviews > 0 ? Number((scoreTotal / totalReviews).toFixed(1)) : 0;
  const ratingStats = [5, 4, 3, 2, 1].map((stars) => {
    const count = ratingCounts[stars];
    const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { stars, count, percent };
  });

  return {
    averageRating,
    totalReviews,
    ratingStats,
  };
}

// Public route: fetch review list plus summary metrics for one product.
app.get("/api/products/:id/reviews", (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const rows = db
    .prepare(
      `SELECT
        r.id,
        r.rating,
        r.comment,
        r.createdAt,
        COALESCE(
          NULLIF(TRIM(u.username), ''),
          NULLIF(TRIM(COALESCE(u.firstName, '') || ' ' || COALESCE(u.lastName, '')), ''),
          NULLIF(TRIM(u.email), ''),
          'User'
        ) AS reviewerName
      FROM product_reviews r
      LEFT JOIN users u ON u.id = r.userId
      WHERE r.productId = ?
      ORDER BY r.id DESC
      LIMIT 200`
    )
    .all(productId);

  const summary = summarizeReviews(rows);
  const reviews = rows.map(toReviewDto);
  return res.json({
    productId,
    ...summary,
    reviews,
  });
});

// Authenticated users can add a review for a product.
app.post("/api/products/:id/reviews", requireAuth, (req, res) => {
  const productId = Number(req.params.id);
  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || "").trim();

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating must be an integer between 1 and 5" });
  }
  if (!comment) {
    return res.status(400).json({ message: "comment is required" });
  }
  if (comment.length > 1000) {
    return res.status(400).json({ message: "comment is too long (max 1000 chars)" });
  }

  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const info = db
    .prepare("INSERT INTO product_reviews (productId, userId, rating, comment) VALUES (?, ?, ?, ?)")
    .run(productId, req.user.id, rating, comment);

  const created = db
    .prepare(
      `SELECT
        r.id,
        r.rating,
        r.comment,
        r.createdAt,
        COALESCE(
          NULLIF(TRIM(u.username), ''),
          NULLIF(TRIM(COALESCE(u.firstName, '') || ' ' || COALESCE(u.lastName, '')), ''),
          NULLIF(TRIM(u.email), ''),
          'User'
        ) AS reviewerName
      FROM product_reviews r
      LEFT JOIN users u ON u.id = r.userId
      WHERE r.id = ?`
    )
    .get(info.lastInsertRowid);

  return res.status(201).json(toReviewDto(created));
});

// Staff action: create a new product after validating catalog data.
app.post("/api/staff/products", requireStaff, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const brand = String(req.body?.brand || "").trim();
  const category = String(req.body?.category || "").trim().toUpperCase();
  const price = Number(req.body?.price);
  const stock = Number(req.body?.stock);
  const payloadImageUrls = normalizeImageUrls(req.body?.imageUrls);
  const payloadSpecs = normalizeSpecs(req.body?.specs);
  const imageUrlRaw = String(req.body?.imageUrl || "").trim();
  const imageUrl = imageUrlRaw || payloadImageUrls[0] || null;
  const imageUrlsJson = payloadImageUrls.length ? JSON.stringify(payloadImageUrls) : null;
  const specsJson = payloadSpecs.length ? JSON.stringify(payloadSpecs) : null;

  if (!name || !brand || !category) {
    return res.status(400).json({ message: "name, brand and category are required" });
  }
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ message: "price must be a non-negative number" });
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return res.status(400).json({ message: "stock must be a non-negative number" });
  }

  const info = db
    .prepare(
      "INSERT INTO products (name, brand, category, price, stock, imageUrl, imageUrls, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      name,
      brand,
      category,
      Math.round(price),
      Math.floor(stock),
      imageUrl,
      imageUrlsJson,
      specsJson
    );

  const created = db
    .prepare("SELECT id, name, brand, category, price, stock, imageUrl, imageUrls, specs, createdAt FROM products WHERE id = ?")
    .get(info.lastInsertRowid);

  res.status(201).json(toProductDto(created));
});

// Full catalog reset used by backoffice tools, wrapped in one transaction.
function clearCatalogTransaction() {
  const tx = db.transaction(() => {
    const deletedOrderItems = db.prepare("DELETE FROM order_items").run().changes;
    const deletedOrders = db.prepare("DELETE FROM orders").run().changes;
    const deletedProducts = db.prepare("DELETE FROM products").run().changes;

    // Keep ids compact for new backoffice-created products after a full reset.
    db
      .prepare("DELETE FROM sqlite_sequence WHERE name IN ('products', 'orders', 'order_items', 'product_reviews')")
      .run();

    return {
      deletedProducts,
      deletedOrders,
      deletedOrderItems,
    };
  });

  return tx();
}

// Staff action: clear all products plus dependent order data.
app.delete("/api/staff/products", requireStaff, (req, res) => {
  try {
    const result = clearCatalogTransaction();
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({
      message: "Cannot clear product catalog",
      detail: String(e.message || e),
    });
  }
});

// Staff action: update only the product fields sent in the request.
app.patch("/api/staff/products/:id", requireStaff, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const current = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!current) {
    return res.status(404).json({ message: "Product not found" });
  }

  const nextName =
    typeof req.body?.name === "string" ? req.body.name.trim() : current.name;
  const nextBrand =
    typeof req.body?.brand === "string" ? req.body.brand.trim() : current.brand;
  const nextCategory =
    typeof req.body?.category === "string"
      ? req.body.category.trim().toUpperCase()
      : current.category;
  const nextPrice =
    req.body?.price !== undefined ? Number(req.body.price) : Number(current.price);
  const nextStock =
    req.body?.stock !== undefined ? Number(req.body.stock) : Number(current.stock);
  const hasImageUrlsField = req.body?.imageUrls !== undefined;
  const hasSpecsField = req.body?.specs !== undefined;
  const nextImageUrls = hasImageUrlsField
    ? normalizeImageUrls(req.body.imageUrls)
    : normalizeImageUrls(current.imageUrls);
  const nextSpecs = hasSpecsField
    ? normalizeSpecs(req.body.specs)
    : normalizeSpecs(current.specs);
  const nextImageUrlRaw =
    req.body?.imageUrl !== undefined
      ? String(req.body.imageUrl || "").trim()
      : current.imageUrl;
  const nextImageUrl = nextImageUrlRaw || nextImageUrls[0] || null;
  const nextImageUrlsJson = nextImageUrls.length ? JSON.stringify(nextImageUrls) : null;
  const nextSpecsJson = nextSpecs.length ? JSON.stringify(nextSpecs) : null;

  if (!nextName || !nextBrand || !nextCategory) {
    return res.status(400).json({ message: "name, brand and category are required" });
  }
  if (!Number.isFinite(nextPrice) || nextPrice < 0) {
    return res.status(400).json({ message: "price must be a non-negative number" });
  }
  if (!Number.isFinite(nextStock) || nextStock < 0) {
    return res.status(400).json({ message: "stock must be a non-negative number" });
  }

  db.prepare(
    "UPDATE products SET name = ?, brand = ?, category = ?, price = ?, stock = ?, imageUrl = ?, imageUrls = ?, specs = ? WHERE id = ?"
  ).run(
    nextName,
    nextBrand,
    nextCategory,
    Math.round(nextPrice),
    Math.floor(nextStock),
    nextImageUrl,
    nextImageUrlsJson,
    nextSpecsJson,
    id
  );

  const updated = db
    .prepare("SELECT id, name, brand, category, price, stock, imageUrl, imageUrls, specs, createdAt FROM products WHERE id = ?")
    .get(id);

  res.json(toProductDto(updated));
});

// Staff action: delete one product if no database constraint blocks it.
app.delete("/api/staff/products/:id", requireStaff, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const current = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
  if (!current) {
    return res.status(404).json({ message: "Product not found" });
  }

  try {
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete product error:", e);
    res.status(409).json({
      message: "Cannot delete this product",
      detail: String(e.message || e),
    });
  }
});

// Map aggregated order rows into a consistent summary object for staff UIs.
function mapStaffOrderSummary(row) {
  return {
    id: Number(row?.id || 0),
    customerName: String(row?.customerName || "").trim(),
    phone: String(row?.phone || "").trim(),
    address: String(row?.address || "").trim(),
    total: Number(row?.total || 0),
    status: String(row?.status || "").trim(),
    paymentMethod: String(row?.paymentMethod || "").trim(),
    paymentCode: String(row?.paymentCode || "").trim(),
    paymentVerifiedAt: row?.paymentVerifiedAt || null,
    createdAt: row?.createdAt || null,
    itemCount: Number(row?.itemCount || 0),
  };
}

// Fetch the line items for a single order, including product display info.
function getStaffOrderItems(orderId) {
  return db
    .prepare(
      `SELECT
        oi.id,
        oi.orderId,
        oi.productId,
        oi.qty,
        oi.price,
        COALESCE(p.name, 'สินค้า #' || oi.productId) AS productName,
        COALESCE(p.brand, '') AS brand,
        COALESCE(p.imageUrl, '') AS imageUrl
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.productId
      WHERE oi.orderId = ?
      ORDER BY oi.id ASC`
    )
    .all(orderId);
}

// Staff queue view: list orders, optionally filtered by queue type.
app.get("/api/staff/orders", requireStaff, (req, res) => {
  const queue = String(req.query?.queue || "").trim().toLowerCase();
  let whereClause = "";

  if (queue === "payment") {
    whereClause = "WHERE o.status = 'PAID'";
  } else if (queue === "processing") {
    whereClause = "WHERE o.status IN ('PACKING', 'SHIPPED')";
  }

  const rows = db
    .prepare(
      `SELECT
        o.id,
        o.customerName,
        o.phone,
        o.address,
        o.total,
        o.status,
        o.paymentMethod,
        o.paymentCode,
        o.paymentVerifiedAt,
        o.createdAt,
        COUNT(oi.id) AS itemCount
      FROM orders o
      LEFT JOIN order_items oi ON oi.orderId = o.id
      ${whereClause}
      GROUP BY
        o.id,
        o.customerName,
        o.phone,
        o.address,
        o.total,
        o.status,
        o.paymentMethod,
        o.paymentCode,
        o.paymentVerifiedAt,
        o.createdAt
      ORDER BY
        CASE o.status
          WHEN 'PAID' THEN 1
          WHEN 'PACKING' THEN 2
          WHEN 'SHIPPED' THEN 3
          WHEN 'DELIVERED' THEN 4
          ELSE 5
        END,
        o.id DESC`
    )
    .all();

  return res.json(rows.map(mapStaffOrderSummary));
});

// Staff detail view: fetch one order plus its line items.
app.get("/api/staff/orders/:id", requireStaff, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  return res.json({
    ...order,
    items: getStaffOrderItems(id),
  });
});

// Staff action: move a PAID order into PACKING and stamp verification time.
app.patch("/api/staff/orders/:id/confirm-payment", requireStaff, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.status !== "PAID") {
    return res.status(400).json({ message: "Payment confirmation is allowed only for paid orders" });
  }

  db.prepare(
    "UPDATE orders SET status = 'PACKING', paymentVerifiedAt = COALESCE(paymentVerifiedAt, datetime('now')) WHERE id = ?"
  ).run(id);

  return res.json({
    ok: true,
    status: "PACKING",
    paymentVerifiedAt: new Date().toISOString(),
  });
});

// Staff action: enforce allowed order-status transitions.
app.patch("/api/staff/orders/:id/status", requireStaff, (req, res) => {
  const id = Number(req.params.id);
  const nextStatus = String(req.body?.status || "").trim().toUpperCase();

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const allowedTransitions = {
    PACKING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const expectedNextStatus = allowedTransitions[String(order.status || "").trim().toUpperCase()];
  if (!expectedNextStatus || nextStatus !== expectedNextStatus) {
    return res.status(400).json({ message: "Invalid order status transition" });
  }

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(nextStatus, id);
  return res.json({ ok: true, status: nextStatus });
});

// Customer view: list the current user's orders.
app.get("/api/my/orders", requireAuth, (req, res) => {
  const userId = req.user.id;

  const rows = db.prepare(
    "SELECT id, total, status, paymentMethod, paymentCode, paymentVerifiedAt, createdAt FROM orders WHERE userId = ? ORDER BY id DESC"
  ).all(userId);

  res.json(rows);
});

// Customer view: fetch one of the current user's orders and lazily ensure it has a payment code.
app.get("/api/my/orders/:id", requireAuth, (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND userId = ?")
    .get(id, userId);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  let nextOrder = order;
  if (order.status === "PENDING_PAYMENT" && !String(order.paymentCode || "").trim()) {
    const paymentCode = getUniquePaymentCode();
    db.prepare("UPDATE orders SET paymentCode = ? WHERE id = ?").run(paymentCode, id);
    nextOrder = { ...order, paymentCode };
  }

  const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(id);
  res.json({ ...nextOrder, items });
});

// Customer checkout: create an order, insert line items, and decrease stock atomically.
app.post("/api/orders", requireAuth, (req, res) => {
  const userId = req.user.id;
  const { customerName, phone, address, items, paymentMethod } = req.body || {};

  if (!customerName || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Invalid order payload" });
  }

  const safePaymentMethod = String(paymentMethod || "promptpay_qr").trim();

  const getProduct = db.prepare("SELECT * FROM products WHERE id = ?");
  let subtotal = 0;

  for (const it of items) {
    if (!it.productId || !it.qty || it.qty <= 0) {
      return res.status(400).json({ message: "Invalid items" });
    }

    const p = getProduct.get(it.productId);
    if (!p) {
      return res.status(400).json({ message: `Product not found: ${it.productId}` });
    }

    if (p.stock < it.qty) {
      return res.status(400).json({ message: `Stock not enough: ${p.name}` });
    }

    subtotal += p.price * it.qty;
  }

  const vat = Math.round(subtotal * 0.07 * 100) / 100;
  const shipping = subtotal === 0 || subtotal >= 5000 ? 0 : 80;
  const total = subtotal + vat + shipping;

  const tx = db.transaction(() => {
    const paymentCode = getUniquePaymentCode();

    const orderInfo = db
      .prepare(
        "INSERT INTO orders (customerName, phone, address, total, userId, paymentMethod, paymentCode) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(customerName, phone, address, total, userId, safePaymentMethod, paymentCode);

    const orderId = orderInfo.lastInsertRowid;

    const insertItem = db.prepare(
      "INSERT INTO order_items (orderId, productId, qty, price) VALUES (?, ?, ?, ?)"
    );
    const decStock = db.prepare(
      "UPDATE products SET stock = stock - ? WHERE id = ?"
    );

    for (const it of items) {
      const p = getProduct.get(it.productId);
      insertItem.run(orderId, it.productId, it.qty, p.price);
      decStock.run(it.qty, it.productId);
    }

    return { orderId, paymentCode };
  });

  const created = tx();
  res.json({
    orderId: created.orderId,
    total,
    status: "PENDING_PAYMENT",
    paymentCode: created.paymentCode,
  });
});

// Customer action: cancel an unpaid order and restore stock.
function handleCancelOrder(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND userId = ?")
    .get(id, req.user.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== "PENDING_PAYMENT") {
    return res.status(400).json({ message: "Cancel is allowed only for pending payment orders" });
  }

  const items = db
    .prepare("SELECT productId, qty FROM order_items WHERE orderId = ?")
    .all(id);

  const tx = db.transaction(() => {
    const incStock = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
    for (const item of items) {
      const qty = Number(item?.qty || 0);
      const productId = Number(item?.productId || 0);
      if (qty > 0 && productId > 0) {
        incStock.run(qty, productId);
      }
    }

    db.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").run(id);
  });

  tx();
  return res.json({ ok: true, status: "CANCELLED" });
}

// Support both /api/my and older /api/orders cancel URLs.
app.post("/api/my/orders/:id/cancel", requireAuth, handleCancelOrder);
app.patch("/api/my/orders/:id/cancel", requireAuth, handleCancelOrder);
app.post("/api/orders/:id/cancel", requireAuth, handleCancelOrder);
app.patch("/api/orders/:id/cancel", requireAuth, handleCancelOrder);

// Customer action: change payment method while the order is still waiting for payment.
function handleUpdatePaymentMethod(req, res) {
  const id = Number(req.params.id);
  const paymentMethod = String(req.body?.paymentMethod || "").trim();
  const allowed = new Set(["promptpay_qr", "credit_card", "cod"]);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }
  if (!allowed.has(paymentMethod)) {
    return res.status(400).json({ message: "Invalid payment method" });
  }

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND userId = ?")
    .get(id, req.user.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.status !== "PENDING_PAYMENT") {
    return res.status(400).json({ message: "Cannot change payment method for this order" });
  }

  db.prepare("UPDATE orders SET paymentMethod = ? WHERE id = ?").run(paymentMethod, id);
  return res.json({ ok: true, paymentMethod });
}

// Support both /api/my and older /api/orders payment-method URLs.
app.patch("/api/my/orders/:id/payment-method", requireAuth, handleUpdatePaymentMethod);
app.post("/api/my/orders/:id/payment-method", requireAuth, handleUpdatePaymentMethod);
app.patch("/api/orders/:id/payment-method", requireAuth, handleUpdatePaymentMethod);
app.post("/api/orders/:id/payment-method", requireAuth, handleUpdatePaymentMethod);

// Customer action: confirm a transfer/payment code so the order moves from pending to paid.
app.post("/api/my/orders/:id/confirm-transfer-code", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const code = String(req.body?.code || "").trim().toUpperCase();

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }
  if (!code) {
    return res.status(400).json({ message: "code is required" });
  }

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND userId = ?")
    .get(id, req.user.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== "PENDING_PAYMENT") {
    return res.json({
      ok: true,
      status: order.status,
      message: "Order is already processed",
    });
  }

  let expectedCode = String(order.paymentCode || "").trim().toUpperCase();
  if (!expectedCode) {
    expectedCode = getUniquePaymentCode();
    db.prepare("UPDATE orders SET paymentCode = ? WHERE id = ?").run(expectedCode, id);
  }

  if (code !== expectedCode) {
    return res.status(400).json({ message: "รหัสโอนเงินไม่ถูกต้อง" });
  }

  db.prepare(
    "UPDATE orders SET status = 'PAID' WHERE id = ?"
  ).run(id);

  return res.json({
    ok: true,
    status: "PAID",
  });
});

// Fallback for any unknown /api/* route so clients get JSON instead of HTML.
app.use(/^\/api\//, (req, res) => {
  res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Backend port with a default for local development.
const PORT = process.env.PORT || 4000;

// Start the HTTP server.
app.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
