export type PlantaComponentType =
  | 'engineOil'
  | 'oilFilter'
  | 'fuelFilter'
  | 'airFilter'
  | 'coolant'
  | 'startingBattery'
  | 'fanBelt'
  | 'valveAdjustment'
  | 'fuelTankInspection'
  | 'alternatorWinding';

export interface PlantaComponentInfo {
  id: PlantaComponentType;
  name: string;
  subsystem: string;
  intervalHours: number;
  icon: string;
  description: string;
}

export const PLANTA_COMPONENTS: Record<PlantaComponentType, PlantaComponentInfo> = {
  engineOil: {
    id: 'engineOil',
    name: 'Aceite de Motor',
    subsystem: 'Lubricación Diésel (SAE 15W-40 CI-4)',
    intervalHours: 250,
    icon: 'oil',
    description: 'Cambio de aceite de motor y limpieza de cárter.',
  },
  oilFilter: {
    id: 'oilFilter',
    name: 'Filtro de Aceite',
    subsystem: 'Filtración de Lubricante',
    intervalHours: 250,
    icon: 'filter-alt',
    description: 'Reemplazo del cartucho filtrante de aceite lubricante.',
  },
  fuelFilter: {
    id: 'fuelFilter',
    name: 'Filtro de Diésel / Trampa',
    subsystem: 'Alimentación de Combustible',
    intervalHours: 250,
    icon: 'local-gas-station',
    description: 'Reemplazo de filtro de combustible primario y separador de agua.',
  },
  airFilter: {
    id: 'airFilter',
    name: 'Filtro de Aire',
    subsystem: 'Admisión de Aire al Motor',
    intervalHours: 500,
    icon: 'air',
    description: 'Limpieza o reemplazo de elemento primario y secundario.',
  },
  coolant: {
    id: 'coolant',
    name: 'Líquido Refrigerante',
    subsystem: 'Sistema de Enfriamiento por Radiador',
    intervalHours: 1000,
    icon: 'severe-cold',
    description: 'Drenaje, lavado de circuito y recarga de refrigerante al 50/50.',
  },
  startingBattery: {
    id: 'startingBattery',
    name: 'Banco Baterías 24V',
    subsystem: 'Sistema de Arranque Eléctrico',
    intervalHours: 2000,
    icon: 'battery-charging-full',
    description: 'Verificación de tensión en flotación (cargador de batería) y estado de celdas.',
  },
  fanBelt: {
    id: 'fanBelt',
    name: 'Correa de Ventilador',
    subsystem: 'Transmisión Mecánica Auxiliar',
    intervalHours: 1000,
    icon: 'rotate-right',
    description: 'Inspección de tensión y agrietamiento de la correa poli-V del alternador.',
  },
  valveAdjustment: {
    id: 'valveAdjustment',
    name: 'Calibración de Válvulas',
    subsystem: 'Tren Valvular e Inyectores',
    intervalHours: 1500,
    icon: 'tune',
    description: 'Ajuste de holgura de válvulas de admisión/escape y calibración de inyección.',
  },
  fuelTankInspection: {
    id: 'fuelTankInspection',
    name: 'Inspección de Tanque',
    subsystem: 'Almacenamiento de Diésel',
    intervalHours: 500,
    icon: 'propane-tank',
    description: 'Drenaje de agua y lodos acumulados en el fondo del tanque de combustible.',
  },
  alternatorWinding: {
    id: 'alternatorWinding',
    name: 'Aislamiento de Alternador',
    subsystem: 'Generación Eléctrica (Leroy Somer)',
    intervalHours: 2000,
    icon: 'bolt',
    description: 'Prueba de resistencia de aislamiento (Megado) del estator y rotor.',
  },
};

/**
 * Calcula el desgaste porcentual restante (100% = Nuevo, 0% = Servicio urgente)
 * basado en el horómetro actual de la planta y las horas del último servicio.
 */
export function calculatePlantaWearPercentage(
  currentHours: number,
  lastServiceHours: number = 0,
  intervalHours: number
): number {
  if (intervalHours <= 0) return 100;
  const hoursSinceService = Math.max(0, currentHours - lastServiceHours);
  const remaining = 1 - hoursSinceService / intervalHours;
  return Math.max(0, Math.min(100, Math.round(remaining * 100)));
}
