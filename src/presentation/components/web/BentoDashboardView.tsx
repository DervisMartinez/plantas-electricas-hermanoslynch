import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Platform,
  Linking,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { isCar, isPlanta, Moto } from '../../../domain/entities/Moto';
import { ComponentType } from '../../../constants/telemetry';
import { UserManagementModal } from '../UserManagementModal';
import { OperatorAgendaModal } from '../OperatorAgendaModal';
import { CreateOperatorModal } from '../CreateOperatorModal';
import { AssignOperatorModal } from '../AssignOperatorModal';

// Brand Assets
const HL_LOGO_REQUIRE = require('../../../../assets/images/logo and media coorporative/logo-sin-nombre.png');

interface BentoDashboardViewProps {
  activeTab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile';
  onSelectTab: (tab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile') => void;
  onOpenQuickHours: () => void;
  onOpenQuickFuel: () => void;
  onOpenSpecs: () => void;
  onOpenStats: () => void;
  onOpenReport: () => void;
  onOpenServicesTab: (initialComp?: ComponentType) => void;
  children?: React.ReactNode;
}

/**
 * Helper to resolve geographic taxonomy (País, Zona, Estado) strictly from real DB strings
 * without inventing random data. If a real Venezuelan state/city is present in `state`, `city`, or `location`,
 * it resolves its official Zone and Country (`Venezuela`); otherwise it preserves the exact DB text.
 */
const resolveRealGeo = (raw: {
  location?: string;
  state?: string;
  city?: string;
  country?: string;
  zone?: string;
}) => {
  const combined = `${raw.state || ''} ${raw.city || ''} ${raw.location || ''} ${raw.country || ''}`.toLowerCase();

  let detectedState = (raw.state || raw.city || raw.location || '').trim();
  let detectedZone = (raw.zone || '').trim();
  let detectedCountry = (raw.country || '').trim();

  if (combined.includes('carabobo') || combined.includes('valencia') || combined.includes('puerto cabello') || combined.includes('guacara')) {
    detectedState = 'Carabobo';
    detectedZone = detectedZone || 'Zona Central';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('distrito capital') || combined.includes('caracas') || combined.includes('libertador')) {
    detectedState = 'Distrito Capital';
    detectedZone = detectedZone || 'Zona Capital';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('miranda') || combined.includes('chacao') || combined.includes('baruta') || combined.includes('guarenas') || combined.includes('los teques')) {
    detectedState = 'Miranda';
    detectedZone = detectedZone || 'Zona Capital';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('aragua') || combined.includes('maracay') || combined.includes('cagua') || combined.includes('turmero')) {
    detectedState = 'Aragua';
    detectedZone = detectedZone || 'Zona Central';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('zulia') || combined.includes('maracaibo') || combined.includes('cabimas')) {
    detectedState = 'Zulia';
    detectedZone = detectedZone || 'Zona Occidental';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('lara') || combined.includes('barquisimeto') || combined.includes('cabudare')) {
    detectedState = 'Lara';
    detectedZone = detectedZone || 'Zona Occidental';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('anzoátegui') || combined.includes('anzoategui') || combined.includes('barcelona') || combined.includes('lechería') || combined.includes('puerto la cruz')) {
    detectedState = 'Anzoátegui';
    detectedZone = detectedZone || 'Zona Oriental';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('táchira') || combined.includes('tachira') || combined.includes('san cristóbal') || combined.includes('san cristobal')) {
    detectedState = 'Táchira';
    detectedZone = detectedZone || 'Zona Los Andes';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('bolívar') || combined.includes('bolivar') || combined.includes('puerto ordaz') || combined.includes('ciudad guayana')) {
    detectedState = 'Bolívar';
    detectedZone = detectedZone || 'Zona Guayana';
    detectedCountry = detectedCountry || 'Venezuela';
  } else if (combined.includes('colombia') || combined.includes('bogotá') || combined.includes('medellín')) {
    detectedCountry = detectedCountry || 'Colombia';
  } else if (combined.includes('panamá') || combined.includes('panama')) {
    detectedCountry = detectedCountry || 'Panamá';
  } else if (combined.includes('ee.uu') || combined.includes('usa') || combined.includes('miami') || combined.includes('estados unidos')) {
    detectedCountry = detectedCountry || 'EE.UU.';
  }

  return {
    country: detectedCountry || 'Sin País en BD',
    zone: detectedZone || 'Sin Zona en BD',
    state: detectedState || 'Sin Estado en BD',
  };
};

/**
 * Real SVG Comparative Bar Chart (100% Real Data from `allPlants`):
 * Compares each registered plant's Real Power Capacity (kVA) and Real Operating Hours (Horómetro).
 */
const RealFleetBarChart = ({
  plants,
  isDark,
  primaryColor,
  goldColor,
  textSecondary,
}: {
  plants: Moto[];
  isDark: boolean;
  primaryColor: string;
  goldColor: string;
  textSecondary: string;
}) => {
  const displayPlants = plants.slice(0, 8);
  const maxVal = useMemo(() => {
    if (displayPlants.length === 0) return 100;
    let m = 10;
    displayPlants.forEach((p) => {
      const kva = p.powerKva || 0;
      const hrs = p.currentHours || p.currentOdometer || 0;
      if (kva > m) m = kva;
      if (hrs > m) m = hrs;
    });
    return Math.ceil(m / 25) * 25;
  }, [displayPlants]);

  const yTicks = [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0];

  if (displayPlants.length === 0) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
        <MaterialCommunityIcons name="generator-portable" size={38} color={textSecondary} />
        <Text style={{ fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: textSecondary, marginTop: 8 }}>
          No hay plantas registradas en la base de datos.
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const chartHeight = 190;
    const chartWidth = 680;
    const leftPad = 48;
    const bottomPad = 32;
    const topPad = 14;
    const usableW = chartWidth - leftPad - 16;
    const slotW = usableW / displayPlants.length;

    return (
      <View style={{ width: '100%', height: 235 }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + bottomPad + topPad}`} width="100%" height="100%">
          {yTicks.map((tick, idx) => {
            const y = topPad + (idx / (yTicks.length - 1)) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={leftPad}
                  y1={y}
                  x2={chartWidth - 10}
                  y2={y}
                  stroke={isDark ? 'rgba(255,255,255,0.07)' : '#e6e8ea'}
                  strokeDasharray={idx === yTicks.length - 1 ? undefined : '4 4'}
                  strokeWidth="1"
                />
                <text
                  x={leftPad - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill={textSecondary}
                  fontSize="10"
                  fontFamily="Montserrat, sans-serif"
                  fontWeight="600"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {displayPlants.map((plant, idx) => {
            const kva = plant.powerKva || 0;
            const hrs = plant.currentHours || plant.currentOdometer || 0;
            const kvaH = maxVal > 0 ? Math.max(4, (kva / maxVal) * chartHeight) : 4;
            const hrsH = maxVal > 0 ? Math.max(4, (hrs / maxVal) * chartHeight) : 4;
            const centerX = leftPad + idx * slotW + slotW / 2;
            const barW = Math.min(24, Math.max(12, slotW * 0.26));
            const label = `${plant.model || 'Planta'} (${plant.serialNumber || plant.plate || `#${idx + 1}`})`.slice(0, 14);

            return (
              <g key={plant.id}>
                <rect
                  x={centerX - barW - 2}
                  y={topPad + chartHeight - kvaH}
                  width={barW}
                  height={kvaH}
                  rx="4"
                  fill={primaryColor}
                />
                <rect
                  x={centerX + 2}
                  y={topPad + chartHeight - hrsH}
                  width={barW}
                  height={hrsH}
                  rx="4"
                  fill={goldColor}
                />
                <text
                  x={centerX}
                  y={topPad + chartHeight + 18}
                  textAnchor="middle"
                  fill={textSecondary}
                  fontSize="10"
                  fontFamily="Montserrat, sans-serif"
                  fontWeight="600"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </View>
    );
  }

  return (
    <View style={{ height: 200, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 20 }}>
      {displayPlants.map((plant) => {
        const kva = plant.powerKva || 0;
        const hrs = plant.currentHours || plant.currentOdometer || 0;
        const kvaPct = maxVal > 0 ? Math.max(5, Math.round((kva / maxVal) * 100)) : 5;
        const hrsPct = maxVal > 0 ? Math.max(5, Math.round((hrs / maxVal) * 100)) : 5;
        return (
          <View key={plant.id} style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 }}>
              <View style={{ width: 12, height: `${kvaPct}%`, backgroundColor: primaryColor, borderRadius: 3 }} />
              <View style={{ width: 12, height: `${hrsPct}%`, backgroundColor: goldColor, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 10, color: textSecondary, marginTop: 6 }} numberOfLines={1}>
              {plant.model}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/**
 * Real SVG Circular Progress Ring
 */
const RealDonutRing = ({
  percent,
  primaryColor,
  trackColor,
  textColor,
}: {
  percent: number;
  primaryColor: string;
  trackColor: string;
  textColor: string;
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (Platform.OS === 'web') {
    const r = 15.9155;
    const dash = `${clamped}, 100`;
    return (
      <View style={{ width: 64, height: 64, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
        <svg viewBox="0 0 36 36" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
          <path
            d={`M18 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
            fill="none"
            stroke={trackColor}
            strokeWidth="3.8"
          />
          <path
            d={`M18 2.0845 a ${r} ${r} 0 0 1 0 31.831 a ${r} ${r} 0 0 1 0 -31.831`}
            fill="none"
            stroke={primaryColor}
            strokeDasharray={dash}
            strokeLinecap="round"
            strokeWidth="3.8"
          />
        </svg>
        <Text
          style={{
            position: 'absolute',
            fontFamily: 'Montserrat_700Bold',
            fontSize: 13,
            color: textColor,
          }}
        >
          {clamped}%
        </Text>
      </View>
    );
  }
  return (
    <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: primaryColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Montserrat_700Bold', fontSize: 13, color: textColor }}>{clamped}%</Text>
    </View>
  );
};

export const BentoDashboardView: React.FC<BentoDashboardViewProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickHours,
  onOpenQuickFuel,
  onOpenStats,
  onOpenReport,
  onOpenServicesTab,
  children,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const {
    myMoto,
    motos,
    selectMoto,
    records,
    drivesCompanyVehicle,
    logout,
    loadSystemUsers,
    approveUser,
    rejectUser,
    userName,
    userEmail,
    isAdmin,
    isSuperAdmin,
    userRoleTitle,
    superAdminsList,
    operatorsList,
    clientsList,
    pendingUsersList,
    setIsAddingMoto,
  } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const hasSuperAccess = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (hasSuperAccess) {
      loadSystemUsers();
    }
  }, [hasSuperAccess, loadSystemUsers]);

  // Live indicator pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const userInitials = useMemo(() => {
    const name = (userName || userEmail || 'Usuario').trim();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [userName, userEmail]);

  // Dedicated Super Admin Tabs (Each domain has its own independent tab — nothing piled up together!)
  // 'overview' = Resumen Ejecutivo
  // 'plants'   = Disponibilidad de Plantas
  // 'personnel'= Personal Operador & Técnicos
  // 'users'    = Usuarios / Clientes & Solicitudes
  const [perspectiveTab, setPerspectiveTab] = useState<'overview' | 'plants' | 'personnel' | 'users'>('overview');

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Modals
  const [userMgmtVisible, setUserMgmtVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [createOperatorVisible, setCreateOperatorVisible] = useState(false);
  const [assigningOperator, setAssigningOperator] = useState<any | null>(null);

  // =========================================================================
  // 100% REAL DATA FROM SUPABASE / MOTOCONTEXT
  // =========================================================================
  const allPlants = useMemo(() => {
    return (motos || []).filter(isPlanta).map((p) => {
      const geo = resolveRealGeo({ location: p.location });
      const isAssigned = !!(p.assignedOperatorId || (p.assignedOperatorName && p.assignedOperatorName.trim()));
      const kva = p.powerKva || 0;
      const category =
        kva >= 100
          ? 'Alta Capacidad (≥100 kVA)'
          : kva >= 50
          ? 'Media Capacidad (50-99 kVA)'
          : 'Compactas (<50 kVA)';
      return {
        ...p,
        geoCountry: geo.country,
        geoZone: geo.zone,
        geoState: geo.state,
        isAssigned,
        category,
      };
    });
  }, [motos]);

  // 1. Dedicated Personnel List (ONLY Operators & Super Admins)
  const allPersonnelList = useMemo(() => {
    const map = new Map<string, any>();
    (superAdminsList || []).forEach((u: any) => {
      const geo = resolveRealGeo({ state: u.state, city: u.city, country: u.country, location: u.location });
      map.set(u.id, {
        ...u,
        resolvedRole: 'superadmin',
        geoCountry: geo.country,
        geoZone: geo.zone,
        geoState: geo.state,
        deptLabel: (u.department || u.specialty || 'Dirección Ejecutiva').trim(),
      });
    });
    (operatorsList || []).forEach((u: any) => {
      if (!map.has(u.id)) {
        const geo = resolveRealGeo({ state: u.state, city: u.city, country: u.country, location: u.location });
        map.set(u.id, {
          ...u,
          resolvedRole: 'operator',
          geoCountry: geo.country,
          geoZone: geo.zone,
          geoState: geo.state,
          deptLabel: (u.department || u.specialty || 'Soporte Técnico').trim(),
        });
      }
    });
    return Array.from(map.values());
  }, [superAdminsList, operatorsList]);

  // 2. Dedicated Users / Clients List (ONLY Regular Clients & Pending Approvals)
  const allUsersAndClientsList = useMemo(() => {
    const map = new Map<string, any>();
    (clientsList || []).forEach((u: any) => {
      const geo = resolveRealGeo({ state: u.state, city: u.city, country: u.country, location: u.location });
      map.set(u.id, {
        ...u,
        resolvedRole: 'client',
        isPending: u.approval_status === 'pending',
        geoCountry: geo.country,
        geoZone: geo.zone,
        geoState: geo.state,
      });
    });
    (pendingUsersList || []).forEach((u: any) => {
      if (!map.has(u.id)) {
        const geo = resolveRealGeo({ state: u.state, city: u.city, country: u.country, location: u.location });
        map.set(u.id, {
          ...u,
          resolvedRole: u.role || 'client',
          isPending: true,
          geoCountry: geo.country,
          geoZone: geo.zone,
          geoState: geo.state,
        });
      }
    });
    return Array.from(map.values());
  }, [clientsList, pendingUsersList]);

  // =========================================================================
  // TAB 2 FILTERS: DISPONIBILIDAD DE PLANTAS (País, Zona, Estado, Capacidad, Disponibilidad)
  // =========================================================================
  const [plantAvailabilityFilter, setPlantAvailabilityFilter] = useState<'Todas' | 'Disponibles' | 'Asignadas'>('Todas');
  const [plantCategoryFilter, setPlantCategoryFilter] = useState('Todas');
  const [plantCountryFilter, setPlantCountryFilter] = useState('Todos');
  const [plantZoneFilter, setPlantZoneFilter] = useState('Todas');
  const [plantStateFilter, setPlantStateFilter] = useState('Todos');
  const [plantSearch, setPlantSearch] = useState('');

  const COUNTRIES_LIST = ['Todos', 'Venezuela', 'Colombia', 'Panamá', 'EE.UU.'];
  const ZONES_LIST = ['Todas', 'Zona Central', 'Zona Capital', 'Zona Occidental', 'Zona Oriental', 'Zona Los Andes', 'Zona Guayana'];
  const STATES_LIST = useMemo(() => {
    const base = ['Todos', 'Carabobo', 'Distrito Capital', 'Miranda', 'Aragua', 'Zulia', 'Lara', 'Anzoátegui', 'Táchira', 'Bolívar'];
    const set = new Set<string>(base);
    allPlants.forEach((p) => {
      if (p.location && p.location.trim()) set.add(p.location.trim());
      if (p.geoState && p.geoState !== 'Sin Estado en BD') set.add(p.geoState);
    });
    return Array.from(set);
  }, [allPlants]);

  const PLANT_CATEGORIES = [
    'Todas',
    'Alta Capacidad (≥100 kVA)',
    'Media Capacidad (50-99 kVA)',
    'Compactas (<50 kVA)',
  ];

  const filteredFleetPlants = useMemo(() => {
    return allPlants.filter((plant) => {
      if (plantAvailabilityFilter === 'Disponibles' && plant.isAssigned) return false;
      if (plantAvailabilityFilter === 'Asignadas' && !plant.isAssigned) return false;
      if (plantCategoryFilter !== 'Todas' && plant.category !== plantCategoryFilter) return false;
      if (plantCountryFilter !== 'Todos' && plant.geoCountry.toLowerCase() !== plantCountryFilter.toLowerCase()) return false;
      if (plantZoneFilter !== 'Todas' && plant.geoZone.toLowerCase() !== plantZoneFilter.toLowerCase()) return false;
      if (
        plantStateFilter !== 'Todos' &&
        plant.geoState.toLowerCase() !== plantStateFilter.toLowerCase() &&
        !(plant.location || '').toLowerCase().includes(plantStateFilter.toLowerCase())
      ) {
        return false;
      }

      const q = (plantSearch || searchQuery).toLowerCase().trim();
      if (q) {
        const match =
          (plant.brand || '').toLowerCase().includes(q) ||
          (plant.model || '').toLowerCase().includes(q) ||
          (plant.serialNumber || plant.plate || '').toLowerCase().includes(q) ||
          (plant.location || '').toLowerCase().includes(q) ||
          (plant.assignedOperatorName || '').toLowerCase().includes(q) ||
          plant.geoState.toLowerCase().includes(q) ||
          plant.geoZone.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allPlants,
    plantAvailabilityFilter,
    plantCategoryFilter,
    plantCountryFilter,
    plantZoneFilter,
    plantStateFilter,
    plantSearch,
    searchQuery,
  ]);

  // =========================================================================
  // TAB 3 FILTERS: PERSONAL OPERADOR & TÉCNICOS (Rol, País, Zona, Estado, Departamento)
  // =========================================================================
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<'Todo el Personal' | 'Operadores Técnicos' | 'Super Administradores'>('Todo el Personal');
  const [personnelAssignFilter, setPersonnelAssignFilter] = useState<'Todos' | 'Con Plantas a Cargo' | 'Disponibles (0 Plantas)' | 'Con Vehículo de Flota'>('Todos');
  const [personnelCountryFilter, setPersonnelCountryFilter] = useState('Todos');
  const [personnelZoneFilter, setPersonnelZoneFilter] = useState('Todas');
  const [personnelStateFilter, setPersonnelStateFilter] = useState('Todos');
  const [personnelDeptFilter, setPersonnelDeptFilter] = useState('Todos');
  const [personnelSearch, setPersonnelSearch] = useState('');

  const personnelDeptsList = useMemo(() => {
    const set = new Set<string>([
      'Todos',
      'Plantas Eléctricas',
      'Especialista Técnico Senior',
      'Mantenimiento Preventivo',
      'Dirección Ejecutiva',
    ]);
    allPersonnelList.forEach((p: any) => {
      if (p.deptLabel) set.add(p.deptLabel);
    });
    return Array.from(set);
  }, [allPersonnelList]);

  const filteredPersonnelList = useMemo(() => {
    return allPersonnelList.filter((op: any) => {
      if (personnelRoleFilter === 'Operadores Técnicos' && op.resolvedRole !== 'operator') return false;
      if (personnelRoleFilter === 'Super Administradores' && op.resolvedRole !== 'superadmin') return false;

      const opPlants = allPlants.filter(
        (p) =>
          p.assignedOperatorId === op.id ||
          (p.assignedOperatorName && op.full_name && p.assignedOperatorName.toLowerCase().trim() === op.full_name.toLowerCase().trim())
      );

      if (personnelAssignFilter === 'Con Plantas a Cargo' && opPlants.length === 0) return false;
      if (personnelAssignFilter === 'Disponibles (0 Plantas)' && opPlants.length > 0) return false;
      if (personnelAssignFilter === 'Con Vehículo de Flota' && !op.assigned_vehicle_name && !op.drives_company_vehicle) return false;

      if (personnelCountryFilter !== 'Todos' && op.geoCountry.toLowerCase() !== personnelCountryFilter.toLowerCase()) return false;
      if (personnelZoneFilter !== 'Todas' && op.geoZone.toLowerCase() !== personnelZoneFilter.toLowerCase()) return false;
      if (personnelStateFilter !== 'Todos' && op.geoState.toLowerCase() !== personnelStateFilter.toLowerCase()) return false;
      if (personnelDeptFilter !== 'Todos' && op.deptLabel.toLowerCase() !== personnelDeptFilter.toLowerCase()) return false;

      const q = (personnelSearch || searchQuery).toLowerCase().trim();
      if (q) {
        const match =
          (op.full_name || '').toLowerCase().includes(q) ||
          (op.email || '').toLowerCase().includes(q) ||
          (op.operator_code || '').toLowerCase().includes(q) ||
          (op.deptLabel || '').toLowerCase().includes(q) ||
          op.geoState.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allPersonnelList,
    allPlants,
    personnelRoleFilter,
    personnelAssignFilter,
    personnelCountryFilter,
    personnelZoneFilter,
    personnelStateFilter,
    personnelDeptFilter,
    personnelSearch,
    searchQuery,
  ]);

  // =========================================================================
  // TAB 4 FILTERS: USUARIOS Y CLIENTES (Estado de Cuenta, País, Zona, Estado)
  // =========================================================================
  const [userStatusFilter, setUserStatusFilter] = useState<'Todos los Usuarios' | 'Usuarios Activos' | 'Solicitudes Pendientes'>('Todos los Usuarios');
  const [userCountryFilter, setUserCountryFilter] = useState('Todos');
  const [userZoneFilter, setUserZoneFilter] = useState('Todas');
  const [userStateFilter, setUserStateFilter] = useState('Todos');
  const [userSearch, setUserSearch] = useState('');

  const filteredUsersList = useMemo(() => {
    return allUsersAndClientsList.filter((u: any) => {
      if (userStatusFilter === 'Usuarios Activos' && u.isPending) return false;
      if (userStatusFilter === 'Solicitudes Pendientes' && !u.isPending) return false;
      if (userCountryFilter !== 'Todos' && u.geoCountry.toLowerCase() !== userCountryFilter.toLowerCase()) return false;
      if (userZoneFilter !== 'Todas' && u.geoZone.toLowerCase() !== userZoneFilter.toLowerCase()) return false;
      if (userStateFilter !== 'Todos' && u.geoState.toLowerCase() !== userStateFilter.toLowerCase()) return false;

      const q = (userSearch || searchQuery).toLowerCase().trim();
      if (q) {
        const match =
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q) ||
          u.geoState.toLowerCase().includes(q) ||
          u.geoCountry.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allUsersAndClientsList,
    userStatusFilter,
    userCountryFilter,
    userZoneFilter,
    userStateFilter,
    userSearch,
    searchQuery,
  ]);

  // =========================================================================
  // REAL FLEET & FINANCIAL METRICS
  // =========================================================================
  const fleetStats = useMemo(() => {
    const total = allPlants.length;
    const assigned = allPlants.filter((p) => p.isAssigned).length;
    const unassigned = Math.max(0, total - assigned);
    const totalHours = allPlants.reduce((acc, p) => acc + (p.currentHours || p.currentOdometer || 0), 0);
    return { total, assigned, unassigned, totalHours };
  }, [allPlants]);

  const fleetTotalKva = useMemo(() => {
    return allPlants.reduce((acc, p) => acc + (p.powerKva || 0), 0);
  }, [allPlants]);

  const filteredPlantsKva = useMemo(() => {
    return filteredFleetPlants.reduce((acc, p) => acc + (p.powerKva || 0), 0);
  }, [filteredFleetPlants]);

  const personnelWithPlantsCount = useMemo(() => {
    return allPersonnelList.filter((op: any) =>
      allPlants.some(
        (p) =>
          p.assignedOperatorId === op.id ||
          (p.assignedOperatorName && op.full_name && p.assignedOperatorName.toLowerCase().trim() === op.full_name.toLowerCase().trim())
      )
    ).length;
  }, [allPersonnelList, allPlants]);

  const fleetTiers = useMemo(() => {
    const total = allPlants.length;
    const high = allPlants.filter((p) => (p.powerKva || 0) >= 100);
    const mid = allPlants.filter((p) => (p.powerKva || 0) >= 50 && (p.powerKva || 0) < 100);
    const compact = allPlants.filter((p) => (p.powerKva || 0) < 50);

    return {
      highCount: high.length,
      highPct: total > 0 ? ((high.length / total) * 100).toFixed(1) : '0.0',
      highKva: high.reduce((acc, p) => acc + (p.powerKva || 0), 0),
      midCount: mid.length,
      midPct: total > 0 ? ((mid.length / total) * 100).toFixed(1) : '0.0',
      midKva: mid.reduce((acc, p) => acc + (p.powerKva || 0), 0),
      compactCount: compact.length,
      compactPct: total > 0 ? ((compact.length / total) * 100).toFixed(1) : '0.0',
      compactKva: compact.reduce((acc, p) => acc + (p.powerKva || 0), 0),
    };
  }, [allPlants]);

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const fuelRecords = useMemo(() => (records || []).filter((r) => r.type === 'fuel'), [records]);
  const serviceRecords = useMemo(() => (records || []).filter((r) => r.type !== 'fuel'), [records]);

  const totalFuelUSD = useMemo(() => fuelRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0), [fuelRecords]);
  const totalServicesUSD = useMemo(() => serviceRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0), [serviceRecords]);
  const totalCostUSD = totalFuelUSD + totalServicesUSD;

  const totalFuelLiters = useMemo(() => {
    return fuelRecords.reduce((sum, r) => {
      const m = r.notes?.match(/([\d.]+)\s*L/i);
      if (m) return sum + parseFloat(m[1]);
      return sum + ((r as any).liters || 0);
    }, 0);
  }, [fuelRecords]);

  // Font family tokens
  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Template Design Tokens
  const bgSurface = isDark ? '#0c0d12' : '#f7f9fb';
  const cardLowest = isDark ? '#131722' : '#ffffff';
  const surfaceLow = isDark ? '#1a2030' : '#f2f4f6';
  const surfaceHigh = isDark ? '#252d42' : '#e6e8ea';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 28, 30, 0.08)';
  const primaryNavy = isDark ? '#f8fafc' : '#002045';
  const primaryContainer = isDark ? '#2563eb' : '#1a365d';
  const academicGold = '#D69E2E';
  const secondaryFixed = isDark ? 'rgba(214, 158, 46, 0.18)' : '#ffdeaa';
  const onSecondaryFixed = isDark ? '#ffc250' : '#271900';
  const innovationPurple = isDark ? '#a78bfa' : '#6B46C1';
  const textOnSurface = isDark ? '#f8fafc' : '#191c1e';
  const textVariant = isDark ? '#94a3b8' : '#43474e';
  const textOutline = isDark ? '#64748b' : '#74777f';

  // Helper to navigate to a specific Super Admin perspective tab
  const goToPerspective = (tab: 'overview' | 'plants' | 'personnel' | 'users') => {
    onSelectTab('moto');
    setPerspectiveTab(tab);
  };

  // Sidebar items — Each section separated cleanly, NO 'Ficha Técnica OEM' for Super Admin!
  const sidebarNavItems = useMemo(() => {
    return [
      {
        id: 'nav_overview',
        label: 'Resumen Ejecutivo',
        icon: 'dashboard',
        isActive: activeTab === 'moto' && perspectiveTab === 'overview',
        action: () => goToPerspective('overview'),
      },
      {
        id: 'nav_plants',
        label: 'Disponibilidad de Plantas',
        icon: 'bolt',
        badge: allPlants.length,
        badgeColor: '#16a34a',
        isActive: activeTab === 'moto' && perspectiveTab === 'plants',
        action: () => goToPerspective('plants'),
      },
      {
        id: 'nav_personnel',
        label: 'Personal Operador',
        icon: 'engineering',
        badge: allPersonnelList.length,
        badgeColor: '#2563eb',
        isActive: activeTab === 'moto' && perspectiveTab === 'personnel',
        action: () => goToPerspective('personnel'),
      },
      {
        id: 'nav_users',
        label: 'Usuarios y Clientes',
        icon: 'groups',
        badge: (pendingUsersList?.length || 0) > 0 ? pendingUsersList.length : allUsersAndClientsList.length,
        badgeColor: (pendingUsersList?.length || 0) > 0 ? '#ef4444' : innovationPurple,
        isActive: activeTab === 'moto' && perspectiveTab === 'users',
        action: () => goToPerspective('users'),
      },
      {
        id: 'nav_services',
        label: 'Mantenimiento & Servicios',
        icon: 'build',
        isActive: activeTab === 'services',
        action: () => onSelectTab('services'),
      },
      {
        id: 'nav_history',
        label: 'Bitácora & Finanzas',
        icon: 'payments',
        isActive: activeTab === 'history',
        action: () => onSelectTab('history'),
      },
      ...(drivesCompanyVehicle && !isSuperAdmin
        ? [
            {
              id: 'nav_wallet',
              label: 'Guantera de Flota',
              icon: 'account-balance-wallet',
              isActive: activeTab === 'wallet',
              action: () => onSelectTab('wallet'),
            },
          ]
        : []),
      {
        id: 'nav_profile',
        label: 'Mi Perfil Ejecutivo',
        icon: 'person',
        isActive: activeTab === 'profile',
        action: () => onSelectTab('profile'),
      },
    ];
  }, [
    activeTab,
    perspectiveTab,
    allPlants.length,
    allPersonnelList.length,
    allUsersAndClientsList.length,
    pendingUsersList,
    drivesCompanyVehicle,
    isSuperAdmin,
    innovationPurple,
  ]);

  return (
    <View style={[styles.rootLayout, { backgroundColor: bgSurface }]}>
      {/* ===================================================================== */}
      {/* 1. LEFT EXECUTIVE SIDEBAR (Dedicated tabs for each module)            */}
      {/* ===================================================================== */}
      {!isMobile && (
        <View style={[styles.sidebarAside, { backgroundColor: cardLowest, borderRightColor: cardBorder }]}>
          <View style={{ gap: 18, paddingHorizontal: 16 }}>
            {/* Brand Header */}
            <TouchableOpacity
              onPress={() => goToPerspective('overview')}
              style={styles.sidebarBrandRow}
              activeOpacity={0.8}
            >
              <View style={[styles.sidebarBrandIconBox, { backgroundColor: isDark ? '#1e293b' : '#002045' }]}>
                <Image source={HL_LOGO_REQUIRE} style={{ width: 26, height: 26 }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 18, color: primaryNavy, letterSpacing: -0.3 }} numberOfLines={1}>
                  Hermanos Lynch
                </Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 10, color: textVariant, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>
                  {isSuperAdmin ? 'PORTAL SUPER ADMIN' : 'PORTAL OPERACIONES'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Executive Scope Box */}
            <View style={[styles.sidebarPlantSelector, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
              <View style={[styles.sidebarSelectorIcon, { backgroundColor: cardLowest }]}>
                <MaterialIcons name="domain" size={18} color={academicGold} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: textVariant }} numberOfLines={1}>
                  Dirección General
                </Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: primaryNavy }} numberOfLines={1}>
                  Control Global de Flota y Red
                </Text>
              </View>
            </View>

            {/* Navigation Links — Clean & Separated */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 10, color: textOutline, letterSpacing: 1, paddingHorizontal: 10, marginBottom: 4 }}>
                MÓDULOS DE DIRECCIÓN
              </Text>
              {sidebarNavItems.map((navItem) => {
                const isActive = navItem.isActive;
                return (
                  <TouchableOpacity
                    key={navItem.id}
                    onPress={navItem.action}
                    activeOpacity={0.8}
                    style={[
                      styles.sidebarNavItem,
                      isActive && {
                        backgroundColor: primaryContainer,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={navItem.icon as any}
                      size={20}
                      color={isActive ? '#ffffff' : textVariant}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: isActive ? F.bold : F.medium,
                        fontSize: 13,
                        color: isActive ? '#ffffff' : textVariant,
                      }}
                      numberOfLines={1}
                    >
                      {navItem.label}
                    </Text>
                    {typeof navItem.badge === 'number' && (
                      <View
                        style={[
                          styles.sidebarNavBadge,
                          { backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : (navItem.badgeColor || primaryContainer) },
                        ]}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#ffffff' }}>
                          {navItem.badge}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Sidebar Support & Sync Status */}
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <View style={[styles.sidebarSupportCard, { backgroundColor: surfaceLow }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="verified" size={15} color={academicGold} />
                <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: academicGold }}>
                  Base de Datos en Tiempo Real
                </Text>
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant, lineHeight: 16 }}>
                {allPlants.length} plantas · {allPersonnelList.length} personal · {allUsersAndClientsList.length} usuarios
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Sincronizado</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={toggleTheme}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: surfaceLow }}
                >
                  <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={16} color={isDark ? '#ffc250' : '#002045'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={logout}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                >
                  <MaterialIcons name="logout" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===================================================================== */}
      {/* 2. MAIN WORKSPACE AREA (Header + Dedicated Tab Content)               */}
      {/* ===================================================================== */}
      <View style={styles.mainContentArea}>
        {/* TOP HEADER BAR */}
        {isMobile ? (
          <View style={[styles.topHeaderBarMobile, { backgroundColor: cardLowest, borderBottomColor: cardBorder }]}>
            {mobileSearchOpen ? (
              <View style={[styles.mobileSearchExpandedRow, { backgroundColor: surfaceLow, borderColor: primaryContainer }]}>
                <MaterialIcons name="search" size={20} color={primaryNavy} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar planta, operador o usuario..."
                  placeholderTextColor={textOutline}
                  style={[styles.mobileSearchInput, { color: textOnSurface, fontFamily: F.medium }]}
                  autoFocus={true}
                />
                <TouchableOpacity
                  onPress={() => {
                    setMobileSearchOpen(false);
                    setSearchQuery('');
                  }}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons name="close" size={18} color={textVariant} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mobileCollapsedHeaderRow}>
                <TouchableOpacity
                  onPress={() => setMobileMenuOpen(true)}
                  style={[styles.mobileHamburgerBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
                >
                  <MaterialIcons name="menu" size={22} color={textOnSurface} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => goToPerspective('overview')} style={styles.mobileBrandCenter}>
                  <Image source={HL_LOGO_REQUIRE} style={styles.mobileBrandLogo} resizeMode="contain" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ fontFamily: F.extrabold, fontSize: 13, color: primaryNavy }}>HERMANOS LYNCH</Text>
                    <Text style={{ fontFamily: F.semibold, fontSize: 9.5, color: academicGold }}>
                      {isSuperAdmin ? 'SUPER ADMIN' : (userRoleTitle || 'OPERADOR')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.mobileHeaderRightRow}>
                  <TouchableOpacity
                    onPress={() => setMobileSearchOpen(true)}
                    style={[styles.mobileSearchIconBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
                  >
                    <MaterialIcons name="search" size={20} color={textOnSurface} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={toggleTheme} style={[styles.mobileSearchIconBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                    <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={18} color={isDark ? '#ffc250' : '#002045'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.topHeaderBarDesktop, { backgroundColor: cardLowest, borderBottomColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={[styles.headerSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                <MaterialIcons name="search" size={18} color={textOutline} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar planta, serial, operador o cliente..."
                  placeholderTextColor={textOutline}
                  style={{ flex: 1, fontFamily: F.medium, fontSize: 13, color: textOnSurface, paddingVertical: 4 }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="clear" size={16} color={textOutline} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.headerMetaPill, { backgroundColor: surfaceLow }]}>
                <MaterialIcons name="verified-user" size={16} color={academicGold} />
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                  Vista Activa:{' '}
                  <Text style={{ fontFamily: F.bold, color: primaryNavy }}>
                    {perspectiveTab === 'overview'
                      ? 'Resumen Ejecutivo'
                      : perspectiveTab === 'plants'
                      ? 'Disponibilidad de Plantas'
                      : perspectiveTab === 'personnel'
                      ? 'Personal Operador'
                      : 'Usuarios y Clientes'}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setCreateOperatorVisible(true)}
                activeOpacity={0.85}
                style={[styles.headerPrimaryCta, { backgroundColor: surfaceLow, borderWidth: 1, borderColor: cardBorder }]}
              >
                <MaterialIcons name="person-add" size={17} color={primaryNavy} />
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: primaryNavy }}>
                  Nuevo Usuario / Personal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsAddingMoto(true)}
                activeOpacity={0.85}
                style={[styles.headerPrimaryCta, { backgroundColor: isDark ? '#2563eb' : '#002045' }]}
              >
                <MaterialIcons name="add-circle" size={17} color="#ffc250" />
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#ffffff' }}>
                  Incorporar Planta
                </Text>
              </TouchableOpacity>

              <View style={{ width: 1, height: 24, backgroundColor: surfaceHigh }} />

              <TouchableOpacity
                onPress={() => setAgendaVisible(true)}
                style={[styles.headerSquareIconBtn, { backgroundColor: surfaceLow }]}
              >
                <MaterialIcons name="notifications-none" size={20} color={textVariant} />
                {(pendingUsersList?.length || 0) > 0 && <View style={styles.headerRedDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenStats}
                style={[styles.headerSquareIconBtn, { backgroundColor: surfaceLow }]}
              >
                <MaterialIcons name="calendar-today" size={18} color={textVariant} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onSelectTab('profile')}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 }}
              >
                <View style={[styles.headerUserCircle, { backgroundColor: isDark ? '#2563eb' : '#002045' }]}>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>{userInitials}</Text>
                </View>
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy }}>
                    {userName || userEmail || 'Super Admin'}
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                    {isSuperAdmin ? 'Super Administrador' : (userRoleTitle || 'Operador Técnico')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===================================================================== */}
        {/* 3. DEDICATED MODULE BODY (Each tab cleanly separated!)                */}
        {/* ===================================================================== */}
        <ScrollView
          style={[{ flex: 1 }, activeTab !== 'moto' && { display: 'none' }]}
          contentContainerStyle={[
            styles.bentoScrollContent,
            isMobile && { paddingHorizontal: 14, paddingBottom: 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* TOP HEADER & DEDICATED MODULE SWITCHER BAR */}
          <View style={styles.topUtilityBar}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <View style={[styles.utilityStatusBadge, { backgroundColor: secondaryFixed }]}>
                  <Animated.View style={[styles.utilityPulseDot, { backgroundColor: '#7d5700', opacity: pulseAnim }]} />
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: onSecondaryFixed }}>
                    Dirección Ejecutiva · Datos 100% en Vivo
                  </Text>
                </View>
                <Text style={{ color: textOutline, fontSize: 12 }}>•</Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textVariant }}>
                  {allPlants.length} Plantas · {allPersonnelList.length} Personal · {allUsersAndClientsList.length} Usuarios
                </Text>
              </View>
              <Text style={[styles.utilityHeadline, { color: primaryNavy, fontFamily: F.bold, fontSize: isMobile ? 22 : 28 }]}>
                {perspectiveTab === 'overview'
                  ? 'Resumen Ejecutivo & Analítica Global'
                  : perspectiveTab === 'plants'
                  ? 'Disponibilidad de Plantas Eléctricas'
                  : perspectiveTab === 'personnel'
                  ? 'Personal Operador & Administradores'
                  : 'Directorio de Usuarios y Clientes'}
              </Text>
            </View>

            {/* Quick Contextual Actions */}
            <View style={styles.utilityActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  loadSystemUsers();
                  setUserMgmtVisible(true);
                }}
                style={[styles.toolbarSecondaryBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="manage-accounts" size={17} color={primaryNavy} />
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: primaryNavy }}>
                  Panel de Control de Roles
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenReport}
                style={[styles.toolbarSecondaryBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="picture-as-pdf" size={17} color={primaryNavy} />
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: primaryNavy }}>
                  Exportar PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4 DEDICATED PERSPECTIVE TABS BAR */}
          <View style={[styles.perspectiveTabContainer, { backgroundColor: surfaceLow }]}>
            {[
              { id: 'overview' as const, label: '1. Resumen Ejecutivo', icon: 'dashboard', color: academicGold },
              { id: 'plants' as const, label: `2. Disponibilidad de Plantas (${allPlants.length})`, icon: 'bolt', color: '#16a34a' },
              { id: 'personnel' as const, label: `3. Personal Operador (${allPersonnelList.length})`, icon: 'engineering', color: '#2563eb' },
              { id: 'users' as const, label: `4. Usuarios y Clientes (${allUsersAndClientsList.length})`, icon: 'groups', color: innovationPurple },
            ].map((tab) => {
              const active = perspectiveTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setPerspectiveTab(tab.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.perspectiveTabBtn,
                    active && {
                      backgroundColor: cardLowest,
                      borderColor: cardBorder,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <MaterialIcons name={tab.icon as any} size={17} color={tab.color} />
                  <Text
                    style={{
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 13,
                      color: active ? primaryNavy : textVariant,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ===================================================================== */}
          {/* PESTAÑA 1: RESUMEN EJECUTIVO (Limpio, sin amontonar tablas abajo)     */}
          {/* ===================================================================== */}
          {perspectiveTab === 'overview' && (
            <View style={{ gap: 22 }}>
              {/* 4 Executive KPI Cards */}
              <View style={styles.kpiGridRow}>
                {/* KPI 1: Inversión Operativa Real */}
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                  <View style={styles.kpiCardTopRow}>
                    <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                      INVERSIÓN OPERATIVA REAL
                    </Text>
                    <View style={[styles.kpiIconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(0, 32, 69, 0.06)' }]}>
                      <MaterialIcons name="account-balance-wallet" size={20} color={primaryNavy} />
                    </View>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                        ${Math.floor(totalCostUSD).toLocaleString('en-US')}
                      </Text>
                      <Text style={{ fontFamily: F.bold, fontSize: 18, color: textOutline }}>
                        .{totalCostUSD.toFixed(2).split('.')[1]}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: secondaryFixed, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 11, color: onSecondaryFixed }}>
                          {records.length} registros en BD
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                        Diésel: ${totalFuelUSD.toFixed(2)} ({totalFuelLiters} L)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* KPI 2: Disponibilidad de Plantas */}
                <TouchableOpacity
                  onPress={() => setPerspectiveTab('plants')}
                  activeOpacity={0.85}
                  style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}
                >
                  <View style={styles.kpiCardTopRow}>
                    <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                      DISPONIBILIDAD DE PLANTAS
                    </Text>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(22, 163, 74, 0.14)' }]}>
                      <MaterialCommunityIcons name="generator-portable" size={20} color="#16a34a" />
                    </View>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                        {allPlants.length}
                      </Text>
                      <Text style={{ fontFamily: F.semibold, fontSize: 14, color: textVariant }}>
                        / {fleetTotalKva.toLocaleString()} kVA
                      </Text>
                    </View>
                    <View style={[styles.kpiProgressBarTrack, { backgroundColor: surfaceLow }]}>
                      <View
                        style={[
                          styles.kpiProgressBarFill,
                          {
                            backgroundColor: '#16a34a',
                            width: `${allPlants.length > 0 ? Math.round((fleetStats.unassigned / allPlants.length) * 100) : 0}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: '#16a34a' }}>
                        {fleetStats.unassigned} Disponibles
                      </Text>
                      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                        {fleetStats.assigned} Asignadas →
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* KPI 3: Personal Operador & Admins */}
                <TouchableOpacity
                  onPress={() => setPerspectiveTab('personnel')}
                  activeOpacity={0.85}
                  style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}
                >
                  <View style={styles.kpiCardTopRow}>
                    <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                      PERSONAL OPERADOR & ADMINS
                    </Text>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.14)' }]}>
                      <MaterialIcons name="engineering" size={20} color="#2563eb" />
                    </View>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                        {allPersonnelList.length}
                      </Text>
                      <Text style={{ fontFamily: F.semibold, fontSize: 15, color: textVariant }}>
                        Integrantes
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: '#2563eb' }}>
                        {(operatorsList || []).length} Operadores
                      </Text>
                      <Text style={{ color: textOutline, fontSize: 11 }}>•</Text>
                      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                        {(superAdminsList || []).length} Super Admins →
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* KPI 4: Usuarios y Clientes */}
                <TouchableOpacity
                  onPress={() => setPerspectiveTab('users')}
                  activeOpacity={0.85}
                  style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}
                >
                  <View style={styles.kpiCardTopRow}>
                    <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                      USUARIOS & CLIENTES EN BD
                    </Text>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(107, 70, 193, 0.14)' }]}>
                      <MaterialIcons name="groups" size={20} color={innovationPurple} />
                    </View>
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                        {allUsersAndClientsList.length}
                      </Text>
                      <Text style={{ fontFamily: F.semibold, fontSize: 15, color: textVariant }}>
                        Cuentas
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: innovationPurple }}>
                        {(clientsList || []).length} Activos
                      </Text>
                      <Text style={{ color: textOutline, fontSize: 11 }}>•</Text>
                      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: (pendingUsersList?.length || 0) > 0 ? '#ef4444' : textVariant }}>
                        {(pendingUsersList || []).length} Pendientes →
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* 8+4 Column Executive Analytics & Module Shortcuts */}
              <View style={[styles.bento12Grid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                {/* LEFT 8 COLS: Real Fleet Chart + 4 Tier Breakdown Cards */}
                <View style={[styles.bento8Col, isDesktop ? { flex: 8 } : { width: '100%' }]}>
                  <View style={[styles.bentoCardBox, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                    <View style={styles.chartHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 19, color: primaryNavy }}>
                          Capacidad Nominal (kVA) vs. Horas Reales de Operación
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                          Comparativa directa de las {allPlants.length} plantas eléctricas registradas en la base de datos
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: isDark ? '#2563eb' : '#002045' }} />
                          <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Potencia (kVA)</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#ffc250' }} />
                          <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Horómetro (hrs)</Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ paddingTop: 12, paddingBottom: 6 }}>
                      <RealFleetBarChart
                        plants={allPlants}
                        isDark={isDark}
                        primaryColor={isDark ? '#2563eb' : '#002045'}
                        goldColor="#ffc250"
                        textSecondary={textVariant}
                      />
                    </View>

                    <View style={[styles.chartFooterRow, { borderTopColor: cardBorder }]}>
                      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                        * Valores leídos directamente del inventario activo en Supabase sin datos simulados.
                      </Text>
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                        Capacidad Total: {fleetTotalKva.toLocaleString()} kVA · Uso Flota: {fleetStats.totalHours.toLocaleString()} hrs
                      </Text>
                    </View>
                  </View>

                  {/* 4 Tier Distribution Cards */}
                  <View style={styles.tiers4Grid}>
                    <View style={[styles.tierMiniCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Alta Capacidad (≥100 kVA)</Text>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isDark ? '#2563eb' : '#002045' }} />
                      </View>
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 22, color: primaryNavy }}>{fleetTiers.highCount}</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant, marginTop: 2 }}>
                          {fleetTiers.highPct}% de la flota registrada
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy, marginTop: 10 }}>
                        {fleetTiers.highKva.toLocaleString()} kVA instalados
                      </Text>
                    </View>

                    <View style={[styles.tierMiniCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Media Capacidad (50-99)</Text>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: academicGold }} />
                      </View>
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 22, color: primaryNavy }}>{fleetTiers.midCount}</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant, marginTop: 2 }}>
                          {fleetTiers.midPct}% de la flota registrada
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy, marginTop: 10 }}>
                        {fleetTiers.midKva.toLocaleString()} kVA instalados
                      </Text>
                    </View>

                    <View style={[styles.tierMiniCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Compactas (&lt;50 kVA)</Text>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: innovationPurple }} />
                      </View>
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 22, color: primaryNavy }}>{fleetTiers.compactCount}</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant, marginTop: 2 }}>
                          {fleetTiers.compactPct}% de la flota registrada
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy, marginTop: 10 }}>
                        {fleetTiers.compactKva.toLocaleString()} kVA instalados
                      </Text>
                    </View>

                    <View style={[styles.tierMiniCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>Bitácora de Servicios</Text>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' }} />
                      </View>
                      <View style={{ marginTop: 10 }}>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 22, color: primaryNavy }}>{serviceRecords.length}</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant, marginTop: 2 }}>
                          {fuelRecords.length} cargas de diésel
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#16a34a', marginTop: 10 }}>
                        ${totalServicesUSD.toFixed(2)} en mtto.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* RIGHT 4 COLS: Fleet Availability Balance & Dedicated Section Shortcuts */}
                <View style={[styles.bento4Col, isDesktop ? { flex: 4 } : { width: '100%' }]}>
                  {/* Card 1: Fleet Availability Balance */}
                  <View style={[styles.bentoCardBox, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', opacity: pulseAnim }} />
                        <Text style={{ fontFamily: F.bold, fontSize: 16, color: primaryNavy }}>
                          Balance de Disponibilidad
                        </Text>
                      </View>
                      <View style={{ backgroundColor: surfaceHigh, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textVariant }}>
                          Red Nacional
                        </Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: surfaceLow, padding: 14, borderRadius: 12, gap: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                            Plantas Disponibles vs. Asignadas
                          </Text>
                          <Text style={{ fontFamily: F.extrabold, fontSize: 20, color: primaryNavy, marginTop: 2 }}>
                            {fleetStats.unassigned} Libres · {fleetStats.assigned} Asignadas
                          </Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: textOutline, marginTop: 2 }}>
                            Total en BD: {allPlants.length} unidades ({fleetTotalKva} kVA)
                          </Text>
                        </View>
                        <RealDonutRing
                          percent={allPlants.length > 0 ? Math.round((fleetStats.unassigned / allPlants.length) * 100) : 100}
                          primaryColor="#16a34a"
                          trackColor={surfaceHigh}
                          textColor={primaryNavy}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => setPerspectiveTab('plants')}
                      activeOpacity={0.85}
                      style={[styles.purpleScannerBtn, { backgroundColor: isDark ? '#2563eb' : '#002045' }]}
                    >
                      <MaterialIcons name="bolt" size={18} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>
                        Ir a Disponibilidad de Plantas →
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Card 2: Dedicated Navigation Modules */}
                  <View style={[styles.bentoCardBox, { backgroundColor: cardLowest, borderColor: cardBorder, gap: 10 }]}>
                    <Text style={{ fontFamily: F.bold, fontSize: 16, color: primaryNavy }}>
                      Pestañas de Control Dedicadas
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant, marginBottom: 4 }}>
                      Accede a cada directorio por separado con filtros por País, Zona, Estado y Categoría:
                    </Text>

                    <TouchableOpacity
                      onPress={() => setPerspectiveTab('plants')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: surfaceLow,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(22, 163, 74, 0.14)', justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialCommunityIcons name="generator-portable" size={18} color="#16a34a" />
                        </View>
                        <View>
                          <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy }}>Disponibilidad de Plantas</Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                            {allPlants.length} plantas · Filtro por País, Zona y Estado
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={textVariant} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPerspectiveTab('personnel')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: surfaceLow,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(37, 99, 235, 0.14)', justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialIcons name="engineering" size={18} color="#2563eb" />
                        </View>
                        <View>
                          <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy }}>Personal Operador & Técnicos</Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                            {allPersonnelList.length} operadores y admins · Asignación de flota
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={textVariant} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPerspectiveTab('users')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: surfaceLow,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(107, 70, 193, 0.14)', justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialIcons name="groups" size={18} color={innovationPurple} />
                        </View>
                        <View>
                          <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy }}>Usuarios y Clientes</Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                            {allUsersAndClientsList.length} titulares y aprobaciones pendientes
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={textVariant} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 2: DISPONIBILIDAD DE PLANTAS (Con filtros País/Zona/Estado)   */}
          {/* ===================================================================== */}
          {perspectiveTab === 'plants' && (
            <View style={{ gap: 18 }}>
              {/* 4 Mini-KPIs de Disponibilidad de Plantas */}
              <View style={styles.kpiGridRow}>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>TOTAL PLANTAS EN BD</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: primaryNavy, marginTop: 6 }}>{allPlants.length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Inventario global registrado</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: '#16a34a', fontFamily: F.semibold }]}>DISPONIBLES (LIBRES)</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: '#16a34a', marginTop: 6 }}>{fleetStats.unassigned}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Listas para asignar operador</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: '#2563eb', fontFamily: F.semibold }]}>ASIGNADAS / EN OPERACIÓN</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: '#2563eb', marginTop: 6 }}>{fleetStats.assigned}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Con operador responsable</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: academicGold, fontFamily: F.semibold }]}>CAPACIDAD EN VISTA</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: primaryNavy, marginTop: 6 }}>{filteredPlantsKva.toLocaleString()} kVA</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>{filteredFleetPlants.length} plantas filtradas</Text>
                </View>
              </View>

              {/* Main Plants Availability Card & Geographic Filter Matrix */}
              <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                <View style={styles.tableCardHeader}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 20, color: primaryNavy }}>
                      Disponibilidad de Plantas Eléctricas y Maquinaria ({filteredFleetPlants.length})
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                      Navega y filtra el parque de plantas por Disponibilidad, Capacidad, País, Zona y Estado
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <View style={[styles.tableFilterSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                      <MaterialIcons name="search" size={18} color={textOutline} />
                      <TextInput
                        value={plantSearch}
                        onChangeText={setPlantSearch}
                        placeholder="Buscar modelo, serial, estado o sede..."
                        placeholderTextColor={textOutline}
                        style={{ fontFamily: F.medium, fontSize: 12.5, color: textOnSurface, minWidth: 210, paddingVertical: 4 }}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsAddingMoto(true)}
                      style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 9 }]}
                    >
                      <MaterialIcons name="add-circle" size={16} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>Incorporar Planta</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Geographic & Availability Multi-Row Filter Box */}
                <View style={{ marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 14, backgroundColor: surfaceLow, borderWidth: 1, borderColor: cardBorder, gap: 10 }}>
                  {/* Row 1: DISPONIBILIDAD */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>DISPONIBILIDAD:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(['Todas', 'Disponibles', 'Asignadas'] as const).map((status) => {
                        const active = plantAvailabilityFilter === status;
                        return (
                          <TouchableOpacity
                            key={status}
                            onPress={() => setPlantAvailabilityFilter(status)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? '#16a34a' : cardLowest,
                                borderColor: active ? '#16a34a' : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {status === 'Disponibles' ? 'Disponibles (Libres)' : status === 'Asignadas' ? 'En Operación (Asignadas)' : 'Todas las Plantas'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 2: CAPACIDAD */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>CAPACIDAD:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {PLANT_CATEGORIES.map((cat) => {
                        const active = plantCategoryFilter === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => setPlantCategoryFilter(cat)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? primaryContainer : cardLowest,
                                borderColor: active ? primaryContainer : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 3: PAÍS */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>PAÍS:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {COUNTRIES_LIST.map((c) => {
                        const active = plantCountryFilter === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setPlantCountryFilter(c)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? academicGold : cardLowest,
                                borderColor: active ? academicGold : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {c}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 4: ZONA */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ZONA:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {ZONES_LIST.map((z) => {
                        const active = plantZoneFilter === z;
                        return (
                          <TouchableOpacity
                            key={z}
                            onPress={() => setPlantZoneFilter(z)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? primaryContainer : cardLowest,
                                borderColor: active ? primaryContainer : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {z}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 5: ESTADO / SEDE */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ESTADO / SEDE:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {STATES_LIST.map((st) => {
                        const active = plantStateFilter === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setPlantStateFilter(st)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? innovationPurple : cardLowest,
                                borderColor: active ? innovationPurple : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Table Header (Desktop) */}
                {!isMobile && (
                  <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopColor: cardBorder, borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tableHeadCell, { flex: 2.2, color: textVariant, fontFamily: F.bold }]}>PLANTA & CAPACIDAD</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3, color: textVariant, fontFamily: F.bold }]}>SERIAL / CÓDIGO</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.8, color: textVariant, fontFamily: F.bold }]}>UBICACIÓN (ESTADO · ZONA · PAÍS)</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.5, color: textVariant, fontFamily: F.bold }]}>DISPONIBILIDAD / OPERADOR</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.1, color: textVariant, fontFamily: F.bold }]}>HORÓMETRO</Text>
                    <Text style={[styles.tableHeadCell, { width: 110, textAlign: 'right', color: textVariant, fontFamily: F.bold }]}>ACCIONES</Text>
                  </View>
                )}

                {/* Plants Rows */}
                <View>
                  {filteredFleetPlants.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center' }}>
                      <MaterialCommunityIcons name="generator-portable" size={38} color={textOutline} />
                      <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                        No se encontraron plantas con los filtros seleccionados
                      </Text>
                    </View>
                  ) : (
                    filteredFleetPlants.map((plant) => {
                      const kva = plant.powerKva || 0;
                      const hrs = plant.currentHours || plant.currentOdometer || 0;
                      return (
                        <View
                          key={plant.id}
                          style={[
                            styles.tableDataRow,
                            {
                              backgroundColor: cardLowest,
                              borderBottomColor: cardBorder,
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                            },
                          ]}
                        >
                          {/* Col 1: Brand, Model & Category */}
                          <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.tablePlantThumb, { backgroundColor: surfaceLow }]}>
                              <MaterialCommunityIcons name="generator-portable" size={22} color={primaryNavy} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: primaryNavy }} numberOfLines={1}>
                                {plant.brand} {plant.model} · {kva} kVA
                              </Text>
                              <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: innovationPurple }} numberOfLines={1}>
                                {plant.category} · {plant.fuelType || 'Diesel'}
                              </Text>
                            </View>
                          </View>

                          {/* Col 2: Serial */}
                          <View style={{ flex: 1.3 }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 13, color: textOnSurface }}>
                              {plant.serialNumber || plant.plate || 'Sin serial'}
                            </Text>
                            <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                              Año: {plant.year || '-'}
                            </Text>
                          </View>

                          {/* Col 3: Geographic Location */}
                          <View style={{ flex: 1.8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <MaterialIcons name="location-on" size={15} color={academicGold} />
                              <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                                {plant.location || plant.geoState}
                              </Text>
                            </View>
                            <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant, marginTop: 2 }} numberOfLines={1}>
                              {plant.geoZone} · {plant.geoCountry}
                            </Text>
                          </View>

                          {/* Col 4: Availability & Operator */}
                          <View style={{ flex: 1.5 }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: plant.isAssigned ? 'rgba(37, 99, 235, 0.14)' : 'rgba(22, 163, 74, 0.14)',
                                paddingHorizontal: 9,
                                paddingVertical: 3,
                                borderRadius: 99,
                                marginBottom: 3,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: F.bold,
                                  fontSize: 10.5,
                                  color: plant.isAssigned ? '#2563eb' : '#16a34a',
                                }}
                              >
                                {plant.isAssigned ? 'EN OPERACIÓN' : 'DISPONIBLE (LIBRE)'}
                              </Text>
                            </View>
                            <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }} numberOfLines={1}>
                              {plant.assignedOperatorName ? `Op: ${plant.assignedOperatorName}` : 'Sin operador asignado'}
                            </Text>
                          </View>

                          {/* Col 5: Hours */}
                          <View style={{ flex: 1.1 }}>
                            <Text style={{ fontFamily: F.extrabold, fontSize: 13.5, color: primaryNavy }}>
                              {hrs.toLocaleString()} hrs
                            </Text>
                            <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                              Horómetro real
                            </Text>
                          </View>

                          {/* Col 6: Actions */}
                          <View style={{ width: isMobile ? '100%' : 110, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => {
                                selectMoto(plant.id);
                                onOpenQuickHours();
                              }}
                              style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                            >
                              <MaterialIcons name="more-time" size={18} color={primaryNavy} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                selectMoto(plant.id);
                                onOpenServicesTab('oil');
                              }}
                              style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                            >
                              <MaterialIcons name="build" size={17} color={primaryNavy} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                selectMoto(plant.id);
                                onOpenReport();
                              }}
                              style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                            >
                              <MaterialIcons name="picture-as-pdf" size={18} color={primaryNavy} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={[styles.tableCardFooter, { backgroundColor: surfaceLow, borderTopColor: cardBorder }]}>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                    Mostrando {filteredFleetPlants.length} de {allPlants.length} plantas eléctricas registradas en Supabase
                  </Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                    {fleetStats.unassigned} Disponibles · {fleetStats.assigned} Asignadas
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 3: PERSONAL OPERADOR & ADMINS (Exclusivo para Personal HL)    */}
          {/* ===================================================================== */}
          {perspectiveTab === 'personnel' && (
            <View style={{ gap: 18 }}>
              {/* 4 Mini-KPIs de Personal */}
              <View style={styles.kpiGridRow}>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>TOTAL PERSONAL INTERNO</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: primaryNavy, marginTop: 6 }}>{allPersonnelList.length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Equipo técnico y directivo</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: '#2563eb', fontFamily: F.semibold }]}>OPERADORES TÉCNICOS</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: '#2563eb', marginTop: 6 }}>{(operatorsList || []).length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Personal de campo y soporte</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: academicGold, fontFamily: F.semibold }]}>SUPER ADMINISTRADORES</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: academicGold, marginTop: 6 }}>{(superAdminsList || []).length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Dirección y control global</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: '#16a34a', fontFamily: F.semibold }]}>CON PLANTAS A CARGO</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: '#16a34a', marginTop: 6 }}>{personnelWithPlantsCount}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Responsables activos en red</Text>
                </View>
              </View>

              {/* Main Personnel Table & Multi-Criteria Filter Matrix */}
              <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                <View style={styles.tableCardHeader}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 20, color: primaryNavy }}>
                      Directorio de Personal Operador y Administradores ({filteredPersonnelList.length})
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                      Filtra el personal técnico por Rol, Disponibilidad, País, Zona, Estado y Departamento
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <View style={[styles.tableFilterSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                      <MaterialIcons name="search" size={18} color={textOutline} />
                      <TextInput
                        value={personnelSearch}
                        onChangeText={setPersonnelSearch}
                        placeholder="Buscar operador, carnet HL, especialidad..."
                        placeholderTextColor={textOutline}
                        style={{ fontFamily: F.medium, fontSize: 12.5, color: textOnSurface, minWidth: 210, paddingVertical: 4 }}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setCreateOperatorVisible(true)}
                      style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 9 }]}
                    >
                      <MaterialIcons name="person-add" size={16} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>
                        Registrar Operador / Super Admin
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Personnel Filter Box: ROL, ASIGNACIÓN, PAÍS, ZONA, ESTADO, DEPARTAMENTO */}
                <View style={{ marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 14, backgroundColor: surfaceLow, borderWidth: 1, borderColor: cardBorder, gap: 10 }}>
                  {/* Row 1: ROL DE PERSONAL */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ROL PERSONAL:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(['Todo el Personal', 'Operadores Técnicos', 'Super Administradores'] as const).map((r) => {
                        const active = personnelRoleFilter === r;
                        return (
                          <TouchableOpacity
                            key={r}
                            onPress={() => setPersonnelRoleFilter(r)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? primaryContainer : cardLowest,
                                borderColor: active ? primaryContainer : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {r}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 2: ASIGNACIÓN / DISPONIBILIDAD */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ASIGNACIÓN:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(['Todos', 'Con Plantas a Cargo', 'Disponibles (0 Plantas)', 'Con Vehículo de Flota'] as const).map((a) => {
                        const active = personnelAssignFilter === a;
                        return (
                          <TouchableOpacity
                            key={a}
                            onPress={() => setPersonnelAssignFilter(a)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? '#16a34a' : cardLowest,
                                borderColor: active ? '#16a34a' : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {a}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 3: PAÍS */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>PAÍS:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {COUNTRIES_LIST.map((c) => {
                        const active = personnelCountryFilter === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setPersonnelCountryFilter(c)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? academicGold : cardLowest,
                                borderColor: active ? academicGold : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {c}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 4: ZONA */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ZONA:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {ZONES_LIST.map((z) => {
                        const active = personnelZoneFilter === z;
                        return (
                          <TouchableOpacity
                            key={z}
                            onPress={() => setPersonnelZoneFilter(z)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? primaryContainer : cardLowest,
                                borderColor: active ? primaryContainer : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {z}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 5: ESTADO */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ESTADO:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {STATES_LIST.map((st) => {
                        const active = personnelStateFilter === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setPersonnelStateFilter(st)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? '#2563eb' : cardLowest,
                                borderColor: active ? '#2563eb' : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 6: DEPARTAMENTO / ESPECIALIDAD */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>DEPARTAMENTO:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {personnelDeptsList.map((dp) => {
                        const active = personnelDeptFilter === dp;
                        return (
                          <TouchableOpacity
                            key={dp}
                            onPress={() => setPersonnelDeptFilter(dp)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? innovationPurple : cardLowest,
                                borderColor: active ? innovationPurple : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {dp}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Table Header (Desktop) */}
                {!isMobile && (
                  <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopColor: cardBorder, borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tableHeadCell, { flex: 2, color: textVariant, fontFamily: F.bold }]}>PERSONAL & CARNET HL</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3, color: textVariant, fontFamily: F.bold }]}>ROL & ESPECIALIDAD</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.5, color: textVariant, fontFamily: F.bold }]}>UBICACIÓN (ESTADO · PAÍS)</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.7, color: textVariant, fontFamily: F.bold }]}>PLANTAS BAJO SU CARGO</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.4, color: textVariant, fontFamily: F.bold }]}>VEHÍCULO DE FLOTA</Text>
                    <Text style={[styles.tableHeadCell, { width: 150, textAlign: 'right', color: textVariant, fontFamily: F.bold }]}>ACCIONES</Text>
                  </View>
                )}

                {/* Personnel Rows */}
                <View>
                  {filteredPersonnelList.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center' }}>
                      <MaterialIcons name="engineering" size={38} color={textOutline} />
                      <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                        No se encontró personal operador con los filtros seleccionados
                      </Text>
                    </View>
                  ) : (
                    filteredPersonnelList.map((op: any) => {
                      const initials = (op.full_name || op.email || 'OP')
                        .split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      const assignedPlants = allPlants.filter(
                        (p) =>
                          p.assignedOperatorId === op.id ||
                          (p.assignedOperatorName &&
                            op.full_name &&
                            p.assignedOperatorName.toLowerCase().trim() === op.full_name.toLowerCase().trim())
                      );

                      const isSuper = op.resolvedRole === 'superadmin';

                      return (
                        <View
                          key={op.id}
                          style={[
                            styles.tableDataRow,
                            {
                              backgroundColor: cardLowest,
                              borderBottomColor: cardBorder,
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                            },
                          ]}
                        >
                          {/* Col 1: Name, Email & Carnet */}
                          <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.tableUserAvatar, { backgroundColor: isSuper ? academicGold : primaryContainer }]}>
                              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>{initials}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: F.bold, fontSize: 14, color: primaryNavy }} numberOfLines={1}>
                                {op.full_name || 'Sin nombre en BD'}
                              </Text>
                              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }} numberOfLines={1}>
                                {op.operator_code ? `Carnet: ${op.operator_code} · ` : ''}{op.email || 'Sin correo'}
                              </Text>
                            </View>
                          </View>

                          {/* Col 2: Role & Department */}
                          <View style={{ flex: 1.3 }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: isSuper ? secondaryFixed : 'rgba(37, 99, 235, 0.14)',
                                paddingHorizontal: 9,
                                paddingVertical: 3,
                                borderRadius: 99,
                                marginBottom: 3,
                              }}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: isSuper ? onSecondaryFixed : '#2563eb' }}>
                                {isSuper ? 'SUPER ADMIN' : 'OPERADOR TÉCNICO'}
                              </Text>
                            </View>
                            <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }} numberOfLines={1}>
                              {op.deptLabel}
                            </Text>
                          </View>

                          {/* Col 3: Location */}
                          <View style={{ flex: 1.5 }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              📍 {op.geoState}
                            </Text>
                            <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }} numberOfLines={1}>
                              {op.geoZone} · {op.geoCountry}
                            </Text>
                          </View>

                          {/* Col 4: Assigned Plants */}
                          <View style={{ flex: 1.7 }}>
                            {isSuper ? (
                              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                                Supervisión global ejecutiva
                              </Text>
                            ) : assignedPlants.length === 0 ? (
                              <Text style={{ fontFamily: F.medium, fontSize: 12, color: textOutline }}>
                                0 plantas asignadas (Disponible)
                              </Text>
                            ) : (
                              assignedPlants.map((ap) => (
                                <TouchableOpacity key={ap.id} onPress={() => selectMoto(ap.id)}>
                                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                                    ⚡ {ap.brand} {ap.model} ({ap.powerKva || 0} kVA)
                                  </Text>
                                </TouchableOpacity>
                              ))
                            )}
                          </View>

                          {/* Col 5: Assigned Vehicle */}
                          <View style={{ flex: 1.4 }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: op.assigned_vehicle_name ? textOnSurface : textOutline }}>
                              {op.assigned_vehicle_name || 'Sin vehículo asignado'}
                            </Text>
                            {op.assigned_vehicle_plate && (
                              <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                                Placa: {op.assigned_vehicle_plate}
                              </Text>
                            )}
                          </View>

                          {/* Col 6: Actions */}
                          <View style={{ width: isMobile ? '100%' : 150, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                            {op.phone ? (
                              <TouchableOpacity
                                onPress={() => {
                                  const rawDigits = String(op.phone).replace(/\D/g, '');
                                  const phone = rawDigits.startsWith('58') ? rawDigits : '58' + rawDigits.replace(/^0/, '');
                                  Linking.openURL('https://wa.me/' + phone).catch(() => {});
                                }}
                                style={[styles.tableActionIconBtn, { backgroundColor: 'rgba(37, 211, 102, 0.14)' }]}
                              >
                                <MaterialCommunityIcons name="whatsapp" size={18} color="#16a34a" />
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              onPress={() => setAssigningOperator(op)}
                              style={[
                                styles.toolbarSecondaryBtn,
                                { backgroundColor: surfaceLow, borderColor: cardBorder, paddingHorizontal: 10, paddingVertical: 6 },
                              ]}
                            >
                              <MaterialIcons name="assignment-ind" size={16} color={primaryNavy} />
                              <Text style={{ fontFamily: F.bold, fontSize: 11, color: primaryNavy }}>Asignar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={[styles.tableCardFooter, { backgroundColor: surfaceLow, borderTopColor: cardBorder }]}>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                    Mostrando {filteredPersonnelList.length} de {allPersonnelList.length} integrantes del personal interno
                  </Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                    {(operatorsList || []).length} Operadores · {(superAdminsList || []).length} Super Admins
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 4: USUARIOS Y CLIENTES (Exclusivo para Clientes y Solicitudes)*/}
          {/* ===================================================================== */}
          {perspectiveTab === 'users' && (
            <View style={{ gap: 18 }}>
              {/* 4 Mini-KPIs de Usuarios y Clientes */}
              <View style={styles.kpiGridRow}>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>TOTAL USUARIOS / CLIENTES</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: primaryNavy, marginTop: 6 }}>{allUsersAndClientsList.length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Cuentas de titulares en BD</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: '#16a34a', fontFamily: F.semibold }]}>USUARIOS ACTIVOS</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: '#16a34a', marginTop: 6 }}>{(clientsList || []).length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Cuentas aprobadas y verificadas</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: '#ef4444', fontFamily: F.semibold }]}>SOLICITUDES PENDIENTES</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: '#ef4444', marginTop: 6 }}>{(pendingUsersList || []).length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>En espera de aprobación</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder, padding: 16 }]}>
                  <Text style={[styles.kpiEyebrow, { color: innovationPurple, fontFamily: F.semibold }]}>USUARIOS EN VISTA</Text>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 28, color: innovationPurple, marginTop: 6 }}>{filteredUsersList.length}</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, marginTop: 2 }}>Resultado del filtro activo</Text>
                </View>
              </View>

              {/* Main Users & Clients Table & Geographic Filter Matrix */}
              <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                <View style={styles.tableCardHeader}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 20, color: primaryNavy }}>
                      Directorio de Usuarios Regulares y Clientes Titulares ({filteredUsersList.length})
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                      Navega por Estado de Cuenta, País, Zona y Estado, o aprueba solicitudes pendientes
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <View style={[styles.tableFilterSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                      <MaterialIcons name="search" size={18} color={textOutline} />
                      <TextInput
                        value={userSearch}
                        onChangeText={setUserSearch}
                        placeholder="Buscar cliente, correo, teléfono o estado..."
                        placeholderTextColor={textOutline}
                        style={{ fontFamily: F.medium, fontSize: 12.5, color: textOnSurface, minWidth: 210, paddingVertical: 4 }}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setCreateOperatorVisible(true)}
                      style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 9 }]}
                    >
                      <MaterialIcons name="person-add" size={16} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>
                        Crear Cuenta de Usuario
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Users Filter Box: ESTADO DE CUENTA, PAÍS, ZONA, ESTADO */}
                <View style={{ marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 14, backgroundColor: surfaceLow, borderWidth: 1, borderColor: cardBorder, gap: 10 }}>
                  {/* Row 1: ESTADO DE CUENTA */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ESTADO CUENTA:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(['Todos los Usuarios', 'Usuarios Activos', 'Solicitudes Pendientes'] as const).map((st) => {
                        const active = userStatusFilter === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setUserStatusFilter(st)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? innovationPurple : cardLowest,
                                borderColor: active ? innovationPurple : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 2: PAÍS */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>PAÍS:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {COUNTRIES_LIST.map((c) => {
                        const active = userCountryFilter === c;
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setUserCountryFilter(c)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? academicGold : cardLowest,
                                borderColor: active ? academicGold : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {c}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 3: ZONA */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ZONA:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {ZONES_LIST.map((z) => {
                        const active = userZoneFilter === z;
                        return (
                          <TouchableOpacity
                            key={z}
                            onPress={() => setUserZoneFilter(z)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? primaryContainer : cardLowest,
                                borderColor: active ? primaryContainer : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {z}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Row 4: ESTADO */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, width: 110 }}>ESTADO:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {STATES_LIST.map((st) => {
                        const active = userStateFilter === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setUserStateFilter(st)}
                            style={[
                              styles.filterPillChip,
                              {
                                backgroundColor: active ? '#2563eb' : cardLowest,
                                borderColor: active ? '#2563eb' : cardBorder,
                              },
                            ]}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Users Table Header (Desktop) */}
                {!isMobile && (
                  <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopColor: cardBorder, borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tableHeadCell, { flex: 2.2, color: textVariant, fontFamily: F.bold }]}>USUARIO / CLIENTE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3, color: textVariant, fontFamily: F.bold }]}>ESTADO DE CUENTA</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.6, color: textVariant, fontFamily: F.bold }]}>UBICACIÓN (ESTADO · PAÍS)</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.4, color: textVariant, fontFamily: F.bold }]}>TELÉFONO / CONTACTO</Text>
                    <Text style={[styles.tableHeadCell, { width: 180, textAlign: 'right', color: textVariant, fontFamily: F.bold }]}>ACCIONES</Text>
                  </View>
                )}

                {/* Users Rows */}
                <View>
                  {filteredUsersList.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center' }}>
                      <MaterialIcons name="groups" size={38} color={textOutline} />
                      <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                        No hay usuarios o clientes registrados en este filtro
                      </Text>
                    </View>
                  ) : (
                    filteredUsersList.map((u: any) => {
                      const initials = (u.full_name || u.email || 'CL')
                        .split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <View
                          key={u.id}
                          style={[
                            styles.tableDataRow,
                            {
                              backgroundColor: cardLowest,
                              borderBottomColor: cardBorder,
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                            },
                          ]}
                        >
                          {/* Col 1: Name & Email */}
                          <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.tableUserAvatar, { backgroundColor: u.isPending ? '#ef4444' : innovationPurple }]}>
                              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>{initials}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontFamily: F.bold, fontSize: 14, color: primaryNavy }} numberOfLines={1}>
                                {u.full_name || 'Usuario Registrado'}
                              </Text>
                              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }} numberOfLines={1}>
                                {u.email || 'Sin correo'}
                              </Text>
                            </View>
                          </View>

                          {/* Col 2: Account Status */}
                          <View style={{ flex: 1.3 }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: u.isPending ? 'rgba(239, 68, 68, 0.14)' : 'rgba(22, 163, 74, 0.14)',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 99,
                              }}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: u.isPending ? '#ef4444' : '#16a34a' }}>
                                {u.isPending ? 'PENDIENTE APROBACIÓN' : 'CLIENTE ACTIVO'}
                              </Text>
                            </View>
                          </View>

                          {/* Col 3: Location */}
                          <View style={{ flex: 1.6 }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              📍 {u.geoState}
                            </Text>
                            <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }} numberOfLines={1}>
                              {u.geoZone} · {u.geoCountry}
                            </Text>
                          </View>

                          {/* Col 4: Phone */}
                          <View style={{ flex: 1.4 }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: u.phone ? textOnSurface : textOutline }}>
                              {u.phone || 'Sin teléfono en BD'}
                            </Text>
                          </View>

                          {/* Col 5: Actions */}
                          <View style={{ width: isMobile ? '100%' : 180, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                            {u.isPending && (
                              <>
                                <TouchableOpacity
                                  onPress={() => approveUser(u.id)}
                                  style={{ backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                >
                                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#ffffff' }}>Aprobar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => rejectUser(u.id)}
                                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                >
                                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#ef4444' }}>Rechazar</Text>
                                </TouchableOpacity>
                              </>
                            )}
                            {u.phone ? (
                              <TouchableOpacity
                                onPress={() => {
                                  const rawDigits = String(u.phone).replace(/\D/g, '');
                                  const phone = rawDigits.startsWith('58') ? rawDigits : '58' + rawDigits.replace(/^0/, '');
                                  Linking.openURL('https://wa.me/' + phone).catch(() => {});
                                }}
                                style={[styles.tableActionIconBtn, { backgroundColor: 'rgba(37, 211, 102, 0.14)' }]}
                              >
                                <MaterialCommunityIcons name="whatsapp" size={18} color="#16a34a" />
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              onPress={() => {
                                loadSystemUsers();
                                setUserMgmtVisible(true);
                              }}
                              style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                            >
                              <MaterialIcons name="manage-accounts" size={18} color={primaryNavy} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={[styles.tableCardFooter, { backgroundColor: surfaceLow, borderTopColor: cardBorder }]}>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                    Mostrando {filteredUsersList.length} de {allUsersAndClientsList.length} cuentas de usuarios y clientes
                  </Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                    {(clientsList || []).length} Activos · {(pendingUsersList || []).length} Pendientes
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* PERSISTENT SUB-TABS CONTAINER (Services, History, Wallet, Profile) */}
        <View style={[{ flex: 1, width: '100%' }, activeTab === 'moto' && { display: 'none' }]}>
          {children}
        </View>
      </View>

      {/* MOBILE DRAWER MENU */}
      {isMobile && (
        <Modal
          visible={mobileMenuOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMobileMenuOpen(false)}
        >
          <View style={styles.mobileDrawerOverlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setMobileMenuOpen(false)} />
            <View style={[styles.mobileDrawerSheet, { backgroundColor: cardLowest, borderLeftColor: cardBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontFamily: F.extrabold, fontSize: 16, color: primaryNavy }}>Módulos Super Admin</Text>
                <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                  <MaterialIcons name="close" size={22} color={textOnSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {sidebarNavItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setMobileMenuOpen(false);
                      item.action();
                    }}
                    style={[
                      styles.sidebarNavItem,
                      { backgroundColor: item.isActive ? primaryContainer : surfaceLow },
                    ]}
                  >
                    <MaterialIcons name={item.icon as any} size={20} color={item.isActive ? '#ffffff' : primaryNavy} />
                    <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: item.isActive ? '#ffffff' : textOnSurface }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  style={[styles.sidebarNavItem, { backgroundColor: 'rgba(239, 68, 68, 0.14)', marginTop: 12 }]}
                >
                  <MaterialIcons name="logout" size={20} color="#ef4444" />
                  <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: '#ef4444' }}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* MODALS */}
      <UserManagementModal visible={userMgmtVisible} onClose={() => setUserMgmtVisible(false)} />
      <CreateOperatorModal
        visible={createOperatorVisible}
        onClose={() => setCreateOperatorVisible(false)}
        onOperatorCreated={() => loadSystemUsers()}
      />
      <AssignOperatorModal
        visible={!!assigningOperator}
        operator={assigningOperator}
        onClose={() => setAssigningOperator(null)}
        onSaveSuccess={() => {
          setAssigningOperator(null);
          loadSystemUsers();
        }}
      />
      <OperatorAgendaModal
        visible={agendaVisible}
        onClose={() => setAgendaVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootLayout: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  sidebarAside: {
    width: 272,
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: 22,
    justifyContent: 'space-between',
  },
  sidebarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  sidebarBrandIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarPlantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sidebarSelectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sidebarNavBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  sidebarSupportCard: {
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  mainContentArea: {
    flex: 1,
    height: '100%',
  },
  topHeaderBarDesktop: {
    height: 64,
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSearchBox: {
    width: 310,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  headerPrimaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerSquareIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerRedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  headerUserCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeaderBarMobile: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  mobileCollapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileHamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileBrandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileBrandLogo: {
    width: 28,
    height: 28,
  },
  mobileHeaderRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileSearchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileSearchExpandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  bentoScrollContent: {
    padding: 28,
    paddingBottom: 90,
    gap: 20,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
  },
  topUtilityBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  utilityStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  utilityPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  utilityHeadline: {
    letterSpacing: -0.5,
  },
  utilityActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  toolbarSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  toolbarPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  perspectiveTabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    borderRadius: 14,
    gap: 6,
  },
  perspectiveTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  kpiGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 230,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  kpiCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiEyebrow: {
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiBigDisplay: {
    fontSize: 32,
    letterSpacing: -0.8,
  },
  kpiProgressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 99,
    marginTop: 10,
    overflow: 'hidden',
  },
  kpiProgressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  bento12Grid: {
    gap: 20,
    width: '100%',
  },
  bento8Col: {
    gap: 16,
  },
  bento4Col: {
    gap: 16,
  },
  bentoCardBox: {
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  chartFooterRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tiers4Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tierMiniCard: {
    flex: 1,
    minWidth: 165,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  purpleScannerBtn: {
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  operationalTableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableCardHeader: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  tableFilterSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  tableHeadCell: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tableDataRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  tablePlantThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableActionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCardFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  mobileDrawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
  },
  mobileDrawerSheet: {
    width: 280,
    height: '100%',
    padding: 20,
    borderLeftWidth: 1,
  },
});
