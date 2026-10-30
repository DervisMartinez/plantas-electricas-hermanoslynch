import React, { useState, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Animated, 
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { DashboardTab } from './tabs/DashboardTab';
import { ProfileTab } from './tabs/ProfileTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ServicesTab } from './tabs/ServicesTab';
import { WalletTab } from './tabs/WalletTab';
import { SpecsTab } from './tabs/SpecsTab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Web Components inspired by Yamaha reference design
import { BentoDashboardView } from '../components/web/BentoDashboardView';
import { ClientDashboardView } from '../components/web/ClientDashboardView';
import { WebHeader } from '../components/web/WebHeader';
import { WebSidebarDock } from '../components/web/WebSidebarDock';
import { WebVehicleHero } from '../components/web/WebVehicleHero';
import { WebTelemetrySection } from '../components/web/WebTelemetrySection';

// Shared Modals
import { TechnicalSheetModal } from '../components/TechnicalSheetModal';
import { VehicleStatsAndCalendarModal } from '../components/VehicleStatsAndCalendarModal';
import { AssignedOperatorModal } from '../components/AssignedOperatorModal';
import { VehicleReportModal } from '../components/VehicleReportModal';
import { ClientInquiryModal } from '../components/ClientInquiryModal';
import { ClientMobileDashboard } from '../components/mobile/ClientMobileDashboard';
import { getMotoSpecs } from '../../data/specs';
import { isWebPlatform } from '../utils/platformMode';
import { ComponentType } from '../../constants/telemetry';
import { isPlanta } from '../../domain/entities/Moto';

interface TabNavItem {
  id: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile';
  icon: string;
  iconFamily: 'material' | 'community';
  label: string;
}

export const MainApp = () => {
  const { colors, mode } = useTheme();
  const { myMoto, updateMoto, addRecord, drivesCompanyVehicle, isAdmin, isSuperAdmin } = useMyMoto();
  const [activeTab, setActiveTab] = useState<'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile'>('moto');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['moto', 'specs', 'services', 'wallet', 'history', 'profile']));
  const [servicesInitialComp, setServicesInitialComp] = useState<ComponentType | undefined>(undefined);
  React.useEffect(() => {
    if (!drivesCompanyVehicle && activeTab === 'wallet') {
      setActiveTab('moto');
    }
    if (isSuperAdmin && activeTab === 'specs') {
      setActiveTab('moto');
    }
  }, [drivesCompanyVehicle, isSuperAdmin, activeTab]);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const handleSelectTab = (tab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile') => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    setActiveTab(tab);
    if (isWebPlatform()) {
      desktopScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  // Desktop threshold: 920px
  const isDesktop = windowWidth >= 920;

  // Quick Action Sheet state
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickOdoVisible, setQuickOdoVisible] = useState(false);
  const [quickFuelVisible, setQuickFuelVisible] = useState(false);
  const [newOdoInput, setNewOdoInput] = useState('');
  const [fuelLitersInput, setFuelLitersInput] = useState('');
  const [fuelUsdInput, setFuelUsdInput] = useState('');

  // Modals for Desktop & Mobile
  const [specsModalVisible, setSpecsModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [operatorModalVisible, setOperatorModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);

  const desktopScrollRef = useRef<ScrollView>(null);

  const specs = useMemo(() => {
    if (!myMoto) return null;
    return getMotoSpecs(myMoto.brand, myMoto.model);
  }, [myMoto]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Main Tabs flanking the Central [+] Quick Add Button
  const tabs = useMemo<TabNavItem[]>(() => {
    if (!isAdmin) {
      return [
        { id: 'moto', icon: 'home', iconFamily: 'material', label: 'Inicio' },
        { id: 'specs', icon: 'explore', iconFamily: 'material', label: 'Ficha' },
        { id: 'history', icon: 'receipt-long', iconFamily: 'material', label: 'Historial' },
        { id: 'profile', icon: 'person', iconFamily: 'material', label: 'Perfil' },
      ];
    }
    return [
      { id: 'moto', icon: 'home', iconFamily: 'material', label: isPlanta(myMoto) ? 'Inicio' : 'Vehículo' },
      { id: 'services', icon: 'build', iconFamily: 'material', label: 'Servicios' },
      { id: 'history', icon: 'receipt-long', iconFamily: 'material', label: 'Historial' },
      ...(drivesCompanyVehicle ? [{ id: 'wallet', icon: 'account-balance-wallet', iconFamily: 'material', label: 'Wallet' } as TabNavItem] : []),
      { id: 'profile', icon: 'person', iconFamily: 'material', label: 'Perfil' },
    ];
  }, [isAdmin, myMoto, drivesCompanyVehicle]);

  // Animated values for raised bubble effect (mobile)
  const tabAnims = useRef<Record<string, { scale: Animated.Value; translateY: Animated.Value }>>({});

  const getTabAnim = (id: string) => {
    if (!tabAnims.current[id]) {
      tabAnims.current[id] = {
        scale: new Animated.Value(activeTab === id ? 1.18 : 1),
        translateY: new Animated.Value(activeTab === id ? -6 : 0),
      };
    }
    return tabAnims.current[id];
  };

  const plusScale = useRef(new Animated.Value(1)).current;

  const handleTabPress = (id: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile') => {
    handleSelectTab(id);

    // Spring elevate the active tab and lower inactive tabs (mobile)
    tabs.forEach((tab) => {
      const isTarget = tab.id === id;
      const anim = getTabAnim(tab.id);
      Animated.parallel([
        Animated.spring(anim.scale, {
          toValue: isTarget ? 1.18 : 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(anim.translateY, {
          toValue: isTarget ? -6 : 0,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handlePlusPress = () => {
    Animated.sequence([
      Animated.timing(plusScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(plusScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })
    ]).start();

    setQuickActionVisible(true);
  };

  const handleSaveQuickOdo = () => {
    const odo = parseInt(newOdoInput);
    const isPlantaEquip = isPlanta(myMoto);
    const currentVal = myMoto ? (myMoto.currentHours || myMoto.currentOdometer || 0) : 0;
    if (!odo || !myMoto || odo <= currentVal) {
      alert(isPlantaEquip ? 'Ingresa un número de horas mayor al actual.' : 'Ingresa un kilometraje mayor al actual.');
      return;
    }
    updateMoto({ currentOdometer: odo, currentHours: odo });
    setQuickOdoVisible(false);
    setNewOdoInput('');
    alert(isPlantaEquip ? `Horómetro actualizado a ${odo} horas.` : `Odómetro actualizado a ${odo} km.`);
  };

  const handleSaveQuickFuel = () => {
    const liters = parseFloat(fuelLitersInput);
    const usd = parseFloat(fuelUsdInput);
    if (!liters || !usd || !myMoto) {
      alert('Ingresa litros y monto en USD válidos.');
      return;
    }
    addRecord({
      id: Math.random().toString(),
      type: 'fuel',
      date: new Date().toISOString(),
      odometer: myMoto.currentOdometer,
      costUSD: usd,
      notes: `Carga de ${liters} Litros`
    });
    setQuickFuelVisible(false);
    setFuelLitersInput('');
    setFuelUsdInput('');
    alert('Carga de combustible registrada en tu historial.');
  };

  const scrollToTelemetry = () => {
    desktopScrollRef.current?.scrollTo({ y: 550, animated: true });
  };

  const isDark = mode === 'dark';
  const barBg = isDark ? 'rgba(18,18,20,0.96)' : 'rgba(255,255,255,0.96)';
  const borderHairline = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // ==========================================
  // RESPONSIVE WEB APPLICATION LAYOUT (DESKTOP, TABLET & MOBILE WEB)
  // ==========================================
  const isWeb = isWebPlatform();
  if (isWeb) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {isAdmin ? (
          /* ========================================================== */
          /* 1. PANEL DE ADMINISTRADOR (GESTIÓN COMPLETA, BENTO & SERVICIOS) */
          /* ========================================================== */
          <BentoDashboardView
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onOpenQuickHours={() => setQuickOdoVisible(true)}
            onOpenQuickFuel={() => setQuickFuelVisible(true)}
            onOpenSpecs={() => handleSelectTab('specs')}
            onOpenStats={() => setStatsModalVisible(true)}
            onOpenReport={() => setReportModalVisible(true)}
            onOpenServicesTab={(comp?: ComponentType) => {
              setServicesInitialComp(comp || 'oil');
              handleSelectTab('services');
            }}
          >
            {!isSuperAdmin && visitedTabs.has('specs') && (
              <View style={{ flex: 1, width: '100%', display: activeTab === 'specs' ? 'flex' : 'none' }}>
                <SpecsTab onNavigateToServices={() => handleSelectTab('services')} />
              </View>
            )}

            {visitedTabs.has('services') && (
              <View style={[styles.desktopTabContainer, { flex: 1, display: activeTab === 'services' ? 'flex' : 'none', paddingHorizontal: windowWidth < 768 ? (windowWidth < 480 ? 10 : 16) : 32, paddingTop: windowWidth < 768 ? 14 : 24 }]}>
                <ServicesTab initialComponent={servicesInitialComp} />
              </View>
            )}

            {visitedTabs.has('history') && (
              <View style={[styles.desktopTabContainer, { flex: 1, display: activeTab === 'history' ? 'flex' : 'none', paddingHorizontal: windowWidth < 768 ? (windowWidth < 480 ? 10 : 16) : 32, paddingTop: windowWidth < 768 ? 14 : 24 }]}>
                <HistoryTab />
              </View>
            )}

            {visitedTabs.has('wallet') && (
              <View style={[styles.desktopTabContainer, { flex: 1, display: activeTab === 'wallet' ? 'flex' : 'none', paddingHorizontal: windowWidth < 768 ? (windowWidth < 480 ? 10 : 16) : 32, paddingTop: windowWidth < 768 ? 14 : 24 }]}>
                <WalletTab />
              </View>
            )}

            {visitedTabs.has('profile') && (
              <View style={[styles.desktopTabContainer, { flex: 1, display: activeTab === 'profile' ? 'flex' : 'none', paddingHorizontal: windowWidth < 768 ? (windowWidth < 480 ? 10 : 16) : 32, paddingTop: windowWidth < 768 ? 14 : 24 }]}>
                <ProfileTab onOpenReport={() => setReportModalVisible(true)} />
              </View>
            )}
          </BentoDashboardView>
        ) : (
          /* ========================================================== */
          /* 2. PORTAL DEL CLIENTE (PLANTA EXCLUSIVA, READ-ONLY & OPERADOR) */
          /* ========================================================== */
          <ClientDashboardView
            activeTab={activeTab === 'services' || activeTab === 'wallet' ? 'moto' : activeTab}
            onSelectTab={(tab) => handleSelectTab(tab)}
            onOpenQuickHours={() => setQuickOdoVisible(true)}
            onOpenQuickFuel={() => setQuickFuelVisible(true)}
            onOpenSpecs={() => handleSelectTab('specs')}
            onOpenReport={() => setReportModalVisible(true)}
            onOpenOperatorModal={() => setOperatorModalVisible(true)}
          >
            {visitedTabs.has('specs') && (
              <View style={{ flex: 1, width: '100%', display: activeTab === 'specs' ? 'flex' : 'none' }}>
                <SpecsTab onNavigateToServices={() => setOperatorModalVisible(true)} />
              </View>
            )}

            {visitedTabs.has('history') && (
              <View style={[styles.desktopTabContainer, { flex: 1, display: activeTab === 'history' ? 'flex' : 'none', paddingHorizontal: windowWidth < 768 ? (windowWidth < 480 ? 10 : 16) : 32, paddingTop: windowWidth < 768 ? 14 : 24 }]}>
                <HistoryTab />
              </View>
            )}

            {visitedTabs.has('profile') && (
              <View style={[styles.desktopTabContainer, { flex: 1, display: activeTab === 'profile' ? 'flex' : 'none', paddingHorizontal: windowWidth < 768 ? (windowWidth < 480 ? 10 : 16) : 32, paddingTop: windowWidth < 768 ? 14 : 24 }]}>
                <ProfileTab onOpenReport={() => setReportModalVisible(true)} />
              </View>
            )}
          </ClientDashboardView>
        )}

        {/* MODAL: FICHA TÉCNICA */}
        <TechnicalSheetModal
          visible={specsModalVisible}
          onClose={() => setSpecsModalVisible(false)}
          myMoto={myMoto}
          specs={specs}
        />

        {/* MODAL: ESTADÍSTICAS Y CALENDARIO */}
        <VehicleStatsAndCalendarModal
          visible={statsModalVisible}
          onClose={() => setStatsModalVisible(false)}
        />

        {/* MODAL: FICHA TÉCNICA Y CONTACTOS DEL OPERADOR ASIGNADO (SUSTITUYE SOS/EMERGENCIA) */}
        <AssignedOperatorModal
          visible={operatorModalVisible}
          onClose={() => setOperatorModalVisible(false)}
          myMoto={myMoto}
        />

        {/* MODAL: REPORTE EJECUTIVO PDF */}
        <VehicleReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          myMoto={myMoto}
          specs={specs}
        />

        {/* MODAL: ACTUALIZAR HORÓMETRO / ODÓMETRO */}
        <Modal visible={quickOdoVisible} transparent={true} animationType="fade">
          <View style={styles.desktopModalBackdrop}>
            <View style={[styles.dialogBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 18 }}>
                  {isPlanta(myMoto) ? 'Actualizar Horómetro' : 'Actualizar Odómetro'}
                </Text>
                <TouchableOpacity onPress={() => setQuickOdoVisible(false)}>
                  <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 16 }}>
                {isPlanta(myMoto)
                  ? `Horas acumuladas actuales: ${(myMoto?.currentHours || myMoto?.currentOdometer || 0).toLocaleString()} hrs`
                  : `Odómetro actual: ${(myMoto?.currentOdometer || 0).toLocaleString()} km`}
              </Text>

              <TextInput 
                value={newOdoInput}
                onChangeText={setNewOdoInput}
                placeholder={isPlanta(myMoto) ? `Mayor a ${myMoto?.currentHours || myMoto?.currentOdometer || 0} hrs` : `Mayor a ${myMoto?.currentOdometer || 0} km`}
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="numeric"
                style={[styles.dialogInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => setQuickOdoVisible(false)} style={[styles.dialogBtn, { borderColor: colors.outlineVariant, borderWidth: 0.5 }]}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveQuickOdo} style={[styles.dialogBtn, { backgroundColor: '#0b3b60' }]}>
                  <Text style={{ fontFamily: F.bold, color: '#ffffff' }}>
                    {isPlanta(myMoto) ? 'Guardar Horas' : 'Guardar Odómetro'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL: CARGAR COMBUSTIBLE */}
        <Modal visible={quickFuelVisible} transparent={true} animationType="fade">
          <View style={styles.desktopModalBackdrop}>
            <View style={[styles.dialogBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 18 }}>
                  Cargar Combustible
                </Text>
                <TouchableOpacity onPress={() => setQuickFuelVisible(false)}>
                  <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 16 }}>
                Registra los datos de tu tanqueo
              </Text>

              <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 6 }}>LITROS CARGADOS:</Text>
              <TextInput 
                value={fuelLitersInput}
                onChangeText={setFuelLitersInput}
                placeholder="Ej. 10"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="numeric"
                style={[styles.dialogInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold, marginBottom: 12 }]}
              />

              <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 6 }}>COSTO EN USD ($):</Text>
              <TextInput 
                value={fuelUsdInput}
                onChangeText={setFuelUsdInput}
                placeholder="Ej. 5.00"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="numeric"
                style={[styles.dialogInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => setQuickFuelVisible(false)} style={[styles.dialogBtn, { borderColor: colors.outlineVariant, borderWidth: 0.5 }]}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveQuickFuel} style={[styles.dialogBtn, { backgroundColor: '#00e3fd' }]}>
                  <Text style={{ fontFamily: F.bold, color: '#111319' }}>Guardar Carga</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    );
  }

  // ==========================================
  // MOBILE LAYOUT (Current Touch Phone View)
  // ==========================================
  const midPoint = Math.ceil(tabs.length / 2);
  const leftTabs = tabs.slice(0, midPoint);
  const rightTabs = tabs.slice(midPoint);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, paddingBottom: 68 + insets.bottom }}>
          <View style={{ flex: 1, display: activeTab === 'moto' ? 'flex' : 'none' }}>
            {(!isAdmin || isPlanta(myMoto)) ? (
              <ClientMobileDashboard
                onNavigateToSpecs={() => handleSelectTab('specs')}
                onNavigateToHistory={() => handleSelectTab('history')}
                onNavigateToProfile={() => handleSelectTab('profile')}
                onOpenQuickHours={() => setQuickOdoVisible(true)}
                onOpenQuickFuel={() => setQuickFuelVisible(true)}
              />
            ) : (
              <DashboardTab />
            )}
          </View>
          {visitedTabs.has('specs') && (
            <View style={{ flex: 1, display: activeTab === 'specs' ? 'flex' : 'none' }}>
              <SpecsTab onNavigateToServices={() => handleSelectTab(isAdmin ? 'services' : 'history')} />
            </View>
          )}
          {visitedTabs.has('services') && (
            <View style={{ flex: 1, display: activeTab === 'services' ? 'flex' : 'none' }}>
              <ServicesTab initialComponent={servicesInitialComp} />
            </View>
          )}
          {visitedTabs.has('history') && (
            <View style={{ flex: 1, display: activeTab === 'history' ? 'flex' : 'none' }}>
              <HistoryTab />
            </View>
          )}
          {visitedTabs.has('wallet') && (
            <View style={{ flex: 1, display: activeTab === 'wallet' ? 'flex' : 'none' }}>
              <WalletTab />
            </View>
          )}
          {visitedTabs.has('profile') && (
            <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none' }}>
              <ProfileTab onOpenReport={() => setReportModalVisible(true)} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* CURVED / RAISED FLOATING BOTTOM BAR CON BOTÓN [+] CENTRAL */}
      <View style={[styles.bottomNav, { 
        backgroundColor: isDark ? 'rgba(14, 18, 25, 0.96)' : 'rgba(255, 255, 255, 0.96)', 
        borderTopColor: borderHairline, 
        paddingBottom: Math.max(insets.bottom, 10),
        height: 64 + Math.max(insets.bottom, 10),
      }]}>
        {leftTabs.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => handleTabPress(item.id)} 
              style={[styles.navItem, isActive && styles.activeNavItemPill]} 
              activeOpacity={0.8}
            >
              <View style={[
                styles.tabPillContainer,
                isActive && {
                  backgroundColor: 'rgba(34, 197, 94, 0.16)',
                  borderColor: 'rgba(34, 197, 94, 0.35)',
                  borderWidth: 1,
                  flexDirection: 'row',
                }
              ]}>
                {(item.iconFamily as string) === 'community' ? (
                  <MaterialCommunityIcons 
                    name={item.icon as any} 
                    size={isActive ? 18 : 20} 
                    color={isActive ? '#22c55e' : (isDark ? '#707e94' : '#8e96aa')} 
                  />
                ) : (
                  <MaterialIcons 
                    name={item.icon as any} 
                    size={isActive ? 18 : 20} 
                    color={isActive ? '#22c55e' : (isDark ? '#707e94' : '#8e96aa')} 
                  />
                )}
                <Text style={[
                  styles.navLabel, 
                  { 
                    color: isActive ? '#22c55e' : (isDark ? '#707e94' : '#8e96aa'), 
                    fontFamily: isActive ? F.bold : F.medium,
                    fontSize: isActive ? 11 : 9.5,
                    marginLeft: isActive ? 6 : 0,
                    marginTop: isActive ? 0 : 3,
                  }
                ]}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* BOTÓN CENTRAL [+] DE ACCIÓN RÁPIDA (ELEVADO / FLOTANTE) */}
        <TouchableOpacity 
          onPress={handlePlusPress} 
          style={styles.centerPlusItem} 
          activeOpacity={0.9}
        >
          <Animated.View style={{ transform: [{ scale: plusScale }] }}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.centerPlusCircle}
            >
              <MaterialIcons name="add" size={26} color="#0c1017" />
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        {rightTabs.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => handleTabPress(item.id)} 
              style={[styles.navItem, isActive && styles.activeNavItemPill]} 
              activeOpacity={0.8}
            >
              <View style={[
                styles.tabPillContainer,
                isActive && {
                  backgroundColor: 'rgba(34, 197, 94, 0.16)',
                  borderColor: 'rgba(34, 197, 94, 0.35)',
                  borderWidth: 1,
                  flexDirection: 'row',
                }
              ]}>
                {(item.iconFamily as string) === 'community' ? (
                  <MaterialCommunityIcons 
                    name={item.icon as any} 
                    size={isActive ? 18 : 20} 
                    color={isActive ? '#22c55e' : (isDark ? '#707e94' : '#8e96aa')} 
                  />
                ) : (
                  <MaterialIcons 
                    name={item.icon as any} 
                    size={isActive ? 18 : 20} 
                    color={isActive ? '#22c55e' : (isDark ? '#707e94' : '#8e96aa')} 
                  />
                )}
                <Text style={[
                  styles.navLabel, 
                  { 
                    color: isActive ? '#22c55e' : (isDark ? '#707e94' : '#8e96aa'), 
                    fontFamily: isActive ? F.bold : F.medium,
                    fontSize: isActive ? 11 : 9.5,
                    marginLeft: isActive ? 6 : 0,
                    marginTop: isActive ? 0 : 3,
                  }
                ]}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

      </View>

      {/* MODAL: ACCIONES RÁPIDAS AL TOCAR [+] */}
      <Modal visible={quickActionVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[styles.quickSheet, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.outlineVariant }]} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 19 }}>Acciones Rápidas</Text>
              <TouchableOpacity onPress={() => setQuickActionVisible(false)} style={styles.sheetCloseBtn}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 13, marginBottom: 18 }}>
              Registra novedades de tu vehículo en segundos sin tener que buscar entre menús:
            </Text>

            <View style={{ gap: 12 }}>
              {!isAdmin ? (
                <>
                  {/* CLIENT OPTION 1: ACTUALIZAR HORÓMETRO */}
                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setQuickOdoVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(0, 227, 253, 0.15)' }]}>
                      <MaterialIcons name="timer" size={24} color="#00e3fd" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Actualizar Horómetro</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Actual: {(myMoto?.currentHours || myMoto?.currentOdometer || 0).toLocaleString()} hrs • Sincroniza la lectura de planta
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  {/* CLIENT OPTION 2: CARGAR DIÉSEL */}
                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setQuickFuelVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                      <MaterialIcons name="local-gas-station" size={24} color="#FF9500" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Cargar Diésel</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Registra litros de combustible y gasto en USD
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  {/* CLIENT OPTION 3: AGENDAR CITA O REPORTAR INQUIETUD */}
                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setInquiryModalVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                      <MaterialCommunityIcons name="calendar-clock" size={24} color="#22c55e" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Agendar Cita o Reportar Alarma</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Solicita servicio preventivo o comunica una novedad
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  {/* CLIENT OPTION 4: EXPEDIENTE PDF CON QR */}
                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setReportModalVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <MaterialIcons name="qr-code" size={24} color="#ef4444" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Expediente PDF con QR</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Genera el informe técnico avalado por Hermanos Lynch
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  {/* CLIENT OPTION 5: CONTACTAR OPERADOR ASIGNADO */}
                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setOperatorModalVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                      <MaterialIcons name="support-agent" size={24} color="#1a5cff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Operador Técnico Asignado</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        {myMoto?.assignedOperatorName || 'Operador por Asignar'} • Contacto directo
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setQuickOdoVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(10,132,255,0.15)' }]}>
                      <MaterialIcons name="speed" size={24} color="#0A84FF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>
                        {isPlanta(myMoto) ? 'Actualizar Horómetro' : 'Actualizar Odómetro'}
                      </Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Actual: {(myMoto?.currentHours || myMoto?.currentOdometer || 0).toLocaleString()} {isPlanta(myMoto) ? 'hrs' : 'km'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setQuickFuelVisible(true);
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                      <MaterialIcons name="local-gas-station" size={24} color="#FF9500" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Cargar Combustible</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Registra litros, gasto en USD y tanqueo
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setActiveTab('services');
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(175,82,222,0.15)' }]}>
                      <MaterialIcons name="build" size={24} color="#AF52DE" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>Registrar Servicio</Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        Aceite, frenos, repuestos y costos
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setQuickActionVisible(false);
                      setActiveTab('wallet');
                    }}
                    style={[styles.quickOptionRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickIconBox, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
                      <MaterialIcons name={isDesktop ? "upload-file" : "qr-code-scanner"} size={24} color="#30D158" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>
                        {isDesktop ? 'Subir Documento o Carnet' : 'Escanear QR o Carnet'}
                      </Text>
                      <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                        {isDesktop ? 'Cargar archivo o foto de documento' : 'Adjuntar foto de documento o leer código QR'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={{ height: 26 }} />
          </View>
        </View>
      </Modal>

      {/* MODAL RÁPIDO: ACTUALIZAR HORÓMETRO / ODÓMETRO (MOBILE) */}
      <Modal visible={quickOdoVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={[styles.dialogBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18, textAlign: 'center' }}>
              {isPlanta(myMoto) ? 'Actualizar Horómetro' : 'Actualizar Odómetro'}
            </Text>
            <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              {isPlanta(myMoto)
                ? `Horas acumuladas actuales: ${(myMoto?.currentHours || myMoto?.currentOdometer || 0).toLocaleString()} hrs`
                : `Odómetro actual: ${(myMoto?.currentOdometer || 0).toLocaleString()} km`}
            </Text>

            <TextInput 
              value={newOdoInput}
              onChangeText={setNewOdoInput}
              placeholder={isPlanta(myMoto) ? `Mayor a ${myMoto?.currentHours || myMoto?.currentOdometer || 0} hrs` : `Mayor a ${myMoto?.currentOdometer || 0} km`}
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setQuickOdoVisible(false)} style={[styles.dialogBtn, { borderColor: colors.outlineVariant, borderWidth: 0.5 }]}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveQuickOdo} style={[styles.dialogBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ fontFamily: F.bold, color: colors.onPrimary }}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL RÁPIDO: CARGAR COMBUSTIBLE (MOBILE) */}
      <Modal visible={quickFuelVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={[styles.dialogBox, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18, textAlign: 'center' }}>
              Cargar Combustible
            </Text>
            <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              Registra los datos de tu tanqueo
            </Text>

            <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 6 }}>LITROS CARGADOS:</Text>
            <TextInput 
              value={fuelLitersInput}
              onChangeText={setFuelLitersInput}
              placeholder="Ej. 10"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold, marginBottom: 12 }]}
            />

            <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 6 }}>COSTO EN USD ($):</Text>
            <TextInput 
              value={fuelUsdInput}
              onChangeText={setFuelUsdInput}
              placeholder="Ej. 5.00"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="numeric"
              style={[styles.dialogInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity onPress={() => setQuickFuelVisible(false)} style={[styles.dialogBtn, { borderColor: colors.outlineVariant, borderWidth: 0.5 }]}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveQuickFuel} style={[styles.dialogBtn, { backgroundColor: '#FF9500' }]}>
                <Text style={{ fontFamily: F.bold, color: '#FFF' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: FICHA TÉCNICA (MOBILE) */}
      <TechnicalSheetModal
        visible={specsModalVisible}
        onClose={() => setSpecsModalVisible(false)}
        myMoto={myMoto}
        specs={specs}
      />

      {/* MODAL: ESTADÍSTICAS Y CALENDARIO (MOBILE) */}
      <VehicleStatsAndCalendarModal
        visible={statsModalVisible}
        onClose={() => setStatsModalVisible(false)}
      />

      {/* MODAL: OPERADOR ASIGNADO (MOBILE) */}
      <AssignedOperatorModal
        visible={operatorModalVisible}
        onClose={() => setOperatorModalVisible(false)}
        myMoto={myMoto}
      />

      {/* MODAL: REPORTE EJECUTIVO PDF (MOBILE) */}
      <VehicleReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        myMoto={myMoto}
        specs={specs}
      />

      {/* MODAL: AGENDAR CITA O REPORTAR INQUIETUD (MOBILE) */}
      <ClientInquiryModal
        visible={inquiryModalVisible}
        onClose={() => setInquiryModalVisible(false)}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  desktopTabContainer: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  desktopModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backdropFilter: 'blur(8px)',
  } as any,
  bottomNav: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    borderTopWidth: 0.5, 
    position: 'absolute', 
    bottom: 0, 
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    paddingHorizontal: 8,
  },
  navItem: { 
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 2,
  },
  activeNavItemPill: {
    flex: 1.35,
  },
  tabPillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  navLabel: { 
    fontSize: 10, 
    letterSpacing: 0.1,
  },
  centerPlusItem: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    top: -16,
  },
  centerPlusCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  quickSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    borderWidth: 0.5,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  quickOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 0.5,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  dialogInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 0.8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  dialogBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
