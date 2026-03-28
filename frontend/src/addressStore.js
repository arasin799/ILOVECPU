// localStorage key used to persist saved shipping addresses in the browser.
const ADDRESS_KEY = "hardware_store_addresses_v1";

// Clean and normalize address data before it is used or stored.
// This guarantees a stable shape and ensures only one address is marked as default.
function normalize(addresses) {
  if (!Array.isArray(addresses)) return [];

  // Remove falsy items and coerce every field into the expected shape.
  const cleaned = addresses.filter(Boolean).map((item) => ({
    id: String(item.id || Date.now()),
    fullName: item.fullName || "",
    phone: item.phone || "",
    addressLine: item.addressLine || "",
    district: item.district || "",
    province: item.province || "",
    postalCode: item.postalCode || "",
    note: item.note || "",
    isDefault: Boolean(item.isDefault),
  }));

  // Ensure there is at most one default address.
  // If none is marked default, the first item becomes the default one.
  let seenDefault = false;
  return cleaned.map((item, index) => {
    if (item.isDefault && !seenDefault) {
      seenDefault = true;
      return item;
    }
    if (item.isDefault && seenDefault) {
      return { ...item, isDefault: false };
    }
    if (!seenDefault && index === 0) {
      seenDefault = true;
      return { ...item, isDefault: true };
    }
    return item;
  });
}

// Read saved addresses from localStorage and normalize them before returning.
export function loadAddresses() {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY) || "[]";
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

// Save addresses back to localStorage after normalizing them first.
export function saveAddresses(addresses) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(normalize(addresses)));
}
