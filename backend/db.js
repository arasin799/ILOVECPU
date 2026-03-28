// ใช้สำหรับจัดการไฟล์/โฟลเดอร์ เช่น เช็กว่ามีไฟล์ db ไหม หรือสร้างโฟลเดอร์ปลายทาง
const fs = require("fs");
// ใช้ช่วยจัดการ path ให้ถูกต้องในทุก environment
const path = require("path");
// ไลบรารี SQLite ที่ใช้เชื่อมต่อฐานข้อมูลแบบ synchronous
const Database = require("better-sqlite3");

// กำหนด path มาตรฐานของฐานข้อมูลให้ชี้ไปที่ backend/store.db
const defaultDbPath = path.join(__dirname, "store.db");
// ถ้ามีการตั้ง DB_PATH ใน environment จะใช้ค่านั้นแทน
// ถ้าไม่มี จะ fallback กลับมาใช้ path มาตรฐานด้านบน
const resolvedDbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : defaultDbPath;

// สร้างโฟลเดอร์ปลายทางของไฟล์ฐานข้อมูลไว้ล่วงหน้า ถ้ายังไม่มี
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

// ย้ายฐานข้อมูลเก่าแบบ one-time migration
// กรณีระบบเวอร์ชันก่อนเคยสร้าง store.db ไว้ที่ root ของโปรเจกต์
if (!process.env.DB_PATH) {
  // path ของฐานข้อมูลเก่าที่อาจเคยถูกสร้างไว้ที่ project root
  const legacyDbPath = path.resolve(process.cwd(), "store.db");
  // จะ copy ไฟล์เก่าก็ต่อเมื่อ:
  // 1) backend/store.db ยังไม่มี
  // 2) มี store.db เก่าอยู่ที่ root
  // 3) และสอง path นี้ไม่ใช่ไฟล์เดียวกัน
  const shouldCopyLegacy =
    !fs.existsSync(defaultDbPath) &&
    fs.existsSync(legacyDbPath) &&
    path.resolve(legacyDbPath) !== path.resolve(defaultDbPath);

  if (shouldCopyLegacy) {
    // copy db เก่ามายังตำแหน่งใหม่เพื่อให้ระบบใช้ path เดียวกันเสมอ
    fs.copyFileSync(legacyDbPath, defaultDbPath);
  }
}

// เปิดการเชื่อมต่อ SQLite จาก path ที่สรุปแล้วด้านบน
const db = new Database(resolvedDbPath);
// เปิด foreign key constraint เพื่อให้ความสัมพันธ์ระหว่างตารางถูกบังคับใช้งานจริง
db.pragma("foreign_keys = ON");
// ใช้โหมด WAL เพื่อให้การอ่าน/เขียนพร้อมกันทำได้ดีขึ้น
db.pragma("journal_mode = WAL");
// ถ้าฐานข้อมูลติด lock ให้รอได้สูงสุด 5 วินาทีก่อน error
db.pragma("busy_timeout = 5000");

// path ของไฟล์ schema หลัก
const schemaPath = path.join(__dirname, "schema.sql");
// อ่าน schema SQL เข้ามาเป็น string เพื่อใช้สร้าง/อัปเดตตาราง
const schemaSql = fs.readFileSync(schemaPath, "utf8");

// รายการคอลัมน์ที่อาจยังไม่มีในฐานข้อมูลเก่า
// ใช้เติมคอลัมน์ที่เพิ่มเข้ามาภายหลังโดยไม่ต้องทิ้งข้อมูลเดิม
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
    // พยายามเพิ่มคอลัมน์ให้ตาราง ถ้ามีอยู่แล้ว SQLite จะ throw error
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`).run();
  } catch {
    // ถ้ามีคอลัมน์นี้อยู่แล้ว ให้ข้ามไปได้เลย
  }
}

function applySchema() {
  // รัน schema.sql เพื่อสร้างตาราง/ดัชนีที่ยังไม่มี
  db.exec(schemaSql);
}

function applyColumnMigrations() {
  // วนเพิ่มคอลัมน์ทีละตัวให้ฐานข้อมูลเวอร์ชันเก่า
  columnMigrations.forEach(([tableName, columnDefinition]) => {
    ensureColumn(tableName, columnDefinition);
  });
}

// สร้างตารางพื้นฐานก่อน
applySchema();
// แล้วค่อยเติมคอลัมน์ใหม่ที่อาจยังไม่มีในฐานข้อมูลเก่า
applyColumnMigrations();
// รัน schema ซ้ำอีกครั้ง เพื่อให้ CREATE INDEX และโครงสร้างอื่น ๆ
// ทำงานได้หลังจากคอลัมน์ของฐานข้อมูลเก่าถูกเติมครบแล้ว
applySchema();

// export ตัวเชื่อมต่อ db ไปให้ไฟล์อื่นใช้งาน
module.exports = db;
// export path ที่ถูกใช้งานจริงไว้ด้วย เผื่อไฟล์อื่นต้องการ debug หรือแสดงผล
module.exports.resolvedDbPath = resolvedDbPath;
