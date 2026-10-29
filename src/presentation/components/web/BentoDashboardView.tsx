import React, { useState, useMemo } from 'react';
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
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(3); // Default highlighted bar
  const [userMgmtVisible, setUserMgmtVisible] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(false);

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

  const isVehiclePlanta = myMoto ? isPlanta(myMoto) : true;
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
  // Real fuel liters computed strictly from actual diesel records
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
        // Inicial en cero: el operador asignado debe realizar la inspección y registrar el estado inicial
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

  // Filtered subsystems based on search query
  const filteredSubsystems = useMemo(() => {
    if (!searchQuery.trim()) return plantSubsystems;
    const q = searchQuery.toLowerCase().trim();
    return plantSubsystems.filter(
      (sub) => sub.name.toLowerCase().includes(q) || sub.id.toLowerCase().includes(q)
    );
  }, [plantSubsystems, searchQuery]);

  // Overall General Health
  const generalHealth = useMemo(() => {
    const inspected = plantSubsystems.filter((s) => s.isInspected);
    if (inspected.length === 0) return 0;
    const sum = inspected.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / inspected.length);
  }, [plantSubsystems]);

  // Dynamic Real Generation Bar Chart Data (last 8 days ending today)
  const barChartPeriods = useMemo(() => {
    const periods = [];
    const today = new Date();
    
    // Group records by day
    const recordsByDay = new Map<string, number>();
    records.forEach((r) => {
      if (r.date) {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const hours = r.odometer || 0;
        const current = recordsByDay.get(key) || 0;
        recordsByDay.set(key, Math.max(current, hours));
      }
    });

    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayNum = d.getDate();
      const monthStr = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
      const label = `${dayNum} ${monthStr}`;
      
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let dayHours = recordsByDay.get(key) || 0;
      if (i === 0 && dayHours === 0 && currentHours > 0 && records.length <= 1) {
        dayHours = currentHours;
      }

      periods.push({
        label,
        hours: dayHours,
        active: i === 0,
      });
    }

    return periods;
  }, [records, currentHours]);

  const maxPeriodHours = useMemo(() => {
    const maxRecorded = Math.max(...barChartPeriods.map((p) => p.hours), 0);
    if (maxRecorded === 0) return 20;
    return Math.ceil((maxRecorded * 1.25) / 10) * 10;
  }, [barChartPeriods]);

  // 1. Horas metrics (real delta or status)
  const hoursMetrics = useMemo(() => {
    if (currentHours === 0) {
      return {
        badgeText: '0 hrs',
        badgeColor: '#00b4d8',
        badgeBg: 'rgba(0, 180, 216, 0.15)',
        icon: 'timer' as const,
        subtext: 'Horómetro inicial',
      };
    }
    const hourRecords = records
      .filter((r) => (r.odometer || 0) > 0)
      .sort((a, b) => (b.odometer || 0) - (a.odometer || 0));
    
    if (hourRecords.length >= 2) {
      const delta = (hourRecords[0].odometer || 0) - (hourRecords[1].odometer || 0);
      if (delta > 0) {
        return {
          badgeText: `+${delta} hrs`,
          badgeColor: '#22c55e',
          badgeBg: 'rgba(34, 197, 94, 0.15)',
          icon: 'north-east' as const,
          subtext: 'vs registro anterior',
        };
      }
    }
    return {
      badgeText: `${currentHours.toLocaleString()} hrs`,
      badgeColor: '#22c55e',
      badgeBg: 'rgba(34, 197, 94, 0.15)',
      icon: 'check-circle' as const,
      subtext: 'Generación acumulada',
    };
  }, [currentHours, records]);

  // 2. Pending services metric (real calculated pending/critical from 10 subsystems)
  const pendingPreventives = useMemo(() => {
    return plantSubsystems.filter((s) => s.status === 'PREVENTIVO' || s.status === 'CRÍTICO').length;
  }, [plantSubsystems]);

  const serviceMetrics = useMemo(() => {
    if (pendingPreventives > 0) {
      return {
        badgeText: `${pendingPreventives} en espera`,
        badgeColor: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        subtext: 'Preventivos requeridos',
      };
    }
    return {
      badgeText: 'Al día',
      badgeColor: '#22c55e',
      badgeBg: 'rgba(34, 197, 94, 0.15)',
      subtext: '0 en espera',
    };
  }, [pendingPreventives]);

  // 3. Fuel Metrics (real parsed total liters and logs)
  const fuelMetrics = useMemo(() => {
    if (fuelRecords.length === 0 || totalFuelLiters === 0) {
      return {
        badgeText: 'Sin cargas',
        badgeColor: '#8e96aa',
        badgeBg: 'rgba(142, 150, 170, 0.12)',
        icon: 'local-gas-station' as const,
        subtext: '0 L despachados',
      };
    }
    return {
      badgeText: `${fuelRecords.length} carga${fuelRecords.length > 1 ? 's' : ''}`,
      badgeColor: '#22c55e',
      badgeBg: 'rgba(34, 197, 94, 0.15)',
      icon: 'check' as const,
      subtext: `$${totalFuelUSD.toFixed(0)} USD invertidos`,
    };
  }, [fuelRecords.length, totalFuelLiters, totalFuelUSD]);

  // 4. Subsystem Health Metrics
  const healthMetrics = useMemo(() => {
    const optimalCount = plantSubsystems.filter((s) => s.wear >= 60).length;
    if (optimalCount === 10) {
      return {
        badgeText: '10/10 Óptimos',
        badgeColor: '#22c55e',
        badgeBg: 'rgba(34, 197, 94, 0.15)',
        icon: 'verified' as const,
        subtext: '10 subsistemas al 100%',
      };
    }
    return {
      badgeText: `${10 - optimalCount} por revisar`,
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      icon: 'warning' as const,
      subtext: `${optimalCount}/10 óptimos`,
    };
  }, [plantSubsystems]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Modern Figma tokens based on the uploaded reference
  const bgMain = isDark ? '#0c0e14' : '#f4f6fa';
  const cardBg = isDark ? '#141721' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
  const railBg = isDark ? '#090a0f' : '#ffffff';
  const railBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#8e96aa' : '#64748b';
  const accentBlue = '#1a5cff';
  const accentCyan = '#00b4d8';
  const pillDarkBg = isDark ? '#1c202d' : '#e2e8f0';

  return (
    <View style={[styles.rootContainer, { backgroundColor: bgMain }]}>
      
      {/* 1. LEFT VERTICAL ICON RAIL (MATCHING REFERENCE EXACTLY) */}
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
          {/* DASHBOARD / PLANTA */}
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

          {/* SERVICIOS / MANTENIMIENTO */}
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

          {/* FICHA TÉCNICA */}
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

          {/* HISTORIAL */}
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

          {/* WALLET (CONDICIONAL) */}
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

          {/* EXPEDIENTE PDF */}
          <TouchableOpacity
            onPress={onOpenReport}
            style={styles.railIconBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="picture-as-pdf" size={22} color={textSecondary} />
          </TouchableOpacity>

          {/* CALENDARIO */}
          <TouchableOpacity
            onPress={onOpenStats}
            style={styles.railIconBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="calendar-today" size={20} color={textSecondary} />
          </TouchableOpacity>

          {/* AGENDA DE CLIENTES E INQUIETUDES TÉCNICAS */}
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

          {/* GESTIÓN DE USUARIOS Y OPERADORES (SUPERADMIN) */}
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
        
        {/* TOP HEADER BAR */}
        {isMobile ? (
          <View style={[styles.topHeaderBarMobile, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}>
            {mobileSearchOpen ? (
              /* EXPANDED FULL-WIDTH SEARCH BAR ON MOBILE */
              <View style={[styles.mobileSearchExpandedRow, { backgroundColor: isDark ? '#1a1f2c' : '#f1f5f9', borderColor: accentCyan }]}>
                <MaterialIcons name="search" size={20} color={accentCyan} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar planta, serial o cliente..."
                  placeholderTextColor={textSecondary}
                  style={[styles.mobileSearchInput, { color: textPrimary, fontFamily: F.medium }]}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={{ padding: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              /* COLLAPSED COMPACT HEADER: [ ☰ Hamburger ] [ Brand Logo ] [ 🔍 Lupa ] [ Avatar ] */
              <View style={styles.mobileCollapsedHeaderRow}>
                {/* HAMBURGER BUTTON */}
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

                {/* BRAND CENTER LOGO */}
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

                {/* RIGHT ACTIONS: LUPA + AVATAR */}
                <View style={styles.mobileHeaderRightRow}>
                  {/* LUPA SEARCH BUTTON */}
                  <TouchableOpacity
                    onPress={() => setMobileSearchOpen(true)}
                    style={[styles.mobileSearchIconBtn, { backgroundColor: isDark ? '#1a1f2c' : '#f1f5f9', borderColor: cardBorder }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="search" size={20} color={textPrimary} />
                  </TouchableOpacity>

                  {/* USER PROFILE AVATAR (OPEN MENU) */}
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
            {/* SEARCH BAR (PILL SHAPE) */}
            <View style={[styles.searchPillContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <MaterialIcons name="search" size={20} color={textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar planta, serial o mantenimiento..."
                placeholderTextColor={textSecondary}
                style={[styles.searchInput, { color: textPrimary, fontFamily: F.medium }]}
              />
            </View>

            {/* CENTER DATE BADGE */}
            <View style={[styles.dateBadgePill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <MaterialIcons name="access-time" size={16} color={accentCyan} />
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                Hoy, {headerDate}
              </Text>
            </View>

            {/* RIGHT ACTION BUTTONS */}
            <View style={styles.headerRightActions}>
              {/* GESTIÓN DE USUARIOS Y OPERADORES (SUPERADMIN) */}
              <TouchableOpacity
                onPress={() => {
                  loadSystemUsers();
                  setUserMgmtVisible(true);
                }}
                style={[
                  styles.quickActionButton,
                  {
                    backgroundColor: (systemMetrics?.pending_approvals || 0) > 0 ? '#f59e0b' : (isDark ? '#1c202d' : '#e2e8f0'),
                    borderWidth: 1,
                    borderColor: (systemMetrics?.pending_approvals || 0) > 0 ? '#d97706' : cardBorder,
                  },
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="group"
                  size={18}
                  color={(systemMetrics?.pending_approvals || 0) > 0 ? '#ffffff' : textPrimary}
                />
                <Text
                  style={{
                    fontFamily: F.bold,
                    color: (systemMetrics?.pending_approvals || 0) > 0 ? '#ffffff' : textPrimary,
                    fontSize: 12,
                  }}
                >
                  USUARIOS {(systemMetrics?.pending_approvals || 0) > 0 ? `(${systemMetrics.pending_approvals})` : ''}
                </Text>
              </TouchableOpacity>

              {/* AGENDA Y CITAS TÉCNICAS */}
              <TouchableOpacity
                onPress={() => setAgendaVisible(true)}
                style={[
                  styles.quickActionButton,
                  {
                    backgroundColor: isDark ? '#1e2433' : '#e2e8f0',
                    borderWidth: 1,
                    borderColor: cardBorder,
                  },
                ]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calendar-clock" size={18} color={accentCyan} />
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                  AGENDA & CASOS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenQuickHours}
                style={[styles.quickActionButton, { backgroundColor: accentBlue }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={18} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>+ HORAS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenQuickFuel}
                style={[styles.quickActionButton, { backgroundColor: accentCyan }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="local-gas-station" size={18} color="#0c0e14" />
                <Text style={{ fontFamily: F.bold, color: '#0c0e14', fontSize: 12 }}>+ DIÉSEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenStats}
                style={[styles.headerIconCircle, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="notifications-none" size={20} color={textPrimary} />
                <View style={styles.notifDot} />
              </TouchableOpacity>

              {/* USER PROFILE AVATAR PILL */}
              <TouchableOpacity
                onPress={() => onSelectTab('profile')}
                style={[styles.userProfilePill, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <View style={[styles.avatarCircle, { backgroundColor: isSuperAdmin ? '#275FE3' : '#16a34a' }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>{userInitials}</Text>
                </View>
                <View style={{ marginRight: 4 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12.5 }} numberOfLines={1}>
                    {userName || (isSuperAdmin ? 'Kalioverload' : 'Operador')}
                  </Text>
                  <Text style={{ fontFamily: F.semibold, color: isSuperAdmin ? accentCyan : '#22c55e', fontSize: 10 }}>
                    {isSuperAdmin ? 'Super Usuario' : (userRoleTitle || 'Operador')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* LOGOUT BUTTON */}
              <TouchableOpacity
                onPress={logout}
                style={[styles.logoutHeaderPill, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2', borderColor: 'rgba(239, 68, 68, 0.35)' }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="logout" size={16} color="#ef4444" />
                <Text style={{ fontFamily: F.bold, color: '#ef4444', fontSize: 11 }}>
                  Cerrar Sesión
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SCROLLABLE BENTO GRID CONTENT */}
        <ScrollView
          style={[{ flex: 1 }, activeTab !== 'moto' && { display: 'none' }]}
          contentContainerStyle={[
            styles.bentoScrollContent,
            isMobile && { paddingHorizontal: 16, paddingBottom: 84 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* GREETING / HERO BANNER */}
          <View style={styles.greetingBannerRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={[
                  styles.roleBadgePill,
                  { 
                    backgroundColor: isSuperAdmin ? 'rgba(0, 227, 253, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    borderColor: isSuperAdmin ? 'rgba(0, 227, 253, 0.45)' : 'rgba(34, 197, 94, 0.45)',
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name={isSuperAdmin ? "shield-crown" : "account-hard-hat"} 
                    size={13} 
                    color={isSuperAdmin ? "#00e3fd" : "#22c55e"} 
                  />
                  <Text style={{ 
                    fontFamily: F.bold, 
                    color: isSuperAdmin ? "#00e3fd" : "#22c55e", 
                    fontSize: 10.5, 
                    letterSpacing: 0.8,
                    textTransform: 'uppercase'
                  }}>
                    {isSuperAdmin ? 'Super Usuario' : (userRoleTitle || 'Operador de Planta')}
                  </Text>
                </View>
              </View>

              <Text style={[styles.greetingTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                ¡Hola, {userName || (isSuperAdmin ? 'Kalioverload' : 'Operador')}!
              </Text>
              <Text style={[styles.greetingSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                {isSuperAdmin
                  ? 'Consola central de supervisión telemática y control maestro de plantas eléctricas Hermanos Lynch.'
                  : 'Monitoreo en tiempo real y telemetría de tus plantas eléctricas Hermanos Lynch.'}
              </Text>
            </View>

            <View style={styles.greetingRightFilters}>
              <TouchableOpacity
                onPress={onOpenStats}
                style={[styles.timeRangeDropdown, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>Este mes</Text>
                <MaterialIcons name="keyboard-arrow-down" size={18} color={textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenReport}
                style={[styles.calendarIconBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="assessment" size={18} color={accentCyan} />
              </TouchableOpacity>
            </View>
          </View>

          {/* SUPER ADMIN: 1. FLOTA DE PLANTAS ELÉCTRICAS EN LÍNEA (CENTRO DE MANDO MAESTRO) */}
          {isSuperAdmin && (
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
                    Selecciona cualquier planta de la red para supervisar sus parámetros, telemetría de 10 subsistemas y consumos en tiempo real.
                  </Text>
                </View>

                {/* KPI CHIPS DE FLOTA */}
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

              {/* HORIZONTAL SCROLL DE PLANTAS */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fleetCardsScroll}
              >
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
          )}

          {/* SUPER ADMIN: 2. SUPERVISIÓN DE OPERADORES, TERRITORIOS Y VEHÍCULOS DE EMPRESA */}
          {isSuperAdmin && (
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
                    Organización territorial por Estado, País, Departamento técnico y consumo de combustible de vehículos corporativos.
                  </Text>
                </View>

                {/* BOTÓN GESTIONAR O CREAR OPERADOR */}
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

              {/* FILTROS GEOGRÁFICOS Y DEPARTAMENTALES */}
              <View style={styles.filterSectionBox}>
                {/* 1. FILTRO ESTADO */}
                <View style={styles.filterGroupRow}>
                  <Text style={[styles.filterGroupLabel, { color: textSecondary, fontFamily: F.bold }]}>
                    ESTADO / REGIÓN:
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

                {/* 2. FILTRO DEPARTAMENTO */}
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

                {/* 3. BUSCADOR EN VIVO DE OPERADOR */}
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

              {/* LISTA DE OPERADORES Y SUS VEHÍCULOS / PLANTAS */}
              <View style={styles.operatorsCardsGrid}>
                {filteredOperators.length === 0 ? (
                  <View style={[styles.emptyFilterBox, { backgroundColor: pillDarkBg }]}>
                    <MaterialIcons name="person-search" size={28} color={textSecondary} />
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13, marginTop: 6 }}>
                      No se encontraron operadores con los filtros seleccionados
                    </Text>
                    <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                      Intenta seleccionar otro estado o limpiar el buscador.
                    </Text>
                  </View>
                ) : (
                  filteredOperators.map((op: any) => {
                    const initials = (op.full_name || 'OP')
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    // Plantas asignadas a este operador
                    const assignedPlants = allPlants.filter(
                      (p) =>
                        p.assignedOperatorId === op.id ||
                        (p.assignedOperatorName && op.full_name && p.assignedOperatorName.toLowerCase().trim() === op.full_name.toLowerCase().trim())
                    );

                    // Vehículo asignado
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

                        {/* PLANTAS ASIGNADAS */}
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

                        {/* VEHÍCULO DE EMPRESA Y CONSUMO */}
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                              Consumo Diésel: <Text style={{ fontFamily: F.bold, color: textPrimary }}>0.0 L</Text>
                            </Text>
                            <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                              Gasto Diésel: <Text style={{ fontFamily: F.bold, color: '#22c55e' }}>$0.00 USD</Text>
                            </Text>
                          </View>
                        </View>

                        {/* ACCIONES DIRECTAS */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                          <TouchableOpacity
                            onPress={() => {
                              const rawDigits = (op.phone || '584143059921').replace(/\D/g, '');
                              const phone = rawDigits.startsWith('58') ? rawDigits : `58${rawDigits.replace(/^0/, '')}`;
                              const url = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${op.full_name}, te contacto desde la consola de Hermanos Lynch.`)}`;
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
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>Reasignar / Control</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* MAIN BENTO SECTION (GRID DE 2 COLUMNAS) */}
          <View style={[styles.bentoMasterGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            
            {/* IZQUIERDA: 2x2 METRICS KPI CARDS (TAL COMO EN LA REFERENCIA) */}
            <View style={[styles.kpiGridContainer, { flex: isDesktop ? 1.05 : 1 }]}>
              {/* CARD 1: HORAS DE OPERACIÓN (HIGHLIGHTED WITH BLUE ARROW BUTTON) */}
              <View style={[styles.bentoKpiCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.kpiCardTopRow}>
                  <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                    Horas de Operación
                  </Text>
                  {/* ICON BUTTON BLUE CIRCLE LIKE REFERENCE */}
                  <TouchableOpacity
                    onPress={onOpenQuickHours}
                    style={styles.blueCircleArrowBtn}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="call-made" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.kpiMainValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {currentHours.toLocaleString()} <Text style={{ fontSize: 16 }}>hrs</Text>
                </Text>

                <View style={styles.kpiBottomRow}>
                  <View style={[styles.trendBadge, { backgroundColor: hoursMetrics.badgeBg }]}>
                    <MaterialIcons name={hoursMetrics.icon} size={12} color={hoursMetrics.badgeColor} />
                    <Text style={{ fontFamily: F.bold, color: hoursMetrics.badgeColor, fontSize: 10 }}>
                      {hoursMetrics.badgeText}
                    </Text>
                  </View>
                  <Text style={[styles.kpiSubtext, { color: textSecondary, fontFamily: F.regular }]}>
                    {hoursMetrics.subtext}
                  </Text>
                </View>
              </View>

              {/* CARD 2: SERVICIOS EJECUTADOS */}
              <View style={[styles.bentoKpiCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.kpiCardTopRow}>
                  <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                    Servicios Ejecutados
                  </Text>
                  <TouchableOpacity
                    onPress={() => onSelectTab('services')}
                    style={[styles.darkCircleArrowBtn, { backgroundColor: pillDarkBg }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="call-made" size={15} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.kpiMainValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {serviceRecords.length}
                </Text>

                <View style={styles.kpiBottomRow}>
                  <View style={[styles.trendBadge, { backgroundColor: serviceMetrics.badgeBg }]}>
                    <Text style={{ fontFamily: F.bold, color: serviceMetrics.badgeColor, fontSize: 10 }}>
                      {serviceMetrics.badgeText}
                    </Text>
                  </View>
                  <Text style={[styles.kpiSubtext, { color: textSecondary, fontFamily: F.regular }]}>
                    {serviceMetrics.subtext}
                  </Text>
                </View>
              </View>

              {/* CARD 3: CONSUMO DE DIÉSEL */}
              <View style={[styles.bentoKpiCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.kpiCardTopRow}>
                  <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                    Consumo de Diésel
                  </Text>
                  <TouchableOpacity
                    onPress={onOpenQuickFuel}
                    style={[styles.darkCircleArrowBtn, { backgroundColor: pillDarkBg }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="call-made" size={15} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.kpiMainValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {totalFuelLiters} <Text style={{ fontSize: 16 }}>L</Text>
                </Text>

                <View style={styles.kpiBottomRow}>
                  <View style={[styles.trendBadge, { backgroundColor: fuelMetrics.badgeBg }]}>
                    <MaterialIcons name={fuelMetrics.icon} size={12} color={fuelMetrics.badgeColor} />
                    <Text style={{ fontFamily: F.bold, color: fuelMetrics.badgeColor, fontSize: 10 }}>
                      {fuelMetrics.badgeText}
                    </Text>
                  </View>
                  <Text style={[styles.kpiSubtext, { color: textSecondary, fontFamily: F.regular }]}>
                    {fuelMetrics.subtext}
                  </Text>
                </View>
              </View>

              {/* CARD 4: SALUD OPERATIVA */}
              <View style={[styles.bentoKpiCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.kpiCardTopRow}>
                  <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                    Salud Operativa
                  </Text>
                  <TouchableOpacity
                    onPress={onOpenSpecs}
                    style={[styles.darkCircleArrowBtn, { backgroundColor: pillDarkBg }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="call-made" size={15} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.kpiMainValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {generalHealth}%
                </Text>

                <View style={styles.kpiBottomRow}>
                  <View style={[styles.trendBadge, { backgroundColor: healthMetrics.badgeBg }]}>
                    <MaterialIcons name={healthMetrics.icon} size={12} color={healthMetrics.badgeColor} />
                    <Text style={{ fontFamily: F.bold, color: healthMetrics.badgeColor, fontSize: 10 }}>
                      {healthMetrics.badgeText}
                    </Text>
                  </View>
                  <Text style={[styles.kpiSubtext, { color: textSecondary, fontFamily: F.regular }]}>
                    {healthMetrics.subtext}
                  </Text>
                </View>
              </View>
            </View>

            {/* DERECHA: REVENUE / BAR CHART CARD (TAL COMO EN LA REFERENCIA) */}
            <View style={[styles.bentoChartCard, { flex: isDesktop ? 1.3 : 1, backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={[styles.chartTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                    Rendimiento de Operación (Horas)
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                    Generación diésel registrada en el periodo actual
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onOpenStats}
                  style={[styles.darkCircleArrowBtn, { backgroundColor: pillDarkBg }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="call-made" size={16} color={textPrimary} />
                </TouchableOpacity>
              </View>

              {/* VERTICAL BAR CHART WITH ACTIVE TOOLTIP LIKE REFERENCE */}
              <View style={styles.barChartContainer}>
                {/* Y-AXIS LABELS DINÁMICOS SEGÚN DATOS REALES */}
                <View style={styles.yAxisLabels}>
                  <Text style={[styles.yAxisText, { color: textSecondary, fontFamily: F.semibold }]}>{maxPeriodHours}h</Text>
                  <Text style={[styles.yAxisText, { color: textSecondary, fontFamily: F.semibold }]}>{Math.round(maxPeriodHours * 0.75)}h</Text>
                  <Text style={[styles.yAxisText, { color: textSecondary, fontFamily: F.semibold }]}>{Math.round(maxPeriodHours * 0.5)}h</Text>
                  <Text style={[styles.yAxisText, { color: textSecondary, fontFamily: F.semibold }]}>{Math.round(maxPeriodHours * 0.25)}h</Text>
                  <Text style={[styles.yAxisText, { color: textSecondary, fontFamily: F.semibold }]}>0h</Text>
                </View>

                {/* BARS CONTAINER */}
                <View style={styles.barsRow}>
                  {barChartPeriods.map((period, index) => {
                    const isSelected = index === selectedBarIndex;
                    const barHeightPercent = maxPeriodHours > 0 
                      ? Math.min(100, Math.round((period.hours / maxPeriodHours) * 100))
                      : 0;

                    return (
                      <TouchableOpacity
                        key={period.label}
                        onPress={() => setSelectedBarIndex(index)}
                        style={styles.barColumnWrapper}
                        activeOpacity={0.8}
                      >
                        {/* FLOATING TOOLTIP ON SELECTED BAR */}
                        {isSelected && (
                          <View style={styles.floatingTooltipPill}>
                            <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 10 }}>
                              {period.hours} hrs
                            </Text>
                          </View>
                        )}

                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(barHeightPercent, period.hours > 0 ? 6 : 3)}%`,
                                backgroundColor: period.hours > 0
                                  ? (isSelected ? '#1a5cff' : (isDark ? '#2563eb' : '#3b82f6'))
                                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                                opacity: isSelected ? 1 : 0.85,
                              },
                            ]}
                          />
                        </View>

                        <Text
                          style={[
                            styles.xAxisLabel,
                            {
                              color: isSelected ? textPrimary : textSecondary,
                              fontFamily: isSelected ? F.bold : F.medium,
                            },
                          ]}
                        >
                          {period.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

          </View>

          {/* 3. SHOWCASE HERO DE LA PLANTA (FOTO OFICIAL + SPECS + ACCIONES RÁPIDAS) */}
          <View style={[styles.plantShowcaseCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.plantShowcaseInner, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              
              {/* DATOS TÉCNICOS Y ESPECIFICACIONES */}
              <View style={{ flex: 1.2, paddingRight: isDesktop ? 24 : 0 }}>
                <View style={styles.plantBadgeRow}>
                  <View style={[styles.plantKvaBadge, { backgroundColor: 'rgba(0, 180, 216, 0.15)' }]}>
                    <MaterialIcons name="bolt" size={14} color={accentCyan} />
                    <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 11 }}>
                      {myMoto ? `${myMoto.powerKva || 35} kVA / ${myMoto.powerKw || 28} kW STANDBY` : 'PLANTA ELÉCTRICA'}
                    </Text>
                  </View>
                  <View style={[styles.onlineStatusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                    <View style={styles.greenLiveDot} />
                    <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>EN LÍNEA</Text>
                  </View>
                </View>

                <Text style={[styles.plantTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Generador Diésel Hermanos Lynch'}
                </Text>

                <Text style={[styles.plantSerialLocation, { color: textSecondary, fontFamily: F.medium }]}>
                  Serial: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{myMoto?.serialNumber || myMoto?.plate || 'Sin serial asignado'}</Text> • Ubicación: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{myMoto?.location || 'Ubicación sin registrar'}</Text>
                </Text>

                {/* SPEC CHIPS */}
                <View style={styles.specChipsGrid}>
                  <View style={[styles.specChip, { backgroundColor: pillDarkBg }]}>
                    <MaterialCommunityIcons name="engine" size={16} color={accentCyan} />
                    <Text style={[styles.specChipText, { color: textPrimary, fontFamily: F.semibold }]}>
                      {specs?.engineType || 'Cummins 3.9L Diésel'}
                    </Text>
                  </View>

                  <View style={[styles.specChip, { backgroundColor: pillDarkBg }]}>
                    <MaterialIcons name="cached" size={16} color="#f59e0b" />
                    <Text style={[styles.specChipText, { color: textPrimary, fontFamily: F.semibold }]}>
                      {specs?.transmission || 'Leroy Somer 60 Hz'}
                    </Text>
                  </View>

                  <View style={[styles.specChip, { backgroundColor: pillDarkBg }]}>
                    <MaterialIcons name="tune" size={16} color="#10b981" />
                    <Text style={[styles.specChipText, { color: textPrimary, fontFamily: F.semibold }]}>
                      {specs?.equipment || 'ComAp InteliLite IL-9'}
                    </Text>
                  </View>
                </View>

                {/* ACCIONES RÁPIDAS HERMANOS LYNCH */}
                <View style={styles.plantActionButtonsRow}>
                  <TouchableOpacity
                    onPress={onOpenSpecs}
                    style={[styles.outlineActionBtn, { borderColor: cardBorder }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="menu-book" size={16} color={textPrimary} />
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>Ficha Técnica</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onOpenReport}
                    style={[styles.pdfReportActionBtn, { backgroundColor: '#0b3b60' }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="picture-as-pdf" size={16} color="#00e3fd" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Expediente PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onOpenStats}
                    style={[styles.scheduleActionBtn, { backgroundColor: accentBlue }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="event" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Agendar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* FOTO REAL DE LA PLANTA ELÉCTRICA CON RESPLANDOR */}
              <View style={styles.plantPhotoColumn}>
                <View style={styles.photoAtmosphereGlow} />
                <Image
                  source={plantImageSource}
                  style={styles.plantShowcaseImage}
                  resizeMode="contain"
                />
                <View style={[styles.horometerOverlayBadge, { backgroundColor: 'rgba(20, 23, 33, 0.9)', borderColor: cardBorder }]}>
                  <MaterialIcons name="timer" size={16} color={accentCyan} />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                    Horómetro: {currentHours.toLocaleString()} hrs
                  </Text>
                </View>
              </View>

            </View>
          </View>

          {/* 4. FILA INFERIOR: SPLIT CARDS (IZQUIERDA) & DONUT CATEGORY CHART (DERECHA) */}
          <View style={[styles.bottomBentoRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            
            {/* SPLIT CARDS CON BOTÓN CIRCULAR EN MEDIO (TAL COMO EN LA REFERENCIA) */}
            <View style={[styles.splitCardsGroup, { flex: isDesktop ? 1 : 1 }]}>
              {/* CARD A: SUBSISTEMAS */}
              <View style={[styles.splitSubCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.splitIconBadge}>
                  <MaterialIcons name="check" size={18} color="#22c55e" />
                </View>
                <Text style={[styles.splitCardStat, { color: textPrimary, fontFamily: F.extrabold }]}>
                  10 <Text style={{ fontSize: 18 }}>Subsistemas</Text>
                </Text>
                <Text style={[styles.splitCardSubtext, { color: textSecondary, fontFamily: F.medium }]}>
                  10 subsistemas en estado óptimo bajo norma ISO 8528.
                </Text>
              </View>

              {/* FLOATING CONNECTOR BUTTON LIKE REFERENCE */}
              <TouchableOpacity
                onPress={() => onSelectTab('services')}
                style={[styles.floatingConnectorBtn, { backgroundColor: isDark ? '#ffffff' : '#0c0e14' }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="call-made" size={16} color={isDark ? '#0c0e14' : '#ffffff'} />
              </TouchableOpacity>

              {/* CARD B: GENERADORES ACTIVOS */}
              <View style={[styles.splitSubCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.splitIconBadge, { backgroundColor: 'rgba(0, 180, 216, 0.15)' }]}>
                  <MaterialIcons name="bolt" size={18} color={accentCyan} />
                </View>
                <Text style={[styles.splitCardStat, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {motos.length} <Text style={{ fontSize: 18 }}>Generador{motos.length > 1 ? 'es' : ''}</Text>
                </Text>
                <Text style={[styles.splitCardSubtext, { color: textSecondary, fontFamily: F.medium }]}>
                  Grupos electrógenos bajo monitoreo continuo Hermanos Lynch.
                </Text>
              </View>
            </View>

            {/* DONUT CATEGORY CHART CARD (TAL COMO EN LA REFERENCIA) */}
            <View style={[styles.donutChartCard, { flex: isDesktop ? 1.05 : 1, backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={[styles.chartTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                    Distribución de Desgaste por Subsistema
                  </Text>
                  <Text style={[styles.chartSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                    Salud porcentual remanente de componentes
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onOpenReport}
                  style={[styles.darkCircleArrowBtn, { backgroundColor: pillDarkBg }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="call-made" size={16} color={textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.donutAndLegendRow}>
                {/* DONUT GRAPHIC */}
                <View style={styles.donutGraphicBox}>
                  {/* MULTI-SEGMENT DONUT VISUAL */}
                  <View style={[styles.donutOuterRing, { borderColor: cardBorder }]}>
                    <View style={[styles.donutSegment, { borderColor: '#1a5cff', transform: [{ rotate: '0deg' }] }]} />
                    <View style={[styles.donutSegment, { borderColor: '#8b5cf6', transform: [{ rotate: '70deg' }] }]} />
                    <View style={[styles.donutSegment, { borderColor: '#f59e0b', transform: [{ rotate: '140deg' }] }]} />
                    <View style={[styles.donutSegment, { borderColor: '#10b981', transform: [{ rotate: '210deg' }] }]} />
                    <View style={[styles.donutSegment, { borderColor: '#00e3fd', transform: [{ rotate: '280deg' }] }]} />

                    <View style={[styles.donutInnerHole, { backgroundColor: cardBg }]}>
                      <Text style={[styles.donutCenterValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                        {generalHealth}%
                      </Text>
                      <Text style={[styles.donutCenterLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                        SALUD
                      </Text>
                    </View>
                  </View>
                </View>

                {/* LEGEND ON RIGHT */}
                <View style={styles.donutLegendList}>
                  {plantSubsystems.map((sub) => (
                    <View key={sub.id} style={styles.legendItemRow}>
                      <View style={[styles.legendColorDot, { backgroundColor: sub.color }]} />
                      <Text
                        style={[styles.legendItemText, { color: textPrimary, fontFamily: F.medium }]}
                        numberOfLines={1}
                      >
                        {sub.name}
                      </Text>
                      <Text style={[styles.legendItemPercent, { color: textSecondary, fontFamily: F.bold }]}>
                        {sub.wear}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

          </View>

          {/* 5. AUDITORÍA DETALLADA DE LOS 10 SUBSISTEMAS INDUSTRIALES */}
          <View style={[styles.telemetrySectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.telemetryHeaderRow}>
              <View>
                <Text style={[styles.telemetryTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Auditoría y Telemetría de los 10 Subsistemas
                </Text>
                <Text style={[styles.telemetrySubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Seguimiento de horas acumuladas y ciclos preventivos de fábrica
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onOpenServicesTab()}
                style={[styles.adjustAllBtn, { backgroundColor: accentBlue }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="build" size={16} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Ajustar Todo</Text>
              </TouchableOpacity>
            </View>

            {/* SUBSYSTEMS PROGRESS BARS GRID */}
            <View style={styles.subsystemsCardsGrid}>
              {filteredSubsystems.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => onOpenServicesTab(sub.id)}
                  style={[styles.subsystemMiniCard, { backgroundColor: pillDarkBg }]}
                  activeOpacity={0.75}
                >
                  <View style={styles.subsystemCardHeader}>
                    <Text style={[styles.subsystemCardName, { color: textPrimary, fontFamily: F.bold }]}>
                      {sub.name}
                    </Text>
                    <Text
                      style={[
                        styles.subsystemCardStatus,
                        {
                          color: sub.wear >= 60 ? '#22c55e' : sub.wear >= 30 ? '#f59e0b' : '#ef4444',
                          fontFamily: F.extrabold,
                        },
                      ]}
                    >
                      {sub.wear}%
                    </Text>
                  </View>

                  {/* PROGRESS BAR */}
                  <View style={styles.progressBarBase}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${sub.wear}%`,
                          backgroundColor: sub.wear >= 60 ? '#22c55e' : sub.wear >= 30 ? '#f59e0b' : '#ef4444',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.subsystemCardFooter}>
                    <Text style={[styles.subsystemCardUsage, { color: textSecondary, fontFamily: F.medium }]}>
                      Uso: {sub.hoursSince} hrs
                    </Text>
                    <Text style={[styles.subsystemCardRemaining, { color: textPrimary, fontFamily: F.semibold }]}>
                      Restan: {sub.hoursRemaining} hrs
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>

        {/* PERSISTENT SUB-TABS (SPECS, SERVICES, HISTORY, WALLET, PROFILE) */}
        <View style={[{ flex: 1 }, activeTab === 'moto' && { display: 'none' }]}>
          {children}
        </View>
      </View>

      {/* MOBILE BOTTOM NAVIGATION BAR (WHEN SCREEN < 768px) */}
      {isMobile && (
        <View style={[styles.mobileBottomNav, { backgroundColor: railBg, borderTopColor: railBorder }]}>
          <TouchableOpacity
            onPress={() => onSelectTab('moto')}
            style={styles.mobileNavItem}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="speed"
              size={22}
              color={activeTab === 'moto' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'moto' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary,
                  fontFamily: activeTab === 'moto' ? F.bold : F.medium,
                },
              ]}
            >
              Planta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectTab('services')}
            style={styles.mobileNavItem}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="build"
              size={22}
              color={activeTab === 'services' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'services' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary,
                  fontFamily: activeTab === 'services' ? F.bold : F.medium,
                },
              ]}
            >
              Servicios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectTab('specs')}
            style={styles.mobileNavItem}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="assignment"
              size={22}
              color={activeTab === 'specs' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'specs' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary,
                  fontFamily: activeTab === 'specs' ? F.bold : F.medium,
                },
              ]}
            >
              Ficha
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSelectTab('history')}
            style={styles.mobileNavItem}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="receipt-long"
              size={22}
              color={activeTab === 'history' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'history' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary,
                  fontFamily: activeTab === 'history' ? F.bold : F.medium,
                },
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>

          {drivesCompanyVehicle && (
            <TouchableOpacity
              onPress={() => onSelectTab('wallet')}
              style={styles.mobileNavItem}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="account-balance-wallet"
                size={22}
                color={activeTab === 'wallet' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary}
              />
              <Text
                style={[
                  styles.mobileNavLabel,
                  {
                    color: activeTab === 'wallet' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary,
                    fontFamily: activeTab === 'wallet' ? F.bold : F.medium,
                  },
                ]}
              >
                Flota
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => onSelectTab('profile')}
            style={styles.mobileNavItem}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="person"
              size={22}
              color={activeTab === 'profile' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'profile' ? (isDark ? '#00b4d8' : '#1a5cff') : textSecondary,
                  fontFamily: activeTab === 'profile' ? F.bold : F.medium,
                },
              ]}
            >
              Perfil
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE CONTROL DE USUARIOS Y APROBACIONES (SUPERADMIN) */}
      <UserManagementModal
        visible={userMgmtVisible}
        onClose={() => setUserMgmtVisible(false)}
      />

      {/* MODAL DE AGENDA DE CLIENTES E INQUIETUDES TÉCNICAS */}
      <OperatorAgendaModal
        visible={agendaVisible}
        onClose={() => setAgendaVisible(false)}
      />

      {/* MENÚ HAMBURGUESA DESPLEGABLE PARA PANTALLAS MÓVILES */}
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

          <View style={[styles.mobileMenuDrawer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* DRAWER HEADER: PROFILE CARNET */}
            <View style={[styles.mobileDrawerHeader, { borderBottomColor: cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={[styles.avatarCircle, { backgroundColor: isSuperAdmin ? '#275FE3' : '#16a34a', width: 44, height: 44, borderRadius: 22 }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 15 }}>{userInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 14, color: textPrimary }} numberOfLines={1}>
                    {userName || (isSuperAdmin ? 'Kalioverload' : 'Operador')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={[
                      styles.roleBadgePillSmall,
                      {
                        backgroundColor: isSuperAdmin ? 'rgba(0, 227, 253, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        borderColor: isSuperAdmin ? 'rgba(0, 227, 253, 0.45)' : 'rgba(34, 197, 94, 0.45)',
                      }
                    ]}>
                      <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: isSuperAdmin ? accentCyan : '#22c55e' }}>
                        {isSuperAdmin ? 'SUPER ADMIN' : (userRoleTitle || 'OPERADOR')}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                      {headerDate}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setMobileMenuOpen(false)}
                style={[styles.mobileDrawerCloseBtn, { backgroundColor: isDark ? '#1c202d' : '#f1f5f9' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
              {/* SECTION: OPERACIONES RÁPIDAS */}
              <Text style={[styles.mobileMenuSectionTitle, { color: textSecondary, fontFamily: F.bold }]}>
                OPERACIONES RÁPIDAS
              </Text>

              {/* SUPERADMIN USER CONTROL */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  loadSystemUsers();
                  setUserMgmtVisible(true);
                }}
                style={[
                  styles.mobileMenuItem,
                  {
                    backgroundColor: (systemMetrics?.pending_approvals || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : (isDark ? '#1a1f2c' : '#f8fafc'),
                    borderColor: (systemMetrics?.pending_approvals || 0) > 0 ? '#f59e0b' : cardBorder,
                  }
                ]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: (systemMetrics?.pending_approvals || 0) > 0 ? '#f59e0b' : '#3b82f6' }]}>
                  <MaterialIcons name="group" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    Control de Usuarios y Aprobaciones
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    {(systemMetrics?.pending_approvals || 0) > 0
                      ? `${systemMetrics.pending_approvals} usuarios esperando aprobación`
                      : 'Gestionar clientes y operadores'}
                  </Text>
                </View>
                {(systemMetrics?.pending_approvals || 0) > 0 && (
                  <View style={styles.mobilePendingPill}>
                    <Text style={styles.mobilePendingPillText}>
                      {systemMetrics.pending_approvals}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* AGENDA & CASOS */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  setAgendaVisible(true);
                }}
                style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder }]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialCommunityIcons name="calendar-clock" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    Agenda y Casos Técnicos
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Citas de clientes y revisiones en campo
                  </Text>
                </View>
              </TouchableOpacity>

              {/* + HORAS */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickHours();
                }}
                style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder }]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: accentBlue }]}>
                  <MaterialIcons name="add" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    + Actualizar Horómetro
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Lectura en sitio de horas de operación
                  </Text>
                </View>
              </TouchableOpacity>

              {/* + DIESEL */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickFuel();
                }}
                style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder }]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: '#00b4d8' }]}>
                  <MaterialIcons name="local-gas-station" size={20} color="#0c0e14" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    + Registrar Carga de Diésel
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Litros cargados y costo en USD
                  </Text>
                </View>
              </TouchableOpacity>

              {/* EXPEDIENTE PDF */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onOpenReport();
                }}
                style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder }]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: '#ef4444' }]}>
                  <MaterialIcons name="picture-as-pdf" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    Expediente Técnico PDF & QR
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Ficha oficial e historial imprimible
                  </Text>
                </View>
              </TouchableOpacity>

              {/* STATS & TELEMETRÍA */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onOpenStats();
                }}
                style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder }]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="analytics" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    Telemetría & Alarmas
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Alertas activas y métricas históricas
                  </Text>
                </View>
              </TouchableOpacity>

              {/* SECTION: SECCIONES */}
              <Text style={[styles.mobileMenuSectionTitle, { color: textSecondary, fontFamily: F.bold, marginTop: 14 }]}>
                SECCIONES DE LA APLICACIÓN
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('moto');
                }}
                style={[styles.mobileNavDrawerItem, activeTab === 'moto' && { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="speed" size={20} color={activeTab === 'moto' ? accentBlue : textSecondary} />
                <Text style={{ fontFamily: activeTab === 'moto' ? F.bold : F.medium, fontSize: 13, color: activeTab === 'moto' ? accentBlue : textPrimary }}>
                  Planta Eléctrica / Inicio
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('services');
                }}
                style={[styles.mobileNavDrawerItem, activeTab === 'services' && { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="build" size={20} color={activeTab === 'services' ? accentBlue : textSecondary} />
                <Text style={{ fontFamily: activeTab === 'services' ? F.bold : F.medium, fontSize: 13, color: activeTab === 'services' ? accentBlue : textPrimary }}>
                  Servicios & Mantenimiento
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('specs');
                }}
                style={[styles.mobileNavDrawerItem, activeTab === 'specs' && { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="assignment" size={20} color={activeTab === 'specs' ? accentBlue : textSecondary} />
                <Text style={{ fontFamily: activeTab === 'specs' ? F.bold : F.medium, fontSize: 13, color: activeTab === 'specs' ? accentBlue : textPrimary }}>
                  Ficha Técnica Industrial
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('history');
                }}
                style={[styles.mobileNavDrawerItem, activeTab === 'history' && { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="receipt-long" size={20} color={activeTab === 'history' ? accentBlue : textSecondary} />
                <Text style={{ fontFamily: activeTab === 'history' ? F.bold : F.medium, fontSize: 13, color: activeTab === 'history' ? accentBlue : textPrimary }}>
                  Historial de Operaciones
                </Text>
              </TouchableOpacity>

              {drivesCompanyVehicle && (
                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onSelectTab('wallet');
                  }}
                  style={[styles.mobileNavDrawerItem, activeTab === 'wallet' && { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="account-balance-wallet" size={20} color={activeTab === 'wallet' ? accentBlue : textSecondary} />
                  <Text style={{ fontFamily: activeTab === 'wallet' ? F.bold : F.medium, fontSize: 13, color: activeTab === 'wallet' ? accentBlue : textPrimary }}>
                    Wallet de Combustible
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('profile');
                }}
                style={[styles.mobileNavDrawerItem, activeTab === 'profile' && { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="person" size={20} color={activeTab === 'profile' ? accentBlue : textSecondary} />
                <Text style={{ fontFamily: activeTab === 'profile' ? F.bold : F.medium, fontSize: 13, color: activeTab === 'profile' ? accentBlue : textPrimary }}>
                  Mi Perfil de Usuario
                </Text>
              </TouchableOpacity>

              {/* TEMA OSCURO / CLARO */}
              <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder, marginTop: 12 }]}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconBox, { backgroundColor: isDark ? '#ffb703' : '#1a5cff' }]}>
                  <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                    {isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Alternar contraste visual
                  </Text>
                </View>
              </TouchableOpacity>

              {/* LOGOUT BUTTON */}
              <TouchableOpacity
                onPress={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                style={styles.mobileDrawerLogoutBtn}
                activeOpacity={0.8}
              >
                <MaterialIcons name="logout" size={18} color="#ef4444" />
                <Text style={{ fontFamily: F.bold, color: '#ef4444', fontSize: 13 }}>
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
  topHeaderBar: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  topHeaderBarMobile: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
    borderRadius: 12,
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
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileAvatarBtn: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 1.5,
  },
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
    width: '88%',
    maxWidth: 380,
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  mobileDrawerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileDrawerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileMenuSectionTitle: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  mobileMenuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobilePendingPill: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  mobilePendingPillText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  mobileNavDrawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  mobileDrawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 16,
    marginBottom: 20,
  },
  roleBadgePillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  searchPillContainer: {
    flex: 1,
    minWidth: 260,
    maxWidth: 420,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  dateBadgePill: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  userProfilePill: {
    height: 40,
    paddingHorizontal: 6,
    paddingRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutHeaderPill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleSwitchPill: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1a5cff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoScrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  roleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  greetingBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 18,
    flexWrap: 'wrap',
    gap: 12,
  },
  greetingTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  greetingRightFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeRangeDropdown: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoMasterGrid: {
    gap: 18,
    marginBottom: 20,
  },
  kpiGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  bentoKpiCard: {
    flex: 1,
    minWidth: 170,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 145,
  },
  kpiCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12.5,
  },
  blueCircleArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a5cff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkCircleArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiMainValue: {
    fontSize: 24,
    marginVertical: 8,
  },
  kpiBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kpiSubtext: {
    fontSize: 11,
  },
  bentoChartCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
  },
  chartSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: 12,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    height: '100%',
    paddingBottom: 24,
  },
  yAxisText: {
    fontSize: 10,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 24,
  },
  barColumnWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  floatingTooltipPill: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#0c0e14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a5cff',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  barTrack: {
    width: 24,
    height: '80%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    marginTop: 8,
  },
  plantShowcaseCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 26,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  plantShowcaseInner: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  plantBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  plantKvaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  greenLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  plantTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  plantSerialLocation: {
    fontSize: 12,
    marginVertical: 6,
  },
  specChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 14,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  specChipText: {
    fontSize: 11,
  },
  plantActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  pdfReportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 12,
  },
  scheduleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 12,
  },
  plantPhotoColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 260,
  },
  photoAtmosphereGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(26, 92, 255, 0.12)',
  },
  plantShowcaseImage: {
    width: 250,
    height: 180,
  },
  horometerOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -10,
  },
  bottomBentoRow: {
    gap: 18,
    marginBottom: 20,
  },
  splitCardsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    gap: 14,
  },
  splitSubCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  splitIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitCardStat: {
    fontSize: 22,
    marginVertical: 8,
  },
  splitCardSubtext: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  floatingConnectorBtn: {
    position: 'absolute',
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  donutChartCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  donutAndLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  donutGraphicBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  donutOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 14,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutSegment: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 14,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  donutInnerHole: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterValue: {
    fontSize: 18,
  },
  donutCenterLabel: {
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
  donutLegendList: {
    flex: 1,
    minWidth: 180,
    gap: 8,
  },
  legendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendItemText: {
    flex: 1,
    fontSize: 11.5,
  },
  legendItemPercent: {
    fontSize: 11,
  },
  telemetrySectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 10,
  },
  telemetryTitle: {
    fontSize: 17,
  },
  telemetrySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  adjustAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  subsystemsCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subsystemMiniCard: {
    flex: 1,
    minWidth: 180,
    borderRadius: 16,
    padding: 14,
  },
  subsystemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subsystemCardName: {
    fontSize: 12,
  },
  subsystemCardStatus: {
    fontSize: 12,
  },
  progressBarBase: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subsystemCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subsystemCardUsage: {
    fontSize: 10.5,
  },
  subsystemCardRemaining: {
    fontSize: 10.5,
  },
  // Super Admin Fleet Section Styles
  superFleetContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
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
    fontSize: 18,
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

  // Super Admin Operators Section Styles
  superOperatorsContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
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
  emptyFilterBox: {
    width: '100%',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 100,
  },
  mobileNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  mobileNavLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});