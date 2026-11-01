export interface CatalogPlanta {
  id: string;
  brand: string;
  model: string;
  powerKva: number;
  powerKw: number;
  primeKva?: number;
  engineBrand: string;
  engineModel: string;
  alternatorBrand: string;
  alternatorModel: string;
  controllerModel: string;
  fuelTankCanopyLiters: number;
  fuelTankOpenLiters: number;
  fuelConsumptionLh?: string;
  oilCapacityLiters: number;
  oilType?: string;
  coolantCapacityLiters: number;
  systemVoltage: string;
  voltageOutput?: string;
  frequencyHz?: string;
  dimensions?: string;
  weightKg?: string;
  fuelType: string;
  imageRes: any;
  description: string;
}

const IMG_C125 = require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png');
const IMG_C75 = IMG_C125;

export const PLANTAS_CATALOG: CatalogPlanta[] = [
  {
    id: 'blue-power-c35',
    brand: 'Blue Power Generation',
    model: 'C35',
    powerKva: 35,
    powerKw: 28,
    primeKva: 31,
    engineBrand: 'Cummins',
    engineModel: '4B3.9G2 (4 Cil. en línea, 3.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A42-C (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite IL-9',
    fuelTankCanopyLiters: 180,
    fuelTankOpenLiters: 120,
    fuelConsumptionLh: '8.6 L/h @ 100% Prime',
    oilCapacityLiters: 10.9,
    oilType: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacityLiters: 7.2,
    systemVoltage: '24V DC',
    voltageOutput: '208V / 220V / 440V / 480V Trifásico',
    frequencyHz: '60 Hz / 1800 RPM',
    dimensions: '2580 x 1040 x 1732 mm',
    weightKg: '1.215 kg (Insonorizada) / 865 kg (Abierta)',
    fuelType: 'Diesel',
    imageRes: IMG_C125,
    description: 'Generador diésel de 35 kVA / 28 kW Standby (31 kVA Prime). Motor Cummins 4B3.9G2 aspirado natural con gobernador electrónico y alternador Leroy Somer con AVR R120.',
  },
  {
    id: 'blue-power-c55',
    brand: 'Blue Power Generation',
    model: 'C55',
    powerKva: 55,
    powerKw: 44,
    primeKva: 50,
    engineBrand: 'Cummins',
    engineModel: '4BT3.9G2 (4 Cil. Turbo, 3.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A42-G (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite AMF 20 / IL-9',
    fuelTankCanopyLiters: 180,
    fuelTankOpenLiters: 120,
    fuelConsumptionLh: '12.8 L/h @ 100% Prime',
    oilCapacityLiters: 10.9,
    oilType: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacityLiters: 7.2,
    systemVoltage: '24V DC',
    voltageOutput: '208V / 220V / 440V / 480V Trifásico',
    frequencyHz: '60 Hz / 1800 RPM',
    dimensions: '2680 x 1100 x 1732 mm',
    weightKg: '1.389 kg (Insonorizada) / 991 kg (Abierta)',
    fuelType: 'Diesel',
    imageRes: IMG_C125,
    description: 'Generador diésel de 55 kVA / 44 kW Standby (50 kVA Prime). Motor Cummins 4BT3.9G2 turboalimentado de alto rendimiento con cabina insonorizada de fábrica.',
  },
  {
    id: 'blue-power-c75',
    brand: 'Blue Power Generation',
    model: 'C75',
    powerKva: 75,
    powerKw: 60,
    primeKva: 68,
    engineBrand: 'Cummins',
    engineModel: '4BTA3.9-G2 (4 Cil. Turbo Post-Enfriado, 3.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A44-B (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite AMF 25 / IL-9',
    fuelTankCanopyLiters: 210,
    fuelTankOpenLiters: 150,
    fuelConsumptionLh: '16.5 L/h @ 100% Prime',
    oilCapacityLiters: 11.5,
    oilType: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacityLiters: 8.5,
    systemVoltage: '24V DC',
    voltageOutput: '208V / 220V / 440V / 480V Trifásico',
    frequencyHz: '60 Hz / 1800 RPM',
    dimensions: '2750 x 1100 x 1780 mm',
    weightKg: '1.520 kg (Insonorizada) / 1.110 kg (Abierta)',
    fuelType: 'Diesel',
    imageRes: IMG_C75,
    description: 'Generador diésel industrial de 75 kVA / 60 kW Standby (68 kVA Prime). Motor Cummins 4BTA3.9-G2 Turbo Aftercooled y alternador Leroy Somer TAL-A44-B.',
  },
  {
    id: 'blue-power-c125',
    brand: 'Blue Power Generation',
    model: 'C125',
    powerKva: 125,
    powerKw: 100,
    primeKva: 115,
    engineBrand: 'Cummins',
    engineModel: '6BT5.9G2 (6 Cil. Turbo, 5.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A44-D (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite IL-9',
    fuelTankCanopyLiters: 250,
    fuelTankOpenLiters: 180,
    fuelConsumptionLh: '26.8 L/h @ 100% Prime',
    oilCapacityLiters: 16.4,
    oilType: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacityLiters: 18.0,
    systemVoltage: '24V DC',
    voltageOutput: '208V / 220V / 440V / 480V Trifásico',
    frequencyHz: '60 Hz / 1800 RPM',
    dimensions: '3100 x 1150 x 1850 mm',
    weightKg: '1.850 kg (Insonorizada) / 1.420 kg (Abierta)',
    fuelType: 'Diesel',
    imageRes: IMG_C125,
    description: 'Generador diésel industrial de 125 kVA / 100 kW Standby. Motor Cummins 6BT5.9G2 de 6 cilindros para respaldo continuo en instalaciones críticas y comercios.',
  },
  {
    id: 'blue-power-c165',
    brand: 'Blue Power Generation',
    model: 'C165',
    powerKva: 165,
    powerKw: 132,
    primeKva: 150,
    engineBrand: 'Cummins',
    engineModel: '6BTA5.9-G2 (6 Cil. Turbo Aftercooled, 5.9L)',
    alternatorBrand: 'Stamford / Leroy Somer',
    alternatorModel: 'UCI274F / TAL-A44-J (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite AMF 25',
    fuelTankCanopyLiters: 340,
    fuelTankOpenLiters: 250,
    fuelConsumptionLh: '34.2 L/h @ 100% Prime',
    oilCapacityLiters: 16.4,
    oilType: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacityLiters: 21.0,
    systemVoltage: '24V DC',
    voltageOutput: '208V / 220V / 440V / 480V Trifásico',
    frequencyHz: '60 Hz / 1800 RPM',
    dimensions: '3250 x 1180 x 1920 mm',
    weightKg: '2.140 kg (Insonorizada) / 1.650 kg (Abierta)',
    fuelType: 'Diesel',
    imageRes: IMG_C75,
    description: 'Generador diésel de alta capacidad 165 kVA / 132 kW Standby (150 kVA Prime). Motor Cummins 6BTA5.9-G2 con post-enfriador y cabina insonorizada de trabajo pesado.',
  },
  {
    id: 'blue-power-c220',
    brand: 'Blue Power Generation',
    model: 'C220',
    powerKva: 220,
    powerKw: 176,
    primeKva: 200,
    engineBrand: 'Cummins',
    engineModel: '6CTA8.3-G2 (6 Cil. Turbo Aftercooled, 8.3L)',
    alternatorBrand: 'Stamford / Leroy Somer',
    alternatorModel: 'UCI274H / TAL-A46-B (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite AMF 25',
    fuelTankCanopyLiters: 420,
    fuelTankOpenLiters: 320,
    fuelConsumptionLh: '45.0 L/h @ 100% Prime',
    oilCapacityLiters: 23.8,
    oilType: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacityLiters: 28.0,
    systemVoltage: '24V DC',
    voltageOutput: '208V / 220V / 440V / 480V Trifásico',
    frequencyHz: '60 Hz / 1800 RPM',
    dimensions: '3650 x 1300 x 2100 mm',
    weightKg: '2.680 kg (Insonorizada) / 2.050 kg (Abierta)',
    fuelType: 'Diesel',
    imageRes: IMG_C125,
    description: 'Generador industrial de 220 kVA / 176 kW Standby (200 kVA Prime). Motor Cummins serie C de 8.3 litros para plantas industriales, centros clínicos y sedes corporativas.',
  },
];
