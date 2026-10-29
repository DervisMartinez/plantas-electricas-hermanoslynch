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
import { ComponentType, COMPONENT_NAMES } from '../../../constants/telemetry';
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
  oil: { icon: 'oil', bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', desc: 'Cada 250 hrs · Aceite 15W-40 CI-4' },
  fuel_filter: { icon: 'filter-variant', bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', desc: 'Cada 250 hrs · Primario Racor & Secundario' },
  air_filter: { icon: 'air-filter', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', desc: 'Cada 500 hrs · Cartucho Industrial Seco' },
  coolant: { icon: 'radiator', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', desc: 'Cada 1,000 hrs · Glicol 50/50 Desmineralizado' },
  battery: { icon: 'battery-charging-100', bg: 'rgba(0, 227, 253, 0.15)', color: '#00e3fd', desc: 'Cada 2,000 hrs · Baterías Plomo-Ácido 24V' },
  accessory_belt: { icon: 'cogs', bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', desc: 'Cada 1,000 hrs · Correas Poli-V Ventilador' },
  timing_belt: { icon: 'engine', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', desc: 'Cada 1,500 hrs · Calibración Balancines e Inyectores' },
  clutch: { icon: 'shield-car', bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', desc: 'Cada 3,000 hrs · Tacos Silentblock Antivibración' },
  transmission_fluid: { icon: 'generator-portable', bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', desc: 'Cada 2,500 hrs · Bobinado Estator & Megado' },
  cabin_filter: { icon: 'gauge', bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', desc: 'Cada 1,200 hrs · ComAp InteliLite & Sensores' },
};

// Dual spline curve graph matching template "Active Users right now 💡"
const SplineWaveChart: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  if (Platform.OS === 'web') {
    return React.createElement(
      'svg',
      {
        viewBox: '0 0 380 140',
        width: '100%',
        height: '100%',
        style: { overflow: 'visible' },
      },
      React.createElement(
        'defs',
        null,
        React.createElement(
          'linearGradient',
          { id: 'goldCurveGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: '#f59e0b', stopOpacity: '0.35' }),
          React.createElement('stop', { offset: '100%', stopColor: '#f59e0b', stopOpacity: '0.0' })
        ),
        React.createElement(
          'linearGradient',
          { id: 'cyanCurveGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: '#00e3fd', stopOpacity: '0.22' }),
          React.createElement('stop', { offset: '100%', stopColor: '#00e3fd', stopOpacity: '0.0' })
        ),
        React.createElement(
          'linearGradient',
          { id: 'verticalBeamGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: 'rgba(255, 255, 255, 0.25)' }),
          React.createElement('stop', { offset: '100%', stopColor: 'rgba(255, 255, 255, 0.02)' })
        )
      ),
      // Gold curve area
      React.createElement('path', {
        d: 'M 10 115 C 50 115, 80 95, 120 98 C 160 100, 200 45, 250 40 C 290 35, 330 90, 370 70 L 370 135 L 10 135 Z',
        fill: 'url(#goldCurveGrad)',
      }),
      // Cyan curve area
      React.createElement('path', {
        d: 'M 10 125 C 60 105, 100 65, 145 70 C 190 75, 230 110, 275 100 C 315 90, 345 45, 370 52 L 370 135 L 10 135 Z',
        fill: 'url(#cyanCurveGrad)',
      }),
      // Gold smooth spline
      React.createElement('path', {
        d: 'M 10 115 C 50 115, 80 95, 120 98 C 160 100, 200 45, 250 40 C 290 35, 330 90, 370 70',
        fill: 'none',
        stroke: '#f59e0b',
        strokeWidth: '2.5',
        strokeLinecap: 'round',
      }),
      // Cyan smooth spline
      React.createElement('path', {
        d: 'M 10 125 C 60 105, 100 65, 145 70 C 190 75, 230 110, 275 100 C 315 90, 345 45, 370 52',
        fill: 'none',
        stroke: '#00e3fd',
        strokeWidth: '2',
        strokeLinecap: 'round',
      }),
      // Vertical guide beam on peak at x=348
      React.createElement('rect', {
        x: '340',
        y: '20',
        width: '16',
        height: '115',
        rx: '8',
        fill: 'url(#verticalBeamGrad)',
      }),
      React.createElement('circle', {
        cx: '348',
        cy: '48',
        r: '4',
        fill: '#f59e0b',
        stroke: '#ffffff',
        strokeWidth: '2',
      })
    );
  }
  return (
    <View style={{ height: 110, justifyContent: 'center' }}>
      <View style={{ height: 3, backgroundColor: '#f59e0b', borderRadius: 2 }} />
      <View style={{ height: 2, backgroundColor: '#00e3fd', borderRadius: 2, marginTop: 8 }} />
    </View>
  );
};

// Mini sparkline for table rows & cards
const SplineMiniSparkline: React.FC<{ color?: string }> = ({ color = '#f59e0b' }) => {
  if (Platform.OS === 'web') {
    return React.createElement(
      'svg',
      { viewBox: '0 0 70 20', width: 70, height: 20, fill: 'none' },
      React.createElement('path', {
        d: 'M 2 13 C 14 18, 22 4, 34 8 C 46 12, 56 2, 68 11',
        stroke: color,
        strokeWidth: '2',
        strokeLinecap: 'round',
      })
    );
  }
  return <View style={{ width: 40, height: 2, backgroundColor: color }} />;
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
  const { colors, mode, isDark, toggleTheme } = useTheme();
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
    isSuperAdmin,
    userRoleTitle,
    operatorsList,
    clientsList
  } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  // Pulsing animation for live indicators
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const userInitials = useMemo(() => {
    const name = (userName || (isSuperAdmin ? 'Kalioverload' : 'Operador')).trim();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [userName, isSuperAdmin]);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMgmtVisible, setUserMgmtVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);
  const [subsystemFilter, setSubsystemFilter] = useState<'TODOS' | 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO'>('TODOS');

  // Super Admin Fleet & Operators Supervision
  const allPlants = useMemo(() => motos.filter(isPlanta), [motos]);

  const fleetStats = useMemo(() => {
    const total = allPlants.length;
    const online = allPlants.length;
    const attentionNeeded = allPlants.filter(p => !p.assignedOperatorId && !p.assignedOperatorName).length;
    const totalHours = allPlants.reduce((acc, p) => acc + (p.currentHours || p.currentOdometer || 0), 0);
    return { total, online, attentionNeeded, totalHours };
  }, [allPlants]);

  const [selectedStateFilter, setSelectedStateFilter] = useState('Todos');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('Todos');
  const [operatorSearch, setOperatorSearch] = useState('');

  const VENEZUELA_STATES = ['Todos', 'Carabobo', 'Distrito Capital', 'Aragua', 'Zulia', 'Miranda', 'Lara'];
  const DEPARTMENTS = ['Todos', 'Generación Eléctrica', 'Mantenimiento Preventivo', 'Media Tensión', 'Electrónica ComAp'];

  const filteredOperators = useMemo(() => {
    let list = operatorsList || [];
    if (selectedStateFilter !== 'Todos') {
      list = list.filter((op: any) => (op.state || 'Carabobo').toLowerCase() === selectedStateFilter.toLowerCase());
    }
    if (selectedDeptFilter !== 'Todos') {
      list = list.filter((op: any) => (op.department || op.specialty || '').toLowerCase().includes(selectedDeptFilter.toLowerCase()));
    }
    if (operatorSearch.trim()) {
      const q = operatorSearch.toLowerCase().trim();
      list = list.filter((op: any) =>
        (op.full_name || '').toLowerCase().includes(q) ||
        (op.email || '').toLowerCase().includes(q) ||
        (op.operator_code || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [operatorsList, selectedStateFilter, selectedDeptFilter, operatorSearch]);

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;

  const currentHours = useMemo(() => {
    if (!myMoto) return 0;
    return myMoto.currentHours || myMoto.currentOdometer || 0;
  }, [myMoto]);

  const specs = useMemo(() => {
    if (!myMoto) return null;
    return getMotoSpecs(myMoto.brand, myMoto.model);
  }, [myMoto]);

  // Current Plant Catalog Image
  const plantImageSource = useMemo(() => {
    if (!myMoto) return PLANTA_IMG_REQUIRE;
    if (myMoto.imageUrl && myMoto.imageUrl.trim() !== '') {
      return { uri: myMoto.imageUrl };
    }
    const cat = VEHICLE_CATALOG.find(
      (m) =>
        m.brand.toLowerCase() === myMoto.brand.toLowerCase() &&
        m.model.toLowerCase() === myMoto.model.toLowerCase()
    );
    return cat?.imageRes || PLANTA_IMG_REQUIRE;
  }, [myMoto]);

  // Formatted date for header
  const headerDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  // Financial & Fuel Statistics
  const fuelRecords = useMemo(() => records.filter((r) => r.type === 'fuel'), [records]);
  const serviceRecords = useMemo(() => records.filter((r) => r.type !== 'fuel'), [records]);

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
      const match = r.notes?.match(/(\d+(\.\d+)?)/);
      const liters = match ? parseFloat(match[1]) : 0;
      return sum + (isNaN(liters) ? 0 : liters);
    }, 0);
  }, [fuelRecords]);

  // Industrial Subsystems Wear Analysis
  const plantSubsystems = useMemo(() => {
    const list = [
      { id: 'oil' as ComponentType, name: 'Aceite Diésel 15W-40', interval: 250, color: '#1a5cff' },
      { id: 'fuel_filter' as ComponentType, name: 'Filtros Diésel & Racor', interval: 250, color: '#8b5cf6' },
      { id: 'air_filter' as ComponentType, name: 'Filtro Aire Industrial', interval: 500, color: '#f59e0b' },
      { id: 'coolant' as ComponentType, name: 'Circuito Refrigerante & Radiador', interval: 1000, color: '#10b981' },
      { id: 'battery' as ComponentType, name: 'Alternador & Baterías 24V', interval: 2000, color: '#00e3fd' },
      { id: 'accessory_belt' as ComponentType, name: 'Correas Ventilador & Poleas', interval: 1000, color: '#ec4899' },
      { id: 'timing_belt' as ComponentType, name: 'Válvulas e Inyectores', interval: 1500, color: '#6366f1' },
      { id: 'clutch' as ComponentType, name: 'Aisladores Antivibratorios', interval: 3000, color: '#14b8a6' },
      { id: 'transmission_fluid' as ComponentType, name: 'Aislamiento Alternador Leroy', interval: 2500, color: '#f97316' },
      { id: 'cabin_filter' as ComponentType, name: 'Panel ComAp & Sensores', interval: 1200, color: '#06b6d4' },
    ];

    return list.map((item) => {
      const typeRecords = records.filter((r) => r.type === item.id);
      const isInspected = typeRecords.length > 0;
      let wear = 0;
      let hoursSince = 0;
      let hoursRemaining = item.interval;
      let status: 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO' | 'SIN CALIBRAR' = 'SIN CALIBRAR';

      if (isInspected) {
        const lastHours = Math.max(...typeRecords.map((r) => r.odometer || 0));
        hoursSince = Math.max(0, currentHours - lastHours);
        const ratio = Math.max(0, 1 - hoursSince / item.interval);
        wear = Math.min(100, Math.round(ratio * 100));
        hoursRemaining = Math.max(0, item.interval - hoursSince);
        status = wear >= 60 ? 'ÓPTIMO' : wear >= 30 ? 'PREVENTIVO' : 'CRÍTICO';
      } else {
        wear = 0;
        hoursSince = 0;
        hoursRemaining = item.interval;
        status = 'SIN CALIBRAR';
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

  // Overall General Health
  const generalHealth = useMemo(() => {
    const inspected = plantSubsystems.filter((s) => s.isInspected);
    if (inspected.length === 0) return 0;
    const sum = inspected.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / inspected.length);
  }, [plantSubsystems]);

  // Filtered subsystems for Bottom Table Section
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

  // Strict Montserrat font helpers
  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Futuristic SaaS Dark Theme Tokens matching reference screenshot
  const bgMain = isDark ? '#0c0d12' : '#f8fafc';
  const cardBg = isDark ? '#12151e' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';
  const railBg = isDark ? '#0a0b10' : '#ffffff';
  const railBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const accentBlue = '#2563eb';
  const accentCyan = '#00e3fd';
  const pillDarkBg = isDark ? '#181d29' : '#f1f5f9';

  return (
    <View style={[styles.rootContainer, { backgroundColor: bgMain }]}>
      
      {/* 1. LEFT VERTICAL ICON RAIL */}
      {!isMobile && (
        <View style={[styles.sidebarRail, { backgroundColor: railBg, borderRightColor: railBorder }]}>
          {/* TOP BRAND BADGE */}
          <TouchableOpacity
            onPress={() => onSelectTab('moto')}
            style={[styles.brandMarkBadge, { backgroundColor: isDark ? '#161a26' : '#e0f2fe' }]}
            activeOpacity={0.8}
          >
            <Image source={HL_LOGO_REQUIRE} style={styles.brandMarkImg} resizeMode="contain" />
          </TouchableOpacity>

          {/* MIDDLE ICON BUTTONS */}
          <View style={styles.railNavGroup}>
            <TouchableOpacity
              onPress={() => onSelectTab('moto')}
              style={[
                styles.railIconBtn,
                activeTab === 'moto' && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="speed"
                size={22}
                color={activeTab === 'moto' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSelectTab('services')}
              style={[
                styles.railIconBtn,
                activeTab === 'services' && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="build"
                size={22}
                color={activeTab === 'services' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSelectTab('specs')}
              style={[
                styles.railIconBtn,
                activeTab === 'specs' && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="assignment"
                size={22}
                color={activeTab === 'specs' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSelectTab('history')}
              style={[
                styles.railIconBtn,
                activeTab === 'history' && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="receipt-long"
                size={22}
                color={activeTab === 'history' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
            </TouchableOpacity>

            {drivesCompanyVehicle && (
              <TouchableOpacity
                onPress={() => onSelectTab('wallet')}
                style={[
                  styles.railIconBtn,
                  activeTab === 'wallet' && [
                    styles.railIconActivePill,
                    { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                  ],
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="account-balance-wallet"
                  size={22}
                  color={activeTab === 'wallet' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onOpenReport}
              style={styles.railIconBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="picture-as-pdf" size={22} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenStats}
              style={styles.railIconBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="calendar-today" size={20} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAgendaVisible(true)}
              style={[
                styles.railIconBtn,
                agendaVisible && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="clipboard-text-clock"
                size={22}
                color={agendaVisible ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                loadSystemUsers();
                setUserMgmtVisible(true);
              }}
              style={[
                styles.railIconBtn,
                userMgmtVisible && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="manage-accounts"
                size={22}
                color={userMgmtVisible ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
              {(systemMetrics?.pending_approvals || 0) > 0 && (
                <View style={styles.railBadgeDot}>
                  <Text style={styles.railBadgeText}>
                    {systemMetrics.pending_approvals > 9 ? '9+' : systemMetrics.pending_approvals}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* BOTTOM ICONS (THEME & PROFILE) */}
          <View style={styles.railBottomGroup}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.railIconBtn, { backgroundColor: isDark ? '#141721' : '#f1f5f9' }]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isDark ? 'light-mode' : 'dark-mode'}
                size={20}
                color={isDark ? '#ffb703' : '#1a5cff'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSelectTab('profile')}
              style={[
                styles.railIconBtn,
                activeTab === 'profile' && [
                  styles.railIconActivePill,
                  { backgroundColor: isDark ? '#ffffff' : '#1a5cff' },
                ],
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="person"
                size={22}
                color={activeTab === 'profile' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={logout}
              style={[styles.railIconBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2' }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. MAIN BENTO DASHBOARD CONTAINER */}
      <View style={styles.mainContentArea}>
        
        {/* TOP HEADER BAR (Channel Analytics Style) */}
        {isMobile ? (
          <View style={[styles.topHeaderBarMobile, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}>
            {mobileSearchOpen ? (
              <View style={[styles.mobileSearchExpandedRow, { backgroundColor: isDark ? '#1a1f2c' : '#f1f5f9', borderColor: accentCyan }]}>
                <MaterialIcons name="search" size={20} color={accentCyan} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar planta, serial o subsistema..."
                  placeholderTextColor={textSecondary}
                  style={[styles.mobileSearchInput, { color: textPrimary, fontFamily: F.medium }]}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="close" size={18} color={textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setMobileSearchOpen(false);
                    setSearchQuery('');
                  }}
                  style={[styles.mobileSearchCancelBtn, { backgroundColor: isDark ? '#262f40' : '#e2e8f0' }]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={18} color={textPrimary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mobileCollapsedHeaderRow}>
                <TouchableOpacity
                  onPress={() => setMobileMenuOpen(true)}
                  style={[styles.mobileHamburgerBtn, { backgroundColor: isDark ? '#1a1f2c' : '#f1f5f9', borderColor: cardBorder }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="menu" size={22} color={textPrimary} />
                  {(systemMetrics?.pending_approvals || 0) > 0 && (
                    <View style={styles.mobilePendingBadge}>
                      <Text style={styles.mobilePendingBadgeText}>
                        {systemMetrics.pending_approvals > 9 ? '9+' : systemMetrics.pending_approvals}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onSelectTab('moto')}
                  style={styles.mobileBrandCenter}
                  activeOpacity={0.8}
                >
                  <Image source={HL_LOGO_REQUIRE} style={styles.mobileBrandLogo} resizeMode="contain" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ fontFamily: F.extrabold, fontSize: 13, color: textPrimary, letterSpacing: 0.5 }}>
                      HERMANOS LYNCH
                    </Text>
                    <Text style={{ fontFamily: F.semibold, fontSize: 9.5, color: isSuperAdmin ? accentCyan : '#22c55e', letterSpacing: 0.5 }}>
                      {isSuperAdmin ? 'SUPER ADMIN' : (userRoleTitle || 'OPERADOR')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.mobileHeaderRightRow}>
                  <TouchableOpacity
                    onPress={() => setMobileSearchOpen(true)}
                    style={[styles.mobileSearchIconBtn, { backgroundColor: isDark ? '#1a1f2c' : '#f1f5f9', borderColor: cardBorder }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="search" size={20} color={textPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMobileMenuOpen(true)}
                    style={[styles.mobileAvatarBtn, { borderColor: isSuperAdmin ? accentCyan : '#22c55e' }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: isSuperAdmin ? '#275FE3' : '#16a34a', width: 34, height: 34, borderRadius: 17 }]}>
                      <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11 }}>{userInitials}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.topHeaderBar}>
            {/* LARGE TITLE (TEMPLATE "Channel Analytics") */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={[styles.channelAnalyticsTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                Telemetría & Analítica
              </Text>
              <View style={[styles.liveNetBadge, { backgroundColor: 'rgba(0, 227, 253, 0.12)' }]}>
                <Animated.View style={[styles.pulsingGreenDot, { opacity: pulseAnim }]} />
                <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 11, letterSpacing: 0.6 }}>
                  SISTEMA EN VIVO
                </Text>
              </View>
            </View>

            {/* RIGHT HEADER ICONS & SEARCH */}
            <View style={styles.headerRightActions}>
              <View style={[styles.searchPillContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <MaterialIcons name="search" size={18} color={textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar componente, serial..."
                  placeholderTextColor={textSecondary}
                  style={[styles.searchInput, { color: textPrimary, fontFamily: F.medium }]}
                />
              </View>

              {/* ENVELOPE / AGENDA ICON */}
              <TouchableOpacity
                onPress={() => setAgendaVisible(true)}
                style={[styles.headerIconCircle, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="email-outline" size={19} color={textPrimary} />
              </TouchableOpacity>

              {/* NOTIFICATION BELL */}
              <TouchableOpacity
                onPress={onOpenStats}
                style={[styles.headerIconCircle, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="notifications-none" size={20} color={textPrimary} />
                <View style={styles.notifDot} />
              </TouchableOpacity>

              {/* USER PROFILE AVATAR CIRCLE (MATCHING TEMPLATE TOP RIGHT) */}
              <TouchableOpacity
                onPress={() => onSelectTab('profile')}
                style={[styles.headerAvatarCircle, { borderColor: isSuperAdmin ? accentCyan : '#22c55e' }]}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarCircle, { backgroundColor: isSuperAdmin ? '#275FE3' : '#16a34a', width: 36, height: 36, borderRadius: 18 }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>{userInitials}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SCROLLABLE BENTO CONTENT */}
        <ScrollView
          style={[{ flex: 1 }, activeTab !== 'moto' && { display: 'none' }]}
          contentContainerStyle={[
            styles.bentoScrollContent,
            isMobile && { paddingHorizontal: 12, paddingBottom: 150 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ========================================================= */}
          {/* ROW 1: BENTO MASTER SHOWCASE (HERO + 2 STACKED TOP CARDS) */}
          {/* ========================================================= */}
          <View style={[styles.row1MasterContainer, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            
            {/* 1.1 HERO CARD (TEMPLATE "Optimize Your Metrics" & Concentric Glow) */}
            <View style={[
              styles.modernHeroCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
              isDesktop ? { flex: 1.45 } : { width: '100%' }
            ]}>
              {/* Concentric ambient background rings */}
              <View style={styles.concentricCircleRing1} pointerEvents="none" />
              <View style={styles.concentricCircleRing2} pointerEvents="none" />

              {/* Top content row: Text on left, generator image centered/right */}
              <View style={[styles.heroCardContentRow, isMobile && { flexDirection: 'column' }]}>
                {/* Left side: Eyebrow + Big display title + White Action Button */}
                <View style={[styles.heroTextCol, isMobile && { width: '100%' }]}>
                  <Text style={[styles.heroEyebrowText, { color: textSecondary, fontFamily: F.semibold }]}>
                    GRUPO ELECTRÓGENO INDUSTRIAL
                  </Text>
                  
                  <Text style={[styles.heroBigTitle, { color: '#ffffff', fontFamily: F.extrabold, fontSize: isMobile ? 24 : 32 }]}>
                    Potencia Continua{'\n'}& Control Total
                  </Text>

                  <Text style={[styles.heroEquipmentDesc, { color: textSecondary, fontFamily: F.medium }]}>
                    {myMoto ? (myMoto.brand + ' ' + myMoto.model + ' · ' + (myMoto.serialNumber || 'HL-GEN-001')) : 'Blue Power Generation C125'}
                  </Text>

                  {/* White pill button matching template "Start Now" */}
                  <TouchableOpacity
                    onPress={onOpenQuickHours}
                    style={styles.whitePillActionBtn}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add" size={18} color="#0c0e14" />
                    <Text style={[styles.whitePillActionText, { fontFamily: F.bold }]}>
                      + Registrar Horas / Diésel
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Right/Center: Generator showcase with ambient backlight & live pulse */}
                <View style={[styles.heroImageShowcaseCol, isMobile && { marginVertical: 14 }]}>
                  <View style={styles.ambientAtmosphericGlow} />
                  <Image
                    source={plantImageSource}
                    style={[styles.heroShowcaseImg, isMobile && { width: 220, height: 160 }]}
                    resizeMode="contain"
                  />
                  <View style={[styles.heroFloatingPulsePill, { backgroundColor: isDark ? 'rgba(12, 15, 22, 0.92)' : 'rgba(255, 255, 255, 0.92)', borderColor: cardBorder }]}>
                    <Animated.View style={[styles.pulsingGreenDot, { opacity: pulseAnim }]} />
                    <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10, letterSpacing: 0.6 }}>
                      OPERATIVA EN LÍNEA · ISO 8528
                    </Text>
                  </View>
                </View>
              </View>

              {/* 1.2 FLOATING FROSTED GLASS TELEMETRY STRIP (Bottom of Hero Card) */}
              <View style={[styles.floatingFrostedStrip, { backgroundColor: isDark ? 'rgba(18, 22, 34, 0.85)' : 'rgba(255, 255, 255, 0.9)', borderColor: cardBorder }]}>
                {/* Metric 1: Potencia (Cyan Dot) */}
                <View style={styles.frostedMetricCol}>
                  <Text style={[styles.frostedMetricValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 20 }]}>
                    {myMoto ? (myMoto.powerKva || 35) + 'k' : '35k'}
                  </Text>
                  <View style={styles.frostedLabelRow}>
                    <View style={[styles.metricDotIndicator, { backgroundColor: accentCyan }]} />
                    <Text style={[styles.frostedMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Potencia
                    </Text>
                  </View>
                  <View style={[styles.metricAccentUnderline, { backgroundColor: accentCyan }]} />
                </View>

                {/* Metric 2: Horómetro (Magenta / Purple Dot) */}
                <TouchableOpacity onPress={onOpenQuickHours} style={styles.frostedMetricCol} activeOpacity={0.8}>
                  <Text style={[styles.frostedMetricValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 20 }]}>
                    {currentHours > 1000 ? (currentHours / 1000).toFixed(1) + 'k' : currentHours + 'h'}
                  </Text>
                  <View style={styles.frostedLabelRow}>
                    <View style={[styles.metricDotIndicator, { backgroundColor: '#d946ef' }]} />
                    <Text style={[styles.frostedMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Horómetro
                    </Text>
                  </View>
                  <View style={[styles.metricAccentUnderline, { backgroundColor: '#d946ef' }]} />
                </TouchableOpacity>

                {/* Metric 3: Gasto Diésel (Emerald Dot) */}
                <TouchableOpacity onPress={onOpenQuickFuel} style={styles.frostedMetricCol} activeOpacity={0.8}>
                  <Text style={[styles.frostedMetricValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 20 }]}>
                    {totalCostUSD > 0 ? ('$' + (totalCostUSD >= 1000 ? (totalCostUSD / 1000).toFixed(1) + 'k' : totalCostUSD.toFixed(0))) : '$3,6k'}
                  </Text>
                  <View style={styles.frostedLabelRow}>
                    <View style={[styles.metricDotIndicator, { backgroundColor: '#22c55e' }]} />
                    <Text style={[styles.frostedMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Inversión
                    </Text>
                  </View>
                  <View style={[styles.metricAccentUnderline, { backgroundColor: '#22c55e' }]} />
                </TouchableOpacity>

                {/* Metric 4: Salud (Coral / Orange Dot) */}
                <View style={styles.frostedMetricCol}>
                  <Text style={[styles.frostedMetricValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 20 }]}>
                    {generalHealth > 0 ? (generalHealth + '%') : '10'}
                  </Text>
                  <View style={styles.frostedLabelRow}>
                    <View style={[styles.metricDotIndicator, { backgroundColor: '#f97316' }]} />
                    <Text style={[styles.frostedMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Subsistemas
                    </Text>
                  </View>
                  <View style={[styles.metricAccentUnderline, { backgroundColor: '#f97316' }]} />
                </View>

                {/* Next Action Circular Arrow Button ( > ) */}
                <TouchableOpacity
                  onPress={onOpenSpecs}
                  style={styles.frostedArrowCircleBtn}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="chevron-right" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 1.3 RIGHT COLUMN: 2 STACKED CARDS */}
            <View style={[styles.rightStackedCol, isDesktop ? { flex: 1 } : { width: '100%' }]}>
              
              {/* TOP CARD: "Generación en Vivo 💡" (Active Users right now 💡) */}
              <View style={[styles.topSplineWaveCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.splineCardHeaderRow}>
                  <Text style={[styles.splineCardTitle, { color: textPrimary, fontFamily: F.bold }]}>
                    Generación en Vivo 💡
                  </Text>

                  {/* Peak Floating Tooltip Pill */}
                  <View style={styles.splinePeakPillBadge}>
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11 }}>
                      {currentHours > 0 ? ((myMoto?.powerKw || 28) + ' kW') : '50 hrs'}
                    </Text>
                  </View>
                </View>

                {/* Wave Spline Graphic with Y-Axis & X-Axis */}
                <View style={styles.splineGraphArea}>
                  {/* Y-Axis labels */}
                  <View style={styles.splineYAxis}>
                    <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.semibold }]}>60</Text>
                    <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.semibold }]}>40</Text>
                    <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.semibold }]}>20</Text>
                    <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.semibold }]}>0</Text>
                  </View>

                  {/* Dual Spline Wave SVG */}
                  <View style={{ flex: 1, height: 110 }}>
                    <SplineWaveChart isDark={isDark} />
                  </View>
                </View>

                {/* X-Axis month/hour labels */}
                <View style={styles.splineXAxisRow}>
                  <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.medium }]}>Oct</Text>
                  <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.medium }]}>Mar</Text>
                  <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.medium }]}>Jul</Text>
                  <Text style={[styles.splineAxisText, { color: textSecondary, fontFamily: F.medium }]}>Aug</Text>
                </View>
              </View>

              {/* BOTTOM CARD: "Consumo & Diésel" (Latest Sales Split Card) */}
              <View style={[styles.bottomSplitCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Left side: Metric + Sparkline + Earnings */}
                <View style={styles.splitCardLeftHalf}>
                  <Text style={[styles.splitCardEyebrow, { color: textSecondary, fontFamily: F.semibold }]}>
                    Consumo & Diésel
                  </Text>

                  <View style={styles.splitSparklineRow}>
                    <SplineMiniSparkline color="#22c55e" />
                    <View style={styles.greenTrendPercentBadge}>
                      <MaterialIcons name="north-east" size={11} color="#22c55e" />
                      <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>6%</Text>
                    </View>
                  </View>

                  <Text style={[styles.splitBigDollarMetric, { color: '#22c55e', fontFamily: F.extrabold }]}>
                    $ {totalFuelUSD > 0 ? totalFuelUSD.toLocaleString() : '586'}
                  </Text>

                  <View style={styles.splitTotalEarningsRow}>
                    <View style={[styles.miniAssetThumb, { backgroundColor: pillDarkBg }]}>
                      <MaterialIcons name="local-gas-station" size={13} color={accentCyan} />
                    </View>
                    <Text style={[styles.splitEarningsText, { color: textSecondary, fontFamily: F.medium }]}>
                      Gasto acumulado ({totalFuelLiters > 0 ? (totalFuelLiters + ' L') : '420 L'})
                    </Text>
                  </View>
                </View>

                {/* Right side: Inset Squircle Technical Component Card with Ambient Glow */}
                <TouchableOpacity
                  onPress={onOpenSpecs}
                  style={[styles.splitCardRightInset, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: cardBorder }]}
                  activeOpacity={0.85}
                >
                  <View style={styles.ambientSquircleGlow} />
                  <MaterialCommunityIcons name="engine" size={46} color={accentCyan} />
                  <Text style={[styles.squircleAssetName, { color: textSecondary, fontFamily: F.semibold }]} numberOfLines={1}>
                    {specs?.engineType || 'Cummins 4BTA3.9'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>

          </View>

          {/* ========================================================= */}
          {/* ROW 2: SUBSISTEMAS INDUSTRIALES & TELEMETRÍA (TABLE VIEW) */}
          {/* ========================================================= */}
          <View style={[styles.modernSubsystemsTableCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* Table Header Row: Title & Dropdown Filter */}
            <View style={styles.tableTopHeaderRow}>
              <View>
                <Text style={[styles.tableSectionTitle, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 18 }]}>
                  Subsistemas Industriales & Telemetría
                </Text>
                <Text style={[styles.tableSectionSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Monitoreo de desgaste remanente y ciclos de mantenimiento ISO 8528
                </Text>
              </View>

              {/* Status Filter Dropdown Pill */}
              <TouchableOpacity
                onPress={() => {
                  const options: Array<'TODOS' | 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO'> = ['TODOS', 'ÓPTIMO', 'PREVENTIVO', 'CRÍTICO'];
                  const nextIdx = (options.indexOf(subsystemFilter) + 1) % options.length;
                  setSubsystemFilter(options[nextIdx]);
                }}
                style={[styles.tableFilterDropdownPill, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                  Estado: {subsystemFilter}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={17} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Table Column Headers (Desktop/Tablet) */}
            {!isMobile && (
              <View style={[styles.tableColumnsBar, { borderBottomColor: cardBorder }]}>
                <Text style={[styles.colHeadText, { flex: 2.2, color: textSecondary, fontFamily: F.semibold }]}>Componente Industrial</Text>
                <Text style={[styles.colHeadText, { flex: 1.2, color: textSecondary, fontFamily: F.semibold }]}>Lectura de Uso</Text>
                <Text style={[styles.colHeadText, { flex: 1.2, color: textSecondary, fontFamily: F.semibold }]}>Horas Restantes</Text>
                <Text style={[styles.colHeadText, { flex: 1, color: textSecondary, fontFamily: F.semibold }]}>Tendencia</Text>
                <Text style={[styles.colHeadText, { width: 44, textAlign: 'center', color: textSecondary, fontFamily: F.semibold }]}>Acción</Text>
              </View>
            )}

            {/* Table Data Rows */}
            <View style={styles.tableRowsList}>
              {filteredSubsystems.map((sub) => {
                const meta = SUBSYSTEM_META[sub.id] || { icon: 'cog', bg: 'rgba(0, 227, 253, 0.15)', color: accentCyan, desc: 'Componente Industrial' };
                const isGood = sub.wear >= 60;
                const isWarn = sub.wear >= 30 && sub.wear < 60;
                const statusColor = isGood ? '#22c55e' : isWarn ? '#f59e0b' : '#ef4444';

                if (isMobile) {
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => onOpenServicesTab(sub.id)}
                      style={[styles.mobileSubsystemRowCard, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.subsystemSquircleThumb, { backgroundColor: meta.bg }]}>
                          <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.subsystemRowName, { color: textPrimary, fontFamily: F.bold }]}>
                            {sub.name}
                          </Text>
                          <Text style={[styles.subsystemRowDesc, { color: textSecondary, fontFamily: F.medium }]}>
                            {meta.desc}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: F.extrabold, color: statusColor, fontSize: 13 }}>
                          {sub.wear}%
                        </Text>
                      </View>

                      <View style={[styles.mobileRowKpiStrip, { borderTopColor: cardBorder }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.miniStatusDot, { backgroundColor: '#38bdf8' }]} />
                          <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>
                            Uso: {sub.hoursSince} hrs
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.miniStatusDot, { backgroundColor: statusColor }]} />
                          <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 11 }}>
                            Restan: {sub.hoursRemaining} hrs
                          </Text>
                        </View>
                        <SplineMiniSparkline color={statusColor} />
                      </View>
                    </TouchableOpacity>
                  );
                }

                return (
                  <View
                    key={sub.id}
                    style={[styles.desktopTableRow, { borderBottomColor: cardBorder }]}
                  >
                    {/* Col 1: Squircle Icon + Name + Subtitle */}
                    <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.subsystemSquircleThumb, { backgroundColor: meta.bg }]}>
                        <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.subsystemRowName, { color: textPrimary, fontFamily: F.bold }]}>
                          {sub.name}
                        </Text>
                        <Text style={[styles.subsystemRowDesc, { color: textSecondary, fontFamily: F.medium }]} numberOfLines={1}>
                          {meta.desc}
                        </Text>
                      </View>
                    </View>

                    {/* Col 2: Dot + Hours Elapsed */}
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.miniStatusDot, { backgroundColor: '#38bdf8' }]} />
                      <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 12 }}>
                        {sub.hoursSince} hrs uso
                      </Text>
                    </View>

                    {/* Col 3: Dot + Hours Remaining & % */}
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.miniStatusDot, { backgroundColor: statusColor }]} />
                      <Text style={{ fontFamily: F.semibold, color: statusColor, fontSize: 12 }}>
                        {sub.hoursRemaining} hrs ({sub.wear}%)
                      </Text>
                    </View>

                    {/* Col 4: Mini Sparkline Wave */}
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                      <SplineMiniSparkline color={statusColor} />
                    </View>

                    {/* Col 5: Menu options ( ··· ) */}
                    <TouchableOpacity
                      onPress={() => onOpenServicesTab(sub.id)}
                      style={styles.tableRowMenuBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="more-horiz" size={20} color={textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ========================================================= */}
          {/* ROW 3: SUPER ADMIN FLEET & OPERATORS SUPERVISION          */}
          {/* ========================================================= */}
          {isSuperAdmin && (
            <View style={{ marginTop: 24, gap: 20 }}>
              {/* FLOTA DE PLANTAS ELÉCTRICAS EN LÍNEA */}
              <View style={[styles.superFleetContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.superFleetHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={[styles.superFleetTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                        Flota de Plantas Eléctricas en Línea
                      </Text>
                      <View style={[styles.liveFleetPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <View style={styles.greenPulseDot} />
                        <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>
                          {fleetStats.total} EN RED
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.superFleetSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      Selecciona cualquier planta de la red para supervisar sus parámetros y consumos en tiempo real.
                    </Text>
                  </View>

                  <View style={styles.fleetKpiChipsRow}>
                    <View style={[styles.fleetMiniKpi, { backgroundColor: pillDarkBg }]}>
                      <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 10 }}>Total Plantas</Text>
                      <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>{fleetStats.total}</Text>
                    </View>
                    <View style={[styles.fleetMiniKpi, { backgroundColor: pillDarkBg }]}>
                      <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>Operativas</Text>
                      <Text style={{ fontFamily: F.extrabold, color: '#22c55e', fontSize: 16 }}>{fleetStats.online}</Text>
                    </View>
                    <View style={[styles.fleetMiniKpi, { backgroundColor: pillDarkBg }]}>
                      <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 10 }}>Horas Flota</Text>
                      <Text style={{ fontFamily: F.extrabold, color: accentCyan, fontSize: 16 }}>{fleetStats.totalHours.toLocaleString()}h</Text>
                    </View>
                  </View>
                </View>

                {/* Plant Cards Scroll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fleetCardsScroll}>
                  {allPlants.map((plant) => {
                    const isSelected = myMoto?.id === plant.id;
                    const opName = plant.assignedOperatorName || 'Por Asignar';
                    const kva = plant.powerKva || 35;

                    return (
                      <TouchableOpacity
                        key={plant.id}
                        onPress={() => selectMoto(plant.id)}
                        style={[
                          styles.fleetPlantCard,
                          {
                            backgroundColor: isSelected ? (isDark ? '#1a2236' : '#eff6ff') : pillDarkBg,
                            borderColor: isSelected ? accentBlue : cardBorder,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={styles.fleetPlantCardHeader}>
                          <View style={{ flex: 1, paddingRight: 6 }}>
                            <Text style={[styles.fleetPlantModel, { color: textPrimary, fontFamily: F.extrabold }]} numberOfLines={1}>
                              {plant.model} · {kva} kVA
                            </Text>
                            <Text style={[styles.fleetPlantBrand, { color: textSecondary, fontFamily: F.medium }]} numberOfLines={1}>
                              {plant.brand}
                            </Text>
                          </View>
                          <View style={[styles.onlineStatusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                            <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 9 }}>EN LÍNEA</Text>
                          </View>
                        </View>

                        <View style={styles.fleetPlantLocationRow}>
                          <MaterialIcons name="place" size={14} color={accentCyan} />
                          <Text style={[styles.fleetPlantLocationText, { color: textPrimary, fontFamily: F.semibold }]} numberOfLines={1}>
                            {plant.location || 'Sede Principal'}
                          </Text>
                        </View>

                        <View style={styles.fleetPlantOperatorRow}>
                          <MaterialIcons name="engineering" size={14} color={textSecondary} />
                          <Text style={[styles.fleetPlantOperatorText, { color: textSecondary, fontFamily: F.medium }]} numberOfLines={1}>
                            Operador: <Text style={{ fontFamily: F.bold, color: plant.assignedOperatorName ? accentBlue : '#f59e0b' }}>{opName}</Text>
                          </Text>
                        </View>

                        <View style={styles.fleetPlantCardFooter}>
                          <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 11 }}>
                            Horas: <Text style={{ fontFamily: F.extrabold, color: textPrimary }}>{(plant.currentHours || 0).toLocaleString()} hrs</Text>
                          </Text>
                          <View style={[styles.selectPlantIndicator, { backgroundColor: isSelected ? accentBlue : 'transparent' }]}>
                            <Text style={{ fontFamily: F.bold, color: isSelected ? '#ffffff' : textSecondary, fontSize: 10 }}>
                              {isSelected ? 'ACTIVA' : 'SUPERVISAR →'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* SUPERVISIÓN DE OPERADORES Y FLOTA DE VEHÍCULOS */}
              <View style={[styles.superOperatorsContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.superOperatorsHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={[styles.superFleetTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                        Supervisión de Operadores y Flota de Vehículos
                      </Text>
                      <View style={[styles.liveFleetPill, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                        <MaterialIcons name="badge" size={13} color={accentBlue} />
                        <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 10 }}>
                          {operatorsList.length} OPERADORES ACTIVOS
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.superFleetSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      Organización territorial por Estado, País, Departamento técnico y consumo de combustible corporativo.
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      loadSystemUsers();
                      setUserMgmtVisible(true);
                    }}
                    style={[styles.manageUsersQuickBtn, { backgroundColor: accentBlue }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="person-add" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                      Gestionar / Crear Operador
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Filtros Geográficos y Departamentales */}
                <View style={styles.filterSectionBox}>
                  <View style={styles.filterGroupRow}>
                    <Text style={[styles.filterGroupLabel, { color: textSecondary, fontFamily: F.bold }]}>
                      ESTADO:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {VENEZUELA_STATES.map((st) => (
                        <TouchableOpacity
                          key={st}
                          onPress={() => setSelectedStateFilter(st)}
                          style={[
                            styles.filterChip,
                            {
                              backgroundColor: selectedStateFilter === st ? accentBlue : pillDarkBg,
                              borderColor: selectedStateFilter === st ? accentBlue : cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: selectedStateFilter === st ? F.bold : F.medium,
                              color: selectedStateFilter === st ? '#ffffff' : textSecondary,
                              fontSize: 11,
                            }}
                          >
                            {st}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={[styles.filterGroupRow, { marginTop: 8 }]}>
                    <Text style={[styles.filterGroupLabel, { color: textSecondary, fontFamily: F.bold }]}>
                      DEPARTAMENTO:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {DEPARTMENTS.map((dept) => (
                        <TouchableOpacity
                          key={dept}
                          onPress={() => setSelectedDeptFilter(dept)}
                          style={[
                            styles.filterChip,
                            {
                              backgroundColor: selectedDeptFilter === dept ? accentCyan : pillDarkBg,
                              borderColor: selectedDeptFilter === dept ? accentCyan : cardBorder,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: selectedDeptFilter === dept ? F.bold : F.medium,
                              color: selectedDeptFilter === dept ? '#0c0e14' : textSecondary,
                              fontSize: 11,
                            }}
                          >
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={[styles.operatorSearchInputRow, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}>
                    <MaterialIcons name="search" size={18} color={textSecondary} />
                    <TextInput
                      value={operatorSearch}
                      onChangeText={setOperatorSearch}
                      placeholder="Buscar operador por nombre, carnet HL o correo..."
                      placeholderTextColor={textSecondary}
                      style={{ flex: 1, fontFamily: F.medium, color: textPrimary, fontSize: 12 }}
                    />
                    {operatorSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setOperatorSearch('')}>
                        <MaterialIcons name="clear" size={16} color={textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Operators Grid */}
                <View style={styles.operatorsCardsGrid}>
                  {filteredOperators.map((op: any) => {
                    const initials = (op.full_name || 'OP')
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    const assignedPlants = allPlants.filter(
                      (p) =>
                        p.assignedOperatorId === op.id ||
                        (p.assignedOperatorName && op.full_name && p.assignedOperatorName.toLowerCase().trim() === op.full_name.toLowerCase().trim())
                    );

                    const hasVehicle = !!op.drives_company_vehicle || !!op.assigned_vehicle_name;
                    const vehicleName = op.assigned_vehicle_name || (hasVehicle ? 'Toyota Hilux Soporte HL-01' : 'Sin vehículo asignado');
                    const vehiclePlate = op.assigned_vehicle_plate || 'A10BC2D';

                    return (
                      <View key={op.id} style={[styles.operatorSuperCard, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}>
                        <View style={styles.operatorSuperCardTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[styles.operatorSuperAvatar, { backgroundColor: accentBlue }]}>
                              <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 14 }}>{initials}</Text>
                            </View>
                            <View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.operatorSuperName, { color: textPrimary, fontFamily: F.extrabold }]}>
                                  {op.full_name || 'Operador Técnico'}
                                </Text>
                                <MaterialIcons name="verified" size={14} color="#22c55e" />
                              </View>
                              <Text style={{ fontFamily: F.semibold, color: accentCyan, fontSize: 11 }}>
                                Carnet: {op.operator_code || 'HL-TECH-3018'} · {op.specialty || 'Especialista Técnico Senior'}
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.locationMiniTag, { backgroundColor: cardBg }]}>
                            <MaterialIcons name="place" size={12} color={accentCyan} />
                            <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 10 }}>
                              {op.state || 'Carabobo'}, Venezuela
                            </Text>
                          </View>
                        </View>

                        {/* Plantas Asignadas */}
                        <View style={[styles.opResourcesBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                          <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 10.5, marginBottom: 4 }}>
                            PLANTAS BAJO SU CONTROL ({assignedPlants.length}):
                          </Text>
                          {assignedPlants.length === 0 ? (
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, fontStyle: 'italic' }}>
                              Sin plantas asignadas actualmente
                            </Text>
                          ) : (
                            assignedPlants.map((ap) => (
                              <TouchableOpacity
                                key={ap.id}
                                onPress={() => selectMoto(ap.id)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 2 }}
                              >
                                <MaterialIcons name="bolt" size={14} color="#f59e0b" />
                                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11.5 }}>
                                  {ap.brand} {ap.model} ({ap.location || 'Sede Principal'})
                                </Text>
                                <MaterialIcons name="arrow-forward" size={12} color={accentCyan} />
                              </TouchableOpacity>
                            ))
                          )}
                        </View>

                        {/* Vehículo Asignado */}
                        <View style={[styles.opResourcesBox, { backgroundColor: cardBg, borderColor: cardBorder, marginTop: 8 }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 10.5 }}>
                              VEHÍCULO DE EMPRESA ASIGNADO:
                            </Text>
                            <Text style={{ fontFamily: F.bold, color: hasVehicle ? '#22c55e' : textSecondary, fontSize: 10 }}>
                              {hasVehicle ? 'ACTIVO' : 'NO ASIGNADO'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name={hasVehicle ? "directions-car" : "car-crash"} size={14} color={hasVehicle ? accentBlue : textSecondary} />
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11.5 }}>
                              {vehicleName}
                            </Text>
                            {hasVehicle && (
                              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                                (Placa: {vehiclePlate})
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Acciones */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                          <TouchableOpacity
                            onPress={() => {
                              const rawDigits = (op.phone || '584143059921').replace(/\D/g, '');
                              const phone = rawDigits.startsWith('58') ? rawDigits : ('58' + rawDigits.replace(/^0/, ''));
                              const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent('Hola ' + op.full_name + ', te contacto desde la consola de Hermanos Lynch.');
                              Linking.openURL(url).catch(() => {});
                            }}
                            style={[styles.opDirectActionBtn, { backgroundColor: '#25D366' }]}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons name="whatsapp" size={14} color="#ffffff" />
                            <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11 }}>WhatsApp</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              loadSystemUsers();
                              setUserMgmtVisible(true);
                            }}
                            style={[styles.opDirectActionBtn, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="settings" size={14} color={textPrimary} />
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>Control</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

        </ScrollView>

        {/* PERSISTENT SUB-TABS (SPECS, SERVICES, HISTORY, WALLET, PROFILE) */}
        <View style={[{ flex: 1 }, activeTab !== 'moto' && { display: 'none' }]}>
          {children}
        </View>
      </View>

      {/* MOBILE FLOATING BOTTOM NAVIGATION DOCK */}
      {isMobile && (
        <View style={[styles.mobileBottomNav, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TouchableOpacity
            onPress={() => onSelectTab('moto')}
            style={[styles.mobileNavItem, activeTab === 'moto' && styles.mobileNavItemActive]}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="speed"
              size={20}
              color={activeTab === 'moto' ? accentCyan : textSecondary}
            />
            <Text style={[styles.mobileNavLabel, { color: activeTab === 'moto' ? accentCyan : textSecondary, fontFamily: activeTab === 'moto' ? F.bold : F.medium }]}>
              Planta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectTab('services')}
            style={[styles.mobileNavItem, activeTab === 'services' && styles.mobileNavItemActive]}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="build"
              size={20}
              color={activeTab === 'services' ? accentCyan : textSecondary}
            />
            <Text style={[styles.mobileNavLabel, { color: activeTab === 'services' ? accentCyan : textSecondary, fontFamily: activeTab === 'services' ? F.bold : F.medium }]}>
              Servicios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectTab('specs')}
            style={[styles.mobileNavItem, activeTab === 'specs' && styles.mobileNavItemActive]}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="assignment"
              size={20}
              color={activeTab === 'specs' ? accentCyan : textSecondary}
            />
            <Text style={[styles.mobileNavLabel, { color: activeTab === 'specs' ? accentCyan : textSecondary, fontFamily: activeTab === 'specs' ? F.bold : F.medium }]}>
              Ficha
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectTab('history')}
            style={[styles.mobileNavItem, activeTab === 'history' && styles.mobileNavItemActive]}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="receipt-long"
              size={20}
              color={activeTab === 'history' ? accentCyan : textSecondary}
            />
            <Text style={[styles.mobileNavLabel, { color: activeTab === 'history' ? accentCyan : textSecondary, fontFamily: activeTab === 'history' ? F.bold : F.medium }]}>
              Historial
            </Text>
          </TouchableOpacity>

          {drivesCompanyVehicle && (
            <TouchableOpacity
              onPress={() => onSelectTab('wallet')}
              style={[styles.mobileNavItem, activeTab === 'wallet' && styles.mobileNavItemActive]}
              activeOpacity={0.75}
            >
              <MaterialIcons
                name="account-balance-wallet"
                size={20}
                color={activeTab === 'wallet' ? accentCyan : textSecondary}
              />
              <Text style={[styles.mobileNavLabel, { color: activeTab === 'wallet' ? accentCyan : textSecondary, fontFamily: activeTab === 'wallet' ? F.bold : F.medium }]}>
                Flota
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onSelectTab('profile')}
            style={[styles.mobileNavItem, activeTab === 'profile' && styles.mobileNavItemActive]}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="person"
              size={20}
              color={activeTab === 'profile' ? accentCyan : textSecondary}
            />
            <Text style={[styles.mobileNavLabel, { color: activeTab === 'profile' ? accentCyan : textSecondary, fontFamily: activeTab === 'profile' ? F.bold : F.medium }]}>
              Perfil
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* USER MANAGEMENT MODAL */}
      <UserManagementModal
        visible={userMgmtVisible}
        onClose={() => setUserMgmtVisible(false)}
      />

      {/* OPERATOR AGENDA MODAL */}
      <OperatorAgendaModal
        visible={agendaVisible}
        onClose={() => setAgendaVisible(false)}
      />

      {/* APPLE STYLE MOBILE MENU DRAWER */}
      <Modal
        visible={mobileMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMobileMenuOpen(false)}
      >
        <View style={styles.mobileMenuOverlay}>
          <TouchableOpacity
            style={styles.mobileMenuBackdrop}
            activeOpacity={1}
            onPress={() => setMobileMenuOpen(false)}
          />

          <View style={[styles.mobileMenuDrawer, { backgroundColor: isDark ? '#121316' : '#f2f2f7', borderColor: cardBorder }]}>
            <View style={[styles.appleGrabberBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }]} />

            <View style={[styles.appleProfileCard, { backgroundColor: isDark ? '#1c1e24' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.avatarCircle, { backgroundColor: isSuperAdmin ? '#007AFF' : '#34C759', width: 44, height: 44, borderRadius: 22 }]}>
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 15 }}>{userInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: textPrimary, letterSpacing: -0.2 }} numberOfLines={1}>
                  {userName || (isSuperAdmin ? 'Kalioverload' : 'Operador')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={[
                    styles.appleRoleBadge,
                    {
                      backgroundColor: isSuperAdmin ? 'rgba(0, 122, 255, 0.12)' : 'rgba(52, 199, 89, 0.12)',
                      borderColor: isSuperAdmin ? 'rgba(0, 122, 255, 0.3)' : 'rgba(52, 199, 89, 0.3)',
                    }
                  ]}>
                    <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: isSuperAdmin ? '#007AFF' : '#34C759' }}>
                      {isSuperAdmin ? 'SUPER ADMIN' : (userRoleTitle || 'OPERADOR')}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    {headerDate}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setMobileMenuOpen(false)}
                style={[styles.appleCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={17} color={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.appleSectionHeader}>OPERACIONES RÁPIDAS</Text>
              <View style={[styles.appleGroupCard, { backgroundColor: isDark ? '#1c1e24' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    loadSystemUsers();
                    setUserMgmtVisible(true);
                  }}
                  style={styles.appleGroupRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#007AFF' }]}>
                    <MaterialIcons name="group" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: textPrimary, fontFamily: F.semibold }]}>
                      Control de Usuarios
                    </Text>
                    <Text style={[styles.appleRowSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      {(systemMetrics?.pending_approvals || 0) > 0 ? (systemMetrics.pending_approvals + ' pendientes') : 'Aprobaciones y roles'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>

                <View style={[styles.appleHairlineDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    setAgendaVisible(true);
                  }}
                  style={styles.appleGroupRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#5856D6' }]}>
                    <MaterialCommunityIcons name="calendar-clock" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: textPrimary, fontFamily: F.semibold }]}>
                      Agenda y Casos Técnicos
                    </Text>
                    <Text style={[styles.appleRowSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      Revisiones de clientes en campo
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>

                <View style={[styles.appleHairlineDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onOpenQuickHours();
                  }}
                  style={styles.appleGroupRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#34C759' }]}>
                    <MaterialIcons name="add" size={18} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: textPrimary, fontFamily: F.semibold }]}>
                      Actualizar Horómetro
                    </Text>
                    <Text style={[styles.appleRowSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      Lectura en sitio de horas motor
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>

                <View style={[styles.appleHairlineDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onOpenQuickFuel();
                  }}
                  style={styles.appleGroupRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#FF9500' }]}>
                    <MaterialIcons name="local-gas-station" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: textPrimary, fontFamily: F.semibold }]}>
                      Registrar Carga de Diésel
                    </Text>
                    <Text style={[styles.appleRowSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      Litros despachados y consumo
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>
              </View>

              <Text style={styles.appleSectionHeader}>NAVEGACIÓN</Text>
              <View style={[styles.appleGroupCard, { backgroundColor: isDark ? '#1c1e24' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onSelectTab('moto');
                  }}
                  style={[styles.appleGroupRow, activeTab === 'moto' && { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#007AFF' }]}>
                    <MaterialIcons name="speed" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: activeTab === 'moto' ? '#007AFF' : textPrimary, fontFamily: F.bold }]}>
                      Planta Eléctrica / Inicio
                    </Text>
                  </View>
                  {activeTab === 'moto' ? (
                    <MaterialIcons name="check" size={18} color="#007AFF" />
                  ) : (
                    <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                  )}
                </TouchableOpacity>

                <View style={[styles.appleHairlineDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onSelectTab('services');
                  }}
                  style={[styles.appleGroupRow, activeTab === 'services' && { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#FF9500' }]}>
                    <MaterialIcons name="build" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: activeTab === 'services' ? '#007AFF' : textPrimary, fontFamily: F.bold }]}>
                      Servicios & Mantenimiento
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>

                <View style={[styles.appleHairlineDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onSelectTab('specs');
                  }}
                  style={[styles.appleGroupRow, activeTab === 'specs' && { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#AF52DE' }]}>
                    <MaterialIcons name="assignment" size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: activeTab === 'specs' ? '#007AFF' : textPrimary, fontFamily: F.bold }]}>
                      Ficha Técnica Industrial
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>
              </View>

              <Text style={styles.appleSectionHeader}>PREFERENCIAS</Text>
              <View style={[styles.appleGroupCard, { backgroundColor: isDark ? '#1c1e24' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity
                  onPress={toggleTheme}
                  style={styles.appleGroupRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appleSquircleIcon, { backgroundColor: '#FFCC00' }]}>
                    <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={17} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appleRowTitle, { color: textPrimary, fontFamily: F.semibold }]}>
                      {isDark ? 'Modo Claro' : 'Modo Oscuro'}
                    </Text>
                    <Text style={[styles.appleRowSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      {isDark ? 'Activar paleta diurna' : 'Activar paleta nocturna OLED'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={19} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                style={[styles.appleSignOutCard, { backgroundColor: isDark ? '#1c1e24' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="logout" size={17} color="#FF3B30" />
                <Text style={[styles.appleSignOutText, { fontFamily: F.bold }]}>
                  Cerrar Sesión Segura
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  sidebarRail: {
    width: 76,
    borderRightWidth: 1,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  brandMarkBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandMarkImg: {
    width: 26,
    height: 26,
  },
  railNavGroup: {
    gap: 12,
    alignItems: 'center',
  },
  railIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  railIconActivePill: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  railBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#090a0f',
  },
  railBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  railBottomGroup: {
    gap: 12,
    alignItems: 'center',
  },
  mainContentArea: {
    flex: 1,
    height: '100%',
  },

  // Channel Analytics Top Header Bar
  topHeaderBar: {
    paddingHorizontal: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  channelAnalyticsTitle: {
    fontSize: 26,
    letterSpacing: -0.6,
  },
  liveNetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulsingGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchPillContainer: {
    width: 240,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  headerAvatarCircle: {
    padding: 2,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mobile Top Header Bar
  topHeaderBarMobile: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    zIndex: 25,
  },
  mobileSearchExpandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    gap: 10,
  },
  mobileSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  mobileSearchCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileCollapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  mobileHamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mobilePendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0c0e14',
  },
  mobilePendingBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  mobileBrandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  mobileBrandLogo: {
    width: 26,
    height: 26,
  },
  mobileHeaderRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileSearchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileAvatarBtn: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 1.5,
  },

  bentoScrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 60,
  },

  // =========================================================
  // ROW 1: BENTO MASTER SHOWCASE STYLES
  // =========================================================
  row1MasterContainer: {
    gap: 20,
    marginBottom: 20,
  },

  // 1.1 HERO CARD STYLES
  modernHeroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    minHeight: 400,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  concentricCircleRing1: {
    position: 'absolute',
    right: -40,
    top: '15%',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  concentricCircleRing2: {
    position: 'absolute',
    right: 10,
    top: '25%',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroCardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  heroTextCol: {
    flex: 1.1,
    paddingRight: 10,
  },
  heroEyebrowText: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroBigTitle: {
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroEquipmentDesc: {
    fontSize: 12.5,
    marginBottom: 20,
  },
  whitePillActionBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 26,
    alignSelf: 'flex-start',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  whitePillActionText: {
    color: '#0c0e14',
    fontSize: 12.5,
  },
  heroImageShowcaseCol: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 200,
  },
  ambientAtmosphericGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 227, 253, 0.14)',
    ...(Platform.OS === 'web' ? { filter: 'blur(50px)' } : {}),
  },
  heroShowcaseImg: {
    width: 260,
    height: 190,
    zIndex: 2,
  },
  heroFloatingPulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -8,
    zIndex: 3,
  },

  // 1.2 FLOATING FROSTED GLASS TELEMETRY STRIP
  floatingFrostedStrip: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    zIndex: 3,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)' } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  frostedMetricCol: {
    alignItems: 'flex-start',
  },
  frostedMetricValue: {
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  frostedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metricDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  frostedMetricLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  metricAccentUnderline: {
    width: '100%',
    height: 2,
    borderRadius: 1,
  },
  frostedArrowCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0c0e14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 1.3 RIGHT COLUMN: 2 STACKED CARDS
  rightStackedCol: {
    gap: 20,
  },
  topSplineWaveCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    minHeight: 190,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  splineCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splineCardTitle: {
    fontSize: 14.5,
  },
  splinePeakPillBadge: {
    backgroundColor: '#0c0e14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  splineGraphArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 10,
  },
  splineYAxis: {
    justifyContent: 'space-between',
    height: '100%',
    paddingBottom: 4,
  },
  splineAxisText: {
    fontSize: 10,
  },
  splineXAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 30,
    paddingRight: 10,
    marginTop: 4,
  },

  bottomSplitCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    minHeight: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  splitCardLeftHalf: {
    flex: 1.1,
    justifyContent: 'space-between',
    height: '100%',
  },
  splitCardEyebrow: {
    fontSize: 12.5,
    marginBottom: 4,
  },
  splitSparklineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  greenTrendPercentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  splitBigDollarMetric: {
    fontSize: 26,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  splitTotalEarningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAssetThumb: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitEarningsText: {
    fontSize: 11,
  },
  splitCardRightInset: {
    flex: 0.9,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientSquircleGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 227, 253, 0.14)',
    ...(Platform.OS === 'web' ? { filter: 'blur(20px)' } : {}),
  },
  squircleAssetName: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },

  // =========================================================
  // ROW 2: SUBSISTEMAS TABLE VIEW STYLES
  // =========================================================
  modernSubsystemsTableCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  tableTopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  tableSectionTitle: {
    letterSpacing: -0.4,
  },
  tableSectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tableFilterDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  tableColumnsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  colHeadText: {
    fontSize: 11.5,
    letterSpacing: 0.5,
  },
  tableRowsList: {
    gap: 4,
  },
  desktopTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mobileSubsystemRowCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  mobileRowKpiStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  subsystemSquircleThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subsystemRowName: {
    fontSize: 13.5,
  },
  subsystemRowDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tableRowMenuBtn: {
    width: 44,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // =========================================================
  // ROW 3: SUPER ADMIN FLEET & OPERATORS STYLES
  // =========================================================
  superFleetContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  superFleetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
  },
  superFleetTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  superFleetSubtitle: {
    fontSize: 12,
    maxWidth: 520,
    marginTop: 2,
  },
  liveFleetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  fleetKpiChipsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  fleetMiniKpi: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 85,
  },
  fleetCardsScroll: {
    gap: 14,
    paddingVertical: 4,
  },
  fleetPlantCard: {
    width: 260,
    borderRadius: 18,
    padding: 16,
  },
  fleetPlantCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  fleetPlantModel: {
    fontSize: 15,
  },
  fleetPlantBrand: {
    fontSize: 11,
    marginTop: 1,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fleetPlantLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fleetPlantLocationText: {
    fontSize: 11.5,
    flex: 1,
  },
  fleetPlantOperatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  fleetPlantOperatorText: {
    fontSize: 11,
    flex: 1,
  },
  fleetPlantCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  selectPlantIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  superOperatorsContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  superOperatorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
  },
  manageUsersQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  filterSectionBox: {
    marginBottom: 16,
  },
  filterGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterGroupLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  operatorSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 38,
    marginTop: 12,
  },
  operatorsCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  operatorSuperCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  operatorSuperCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  operatorSuperAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorSuperName: {
    fontSize: 14,
  },
  locationMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  opResourcesBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  opDirectActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },

  // MOBILE BOTTOM NAVIGATION
  mobileBottomNav: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 14,
  },
  mobileNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  mobileNavItemActive: {
    backgroundColor: 'rgba(0, 227, 253, 0.12)',
  },
  mobileNavLabel: {
    fontSize: 9.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // APPLE DRAWER STYLES
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-start',
  },
  mobileMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mobileMenuDrawer: {
    width: '86%',
    maxWidth: 360,
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  appleGrabberBar: {
    width: 36,
    height: 4.5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 14,
  },
  appleProfileCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  appleRoleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  appleCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleSectionHeader: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8E8E93',
    marginLeft: 10,
    marginTop: 16,
    marginBottom: 6,
  },
  appleGroupCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  appleGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  appleSquircleIcon: {
    width: 29,
    height: 29,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleRowTitle: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  appleRowSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  appleHairlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 53,
  },
  appleSignOutCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    marginBottom: 32,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleSignOutText: {
    color: '#FF3B30',
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
});
