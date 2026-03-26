const ADDRESS_KEY = "hardware_store_addresses_v1";

function normalize(addresses) {
  if (!Array.isArray(addresses)) return [];

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

export function loadAddresses() {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY) || "[]";
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveAddresses(addresses) {
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(normalize(addresses)));
}
