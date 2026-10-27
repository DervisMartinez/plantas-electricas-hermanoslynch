export interface PlantaSpecs {
  model: string;
  standbyPower: string;
  primePower: string;
  frequency: string;
  powerFactor: string;
  voltages: string;
  engineBrand: string;
  engineModel: string;
  cylinders: string;
  displacement: string;
  boreStroke: string;
  aspiration: string;
  compressionRatio: string;
  injectionType: string;
  governorType: string;
  engineHpStandby: string;
  alternatorBrand: string;
  alternatorModel: string;
  windingType: string;
  avrModel: string;
  voltageRegulation: string;
  insulationClass: string;
  protectionDegree: string;
  controllerBrand: string;
  controllerModel: string;
  oilCapacity: string;
  oilTypeRecommended: string;
  coolantCapacity: string;
  fuelCapacityCanopy: string;
  fuelCapacityOpen: string;
  fuelConsumption100Standby: string;
  fuelConsumption100Prime: string;
  fuelConsumption75Prime: string;
  fuelConsumption50Prime: string;
  electricalVoltage: string;
  dimensionsSilent: string;
  weightSilent: string;
  maintenanceIntervalOil: string;
  maintenanceIntervalFuelFilter: string;
  maintenanceIntervalAirFilter: string;
}

export const PLANTAS_SPECS_DB: Record<string, PlantaSpecs> = {
  'blue-power-c35': {
    model: 'Blue Power Generation C35',
    standbyPower: '35 kVA / 28 kW',
    primePower: '31 kVA / 25 kW',
    frequency: '60 Hz (1800 RPM)',
    powerFactor: '0.8',
    voltages: '208V, 220V, 440V, 480V (3 Fases / 4 Hilos / 12 Puntas)',
    engineBrand: 'Cummins',
    engineModel: '4B3.9G2',
    cylinders: '4 en línea',
    displacement: '3.9 Litros',
    boreStroke: '102 x 120 mm',
    aspiration: 'Aspirado Natural',
    compressionRatio: '18.0:1',
    injectionType: 'Inyección Directa Mecánica',
    governorType: 'Gobernador Electrónico de Velocidad',
    engineHpStandby: '44 HP @ 1800 RPM',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A42-C (1 cojinete, 4 polos)',
    avrModel: 'R120 Standard',
    voltageRegulation: '±1.0%',
    insulationClass: 'Clase H / Paso de bobinado 2/3',
    protectionDegree: 'IP23 (TIF < 50, THF < 2%)',
    windingType: '12 puntas reconectable, 3 fases',
    controllerBrand: 'ComAp',
    controllerModel: 'InteliLite IL-9 (Arranque automático AMF, display LCD)',
    oilCapacity: '10.9 Litros (Cárter)',
    oilTypeRecommended: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacity: '7.2 Litros (Motor)',
    fuelCapacityCanopy: '180 Litros (Autonomía ~20 hrs @ 100% carga)',
    fuelCapacityOpen: '120 Litros',
    fuelConsumption100Standby: '9.4 L/h (2.5 Gal/h)',
    fuelConsumption100Prime: '8.6 L/h (2.3 Gal/h)',
    fuelConsumption75Prime: '6.8 L/h (1.8 Gal/h)',
    fuelConsumption50Prime: '5.0 L/h (1.3 Gal/h)',
    electricalVoltage: '24V DC (Batería libre de mantenimiento)',
    dimensionsSilent: '2580 x 1040 x 1732 mm (L x An x Al)',
    weightSilent: '1215 kg (Neto insonorizada)',
    maintenanceIntervalOil: 'Cada 250 horas o 6 meses',
    maintenanceIntervalFuelFilter: 'Cada 250 horas',
    maintenanceIntervalAirFilter: 'Cada 500 horas',
  },
  'blue-power-c55': {
    model: 'Blue Power Generation C55',
    standbyPower: '55 kVA / 44 kW',
    primePower: '50 kVA / 40 kW',
    frequency: '60 Hz (1800 RPM)',
    powerFactor: '0.8',
    voltages: '208V, 220V, 440V, 480V (3 Fases / 4 Hilos / 12 Puntas)',
    engineBrand: 'Cummins',
    engineModel: '4BT3.9G2',
    cylinders: '4 en línea con turbocompresor',
    displacement: '3.9 Litros',
    boreStroke: '102 x 120 mm',
    aspiration: 'Turboalimentado (Turbocharged)',
    compressionRatio: '18.0:1',
    injectionType: 'Inyección Directa Mecánica',
    governorType: 'Gobernador Electrónico de Velocidad',
    engineHpStandby: '59 HP @ 1800 RPM',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A42-G (1 cojinete, 4 polos)',
    avrModel: 'R120 Standard',
    voltageRegulation: '±1.0%',
    insulationClass: 'Clase H / Paso de bobinado 2/3',
    protectionDegree: 'IP23 (TIF < 50, THF < 2%)',
    windingType: '12 puntas reconectable, 3 fases',
    controllerBrand: 'ComAp',
    controllerModel: 'InteliLite AMF 20 / IL-9 (Arranque por falla de red)',
    oilCapacity: '10.9 Litros (Cárter)',
    oilTypeRecommended: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacity: '7.2 Litros (Motor)',
    fuelCapacityCanopy: '180 Litros',
    fuelCapacityOpen: '120 Litros',
    fuelConsumption100Standby: '14.2 L/h',
    fuelConsumption100Prime: '12.8 L/h',
    fuelConsumption75Prime: '10.1 L/h',
    fuelConsumption50Prime: '7.3 L/h',
    electricalVoltage: '24V DC (Batería libre de mantenimiento)',
    dimensionsSilent: '2680 x 1100 x 1732 mm (L x An x Al)',
    weightSilent: '1389 kg (Neto insonorizada)',
    maintenanceIntervalOil: 'Cada 250 horas o 6 meses',
    maintenanceIntervalFuelFilter: 'Cada 250 horas',
    maintenanceIntervalAirFilter: 'Cada 500 horas',
  },
  'blue-power-c125': {
    model: 'Blue Power Generation C125',
    standbyPower: '125 kVA / 100 kW',
    primePower: '115 kVA / 92 kW',
    frequency: '60 Hz (1800 RPM)',
    powerFactor: '0.8',
    voltages: '208V, 220V, 440V, 480V (3 Fases / 4 Hilos / 12 Puntas)',
    engineBrand: 'Cummins',
    engineModel: '6BT5.9G2',
    cylinders: '6 en línea con turbocompresor',
    displacement: '5.9 Litros',
    boreStroke: '102 x 120 mm',
    aspiration: 'Turboalimentado (Turbocharged)',
    compressionRatio: '17.5:1',
    injectionType: 'Inyección Directa Mecánica',
    governorType: 'Gobernador Electrónico de Velocidad',
    engineHpStandby: '135 HP @ 1800 RPM',
    alternatorBrand: 'Leroy Somer',
    alternatorModel: 'TAL-A44-D',
    avrModel: 'R120 Standard',
    voltageRegulation: '±1.0%',
    insulationClass: 'Clase H',
    protectionDegree: 'IP23',
    windingType: '12 puntas reconectable, 3 fases',
    controllerBrand: 'ComAp',
    controllerModel: 'InteliLite IL-9',
    oilCapacity: '16.4 Litros',
    oilTypeRecommended: 'SAE 15W-40 API CI-4 / CK-4 Diésel',
    coolantCapacity: '18.0 Litros',
    fuelCapacityCanopy: '250 Litros',
    fuelCapacityOpen: '180 Litros',
    fuelConsumption100Standby: '29.5 L/h',
    fuelConsumption100Prime: '26.8 L/h',
    fuelConsumption75Prime: '20.4 L/h',
    fuelConsumption50Prime: '14.8 L/h',
    electricalVoltage: '24V DC',
    dimensionsSilent: '3100 x 1150 x 1850 mm',
    weightSilent: '1850 kg',
    maintenanceIntervalOil: 'Cada 250 horas o 6 meses',
    maintenanceIntervalFuelFilter: 'Cada 250 horas',
    maintenanceIntervalAirFilter: 'Cada 500 horas',
  },
};

export const getPlantaSpecs = (modelOrId: string): PlantaSpecs | undefined => {
  const clean = modelOrId.toLowerCase().trim();
  if (clean.includes('c35')) return PLANTAS_SPECS_DB['blue-power-c35'];
  if (clean.includes('c55')) return PLANTAS_SPECS_DB['blue-power-c55'];
  if (clean.includes('c125')) return PLANTAS_SPECS_DB['blue-power-c125'];
  return PLANTAS_SPECS_DB[clean];
};
