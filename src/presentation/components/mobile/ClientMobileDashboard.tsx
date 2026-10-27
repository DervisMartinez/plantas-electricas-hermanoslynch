import React, { useState, useMemo, useCallback } from 'react';
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
  status: 'ÓPTIMO' | 'PREVENTIVO' | 'REQUIERE REVISIÓN';
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

  // Modals state
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [inquiryInitialType, setInquiryInitialType] = useState<'mantenimiento' | 'falla' | 'alarma' | 'repuesto'>('mantenimiento');
  const [inquiryInitialTitle, setInquiryInitialTitle] = useState('');
  const [operatorModalVisible, setOperatorModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [specsModalVisible, setSpecsModalVisible] = useState(false);

  // Quick Action Dialogs (Local fallback if parent does not provide)
  const [localHoursModalVisible, setLocalHoursModalVisible] = useState(false);
  const [localFuelModalVisible, setLocalFuelModalVisible] = useState(false);
  const [hoursInput, setHoursInput] = useState('');
  const [fuelLitersInput, setFuelLitersInput] = useState('');
  const [fuelUsdInput, setFuelUsdInput] = useState('');

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
    const list: Array<Omit<SubsystemItem, 'wear' | 'hoursSince' | 'hoursRemaining' | 'status'>> = [
      {
        id: 'oil',
        name: 'Aceite Diésel 15W-40',
        interval: 250,
        color: '#1a5cff',
        icon: 'oil-level',
        iconFamily: 'community',
        description: 'Lubricación hidrodinámica del bloque, cigüeñal y árbol de levas. Intervalo OEM para servicio pesado.',
      },
      {
        id: 'fuel_filter',
        name: 'Filtros Diésel & Racor',
        interval: 250,
        color: '#8b5cf6',
        icon: 'filter-variant',
        iconFamily: 'community',
        description: 'Separación micrónica de partículas y trampa de agua para proteger la bomba de inyección.',
      },
      {
        id: 'air_filter',
        name: 'Filtro Aire Industrial',
        interval: 500,
        color: '#f59e0b',
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
      let wear = 100;
      let hoursSince = 0;
      let hoursRemaining = item.interval;

      if (typeRecords.length > 0) {
        const lastHours = Math.max(...typeRecords.map((r) => r.odometer || 0));
        hoursSince = Math.max(0, currentHours - lastHours);
        const ratio = Math.max(0, 1 - hoursSince / item.interval);
        wear = Math.min(100, Math.round(ratio * 100));
        hoursRemaining = Math.max(0, item.interval - hoursSince);
      } else if (currentHours > 0) {
        const usedInCycle = currentHours % item.interval;
        hoursSince = usedInCycle;
        const ratio = Math.max(0, 1 - usedInCycle / item.interval);
        wear = Math.min(100, Math.round(ratio * 100));
        hoursRemaining = Math.max(0, item.interval - usedInCycle);
      } else {
        wear = 100;
        hoursSince = 0;
        hoursRemaining = item.interval;
      }

      return {
        ...item,
        wear,
        hoursSince,
        hoursRemaining,
        status: wear >= 60 ? 'ÓPTIMO' : wear >= 30 ? 'PREVENTIVO' : 'REQUIERE REVISIÓN',
      };
    });
  }, [records, currentHours]);

  const filteredSubsystems = useMemo(() => {
    if (!searchQuery.trim()) return plantSubsystems;
    const q = searchQuery.toLowerCase().trim();
    return plantSubsystems.filter(
      (sub) => sub.name.toLowerCase().includes(q) || sub.id.toLowerCase().includes(q)
    );
  }, [plantSubsystems, searchQuery]);

  const generalHealth = useMemo(() => {
    if (plantSubsystems.length === 0) return 100;
    const sum = plantSubsystems.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / plantSubsystems.length);
  }, [plantSubsystems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simular o activar re-sincronización con Supabase
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  }, []);

  // Handlers for Hours and Fuel
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
    const text = encodeURIComponent(
      `Hola ${myMoto?.assignedOperatorName || 'Ing. Alejandro Rivas'}, me comunico desde la app móvil Hermanos Lynch respecto a la ${plantName} (Serial: ${serial}) ubicada en ${loc}. Requiero asistencia técnica.`
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

  // Colors & Theme Architecture
  const bgMain = isDark ? '#0c1017' : '#f5f7fb';
  const cardBg = isDark ? '#141824' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const pillDarkBg = isDark ? '#1b2132' : '#edf2f7';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#8fa0be' : '#64748b';
  const accentBlue = '#1a5cff';
  const accentCyan = '#00e3fd';
  const greenLive = '#22c55e';

  const plantLocation = myMoto?.location || 'Ubicación sin registrar';

  return (
    <View style={[styles.screenRoot, { backgroundColor: bgMain }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentCyan}
            colors={[accentBlue, accentCyan]}
          />
        }
      >
        {/* ========================================================== */}
        {/* 1. TOP MOBILE HEADER: MARCA, EN LÍNEA & ACCIONES RÁPIDAS */}
        {/* ========================================================== */}
        <View style={styles.topHeaderCard}>
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: isDark ? '#1b2132' : '#e0f2fe' }]}>
              <Image source={HL_LOGO_REQUIRE} style={styles.logoImg} resizeMode="contain" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.headerBrandTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  HERMANOS LYNCH
                </Text>
                <View style={[styles.liveStatusPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <View style={styles.livePulseDot} />
                  <Text style={{ fontFamily: F.bold, color: greenLive, fontSize: 10 }}>EN LÍNEA</Text>
                </View>
              </View>

              <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                Telemetría de Planta • {plantLocation}
              </Text>
            </View>

            {/* THEME TOGGLE BUTTON */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.headerThemeBtn, { backgroundColor: pillDarkBg }]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isDark ? 'light-mode' : 'dark-mode'}
                size={18}
                color={isDark ? '#ffb703' : '#1a5cff'}
              />
            </TouchableOpacity>
          </View>

          {/* QUICK TOP ACTIONS BAR */}
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              onPress={handleTriggerHours}
              style={[styles.headerActionBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={16} color="#ffffff" />
              <Text style={[styles.headerActionBtnText, { color: '#ffffff', fontFamily: F.bold }]}>
                + HORAS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTriggerFuel}
              style={[styles.headerActionBtn, { backgroundColor: accentCyan }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="local-gas-station" size={16} color="#0c1017" />
              <Text style={[styles.headerActionBtnText, { color: '#0c1017', fontFamily: F.bold }]}>
                + DIÉSEL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              style={[styles.headerActionBtn, { backgroundColor: '#ef4444' }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="qr-code" size={16} color="#ffffff" />
              <Text style={[styles.headerActionBtnText, { color: '#ffffff', fontFamily: F.bold }]}>
                PDF QR
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================== */}
        {/* 2. SHOWCASE HERO DE LA PLANTA DEL CLIENTE */}
        {/* ========================================================== */}
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* BADGES HEADER ROW */}
          <View style={styles.heroBadgeRow}>
            <View style={[styles.kvaStandbyBadge, { backgroundColor: 'rgba(0, 227, 253, 0.12)' }]}>
              <MaterialIcons name="bolt" size={14} color={accentCyan} />
              <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 11 }}>
                {myMoto ? `${myMoto.powerKva || 35} kVA / ${myMoto.powerKw || 28} kW STANDBY` : 'GRUPO ELECTRÓGENO'}
              </Text>
            </View>

            <View style={[styles.roleBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
              <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 10 }}>PORTAL CLIENTE</Text>
            </View>
          </View>

          {/* PLANT TITLE & MODEL */}
          <Text style={[styles.heroPlantTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
            {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Generador Diésel Blue Power'}
          </Text>

          <Text style={[styles.heroSerialText, { color: textSecondary, fontFamily: F.medium }]}>
            Serial: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{myMoto?.serialNumber || myMoto?.plate || 'BPG-HL-001'}</Text>
          </Text>

          {/* PLANT HIGH-RES IMAGE WITH ATMOSPHERIC GLOW */}
          <View style={styles.heroImageWrapper}>
            <View style={styles.heroImageBackdropGlow} />
            <Image
              source={plantImageSource}
              style={styles.heroPlantImage}
              resizeMode="contain"
            />

            {/* HOROMETER BADGE (TACTILE TAP TO EDIT) */}
            <TouchableOpacity
              onPress={handleTriggerHours}
              style={[styles.heroHorometerPill, { backgroundColor: 'rgba(16, 21, 31, 0.94)', borderColor: cardBorder }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="timer" size={16} color={accentCyan} />
              <Text style={[styles.heroHorometerText, { fontFamily: F.bold }]}>
                {currentHours.toLocaleString()} hrs
              </Text>
              <View style={styles.editPencilBubble}>
                <MaterialIcons name="edit" size={11} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* SPECIFICATION CHIPS */}
          <View style={styles.heroChipsGrid}>
            <View style={[styles.heroChipItem, { backgroundColor: pillDarkBg }]}>
              <MaterialCommunityIcons name="engine" size={14} color={accentCyan} />
              <Text style={[styles.heroChipText, { color: textPrimary, fontFamily: F.semibold }]} numberOfLines={1}>
                {specs?.engineType || 'Cummins 3.9L Diésel'}
              </Text>
            </View>

            <View style={[styles.heroChipItem, { backgroundColor: pillDarkBg }]}>
              <MaterialIcons name="cached" size={14} color="#f59e0b" />
              <Text style={[styles.heroChipText, { color: textPrimary, fontFamily: F.semibold }]} numberOfLines={1}>
                {specs?.transmission || 'Leroy Somer TAL-042'}
              </Text>
            </View>

            <View style={[styles.heroChipItem, { backgroundColor: pillDarkBg }]}>
              <MaterialIcons name="developer-board" size={14} color="#10b981" />
              <Text style={[styles.heroChipText, { color: textPrimary, fontFamily: F.semibold }]} numberOfLines={1}>
                ComAp InteliLite IL-9
              </Text>
            </View>
          </View>

          {/* CLIENT ACTION BUTTONS GRID */}
          <View style={styles.heroActionButtonsGrid}>
            <TouchableOpacity
              onPress={() => setSpecsModalVisible(true)}
              style={[styles.heroActionBtn, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="assignment" size={16} color={textPrimary} />
              <Text style={[styles.heroActionBtnText, { color: textPrimary, fontFamily: F.bold }]}>
                Ficha Técnica
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              style={[styles.heroActionBtn, { backgroundColor: '#ef4444' }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="picture-as-pdf" size={16} color="#ffffff" />
              <Text style={[styles.heroActionBtnText, { color: '#ffffff', fontFamily: F.bold }]}>
                Expediente PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOperatorModalVisible(true)}
              style={[styles.heroActionBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="support-agent" size={16} color="#ffffff" />
              <Text style={[styles.heroActionBtnText, { color: '#ffffff', fontFamily: F.bold }]}>
                Contactar Técnico
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setInquiryInitialType('mantenimiento');
                setInquiryInitialTitle('Solicitud de Mantenimiento / Revisión');
                setInquiryModalVisible(true);
              }}
              style={[styles.heroActionBtn, { backgroundColor: '#10b981' }]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#ffffff" />
              <Text style={[styles.heroActionBtnText, { color: '#ffffff', fontFamily: F.bold }]}>
                Agendar Cita
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================== */}
        {/* 3. OPERADOR TÉCNICO ASIGNADO A LA PLANTA */}
        {/* ========================================================== */}
        <View style={[styles.operatorCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.operatorTopRow}>
            <View style={[styles.operatorAvatarBadge, { backgroundColor: accentBlue }]}>
              <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 16 }}>
                {myMoto?.assignedOperatorName
                  ? myMoto.assignedOperatorName
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'HL'}
              </Text>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.operatorNameText, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {myMoto?.assignedOperatorName || 'Ing. Alejandro Rivas Silva'}
                </Text>
                <MaterialIcons name="verified" size={16} color="#22c55e" />
              </View>

              <Text style={[styles.operatorTitleSub, { color: textSecondary, fontFamily: F.medium }]}>
                Operador Técnico Responsable • Carnet:{' '}
                <Text style={{ color: accentCyan, fontFamily: F.bold }}>
                  {myMoto?.assignedOperatorId
                    ? `HL-TECH-${myMoto.assignedOperatorId.slice(0, 4).toUpperCase()}`
                    : 'HL-TECH-4098'}
                </Text>
              </Text>
            </View>
          </View>

          {/* OPERATOR DIRECT ACTIONS */}
          <View style={styles.operatorActionsRow}>
            <TouchableOpacity
              onPress={handleOpenWhatsAppOperator}
              style={[styles.whatsappDirectBtn, { backgroundColor: '#25D366' }]}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#ffffff" />
              <Text style={[styles.whatsappDirectText, { fontFamily: F.bold }]}>
                WhatsApp (+58 414 305-9921)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOperatorModalVisible(true)}
              style={[styles.operatorFichaBtn, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="chevron-right" size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================== */}
        {/* 4. BALANCE OPERATIVO & CONTROL DE DIÉSEL (BENTO KPIS) */}
        {/* ========================================================== */}
        <View style={[styles.balanceCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.balanceHeaderRow}>
            <View>
              <Text style={[styles.balanceTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                Balance Operativo & Diésel
              </Text>
              <Text style={[styles.balanceSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                Horas acumuladas y consumo en tu instalación
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleTriggerFuel}
              style={[styles.addDieselBtn, { backgroundColor: accentCyan }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="local-gas-station" size={16} color="#0c1017" />
              <Text style={{ fontFamily: F.bold, color: '#0c1017', fontSize: 11 }}>+ DIÉSEL</Text>
            </TouchableOpacity>
          </View>

          {/* 4 KPI CARDS IN 2x2 MOBILE GRID */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCardItem, { backgroundColor: pillDarkBg }]}>
              <Text style={[styles.kpiCardLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Horas Acumuladas
              </Text>
              <Text style={[styles.kpiCardValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                {currentHours.toLocaleString()} <Text style={{ fontSize: 13, fontFamily: F.medium }}>hrs</Text>
              </Text>
            </View>

            <View style={[styles.kpiCardItem, { backgroundColor: pillDarkBg }]}>
              <Text style={[styles.kpiCardLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Diésel Cargado
              </Text>
              <Text style={[styles.kpiCardValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                {totalFuelLiters} <Text style={{ fontSize: 13, fontFamily: F.medium }}>L</Text>
              </Text>
            </View>

            <View style={[styles.kpiCardItem, { backgroundColor: pillDarkBg }]}>
              <Text style={[styles.kpiCardLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Gasto en Diésel
              </Text>
              <Text style={[styles.kpiCardValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                ${totalFuelUSD.toFixed(2)} <Text style={{ fontSize: 13, fontFamily: F.medium }}>USD</Text>
              </Text>
            </View>

            <View style={[styles.kpiCardItem, { backgroundColor: pillDarkBg }]}>
              <Text style={[styles.kpiCardLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Salud Operativa
              </Text>
              <Text style={[styles.kpiCardValue, { color: greenLive, fontFamily: F.extrabold }]}>
                {generalHealth}%
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================== */}
        {/* 5. TELEMETRÍA DE LOS 10 SUBSISTEMAS (MODO LECTURA CLIENTE) */}
        {/* ========================================================== */}
        <View style={[styles.telemetryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.telemetryTitleRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.telemetryHeading, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Subsistemas en Tiempo Real
                </Text>
                <View style={[styles.readOnlyLockPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <MaterialIcons name="lock-outline" size={11} color={greenLive} />
                  <Text style={{ fontFamily: F.bold, color: greenLive, fontSize: 9 }}>LECTURA</Text>
                </View>
              </View>
              <Text style={[styles.telemetrySubheading, { color: textSecondary, fontFamily: F.medium }]}>
                Monitoreo de desgaste y ciclos preventivos de los 10 componentes críticos
              </Text>
            </View>
          </View>

          {/* OFFICIAL ISO 8528 NOTICE BANNER */}
          <View style={[styles.isoNoticeBox, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}>
            <MaterialIcons name="info-outline" size={16} color={accentCyan} />
            <Text style={[styles.isoNoticeText, { color: textSecondary, fontFamily: F.medium }]}>
              Para preservar la garantía y normas ISO 8528, los cambios de fluidos y reseteos son ejecutados por el técnico certificado.
            </Text>
          </View>

          {/* SEARCH SUBSYSTEMS INPUT */}
          <View style={[styles.searchPillBox, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}>
            <MaterialIcons name="search" size={18} color={textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar componente o ciclo..."
              placeholderTextColor={textSecondary}
              style={[styles.searchPillInput, { color: textPrimary, fontFamily: F.medium }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={16} color={textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* 10 SUBSYSTEMS LIST */}
          <View style={styles.subsystemsList}>
            {filteredSubsystems.map((sub) => {
              const statusColor =
                sub.wear >= 60 ? greenLive : sub.wear >= 30 ? '#f59e0b' : '#ef4444';

              return (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => setSelectedSubsystem(sub)}
                  style={[styles.subsystemCard, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}
                  activeOpacity={0.75}
                >
                  <View style={styles.subsystemTopLine}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                      <View style={[styles.subsystemIconCircle, { backgroundColor: isDark ? '#141824' : '#ffffff' }]}>
                        {sub.iconFamily === 'community' ? (
                          <MaterialCommunityIcons name={sub.icon as any} size={18} color={sub.color} />
                        ) : (
                          <MaterialIcons name={sub.icon as any} size={18} color={sub.color} />
                        )}
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[styles.subsystemNameText, { color: textPrimary, fontFamily: F.bold }]} numberOfLines={1}>
                          {sub.name}
                        </Text>
                        <Text style={[styles.subsystemIntervalText, { color: textSecondary, fontFamily: F.medium }]}>
                          Ciclo OEM: {sub.interval} hrs
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.subsystemPercentBadge, { backgroundColor: `${statusColor}22` }]}>
                      <Text style={[styles.subsystemPercentText, { color: statusColor, fontFamily: F.extrabold }]}>
                        {sub.wear}%
                      </Text>
                    </View>
                  </View>

                  {/* PROGRESS BAR */}
                  <View style={[styles.subsystemBarTrack, { backgroundColor: isDark ? '#10131d' : '#e2e8f0' }]}>
                    <View
                      style={[
                        styles.subsystemBarFill,
                        {
                          width: `${Math.max(4, sub.wear)}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>

                  {/* BOTTOM INFO ROW */}
                  <View style={styles.subsystemBottomLine}>
                    <Text style={[styles.subsystemUsageText, { color: textSecondary, fontFamily: F.medium }]}>
                      Transcurrido: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{sub.hoursSince} hrs</Text>
                    </Text>
                    <Text style={[styles.subsystemRemainingText, { color: statusColor, fontFamily: F.bold }]}>
                      Restan: {sub.hoursRemaining} hrs
                    </Text>
                  </View>

                  <View style={styles.subsystemStatusPillRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusTextLabel, { color: statusColor, fontFamily: F.bold }]}>
                      {sub.status}
                    </Text>
                    <MaterialIcons name="chevron-right" size={16} color={textSecondary} style={{ marginLeft: 'auto' }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* ========================================================== */}
      {/* 6. MODAL: DETALLES DE SUBSISTEMA AL TOCAR TARJETA */}
      {/* ========================================================== */}
      <Modal
        visible={!!selectedSubsystem}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedSubsystem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailSheet, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.sheetDragHandle, { backgroundColor: textSecondary }]} />

            {selectedSubsystem && (
              <>
                <View style={styles.sheetHeaderRow}>
                  <View style={[styles.detailIconCircle, { backgroundColor: `${selectedSubsystem.color}20` }]}>
                    {selectedSubsystem.iconFamily === 'community' ? (
                      <MaterialCommunityIcons name={selectedSubsystem.icon as any} size={28} color={selectedSubsystem.color} />
                    ) : (
                      <MaterialIcons name={selectedSubsystem.icon as any} size={28} color={selectedSubsystem.color} />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.detailSheetTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.name}
                    </Text>
                    <Text style={[styles.detailSheetSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                      Ciclo de reemplazo OEM: {selectedSubsystem.interval} horas
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedSubsystem(null)}
                    style={[styles.closeSheetBtn, { backgroundColor: pillDarkBg }]}
                  >
                    <MaterialIcons name="close" size={20} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* DESCRIPTION */}
                <Text style={[styles.detailSheetDescription, { color: textSecondary, fontFamily: F.regular }]}>
                  {selectedSubsystem.description}
                </Text>

                {/* METRICS ROW */}
                <View style={styles.detailSheetMetrics}>
                  <View style={[styles.detailMetricBox, { backgroundColor: pillDarkBg }]}>
                    <Text style={[styles.detailMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Vida Restante
                    </Text>
                    <Text
                      style={[
                        styles.detailMetricValue,
                        {
                          color:
                            selectedSubsystem.wear >= 60 ? greenLive : selectedSubsystem.wear >= 30 ? '#f59e0b' : '#ef4444',
                          fontFamily: F.extrabold,
                        },
                      ]}
                    >
                      {selectedSubsystem.wear}%
                    </Text>
                  </View>

                  <View style={[styles.detailMetricBox, { backgroundColor: pillDarkBg }]}>
                    <Text style={[styles.detailMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Horas de Uso
                    </Text>
                    <Text style={[styles.detailMetricValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.hoursSince} hrs
                    </Text>
                  </View>

                  <View style={[styles.detailMetricBox, { backgroundColor: pillDarkBg }]}>
                    <Text style={[styles.detailMetricLabel, { color: textSecondary, fontFamily: F.medium }]}>
                      Horas Restantes
                    </Text>
                    <Text style={[styles.detailMetricValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {selectedSubsystem.hoursRemaining} hrs
                    </Text>
                  </View>
                </View>

                {/* ACTION: NOTIFY OPERATOR OR SCHEDULE APPOINTMENT */}
                <View style={styles.detailSheetActions}>
                  <TouchableOpacity
                    onPress={() => handleOpenInquiryForSubsystem(selectedSubsystem)}
                    style={[styles.sheetScheduleBtn, { backgroundColor: accentBlue }]}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="calendar-clock" size={18} color="#ffffff" />
                    <Text style={[styles.sheetScheduleBtnText, { fontFamily: F.bold }]}>
                      Notificar Técnico / Agendar Servicio
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedSubsystem(null)}
                    style={[styles.sheetCancelBtn, { borderColor: cardBorder }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sheetCancelBtnText, { color: textPrimary, fontFamily: F.bold }]}>
                      Cerrar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* 7. MODALES OFICIALES COMPARTIDOS */}
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

      {/* ========================================================== */}
      {/* 8. MODAL RÁPIDO NATIVO: ACTUALIZAR HORÓMETRO */}
      {/* ========================================================== */}
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
              Horómetro actual: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{currentHours.toLocaleString()} hrs</Text>
            </Text>

            <TextInput
              value={hoursInput}
              onChangeText={setHoursInput}
              placeholder={`Mayor a ${currentHours} hrs`}
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              style={[
                styles.dialogInput,
                {
                  backgroundColor: pillDarkBg,
                  color: textPrimary,
                  borderColor: cardBorder,
                  fontFamily: F.bold,
                },
              ]}
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
                style={[styles.dialogSolidBtn, { backgroundColor: accentBlue }]}
              >
                <Text style={{ fontFamily: F.bold, color: '#ffffff' }}>Guardar Horas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* 9. MODAL RÁPIDO NATIVO: CARGAR DIÉSEL */}
      {/* ========================================================== */}
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

            <Text style={[styles.dialogSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
              Registra el combustible suministrado a la planta
            </Text>

            <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.bold }]}>
              LITROS DE DIÉSEL:
            </Text>
            <TextInput
              value={fuelLitersInput}
              onChangeText={setFuelLitersInput}
              placeholder="Ej. 50"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              style={[
                styles.dialogInput,
                {
                  backgroundColor: pillDarkBg,
                  color: textPrimary,
                  borderColor: cardBorder,
                  fontFamily: F.bold,
                  marginBottom: 12,
                },
              ]}
            />

            <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.bold }]}>
              MONTO TOTAL (USD $):
            </Text>
            <TextInput
              value={fuelUsdInput}
              onChangeText={setFuelUsdInput}
              placeholder="Ej. 25.00"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              style={[
                styles.dialogInput,
                {
                  backgroundColor: pillDarkBg,
                  color: textPrimary,
                  borderColor: cardBorder,
                  fontFamily: F.bold,
                },
              ]}
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
                style={[styles.dialogSolidBtn, { backgroundColor: accentCyan }]}
              >
                <Text style={{ fontFamily: F.bold, color: '#0c1017' }}>Guardar Diésel</Text>
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
    paddingHorizontal: 16,
  },
  topHeaderCard: {
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImg: {
    width: 26,
    height: 26,
  },
  headerBrandTitle: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerThemeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerActionBtnText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kvaStandbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroPlantTitle: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  heroSerialText: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 12,
  },
  heroImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 180,
    marginBottom: 14,
  },
  heroImageBackdropGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 227, 253, 0.08)',
  },
  heroPlantImage: {
    width: '100%',
    height: 170,
  },
  heroHorometerPill: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroHorometerText: {
    color: '#ffffff',
    fontSize: 12,
  },
  editPencilBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1a5cff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  heroChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  heroChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '48%',
  },
  heroChipText: {
    fontSize: 10.5,
  },
  heroActionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroActionBtn: {
    flex: 1,
    minWidth: '47%',
    height: 38,
    borderRadius: 11,
    borderWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  heroActionBtnText: {
    fontSize: 11,
  },
  operatorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  operatorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  operatorAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorNameText: {
    fontSize: 14.5,
  },
  operatorTitleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  operatorActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  whatsappDirectBtn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  whatsappDirectText: {
    color: '#ffffff',
    fontSize: 11.5,
  },
  operatorFichaBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  balanceTitle: {
    fontSize: 15,
  },
  balanceSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addDieselBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCardItem: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 14,
  },
  kpiCardLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  kpiCardValue: {
    fontSize: 18,
  },
  telemetryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  telemetryTitleRow: {
    marginBottom: 10,
  },
  telemetryHeading: {
    fontSize: 16,
  },
  readOnlyLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  telemetrySubheading: {
    fontSize: 11.5,
    marginTop: 3,
  },
  isoNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  isoNoticeText: {
    fontSize: 10.5,
    flex: 1,
    lineHeight: 15,
  },
  searchPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchPillInput: {
    flex: 1,
    fontSize: 12,
  },
  subsystemsList: {
    gap: 10,
  },
  subsystemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  subsystemTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subsystemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subsystemNameText: {
    fontSize: 13,
  },
  subsystemIntervalText: {
    fontSize: 10.5,
    marginTop: 1,
  },
  subsystemPercentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  subsystemPercentText: {
    fontSize: 12,
  },
  subsystemBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  subsystemBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subsystemBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subsystemUsageText: {
    fontSize: 11,
  },
  subsystemRemainingText: {
    fontSize: 11,
  },
  subsystemStatusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    opacity: 0.3,
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSheetTitle: {
    fontSize: 17,
  },
  detailSheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeSheetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSheetDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  detailSheetMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  detailMetricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailMetricLabel: {
    fontSize: 10.5,
    marginBottom: 4,
  },
  detailMetricValue: {
    fontSize: 16,
  },
  detailSheetActions: {
    gap: 10,
  },
  sheetScheduleBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetScheduleBtnText: {
    color: '#ffffff',
    fontSize: 13,
  },
  sheetCancelBtn: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 13,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dialogTitle: {
    fontSize: 17,
  },
  dialogSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10.5,
    marginBottom: 6,
  },
  dialogInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 18,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogOutlineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogSolidBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
