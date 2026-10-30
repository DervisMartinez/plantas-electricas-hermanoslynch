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
import { getMotoSpecs } from '../../../data/specs';
import { VEHICLE_CATALOG } from '../../../data/catalog';
import { ComponentType } from '../../../constants/telemetry';
import { UserManagementModal } from '../UserManagementModal';
import { OperatorAgendaModal } from '../OperatorAgendaModal';

// Brand Assets
const HL_LOGO_REQUIRE = require('../../../../assets/images/logo and media coorporative/logo-sin-nombre.png');
const PLANTA_IMG_REQUIRE = require('../../../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png');

interface BentoDashboardViewProps {
  activeTab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile';
  onSelectTab: (tab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile') => void;
  onOpenQuickHours: () => void;
  onOpenQuickFuel: () => void;
  onOpenSpecs: () => void;
  onOpenStats: () => void;
  onOpenReport: () => void;
  onOpenServicesTab: (comp?: ComponentType) => void;
  children?: React.ReactNode;
}

// Subsystem thematic metadata for squircle thumbnails
const SUBSYSTEM_META: Record<string, { icon: any; bg: string; color: string; desc: string }> = {
  oil: { icon: 'oil', bg: 'rgba(26, 54, 93, 0.14)', color: '#1A365D', desc: 'Ciclo 250 hrs · Aceite 15W-40 CI-4' },
  fuel_filter: { icon: 'filter-variant', bg: 'rgba(107, 70, 193, 0.14)', color: '#6B46C1', desc: 'Ciclo 250 hrs · Primario Racor & Secundario' },
  air_filter: { icon: 'air-filter', bg: 'rgba(214, 158, 46, 0.16)', color: '#D69E2E', desc: 'Ciclo 500 hrs · Cartucho Industrial Seco' },
  coolant: { icon: 'radiator', bg: 'rgba(16, 185, 129, 0.14)', color: '#10b981', desc: 'Ciclo 1,000 hrs · Refrigerante Glicol 50/50' },
  battery: { icon: 'battery-charging-100', bg: 'rgba(2, 132, 199, 0.14)', color: '#0284c7', desc: 'Ciclo 2,000 hrs · Banco Baterías 24V' },
  accessory_belt: { icon: 'cogs', bg: 'rgba(236, 72, 153, 0.14)', color: '#ec4899', desc: 'Ciclo 1,000 hrs · Correas Poli-V Ventilador' },
  timing_belt: { icon: 'engine', bg: 'rgba(99, 102, 241, 0.14)', color: '#6366f1', desc: 'Ciclo 1,500 hrs · Calibración Balancines e Inyectores' },
  clutch: { icon: 'shield-car', bg: 'rgba(20, 184, 166, 0.14)', color: '#14b8a6', desc: 'Ciclo 3,000 hrs · Aisladores Antivibración' },
  transmission_fluid: { icon: 'generator-portable', bg: 'rgba(249, 115, 22, 0.14)', color: '#f97316', desc: 'Ciclo 2,500 hrs · Bobinado Estator & Megado' },
  cabin_filter: { icon: 'gauge', bg: 'rgba(6, 182, 212, 0.14)', color: '#06b6d4', desc: 'Ciclo 1,200 hrs · Panel ComAp & Sensores' },
};

// Real Data SVG Bar Chart plotting actual registered plants (Power kVA & Operating Hours)
const RealFleetBarChart: React.FC<{
  plants: Moto[];
  isDark: boolean;
  primaryColor: string;
  goldColor: string;
  textSecondary: string;
}> = ({ plants, isDark, primaryColor, goldColor, textSecondary }) => {
  const displayPlants = plants.slice(0, 7);
  const maxVal = useMemo(() => {
    if (displayPlants.length === 0) return 100;
    let m = 0;
    displayPlants.forEach((p) => {
      const kva = p.powerKva || 0;
      const hrs = p.currentHours || p.currentOdometer || 0;
      if (kva > m) m = kva;
      if (hrs > m) m = hrs;
    });
    return m > 0 ? Math.ceil(m * 1.15) : 100;
  }, [displayPlants]);

  if (Platform.OS === 'web') {
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
    const baseLineColor = isDark ? 'rgba(255,255,255,0.16)' : '#cbd5e1';
    const labelFill = isDark ? '#94a3b8' : '#64748b';
    const count = Math.max(displayPlants.length, 1);
    const slotWidth = 680 / count;

    return React.createElement(
      'svg',
      {
        viewBox: '0 0 760 220',
        width: '100%',
        height: '190',
        style: { overflow: 'visible' },
      },
      React.createElement(
        'defs',
        null,
        React.createElement(
          'linearGradient',
          { id: 'barGradPrimary', x1: '0', y1: '0', x2: '0', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: isDark ? '#2563eb' : '#002045', stopOpacity: '0.95' }),
          React.createElement('stop', { offset: '100%', stopColor: isDark ? '#1d4ed8' : '#1a365d', stopOpacity: '0.75' })
        ),
        React.createElement(
          'linearGradient',
          { id: 'barGradGold', x1: '0', y1: '0', x2: '0', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: '#ffc250', stopOpacity: '0.95' }),
          React.createElement('stop', { offset: '100%', stopColor: '#d69e2e', stopOpacity: '0.78' })
        )
      ),
      // Horizontal Gridlines
      React.createElement('line', { x1: '45', x2: '750', y1: '30', y2: '30', stroke: gridColor, strokeDasharray: '4 4', strokeWidth: '1' }),
      React.createElement('line', { x1: '45', x2: '750', y1: '80', y2: '80', stroke: gridColor, strokeDasharray: '4 4', strokeWidth: '1' }),
      React.createElement('line', { x1: '45', x2: '750', y1: '130', y2: '130', stroke: gridColor, strokeDasharray: '4 4', strokeWidth: '1' }),
      React.createElement('line', { x1: '45', x2: '750', y1: '180', y2: '180', stroke: baseLineColor, strokeWidth: '1' }),
      // Y-Axis Ticks (Real Scale)
      React.createElement('text', { x: '0', y: '34', fill: labelFill, fontSize: '10', fontFamily: 'Montserrat, sans-serif' }, String(maxVal)),
      React.createElement('text', { x: '0', y: '84', fill: labelFill, fontSize: '10', fontFamily: 'Montserrat, sans-serif' }, String(Math.round(maxVal * 0.66))),
      React.createElement('text', { x: '0', y: '134', fill: labelFill, fontSize: '10', fontFamily: 'Montserrat, sans-serif' }, String(Math.round(maxVal * 0.33))),
      React.createElement('text', { x: '0', y: '180', fill: labelFill, fontSize: '10', fontFamily: 'Montserrat, sans-serif' }, '0'),
      // Bars per Real Plant
      ...displayPlants.map((plant, idx) => {
        const kva = plant.powerKva || 0;
        const hrs = plant.currentHours || plant.currentOdometer || 0;
        const kvaHeight = Math.max(4, Math.min(150, Math.round((kva / maxVal) * 150)));
        const hrsHeight = Math.max(4, Math.min(150, Math.round((hrs / maxVal) * 150)));
        const centerX = 65 + idx * slotWidth + slotWidth * 0.35;
        const label = `${plant.model} (${kva}kVA)`;

        return React.createElement(
          'g',
          { key: plant.id },
          React.createElement('rect', {
            x: String(centerX - 24),
            y: String(180 - kvaHeight),
            width: '22',
            height: String(kvaHeight),
            rx: '4',
            fill: 'url(#barGradPrimary)',
          }),
          React.createElement('text', {
            x: String(centerX - 13),
            y: String(175 - kvaHeight),
            fill: labelFill,
            fontSize: '9',
            textAnchor: 'middle',
            fontWeight: 'bold',
          }, `${kva}`),
          React.createElement('rect', {
            x: String(centerX + 2),
            y: String(180 - hrsHeight),
            width: '22',
            height: String(hrsHeight),
            rx: '4',
            fill: 'url(#barGradGold)',
          }),
          React.createElement('text', {
            x: String(centerX + 13),
            y: String(175 - hrsHeight),
            fill: '#d69e2e',
            fontSize: '9',
            textAnchor: 'middle',
            fontWeight: 'bold',
          }, `${hrs}h`),
          React.createElement('text', {
            x: String(centerX),
            y: '202',
            fill: labelFill,
            fontSize: '11',
            fontWeight: '600',
            textAnchor: 'middle',
            fontFamily: 'Montserrat, sans-serif',
          }, label)
        );
      })
    );
  }

  return (
    <View style={{ height: 150, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 12 }}>
      {displayPlants.map((plant) => {
        const kva = plant.powerKva || 0;
        const hrs = plant.currentHours || plant.currentOdometer || 0;
        const kvaH = Math.max(8, Math.round((kva / maxVal) * 110));
        const hrsH = Math.max(8, Math.round((hrs / maxVal) * 110));
        return (
          <View key={plant.id} style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <View style={{ width: 14, height: kvaH, backgroundColor: primaryColor, borderRadius: 4 }} />
              <View style={{ width: 14, height: hrsH, backgroundColor: goldColor, borderRadius: 4 }} />
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

// Real Percentage Donut Ring matching template's "Acreditación en Puerta" ring
const RealDonutRing: React.FC<{ percent: number; primaryColor: string; trackColor: string; textColor: string }> = ({
  percent,
  primaryColor,
  trackColor,
  textColor,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (Platform.OS === 'web') {
    return (
      <View style={{ width: 64, height: 64, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {React.createElement(
          'svg',
          { viewBox: '0 0 36 36', width: 64, height: 64, style: { transform: 'rotate(-90deg)' } },
          React.createElement('path', {
            d: 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831',
            fill: 'none',
            stroke: trackColor,
            strokeWidth: '4',
          }),
          React.createElement('path', {
            d: 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831',
            fill: 'none',
            stroke: primaryColor,
            strokeWidth: '4',
            strokeDasharray: `${clamped}, 100`,
            strokeLinecap: 'round',
          })
        )}
        <Text style={{ position: 'absolute', fontFamily: 'Montserrat_700Bold', fontSize: 12, color: textColor }}>
          {clamped}%
        </Text>
      </View>
    );
  }
  return (
    <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: primaryColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Montserrat_700Bold', fontSize: 12, color: textColor }}>{clamped}%</Text>
    </View>
  );
};

export const BentoDashboardView: React.FC<BentoDashboardViewProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickHours,
  onOpenQuickFuel,
  onOpenSpecs,
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
    systemMetrics,
    loadSystemUsers,
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

  // Pulsing animation for live indicators
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

  const [searchQuery, setSearchQuery] = useState('');
  const [plantTableSearch, setPlantTableSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMgmtVisible, setUserMgmtVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [subsystemFilter, setSubsystemFilter] = useState<'TODOS' | 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO'>('TODOS');
  const [perspectiveTab, setPerspectiveTab] = useState<'all' | 'plants' | 'users' | 'subsystems'>('all');

  // 100% Real Plants & Vehicles from Database
  const allPlants = useMemo(() => (motos || []).filter(isPlanta), [motos]);
  const allFleetCars = useMemo(() => (motos || []).filter((m) => isCar(m) || m.vehicleType === 'car'), [motos]);

  // 100% Real Users from Database
  const allCombinedUsers = useMemo(() => {
    const map = new Map<string, any>();
    (superAdminsList || []).forEach((u: any) => map.set(u.id, { ...u, resolvedRole: 'superadmin' }));
    (operatorsList || []).forEach((u: any) => {
      if (!map.has(u.id)) map.set(u.id, { ...u, resolvedRole: 'operator' });
    });
    (clientsList || []).forEach((u: any) => {
      if (!map.has(u.id)) map.set(u.id, { ...u, resolvedRole: 'client' });
    });
    (pendingUsersList || []).forEach((u: any) => {
      if (!map.has(u.id)) map.set(u.id, { ...u, resolvedRole: u.role || 'operator', isPending: true });
    });
    return Array.from(map.values());
  }, [superAdminsList, operatorsList, clientsList, pendingUsersList]);

  // Classification Filters (100% derived from real data + standard categories)
  const [plantCategoryFilter, setPlantCategoryFilter] = useState('Todas');
  const [plantLocationFilter, setPlantLocationFilter] = useState('Todas');

  const uniquePlantLocations = useMemo(() => {
    const locs = new Set<string>(['Todas']);
    allPlants.forEach((p) => {
      if (p.location && p.location.trim()) {
        locs.add(p.location.trim());
      }
    });
    return Array.from(locs);
  }, [allPlants]);

  const PLANT_CATEGORIES = [
    'Todas',
    'Alta Capacidad (≥100 kVA)',
    'Media Capacidad (50-99 kVA)',
    'Compactas (<50 kVA)',
  ];

  const filteredFleetPlants = useMemo(() => {
    return allPlants.filter((plant) => {
      const kva = plant.powerKva || 0;
      const cat =
        kva >= 100
          ? 'Alta Capacidad (≥100 kVA)'
          : kva >= 50
          ? 'Media Capacidad (50-99 kVA)'
          : 'Compactas (<50 kVA)';

      if (plantCategoryFilter !== 'Todas' && cat !== plantCategoryFilter) return false;
      if (plantLocationFilter !== 'Todas' && (plant.location || '').trim() !== plantLocationFilter) return false;

      const combinedQuery = (plantTableSearch || searchQuery).toLowerCase().trim();
      if (combinedQuery) {
        const match =
          (plant.brand || '').toLowerCase().includes(combinedQuery) ||
          (plant.model || '').toLowerCase().includes(combinedQuery) ||
          (plant.serialNumber || plant.plate || '').toLowerCase().includes(combinedQuery) ||
          (plant.location || '').toLowerCase().includes(combinedQuery) ||
          (plant.assignedOperatorName || '').toLowerCase().includes(combinedQuery);
        if (!match) return false;
      }
      return true;
    });
  }, [allPlants, plantCategoryFilter, plantLocationFilter, plantTableSearch, searchQuery]);

  // 100% Real Fleet Metrics
  const fleetStats = useMemo(() => {
    const total = allPlants.length;
    const assigned = allPlants.filter((p) => !!(p.assignedOperatorId || (p.assignedOperatorName && p.assignedOperatorName.trim()))).length;
    const unassigned = Math.max(0, total - assigned);
    const totalHours = allPlants.reduce((acc, p) => acc + (p.currentHours || p.currentOdometer || 0), 0);
    return { total, assigned, unassigned, totalHours };
  }, [allPlants]);

  const fleetTotalKva = useMemo(() => {
    return allPlants.reduce((acc, p) => acc + (p.powerKva || 0), 0);
  }, [allPlants]);

  // Real Tier Breakdown of Registered Plants
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

  // Personnel & Users classification filters (100% derived from real DB values)
  const [selectedUserCategory, setSelectedUserCategory] = useState('Todos los Usuarios');
  const [selectedStateFilter, setSelectedStateFilter] = useState('Todos');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('Todos');
  const [operatorSearch, setOperatorSearch] = useState('');

  const USER_CATEGORIES = ['Todos los Usuarios', 'Personal Operador', 'Super Admins', 'Clientes / Titulares'];

  const dynamicUserStates = useMemo(() => {
    const s = new Set<string>(['Todos']);
    allCombinedUsers.forEach((u: any) => {
      const st = (u.state || u.city || '').trim();
      if (st) s.add(st);
    });
    return Array.from(s);
  }, [allCombinedUsers]);

  const dynamicUserDepts = useMemo(() => {
    const d = new Set<string>(['Todos']);
    allCombinedUsers.forEach((u: any) => {
      const dp = (u.department || u.specialty || '').trim();
      if (dp) d.add(dp);
    });
    return Array.from(d);
  }, [allCombinedUsers]);

  const filteredOperators = useMemo(() => {
    let list = allCombinedUsers;
    if (selectedUserCategory === 'Personal Operador') {
      list = list.filter((u: any) => u.resolvedRole === 'operator');
    } else if (selectedUserCategory === 'Super Admins') {
      list = list.filter((u: any) => u.resolvedRole === 'superadmin');
    } else if (selectedUserCategory === 'Clientes / Titulares') {
      list = list.filter((u: any) => u.resolvedRole === 'client');
    }

    if (selectedStateFilter !== 'Todos') {
      list = list.filter((op: any) => (op.state || op.city || '').toLowerCase() === selectedStateFilter.toLowerCase());
    }
    if (selectedDeptFilter !== 'Todos') {
      list = list.filter((op: any) => (op.department || op.specialty || '').toLowerCase() === selectedDeptFilter.toLowerCase());
    }
    const q = (operatorSearch || searchQuery).toLowerCase().trim();
    if (q) {
      list = list.filter((op: any) =>
        (op.full_name || '').toLowerCase().includes(q) ||
        (op.email || '').toLowerCase().includes(q) ||
        (op.operator_code || '').toLowerCase().includes(q) ||
        (op.state || op.city || '').toLowerCase().includes(q) ||
        (op.department || op.specialty || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allCombinedUsers, selectedUserCategory, selectedStateFilter, selectedDeptFilter, operatorSearch, searchQuery]);

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  const currentHours = useMemo(() => {
    if (!myMoto) return 0;
    return myMoto.currentHours || myMoto.currentOdometer || 0;
  }, [myMoto]);

  const specs = useMemo(() => {
    if (!myMoto) return null;
    return getMotoSpecs(myMoto.brand, myMoto.model);
  }, [myMoto]);

  // 100% Real Financial & Fuel Statistics from `records`
  const fuelRecords = useMemo(() => (records || []).filter((r) => r.type === 'fuel'), [records]);
  const serviceRecords = useMemo(() => (records || []).filter((r) => r.type !== 'fuel'), [records]);

  const totalFuelUSD = useMemo(
    () => fuelRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0),
    [fuelRecords]
  );
  const totalServicesUSD = useMemo(
    () => serviceRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0),
    [serviceRecords]
  );
  const totalCostUSD = totalFuelUSD + totalServicesUSD;

  const totalFuelLiters = useMemo(() => {
    return fuelRecords.reduce((sum, r) => {
      const m = r.notes?.match(/([\d.]+)\s*L/i);
      if (m) return sum + parseFloat(m[1]);
      return sum + ((r as any).liters || 0);
    }, 0);
  }, [fuelRecords]);

  // 10 Industrial Subsystems for Active Plant (ISO 8528)
  const plantSubsystems = useMemo(() => {
    const list = [
      { id: 'oil' as ComponentType, name: 'Aceite 15W-40 & Filtro', interval: 250, color: '#1A365D' },
      { id: 'fuel_filter' as ComponentType, name: 'Filtros Diésel & Racor', interval: 250, color: '#6B46C1' },
      { id: 'air_filter' as ComponentType, name: 'Filtro Aire Industrial', interval: 500, color: '#D69E2E' },
      { id: 'coolant' as ComponentType, name: 'Circuito Refrigerante & Radiador', interval: 1000, color: '#10b981' },
      { id: 'battery' as ComponentType, name: 'Alternador & Baterías 24V', interval: 2000, color: '#0284c7' },
      { id: 'accessory_belt' as ComponentType, name: 'Correas Ventilador & Poleas', interval: 1000, color: '#ec4899' },
      { id: 'timing_belt' as ComponentType, name: 'Válvulas e Inyectores', interval: 1500, color: '#6366f1' },
      { id: 'clutch' as ComponentType, name: 'Aisladores Antivibratorios', interval: 3000, color: '#14b8a6' },
      { id: 'transmission_fluid' as ComponentType, name: 'Aislamiento Alternador Leroy', interval: 2500, color: '#f97316' },
      { id: 'cabin_filter' as ComponentType, name: 'Panel ComAp & Sensores', interval: 1200, color: '#06b6d4' },
    ];

    return list.map((item) => {
      const typeRecords = (records || []).filter((r) => r.type === item.id);
      const isInspected = typeRecords.length > 0;
      let wear = 100;
      let hoursSince = 0;
      let hoursRemaining = item.interval;
      let status: 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO' = 'ÓPTIMO';

      if (isInspected) {
        const lastHours = Math.max(...typeRecords.map((r) => r.odometer || 0));
        hoursSince = Math.max(0, currentHours - lastHours);
        const ratio = Math.max(0, 1 - hoursSince / item.interval);
        wear = Math.min(100, Math.round(ratio * 100));
        hoursRemaining = Math.max(0, item.interval - hoursSince);
        status = wear >= 60 ? 'ÓPTIMO' : wear >= 30 ? 'PREVENTIVO' : 'CRÍTICO';
      } else {
        hoursSince = currentHours > 0 ? currentHours % item.interval : 0;
        hoursRemaining = Math.max(0, item.interval - hoursSince);
        const ratio = Math.max(0, 1 - hoursSince / item.interval);
        wear = Math.min(100, Math.round(ratio * 100));
        status = wear >= 60 ? 'ÓPTIMO' : wear >= 30 ? 'PREVENTIVO' : 'CRÍTICO';
      }

      return {
        ...item,
        wear,
        hoursSince,
        hoursRemaining,
        isInspected,
        status,
      };
    });
  }, [records, currentHours]);

  const generalHealth = useMemo(() => {
    if (plantSubsystems.length === 0) return 100;
    const sum = plantSubsystems.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / plantSubsystems.length);
  }, [plantSubsystems]);

  const optimalSubsystemsCount = useMemo(() => {
    return plantSubsystems.filter((s) => s.wear >= 60).length;
  }, [plantSubsystems]);

  const filteredSubsystems = useMemo(() => {
    let list = plantSubsystems;
    if (subsystemFilter === 'ÓPTIMO') {
      list = list.filter((s) => s.wear >= 60);
    } else if (subsystemFilter === 'PREVENTIVO') {
      list = list.filter((s) => s.wear < 60 && s.wear >= 30);
    } else if (subsystemFilter === 'CRÍTICO') {
      list = list.filter((s) => s.wear < 30);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (sub) => sub.name.toLowerCase().includes(q) || sub.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [plantSubsystems, subsystemFilter, searchQuery]);

  // Font family tokens
  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Template Design Tokens (UniEvents / Executive Navy & Academic Gold adapted for Light & Dark)
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

  const cycleNextPlant = () => {
    if (allPlants.length <= 1) return;
    const idx = allPlants.findIndex((p) => p.id === myMoto?.id);
    const next = allPlants[(idx + 1) % allPlants.length];
    if (next) selectMoto(next.id);
  };

  return (
    <View style={[styles.rootLayout, { backgroundColor: bgSurface }]}>
      {/* ===================================================================== */}
      {/* 1. LEFT EXECUTIVE SIDEBAR (w-72 inspired by template <aside>)        */}
      {/* ===================================================================== */}
      {!isMobile && (
        <View style={[styles.sidebarAside, { backgroundColor: cardLowest, borderRightColor: cardBorder }]}>
          <View style={{ gap: 20, paddingHorizontal: 16 }}>
            {/* Brand Header */}
            <TouchableOpacity
              onPress={() => onSelectTab('moto')}
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

            {/* Active Plant Switcher Box (Template "Campus Central / Facultad de Ingeniería") */}
            <TouchableOpacity
              onPress={cycleNextPlant}
              activeOpacity={0.8}
              style={[styles.sidebarPlantSelector, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
            >
              <View style={[styles.sidebarSelectorIcon, { backgroundColor: cardLowest }]}>
                <MaterialIcons name="bolt" size={18} color={academicGold} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: textVariant }} numberOfLines={1}>
                  {myMoto?.location || 'Planta en Supervisión'}
                </Text>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy }} numberOfLines={1}>
                  {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Sin planta registrada'}
                </Text>
              </View>
              <MaterialIcons name="unfold-more" size={18} color={textVariant} />
            </TouchableOpacity>

            {/* Navigation Links */}
            <View style={{ gap: 4 }}>
              {[
                { id: 'moto' as const, label: 'Dashboard', icon: 'dashboard', action: () => onSelectTab('moto') },
                { id: 'services' as const, label: 'Mantenimiento & Servicios', icon: 'build', action: () => onSelectTab('services') },
                { id: 'history' as const, label: 'Bitácora & Finanzas', icon: 'payments', action: () => onSelectTab('history') },
                { id: 'specs' as const, label: 'Ficha Técnica OEM', icon: 'qr-code-scanner', action: () => onSelectTab('specs') },
                ...(hasSuperAccess
                  ? [
                      {
                        id: 'users_mgmt' as const,
                        label: 'Usuarios y Operadores',
                        icon: 'group',
                        badge: pendingUsersList?.length || 0,
                        action: () => {
                          loadSystemUsers();
                          setUserMgmtVisible(true);
                        },
                      },
                    ]
                  : []),
                ...(drivesCompanyVehicle && !isSuperAdmin
                  ? [{ id: 'wallet' as const, label: 'Guantera de Flota', icon: 'account-balance-wallet', action: () => onSelectTab('wallet') }]
                  : []),
                { id: 'report' as const, label: 'Reportes PDF', icon: 'analytics', action: onOpenReport },
                { id: 'profile' as const, label: 'Configuración & Perfil', icon: 'settings', action: () => onSelectTab('profile') },
              ].map((navItem) => {
                const isActive =
                  (navItem.id === 'users_mgmt' && userMgmtVisible) ||
                  activeTab === navItem.id;
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
                        fontSize: 13.5,
                        color: isActive ? '#ffffff' : textVariant,
                      }}
                      numberOfLines={1}
                    >
                      {navItem.label}
                    </Text>
                    {!!(navItem as any).badge && (navItem as any).badge > 0 && (
                      <View style={styles.sidebarNavBadge}>
                        <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#ffffff' }}>
                          {(navItem as any).badge}
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
              <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant, lineHeight: 16 }}>
                {allPlants.length} plantas registradas · {allCombinedUsers.length} usuarios sincronizados.
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
      {/* 2. MAIN WORKSPACE AREA (Header + Scrollable Content)                  */}
      {/* ===================================================================== */}
      <View style={styles.mainContentArea}>
        {/* TOP HEADER BAR (Inspired by template <header>) */}
        {isMobile ? (
          <View style={[styles.topHeaderBarMobile, { backgroundColor: cardLowest, borderBottomColor: cardBorder }]}>
            {mobileSearchOpen ? (
              <View style={[styles.mobileSearchExpandedRow, { backgroundColor: surfaceLow, borderColor: primaryContainer }]}>
                <MaterialIcons name="search" size={20} color={primaryNavy} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar planta, serial, operador..."
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

                <TouchableOpacity onPress={() => onSelectTab('moto')} style={styles.mobileBrandCenter}>
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
            {/* Left: Search + Active Period/Plant Pill */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={[styles.headerSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                <MaterialIcons name="search" size={18} color={textOutline} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar planta, serial, operador o componente..."
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
                <MaterialIcons name="bolt" size={16} color={academicGold} />
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                  Unidad Activa:{' '}
                  <Text style={{ fontFamily: F.bold, color: primaryNavy }}>
                    {myMoto ? `${myMoto.brand} ${myMoto.model} (${myMoto.serialNumber || myMoto.plate || 'S/N'})` : 'Ninguna'}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Right: CTA Button + Notifications + Real User Profile */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setIsAddingMoto(true)}
                activeOpacity={0.85}
                style={[styles.headerPrimaryCta, { backgroundColor: isDark ? '#2563eb' : '#002045' }]}
              >
                <MaterialIcons name="add-circle" size={17} color="#ffc250" />
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>
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
                <MaterialIcons name="help-outline" size={20} color={textVariant} />
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
        {/* 3. SCROLLABLE DASHBOARD BODY (100% Real Data, Template Structure)     */}
        {/* ===================================================================== */}
        <ScrollView
          style={[{ flex: 1 }, activeTab !== 'moto' && { display: 'none' }]}
          contentContainerStyle={[
            styles.bentoScrollContent,
            isMobile && { paddingHorizontal: 14, paddingBottom: 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 3.1 TOP UTILITY BAR: Operational Meta & Action Toolbar */}
          <View style={styles.topUtilityBar}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <View style={[styles.utilityStatusBadge, { backgroundColor: secondaryFixed }]}>
                  <Animated.View style={[styles.utilityPulseDot, { backgroundColor: '#7d5700', opacity: pulseAnim }]} />
                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: onSecondaryFixed }}>
                    Sistema de Telemetría ISO 8528 Activo
                  </Text>
                </View>
                <Text style={{ color: textOutline, fontSize: 12 }}>•</Text>
                <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textVariant }}>
                  {allPlants.length} Plantas en BD · {records.length} Registros Reales
                </Text>
              </View>
              <Text style={[styles.utilityHeadline, { color: primaryNavy, fontFamily: F.bold, fontSize: isMobile ? 22 : 30 }]}>
                Centro de Control & Operaciones
              </Text>
            </View>

            {/* Filters & Action Toolbar */}
            <View style={styles.utilityActionsRow}>
              {/* Real Location Filter Selector */}
              <TouchableOpacity
                onPress={() => {
                  const nextIdx = (uniquePlantLocations.indexOf(plantLocationFilter) + 1) % uniquePlantLocations.length;
                  setPlantLocationFilter(uniquePlantLocations[nextIdx]);
                }}
                style={[styles.toolbarSelectBtn, { backgroundColor: cardLowest, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="place" size={17} color={textOutline} />
                <Text style={{ fontFamily: F.semibold, fontSize: 13, color: textOnSurface }}>
                  Sede: {plantLocationFilter}
                </Text>
                <MaterialIcons name="expand-more" size={18} color={textVariant} />
              </TouchableOpacity>

              {/* Real Category Filter Selector */}
              <TouchableOpacity
                onPress={() => {
                  const nextIdx = (PLANT_CATEGORIES.indexOf(plantCategoryFilter) + 1) % PLANT_CATEGORIES.length;
                  setPlantCategoryFilter(PLANT_CATEGORIES[nextIdx]);
                }}
                style={[styles.toolbarSelectBtn, { backgroundColor: cardLowest, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="bolt" size={17} color={academicGold} />
                <Text style={{ fontFamily: F.semibold, fontSize: 13, color: textOnSurface }}>
                  {plantCategoryFilter}
                </Text>
                <MaterialIcons name="expand-more" size={18} color={textVariant} />
              </TouchableOpacity>

              {/* Export Report Button */}
              <TouchableOpacity
                onPress={onOpenReport}
                style={[styles.toolbarSecondaryBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="download" size={17} color={primaryNavy} />
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: primaryNavy }}>
                  Exportar Reporte
                </Text>
              </TouchableOpacity>

              {/* Register Hours / Fuel CTA */}
              <TouchableOpacity
                onPress={onOpenQuickHours}
                style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045' }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add-circle" size={17} color="#ffc250" />
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>
                  Registrar Horas / Diésel
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3.2 PERSPECTIVE TABS (Inspired by template's B9 Ticketing Tabs) */}
          <View style={[styles.perspectiveTabContainer, { backgroundColor: surfaceLow }]}>
            {[
              { id: 'all' as const, label: 'Vista Integral Ejecutiva', icon: 'dashboard', color: academicGold },
              { id: 'plants' as const, label: `Máquinas & Plantas (${allPlants.length})`, icon: 'bolt', color: '#2563eb' },
              { id: 'users' as const, label: `Usuarios & Operadores (${allCombinedUsers.length})`, icon: 'groups', color: innovationPurple },
              { id: 'subsystems' as const, label: `Subsistemas ISO 8528 (${plantSubsystems.length})`, icon: 'build', color: '#10b981' },
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

          {/* 3.3 KEY METRICS ROW (4 KPI Cards — 100% REAL DATA, NO FAKE NUMBERS) */}
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

            {/* KPI 2: Flota de Plantas & Capacidad Real */}
            <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
              <View style={styles.kpiCardTopRow}>
                <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                  PLANTAS & CAPACIDAD EN BD
                </Text>
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(214, 158, 46, 0.18)' }]}>
                  <MaterialCommunityIcons name="generator-portable" size={20} color={academicGold} />
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                    {allPlants.length}
                  </Text>
                  <Text style={{ fontFamily: F.semibold, fontSize: 14, color: textVariant }}>
                    / {fleetTotalKva.toLocaleString()} kVA totales
                  </Text>
                </View>
                <View style={[styles.kpiProgressBarTrack, { backgroundColor: surfaceLow }]}>
                  <View
                    style={[
                      styles.kpiProgressBarFill,
                      {
                        backgroundColor: isDark ? '#2563eb' : '#002045',
                        width: `${allPlants.length > 0 ? Math.round((fleetStats.assigned / allPlants.length) * 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: primaryNavy }}>
                    {fleetStats.assigned} con operador
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    {fleetStats.unassigned} por asignar
                  </Text>
                </View>
              </View>
            </View>

            {/* KPI 3: Usuarios & Personal Operador Real */}
            <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
              <View style={styles.kpiCardTopRow}>
                <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                  DIRECTORIO DE USUARIOS EN BD
                </Text>
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(107, 70, 193, 0.14)' }]}>
                  <MaterialIcons name="groups" size={20} color={innovationPurple} />
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                    {allCombinedUsers.length}
                  </Text>
                  <Text style={{ fontFamily: F.semibold, fontSize: 16, color: textVariant }}>
                    Perfiles
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: academicGold }} />
                    <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: textOnSurface }}>
                      {(operatorsList || []).length} Operadores
                    </Text>
                  </View>
                  <Text style={{ color: textOutline, fontSize: 11 }}>•</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    {(superAdminsList || []).length} Admins
                  </Text>
                  <Text style={{ color: textOutline, fontSize: 11 }}>•</Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    {(clientsList || []).length} Clientes
                  </Text>
                </View>
              </View>
            </View>

            {/* KPI 4: Salud Global & Horómetro Real */}
            <View style={[styles.kpiCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
              <View style={styles.kpiCardTopRow}>
                <Text style={[styles.kpiEyebrow, { color: textVariant, fontFamily: F.semibold }]}>
                  SALUD ISO 8528 PLANTA ACTIVA
                </Text>
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.14)' }]}>
                  <MaterialIcons name="verified" size={20} color="#16a34a" />
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={[styles.kpiBigDisplay, { color: primaryNavy, fontFamily: F.extrabold }]}>
                    {generalHealth}%
                  </Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: generalHealth >= 60 ? '#16a34a' : '#d97706' }}>
                    {generalHealth >= 60 ? 'Óptimo' : generalHealth >= 30 ? 'Preventivo' : 'Crítico'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                    Horómetro actual: <Text style={{ fontFamily: F.bold, color: textOnSurface }}>{currentHours.toLocaleString()} hrs</Text> ({fleetStats.totalHours.toLocaleString()}h flota)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3.4 BENTO SECTION: 8 Cols Analytics & Tiers + 4 Cols Live Unit Inspector */}
          {(perspectiveTab === 'all' || perspectiveTab === 'plants') && (
            <View style={[styles.bento12Grid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              {/* LEFT 8 COLS: Real Fleet Chart + 4 Tier Breakdown Cards */}
              <View style={[styles.bento8Col, isDesktop ? { flex: 8 } : { width: '100%' }]}>
                {/* Primary Chart Card */}
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
                      * Valores leídos directamente del inventario activo en Supabase sin proyecciones simuladas.
                    </Text>
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                      Capacidad Total: {fleetTotalKva.toLocaleString()} kVA · Uso Flota: {fleetStats.totalHours.toLocaleString()} hrs
                    </Text>
                  </View>
                </View>

                {/* 4 Tier Distribution Cards (100% Real Data) */}
                <View style={styles.tiers4Grid}>
                  {/* Tier 1: Alta Capacidad */}
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

                  {/* Tier 2: Media Capacidad */}
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

                  {/* Tier 3: Compactas */}
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

                  {/* Tier 4: Móviles de Flota & Servicios */}
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

              {/* RIGHT 4 COLS: Live Active Plant Card & Subsystems Breakdown */}
              <View style={[styles.bento4Col, isDesktop ? { flex: 4 } : { width: '100%' }]}>
                {/* Card 1: Live Active Plant Status (Template "Acreditación en Puerta") */}
                <View style={[styles.bentoCardBox, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', opacity: pulseAnim }} />
                      <Text style={{ fontFamily: F.bold, fontSize: 16, color: primaryNavy }}>
                        Unidad en Supervisión
                      </Text>
                    </View>
                    <View style={{ backgroundColor: surfaceHigh, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                      <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textVariant }}>
                        {myMoto?.location || 'Sede Principal'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ backgroundColor: surfaceLow, padding: 14, borderRadius: 12, gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>Serial / Placa en BD</Text>
                      <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                        {myMoto?.serialNumber || myMoto?.plate || 'Sin serial registrado'}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: cardLowest, padding: 12, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: cardBorder }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>Marca y Modelo</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 13, color: innovationPurple }}>
                          {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Ninguna'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>Capacidad / Combustible</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                          {myMoto?.powerKva || 0} kVA · {myMoto?.fuelType || 'Diesel'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>Operador Responsable</Text>
                        <Text style={{ fontFamily: F.bold, fontSize: 12, color: myMoto?.assignedOperatorName ? '#16a34a' : academicGold }}>
                          {myMoto?.assignedOperatorName || 'Sin operador asignado'}
                        </Text>
                      </View>
                    </View>

                    {/* Donut Ring & Subsystem Health Count */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                      <View>
                        <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>Componentes Óptimos</Text>
                        <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: primaryNavy }}>
                          {optimalSubsystemsCount} de {plantSubsystems.length}
                        </Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textOutline }}>
                          Horómetro: {currentHours.toLocaleString()} hrs
                        </Text>
                      </View>
                      <RealDonutRing
                        percent={generalHealth}
                        primaryColor={isDark ? '#2563eb' : '#002045'}
                        trackColor={surfaceHigh}
                        textColor={primaryNavy}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={onOpenSpecs}
                    activeOpacity={0.85}
                    style={[styles.purpleScannerBtn, { backgroundColor: isDark ? '#6B46C1' : '#6B46C1' }]}
                  >
                    <MaterialIcons name="qr-code-scanner" size={18} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>
                      Abrir Ficha Técnica & Especificaciones OEM
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Card 2: Critical Subsystems Matrix (Template "Métodos de Pago") */}
                <View style={[styles.bentoCardBox, { backgroundColor: cardLowest, borderColor: cardBorder, gap: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 16, color: primaryNavy }}>
                      Estado de Subsistemas Críticos
                    </Text>
                    <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>
                      Vida Útil Remanente
                    </Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    {plantSubsystems.slice(0, 4).map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() => onOpenServicesTab(sub.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }}>
                            {sub.name}
                          </Text>
                          <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                            {sub.hoursRemaining}h rest. ({sub.wear}%)
                          </Text>
                        </View>
                        <View style={[styles.kpiProgressBarTrack, { backgroundColor: surfaceLow, height: 6, marginTop: 0 }]}>
                          <View
                            style={{
                              height: 6,
                              borderRadius: 99,
                              backgroundColor: sub.color,
                              width: `${sub.wear}%`,
                            }}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* 3.5 OPERATIONAL INTERACTIVE DATA TABLE 1: PLANTAS ELÉCTRICAS EN BD    */}
          {/* ===================================================================== */}
          {(perspectiveTab === 'all' || perspectiveTab === 'plants') && (
            <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
              <View style={styles.tableCardHeader}>
                <View style={{ flex: 1, minWidth: 240 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 20, color: primaryNavy }}>
                    Grupos Electrógenos y Máquinas en Gestión ({filteredFleetPlants.length})
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                    Listado operativo real de plantas registradas en base de datos, ubicación, horómetro y operador asignado
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={[styles.tableFilterSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                    <MaterialIcons name="filter-list" size={18} color={textOutline} />
                    <TextInput
                      value={plantTableSearch}
                      onChangeText={setPlantTableSearch}
                      placeholder="Filtrar planta, serial o sede..."
                      placeholderTextColor={textOutline}
                      style={{ fontFamily: F.medium, fontSize: 12.5, color: textOnSurface, minWidth: 180, paddingVertical: 4 }}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsAddingMoto(true)}
                    style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 8 }]}
                  >
                    <MaterialIcons name="add" size={16} color="#ffc250" />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>Nueva Planta</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category & Location Filter Chips */}
              <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}>
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
                            backgroundColor: active ? primaryContainer : surfaceLow,
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
                  {uniquePlantLocations.map((loc) => {
                    if (loc === 'Todas') return null;
                    const active = plantLocationFilter === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        onPress={() => setPlantLocationFilter(active ? 'Todas' : loc)}
                        style={[
                          styles.filterPillChip,
                          {
                            backgroundColor: active ? academicGold : surfaceLow,
                            borderColor: active ? academicGold : cardBorder,
                          },
                        ]}
                      >
                        <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                          📍 {loc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Table Header Bar (Desktop) */}
              {!isMobile && (
                <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopColor: cardBorder, borderBottomColor: cardBorder }]}>
                  <Text style={[styles.tableHeadCell, { flex: 2.2, color: textVariant, fontFamily: F.bold }]}>PLANTA & MARCA</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.3, color: textVariant, fontFamily: F.bold }]}>SERIAL / AÑO</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.5, color: textVariant, fontFamily: F.bold }]}>RECINTO / SEDE</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.6, color: textVariant, fontFamily: F.bold }]}>OPERADOR ASIGNADO</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.2, color: textVariant, fontFamily: F.bold }]}>POTENCIA & USO</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.1, color: textVariant, fontFamily: F.bold }]}>ESTADO</Text>
                  <Text style={[styles.tableHeadCell, { width: 110, textAlign: 'right', color: textVariant, fontFamily: F.bold }]}>ACCIONES</Text>
                </View>
              )}

              {/* Table Body Rows */}
              <View>
                {filteredFleetPlants.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="generator-portable" size={36} color={textOutline} />
                    <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                      No hay plantas registradas que coincidan con el filtro actual
                    </Text>
                  </View>
                ) : (
                  filteredFleetPlants.map((plant) => {
                    const isSelected = myMoto?.id === plant.id;
                    const kva = plant.powerKva || 0;
                    const hrs = plant.currentHours || plant.currentOdometer || 0;

                    return (
                      <TouchableOpacity
                        key={plant.id}
                        onPress={() => selectMoto(plant.id)}
                        activeOpacity={0.85}
                        style={[
                          styles.tableDataRow,
                          {
                            backgroundColor: isSelected ? (isDark ? 'rgba(37, 99, 235, 0.12)' : '#f0f7ff') : cardLowest,
                            borderBottomColor: cardBorder,
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: isMobile ? 'flex-start' : 'center',
                          },
                        ]}
                      >
                        {/* Col 1: Plant & Brand */}
                        <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={[styles.tablePlantThumb, { backgroundColor: surfaceLow }]}>
                            <MaterialCommunityIcons name="generator-portable" size={22} color={isSelected ? '#2563eb' : primaryNavy} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: primaryNavy }} numberOfLines={1}>
                              {plant.brand} {plant.model}
                            </Text>
                            <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: innovationPurple }} numberOfLines={1}>
                              {kva >= 100 ? 'Alta Capacidad' : kva >= 50 ? 'Media Capacidad' : 'Compacta'} · {plant.fuelType || 'Diesel'}
                            </Text>
                          </View>
                        </View>

                        {/* Col 2: Serial & Year */}
                        <View style={{ flex: 1.3 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 13, color: textOnSurface }}>
                            {plant.serialNumber || plant.plate || 'Sin serial'}
                          </Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>
                            Año: {plant.year || '-'}
                          </Text>
                        </View>

                        {/* Col 3: Location / Sede */}
                        <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name="location-on" size={16} color={textOutline} />
                          <Text style={{ fontFamily: F.medium, fontSize: 13, color: textOnSurface }} numberOfLines={1}>
                            {plant.location || 'Sin sede registrada'}
                          </Text>
                        </View>

                        {/* Col 4: Assigned Operator */}
                        <View style={{ flex: 1.6 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: plant.assignedOperatorName ? primaryNavy : academicGold }}>
                            {plant.assignedOperatorName || 'Sin operador asignado'}
                          </Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>
                            {plant.assignedOperatorId ? 'Vinculado en BD' : 'Disponible para asignar'}
                          </Text>
                        </View>

                        {/* Col 5: Power & Hours */}
                        <View style={{ flex: 1.2 }}>
                          <Text style={{ fontFamily: F.extrabold, fontSize: 14, color: primaryNavy }}>
                            {kva} kVA
                          </Text>
                          <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textVariant }}>
                            {hrs.toLocaleString()} hrs uso
                          </Text>
                        </View>

                        {/* Col 6: Status Badge */}
                        <View style={{ flex: 1.1 }}>
                          <View
                            style={{
                              alignSelf: 'flex-start',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: isSelected ? secondaryFixed : surfaceLow,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 99,
                            }}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? '#7d5700' : '#16a34a' }} />
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: isSelected ? onSecondaryFixed : textOnSurface }}>
                              {isSelected ? 'En Supervisión' : 'En Red'}
                            </Text>
                          </View>
                        </View>

                        {/* Col 7: Actions */}
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
                              onOpenSpecs();
                            }}
                            style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                          >
                            <MaterialIcons name="analytics" size={18} color={primaryNavy} />
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
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Table Footer */}
              <View style={[styles.tableCardFooter, { backgroundColor: surfaceLow, borderTopColor: cardBorder }]}>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: textVariant }}>
                  Mostrando {filteredFleetPlants.length} de {allPlants.length} plantas eléctricas registradas en la base de datos
                </Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                  Capacidad Acumulada: {fleetTotalKva.toLocaleString()} kVA
                </Text>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* 3.6 OPERATIONAL INTERACTIVE DATA TABLE 2: USUARIOS & OPERADORES EN BD */}
          {/* ===================================================================== */}
          {hasSuperAccess && (perspectiveTab === 'all' || perspectiveTab === 'users') && (
            <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
              <View style={styles.tableCardHeader}>
                <View style={{ flex: 1, minWidth: 240 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 20, color: primaryNavy }}>
                    Directorio Real de Usuarios, Personal Operador y Roles ({filteredOperators.length})
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                    Clasificación por rol, ubicación registrada, departamento, plantas bajo supervisión y vehículo asignado en BD
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={[styles.tableFilterSearchBox, { backgroundColor: surfaceLow, borderColor: cardBorder }]}>
                    <MaterialIcons name="search" size={18} color={textOutline} />
                    <TextInput
                      value={operatorSearch}
                      onChangeText={setOperatorSearch}
                      placeholder="Buscar usuario, correo, carnet o estado..."
                      placeholderTextColor={textOutline}
                      style={{ fontFamily: F.medium, fontSize: 12.5, color: textOnSurface, minWidth: 190, paddingVertical: 4 }}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      loadSystemUsers();
                      setUserMgmtVisible(true);
                    }}
                    style={[styles.toolbarPrimaryBtn, { backgroundColor: isDark ? '#2563eb' : '#002045', paddingVertical: 8 }]}
                  >
                    <MaterialIcons name="person-add" size={16} color="#ffc250" />
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>
                      Gestionar / Crear Usuario
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Real Multi-Criteria Filters for Users */}
              <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {USER_CATEGORIES.map((cat) => {
                    const active = selectedUserCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setSelectedUserCategory(cat)}
                        style={[
                          styles.filterPillChip,
                          {
                            backgroundColor: active ? primaryContainer : surfaceLow,
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
                  {dynamicUserStates.map((st) => {
                    if (st === 'Todos') return null;
                    const active = selectedStateFilter === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setSelectedStateFilter(active ? 'Todos' : st)}
                        style={[
                          styles.filterPillChip,
                          {
                            backgroundColor: active ? academicGold : surfaceLow,
                            borderColor: active ? academicGold : cardBorder,
                          },
                        ]}
                      >
                        <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                          📍 {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {dynamicUserDepts.map((dp) => {
                    if (dp === 'Todos') return null;
                    const active = selectedDeptFilter === dp;
                    return (
                      <TouchableOpacity
                        key={dp}
                        onPress={() => setSelectedDeptFilter(active ? 'Todos' : dp)}
                        style={[
                          styles.filterPillChip,
                          {
                            backgroundColor: active ? innovationPurple : surfaceLow,
                            borderColor: active ? innovationPurple : cardBorder,
                          },
                        ]}
                      >
                        <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textVariant }}>
                          🏢 {dp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Users Table Header (Desktop) */}
              {!isMobile && (
                <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopColor: cardBorder, borderBottomColor: cardBorder }]}>
                  <Text style={[styles.tableHeadCell, { flex: 2, color: textVariant, fontFamily: F.bold }]}>USUARIO & CORREO</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.2, color: textVariant, fontFamily: F.bold }]}>ROL EN BD</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.4, color: textVariant, fontFamily: F.bold }]}>UBICACIÓN / DPTO</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.6, color: textVariant, fontFamily: F.bold }]}>PLANTAS SUPERVISADAS</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.5, color: textVariant, fontFamily: F.bold }]}>MÓVIL DE FLOTA</Text>
                  <Text style={[styles.tableHeadCell, { width: 120, textAlign: 'right', color: textVariant, fontFamily: F.bold }]}>ACCIONES</Text>
                </View>
              )}

              {/* Users Rows (100% Real Data from Supabase) */}
              <View>
                {filteredOperators.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <MaterialIcons name="groups" size={36} color={textOutline} />
                    <Text style={{ fontFamily: F.bold, fontSize: 14, color: textOnSurface, marginTop: 8 }}>
                      No hay usuarios registrados en este filtro
                    </Text>
                  </View>
                ) : (
                  filteredOperators.map((op: any) => {
                    const initials = (op.full_name || op.email || 'U')
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

                    const roleLabel =
                      op.resolvedRole === 'superadmin'
                        ? 'Super Admin'
                        : op.resolvedRole === 'operator'
                        ? 'Operador Técnico'
                        : 'Cliente / Titular';

                    const roleBg =
                      op.resolvedRole === 'superadmin'
                        ? secondaryFixed
                        : op.resolvedRole === 'operator'
                        ? 'rgba(37, 99, 235, 0.14)'
                        : 'rgba(22, 163, 74, 0.14)';

                    const roleTextColor =
                      op.resolvedRole === 'superadmin'
                        ? onSecondaryFixed
                        : op.resolvedRole === 'operator'
                        ? '#2563eb'
                        : '#16a34a';

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
                        {/* Col 1: Name & Email */}
                        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={[styles.tableUserAvatar, { backgroundColor: primaryContainer }]}>
                            <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>{initials}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 14, color: primaryNavy }} numberOfLines={1}>
                              {op.full_name || 'Sin nombre registrado'}
                            </Text>
                            <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }} numberOfLines={1}>
                              {op.email || 'Sin correo'} {op.operator_code ? `· ${op.operator_code}` : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Col 2: Role Badge */}
                        <View style={{ flex: 1.2 }}>
                          <View style={{ alignSelf: 'flex-start', backgroundColor: roleBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                            <Text style={{ fontFamily: F.bold, fontSize: 11, color: roleTextColor }}>{roleLabel}</Text>
                          </View>
                        </View>

                        {/* Col 3: Location & Department (100% real from DB) */}
                        <View style={{ flex: 1.4 }}>
                          <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textOnSurface }} numberOfLines={1}>
                            {op.state || op.city || 'Sin estado en BD'}
                          </Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }} numberOfLines={1}>
                            {op.department || op.specialty || 'Sin departamento'}
                          </Text>
                        </View>

                        {/* Col 4: Assigned Plants */}
                        <View style={{ flex: 1.6 }}>
                          {assignedPlants.length === 0 ? (
                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textOutline }}>
                              0 plantas asignadas
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

                        {/* Col 5: Assigned Company Vehicle (100% real from DB) */}
                        <View style={{ flex: 1.5 }}>
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
                        <View style={{ width: isMobile ? '100%' : 120, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
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
                  Mostrando {filteredOperators.length} de {allCombinedUsers.length} perfiles registrados en Supabase
                </Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>
                  {(operatorsList || []).length} Operadores · {(superAdminsList || []).length} Super Admins · {(clientsList || []).length} Clientes
                </Text>
              </View>
            </View>
          )}

          {/* ===================================================================== */}
          {/* 3.7 OPERATIONAL INTERACTIVE DATA TABLE 3: SUBSISTEMAS ISO 8528        */}
          {/* ===================================================================== */}
          {(perspectiveTab === 'all' || perspectiveTab === 'subsystems') && (
            <View style={[styles.operationalTableCard, { backgroundColor: cardLowest, borderColor: cardBorder }]}>
              <View style={styles.tableCardHeader}>
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 20, color: primaryNavy }}>
                    Subsistemas Industriales & Telemetría — {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Planta'}
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: textVariant, marginTop: 2 }}>
                    Control de desgaste remanente sobre {currentHours.toLocaleString()} hrs registradas en horómetro
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    const options: Array<'TODOS' | 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO'> = ['TODOS', 'ÓPTIMO', 'PREVENTIVO', 'CRÍTICO'];
                    const nextIdx = (options.indexOf(subsystemFilter) + 1) % options.length;
                    setSubsystemFilter(options[nextIdx]);
                  }}
                  style={[styles.toolbarSelectBtn, { backgroundColor: surfaceLow, borderColor: cardBorder }]}
                >
                  <MaterialIcons name="tune" size={17} color={primaryNavy} />
                  <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: primaryNavy }}>
                    Estado: {subsystemFilter}
                  </Text>
                  <MaterialIcons name="expand-more" size={18} color={textVariant} />
                </TouchableOpacity>
              </View>

              {!isMobile && (
                <View style={[styles.tableHeadRow, { backgroundColor: surfaceLow, borderTopColor: cardBorder, borderBottomColor: cardBorder }]}>
                  <Text style={[styles.tableHeadCell, { flex: 2.3, color: textVariant, fontFamily: F.bold }]}>SUBSISTEMA INDUSTRIAL</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.2, color: textVariant, fontFamily: F.bold }]}>USO EN CICLO</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.6, color: textVariant, fontFamily: F.bold }]}>VIDA ÚTIL REMANENTE</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1, color: textVariant, fontFamily: F.bold }]}>ESTADO ISO 8528</Text>
                  <Text style={[styles.tableHeadCell, { width: 90, textAlign: 'right', color: textVariant, fontFamily: F.bold }]}>ACCIÓN</Text>
                </View>
              )}

              <View>
                {filteredSubsystems.map((sub) => {
                  const meta = SUBSYSTEM_META[sub.id] || { icon: 'cog', bg: surfaceLow, color: primaryNavy, desc: 'Componente Industrial' };
                  const isGood = sub.wear >= 60;
                  const isWarn = sub.wear >= 30 && sub.wear < 60;
                  const statusColor = isGood ? '#16a34a' : isWarn ? '#d97706' : '#dc2626';

                  return (
                    <View
                      key={sub.id}
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
                      <View style={{ flex: 2.3, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.tablePlantThumb, { backgroundColor: meta.bg }]}>
                          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 14, color: primaryNavy }}>{sub.name}</Text>
                          <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textVariant }}>{meta.desc}</Text>
                        </View>
                      </View>

                      <View style={{ flex: 1.2 }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 13, color: textOnSurface }}>{sub.hoursSince} hrs</Text>
                        <Text style={{ fontFamily: F.medium, fontSize: 11, color: textVariant }}>Intervalo: {sub.interval}h</Text>
                      </View>

                      <View style={{ flex: 1.6, paddingRight: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 12, color: primaryNavy }}>{sub.hoursRemaining} hrs restantes</Text>
                          <Text style={{ fontFamily: F.bold, fontSize: 12, color: statusColor }}>{sub.wear}%</Text>
                        </View>
                        <View style={[styles.kpiProgressBarTrack, { backgroundColor: surfaceLow, height: 7, marginTop: 0 }]}>
                          <View style={{ height: 7, borderRadius: 99, backgroundColor: statusColor, width: `${sub.wear}%` }} />
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ alignSelf: 'flex-start', backgroundColor: `${statusColor}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 11, color: statusColor }}>{sub.status}</Text>
                        </View>
                      </View>

                      <View style={{ width: isMobile ? '100%' : 90, alignItems: 'flex-end' }}>
                        <TouchableOpacity
                          onPress={() => onOpenServicesTab(sub.id)}
                          style={[styles.tableActionIconBtn, { backgroundColor: surfaceLow }]}
                        >
                          <MaterialIcons name="build" size={17} color={primaryNavy} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* PERSISTENT SUB-TABS CONTAINER (Specs, Services, History, Wallet, Profile) */}
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
                <Text style={{ fontFamily: F.extrabold, fontSize: 16, color: primaryNavy }}>Menú Ejecutivo</Text>
                <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                  <MaterialIcons name="close" size={22} color={textOnSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {[
                  { label: 'Dashboard Principal', icon: 'dashboard', action: () => onSelectTab('moto') },
                  { label: 'Mantenimiento & Servicios', icon: 'build', action: () => onSelectTab('services') },
                  { label: 'Bitácora & Finanzas', icon: 'payments', action: () => onSelectTab('history') },
                  { label: 'Ficha Técnica OEM', icon: 'qr-code-scanner', action: () => onSelectTab('specs') },
                  { label: 'Usuarios y Operadores', icon: 'groups', action: () => setUserMgmtVisible(true) },
                  { label: 'Exportar Reporte PDF', icon: 'picture-as-pdf', action: onOpenReport },
                  { label: 'Configuración & Perfil', icon: 'person', action: () => onSelectTab('profile') },
                ].map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setMobileMenuOpen(false);
                      item.action();
                    }}
                    style={[styles.sidebarNavItem, { backgroundColor: surfaceLow }]}
                  >
                    <MaterialIcons name={item.icon as any} size={20} color={primaryNavy} />
                    <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: textOnSurface }}>{item.label}</Text>
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
    width: 268,
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
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
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
    width: 320,
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
    paddingHorizontal: 14,
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
    paddingVertical: 4,
  },
  bentoScrollContent: {
    padding: 24,
    paddingBottom: 90,
    gap: 24,
  },
  topUtilityBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  utilityStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  utilityPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  toolbarSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  perspectiveTabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  perspectiveTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
  },
  kpiGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: 230,
    padding: 20,
    borderRadius: 14,
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
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiBigDisplay: {
    fontSize: 34,
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
    height: 8,
    borderRadius: 99,
  },
  bento12Grid: {
    gap: 24,
  },
  bento8Col: {
    gap: 20,
  },
  bento4Col: {
    gap: 20,
  },
  bentoCardBox: {
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  chartFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  tiers4Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
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
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  operationalTableCard: {
    borderRadius: 14,
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
    borderRadius: 12,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableActionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
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
