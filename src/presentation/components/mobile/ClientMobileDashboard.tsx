import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  RefreshControl,
  Modal,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { isPlanta } from '../../../domain/entities/Moto';
import { getMotoSpecs } from '../../../data/specs';
import { VEHICLE_CATALOG } from '../../../data/catalog';
import { ComponentType } from '../../../constants/telemetry';
import { ClientInquiryModal } from '../ClientInquiryModal';
import { AssignedOperatorModal } from '../AssignedOperatorModal';
import { VehicleReportModal } from '../VehicleReportModal';
import { TechnicalSheetModal } from '../TechnicalSheetModal';

// Brand Assets
const HL_LOGO_REQUIRE = require('../../../../assets/images/logo and media coorporative/logo-sin-nombre.png');
const PLANTA_IMG_REQUIRE = require('../../../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png');

interface SubsystemItem {
  id: ComponentType;
  name: string;
  interval: number;
  color: string;
  icon: string;
  iconFamily: 'material' | 'community';
  description: string;
  wear: number;
  hoursSince: number;
  hoursRemaining: number;
  isInspected: boolean;
  status: 'ÓPTIMO' | 'PREVENTIVO' | 'CRÍTICO' | 'REQUIERE REVISIÓN' | 'SIN CALIBRAR';
}

interface ClientMobileDashboardProps {
  onNavigateToSpecs?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToProfile?: () => void;
  onOpenQuickHours?: () => void;
  onOpenQuickFuel?: () => void;
}

export const ClientMobileDashboard: React.FC<ClientMobileDashboardProps> = ({
  onNavigateToSpecs,
  onNavigateToHistory,
  onNavigateToProfile,
  onOpenQuickHours,
  onOpenQuickFuel,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, mode, isDark, toggleTheme } = useTheme();
  const { myMoto, records, updateMoto, addRecord, logout } = useMyMoto();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemItem | null>(null);
  const [showSubsystemsSection, setShowSubsystemsSection] = useState(true);

  // Modals state
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryInitialType, setInquiryInitialType] = useState<'mantenimiento' | 'falla' | 'alarma' | 'repuesto'>('mantenimiento');
  const [inquiryInitialTitle, setInquiryInitialTitle] = useState('');
  const [operatorModalVisible, setOperatorModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [specsModalVisible, setSpecsModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [drawerMenuVisible, setDrawerMenuVisible] = useState(false);

  // Quick Action Dialogs (Local fallback)
  const [localHoursModalVisible, setLocalHoursModalVisible] = useState(false);
  const [localFuelModalVisible, setLocalFuelModalVisible] = useState(false);
  const [hoursInput, setHoursInput] = useState('');
  const [fuelLitersInput, setFuelLitersInput] = useState('');
  const [fuelUsdInput, setFuelUsdInput] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const currentHours = useMemo(() => {
    if (!myMoto) return 0;
    return myMoto.currentHours || myMoto.currentOdometer || 0;
  }, [myMoto]);

  const specs = useMemo(() => {
    if (!myMoto) return null;
    return getMotoSpecs(myMoto.brand, myMoto.model);
  }, [myMoto]);

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

  // Financial & Fuel Statistics
  const fuelRecords = useMemo(() => records.filter((r) => r.type === 'fuel'), [records]);

  const totalFuelUSD = useMemo(
    () => fuelRecords.reduce((sum, r) => sum + (r.costUSD || 0), 0),
    [fuelRecords]
  );

  const totalFuelLiters = useMemo(() => {
    return fuelRecords.reduce((sum, r) => {
      const match = r.notes?.match(/(\d+(\.\d+)?)/);
      const liters = match ? parseFloat(match[1]) : 0;
      return sum + (isNaN(liters) ? 0 : liters);
    }, 0);
  }, [fuelRecords]);

  // 10 Industrial Subsystems (Read-Only Telemetry for Client)
  const plantSubsystems: SubsystemItem[] = useMemo(() => {
    const list: Array<Omit<SubsystemItem, 'wear' | 'hoursSince' | 'hoursRemaining' | 'status' | 'isInspected'>> = [
      {
        id: 'oil',
        name: 'Aceite Diésel 15W-40',
        interval: 250,
        color: '#22c55e',
        icon: 'oil-level',
        iconFamily: 'community',
        description: 'Lubricación hidrodinámica del bloque, cigüeñal y árbol de levas. Intervalo OEM para servicio pesado.',
      },
      {
        id: 'fuel_filter',
        name: 'Filtros Diésel & Racor',
        interval: 250,
        color: '#f59e0b',
        icon: 'filter-variant',
        iconFamily: 'community',
        description: 'Separación micrónica de partículas y trampa de agua para proteger la bomba de inyección.',
      },
      {
        id: 'air_filter',
        name: 'Filtro Aire Industrial',
        interval: 500,
        color: '#3b82f6',
        icon: 'air-filter',
        iconFamily: 'community',
        description: 'Filtrado de aire de admisión para combustión limpia en turbocompresores y cámaras de combustión.',
      },
      {
        id: 'coolant',
        name: 'Circuito Refrigerante & Radiador',
        interval: 1000,
        color: '#10b981',
        icon: 'coolant-temperature',
        iconFamily: 'community',
        description: 'Mezcla 50/50 etilenglicol con aditivos anticorrosivos. Regula temperatura operativa a 85°C - 95°C.',
      },
      {
        id: 'battery',
        name: 'Alternador & Baterías 24V',
        interval: 2000,
        color: '#00e3fd',
        icon: 'battery-charging-90',
        iconFamily: 'community',
        description: 'Tensión de arranque DC, estado de carga del cargador flotante y bornes de alta potencia.',
      },
      {
        id: 'accessory_belt',
        name: 'Correas Ventilador & Poleas',
        interval: 1000,
        color: '#ec4899',
        icon: 'fan',
        iconFamily: 'community',
        description: 'Tensión estriada y alineación de poleas que impulsan el ventilador de enfriamiento del radiador.',
      },
      {
        id: 'timing_belt',
        name: 'Válvulas e Inyectores',
        interval: 1500,
        color: '#6366f1',
        icon: 'engine',
        iconFamily: 'community',
        description: 'Calibración de holgura en tren de válvulas de admisión/escape y comprobación de toberas de inyección.',
      },
      {
        id: 'clutch',
        name: 'Aisladores Antivibratorios',
        interval: 3000,
        color: '#14b8a6',
        icon: 'vibrate',
        iconFamily: 'community',
        description: 'Tacos de goma de alta resistencia instalados entre el motor/generador y la bancada estructural.',
      },
      {
        id: 'transmission_fluid',
        name: 'Aislamiento Alternador Leroy',
        interval: 2500,
        color: '#f97316',
        icon: 'flash-on',
        iconFamily: 'material',
        description: 'Resistencia de aislamiento dieléctrico Megger en devanados principales del estator y rotor.',
      },
      {
        id: 'cabin_filter',
        name: 'Panel ComAp & Sensores',
        interval: 1200,
        color: '#06b6d4',
        icon: 'developer-board',
        iconFamily: 'material',
        description: 'Módulo inteligente de control digital ComAp InteliLite con lectura de presiones, pickups y ATS.',
      },
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

  // Find lowest remaining subsystem for "Next Service Due" card from inspected components
  const inspectedSubsystems = useMemo(() => plantSubsystems.filter((s) => s.isInspected), [plantSubsystems]);
  const nextDueSubsystem = useMemo(() => {
    if (!inspectedSubsystems.length) return null;
    return [...inspectedSubsystems].sort((a, b) => a.hoursRemaining - b.hoursRemaining)[0];
  }, [inspectedSubsystems]);

  const filteredSubsystems = useMemo(() => {
    if (!searchQuery.trim()) return plantSubsystems;
    const q = searchQuery.toLowerCase().trim();
    return plantSubsystems.filter(
      (sub) => sub.name.toLowerCase().includes(q) || sub.id.toLowerCase().includes(q)
    );
  }, [plantSubsystems, searchQuery]);

  const generalHealth = useMemo(() => {
    const inspected = plantSubsystems.filter((s) => s.isInspected);
    if (inspected.length === 0) return 0;
    const sum = inspected.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / inspected.length);
  }, [plantSubsystems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleTriggerHours = () => {
    if (onOpenQuickHours) {
      onOpenQuickHours();
    } else {
      setHoursInput('');
      setLocalHoursModalVisible(true);
    }
  };

  const handleTriggerFuel = () => {
    if (onOpenQuickFuel) {
      onOpenQuickFuel();
    } else {
      setFuelLitersInput('');
      setFuelUsdInput('');
      setLocalFuelModalVisible(true);
    }
  };

  const handleSaveLocalHours = () => {
    const odo = parseInt(hoursInput, 10);
    if (!odo || !myMoto || odo <= currentHours) {
      const msg = `Ingresa un valor mayor al horómetro actual (${currentHours.toLocaleString()} hrs).`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Horómetro Inválido', msg);
      return;
    }
    updateMoto({ currentOdometer: odo, currentHours: odo });
    setLocalHoursModalVisible(false);
    setHoursInput('');
    const successMsg = `Horómetro actualizado con éxito a ${odo.toLocaleString()} horas.`;
    if (Platform.OS === 'web') alert(successMsg);
    else Alert.alert('Registro Guardado', successMsg);
  };

  const handleSaveLocalFuel = () => {
    const liters = parseFloat(fuelLitersInput);
    const usd = parseFloat(fuelUsdInput);
    if (!liters || !usd || !myMoto) {
      const msg = 'Por favor ingresa litros y costo en USD válidos.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Datos Incompletos', msg);
      return;
    }
    addRecord({
      id: Math.random().toString(),
      type: 'fuel',
      date: new Date().toISOString(),
      odometer: currentHours,
      costUSD: usd,
      notes: `Carga de ${liters} Litros`,
    });
    setLocalFuelModalVisible(false);
    setFuelLitersInput('');
    setFuelUsdInput('');
    const successMsg = 'Carga de diésel registrada en tu historial.';
    if (Platform.OS === 'web') alert(successMsg);
    else Alert.alert('Combustible Registrado', successMsg);
  };

  const handleOpenWhatsAppOperator = () => {
    const plantName = myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Planta Eléctrica';
    const serial = myMoto?.serialNumber || myMoto?.plate || 'HL-PLANT-001';
    const loc = myMoto?.location || 'Sede Principal';
    const operatorName = myMoto?.assignedOperatorName || 'Operador Técnico Hermanos Lynch';
    const text = encodeURIComponent(
      `Hola ${operatorName}, me comunico desde la app móvil Hermanos Lynch respecto a la ${plantName} (Serial: ${serial}) ubicada en ${loc}. Requiero asistencia técnica.`
    );
    const url = `https://wa.me/584143059921?text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Contacto Directo', 'Línea de soporte técnico directo: +58 (414) 305-9921');
    });
  };

  const handleOpenInquiryForSubsystem = (sub: SubsystemItem) => {
    setSelectedSubsystem(null);
    setInquiryInitialType(sub.wear < 40 ? 'falla' : 'mantenimiento');
    setInquiryInitialTitle(`Revisión Técnica: ${sub.name}`);
    setInquiryModalVisible(true);
  };

  const scrollToSubsystems = () => {
    setShowSubsystemsSection(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 780, animated: true });
    }, 100);
  };

  // Aesthetic colors strictly derived from the reference template
  const bgMain = isDark ? '#0a0e14' : '#f4f6fa';
  const cardBg = isDark ? '#121722' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
  const tileBg = isDark ? '#161c28' : '#f0f3f8';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#8d98aa' : '#64748b';
  const accentEmerald = '#22c55e';
  const accentCyan = '#00e3fd';
  const accentAmber = '#f59e0b';
  const accentBlue = '#3b82f6';
  const accentPurple = '#a855f7';

  const plantLocation = myMoto?.location || 'Sede Principal';

  return (
    <View style={[styles.screenRoot, { backgroundColor: bgMain }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: Math.max(insets.top, 10), paddingBottom: 110 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentEmerald}
            colors={[accentEmerald, accentCyan]}
          />
        }
      >
        {/* ========================================================== */}
        {/* 1. TOP BAR: HAMBURGER MENU & NOTIFICATION BELL            */}
        {/* ========================================================== */}
        <View style={styles.navHeaderRow}>
          <TouchableOpacity
            onPress={() => setDrawerMenuVisible(true)}
            style={[styles.topIconCircleBtn, { backgroundColor: tileBg }]}
            activeOpacity={0.75}
          >
            <MaterialIcons name="menu" size={22} color={textPrimary} />
          </TouchableOpacity>

          <View style={styles.brandCenterContainer}>
            <Image source={HL_LOGO_REQUIRE} style={styles.topLogoSinNombre} resizeMode="contain" />
            <Text style={[styles.topBrandText, { color: textPrimary, fontFamily: F.bold }]}>
              HERMANOS LYNCH
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setNotificationsModalVisible(true)}
            style={[styles.topIconCircleBtn, { backgroundColor: tileBg }]}
            activeOpacity={0.75}
          >
            <MaterialIcons name="notifications-none" size={22} color={textPrimary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* ========================================================== */}
        {/* 2. HERO HEADLINE (From Screenshot: Your Car. Smarter...)   */}
        {/* ========================================================== */}
        <View style={styles.heroHeadlineSection}>
          <Text style={[styles.headlineTopLine, { color: textPrimary, fontFamily: F.extrabold }]}>
            Tu Planta.
          </Text>
          <Text style={[styles.headlineSubLine, { fontFamily: F.extrabold }]}>
            <Text style={{ color: accentEmerald }}>Inteligente</Text> en Cada Ciclo.
          </Text>
          <Text style={[styles.headlineDescription, { color: textSecondary, fontFamily: F.medium }]}>
            Monitorea, gestiona y cuida tu grupo electrógeno en un solo lugar.
          </Text>
        </View>

        {/* ========================================================== */}
        {/* 3. MACHINE VISUAL SHOWCASE CON INDICADORES DE CARRUSEL    */}
        {/* ========================================================== */}
        <View style={styles.machineShowcaseContainer}>
          <View style={styles.ambientAtmosphereGlow} />
          <Image
            source={plantImageSource}
            style={styles.machineHeroImage}
            resizeMode="contain"
          />

          {/* DOTS PAGINATION (Exact design from screenshot: [===] [·] [·]) */}
          <View style={styles.carouselDotsRow}>
            <View style={[styles.carouselDotActive, { backgroundColor: accentEmerald }]} />
            <View style={styles.carouselDotInactive} />
            <View style={styles.carouselDotInactive} />
          </View>
        </View>

        {/* ========================================================== */}
        {/* 4. "MY VEHICLE / MI PLANTA" CARD                          */}
        {/* ========================================================== */}
        <TouchableOpacity
          onPress={() => setSpecsModalVisible(true)}
          style={[styles.vehicleSelectorCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
          activeOpacity={0.85}
        >
          {/* THUMBNAIL */}
          <View style={[styles.vehicleThumbBox, { backgroundColor: tileBg }]}>
            <Image source={plantImageSource} style={styles.vehicleThumbImg} resizeMode="contain" />
          </View>

          {/* INFO */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.vehicleCardPretitle, { color: textSecondary, fontFamily: F.medium }]}>
              Mi Planta Eléctrica
            </Text>
            <Text style={[styles.vehicleCardTitle, { color: textPrimary, fontFamily: F.bold }]} numberOfLines={1}>
              {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Blue Power C35'}
            </Text>
            <View style={styles.statusPillBadge}>
              <View style={styles.statusPillGreenDot} />
              <Text style={{ fontFamily: F.bold, color: accentEmerald, fontSize: 10 }}>
                Óptimo · En Línea
              </Text>
            </View>
          </View>

          {/* RIGHT CHEVRON & READING */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <MaterialIcons name="chevron-right" size={20} color={textSecondary} />
            <Text style={[styles.vehicleReadingText, { color: textSecondary, fontFamily: F.semibold }]}>
              {currentHours.toLocaleString()} hrs
            </Text>
          </View>
        </TouchableOpacity>

        {/* ========================================================== */}
        {/* 5. 4 ACTION TILES: Telemetría, Diésel, Mantenimiento, QR  */}
        {/* ========================================================== */}
        <View style={styles.fourTilesRow}>
          {/* TILE 1: HEALTH CHECK / TELEMETRÍA */}
          <TouchableOpacity
            onPress={scrollToSubsystems}
            style={[styles.actionSquareTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.14)' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={20} color={accentEmerald} />
            </View>
            <Text style={[styles.tileLabelText, { color: textPrimary, fontFamily: F.bold }]}>
              Health Check
            </Text>
            <Text style={[styles.tileSublabelText, { color: textSecondary, fontFamily: F.medium }]}>
              Telemetría
            </Text>
          </TouchableOpacity>

          {/* TILE 2: FUEL TRACKER / DIÉSEL */}
          <TouchableOpacity
            onPress={handleTriggerFuel}
            style={[styles.actionSquareTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.14)' }]}>
              <MaterialIcons name="local-gas-station" size={20} color={accentAmber} />
            </View>
            <Text style={[styles.tileLabelText, { color: textPrimary, fontFamily: F.bold }]}>
              Fuel Tracker
            </Text>
            <Text style={[styles.tileSublabelText, { color: textSecondary, fontFamily: F.medium }]}>
              Carga Diésel
            </Text>
          </TouchableOpacity>

          {/* TILE 3: SERVICE REMINDERS / AGENDAR CITA */}
          <TouchableOpacity
            onPress={() => {
              setInquiryInitialType('mantenimiento');
              setInquiryInitialTitle('Mantenimiento Preventivo Programado');
              setInquiryModalVisible(true);
            }}
            style={[styles.actionSquareTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.14)' }]}>
              <MaterialIcons name="build" size={18} color={accentBlue} />
            </View>
            <Text style={[styles.tileLabelText, { color: textPrimary, fontFamily: F.bold }]}>
              Service Reminders
            </Text>
            <Text style={[styles.tileSublabelText, { color: textSecondary, fontFamily: F.medium }]}>
              Agendar Cita
            </Text>
          </TouchableOpacity>

          {/* TILE 4: EXPENSE LOG / EXPEDIENTE QR */}
          <TouchableOpacity
            onPress={() => setReportModalVisible(true)}
            style={[styles.actionSquareTile, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.14)' }]}>
              <MaterialIcons name="qr-code-2" size={20} color={accentPurple} />
            </View>
            <Text style={[styles.tileLabelText, { color: textPrimary, fontFamily: F.bold }]}>
              Expense Log
            </Text>
            <Text style={[styles.tileSublabelText, { color: textSecondary, fontFamily: F.medium }]}>
              Expediente QR
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================== */}
        {/* 6. "NEXT SERVICE DUE" HERO BANNER CARD                    */}
        {/* ========================================================== */}
        <View style={[styles.nextServiceCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.nextServiceTopRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.nextServiceHeaderTitle, { color: textPrimary, fontFamily: F.bold }]}>
                Next Service Due
              </Text>
              <Text style={[styles.nextServiceSubtitle, { color: textSecondary, fontFamily: F.medium }]} numberOfLines={1}>
                {nextDueSubsystem
                  ? `In ${nextDueSubsystem.hoursRemaining} hrs · ${nextDueSubsystem.name}`
                  : 'Pendiente primera inspección y calibración por operador'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (nextDueSubsystem) {
                  handleOpenInquiryForSubsystem(nextDueSubsystem);
                } else {
                  setInquiryInitialType('mantenimiento');
                  setInquiryInitialTitle('Solicitud de Mantenimiento Preventivo');
                  setInquiryModalVisible(true);
                }
              }}
              style={[styles.bookNowBtn, { backgroundColor: tileBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.bookNowBtnText, { color: textPrimary, fontFamily: F.bold }]}>
                Book Now →
              </Text>
            </TouchableOpacity>
          </View>

          {/* SLEEK PROGRESS BAR */}
          <View style={styles.nextServiceProgressTrack}>
            <View
              style={[
                styles.nextServiceProgressFill,
                {
                  width: nextDueSubsystem ? `${Math.max(10, nextDueSubsystem.wear)}%` : '0%',
                  backgroundColor: nextDueSubsystem ? accentEmerald : '#94a3b8',
                },
              ]}
            />
          </View>
        </View>

        {/* ========================================================== */}
        {/* 7. 3 METRIC CARDS ROW (15.4 Avg. Fuel, 42 hrs, 92 Score)  */}
        {/* ========================================================== */}
        <View style={styles.threeMetricsRow}>
          {/* METRIC 1: DIÉSEL */}
          <View style={[styles.metricBoxItem, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.metricBigNumber, { color: textPrimary, fontFamily: F.extrabold }]}>
              {totalFuelLiters > 0 ? totalFuelLiters : '180'}
            </Text>
            <Text style={[styles.metricLabelTitle, { color: textSecondary, fontFamily: F.medium }]}>
              Diésel Cargado
            </Text>
            <View style={styles.metricBottomSub}>
              <Text style={{ fontSize: 10, color: textSecondary, fontFamily: F.regular }}>Litros</Text>
              <View style={styles.miniGreenSparkline}>
                <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={14} color={accentEmerald} />
              </View>
            </View>
          </View>

          {/* METRIC 2: HORAS */}
          <TouchableOpacity
            onPress={handleTriggerHours}
            style={[styles.metricBoxItem, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.metricBigNumber, { color: textPrimary, fontFamily: F.extrabold }]}>
              {currentHours.toLocaleString()}
            </Text>
            <Text style={[styles.metricLabelTitle, { color: textSecondary, fontFamily: F.medium }]}>
              Horas Operación
            </Text>
            <View style={styles.metricBottomSub}>
              <Text style={{ fontSize: 10, color: textSecondary, fontFamily: F.regular }}>Horómetro</Text>
              <MaterialIcons name="edit" size={11} color={accentEmerald} />
            </View>
          </TouchableOpacity>

          {/* METRIC 3: DRIVE SCORE / SALUD OPERATIVA */}
          <View style={[styles.metricBoxItem, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.metricBigNumber, { color: textPrimary, fontFamily: F.extrabold }]}>
              {generalHealth}
            </Text>
            <Text style={[styles.metricLabelTitle, { color: textSecondary, fontFamily: F.medium }]}>
              Salud Equipo
            </Text>
            <View style={styles.metricBottomSub}>
              <View style={[styles.ecoLeafBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MaterialCommunityIcons name="leaf" size={10} color={accentEmerald} />
                <Text style={{ fontSize: 9.5, color: accentEmerald, fontFamily: F.bold, marginLeft: 2 }}>
                  Eco
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ========================================================== */}
        {/* 8. OPERADOR TÉCNICO ASIGNADO (INTEGRADO DE HERMANOS LYNCH) */}
        {/* ========================================================== */}
        <View style={[styles.operatorQuickCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.operatorLeftInfo}>
            <View style={[styles.operatorInitialsCircle, { backgroundColor: accentBlue }]}>
              <Text style={{ color: '#ffffff', fontFamily: F.bold, fontSize: 13 }}>
                {myMoto?.assignedOperatorName
                  ? myMoto.assignedOperatorName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                  : 'HL'}
              </Text>
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.operatorNameHeading, { color: textPrimary, fontFamily: F.bold }]} numberOfLines={1}>
                  {myMoto?.assignedOperatorName || 'Operador por Asignar'}
                </Text>
                <MaterialIcons name={myMoto?.assignedOperatorName ? 'verified' : 'schedule'} size={14} color={myMoto?.assignedOperatorName ? accentEmerald : accentAmber} />
              </View>
              <Text style={[styles.operatorRoleSubtext, { color: textSecondary, fontFamily: F.medium }]}>
                Técnico Certificado · {myMoto?.assignedOperatorId ? `HL-${myMoto.assignedOperatorId.slice(0, 4).toUpperCase()}` : 'En Proceso'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleOpenWhatsAppOperator}
            style={[styles.operatorWhatsAppDirectPill, { backgroundColor: '#25D366' }]}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="whatsapp" size={16} color="#ffffff" />
            <Text style={[styles.operatorWhatsAppDirectText, { fontFamily: F.bold }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================== */}
        {/* 9. SECCIÓN COMPLETA DE TELEMETRÍA (10 SUBSISTEMAS OEM)    */}
        {/* ========================================================== */}
        <View style={[styles.telemetrySectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TouchableOpacity
            onPress={() => setShowSubsystemsSection(!showSubsystemsSection)}
            style={styles.telemetryHeaderCollapsibleRow}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.telemetrySectionTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Telemetría Industrial
                </Text>
                <View style={[styles.readOnlyBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <MaterialIcons name="lock-outline" size={10} color={accentEmerald} />
                  <Text style={{ fontFamily: F.bold, color: accentEmerald, fontSize: 9 }}>LECTURA</Text>
                </View>
              </View>
              <Text style={[styles.telemetrySectionSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                10 subsistemas certificados bajo norma ISO 8528
              </Text>
            </View>

            <MaterialIcons
              name={showSubsystemsSection ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={textSecondary}
            />
          </TouchableOpacity>

          {showSubsystemsSection && (
            <>
              {/* SEARCH FILTER */}
              <View style={[styles.searchSubsystemsBox, { backgroundColor: tileBg, borderColor: cardBorder }]}>
                <MaterialIcons name="search" size={18} color={textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar componente o ciclo OEM..."
                  placeholderTextColor={textSecondary}
                  style={[styles.searchSubsystemsInput, { color: textPrimary, fontFamily: F.medium }]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={16} color={textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* LIST OF 10 SUBSYSTEMS */}
              <View style={styles.subsystemsVerticalList}>
                {filteredSubsystems.map((sub) => {
                  const statusColor = !sub.isInspected
                    ? '#94a3b8'
                    : sub.wear >= 60
                    ? accentEmerald
                    : sub.wear >= 30
                    ? accentAmber
                    : '#ef4444';

                  return (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => setSelectedSubsystem(sub)}
                      style={[styles.subsystemCardTile, { backgroundColor: tileBg, borderColor: cardBorder }]}
                      activeOpacity={0.75}
                    >
                      <View style={styles.subsystemCardTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                          <View style={[styles.subsystemIconBubble, { backgroundColor: cardBg }]}>
                            {sub.iconFamily === 'community' ? (
                              <MaterialCommunityIcons name={sub.icon as any} size={16} color={sub.color} />
                            ) : (
                              <MaterialIcons name={sub.icon as any} size={16} color={sub.color} />
                            )}
                          </View>
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.subsystemNameTitle, { color: textPrimary, fontFamily: F.bold }]} numberOfLines={1}>
                              {sub.name}
                            </Text>
                            <Text style={[styles.subsystemIntervalSub, { color: textSecondary, fontFamily: F.medium }]}>
                              Ciclo OEM: {sub.interval} hrs
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.wearBadgePill, { backgroundColor: `${statusColor}22` }]}>
                          <Text style={[styles.wearBadgeText, { color: statusColor, fontFamily: F.extrabold }]}>
                            {sub.isInspected ? `${sub.wear}%` : '0%'}
                          </Text>
                        </View>
                      </View>

                      {/* BAR */}
                      <View style={styles.subsystemProgressTrack}>
                        <View
                          style={[
                            styles.subsystemProgressFill,
                            {
                              width: sub.isInspected ? `${Math.max(4, sub.wear)}%` : '0%',
                              backgroundColor: statusColor,
                            },
                          ]}
                        />
                      </View>

                      {/* BOTTOM LINE */}
                      <View style={styles.subsystemCardBottomRow}>
                        <Text style={[styles.subsystemUsageInfo, { color: textSecondary, fontFamily: F.medium }]}>
                          Uso: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{sub.hoursSince} hrs</Text>
                        </Text>
                        <Text style={[styles.subsystemRemainingInfo, { color: statusColor, fontFamily: F.bold }]}>
                          {sub.isInspected ? `Restan: ${sub.hoursRemaining} hrs` : 'Pendiente inspección'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

      </ScrollView>

      {/* ========================================================== */}
      {/* MODAL 1: DETALLES DE SUBSISTEMA AL TOCAR TARJETA           */}
      {/* ========================================================== */}
      <Modal
        visible={!!selectedSubsystem}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedSubsystem(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.subsystemSheetCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sheetTopHandle} />

            {selectedSubsystem && (
              <>
                <View style={styles.sheetTitleHeader}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: `${selectedSubsystem.color}20` }]}>
                    {selectedSubsystem.iconFamily === 'community' ? (
                      <MaterialCommunityIcons name={selectedSubsystem.icon as any} size={26} color={selectedSubsystem.color} />
                    ) : (
                      <MaterialIcons name={selectedSubsystem.icon as any} size={26} color={selectedSubsystem.color} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.sheetMainTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.name}
                    </Text>
                    <Text style={[styles.sheetIntervalLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Intervalo de reemplazo OEM: {selectedSubsystem.interval} horas
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSubsystem(null)} style={styles.sheetCloseBtn}>
                    <MaterialIcons name="close" size={20} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sheetDescParagraph, { color: textSecondary, fontFamily: F.regular }]}>
                  {selectedSubsystem.description}
                </Text>

                <View style={styles.sheetMetricsRow}>
                  <View style={[styles.sheetMetricBox, { backgroundColor: tileBg }]}>
                    <Text style={[styles.sheetMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>Vida Útil</Text>
                    <Text style={[styles.sheetMetricVal, { color: !selectedSubsystem.isInspected ? '#94a3b8' : selectedSubsystem.wear >= 60 ? accentEmerald : accentAmber, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.isInspected ? `${selectedSubsystem.wear}%` : '0%'}
                    </Text>
                  </View>
                  <View style={[styles.sheetMetricBox, { backgroundColor: tileBg }]}>
                    <Text style={[styles.sheetMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>Horas Uso</Text>
                    <Text style={[styles.sheetMetricVal, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.hoursSince} hrs
                    </Text>
                  </View>
                  <View style={[styles.sheetMetricBox, { backgroundColor: tileBg }]}>
                    <Text style={[styles.sheetMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>Restantes</Text>
                    <Text style={[styles.sheetMetricVal, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.isInspected ? `${selectedSubsystem.hoursRemaining} hrs` : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenInquiryForSubsystem(selectedSubsystem)}
                  style={[styles.sheetActionSubmitBtn, { backgroundColor: accentEmerald }]}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={18} color="#0c1017" />
                  <Text style={[styles.sheetActionSubmitText, { fontFamily: F.bold }]}>
                    Agendar Revisión de Este Componente
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 2: NOTIFICACIONES                                    */}
      {/* ========================================================== */}
      <Modal
        visible={notificationsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.dialogHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="notifications" size={20} color={accentEmerald} />
                <Text style={[styles.dialogTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Centro de Alarmas
                </Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14, gap: 10 }}>
              <View style={[styles.notificationItemRow, { backgroundColor: tileBg }]}>
                <MaterialIcons name="check-circle" size={18} color={accentEmerald} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                    Sistema Telemático Operativo
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    Todos los 10 subsistemas registran valores dentro de tolerancias OEM.
                  </Text>
                </View>
              </View>

              <View style={[styles.notificationItemRow, { backgroundColor: tileBg }]}>
                <MaterialIcons name="build" size={18} color={accentAmber} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                    Próximo Mantenimiento: {nextDueSubsystem?.name}
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    Restan {nextDueSubsystem?.hoursRemaining} horas para el ciclo preventivo programado.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setNotificationsModalVisible(false)}
              style={[styles.dialogSolidBtn, { backgroundColor: accentEmerald }]}
            >
              <Text style={{ fontFamily: F.bold, color: '#0c1017' }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 3: MENÚ LATERAL DRAWER RÁPIDO                         */}
      {/* ========================================================== */}
      <Modal
        visible={drawerMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDrawerMenuVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.dialogHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={HL_LOGO_REQUIRE} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <Text style={[styles.dialogTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Hermanos Lynch
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDrawerMenuVisible(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10, gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setDrawerMenuVisible(false);
                  onNavigateToSpecs?.();
                }}
                style={[styles.drawerMenuItem, { backgroundColor: tileBg }]}
              >
                <MaterialIcons name="assignment" size={20} color={accentEmerald} />
                <Text style={[styles.drawerMenuText, { color: textPrimary, fontFamily: F.bold }]}>
                  Ficha Técnica de Planta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setDrawerMenuVisible(false);
                  onNavigateToHistory?.();
                }}
                style={[styles.drawerMenuItem, { backgroundColor: tileBg }]}
              >
                <MaterialIcons name="receipt-long" size={20} color={accentAmber} />
                <Text style={[styles.drawerMenuText, { color: textPrimary, fontFamily: F.bold }]}>
                  Historial de Servicios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setDrawerMenuVisible(false);
                  setReportModalVisible(true);
                }}
                style={[styles.drawerMenuItem, { backgroundColor: tileBg }]}
              >
                <MaterialIcons name="picture-as-pdf" size={20} color="#ef4444" />
                <Text style={[styles.drawerMenuText, { color: textPrimary, fontFamily: F.bold }]}>
                  Expediente PDF con QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setDrawerMenuVisible(false);
                  setOperatorModalVisible(true);
                }}
                style={[styles.drawerMenuItem, { backgroundColor: tileBg }]}
              >
                <MaterialIcons name="support-agent" size={20} color={accentBlue} />
                <Text style={[styles.drawerMenuText, { color: textPrimary, fontFamily: F.bold }]}>
                  Operador Técnico Asignado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.drawerMenuItem, { backgroundColor: tileBg }]}
              >
                <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={20} color="#ffb703" />
                <Text style={[styles.drawerMenuText, { color: textPrimary, fontFamily: F.bold }]}>
                  Modo {isDark ? 'Claro' : 'Oscuro'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={logout}
              style={[styles.dialogOutlineBtn, { borderColor: '#ef4444', marginTop: 8 }]}
            >
              <Text style={{ fontFamily: F.bold, color: '#ef4444' }}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* 10. MODALES OFICIALES COMPARTIDOS                          */}
      {/* ========================================================== */}
      <ClientInquiryModal
        visible={inquiryModalVisible}
        onClose={() => setInquiryModalVisible(false)}
      />

      <AssignedOperatorModal
        visible={operatorModalVisible}
        onClose={() => setOperatorModalVisible(false)}
        myMoto={myMoto}
      />

      <VehicleReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        myMoto={myMoto}
        specs={specs}
      />

      <TechnicalSheetModal
        visible={specsModalVisible}
        onClose={() => setSpecsModalVisible(false)}
        myMoto={myMoto}
        specs={specs}
      />

      {/* MODAL RÁPIDO NATIVO: HORÓMETRO */}
      <Modal
        visible={localHoursModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLocalHoursModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                Actualizar Horómetro
              </Text>
              <TouchableOpacity onPress={() => setLocalHoursModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.dialogSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
              Horas actuales: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{currentHours.toLocaleString()} hrs</Text>
            </Text>

            <TextInput
              value={hoursInput}
              onChangeText={setHoursInput}
              placeholder={`Mayor a ${currentHours} hrs`}
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: tileBg, color: textPrimary, borderColor: cardBorder, fontFamily: F.bold }]}
            />

            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                onPress={() => setLocalHoursModalVisible(false)}
                style={[styles.dialogOutlineBtn, { borderColor: cardBorder }]}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveLocalHours}
                style={[styles.dialogSolidBtn, { backgroundColor: accentEmerald }]}
              >
                <Text style={{ fontFamily: F.bold, color: '#0c1017' }}>Guardar Horas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL RÁPIDO NATIVO: DIÉSEL */}
      <Modal
        visible={localFuelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLocalFuelModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                Cargar Diésel
              </Text>
              <TouchableOpacity onPress={() => setLocalFuelModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.bold }]}>
              LITROS DE DIÉSEL:
            </Text>
            <TextInput
              value={fuelLitersInput}
              onChangeText={setFuelLitersInput}
              placeholder="Ej. 100"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: tileBg, color: textPrimary, borderColor: cardBorder, fontFamily: F.bold, marginBottom: 12 }]}
            />

            <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.bold }]}>
              MONTO TOTAL (USD $):
            </Text>
            <TextInput
              value={fuelUsdInput}
              onChangeText={setFuelUsdInput}
              placeholder="Ej. 50.00"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: tileBg, color: textPrimary, borderColor: cardBorder, fontFamily: F.bold }]}
            />

            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                onPress={() => setLocalFuelModalVisible(false)}
                style={[styles.dialogOutlineBtn, { borderColor: cardBorder }]}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveLocalFuel}
                style={[styles.dialogSolidBtn, { backgroundColor: accentAmber }]}
              >
                <Text style={{ fontFamily: F.bold, color: '#0c1017' }}>Guardar Carga</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 18,
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topIconCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandCenterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topLogoSinNombre: {
    width: 22,
    height: 22,
  },
  topBrandText: {
    fontSize: 13,
    letterSpacing: 1.2,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  heroHeadlineSection: {
    marginBottom: 14,
  },
  headlineTopLine: {
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headlineSubLine: {
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: -2,
  },
  headlineDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  machineShowcaseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 190,
    position: 'relative',
    marginVertical: 4,
  },
  ambientAtmosphereGlow: {
    position: 'absolute',
    width: 200,
    height: 140,
    borderRadius: 100,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  machineHeroImage: {
    width: '100%',
    height: 175,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'absolute',
    bottom: 2,
  },
  carouselDotActive: {
    width: 22,
    height: 4,
    borderRadius: 2,
  },
  carouselDotInactive: {
    width: 5,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  vehicleSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  vehicleThumbBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  vehicleThumbImg: {
    width: 44,
    height: 44,
  },
  vehicleCardPretitle: {
    fontSize: 10.5,
  },
  vehicleCardTitle: {
    fontSize: 14.5,
    marginTop: 1,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusPillGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22c55e',
  },
  vehicleReadingText: {
    fontSize: 11,
    marginTop: 4,
  },
  fourTilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionSquareTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileLabelText: {
    fontSize: 10.5,
    textAlign: 'center',
  },
  tileSublabelText: {
    fontSize: 8.5,
    marginTop: 2,
    textAlign: 'center',
  },
  nextServiceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  nextServiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  nextServiceHeaderTitle: {
    fontSize: 14,
  },
  nextServiceSubtitle: {
    fontSize: 11,
    marginTop: 3,
  },
  bookNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookNowBtnText: {
    fontSize: 11,
  },
  nextServiceProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  nextServiceProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  threeMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBoxItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  metricBigNumber: {
    fontSize: 18,
  },
  metricLabelTitle: {
    fontSize: 10,
    marginTop: 3,
  },
  metricBottomSub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  miniGreenSparkline: {
    opacity: 0.9,
  },
  ecoLeafBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  operatorQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  operatorLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  operatorInitialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorNameHeading: {
    fontSize: 13,
  },
  operatorRoleSubtext: {
    fontSize: 10.5,
    marginTop: 1,
  },
  operatorWhatsAppDirectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  operatorWhatsAppDirectText: {
    color: '#ffffff',
    fontSize: 11,
  },
  telemetrySectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  telemetryHeaderCollapsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetrySectionTitle: {
    fontSize: 15,
  },
  telemetrySectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  searchSubsystemsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  searchSubsystemsInput: {
    flex: 1,
    fontSize: 11.5,
  },
  subsystemsVerticalList: {
    gap: 8,
    marginTop: 4,
  },
  subsystemCardTile: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  subsystemCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subsystemIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subsystemNameTitle: {
    fontSize: 12,
  },
  subsystemIntervalSub: {
    fontSize: 10,
  },
  wearBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wearBadgeText: {
    fontSize: 11,
  },
  subsystemProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  subsystemProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  subsystemCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subsystemUsageInfo: {
    fontSize: 10.5,
  },
  subsystemRemainingInfo: {
    fontSize: 10.5,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  subsystemSheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
  },
  sheetTopHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetMainTitle: {
    fontSize: 16,
  },
  sheetIntervalLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetDescParagraph: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  sheetMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  sheetMetricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  sheetMetricLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  sheetMetricVal: {
    fontSize: 15,
  },
  sheetActionSubmitBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetActionSubmitText: {
    color: '#0c1017',
    fontSize: 12.5,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogTitle: {
    fontSize: 16,
  },
  dialogSubtitle: {
    fontSize: 11.5,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  dialogInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialogOutlineBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogSolidBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItemRow: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  drawerMenuText: {
    fontSize: 12.5,
  },
});
