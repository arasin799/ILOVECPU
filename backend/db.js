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
db.pragma("busy_timeout = 5000");
const schemaPath = path.join(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
const columnMigrations = [
  ["orders", "userId INTEGER"],
  ["orders", "paymentMethod TEXT"],
  ["orders", "paymentCode TEXT"],
  ["orders", "paymentVerifiedAt TEXT"],
  ["users", "firstName TEXT"],
  ["users", "lastName TEXT"],
  ["users", "username TEXT"],
  ["users", "phone TEXT"],
  ["users", "position TEXT"],
  ["users", "salary INTEGER"],
  ["users", "nickname TEXT"],
  ["products", "imageUrls TEXT"],
  ["products", "specs TEXT"],
  ["employees", "birthDate TEXT"],
  ["employees", "hireDate TEXT"],
];

function ensureColumn(tableName, columnDefinition) {
  try {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`).run();
  } catch {
    // column exists already
  }
}

function applySchema() {
  db.exec(schemaSql);
}

function applyColumnMigrations() {
  columnMigrations.forEach(([tableName, columnDefinition]) => {
    ensureColumn(tableName, columnDefinition);
  });
}

applySchema();
applyColumnMigrations();
// Re-apply the schema so CREATE INDEX statements can safely run after legacy columns exist.
applySchema();

module.exports = db;
module.exports.resolvedDbPath = resolvedDbPath;
