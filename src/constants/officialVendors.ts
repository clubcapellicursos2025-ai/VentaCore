export interface OfficialVendor {
  name: string;
  code: string;
  status: string;
  brand_codes: Record<string, string[]>;
}

export const OFFICIAL_VENDORS: OfficialVendor[] = [
  { name: "Sebastian Sanchez", code: "1", status: "active", brand_codes: { "KeyNort - FullStock": ["1", "15"], "L'oreal - Matrix": ["3", "15"], "Wella - Farmavita": ["15"] } },
  { name: "Fabian Solorzano", code: "2", status: "active", brand_codes: { "KeyNort - FullStock": ["2"] } },
  { name: "Cristian Rivera", code: "3", status: "active", brand_codes: { "KeyNort - FullStock": ["3"], "Wella - Farmavita": ["2"] } },
  { name: "Vacante 4", code: "4", status: "vacant", brand_codes: { "KeyNort - FullStock": ["4"] } },
  { name: "Gabriel Peruch", code: "5", status: "active", brand_codes: { "KeyNort - FullStock": ["5"], "L'oreal - Matrix": ["5"], "Wella - Farmavita": ["5"] } },
  { name: "Rafael Garcia", code: "6", status: "active", brand_codes: { "KeyNort - FullStock": ["6"] } },
  { name: "VACANTE 8", code: "8", status: "vacant", brand_codes: { "KeyNort - FullStock": ["8"] } },
  { name: "Marcelo Echeverry", code: "10", status: "active", brand_codes: { "KeyNort - FullStock": ["10"], "L'oreal - Matrix": ["10"], "Wella - Farmavita": ["10"] } },
  { name: "Javier Jerez", code: "11", status: "active", brand_codes: { "KeyNort - FullStock": ["11", "18"], "L'oreal - Matrix": ["11"], "Wella - Farmavita": ["11"] } },
  { name: "VACANTE 12", code: "12", status: "vacant", brand_codes: { "KeyNort - FullStock": ["12"] } },
  { name: "VACANTE 13", code: "13", status: "vacant", brand_codes: { "KeyNort - FullStock": ["13"] } },
  { name: "VACANTE 14", code: "14", status: "vacant", brand_codes: { "KeyNort - FullStock": ["14"] } },
  { name: "Dario Almada", code: "16", status: "active", brand_codes: { "KeyNort - FullStock": ["16"], "L'oreal - Matrix": ["16"], "Wella - Farmavita": ["16"] } },
  { name: "Javier Morales", code: "17", status: "active", brand_codes: { "KeyNort - FullStock": ["17"], "L'oreal - Matrix": ["17"], "Wella - Farmavita": ["17"] } },
  { name: "VACANTE 19", code: "19", status: "vacant", brand_codes: { "KeyNort - FullStock": ["19"] } },
  { name: "Vacante 20", code: "20", status: "vacant", brand_codes: { "KeyNort - FullStock": ["20"] } },
  { name: "Pablo Rios", code: "22", status: "active", brand_codes: { "KeyNort - FullStock": ["22"], "L'oreal - Matrix": ["22"], "Wella - Farmavita": ["22"] } },
  { name: "Myriam Garcia", code: "23", status: "active", brand_codes: { "KeyNort - FullStock": ["23"], "L'oreal - Matrix": ["23"], "Wella - Farmavita": ["1"] } },
  { name: "Vacante 24", code: "24", status: "vacant", brand_codes: { "KeyNort - FullStock": ["24"] } },
  { name: "Walter Avellaneda", code: "25", status: "active", brand_codes: { "KeyNort - FullStock": ["25"], "L'oreal - Matrix": ["25"], "Wella - Farmavita": ["4"] } },
  { name: "Juan M. Celiz", code: "26", status: "active", brand_codes: { "KeyNort - FullStock": ["26"], "L'oreal - Matrix": ["26"], "Wella - Farmavita": ["26"] } },
];

export function getOfficialVendorMatch(code: string, name?: string, brand?: string): OfficialVendor | null {
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanName = String(name || "").trim().toLowerCase();
  const lowerBrand = String(brand || "").trim().toLowerCase();

  if (!cleanCode && !cleanName) return null;

  // 1. If brand is specified, look inside brand_codes for this specific brand first
  if (lowerBrand && cleanCode) {
    for (const item of OFFICIAL_VENDORS) {
      if (item.brand_codes) {
        for (const [bKey, bVal] of Object.entries(item.brand_codes)) {
          if (lowerBrand.includes(bKey.toLowerCase().split('-')[0].trim()) || bKey.toLowerCase().includes(lowerBrand.split('-')[0].trim())) {
            if (Array.isArray(bVal) && bVal.some(c => String(c).trim().toUpperCase() === cleanCode)) {
              return item;
            }
          }
        }
      }
    }
  }

  // 2. Try exact code match in OFFICIAL_VENDORS
  if (cleanCode) {
    const byCode = OFFICIAL_VENDORS.find(o => o.code.toUpperCase() === cleanCode);
    if (byCode) return byCode;
  }

  // 3. Try name match in OFFICIAL_VENDORS
  if (cleanName && cleanName !== "sin valor asignado" && !cleanName.startsWith("vendedor ")) {
    const byName = OFFICIAL_VENDORS.find(o => o.name.toLowerCase() === cleanName);
    if (byName) return byName;
  }

  // 4. Try matching cleanCode against ANY brand code in OFFICIAL_VENDORS
  if (cleanCode) {
    for (const item of OFFICIAL_VENDORS) {
      if (item.brand_codes) {
        for (const val of Object.values(item.brand_codes)) {
          if (Array.isArray(val) && val.some(c => String(c).trim().toUpperCase() === cleanCode)) {
            return item;
          }
        }
      }
    }
  }

  return null;
}
