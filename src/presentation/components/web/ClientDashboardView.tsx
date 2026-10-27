import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { isPlanta } from '../../../domain/entities/Moto';
import { getMotoSpecs } from '../../../data/specs';
import { VEHICLE_CATALOG } from '../../../data/catalog';
import { ComponentType } from '../../../constants/telemetry';
import { ClientInquiryModal } from '../ClientInquiryModal';

// Brand Assets
const HL_LOGO_REQUIRE = require('../../../../assets/images/logo and media coorporative/logo-sin-nombre.png');
const PLANTA_IMG_REQUIRE = require('../../../../assets/images/plantas electricas/Blue power generation/C125-1-300x300-removebg-preview.png');

interface ClientDashboardViewProps {
  activeTab: 'moto' | 'specs' | 'history' | 'profile';
  onSelectTab: (tab: 'moto' | 'specs' | 'history' | 'profile') => void;
  onOpenQuickHours: () => void;
  onOpenQuickFuel: () => void;
  onOpenSpecs: () => void;
  onOpenReport: () => void;
  onOpenOperatorModal: () => void;
  children?: React.ReactNode;
}

export const ClientDashboardView: React.FC<ClientDashboardViewProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickHours,
  onOpenQuickFuel,
  onOpenSpecs,
  onOpenReport,
  onOpenOperatorModal,
  children,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { myMoto, records, logout } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubsystemInfo, setSelectedSubsystemInfo] = useState<any>(null);
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);

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
  const totalFuelLiters = useMemo(
    () => fuelRecords.length * 85 + (myMoto?.fuelTankCapacity ? myMoto.fuelTankCapacity * 2 : 240),
    [fuelRecords, myMoto]
  );

  // 10 Industrial Subsystems (Read-Only Telemetry for Client)
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
        wear = myMoto?.isFromAgency ? 100 : 95;
      }

      return {
        ...item,
        wear,
        hoursSince,
        hoursRemaining,
        status: wear >= 60 ? 'ÓPTIMO' : wear >= 30 ? 'PREVENTIVO' : 'REQUIERE REVISIÓN',
      };
    });
  }, [records, currentHours, myMoto]);

  const filteredSubsystems = useMemo(() => {
    if (!searchQuery.trim()) return plantSubsystems;
    const q = searchQuery.toLowerCase().trim();
    return plantSubsystems.filter(
      (sub) => sub.name.toLowerCase().includes(q) || sub.id.toLowerCase().includes(q)
    );
  }, [plantSubsystems, searchQuery]);

  const generalHealth = useMemo(() => {
    if (plantSubsystems.length === 0) return 94;
    const sum = plantSubsystems.reduce((acc, c) => acc + c.wear, 0);
    return Math.round(sum / plantSubsystems.length);
  }, [plantSubsystems]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

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

  const plantLocation = myMoto?.location || 'Sede Principal / Respaldo Crítico';

  return (
    <View style={[styles.rootContainer, { backgroundColor: bgMain }]}>
      
      {/* 1. LEFT VERTICAL ICON RAIL (ADAPTED FOR CLIENT) */}
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
            {/* MI PLANTA (DASHBOARD) */}
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

            {/* HISTORIAL DE SERVICIOS */}
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

            {/* OPERADOR ASIGNADO & CONTACTOS */}
            <TouchableOpacity
              onPress={onOpenOperatorModal}
              style={[styles.railIconBtn, { backgroundColor: 'rgba(0, 180, 216, 0.12)' }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="engineering" size={22} color={accentCyan} />
            </TouchableOpacity>

            {/* EXPEDIENTE PDF CON QR */}
            <TouchableOpacity
              onPress={onOpenReport}
              style={styles.railIconBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="picture-as-pdf" size={22} color={textSecondary} />
            </TouchableOpacity>

            {/* CARGA DE DIÉSEL */}
            <TouchableOpacity
              onPress={onOpenQuickFuel}
              style={styles.railIconBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="local-gas-station" size={22} color={textSecondary} />
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

            {/* CERRAR SESIÓN */}
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

      {/* 2. MAIN CLIENT CONTENT AREA */}
      <View style={styles.mainContentArea}>
        
        {/* TOP HEADER BAR */}
        <View style={styles.topHeaderBar}>
          {/* SEARCH BAR (PILL SHAPE) */}
          <View style={[styles.searchPillContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <MaterialIcons name="search" size={20} color={textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar componente o ciclo preventivo..."
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

            {/* BOTÓN OPERADOR ASIGNADO */}
            <TouchableOpacity
              onPress={onOpenOperatorModal}
              style={[styles.operatorPillBtn, { backgroundColor: 'rgba(0, 180, 216, 0.15)', borderColor: accentCyan }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="support-agent" size={18} color={accentCyan} />
              {isDesktop && (
                <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 11 }}>
                  Operador HL
                </Text>
              )}
            </TouchableOpacity>

            {/* USER PROFILE AVATAR PILL */}
            <TouchableOpacity
              onPress={() => onSelectTab('profile')}
              style={[styles.userProfilePill, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>CL</Text>
              </View>
              {isDesktop && (
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13, marginRight: 4 }}>
                  Cliente HL
                </Text>
              )}
            </TouchableOpacity>

            {/* BOTÓN CERRAR SESIÓN */}
            <TouchableOpacity
              onPress={logout}
              style={[
                styles.logoutHeaderPill,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="logout" size={16} color="#ef4444" />
              <Text style={{ fontFamily: F.bold, color: '#ef4444', fontSize: 12 }}>
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SCROLLABLE CLIENT DASHBOARD CONTENT (DASHBOARD ONLY) */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={[styles.clientBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                  <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 11 }}>
                    PORTAL DE CLIENTE
                  </Text>
                </View>
                <View style={[styles.locationBadge, { backgroundColor: pillDarkBg }]}>
                  <MaterialIcons name="place" size={12} color={accentCyan} />
                  <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 11 }}>
                    {plantLocation}
                  </Text>
                </View>
              </View>

              <Text style={[styles.greetingTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                Tu Planta Eléctrica en Operación
              </Text>
              <Text style={[styles.greetingSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                Monitoreo en tiempo real de generación, horómetro y ciclos preventivos respaldados por Hermanos Lynch.
              </Text>
            </View>

            <View style={styles.greetingRightFilters}>
              <TouchableOpacity
                onPress={onOpenReport}
                style={[styles.pdfTopActionBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#ef4444" />
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                  Expediente PDF con QR
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. SHOWCASE HERO DE LA PLANTA DEL CLIENTE (FOTO OFICIAL + SPECS + CONTACTOS) */}
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
                  Serial: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{myMoto?.plate || myMoto?.serialNumber || 'BPG-C35-001'}</Text> • Ubicación: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{plantLocation}</Text>
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
                      {specs?.transmission || 'Alternador Leroy Somer TAL-042'}
                    </Text>
                  </View>

                  <View style={[styles.specChip, { backgroundColor: pillDarkBg }]}>
                    <MaterialIcons name="developer-board" size={16} color="#10b981" />
                    <Text style={[styles.specChipText, { color: textPrimary, fontFamily: F.semibold }]}>
                      ComAp InteliLite IL-9
                    </Text>
                  </View>
                </View>

                {/* BOTONES DE ACCIÓN DEL CLIENTE */}
                <View style={styles.plantActionButtonsRow}>
                  <TouchableOpacity
                    onPress={onOpenSpecs}
                    style={[styles.outlineActionBtn, { borderColor: cardBorder }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="assignment" size={16} color={textPrimary} />
                    <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>Ficha Técnica</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onOpenReport}
                    style={[styles.pdfReportActionBtn, { backgroundColor: '#ef4444' }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="qr-code" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Expediente PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onOpenOperatorModal}
                    style={[styles.operatorContactActionBtn, { backgroundColor: accentBlue }]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="support-agent" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Contactar Operador</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setInquiryModalVisible(true)}
                    style={[styles.operatorContactActionBtn, { backgroundColor: '#10b981' }]}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="calendar-clock" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Agendar Cita / Inquietud</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* FOTO OFICIAL DE LA PLANTA CON RESPLANDOR */}
              <View style={styles.plantPhotoColumn}>
                <View style={styles.photoAtmosphereGlow} />
                <Image
                  source={plantImageSource}
                  style={styles.plantShowcaseImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  onPress={onOpenQuickHours}
                  style={[styles.horometerOverlayBadge, { backgroundColor: 'rgba(20, 23, 33, 0.92)', borderColor: cardBorder }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="timer" size={16} color={accentCyan} />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                    Horómetro: {currentHours.toLocaleString()} hrs
                  </Text>
                  <MaterialIcons name="edit" size={12} color={accentCyan} />
                </TouchableOpacity>
              </View>

            </View>
          </View>

          {/* 4. TARJETA DESTACADA: OPERADOR TÉCNICO ASIGNADO A LA PLANTA */}
          <View style={[styles.assignedOperatorCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.assignedOperatorHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.operatorAvatarBadge, { backgroundColor: accentBlue }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 18 }}>AR</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.operatorNameHeading, { color: textPrimary, fontFamily: F.extrabold }]}>
                      Ing. Alejandro Rivas Silva
                    </Text>
                    <MaterialIcons name="verified" size={16} color="#22c55e" />
                  </View>
                  <Text style={[styles.operatorTitleSub, { color: textSecondary, fontFamily: F.medium }]}>
                    Operador Técnico Asignado a tu Planta • Carnet: <Text style={{ fontFamily: F.bold, color: accentCyan }}>HL-TECH-4098</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onOpenOperatorModal}
                style={[styles.detailsOperatorBtn, { backgroundColor: pillDarkBg }]}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>Ver Ficha Completa</Text>
                <MaterialIcons name="chevron-right" size={16} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.operatorQuickContactsRow}>
              <TouchableOpacity
                onPress={onOpenOperatorModal}
                style={[styles.contactDirectBtn, { backgroundColor: '#25D366' }]}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="whatsapp" size={18} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                  WhatsApp Directo (+58 414 305-9921)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setInquiryModalVisible(true)}
                style={[styles.contactDirectBtn, { backgroundColor: 'rgba(26, 92, 255, 0.15)', borderWidth: 1, borderColor: accentBlue }]}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="calendar-clock" size={16} color={accentBlue} />
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                  Agendar Cita o Reportar Inquietud
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. BALANCE OPERATIVO & CONTROL DE DIÉSEL */}
          <View style={[styles.balanceCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.balanceHeaderRow}>
              <View>
                <Text style={[styles.balanceTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Balance Operativo & Control de Diésel
                </Text>
                <Text style={[styles.balanceSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Monitorea el combustible cargado y el respaldo generado en tu instalación
                </Text>
              </View>

              <TouchableOpacity
                onPress={onOpenQuickFuel}
                style={[styles.addFuelBtn, { backgroundColor: accentCyan }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="local-gas-station" size={16} color="#0c0e14" />
                <Text style={{ fontFamily: F.bold, color: '#0c0e14', fontSize: 12 }}>
                  + Cargar Diésel
                </Text>
              </TouchableOpacity>
            </View>

            {/* KPI ROW FOR CLIENT */}
            <View style={styles.balanceKpiRow}>
              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium }]}>
                  Horas Acumuladas
                </Text>
                <Text style={[styles.kpiBoxValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {currentHours.toLocaleString()} <Text style={{ fontSize: 14 }}>hrs</Text>
                </Text>
              </View>

              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium }]}>
                  Diésel Cargado
                </Text>
                <Text style={[styles.kpiBoxValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {totalFuelLiters} <Text style={{ fontSize: 14 }}>L</Text>
                </Text>
              </View>

              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium }]}>
                  Gasto en Diésel
                </Text>
                <Text style={[styles.kpiBoxValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                  ${totalFuelUSD.toFixed(2)} <Text style={{ fontSize: 14 }}>USD</Text>
                </Text>
              </View>

              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium }]}>
                  Salud Operativa
                </Text>
                <Text style={[styles.kpiBoxValue, { color: '#22c55e', fontFamily: F.extrabold }]}>
                  {generalHealth}%
                </Text>
              </View>
            </View>
          </View>

          {/* 6. TELEMETRÍA DE LOS 10 SUBSISTEMAS EN TIEMPO REAL (MODO LECTURA EXCLUSIVA / READ-ONLY) */}
          <View style={[styles.telemetrySectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.telemetryHeaderRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={[styles.telemetryTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                    Desgaste y Ciclos de Mantenimiento en Tiempo Real
                  </Text>
                  <View style={[styles.readOnlyBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                    <MaterialIcons name="lock-outline" size={12} color="#22c55e" />
                    <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>
                      MODO LECTURA
                    </Text>
                  </View>
                </View>
                <Text style={[styles.telemetrySubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Monitoreo de telemetría de los 10 subsistemas. Las intervenciones técnicas son ejecutadas por el operador certificado.
                </Text>
              </View>
            </View>

            {/* AVISO INFORMATIVO OFICIAL */}
            <View style={[styles.officialNoticeBanner, { backgroundColor: pillDarkBg, borderColor: cardBorder }]}>
              <MaterialIcons name="info-outline" size={18} color={accentCyan} />
              <Text style={[styles.officialNoticeText, { color: textSecondary, fontFamily: F.medium }]}>
                Para garantizar la garantía de fábrica y cumplimiento de la norma ISO 8528, el reemplazo de filtros y reseteo de ciclos es realizado y sellado por el operador técnico asignado.
              </Text>
            </View>

            {/* SUBSYSTEMS PROGRESS BARS GRID (READ-ONLY) */}
            <View style={styles.subsystemsCardsGrid}>
              {filteredSubsystems.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => setSelectedSubsystemInfo(sub)}
                  style={[styles.subsystemMiniCard, { backgroundColor: pillDarkBg }]}
                  activeOpacity={0.8}
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

                  <View style={styles.statusIndicatorRow}>
                    <Text
                      style={{
                        fontFamily: F.bold,
                        fontSize: 10,
                        color: sub.wear >= 60 ? '#22c55e' : sub.wear >= 30 ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      {sub.status}
                    </Text>
                    <MaterialIcons name="info" size={14} color={textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>

        {/* SUB-TABS (FICHA TÉCNICA, HISTORIAL, PERFIL) PERSISTENTES */}
        <View style={[{ flex: 1 }, activeTab === 'moto' && { display: 'none' }]}>
          {children}
        </View>

      </View>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR CLIENT (< 768px) */}
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
              Mi Planta
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

          <TouchableOpacity
            onPress={onOpenOperatorModal}
            style={styles.mobileNavItem}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="engineering"
              size={22}
              color={accentCyan}
            />
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: accentCyan,
                  fontFamily: F.bold,
                },
              ]}
            >
              Operador
            </Text>
          </TouchableOpacity>

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

      {/* MODAL PARA AGENDAR CITA O REPORTAR INQUIETUD */}
      <ClientInquiryModal
        visible={inquiryModalVisible}
        onClose={() => setInquiryModalVisible(false)}
      />

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
  searchPillContainer: {
    flex: 1,
    minWidth: 240,
    maxWidth: 380,
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
  operatorPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
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
  greetingBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 18,
    flexWrap: 'wrap',
    gap: 12,
  },
  clientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  greetingTitle: {
    fontSize: 24,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    marginTop: 4,
    maxWidth: 620,
  },
  greetingRightFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pdfTopActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
  },
  plantShowcaseCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 26,
    marginBottom: 18,
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
  operatorContactActionBtn: {
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
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -10,
  },
  assignedOperatorCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  assignedOperatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  operatorAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorNameHeading: {
    fontSize: 15,
  },
  operatorTitleSub: {
    fontSize: 12,
    marginTop: 2,
  },
  detailsOperatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  operatorQuickContactsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  contactDirectBtn: {
    flex: 1,
    minWidth: 220,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  balanceCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  balanceTitle: {
    fontSize: 16,
  },
  balanceSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addFuelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  balanceKpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  balanceKpiBox: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
  },
  kpiBoxLabel: {
    fontSize: 11.5,
  },
  kpiBoxValue: {
    fontSize: 20,
    marginTop: 6,
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
    marginBottom: 12,
  },
  telemetryTitle: {
    fontSize: 17,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  telemetrySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  officialNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  officialNoticeText: {
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
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
  statusIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
