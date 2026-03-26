export const HEADER_CATEGORY_ITEMS = [
  {
    key: "BUILD_PC",
    label: "จัดสเปคคอม",
    sourceCategories: ["BUILD_PC"],
    description: "รวมชุดจัดสเปคคอมและอุปกรณ์ประกอบครบชุดสำหรับทุกการใช้งาน",
  },
  {
    key: "NOTEBOOK",
    label: "โน้ตบุ๊ค",
    sourceCategories: ["NOTEBOOK", "LAPTOP"],
    description: "รวมโน้ตบุ๊ค ราคาดีที่สุด ครบทุกรุ่น ตอบโจทย์ทุกการใช้งาน",
  },
  {
    key: "CPU",
    label: "ซีพียู",
    sourceCategories: ["CPU", "PROCESSOR"],
    description: "รวมซีพียูจากทุกค่าย ทั้งเล่นเกม ทำงาน และใช้งานทั่วไป",
  },
  {
    key: "GPU",
    label: "การ์ดจอ",
    sourceCategories: ["GPU", "VGA", "GRAPHICS_CARD"],
    description: "รวมการ์ดจอรุ่นยอดนิยม สำหรับเกมเมอร์และสายครีเอเตอร์",
  },
  {
    key: "MAINBOARD",
    label: "เมนบอร์ด",
    sourceCategories: ["MAINBOARD", "MOTHERBOARD", "MB"],
    description: "รวมเมนบอร์ดรองรับทุกแพลตฟอร์มและฟีเจอร์ครบครัน",
  },
  {
    key: "STORAGE",
    label: "ฮาร์ดดิสก์ และ เอสเอสดี",
    sourceCategories: ["STORAGE", "SSD", "HDD"],
    description: "รวมอุปกรณ์จัดเก็บข้อมูลทั้ง SSD และ HDD สำหรับทุกงบประมาณ",
  },
  {
    key: "PSU",
    label: "พาวเวอร์ซัพพลาย",
    sourceCategories: ["PSU", "POWER_SUPPLY", "POWER SUPPLY"],
    description: "รวมพาวเวอร์ซัพพลายคุณภาพสูง จ่ายไฟเสถียร ปลอดภัย",
  },
  {
    key: "CASE",
    label: "เคส",
    sourceCategories: ["CASE", "CHASSIS"],
    description: "รวมเคสคอมสวยงาม ระบายอากาศดี มีหลายขนาดให้เลือก",
  },
  {
    key: "COOLER",
    label: "ชุดระบายความร้อน",
    sourceCategories: ["COOLER", "COOLING", "COOL"],
    description: "รวมระบบระบายความร้อนทั้งลมและน้ำ ลดอุณหภูมิได้ดี",
  },
  {
    key: "MONITOR",
    label: "จอมอนิเตอร์",
    sourceCategories: ["MONITOR", "MON", "DISPLAY"],
    description: "รวมจอมอนิเตอร์ภาพคมชัด รีเฟรชเรตสูง ครบทุกงาน",
  },
  {
    key: "KEYBOARD",
    label: "คีย์บอร์ด",
    sourceCategories: ["KEYBOARD", "KB"],
    description: "รวมคีย์บอร์ดเกมมิ่งและทำงาน เลือกสวิตช์ได้ตามสไตล์",
  },
  {
    key: "MOUSE",
    label: "เมาส์",
    sourceCategories: ["MOUSE", "ACCESSORY", "ACCESSORIES", "ACC"],
    description: "รวมเมาส์ ราคาดีที่สุด ครบทุกรุ่น ตอบโจทย์ทุกการใช้งาน",
  },
];

export function normalizeCategoryKey(key) {
  return String(key || "").trim().toUpperCase();
}

export function getCategoryByKey(key) {
  const normalized = normalizeCategoryKey(key);
  return (
    HEADER_CATEGORY_ITEMS.find((item) => item.key === normalized) ||
    HEADER_CATEGORY_ITEMS[0]
  );
}
