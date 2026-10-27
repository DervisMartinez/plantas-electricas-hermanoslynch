export type VehicleType = 'moto' | 'car' | 'planta';

export type ComponentType = 
  | 'oil' 
  | 'oil_filter'
  | 'tires_front' 
  | 'tires_rear' 
  | 'brakes_front' 
  | 'brakes_rear' 
  | 'chain' 
  | 'timing_belt'
  | 'cabin_filter'
  | 'coolant'
  | 'brake_fluid'
  | 'transmission_fluid'
  | 'battery'
  | 'shock_absorbers'
  | 'accessory_belt'
  | 'wiper_blades'
  | 'clutch'
  | 'air_filter' 
  | 'fuel_filter' 
  | 'spark_plugs'
  | 'fuel'
  | 'other';

export interface ServiceRecord {
  id: string;
  type: ComponentType;
  date: string;
  odometer: number;
  costUSD: number;
  notes?: string;
  isAgency?: boolean;
  status?: 'completed' | 'scheduled';
  scheduledTime?: string;
}

export interface Moto {
  id: string;
  brand: string;
  model: string;
  year: number;
  imageUrl?: string;
  catalogImageRes?: any;
  plate?: string;
  vehicleType?: VehicleType;
  
  // Real-time tracking (en plantas eléctricas el odómetro actúa como horómetro de horas de uso)
  currentOdometer: number;
  currentHours?: number;
  powerKva?: number;
  powerKw?: number;
  fuelType?: string;
  engineBrand?: string;
  engineModel?: string;
  alternatorBrand?: string;
  alternatorModel?: string;
  controllerModel?: string;
  installationType?: string;
  fuelTankCapacity?: number;
  oilPanCapacity?: number;
  coolantCapacity?: number;
  systemVoltage?: string;
  serialNumber?: string;
  location?: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  
  isFromAgency?: boolean;
  agencyMaintenanceDate?: string;
  
  // Custom user settings
  customOilInterval?: number;
  customTirePressureFront?: number;
  customTirePressureRear?: number;
}

/**
 * Utility to identify if a vehicle entity is a car / commercial support vehicle.
 */
export const isCar = (vehicle?: Moto | null): boolean => {
  if (!vehicle) return false;
  if (vehicle.vehicleType === 'car') return true;
  const brand = vehicle.brand.toLowerCase();
  const model = vehicle.model.toLowerCase();
  return (
    brand.includes('toyota') ||
    brand.includes('ford') ||
    brand.includes('chevrolet') ||
    brand.includes('nissan') ||
    brand.includes('mitsubishi') ||
    model.includes('hilux') ||
    model.includes('f-150') ||
    model.includes('d-max')
  );
};

/**
 * Utility to identify if a vehicle entity is an industrial generator / Planta Eléctrica.
 */
export const isPlanta = (vehicle?: Moto | null): boolean => {
  if (!vehicle) return true; // Default to planta for Hermanos Lynch
  if (vehicle.vehicleType === 'planta') return true;
  const brand = vehicle.brand.toLowerCase();
  const model = vehicle.model.toLowerCase();
  return (
    brand.includes('blue power') ||
    brand.includes('lynch') ||
    brand.includes('cummins') ||
    brand.includes('caterpillar') ||
    brand.includes('perkins') ||
    model.includes('c35') ||
    model.includes('c55') ||
    model.includes('c125') ||
    model.includes('planta') ||
    model.includes('generador')
  );
};
