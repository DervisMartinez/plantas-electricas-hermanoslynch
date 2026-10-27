export interface CatalogPlanta {
  id: string;
  brand: string;
  model: string;
  powerKva: number;
  powerKw: number;
  engineBrand: string;
  engineModel: string;
  alternatorBrand: string;
  alternatorModel: string;
  controllerModel: string;
  fuelTankCanopyLiters: number;
  fuelTankOpenLiters: number;
  oilCapacityLiters: number;
  coolantCapacityLiters: number;
  systemVoltage: string;
  fuelType: string;
  imageRes: any;
  description: string;
}

export const PLANTAS_CATALOG: CatalogPlanta[] = [
  {
    id: 'blue-power-c35',
    brand: 'Blue Power Generation',
    model: 'C35',
    powerKva: 35,
    powerKw: 28,
    engineBrand: 'Cummins',
    engineModel: '4B3.9G2 (4 Cil. en línea, 3.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A42-C (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite IL-9',
    fuelTankCanopyLiters: 180,
    fuelTankOpenLiters: 120,
    oilCapacityLiters: 10.9,
    coolantCapacityLiters: 7.2,
    systemVoltage: '24V DC',
    fuelType: 'Diesel',
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador diésel de 35 kVA / 28 kW Standby (31 kVA Prime). Motor Cummins 4B3.9G2 aspirado natural con gobernador electrónico y alternador Leroy Somer con AVR R120.',
  },
  {
    id: 'blue-power-c55',
    brand: 'Blue Power Generation',
    model: 'C55',
    powerKva: 55,
    powerKw: 44,
    engineBrand: 'Cummins',
    engineModel: '4BT3.9G2 (4 Cil. Turbo, 3.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A42-G (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite AMF 20 / IL-9',
    fuelTankCanopyLiters: 180,
    fuelTankOpenLiters: 120,
    oilCapacityLiters: 10.9,
    coolantCapacityLiters: 7.2,
    systemVoltage: '24V DC',
    fuelType: 'Diesel',
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador diésel de 55 kVA / 44 kW Standby (50 kVA Prime). Motor Cummins 4BT3.9G2 turboalimentado de alto rendimiento con cabina insonorizada de fábrica.',
  },
  {
    id: 'blue-power-c125',
    brand: 'Blue Power Generation',
    model: 'C125',
    powerKva: 125,
    powerKw: 100,
    engineBrand: 'Cummins',
    engineModel: '6BT5.9G2 (6 Cil. Turbo, 5.9L)',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A44-D (12 Puntas, 3 Fases)',
    controllerModel: 'ComAp InteliLite IL-9',
    fuelTankCanopyLiters: 250,
    fuelTankOpenLiters: 180,
    oilCapacityLiters: 16.4,
    coolantCapacityLiters: 18.0,
    systemVoltage: '24V DC',
    fuelType: 'Diesel',
    imageRes: require('../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png'),
    description: 'Generador diésel industrial de 125 kVA / 100 kW Standby. Motor Cummins 6BT5.9G2 de 6 cilindros para respaldo continuo en instalaciones críticas y comercios.',
  },
];
