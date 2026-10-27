export interface Planta {
  id: string;
  userId?: string;
  brand: string; // 'Blue Power Generation'
  model: string; // 'C35' | 'C55' | 'C125' | string
  powerKva: number; // 35, 55, 125, etc.
  powerKw: number; // 28, 44, 100, etc.
  fuelType: string; // 'Diesel' | 'Gas' | 'Dual'
  engineBrand: string; // 'Cummins'
  engineModel?: string; // '4B3.9G2', '4BT3.9G2', '6BT5.9'
  alternatorBrand?: string; // 'Leroy Somer'
  alternatorModel?: string; // 'TAL-A42-C', 'TAL-A42-G'
  controllerModel?: string; // 'ComAp InteliLite IL-9'
  currentHours: number; // Horómetro acumulado
  installationType: string; // 'Canopy Insonorizada' | 'Abierta'
  fuelTankCapacity?: number; // Litros
  oilPanCapacity?: number; // Litros
  coolantCapacity?: number; // Litros
  systemVoltage?: string; // '24V DC'
  voltageOutput?: string; // '208V / 220V / 440V / 480V'
  imageUrl?: string;
  catalogId?: string;
  serialNumber?: string;
  location?: string;
  isFromAgency?: boolean;
  createdAt?: string;
}

export type Equipment = Planta;
