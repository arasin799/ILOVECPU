const db = require("./db");

// ลบข้อมูลเก่า แล้วรีเซ็ต id
db.prepare("DELETE FROM products").run();
try {
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'products'").run();
} catch (e) {
  // ignore
}

const insert = db.prepare(`
  INSERT INTO products (name, brand, category, price, stock, imageUrl)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const sample = [
  // NOTEBOOK
  ["Acer Nitro V 15 ANV15-51-57Y4", "ACER", "NOTEBOOK", 36990, 8, null],
  ["Acer Aspire Lite AL14-31P", "ACER", "NOTEBOOK", 11990, 10, null],
  ["ASUS Vivobook 15 OLED", "ASUS", "NOTEBOOK", 24990, 7, null],
  ["Lenovo LOQ 15IRX9", "LENOVO", "NOTEBOOK", 32990, 6, null],
  ["MSI Thin 15 B12UCX", "MSI", "NOTEBOOK", 27990, 5, null],
  ["HP Victus 15", "HP", "NOTEBOOK", 25990, 9, null],

  // CPU
  ["AMD Ryzen 5 5600G", "AMD", "CPU", 4500, 20, null],
  ["AMD Ryzen 5 8500G", "AMD", "CPU", 5490, 12, null],
  ["AMD Ryzen 7 5700X", "AMD", "CPU", 7390, 10, null],
  ["Intel Core i5-14400F", "INTEL", "CPU", 7490, 14, null],
  ["Intel Core i7-14700F", "INTEL", "CPU", 10490, 9, null],
  ["Intel Core Ultra 5 245KF", "INTEL", "CPU", 6950, 11, null],

  // MAINBOARD
  ["MSI A520M-A PRO", "MSI", "MAINBOARD", 1900, 15, null],
  ["ASUS PRIME B550M-K", "ASUS", "MAINBOARD", 3290, 12, null],
  ["Gigabyte B760M DS3H DDR4", "GIGABYTE", "MAINBOARD", 4190, 10, null],
  ["ASRock B650M Pro RS", "ASROCK", "MAINBOARD", 5390, 8, null],

  // GPU
  ["MSI GeForce RTX 4060 Ventus 2X", "MSI", "GPU", 11900, 7, null],
  ["Gigabyte Radeon RX 7600 Gaming OC", "GIGABYTE", "GPU", 9990, 6, null],
  ["ASUS Dual RTX 4070 Super", "ASUS", "GPU", 23900, 4, null],

  // RAM
  ["DDR4 16GB (8x2) 3200", "KINGSTON", "RAM", 1200, 30, null],
  ["DDR5 32GB (16x2) 5600", "CORSAIR", "RAM", 3490, 18, null],
  ["Kingston Fury Beast DDR5 16GB 5200", "KINGSTON", "RAM", 1690, 20, null],

  // STORAGE
  ["SSD 1TB NVMe", "WD", "STORAGE", 2200, 25, null],
  ["Samsung 990 EVO 1TB NVMe", "SAMSUNG", "STORAGE", 2990, 15, null],
  ["Crucial BX500 1TB SATA SSD", "CRUCIAL", "STORAGE", 1990, 16, null],

  // PSU
  ["Corsair CX650 650W 80+ Bronze", "CORSAIR", "PSU", 2290, 14, null],
  ["Cooler Master MWE 750 Bronze V2", "COOLER MASTER", "PSU", 2690, 11, null],

  // MONITOR
  ["AOC 24G2SP 24 Inch 165Hz", "AOC", "MONITOR", 4590, 9, null],
  ["LG UltraGear 27GS60F-B 27 Inch 180Hz", "LG", "MONITOR", 6990, 8, null],

  // ACCESSORY
  ["Logitech C270 HD Webcam", "LOGITECH", "ACCESSORY", 690, 20, null],
  ["UGREEN HDMI 2.0 Cable 5 Meter", "UGREEN", "ACCESSORY", 390, 35, null],
  ["USB Sound Card Adapter", "UGREEN", "ACCESSORY", 490, 22, null],
  ["PCIe WiFi Adapter AX3000", "TP-LINK", "ACCESSORY", 990, 13, null],
  ["UPS Zircon Smooth-I 1200VA", "ZIRCON", "ACCESSORY", 3490, 6, null],

  // COOLING
  ["DeepCool AG400 Air Cooler", "DEEPCOOL", "COOLING", 890, 18, null],
  ["Thermalright Peerless Assassin 120 SE", "THERMALRIGHT", "COOLING", 1490, 10, null],
];

for (const row of sample) {
  insert.run(...row);
}

console.log(`✅ Seeded ${sample.length} products`);