// ARCHIVO GENERADO AUTOMÁTICAMENTE. NO EDITAR A MANO.
// Para actualizar este catálogo, ejecuta: node scripts/generateCatalog.js

export type VehicleType = 'planta' | 'moto' | 'car';

export interface CatalogVehicle {
  id: string;
  brand: string;
  model: string;
  vehicleType?: VehicleType;
  category?: string;
  year?: number;
  powerKva?: number;
  powerKw?: number;
  imageRes: any;
  description?: string;
}

export type CatalogMoto = CatalogVehicle;

export const PLANTAS_CATALOG: CatalogVehicle[] = [
  {
    id: 'blue-power-c35',
    brand: 'Blue Power Generation',
    model: 'C35 (35 kVA / 28 kW)',
    vehicleType: 'planta',
    category: 'PLANTA ELÉCTRICA',
    year: 2026,
    powerKva: 35,
    powerKw: 28,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador Diésel Standby 35 kVA / 28 kW, Motor Cummins 4B3.9G2, Alternador Leroy Somer TAL-A42-C, Panel ComAp IL-9.',
  },
  {
    id: 'blue-power-c55',
    brand: 'Blue Power Generation',
    model: 'C55 (55 kVA / 44 kW)',
    vehicleType: 'planta',
    category: 'PLANTA ELÉCTRICA',
    year: 2026,
    powerKva: 55,
    powerKw: 44,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador Diésel Standby 55 kVA / 44 kW, Motor Cummins 4BT3.9G2 Turbo, Alternador Leroy Somer TAL-A42-G, Panel ComAp AMF 20.',
  },
  {
    id: 'blue-power-c125',
    brand: 'Blue Power Generation',
    model: 'C125 (125 kVA / 100 kW)',
    vehicleType: 'planta',
    category: 'PLANTA ELÉCTRICA',
    year: 2026,
    powerKva: 125,
    powerKw: 100,
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador Diésel Standby 125 kVA / 100 kW, Motor Cummins 6BT5.9G2 de 6 Cil. Turbo, Alternador Leroy Somer TAL-A44-D.',
  },
];

export const MOTO_CATALOG: CatalogMoto[] = [
  {
    id: "BERA-GBR 200cc".replace(/\s+/g, '-').toLowerCase(),
    brand: "BERA",
    model: "GBR 200cc",
    imageRes: require('../../assets/images/motos/BERA/GBR 200cc.png'),
  },
  {
    id: "BERA-Kavak 150cc".replace(/\s+/g, '-').toLowerCase(),
    brand: "BERA",
    model: "Kavak 150cc",
    imageRes: require('../../assets/images/motos/BERA/Kavak 150cc.png'),
  },
  {
    id: "BERA-SBR 150cc".replace(/\s+/g, '-').toLowerCase(),
    brand: "BERA",
    model: "SBR 150cc",
    imageRes: require('../../assets/images/motos/BERA/SBR 150cc.png'),
  },
  {
    id: "BERA-Super DT 250cc".replace(/\s+/g, '-').toLowerCase(),
    brand: "BERA",
    model: "Super DT 250cc",
    imageRes: require('../../assets/images/motos/BERA/Super DT 250cc.png'),
  },
  {
    id: "EMPIRE KEEWAY-Horse 150RL".replace(/\s+/g, '-').toLowerCase(),
    brand: "EMPIRE KEEWAY",
    model: "Horse 150RL",
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/Horse 150RL.png'),
  },
  {
    id: "EMPIRE KEEWAY-New Horse 150".replace(/\s+/g, '-').toLowerCase(),
    brand: "EMPIRE KEEWAY",
    model: "New Horse 150",
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/New Horse 150.png'),
  },
  {
    id: "EMPIRE KEEWAY-RK 250".replace(/\s+/g, '-').toLowerCase(),
    brand: "EMPIRE KEEWAY",
    model: "RK 250",
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/RK 250.png'),
  },
  {
    id: "EMPIRE KEEWAY-Xpress 150".replace(/\s+/g, '-').toLowerCase(),
    brand: "EMPIRE KEEWAY",
    model: "Xpress 150",
    imageRes: require('../../assets/images/motos/EMPIRE KEEWAY/Xpress 150.png'),
  },
  {
    id: "ESCUDA-Alexa 180 cc.".replace(/\s+/g, '-').toLowerCase(),
    brand: "ESCUDA",
    model: "Alexa 180 cc.",
    imageRes: require('../../assets/images/motos/ESCUDA/Alexa 180 cc..png'),
  },
  {
    id: "ESCUDA-EM 200".replace(/\s+/g, '-').toLowerCase(),
    brand: "ESCUDA",
    model: "EM 200",
    imageRes: require('../../assets/images/motos/ESCUDA/EM 200.png'),
  },
  {
    id: "FORZA-Forza SF501 - 250cc".replace(/\s+/g, '-').toLowerCase(),
    brand: "FORZA",
    model: "Forza SF501 - 250cc",
    imageRes: require('../../assets/images/motos/FORZA/Forza SF501 - 250cc.png'),
  },
  {
    id: "KADI-Kadi Lovis 150".replace(/\s+/g, '-').toLowerCase(),
    brand: "KADI",
    model: "Kadi Lovis 150",
    vehicleType: 'moto',
    imageRes: require('../../assets/images/motos/KADI/Kadi Lovis 150.png'),
  },
];

export const CAR_CATALOG: CatalogVehicle[] = [
  {
    id: 'chevrolet-optra-2011',
    brand: 'CHEVROLET',
    model: 'Optra Advance 2011',
    vehicleType: 'car',
    category: 'SEDAN',
    year: 2011,
    imageRes: require('../../assets/images/autos/CHEVROLET/SEDAN/OPTRA 2011.png'),
  },
];

export const VEHICLE_CATALOG: CatalogVehicle[] = [
  ...PLANTAS_CATALOG,
  ...CAR_CATALOG,
  ...MOTO_CATALOG.map(m => ({ ...m, vehicleType: 'moto' as VehicleType })),
];

