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
  const { myMoto, records, logout, isAdmin, isSuperAdmin, userName, userRoleTitle } = useMyMoto();
  const isOperatorOrAdmin = isAdmin || isSuperAdmin;
  const { width: windowWidth } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedSubsystemInfo, setSelectedSubsystemInfo] = useState<any>(null);
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);

  const userInitials = useMemo(() => {
    const name = (userName || 'Cliente').trim();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [userName]);

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
  // Real fuel liters computed strictly from actual diesel records
  const totalFuelLiters = useMemo(() => {
    return fuelRecords.reduce((sum, r) => {
      const match = r.notes?.match(/(\d+(\.\d+)?)/);
      const liters = match ? parseFloat(match[1]) : 0;
      return sum + (isNaN(liters) ? 0 : liters);
    }, 0);
  }, [fuelRecords]);

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

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Bedimcode Clean & Aesthetic Theme Tokens
  const bgMain = isDark ? '#0a0d14' : '#f8fafc';
  const cardBg = isDark ? '#121622' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)';
  const railBg = isDark ? '#0c0f18' : '#ffffff';
  const railBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#8e9aaf' : '#64748b';
  const accentBlue = '#2563eb';
  const accentCyan = '#00e3fd';
  const pillDarkBg = isDark ? '#182030' : '#f1f5f9';

  const plantLocation = myMoto?.location || 'Ubicación sin registrar';

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
        {isMobile ? (
          <View style={[styles.topHeaderBarMobile, { backgroundColor: cardBg, borderBottomColor: cardBorder }]}>
            {mobileSearchOpen ? (
              /* EXPANDED FULL-WIDTH SEARCH BAR ON MOBILE */
              <View style={[styles.mobileSearchExpandedRow, { backgroundColor: isDark ? '#1a1f2c' : '#f1f5f9', borderColor: accentCyan }]}>
                <MaterialIcons name="search" size={20} color={accentCyan} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar componente o ciclo..."
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
                    <Text style={{ fontFamily: F.semibold, fontSize: 9.5, color: accentCyan, letterSpacing: 0.5 }}>
                      CLIENTE HL TELEMÁTICA
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
                    style={[styles.mobileAvatarBtn, { borderColor: accentCyan }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: accentBlue, width: 34, height: 34, borderRadius: 17 }]}>
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

              {/* BOTÓN OPERADOR ASIGNADO (Solo visible para Clientes, nunca para Operadores/Admins) */}
              {!isOperatorOrAdmin && (
                <TouchableOpacity
                  onPress={onOpenOperatorModal}
                  style={[styles.operatorPillBtn, { backgroundColor: 'rgba(0, 180, 216, 0.15)', borderColor: accentCyan }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="support-agent" size={18} color={accentCyan} />
                  <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 11 }}>
                    Operador HL
                  </Text>
                </TouchableOpacity>
              )}

              {/* USER PROFILE AVATAR PILL */}
              <TouchableOpacity
                onPress={() => onSelectTab('profile')}
                style={[styles.userProfilePill, { backgroundColor: cardBg, borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <View style={styles.avatarCircle}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                    {userInitials}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13, marginRight: 4 }}>
                  {userName || (isOperatorOrAdmin ? userRoleTitle : 'Cliente HL')}
                </Text>
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
        )}

        {/* SCROLLABLE CLIENT DASHBOARD CONTENT (DASHBOARD ONLY) */}
        <ScrollView
          style={[{ flex: 1 }, activeTab !== 'moto' && { display: 'none' }]}
          contentContainerStyle={[
            styles.bentoScrollContent,
            isMobile && { paddingHorizontal: 12, paddingBottom: 150 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* GREETING / HERO BANNER */}
          <View style={[styles.greetingBannerRow, isMobile && { marginVertical: 12 }]}>
            <View style={{ flex: 1, minWidth: 240 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <View style={[styles.clientBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                  <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 11 }}>
                    PORTAL DE CLIENTE
                  </Text>
                </View>
                <View style={[styles.locationBadge, { backgroundColor: pillDarkBg, maxWidth: '100%' }]}>
                  <MaterialIcons name="place" size={12} color={accentCyan} />
                  <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 11 }} numberOfLines={1}>
                    {plantLocation}
                  </Text>
                </View>
              </View>

              <Text style={[styles.greetingTitle, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 20 : 26, lineHeight: isMobile ? 26 : 32 }]}>
                Tu Planta Eléctrica en Operación
              </Text>
              <Text style={[styles.greetingSubtitle, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 12 : 13, marginTop: 4 }]}>
                Monitoreo en tiempo real de generación, horómetro y ciclos preventivos respaldados por Hermanos Lynch.
              </Text>
            </View>

            <View style={[styles.greetingRightFilters, isMobile && { width: '100%', marginTop: 8 }]}>
              <TouchableOpacity
                onPress={onOpenReport}
                style={[styles.pdfTopActionBtn, { backgroundColor: cardBg, borderColor: cardBorder }, isMobile && { width: '100%', justifyContent: 'center' }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="picture-as-pdf" size={16} color="#ef4444" />
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                  Expediente PDF con QR
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BEDIMCODE SIGNATURE PLANT HERO SHOWCASE (.home / .home__container / .home__shape / .home__car) */}
          <View style={[
            styles.bedimHeroSection,
            { backgroundColor: cardBg, borderColor: cardBorder },
            isMobile && { paddingVertical: 20, paddingHorizontal: 14, borderRadius: 24, marginBottom: 18 }
          ]}>
            {/* 1. .home__data HEADER */}
            <View style={styles.bedimHeroHeader}>
              <View style={[styles.bedimHeroSubtitlePill, { backgroundColor: 'rgba(0, 227, 253, 0.12)' }]}>
                <MaterialIcons name="bolt" size={14} color={accentCyan} />
                <Text style={[styles.bedimHeroSubtitleText, { color: accentCyan, fontFamily: F.bold }]}>
                  {myMoto ? `${myMoto.powerKva || 35} kVA / ${myMoto.powerKw || 28} kW STANDBY` : 'GRUPO ELECTRÓGENO STANDBY'}
                </Text>
              </View>

              <Text style={[styles.bedimHeroTitle, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 22 : 30 }]}>
                {myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Blue Power Generation C125'}
              </Text>

              <View style={styles.bedimHeroDescriptionRow}>
                <Text style={[styles.bedimHeroDescText, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 11 : 13 }]}>
                  Serial: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{myMoto?.serialNumber || myMoto?.plate || 'HL-GEN-001'}</Text>
                </Text>
                <Text style={{ color: textSecondary }}>•</Text>
                <Text style={[styles.bedimHeroDescText, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 11 : 13 }]}>
                  Motor: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{specs?.engineType || 'Cummins 3.9L Diésel'}</Text>
                </Text>
                <Text style={{ color: textSecondary }}>•</Text>
                <Text style={[styles.bedimHeroDescText, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 11 : 13 }]}>
                  Ubicación: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{plantLocation}</Text>
                </Text>
              </View>
            </View>

            {/* 2. .home__img WITH AMBIENT GLOW (.home__shape) */}
            <View style={[styles.bedimCenterpieceArea, isMobile && { marginVertical: 10, minHeight: 180 }]}>
              <View style={[styles.bedimShapeGlow, isMobile && { width: 210, height: 210 }]} />
              <View style={[styles.bedimShapeGlowInner, isMobile && { width: 140, height: 140 }]} />
              <Image
                source={plantImageSource}
                style={[styles.bedimHeroImg, isMobile && { width: 260, height: 165, maxWidth: '100%' }]}
                resizeMode="contain"
              />
              <View style={[styles.bedimFloatingPillStatus, { backgroundColor: isDark ? 'rgba(18, 22, 34, 0.94)' : 'rgba(255, 255, 255, 0.94)', borderColor: cardBorder }]}>
                <View style={styles.greenLiveDot} />
                <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: isMobile ? 9.5 : 11, letterSpacing: 0.6 }}>
                  OPERATIVA EN LÍNEA · ISO 8528
                </Text>
              </View>
            </View>

            {/* 3. .home__car: 4 FLOATING TELEMETRY SPEC CARDS (Bedimcode exact pattern) */}
            <View style={[styles.bedimTelemetryStrip, isMobile && { gap: 10, marginVertical: 14 }]}>
              {/* Card 1: Temperatura */}
              <View style={[
                styles.bedimTelemetryCard,
                { backgroundColor: pillDarkBg, borderColor: cardBorder },
                isMobile && { width: '47%', minWidth: undefined, paddingVertical: 12, paddingHorizontal: 8 }
              ]}>
                <View style={[styles.bedimIconCircle, { backgroundColor: 'rgba(0, 227, 253, 0.15)' }]}>
                  <MaterialCommunityIcons name="thermometer" size={18} color={accentCyan} />
                </View>
                <Text style={[styles.bedimCardValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 18 }]}>
                  85°C
                </Text>
                <Text style={[styles.bedimCardLabel, { color: textSecondary, fontFamily: F.bold }]}>
                  TEMPERATURA
                </Text>
              </View>

              {/* Card 2: Horas Motor */}
              <TouchableOpacity
                onPress={onOpenQuickHours}
                style={[
                  styles.bedimTelemetryCard,
                  { backgroundColor: pillDarkBg, borderColor: cardBorder },
                  isMobile && { width: '47%', minWidth: undefined, paddingVertical: 12, paddingHorizontal: 8 }
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.bedimIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <MaterialIcons name="speed" size={18} color="#22c55e" />
                </View>
                <Text style={[styles.bedimCardValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 18 }]}>
                  {currentHours.toLocaleString()}h
                </Text>
                <Text style={[styles.bedimCardLabel, { color: textSecondary, fontFamily: F.bold }]}>
                  HORAS MOTOR
                </Text>
              </TouchableOpacity>

              {/* Card 3: Sistema Eléctrico 24V */}
              <View style={[
                styles.bedimTelemetryCard,
                { backgroundColor: pillDarkBg, borderColor: cardBorder },
                isMobile && { width: '47%', minWidth: undefined, paddingVertical: 12, paddingHorizontal: 8 }
              ]}>
                <View style={[styles.bedimIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <MaterialIcons name="bolt" size={18} color="#f59e0b" />
                </View>
                <Text style={[styles.bedimCardValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 18 }]}>
                  {myMoto?.systemVoltage || '24.2V'}
                </Text>
                <Text style={[styles.bedimCardLabel, { color: textSecondary, fontFamily: F.bold }]}>
                  SISTEMA 24V
                </Text>
              </View>

              {/* Card 4: Nivel Diésel / Cargas */}
              <TouchableOpacity
                onPress={onOpenQuickFuel}
                style={[
                  styles.bedimTelemetryCard,
                  { backgroundColor: pillDarkBg, borderColor: cardBorder },
                  isMobile && { width: '47%', minWidth: undefined, paddingVertical: 12, paddingHorizontal: 8 }
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.bedimIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                  <MaterialIcons name="local-gas-station" size={18} color={accentCyan} />
                </View>
                <Text style={[styles.bedimCardValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 18 }]}>
                  {totalFuelLiters > 0 ? `${totalFuelLiters} L` : '100%'}
                </Text>
                <Text style={[styles.bedimCardLabel, { color: textSecondary, fontFamily: F.bold }]}>
                  DIÉSEL TOTAL
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. .home__button / ACTION CTA ROW */}
            <View style={[styles.bedimCtaRow, isMobile && { gap: 8 }]}>
              <TouchableOpacity
                onPress={onOpenReport}
                style={[
                  styles.bedimSecondaryCta,
                  { backgroundColor: '#ef4444' },
                  isMobile && { width: '48%', height: 42, paddingHorizontal: 10, justifyContent: 'center' }
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="qr-code-2" size={16} color="#ffffff" />
                <Text style={[styles.bedimCtaText, { color: '#ffffff', fontFamily: F.bold, fontSize: isMobile ? 11 : 12 }]}>
                  EXPEDIENTE QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenOperatorModal}
                style={[
                  styles.bedimPrimaryCta,
                  { backgroundColor: accentBlue },
                  isMobile && { width: '48%', height: 42, paddingHorizontal: 10, justifyContent: 'center' }
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="support-agent" size={16} color="#ffffff" />
                <Text style={[styles.bedimCtaText, { color: '#ffffff', fontFamily: F.bold, fontSize: isMobile ? 11 : 12 }]}>
                  OPERADOR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setInquiryModalVisible(true)}
                style={[
                  styles.bedimSecondaryCta,
                  { backgroundColor: '#10b981' },
                  isMobile && { width: '48%', height: 42, paddingHorizontal: 10, justifyContent: 'center' }
                ]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#ffffff" />
                <Text style={[styles.bedimCtaText, { color: '#ffffff', fontFamily: F.bold, fontSize: isMobile ? 11 : 12 }]}>
                  AGENDAR CITA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onOpenSpecs}
                style={[
                  styles.bedimGhostCta,
                  { backgroundColor: pillDarkBg, borderColor: cardBorder },
                  isMobile && { width: '48%', height: 42, paddingHorizontal: 10, justifyContent: 'center' }
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="menu-book" size={16} color={textPrimary} />
                <Text style={[styles.bedimCtaText, { color: textPrimary, fontFamily: F.bold, fontSize: isMobile ? 11 : 12 }]}>
                  FICHA TÉCNICA
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. TARJETA DESTACADA: OPERADOR TÉCNICO ASIGNADO A LA PLANTA */}
          <View style={[styles.assignedOperatorCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.assignedOperatorHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.operatorAvatarBadge, { backgroundColor: accentBlue }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 16 }}>
                    {myMoto?.assignedOperatorName ? myMoto.assignedOperatorName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'HL'}
                  </Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.operatorNameHeading, { color: textPrimary, fontFamily: F.extrabold }]}>
                      {myMoto?.assignedOperatorName || 'Operador por Asignar'}
                    </Text>
                    <MaterialIcons name={myMoto?.assignedOperatorName ? 'verified' : 'schedule'} size={16} color={myMoto?.assignedOperatorName ? '#22c55e' : '#f59e0b'} />
                  </View>
                  <Text style={[styles.operatorTitleSub, { color: textSecondary, fontFamily: F.medium }]}>
                    Operador Técnico Responsable • Carnet: <Text style={{ fontFamily: F.bold, color: accentCyan }}>{myMoto?.assignedOperatorId ? `HL-TECH-${myMoto.assignedOperatorId.slice(0, 4).toUpperCase()}` : 'En Proceso'}</Text>
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
          <View style={[styles.balanceCard, { backgroundColor: cardBg, borderColor: cardBorder }, isMobile && { padding: 16 }]}>
            <View style={[styles.balanceHeaderRow, isMobile && { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.balanceTitle, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 15 : 16 }]}>
                  Balance Operativo & Control de Diésel
                </Text>
                <Text style={[styles.balanceSubtitle, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 11 : 12 }]}>
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
            <View style={[styles.balanceKpiRow, isMobile && { gap: 10 }]}>
              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }, isMobile && { width: '47%', minWidth: undefined, padding: 12 }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 10.5 : 11.5 }]}>
                  Horas Acumuladas
                </Text>
                <Text style={[styles.kpiBoxValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 18 : 20 }]}>
                  {currentHours.toLocaleString()} <Text style={{ fontSize: isMobile ? 12 : 14 }}>hrs</Text>
                </Text>
              </View>

              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }, isMobile && { width: '47%', minWidth: undefined, padding: 12 }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 10.5 : 11.5 }]}>
                  Diésel Cargado
                </Text>
                <Text style={[styles.kpiBoxValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 18 : 20 }]}>
                  {totalFuelLiters} <Text style={{ fontSize: isMobile ? 12 : 14 }}>L</Text>
                </Text>
              </View>

              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }, isMobile && { width: '47%', minWidth: undefined, padding: 12 }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 10.5 : 11.5 }]}>
                  Gasto en Diésel
                </Text>
                <Text style={[styles.kpiBoxValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 18 : 20 }]}>
                  ${totalFuelUSD.toFixed(0)} <Text style={{ fontSize: isMobile ? 12 : 14 }}>USD</Text>
                </Text>
              </View>

              <View style={[styles.balanceKpiBox, { backgroundColor: pillDarkBg }, isMobile && { width: '47%', minWidth: undefined, padding: 12 }]}>
                <Text style={[styles.kpiBoxLabel, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 10.5 : 11.5 }]}>
                  Salud Operativa
                </Text>
                <Text style={[styles.kpiBoxValue, { color: '#22c55e', fontFamily: F.extrabold, fontSize: isMobile ? 18 : 20 }]}>
                  {generalHealth}%
                </Text>
              </View>
            </View>
          </View>

          {/* 6. TELEMETRÍA DE LOS 10 SUBSISTEMAS EN TIEMPO REAL (MODO LECTURA EXCLUSIVA / READ-ONLY) */}
          <View style={[styles.telemetrySectionCard, { backgroundColor: cardBg, borderColor: cardBorder }, isMobile && { padding: 16 }]}>
            <View style={[styles.telemetryHeaderRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
              <View style={{ flex: 1, width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <Text style={[styles.telemetryTitle, { color: textPrimary, fontFamily: F.extrabold, fontSize: isMobile ? 16 : 17 }]}>
                    Desgaste y Ciclos de Mantenimiento en Tiempo Real
                  </Text>
                  <View style={[styles.readOnlyBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                    <MaterialIcons name="lock-outline" size={12} color="#22c55e" />
                    <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>
                      MODO LECTURA
                    </Text>
                  </View>
                </View>
                <Text style={[styles.telemetrySubtitle, { color: textSecondary, fontFamily: F.medium, fontSize: isMobile ? 11 : 12 }]}>
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
            <View style={[styles.subsystemsCardsGrid, isMobile && { gap: 10 }]}>
              {filteredSubsystems.map((sub) => {
                const statusColor = !sub.isInspected
                  ? '#94a3b8'
                  : sub.wear >= 60
                  ? '#22c55e'
                  : sub.wear >= 30
                  ? '#f59e0b'
                  : '#ef4444';

                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setSelectedSubsystemInfo(sub)}
                    style={[
                      styles.subsystemMiniCard,
                      { backgroundColor: pillDarkBg },
                      isMobile && { minWidth: '100%', width: '100%', padding: 14 }
                    ]}
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
                            color: statusColor,
                            fontFamily: F.extrabold,
                          },
                        ]}
                      >
                        {sub.isInspected ? `${sub.wear}%` : '0%'}
                      </Text>
                    </View>

                    {/* PROGRESS BAR */}
                    <View style={styles.progressBarBase}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: sub.isInspected ? `${sub.wear}%` : '0%',
                            backgroundColor: statusColor,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.subsystemCardFooter}>
                      <Text style={[styles.subsystemCardUsage, { color: textSecondary, fontFamily: F.medium }]}>
                        Uso: {sub.hoursSince} hrs
                      </Text>
                      <Text style={[styles.subsystemCardRemaining, { color: textPrimary, fontFamily: F.semibold }]}>
                        {sub.isInspected ? `Restan: ${sub.hoursRemaining} hrs` : 'Pendiente inspección'}
                      </Text>
                    </View>

                    <View style={styles.statusIndicatorRow}>
                      <Text
                        style={{
                          fontFamily: F.bold,
                          fontSize: 10,
                          color: statusColor,
                        }}
                      >
                        {sub.status}
                      </Text>
                      <MaterialIcons name="info" size={14} color={textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </ScrollView>

        {/* SUB-TABS (FICHA TÉCNICA, HISTORIAL, PERFIL) PERSISTENTES */}
        <View style={[{ flex: 1 }, activeTab === 'moto' && { display: 'none' }]}>
          {children}
        </View>

      </View>

      {/* MOBILE FLOATING BOTTOM NAVIGATION DOCK (BEDIMCODE SIGNATURE) */}
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
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'moto' ? accentCyan : textSecondary,
                  fontFamily: activeTab === 'moto' ? F.bold : F.medium,
                },
              ]}
            >
              Mi Planta
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
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'specs' ? accentCyan : textSecondary,
                  fontFamily: activeTab === 'specs' ? F.bold : F.medium,
                },
              ]}
            >
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
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'history' ? accentCyan : textSecondary,
                  fontFamily: activeTab === 'history' ? F.bold : F.medium,
                },
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>

          {!isOperatorOrAdmin && (
            <TouchableOpacity
              onPress={onOpenOperatorModal}
              style={styles.mobileNavItem}
              activeOpacity={0.75}
            >
              <MaterialIcons
                name="support-agent"
                size={20}
                color={textSecondary}
              />
              <Text
                style={[
                  styles.mobileNavLabel,
                  {
                    color: textSecondary,
                    fontFamily: F.medium,
                  },
                ]}
              >
                Operador
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
            <Text
              style={[
                styles.mobileNavLabel,
                {
                  color: activeTab === 'profile' ? accentCyan : textSecondary,
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

      {/* MODAL INFORMATIVO DE SUBSISTEMA (MODO LECTURA PARA CLIENTE) */}
      <Modal
        visible={!!selectedSubsystemInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedSubsystemInfo(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 480, backgroundColor: cardBg, borderRadius: 20, borderWidth: 1, borderColor: cardBorder, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: `${selectedSubsystemInfo?.color || accentBlue}20`, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="engineering" size={20} color={selectedSubsystemInfo?.color || accentBlue} />
                </View>
                <View>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 16, color: textPrimary }}>
                    {selectedSubsystemInfo?.name}
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 12, color: textSecondary }}>
                    Ciclo de Fábrica OEM: {selectedSubsystemInfo?.interval} hrs
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedSubsystemInfo(null)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* AVISO MODO LECTURA EXCLUSIVA */}
            <View style={{ backgroundColor: 'rgba(0, 180, 216, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 180, 216, 0.3)', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <MaterialIcons name="lock-clock" size={20} color={accentCyan} />
              <Text style={{ flex: 1, fontFamily: F.medium, fontSize: 11.5, color: textPrimary }}>
                {selectedSubsystemInfo?.isInspected 
                  ? 'Este componente se encuentra calibrado y activo en telemetría. Las calibraciones e inspecciones son realizadas únicamente por el operador técnico.'
                  : 'Componente en 0% / Sin Calibrar. El operador técnico asignado a esta planta registrará el estado inicial de este componente en la primera inspección oficial.'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: pillDarkBg, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>Estado</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: !selectedSubsystemInfo?.isInspected ? '#94a3b8' : selectedSubsystemInfo?.wear >= 60 ? '#22c55e' : '#f59e0b', marginTop: 4 }}>
                  {selectedSubsystemInfo?.status}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: pillDarkBg, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>Vida Útil</Text>
                <Text style={{ fontFamily: F.extrabold, fontSize: 15, color: !selectedSubsystemInfo?.isInspected ? '#94a3b8' : selectedSubsystemInfo?.wear >= 60 ? '#22c55e' : '#f59e0b', marginTop: 2 }}>
                  {selectedSubsystemInfo?.isInspected ? `${selectedSubsystemInfo?.wear}%` : '0%'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: pillDarkBg, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>Restante</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: textPrimary, marginTop: 4 }}>
                  {selectedSubsystemInfo?.isInspected ? `${selectedSubsystemInfo?.hoursRemaining} hrs` : 'Pendiente'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSubsystemInfo(null);
                  setInquiryModalVisible(true);
                }}
                style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Agendar Revisión</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSubsystemInfo(null);
                  onOpenOperatorModal();
                }}
                style={{ flex: 1, backgroundColor: accentBlue, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="support-agent" size={16} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>Ver Operador</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MENÚ HAMBURGUESA DESPLEGABLE PARA CLIENTES EN MÓVILES */}
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
                <View style={[styles.avatarCircle, { backgroundColor: accentBlue, width: 44, height: 44, borderRadius: 22 }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 15 }}>{userInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 14, color: textPrimary }} numberOfLines={1}>
                    {userName || 'Cliente HL'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={[
                      styles.roleBadgePillSmall,
                      {
                        backgroundColor: 'rgba(0, 180, 216, 0.15)',
                        borderColor: 'rgba(0, 180, 216, 0.45)',
                      }
                    ]}>
                      <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: accentCyan }}>
                        CLIENTE HL
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
                GESTIÓN Y REGISTROS
              </Text>

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
                    + Registrar Horómetro
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Actualizar horas de funcionamiento
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
                    Litros cargados y control de consumo
                  </Text>
                </View>
              </TouchableOpacity>

              {/* CONTACTAR OPERADOR */}
              {!isOperatorOrAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    setMobileMenuOpen(false);
                    onOpenOperatorModal();
                  }}
                  style={[styles.mobileMenuItem, { backgroundColor: isDark ? '#1a1f2c' : '#f8fafc', borderColor: cardBorder }]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.mobileMenuIconBox, { backgroundColor: '#10b981' }]}>
                    <MaterialIcons name="support-agent" size={20} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 13, color: textPrimary }}>
                      Contactar Operador Asignado
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                      Soporte técnico y asistencia en sitio
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

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
                    Expediente Técnico PDF
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textSecondary }}>
                    Ficha oficial e historial de la planta
                  </Text>
                </View>
              </TouchableOpacity>

              {/* SECTION: SECCIONES */}
              <Text style={[styles.mobileMenuSectionTitle, { color: textSecondary, fontFamily: F.bold, marginTop: 14 }]}>
                SECCIONES
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
                  Mi Planta Eléctrica / Inicio
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
                  Historial de Mantenimientos
                </Text>
              </TouchableOpacity>

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
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
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
  // BEDIMCODE ARCHITECTURAL HERO PATTERNS (.home, .home__data, .home__shape, .home__car, .home__car-data, .home__button)
  bedimHeroSection: {
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 28,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  bedimHeroHeader: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  bedimHeroSubtitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  bedimHeroSubtitleText: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bedimHeroTitle: {
    fontSize: 30,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  bedimHeroDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bedimHeroDescText: {
    fontSize: 13,
    textAlign: 'center',
  },
  bedimCenterpieceArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 16,
    minHeight: 220,
  },
  bedimShapeGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 227, 253, 0.16)',
    ...(Platform.OS === 'web' ? { filter: 'blur(50px)' } : {}),
  },
  bedimShapeGlowInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    ...(Platform.OS === 'web' ? { filter: 'blur(30px)' } : {}),
  },
  bedimHeroImg: {
    width: 320,
    height: 210,
    zIndex: 2,
  },
  bedimFloatingPillStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: -8,
    zIndex: 3,
  },
  bedimTelemetryStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 20,
    flexWrap: 'wrap',
  },
  bedimTelemetryCard: {
    minWidth: 135,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  bedimIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bedimCardValue: {
    fontSize: 18,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  bedimCardLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bedimCtaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  bedimPrimaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  bedimSecondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    shadowColor: '#00e3fd',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 3,
  },
  bedimGhostCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  bedimCtaText: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  greenLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  assignedOperatorCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
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
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
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
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
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
});
