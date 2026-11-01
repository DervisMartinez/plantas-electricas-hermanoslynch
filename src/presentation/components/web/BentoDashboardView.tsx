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
import { supabase } from '../../../data/supabaseClient';
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
  const [showFilterBar, setShowFilterBar] = useState(true);

  // Reusable Dropdown Picker Modal State ("Por favor, seleccione. v")
  const [dropdownConfig, setDropdownConfig] = useState<{
    title: string;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
  } | null>(null);

  // Quick Plant Editor Modal State (when clicking a plant row in Tab 2)
  const [editingPlant, setEditingPlant] = useState<any | null>(null);
  const [editPlantBrand, setEditPlantBrand] = useState('');
  const [editPlantModel, setEditPlantModel] = useState('');
  const [editPlantSerial, setEditPlantSerial] = useState('');
  const [editPlantKva, setEditPlantKva] = useState('');
  const [editPlantLocation, setEditPlantLocation] = useState('');
  const [editPlantOperatorId, setEditPlantOperatorId] = useState<string | null>(null);
  const [savingPlantEdit, setSavingPlantEdit] = useState(false);

  // Modals
  const [userMgmtVisible, setUserMgmtVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [createOperatorVisible, setCreateOperatorVisible] = useState(false);
  const [assigningOperator, setAssigningOperator] = useState<any | null>(null);

  const { updateMoto } = useMyMoto();

  const openPlantEditor = (plant: any) => {
    setEditingPlant(plant);
    setEditPlantBrand(plant.brand || '');
    setEditPlantModel(plant.model || '');
    setEditPlantSerial(plant.serialNumber || plant.plate || '');
    setEditPlantKva(String(plant.powerKva || 35));
    setEditPlantLocation(plant.location || (plant.geoState !== 'Sin Estado en BD' ? plant.geoState : ''));
    setEditPlantOperatorId(plant.assignedOperatorId || null);
  };

  const handleSavePlantEdit = async () => {
    if (!editingPlant?.id) return;
    setSavingPlantEdit(true);
    try {
      const selectedOp = operatorsList.find((op: any) => op.id === editPlantOperatorId);
      const nextOpName = selectedOp ? (selectedOp.full_name || selectedOp.email || '') : null;

      await supabase
        .from('plantas')
        .update({
          brand: editPlantBrand.trim() || editingPlant.brand,
          model: editPlantModel.trim() || editingPlant.model,
          serial_number: editPlantSerial.trim() || editingPlant.serialNumber,
          power_kva: Number(editPlantKva) || editingPlant.powerKva || 35,
          location: editPlantLocation.trim(),
          assigned_operator_id: editPlantOperatorId || null,
          assigned_operator_name: nextOpName,
        })
        .eq('id', editingPlant.id);

      await updateMoto({
        ...editingPlant,
        brand: editPlantBrand.trim() || editingPlant.brand,
        model: editPlantModel.trim() || editingPlant.model,
        serialNumber: editPlantSerial.trim() || editingPlant.serialNumber,
        plate: editPlantSerial.trim() || editingPlant.plate,
        powerKva: Number(editPlantKva) || editingPlant.powerKva || 35,
        location: editPlantLocation.trim(),
        assignedOperatorId: editPlantOperatorId || undefined,
        assignedOperatorName: nextOpName || undefined,
      });

      await loadSystemUsers();
      setEditingPlant(null);
    } catch (e) {
      console.error('Error updating plant:', e);
    } finally {
      setSavingPlantEdit(false);
    }
  };

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

  // Helper to enrich a profile with structured specialty ("Dept | State | Zone | Country | Obs") + plant location fallback
  const enrichProfileRecord = (u: any, resolvedRole: 'superadmin' | 'operator' | 'client') => {
    const rawSpec = (u.specialty || '').trim();
    let parsedDept = (u.department || '').trim();
    let parsedState = (u.state || u.city || u.location || '').trim();
    let parsedZone = (u.zone || '').trim();
    let parsedCountry = (u.country || '').trim();
    let parsedObs = '';

    if (rawSpec.includes('|')) {
      const parts = rawSpec.split('|').map((s: string) => s.trim());
      parsedDept = parts[0] || parsedDept;
      parsedState = parts[1] || parsedState;
      parsedZone = parts[2] || parsedZone;
      parsedCountry = parts[3] || parsedCountry;
      parsedObs = parts[4] || '';
    } else if (rawSpec) {
      parsedDept = parsedDept || rawSpec;
    }

    // If employee/user still has no explicit state, check if they have an assigned plant in `allPlants`
    const linkedPlant = allPlants.find(
      (p) =>
        p.assignedOperatorId === u.id ||
        (p as any).user_id === u.id ||
        (p as any).userId === u.id ||
        (p.assignedOperatorName && u.full_name && p.assignedOperatorName.toLowerCase().trim() === u.full_name.toLowerCase().trim())
    );

    const geo = resolveRealGeo({
      state: parsedState,
      zone: parsedZone,
      country: parsedCountry,
      location: parsedState || linkedPlant?.location || '',
    });

    const fullNameStr = (u.full_name || u.email?.split('@')[0] || 'Sin Nombre').trim();
    const nameParts = fullNameStr.split(/\s+/);
    const firstName = nameParts[0] || fullNameStr;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '--';

    return {
      ...u,
      firstName,
      lastName,
      resolvedRole,
      geoCountry: geo.country,
      geoZone: geo.zone,
      geoState: geo.state,
      deptLabel:
        parsedDept ||
        (resolvedRole === 'superadmin'
          ? 'Dirección Ejecutiva'
          : resolvedRole === 'operator'
          ? 'Plantas Eléctricas'
          : 'Cliente Titular'),
      observations: parsedObs || u.phone || '--',
    };
  };

  // 1. Dedicated Personnel List (ONLY Operators & Super Admins)
  const allPersonnelList = useMemo(() => {
    const map = new Map<string, any>();
    (superAdminsList || []).forEach((u: any) => {
      map.set(u.id, enrichProfileRecord(u, 'superadmin'));
    });
    (operatorsList || []).forEach((u: any) => {
      if (!map.has(u.id)) {
        map.set(u.id, enrichProfileRecord(u, 'operator'));
      }
    });
    return Array.from(map.values());
  }, [superAdminsList, operatorsList, allPlants]);

  // 2. Dedicated Users / Clients List (ONLY Regular Clients & Pending Approvals)
  const allUsersAndClientsList = useMemo(() => {
    const map = new Map<string, any>();
    (clientsList || []).forEach((u: any) => {
      map.set(u.id, {
        ...enrichProfileRecord(u, 'client'),
        isPending: u.approval_status === 'pending',
      });
    });
    (pendingUsersList || []).forEach((u: any) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          ...enrichProfileRecord(u, (u.role as any) || 'client'),
          isPending: true,
        });
      }
    });
    return Array.from(map.values());
  }, [clientsList, pendingUsersList, allPlants]);

  // =========================================================================
  // TAB 2 FILTERS: DISPONIBILIDAD DE PLANTAS (Estilo "Transacción")
  // =========================================================================
  const [plantAvailabilityFilter, setPlantAvailabilityFilter] = useState<'Todas' | 'Disponibles' | 'Asignadas'>('Todas');
  const [plantCategoryFilter, setPlantCategoryFilter] = useState('Todas');
  const [plantCountryFilter, setPlantCountryFilter] = useState('Todos');
  const [plantZoneFilter, setPlantZoneFilter] = useState('Todas');
  const [plantStateFilter, setPlantStateFilter] = useState('Todos');
  const [plantSearch, setPlantSearch] = useState('');
  const [plantSerialSearch, setPlantSerialSearch] = useState('');

  const COUNTRIES_LIST = ['Todos', 'Venezuela', 'Colombia', 'Panamá', 'EE.UU.'];
  const ZONES_LIST = ['Todas', 'Zona Central', 'Zona Capital', 'Zona Occidental', 'Zona Oriental', 'Zona Los Andes', 'Zona Guayana'];
  const STATES_LIST = useMemo(() => {
    const base = ['Todos', 'Carabobo', 'Distrito Capital', 'Miranda', 'Aragua', 'Zulia', 'Lara', 'Anzoátegui', 'Táchira', 'Bolívar'];
    const set = new Set<string>(base);
    allPlants.forEach((p) => {
      if (p.location && p.location.trim()) set.add(p.location.trim());
      if (p.geoState && p.geoState !== 'Sin Estado en BD') set.add(p.geoState);
    });
    allPersonnelList.forEach((op) => {
      if (op.geoState && op.geoState !== 'Sin Estado en BD') set.add(op.geoState);
    });
    return Array.from(set);
  }, [allPlants, allPersonnelList]);

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

      if (plantSerialSearch.trim()) {
        const sq = plantSerialSearch.toLowerCase().trim();
        const serialMatch = (plant.serialNumber || plant.plate || plant.id || '').toLowerCase().includes(sq);
        if (!serialMatch) return false;
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
    plantSerialSearch,
    searchQuery,
  ]);

  // =========================================================================
  // TAB 3 FILTERS: PERSONAL OPERADOR & TÉCNICOS (Estilo "Transacción")
  // =========================================================================
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<'Todo el Personal' | 'Operadores Técnicos' | 'Super Administradores'>('Todo el Personal');
  const [personnelAssignFilter, setPersonnelAssignFilter] = useState<'Todos' | 'Con Plantas a Cargo' | 'Disponibles (0 Plantas)' | 'Con Vehículo de Flota'>('Todos');
  const [personnelCountryFilter, setPersonnelCountryFilter] = useState('Todos');
  const [personnelZoneFilter, setPersonnelZoneFilter] = useState('Todas');
  const [personnelStateFilter, setPersonnelStateFilter] = useState('Todos');
  const [personnelDeptFilter, setPersonnelDeptFilter] = useState('Todos');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelIdSearch, setPersonnelIdSearch] = useState('');

  const personnelDeptsList = useMemo(() => {
    const set = new Set<string>([
      'Todos',
      'Plantas Eléctricas',
      'Especialista Técnico Senior',
      'Mantenimiento Preventivo',
      'Dirección Ejecutiva',
      'Soporte de Campo',
      'Control de Operaciones',
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

      if (personnelIdSearch.trim()) {
        const idq = personnelIdSearch.toLowerCase().trim();
        const idMatch =
          (op.operator_code || '').toLowerCase().includes(idq) ||
          (op.id || '').toLowerCase().includes(idq);
        if (!idMatch) return false;
      }

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
    personnelIdSearch,
    searchQuery,
  ]);

  // =========================================================================
  // TAB 4 FILTERS: USUARIOS Y CLIENTES (Estilo "Transacción")
  // =========================================================================
  const [userStatusFilter, setUserStatusFilter] = useState<'Todos los Usuarios' | 'Usuarios Activos' | 'Solicitudes Pendientes'>('Todos los Usuarios');
  const [userCountryFilter, setUserCountryFilter] = useState('Todos');
  const [userZoneFilter, setUserZoneFilter] = useState('Todas');
  const [userStateFilter, setUserStateFilter] = useState('Todos');
  const [userSearch, setUserSearch] = useState('');
  const [userIdSearch, setUserIdSearch] = useState('');

  const filteredUsersList = useMemo(() => {
    return allUsersAndClientsList.filter((u: any) => {
      if (userStatusFilter === 'Usuarios Activos' && u.isPending) return false;
      if (userStatusFilter === 'Solicitudes Pendientes' && !u.isPending) return false;
      if (userCountryFilter !== 'Todos' && u.geoCountry.toLowerCase() !== userCountryFilter.toLowerCase()) return false;
      if (userZoneFilter !== 'Todas' && u.geoZone.toLowerCase() !== userZoneFilter.toLowerCase()) return false;
      if (userStateFilter !== 'Todos' && u.geoState.toLowerCase() !== userStateFilter.toLowerCase()) return false;

      if (userIdSearch.trim()) {
        const idq = userIdSearch.toLowerCase().trim();
        const idMatch =
          (u.operator_code || '').toLowerCase().includes(idq) ||
          (u.id || '').toLowerCase().includes(idq) ||
          (u.phone || '').toLowerCase().includes(idq);
        if (!idMatch) return false;
      }

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
    userIdSearch,
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

  // Sidebar items — Each section separated cleanly.
  // Super Admin (el Jefe) does NOT have 'Ficha Técnica OEM' nor 'Mantenimiento & Servicios' (operators fill maintenance).
  const sidebarNavItems = useMemo(() => {
    return [
      {
        id: 'nav_overview',
        label: 'Resumen Ejecutivo',
        shortLabel: 'Resumen',
        icon: 'dashboard',
        isActive: activeTab === 'moto' && perspectiveTab === 'overview',
        action: () => goToPerspective('overview'),
      },
      {
        id: 'nav_plants',
        label: 'Disponibilidad de Plantas',
        shortLabel: 'Plantas',
        icon: 'bolt',
        badge: allPlants.length,
        badgeColor: '#16a34a',
        isActive: activeTab === 'moto' && perspectiveTab === 'plants',
        action: () => goToPerspective('plants'),
      },
      {
        id: 'nav_personnel',
        label: 'Personal Operador',
        shortLabel: 'Personal',
        icon: 'engineering',
        badge: allPersonnelList.length,
        badgeColor: '#2563eb',
        isActive: activeTab === 'moto' && perspectiveTab === 'personnel',
        action: () => goToPerspective('personnel'),
      },
      {
        id: 'nav_users',
        label: 'Usuarios y Clientes',
        shortLabel: 'Usuarios',
        icon: 'groups',
        badge: (pendingUsersList?.length || 0) > 0 ? pendingUsersList.length : allUsersAndClientsList.length,
        badgeColor: (pendingUsersList?.length || 0) > 0 ? '#ef4444' : innovationPurple,
        isActive: activeTab === 'moto' && perspectiveTab === 'users',
        action: () => goToPerspective('users'),
      },
      ...(!isSuperAdmin
        ? [
            {
              id: 'nav_services',
              label: 'Mantenimiento & Servicios',
              shortLabel: 'Servicios',
              icon: 'build',
              isActive: activeTab === 'services',
              action: () => onSelectTab('services'),
            },
          ]
        : []),
      {
        id: 'nav_history',
        label: isSuperAdmin ? 'Auditoría de Bitácora' : 'Bitácora & Finanzas',
        shortLabel: 'Bitácora',
        icon: 'payments',
        isActive: activeTab === 'history',
        action: () => onSelectTab('history'),
      },
      ...(drivesCompanyVehicle && !isSuperAdmin
        ? [
            {
              id: 'nav_wallet',
              label: 'Guantera de Flota',
              shortLabel: 'Wallet',
              icon: 'account-balance-wallet',
              isActive: activeTab === 'wallet',
              action: () => onSelectTab('wallet'),
            },
          ]
        : []),
      {
        id: 'nav_profile',
        label: 'Mi Perfil Ejecutivo',
        shortLabel: 'Perfil',
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

          {/* 4 DEDICATED PERSPECTIVE TABS BAR (Scrollable on Mobile Phones) */}
          <ScrollView
            horizontal={isMobile}
            showsHorizontalScrollIndicator={false}
            style={[
              styles.perspectiveTabContainer,
              { backgroundColor: surfaceLow },
              isMobile && { flexGrow: 0 },
            ]}
            contentContainerStyle={
              isMobile
                ? { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 }
                : { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' }
            }
          >
            {[
              { id: 'overview' as const, label: isMobile ? '1. Resumen' : '1. Resumen Ejecutivo', icon: 'dashboard', color: academicGold },
              { id: 'plants' as const, label: isMobile ? `2. Plantas (${allPlants.length})` : `2. Disponibilidad de Plantas (${allPlants.length})`, icon: 'bolt', color: '#16a34a' },
              { id: 'personnel' as const, label: isMobile ? `3. Personal (${allPersonnelList.length})` : `3. Personal Operador (${allPersonnelList.length})`, icon: 'engineering', color: '#2563eb' },
              { id: 'users' as const, label: isMobile ? `4. Usuarios (${allUsersAndClientsList.length})` : `4. Usuarios y Clientes (${allUsersAndClientsList.length})`, icon: 'groups', color: innovationPurple },
            ].map((tab) => {
              const active = perspectiveTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setPerspectiveTab(tab.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.perspectiveTabBtn,
                    isMobile && { paddingHorizontal: 13, paddingVertical: 9 },
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
                      fontSize: isMobile ? 12.5 : 13,
                      color: active ? primaryNavy : textVariant,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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

              {/* Main Plants Availability Card — Estilo "Transacción" */}
              <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                {/* Top Action Bar (Exportar + Título + Acciones Derecha) */}
                <View style={[styles.tableCardHeader, { borderBottomWidth: 1, borderBottomColor: cardBorder, paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 18, color: primaryNavy }}>
                      Disponibilidad de Plantas Eléctricas ({filteredFleetPlants.length})
                    </Text>
                    <TouchableOpacity
                      onPress={onOpenReport}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: surfaceLow,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <MaterialIcons name="file-download" size={16} color={primaryNavy} />
                      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: primaryNavy }}>Exportar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setIsAddingMoto(true)}
                      style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 8 }]}
                    >
                      <MaterialIcons name="add-circle" size={16} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>Incorporar Planta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowFilterBar((prev) => !prev)}
                      style={[styles.tableActionIconBtn, { backgroundColor: showFilterBar ? 'rgba(255, 91, 87, 0.14)' : surfaceLow }]}
                    >
                      <MaterialIcons name="filter-alt" size={18} color={showFilterBar ? '#ff5b57' : textVariant} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => loadSystemUsers()}
                      style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                    >
                      <MaterialIcons name="refresh" size={18} color={textVariant} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Horizontal Multi-Field Filter Bar (Referencia "Transacción") */}
                {showFilterBar && (
                  <View
                    style={{
                      paddingHorizontal: isMobile ? 14 : 20,
                      paddingVertical: 16,
                      backgroundColor: surfaceLow,
                      borderBottomWidth: 1,
                      borderBottomColor: cardBorder,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      gap: 12,
                    }}
                  >
                    {/* Field 1: Marca / Modelo */}
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : 170 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Planta / Modelo
                      </Text>
                      <TextInput
                        value={plantSearch}
                        onChangeText={setPlantSearch}
                        placeholder="Introduzca la palabra clave."
                        placeholderTextColor={textOutline}
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          fontFamily: F.medium,
                          fontSize: 12,
                          color: textOnSurface,
                        }}
                      />
                    </View>

                    {/* Field 2: ID / Serial */}
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : 155 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        ID / N.º de serie
                      </Text>
                      <TextInput
                        value={plantSerialSearch}
                        onChangeText={setPlantSerialSearch}
                        placeholder="Introduzca la palabra clave."
                        placeholderTextColor={textOutline}
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          fontFamily: F.medium,
                          fontSize: 12,
                          color: textOnSurface,
                        }}
                      />
                    </View>

                    {/* Field 3: Capacidad / Categoría Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 170 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Categoría / Capacidad
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Seleccionar Categoría de Capacidad',
                            options: PLANT_CATEGORIES,
                            selected: plantCategoryFilter,
                            onSelect: (val) => setPlantCategoryFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: plantCategoryFilter === 'Todas' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {plantCategoryFilter === 'Todas' ? 'Por favor, seleccione.' : plantCategoryFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 4: Ubicación (Estado / Sede) Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 170 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Estado / Ubicación
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Seleccionar Estado o Sede',
                            options: STATES_LIST,
                            selected: plantStateFilter,
                            onSelect: (val) => setPlantStateFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: plantStateFilter === 'Todos' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {plantStateFilter === 'Todos' ? 'Por favor, seleccione.' : plantStateFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 5: Zona / País Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 155 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Zona / País
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Seleccionar Zona Geográfica',
                            options: ZONES_LIST,
                            selected: plantZoneFilter,
                            onSelect: (val) => setPlantZoneFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: plantZoneFilter === 'Todas' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {plantZoneFilter === 'Todas' ? 'Por favor, seleccione.' : plantZoneFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 6: Disponibilidad Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 155 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Disponibilidad
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Filtrar por Disponibilidad',
                            options: ['Todas', 'Disponibles', 'Asignadas'],
                            selected: plantAvailabilityFilter,
                            onSelect: (val) => setPlantAvailabilityFilter(val as any),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: plantAvailabilityFilter === 'Todas' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {plantAvailabilityFilter === 'Todas' ? 'Todas las unidades' : plantAvailabilityFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Botones Filtro y Restablecer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {}}
                        activeOpacity={0.85}
                        style={{
                          height: 38,
                          paddingHorizontal: 20,
                          borderRadius: 19,
                          backgroundColor: '#ff5b57',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>Filtro</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setPlantSearch('');
                          setPlantSerialSearch('');
                          setPlantCategoryFilter('Todas');
                          setPlantStateFilter('Todos');
                          setPlantZoneFilter('Todas');
                          setPlantCountryFilter('Todos');
                          setPlantAvailabilityFilter('Todas');
                        }}
                        activeOpacity={0.85}
                        style={{
                          height: 38,
                          paddingHorizontal: 16,
                          borderRadius: 19,
                          backgroundColor: cardLowest,
                          borderWidth: 1,
                          borderColor: textOnSurface,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }}>Restablecer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Hint Banner */}
                <View style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.08)' : '#f8fafc', borderBottomWidth: 1, borderBottomColor: cardBorder, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="touch-app" size={15} color={academicGold} />
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    Haz clic sobre cualquier fila de planta para <Text style={{ fontFamily: F.bold, color: primaryNavy }}>editar sus datos, asignar Estado/Ubicación o cambiar su operador responsable</Text>.
                  </Text>
                </View>

                {/* Table Header (Desktop — Estilo "Transacción") */}
                {!isMobile && (
                  <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopWidth: 0, borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>Marca</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1, color: textOnSurface, fontFamily: F.bold }]}>Modelo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.9, color: textOnSurface, fontFamily: F.bold }]}>Capacidad ⇅</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.4, color: textOnSurface, fontFamily: F.bold }]}>Categoría ⇅</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3, color: textOnSurface, fontFamily: F.bold }]}>N.º de serie del dispositivo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>Estado Operativo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.4, color: textOnSurface, fontFamily: F.bold }]}>Operador a Cargo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.9, color: textOnSurface, fontFamily: F.bold }]}>Horómetro</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.5, color: textOnSurface, fontFamily: F.bold }]}>Ubicación</Text>
                    <Text style={[styles.tableHeadCell, { width: 115, textAlign: 'right', color: textOnSurface, fontFamily: F.bold }]}>Acciones</Text>
                  </View>
                )}

                {/* Plants Rows (Clickable for instant editing!) */}
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
                        <TouchableOpacity
                          key={plant.id}
                          onPress={() => openPlantEditor(plant)}
                          activeOpacity={0.75}
                          style={[
                            styles.tableDataRow,
                            {
                              backgroundColor: cardLowest,
                              borderBottomColor: cardBorder,
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              paddingHorizontal: isMobile ? 14 : 20,
                              paddingVertical: 12,
                            },
                          ]}
                        >
                          {/* Marca */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              {plant.brand || 'Blue Power'}
                            </Text>
                          </View>

                          {/* Modelo */}
                          <View style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: primaryNavy }} numberOfLines={1}>
                              {plant.model || '--'}
                            </Text>
                          </View>

                          {/* Capacidad */}
                          <View style={{ flex: 0.9, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textOnSurface }}>
                              {kva} kVA
                            </Text>
                          </View>

                          {/* Categoría */}
                          <View style={{ flex: 1.4, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }} numberOfLines={1}>
                              {plant.category}
                            </Text>
                          </View>

                          {/* N.º de serie */}
                          <View style={{ flex: 1.3, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }} numberOfLines={1}>
                              {plant.serialNumber || plant.plate || '--'}
                            </Text>
                          </View>

                          {/* Estado Operativo */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: plant.isAssigned ? 'rgba(37, 99, 235, 0.14)' : 'rgba(22, 163, 74, 0.14)',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 99,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: F.bold,
                                  fontSize: 10,
                                  color: plant.isAssigned ? '#2563eb' : '#16a34a',
                                }}
                              >
                                {plant.isAssigned ? 'EN OPERACIÓN' : 'DISPONIBLE'}
                              </Text>
                            </View>
                          </View>

                          {/* Operador a Cargo */}
                          <View style={{ flex: 1.4, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: plant.assignedOperatorName ? textOnSurface : textOutline }} numberOfLines={1}>
                              {plant.assignedOperatorName || '--'}
                            </Text>
                          </View>

                          {/* Horómetro */}
                          <View style={{ flex: 0.9, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                              {hrs.toLocaleString()} hrs
                            </Text>
                          </View>

                          {/* Ubicación */}
                          <View style={{ flex: 1.5, width: isMobile ? '100%' : undefined }}>
                            <Text
                              style={{
                                fontFamily: F.semibold,
                                fontSize: 12,
                                color: plant.geoState === 'Sin Estado en BD' ? '#f59e0b' : textOnSurface,
                              }}
                              numberOfLines={1}
                            >
                              {plant.location || (plant.geoState === 'Sin Estado en BD' ? '+ Asignar Estado' : plant.geoState)}
                            </Text>
                            <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: textVariant }} numberOfLines={1}>
                              {plant.geoZone !== 'Sin Zona en BD' ? `${plant.geoZone} · ${plant.geoCountry}` : plant.geoCountry}
                            </Text>
                          </View>

                          {/* Acciones */}
                          <View style={{ width: isMobile ? '100%' : 115, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                            <TouchableOpacity
                              onPress={() => openPlantEditor(plant)}
                              style={[
                                styles.toolbarSecondaryBtn,
                                { backgroundColor: surfaceLow, borderColor: cardBorder, paddingHorizontal: 8, paddingVertical: 5 },
                              ]}
                            >
                              <MaterialIcons name="edit-location-alt" size={15} color={primaryNavy} />
                              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: primaryNavy }}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                selectMoto(plant.id);
                                onOpenReport();
                              }}
                              style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow, width: 30, height: 30 }]}
                            >
                              <MaterialIcons name="picture-as-pdf" size={16} color={primaryNavy} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Bottom Pagination Bar (Referencia "Transacción") */}
                <View style={[styles.tableCardFooter, { backgroundColor: cardLowest, borderTopColor: cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: surfaceLow,
                      }}
                    >
                      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }}>20</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={16} color={textVariant} />
                    </View>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                      Mostrando {filteredFleetPlants.length} de {allPlants.length} plantas ({fleetStats.unassigned} disponibles · {fleetStats.assigned} asignadas)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <MaterialIcons name="chevron-left" size={20} color={textOutline} />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>1</Text>
                    <MaterialIcons name="chevron-right" size={20} color={textOutline} />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 3: PERSONAL OPERADOR & ADMINS (Estilo "Transacción")          */}
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

              {/* Main Personnel Directory Card — Estilo "Transacción" */}
              <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                {/* Top Action Bar */}
                <View style={[styles.tableCardHeader, { borderBottomWidth: 1, borderBottomColor: cardBorder, paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 18, color: primaryNavy }}>
                      Personal Operador y Administradores ({filteredPersonnelList.length})
                    </Text>
                    <TouchableOpacity
                      onPress={onOpenReport}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: surfaceLow,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <MaterialIcons name="file-download" size={16} color={primaryNavy} />
                      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: primaryNavy }}>Exportar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setCreateOperatorVisible(true)}
                      style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 8 }]}
                    >
                      <MaterialIcons name="person-add" size={16} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>
                        Registrar Empleado / Admin
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowFilterBar((prev) => !prev)}
                      style={[styles.tableActionIconBtn, { backgroundColor: showFilterBar ? 'rgba(255, 91, 87, 0.14)' : surfaceLow }]}
                    >
                      <MaterialIcons name="filter-alt" size={18} color={showFilterBar ? '#ff5b57' : textVariant} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => loadSystemUsers()}
                      style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                    >
                      <MaterialIcons name="refresh" size={18} color={textVariant} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Horizontal Multi-Field Filter Bar (Referencia "Transacción") */}
                {showFilterBar && (
                  <View
                    style={{
                      paddingHorizontal: isMobile ? 14 : 20,
                      paddingVertical: 16,
                      backgroundColor: surfaceLow,
                      borderBottomWidth: 1,
                      borderBottomColor: cardBorder,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      gap: 12,
                    }}
                  >
                    {/* Field 1: Nombre completo */}
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : 170 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Nombre completo
                      </Text>
                      <TextInput
                        value={personnelSearch}
                        onChangeText={setPersonnelSearch}
                        placeholder="Introduzca la palabra clave."
                        placeholderTextColor={textOutline}
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          fontFamily: F.medium,
                          fontSize: 12,
                          color: textOnSurface,
                        }}
                      />
                    </View>

                    {/* Field 2: ID / Carnet */}
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : 145 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        ID
                      </Text>
                      <TextInput
                        value={personnelIdSearch}
                        onChangeText={setPersonnelIdSearch}
                        placeholder="Introduzca la palabra clave."
                        placeholderTextColor={textOutline}
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          fontFamily: F.medium,
                          fontSize: 12,
                          color: textOnSurface,
                        }}
                      />
                    </View>

                    {/* Field 3: Departamento Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 165 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Departamento
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Seleccionar Departamento',
                            options: personnelDeptsList,
                            selected: personnelDeptFilter,
                            onSelect: (val) => setPersonnelDeptFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: personnelDeptFilter === 'Todos' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {personnelDeptFilter === 'Todos' ? 'Por favor, seleccione.' : personnelDeptFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 4: Estado / Ubicación Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 165 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Ubicación (Estado)
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Filtrar Personal por Estado / Sede',
                            options: STATES_LIST,
                            selected: personnelStateFilter,
                            onSelect: (val) => setPersonnelStateFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: personnelStateFilter === 'Todos' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {personnelStateFilter === 'Todos' ? 'Por favor, seleccione.' : personnelStateFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 5: Rol / Nivel Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 155 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Rol Personal
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Filtrar por Rol de Personal',
                            options: ['Todo el Personal', 'Operadores Técnicos', 'Super Administradores'],
                            selected: personnelRoleFilter,
                            onSelect: (val) => setPersonnelRoleFilter(val as any),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: personnelRoleFilter === 'Todo el Personal' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {personnelRoleFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 6: Device / Asignación Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 165 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Device / Asignación
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Filtrar por Planta o Vehículo Asignado',
                            options: ['Todos', 'Con Plantas a Cargo', 'Disponibles (0 Plantas)', 'Con Vehículo de Flota'],
                            selected: personnelAssignFilter,
                            onSelect: (val) => setPersonnelAssignFilter(val as any),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: personnelAssignFilter === 'Todos' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {personnelAssignFilter === 'Todos' ? 'Por favor, seleccione.' : personnelAssignFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Botones Filtro y Restablecer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {}}
                        activeOpacity={0.85}
                        style={{
                          height: 38,
                          paddingHorizontal: 20,
                          borderRadius: 19,
                          backgroundColor: '#ff5b57',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>Filtro</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setPersonnelSearch('');
                          setPersonnelIdSearch('');
                          setPersonnelDeptFilter('Todos');
                          setPersonnelStateFilter('Todos');
                          setPersonnelZoneFilter('Todas');
                          setPersonnelCountryFilter('Todos');
                          setPersonnelRoleFilter('Todo el Personal');
                          setPersonnelAssignFilter('Todos');
                        }}
                        activeOpacity={0.85}
                        style={{
                          height: 38,
                          paddingHorizontal: 16,
                          borderRadius: 19,
                          backgroundColor: cardLowest,
                          borderWidth: 1,
                          borderColor: textOnSurface,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }}>Restablecer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Hint Banner */}
                <View style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.08)' : '#f8fafc', borderBottomWidth: 1, borderBottomColor: cardBorder, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="touch-app" size={15} color={academicGold} />
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    Haz clic directamente sobre cualquier empleado para <Text style={{ fontFamily: F.bold, color: primaryNavy }}>editar su Nombre, Carnet, Departamento, asignar su Estado/Zona/País, Vehículo o Plantas</Text>.
                  </Text>
                </View>

                {/* Table Header (Desktop — Columnas Exactas Referencia "Transacción") */}
                {!isMobile && (
                  <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopWidth: 0, borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tableHeadCell, { flex: 1, color: textOnSurface, fontFamily: F.bold }]}>Nombre</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1, color: textOnSurface, fontFamily: F.bold }]}>Apellido</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.9, color: textOnSurface, fontFamily: F.bold }]}>ID ⇅</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.5, color: textOnSurface, fontFamily: F.bold }]}>Departamento ⇅</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.1, color: textOnSurface, fontFamily: F.bold }]}>Rol</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.6, color: textOnSurface, fontFamily: F.bold }]}>Nombre del dispositivo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>N.º de serie del dispositivo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>Vehículo Flota</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3, color: textOnSurface, fontFamily: F.bold }]}>Ubicación</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.1, color: textOnSurface, fontFamily: F.bold }]}>Observaciones</Text>
                    <Text style={[styles.tableHeadCell, { width: 120, textAlign: 'right', color: textOnSurface, fontFamily: F.bold }]}>Acciones</Text>
                  </View>
                )}

                {/* Personnel Rows (Click on any row to edit employee data, state, plants & vehicle!) */}
                <View>
                  {filteredPersonnelList.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center' }}>
                      <MaterialIcons name="engineering" size={38} color={textOutline} />
                      <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                        No se encontró personal operador con los filtros seleccionados
                      </Text>
                    </View>
                  ) : (
                    filteredPersonnelList.map((op: any, idx: number) => {
                      const assignedPlants = allPlants.filter(
                        (p) =>
                          p.assignedOperatorId === op.id ||
                          (p.assignedOperatorName &&
                            op.full_name &&
                            p.assignedOperatorName.toLowerCase().trim() === op.full_name.toLowerCase().trim())
                      );

                      const isSuper = op.resolvedRole === 'superadmin';
                      const primaryPlant = assignedPlants[0];
                      const deviceName = isSuper
                        ? 'CONTROL GLOBAL HL'
                        : primaryPlant
                        ? `${primaryPlant.brand} ${primaryPlant.model} (${primaryPlant.powerKva || 0} kVA)`
                        : '--';
                      const deviceSerial = primaryPlant
                        ? primaryPlant.serialNumber || primaryPlant.plate || '--'
                        : '--';

                      return (
                        <TouchableOpacity
                          key={op.id}
                          onPress={() => setAssigningOperator(op)}
                          activeOpacity={0.75}
                          style={[
                            styles.tableDataRow,
                            {
                              backgroundColor: cardLowest,
                              borderBottomColor: cardBorder,
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              paddingHorizontal: isMobile ? 14 : 20,
                              paddingVertical: 12,
                            },
                          ]}
                        >
                          {/* Col 1: Nombre */}
                          <View style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              {op.firstName}
                            </Text>
                          </View>

                          {/* Col 2: Apellido */}
                          <View style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              {op.lastName}
                            </Text>
                          </View>

                          {/* Col 3: ID / Carnet */}
                          <View style={{ flex: 0.9, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }} numberOfLines={1}>
                              {op.operator_code || `#${idx + 1}`}
                            </Text>
                          </View>

                          {/* Col 4: Departamento */}
                          <View style={{ flex: 1.5, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }} numberOfLines={1}>
                              {op.deptLabel.toUpperCase()}
                            </Text>
                          </View>

                          {/* Col 5: Rol */}
                          <View style={{ flex: 1.1, width: isMobile ? '100%' : undefined }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: isSuper ? secondaryFixed : 'rgba(37, 99, 235, 0.14)',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 99,
                              }}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 10, color: isSuper ? onSecondaryFixed : '#2563eb' }}>
                                {isSuper ? 'SUPER ADMIN' : 'OPERADOR'}
                              </Text>
                            </View>
                          </View>

                          {/* Col 6: Nombre del dispositivo */}
                          <View style={{ flex: 1.6, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: primaryPlant ? primaryNavy : textVariant }} numberOfLines={1}>
                              {deviceName}
                              {assignedPlants.length > 1 ? ` (+${assignedPlants.length - 1})` : ''}
                            </Text>
                          </View>

                          {/* Col 7: N.º de serie del dispositivo */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }} numberOfLines={1}>
                              {deviceSerial}
                            </Text>
                          </View>

                          {/* Col 8: Vehículo Flota */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: op.assigned_vehicle_name ? textOnSurface : textOutline }} numberOfLines={1}>
                              {op.assigned_vehicle_name ? `${op.assigned_vehicle_name} (${op.assigned_vehicle_plate || ''})` : '--'}
                            </Text>
                          </View>

                          {/* Col 9: Ubicación (Estado / Zona / País) */}
                          <View style={{ flex: 1.3, width: isMobile ? '100%' : undefined }}>
                            <Text
                              style={{
                                fontFamily: F.semibold,
                                fontSize: 12,
                                color: op.geoState === 'Sin Estado en BD' ? '#f59e0b' : textOnSurface,
                              }}
                              numberOfLines={1}
                            >
                              {op.geoState === 'Sin Estado en BD' ? '+ Asignar Estado' : op.geoState}
                            </Text>
                            {op.geoZone !== 'Sin Zona en BD' && (
                              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: textVariant }} numberOfLines={1}>
                                {op.geoZone} · {op.geoCountry}
                              </Text>
                            )}
                          </View>

                          {/* Col 10: Observaciones / Contacto */}
                          <View style={{ flex: 1.1, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }} numberOfLines={1}>
                              {op.observations || op.email || '--'}
                            </Text>
                          </View>

                          {/* Col 11: Acciones */}
                          <View style={{ width: isMobile ? '100%' : 120, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                            {op.phone ? (
                              <TouchableOpacity
                                onPress={() => {
                                  const rawDigits = String(op.phone).replace(/\D/g, '');
                                  const phone = rawDigits.startsWith('58') ? rawDigits : '58' + rawDigits.replace(/^0/, '');
                                  Linking.openURL('https://wa.me/' + phone).catch(() => {});
                                }}
                                style={[styles.tableActionIconBtn, { backgroundColor: 'rgba(37, 211, 102, 0.14)', width: 30, height: 30 }]}
                              >
                                <MaterialCommunityIcons name="whatsapp" size={16} color="#16a34a" />
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              onPress={() => setAssigningOperator(op)}
                              style={[
                                styles.toolbarSecondaryBtn,
                                { backgroundColor: surfaceLow, borderColor: cardBorder, paddingHorizontal: 9, paddingVertical: 5 },
                              ]}
                            >
                              <MaterialIcons name="edit" size={14} color={primaryNavy} />
                              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: primaryNavy }}>Editar</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Bottom Pagination Bar (Referencia "Transacción") */}
                <View style={[styles.tableCardFooter, { backgroundColor: cardLowest, borderTopColor: cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: surfaceLow,
                      }}
                    >
                      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }}>20</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={16} color={textVariant} />
                    </View>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                      Mostrando {filteredPersonnelList.length} de {allPersonnelList.length} integrantes ({(operatorsList || []).length} Operadores · {(superAdminsList || []).length} Super Admins)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <MaterialIcons name="chevron-left" size={20} color={textOutline} />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>1</Text>
                    <MaterialIcons name="chevron-right" size={20} color={textOutline} />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* PESTAÑA 4: USUARIOS Y CLIENTES (Estilo "Transacción")                 */}
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

              {/* Main Users & Clients Table — Estilo "Transacción" */}
              <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                {/* Top Action Bar */}
                <View style={[styles.tableCardHeader, { borderBottomWidth: 1, borderBottomColor: cardBorder, paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 18, color: primaryNavy }}>
                      Directorio de Usuarios y Clientes ({filteredUsersList.length})
                    </Text>
                    <TouchableOpacity
                      onPress={onOpenReport}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: surfaceLow,
                        borderWidth: 1,
                        borderColor: cardBorder,
                      }}
                    >
                      <MaterialIcons name="file-download" size={16} color={primaryNavy} />
                      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: primaryNavy }}>Exportar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setCreateOperatorVisible(true)}
                      style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 8 }]}
                    >
                      <MaterialIcons name="person-add" size={16} color="#ffc250" />
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>
                        Crear Cuenta de Usuario
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowFilterBar((prev) => !prev)}
                      style={[styles.tableActionIconBtn, { backgroundColor: showFilterBar ? 'rgba(255, 91, 87, 0.14)' : surfaceLow }]}
                    >
                      <MaterialIcons name="filter-alt" size={18} color={showFilterBar ? '#ff5b57' : textVariant} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => loadSystemUsers()}
                      style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                    >
                      <MaterialIcons name="refresh" size={18} color={textVariant} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Horizontal Multi-Field Filter Bar (Referencia "Transacción") */}
                {showFilterBar && (
                  <View
                    style={{
                      paddingHorizontal: isMobile ? 14 : 20,
                      paddingVertical: 16,
                      backgroundColor: surfaceLow,
                      borderBottomWidth: 1,
                      borderBottomColor: cardBorder,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      gap: 12,
                    }}
                  >
                    {/* Field 1: Nombre completo */}
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : 180 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Nombre completo / Correo
                      </Text>
                      <TextInput
                        value={userSearch}
                        onChangeText={setUserSearch}
                        placeholder="Introduzca la palabra clave."
                        placeholderTextColor={textOutline}
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          fontFamily: F.medium,
                          fontSize: 12,
                          color: textOnSurface,
                        }}
                      />
                    </View>

                    {/* Field 2: ID / Teléfono */}
                    <View style={{ flex: 1, minWidth: isMobile ? '100%' : 155 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        ID / Teléfono
                      </Text>
                      <TextInput
                        value={userIdSearch}
                        onChangeText={setUserIdSearch}
                        placeholder="Introduzca la palabra clave."
                        placeholderTextColor={textOutline}
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          fontFamily: F.medium,
                          fontSize: 12,
                          color: textOnSurface,
                        }}
                      />
                    </View>

                    {/* Field 3: Estado de Cuenta Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 170 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Estado de Cuenta
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Filtrar por Estado de Cuenta',
                            options: ['Todos los Usuarios', 'Usuarios Activos', 'Solicitudes Pendientes'],
                            selected: userStatusFilter,
                            onSelect: (val) => setUserStatusFilter(val as any),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: userStatusFilter === 'Todos los Usuarios' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {userStatusFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 4: Ubicación (Estado) Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 170 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Ubicación (Estado)
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Filtrar Usuarios por Estado / Sede',
                            options: STATES_LIST,
                            selected: userStateFilter,
                            onSelect: (val) => setUserStateFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: userStateFilter === 'Todos' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {userStateFilter === 'Todos' ? 'Por favor, seleccione.' : userStateFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Field 5: Zona / País Dropdown */}
                    <View style={{ flex: 1, minWidth: isMobile ? '47%' : 160 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant, marginBottom: 6 }}>
                        Zona / País
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setDropdownConfig({
                            title: 'Seleccionar Zona Geográfica',
                            options: ZONES_LIST,
                            selected: userZoneFilter,
                            onSelect: (val) => setUserZoneFilter(val),
                          })
                        }
                        style={{
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: cardBorder,
                          backgroundColor: cardLowest,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.medium,
                            fontSize: 12,
                            color: userZoneFilter === 'Todas' ? textOutline : textOnSurface,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {userZoneFilter === 'Todas' ? 'Por favor, seleccione.' : userZoneFilter}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={18} color={textVariant} />
                      </TouchableOpacity>
                    </View>

                    {/* Botones Filtro y Restablecer */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {}}
                        activeOpacity={0.85}
                        style={{
                          height: 38,
                          paddingHorizontal: 20,
                          borderRadius: 19,
                          backgroundColor: '#ff5b57',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>Filtro</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setUserSearch('');
                          setUserIdSearch('');
                          setUserStatusFilter('Todos los Usuarios');
                          setUserStateFilter('Todos');
                          setUserZoneFilter('Todas');
                          setUserCountryFilter('Todos');
                        }}
                        activeOpacity={0.85}
                        style={{
                          height: 38,
                          paddingHorizontal: 16,
                          borderRadius: 19,
                          backgroundColor: cardLowest,
                          borderWidth: 1,
                          borderColor: textOnSurface,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }}>Restablecer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Hint Banner */}
                <View style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.08)' : '#f8fafc', borderBottomWidth: 1, borderBottomColor: cardBorder, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="touch-app" size={15} color={academicGold} />
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    Haz clic sobre cualquier fila de usuario para <Text style={{ fontFamily: F.bold, color: primaryNavy }}>editar su ficha, asignar Estado/Ubicación o cambiar su nivel de acceso</Text>.
                  </Text>
                </View>

                {/* Users Table Header (Desktop — Columnas Exactas Referencia "Transacción") */}
                {!isMobile && (
                  <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopWidth: 0, borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tableHeadCell, { flex: 1, color: textOnSurface, fontFamily: F.bold }]}>Nombre</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1, color: textOnSurface, fontFamily: F.bold }]}>Apellido</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.9, color: textOnSurface, fontFamily: F.bold }]}>ID ⇅</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.7, color: textOnSurface, fontFamily: F.bold }]}>Correo Electrónico</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>Estado de Cuenta</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.6, color: textOnSurface, fontFamily: F.bold }]}>Nombre del dispositivo</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>N.º de serie</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3, color: textOnSurface, fontFamily: F.bold }]}>Ubicación</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, color: textOnSurface, fontFamily: F.bold }]}>Observaciones / Tel.</Text>
                    <Text style={[styles.tableHeadCell, { width: 160, textAlign: 'right', color: textOnSurface, fontFamily: F.bold }]}>Acciones</Text>
                  </View>
                )}

                {/* Users Rows (Clickable to edit!) */}
                <View>
                  {filteredUsersList.length === 0 ? (
                    <View style={{ padding: 36, alignItems: 'center' }}>
                      <MaterialIcons name="groups" size={38} color={textOutline} />
                      <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                        No hay usuarios o clientes registrados en este filtro
                      </Text>
                    </View>
                  ) : (
                    filteredUsersList.map((u: any, idx: number) => {
                      const clientPlants = allPlants.filter((p) => (p as any).user_id === u.id || (p as any).userId === u.id);
                      const primaryPlant = clientPlants[0];

                      return (
                        <TouchableOpacity
                          key={u.id}
                          onPress={() => setAssigningOperator(u)}
                          activeOpacity={0.75}
                          style={[
                            styles.tableDataRow,
                            {
                              backgroundColor: cardLowest,
                              borderBottomColor: cardBorder,
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'flex-start' : 'center',
                              paddingHorizontal: isMobile ? 14 : 20,
                              paddingVertical: 12,
                            },
                          ]}
                        >
                          {/* Nombre */}
                          <View style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              {u.firstName}
                            </Text>
                          </View>

                          {/* Apellido */}
                          <View style={{ flex: 1, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                              {u.lastName}
                            </Text>
                          </View>

                          {/* ID */}
                          <View style={{ flex: 0.9, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }} numberOfLines={1}>
                              {u.operator_code || `#${idx + 1}`}
                            </Text>
                          </View>

                          {/* Correo */}
                          <View style={{ flex: 1.7, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textOnSurface }} numberOfLines={1}>
                              {u.email || '--'}
                            </Text>
                          </View>

                          {/* Estado de Cuenta */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: u.isPending ? 'rgba(239, 68, 68, 0.14)' : 'rgba(22, 163, 74, 0.14)',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 99,
                              }}
                            >
                              <Text style={{ fontFamily: F.bold, fontSize: 10, color: u.isPending ? '#ef4444' : '#16a34a' }}>
                                {u.isPending ? 'PENDIENTE' : 'ACTIVO'}
                              </Text>
                            </View>
                          </View>

                          {/* Nombre del dispositivo */}
                          <View style={{ flex: 1.6, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: primaryPlant ? primaryNavy : textVariant }} numberOfLines={1}>
                              {primaryPlant ? `${primaryPlant.brand} ${primaryPlant.model}` : '--'}
                            </Text>
                          </View>

                          {/* N.º de serie */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }} numberOfLines={1}>
                              {primaryPlant ? primaryPlant.serialNumber || primaryPlant.plate || '--' : '--'}
                            </Text>
                          </View>

                          {/* Ubicación */}
                          <View style={{ flex: 1.3, width: isMobile ? '100%' : undefined }}>
                            <Text
                              style={{
                                fontFamily: F.semibold,
                                fontSize: 12,
                                color: u.geoState === 'Sin Estado en BD' ? '#f59e0b' : textOnSurface,
                              }}
                              numberOfLines={1}
                            >
                              {u.geoState === 'Sin Estado en BD' ? '+ Asignar Estado' : u.geoState}
                            </Text>
                            {u.geoZone !== 'Sin Zona en BD' && (
                              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: textVariant }} numberOfLines={1}>
                                {u.geoZone} · {u.geoCountry}
                              </Text>
                            )}
                          </View>

                          {/* Teléfono / Observaciones */}
                          <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: u.phone ? textOnSurface : textOutline }} numberOfLines={1}>
                              {u.phone || u.observations || '--'}
                            </Text>
                          </View>

                          {/* Acciones */}
                          <View style={{ width: isMobile ? '100%' : 160, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                            {u.isPending && (
                              <>
                                <TouchableOpacity
                                  onPress={() => approveUser(u.id)}
                                  style={{ backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}
                                >
                                  <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: '#ffffff' }}>Aprobar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => rejectUser(u.id)}
                                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.14)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}
                                >
                                  <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: '#ef4444' }}>Rechazar</Text>
                                </TouchableOpacity>
                              </>
                            )}
                            <TouchableOpacity
                              onPress={() => setAssigningOperator(u)}
                              style={[
                                styles.toolbarSecondaryBtn,
                                { backgroundColor: surfaceLow, borderColor: cardBorder, paddingHorizontal: 9, paddingVertical: 5 },
                              ]}
                            >
                              <MaterialIcons name="edit" size={14} color={primaryNavy} />
                              <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: primaryNavy }}>Editar</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Bottom Pagination Bar (Referencia "Transacción") */}
                <View style={[styles.tableCardFooter, { backgroundColor: cardLowest, borderTopColor: cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: cardBorder,
                        backgroundColor: surfaceLow,
                      }}
                    >
                      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textOnSurface }}>20</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={16} color={textVariant} />
                    </View>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                      Mostrando {filteredUsersList.length} de {allUsersAndClientsList.length} cuentas ({(clientsList || []).length} Activos · {(pendingUsersList || []).length} Pendientes)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <MaterialIcons name="chevron-left" size={20} color={textOutline} />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>1</Text>
                    <MaterialIcons name="chevron-right" size={20} color={textOutline} />
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* PERSISTENT SUB-TABS CONTAINER (History, Wallet, Profile) */}
        <View style={[{ flex: 1, width: '100%' }, activeTab === 'moto' && { display: 'none' }]}>
          {children}
        </View>

        {/* MOBILE FIXED BOTTOM NAVIGATION BAR (Responsive Phone UX for Super Admin) */}
        {isMobile && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              backgroundColor: cardLowest,
              borderTopWidth: 1,
              borderTopColor: cardBorder,
              paddingVertical: 8,
              paddingHorizontal: 6,
            }}
          >
            {[
              {
                id: 'mob_overview',
                label: 'Resumen',
                icon: 'dashboard',
                active: activeTab === 'moto' && perspectiveTab === 'overview',
                action: () => goToPerspective('overview'),
              },
              {
                id: 'mob_plants',
                label: 'Plantas',
                icon: 'bolt',
                active: activeTab === 'moto' && perspectiveTab === 'plants',
                action: () => goToPerspective('plants'),
              },
              {
                id: 'mob_personnel',
                label: 'Personal',
                icon: 'engineering',
                active: activeTab === 'moto' && perspectiveTab === 'personnel',
                action: () => goToPerspective('personnel'),
              },
              {
                id: 'mob_users',
                label: 'Usuarios',
                icon: 'groups',
                active: activeTab === 'moto' && perspectiveTab === 'users',
                action: () => goToPerspective('users'),
              },
              {
                id: 'mob_profile',
                label: 'Perfil',
                icon: 'person',
                active: activeTab === 'profile',
                action: () => onSelectTab('profile'),
              },
            ].map((nav) => (
              <TouchableOpacity
                key={nav.id}
                onPress={nav.action}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: nav.active ? surfaceLow : 'transparent',
                }}
              >
                <MaterialIcons
                  name={nav.icon as any}
                  size={20}
                  color={nav.active ? primaryNavy : textVariant}
                />
                <Text
                  style={{
                    fontFamily: nav.active ? F.bold : F.medium,
                    fontSize: 10.5,
                    color: nav.active ? primaryNavy : textVariant,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {nav.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

      {/* DROPDOWN SELECTOR MODAL ("Por favor, seleccione. v") */}
      {dropdownConfig && (
        <Modal
          visible={!!dropdownConfig}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownConfig(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setDropdownConfig(null)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                maxHeight: '75%',
                backgroundColor: cardLowest,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: cardBorder,
                  backgroundColor: surfaceLow,
                }}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: primaryNavy }}>
                  {dropdownConfig.title}
                </Text>
                <TouchableOpacity onPress={() => setDropdownConfig(null)}>
                  <MaterialIcons name="close" size={20} color={textVariant} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 10 }}>
                {dropdownConfig.options.map((opt) => {
                  const isSelected = dropdownConfig.selected === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => {
                        dropdownConfig.onSelect(opt);
                        setDropdownConfig(null);
                      }}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: isSelected ? 'rgba(26, 54, 93, 0.1)' : 'transparent',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isSelected ? F.bold : F.medium,
                          fontSize: 13.5,
                          color: isSelected ? primaryNavy : textOnSurface,
                        }}
                      >
                        {opt === 'ALL' ? 'Todos (Ver todos los registros)' : opt}
                      </Text>
                      {isSelected && <MaterialIcons name="check-circle" size={18} color={primaryContainer} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* PLANT QUICK EDITOR MODAL (Click on any Plant Row in Tab 2) */}
      {editingPlant && (
        <Modal
          visible={!!editingPlant}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingPlant(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 540,
                maxHeight: '90%',
                backgroundColor: cardLowest,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: cardBorder,
                  backgroundColor: surfaceLow,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: primaryContainer,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="generator-portable" size={20} color={academicGold} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: F.extrabold, fontSize: 15, color: primaryNavy }}>
                      Editar Planta Eléctrica y Estado
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                      Actualización directa en Base de Datos
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEditingPlant(null)}>
                  <MaterialIcons name="close" size={22} color={textVariant} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, marginBottom: 4 }}>
                      MARCA
                    </Text>
                    <TextInput
                      value={editPlantBrand}
                      onChangeText={setEditPlantBrand}
                      placeholder="Ej. Cummins / Perkins"
                      placeholderTextColor={textVariant}
                      style={{
                        borderWidth: 1,
                        borderColor: cardBorder,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontFamily: F.medium,
                        fontSize: 13,
                        color: textOnSurface,
                        backgroundColor: surfaceLow,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, marginBottom: 4 }}>
                      MODELO DEL EQUIPO
                    </Text>
                    <TextInput
                      value={editPlantModel}
                      onChangeText={setEditPlantModel}
                      placeholder="Ej. C150D6"
                      placeholderTextColor={textVariant}
                      style={{
                        borderWidth: 1,
                        borderColor: cardBorder,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontFamily: F.medium,
                        fontSize: 13,
                        color: textOnSurface,
                        backgroundColor: surfaceLow,
                      }}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, marginBottom: 4 }}>
                      N.º DE SERIE / ID
                    </Text>
                    <TextInput
                      value={editPlantSerial}
                      onChangeText={setEditPlantSerial}
                      placeholder="Ej. SN-88291"
                      placeholderTextColor={textVariant}
                      style={{
                        borderWidth: 1,
                        borderColor: cardBorder,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontFamily: F.bold,
                        fontSize: 13,
                        color: primaryNavy,
                        backgroundColor: surfaceLow,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, marginBottom: 4 }}>
                      CAPACIDAD (kVA)
                    </Text>
                    <TextInput
                      value={editPlantKva}
                      onChangeText={setEditPlantKva}
                      keyboardType="numeric"
                      placeholder="Ej. 150"
                      placeholderTextColor={textVariant}
                      style={{
                        borderWidth: 1,
                        borderColor: cardBorder,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontFamily: F.bold,
                        fontSize: 13,
                        color: textOnSurface,
                        backgroundColor: surfaceLow,
                      }}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, marginBottom: 4 }}>
                    ASIGNACIÓN DE ESTADO / UBICACIÓN SEDE
                  </Text>
                  <TextInput
                    value={editPlantLocation}
                    onChangeText={setEditPlantLocation}
                    placeholder="Ej. Carabobo - Valencia"
                    placeholderTextColor={textVariant}
                    style={{
                      borderWidth: 1,
                      borderColor: cardBorder,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontFamily: F.medium,
                      fontSize: 13,
                      color: textOnSurface,
                      backgroundColor: surfaceLow,
                    }}
                  />
                  <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textVariant, marginTop: 8, marginBottom: 6 }}>
                    SELECCIÓN RÁPIDA DE ESTADO (1 CLIC):
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      'Carabobo',
                      'Distrito Capital',
                      'Miranda',
                      'Aragua',
                      'Zulia',
                      'Lara',
                      'Anzoátegui',
                      'Táchira',
                      'Bolívar',
                    ].map((st) => {
                      const active = editPlantLocation.toLowerCase().includes(st.toLowerCase());
                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => setEditPlantLocation(st)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 99,
                            borderWidth: 1,
                            borderColor: active ? primaryContainer : cardBorder,
                            backgroundColor: active ? primaryContainer : surfaceLow,
                          }}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: active ? '#fff' : textOnSurface }}>
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: textVariant, marginBottom: 6 }}>
                    OPERADOR RESPONSABLE ASIGNADO
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setEditPlantOperatorId(null)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: !editPlantOperatorId ? '#10b981' : cardBorder,
                        backgroundColor: !editPlantOperatorId ? 'rgba(16, 185, 129, 0.14)' : surfaceLow,
                      }}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: !editPlantOperatorId ? '#10b981' : textVariant }}>
                        Disponible (Sin asignar)
                      </Text>
                    </TouchableOpacity>
                    {operatorsList.map((op: any) => {
                      const active = editPlantOperatorId === op.id;
                      return (
                        <TouchableOpacity
                          key={op.id}
                          onPress={() => setEditPlantOperatorId(op.id)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: active ? primaryContainer : cardBorder,
                            backgroundColor: active ? primaryContainer : surfaceLow,
                          }}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: active ? '#fff' : textOnSurface }}>
                            {op.full_name || op.email}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: cardBorder,
                  backgroundColor: surfaceLow,
                }}
              >
                <TouchableOpacity
                  onPress={() => setEditingPlant(null)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: cardBorder,
                    backgroundColor: cardLowest,
                  }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textVariant }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSavePlantEdit}
                  disabled={savingPlantEdit}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#ff5b57',
                  }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#ffffff' }}>
                    {savingPlantEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
