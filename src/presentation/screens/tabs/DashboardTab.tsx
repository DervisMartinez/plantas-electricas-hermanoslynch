import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Dimensions, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { calculateWearPercentage, ComponentType } from '../../../constants/telemetry';
import { getMotoSpecs } from '../../../data/specs';
import { VEHICLE_CATALOG, MOTO_CATALOG } from '../../../data/catalog';
import { isCar, isPlanta } from '../../../domain/entities/Moto';
import { TutorialModal } from '../../components/TutorialModal';
import { TechnicalSheetModal } from '../../components/TechnicalSheetModal';
import { VehicleStatsAndCalendarModal } from '../../components/VehicleStatsAndCalendarModal';
import { AssignedOperatorModal } from '../../components/AssignedOperatorModal';
import { VehicleReportModal } from '../../components/VehicleReportModal';
import { ClientMobileDashboard } from '../../components/mobile/ClientMobileDashboard';
import { useCrashDetection } from '../../hooks/useCrashDetection';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

let hasPromptedOdoThisSession = false;

export const DashboardTab = () => {
  const { myMoto, motos, selectMoto, records, addRecord, updateMoto, setIsAddingMoto, isAdmin } = useMyMoto();
  const { 
    isEnabled: isCrashEnabled, 
    toggleCrashDetection, 
    crashTriggered, 
    isManualTrigger, 
    triggerManualSOS, 
    simulateTestCrash, 
    dismissCrashAlert 
  } = useCrashDetection();

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const slideWidth = screenWidth - 32;

  // Sincronizar índice del carrusel con myMoto activo
  React.useEffect(() => {
    if (motos && myMoto) {
      const idx = motos.findIndex(m => m.id === myMoto.id);
      if (idx !== -1 && idx !== activeSlideIndex) {
        setActiveSlideIndex(idx);
        carouselScrollRef.current?.scrollTo({ x: idx * slideWidth, animated: true });
      }
    }
  }, [myMoto?.id, motos]);

  React.useEffect(() => {
    if (!myMoto) return;
    const checkTutorial = async () => {
      try {
        const seen = await AsyncStorage.getItem('@garage_tutorial_seen');
        if (!seen) {
          setTimeout(() => setTutorialVisible(true), 400);
          return;
        }
      } catch {}
      if (!hasPromptedOdoThisSession) {
        hasPromptedOdoThisSession = true;
        setTimeout(() => setOdoUpdateVisible(true), 600);
      }
    };
    checkTutorial();
  }, [myMoto]);

  const { colors, mode, toggleTheme } = useTheme();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [oilSetupVisible, setOilSetupVisible] = useState(false);
  const [odoUpdateVisible, setOdoUpdateVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [techSheetVisible, setTechSheetVisible] = useState(false);
  const [statsCalVisible, setStatsCalVisible] = useState(false);
  const [statsCalInitialTab, setStatsCalInitialTab] = useState<'calendar' | 'stats'>('calendar');
  const [inspectionVisible, setInspectionVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [newOdo, setNewOdo] = useState('');
  const [lastOilOdo, setLastOilOdo] = useState('');
  const [oilType, setOilType] = useState('Mineral');
  const [usdAmount, setUsdAmount] = useState('');
  const [litersAmount, setLitersAmount] = useState('');
  
  // Find last maintenance odometer for a specific component
  const getLastOdo = (type: ComponentType) => {
    if (!myMoto) return 0;
    const typeRecords = records.filter(r => r.type === type);
    if (typeRecords.length === 0) {
      return myMoto.isFromAgency ? 0 : myMoto.currentOdometer; // If from agency, assume fresh at 0. Otherwise assume worn out or just default to current (0% life).
    }
    return Math.max(...typeRecords.map(r => r.odometer));
  };

  const isCurrentCar = isCar(myMoto);
  const isCurrentPlanta = isPlanta(myMoto);

  const calcPercent = (type: ComponentType) => {
    if (!myMoto) return 0;

    if (isCurrentPlanta) {
      const currentHours = myMoto.currentHours || myMoto.currentOdometer || 0;
      const typeRecords = records.filter(r => r.type === type);
      const intervalMap: Partial<Record<ComponentType, number>> = {
        oil: 250,
        oil_filter: 250,
        fuel_filter: 250,
        air_filter: 500,
        coolant: 1000,
        battery: 2000,
        accessory_belt: 1000,
        spark_plugs: 1500,
        other: 500,
      };
      const interval = intervalMap[type] || 250;

      if (typeRecords.length === 0) {
        if (currentHours > 0) {
          const usedInCycle = currentHours % interval;
          const ratio = Math.max(0, 1 - (usedInCycle / interval));
          return Math.round(ratio * 100);
        }
        return myMoto.isFromAgency ? 100 : 0;
      }
      const lastServiceHours = Math.max(...typeRecords.map(r => r.odometer));
      const hoursSince = Math.max(0, currentHours - lastServiceHours);
      const ratio = Math.max(0, 1 - (hoursSince / interval));
      return Math.max(0, Math.min(100, Math.round(ratio * 100)));
    }

    const typeRecords = records.filter(r => r.type === type);
    if (typeRecords.length === 0 && !myMoto.isFromAgency) {
      return 0; // No data, not from agency -> requiere ajuste inicial
    }
    const lastOdo = getLastOdo(type);
    let override = undefined; 
    if (type === 'oil') { 
      const typeRecords = records.filter(r => r.type === 'oil'); 
      if (typeRecords.length > 0) { 
        const lastRecord = typeRecords.reduce((prev, current) => (prev.odometer > current.odometer) ? prev : current); 
        if (isCurrentCar) {
          if (lastRecord.notes?.includes('Sintético')) override = 7500;
          else override = 5000;
        } else {
          if (lastRecord.notes?.includes('Mineral')) override = 3000; 
          else if (lastRecord.notes?.includes('Semi')) override = 5000; 
          else if (lastRecord.notes?.includes('Sintético')) override = 8000; 
        }
      } else if (isCurrentCar) {
        override = 5000;
      }
    } 
    return calculateWearPercentage(myMoto.currentOdometer, lastOdo, type as any, override, isCurrentCar);
  };

  const oilP = calcPercent('oil');
  const tiresFP = calcPercent('tires_front');
  const tiresRP = calcPercent('tires_rear');
  const brakesFP = calcPercent('brakes_front');
  const brakesRP = calcPercent('brakes_rear');
  const chainP = calcPercent('chain');
  const airP = calcPercent('air_filter');
  const fuelP = calcPercent('fuel_filter');
  const sparkP = calcPercent('spark_plugs');
  const timingBeltP = calcPercent('timing_belt');
  const coolantP = calcPercent('coolant');
  const cabinP = calcPercent('cabin_filter');
  const batteryP = calcPercent('battery');
  const shockP = calcPercent('shock_absorbers');
  const brakeFluidP = calcPercent('brake_fluid');

  const F = {
    regular: 'Montserrat_400Regular',
    medium: 'Montserrat_500Medium',
    semibold: 'Montserrat_600SemiBold',
    bold: 'Montserrat_700Bold',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const handleSaveOilSetup = () => {
    if(!lastOilOdo || !myMoto) {
      alert(isCurrentPlanta ? 'Ingresa un valor de horas válido' : 'Ingresa un kilometraje válido');
      return;
    }
    const val = parseInt(lastOilOdo) || (myMoto.currentHours || myMoto.currentOdometer || 0);
    addRecord({
      id: Math.random().toString(),
      type: 'oil',
      date: new Date().toISOString(),
      odometer: val,
      costUSD: 0,
      notes: isCurrentPlanta
        ? `Configuración Inicial: Aceite Diésel 15W-40 (${oilType}) a ${val} hrs`
        : `Configuración Inicial - ${oilType}`
    });
    alert(isCurrentPlanta ? 'Horas de lubricante configuradas' : 'Aceite configurado');
    setOilSetupVisible(false);
  };

  const handleSaveFuel = () => {
    if(!usdAmount || !litersAmount || !myMoto) {
      alert('Ingresa monto y litros'); return;
    }
    addRecord({
      id: Math.random().toString(),
      type: 'fuel',
      date: new Date().toISOString(),
      odometer: myMoto.currentOdometer,
      costUSD: parseFloat(usdAmount),
      notes: `${litersAmount} Litros`
    });
    alert(`Combustible guardado`);
    setModalVisible(false);
    setUsdAmount('');
    setLitersAmount('');
  };

  if (!myMoto) return null;
  if (isCurrentPlanta || !isAdmin) {
    return <ClientMobileDashboard />;
  }
  const specs = getMotoSpecs(myMoto.brand, myMoto.model);

  // Check for components requiring attention and vehicle overall status
  const componentsList = useMemo(() => {
    if (isCurrentCar) {
      return [
        { name: 'Aceite Motor', p: oilP },
        { name: 'Correa de Distribución', p: timingBeltP },
        { name: 'Refrigerante', p: coolantP },
        { name: 'Líquido de Frenos', p: brakeFluidP },
        { name: 'Filtro A/C', p: cabinP },
        { name: 'Filtro de Aire', p: airP },
        { name: 'Filtro Gasolina', p: fuelP },
        { name: 'Bujías', p: sparkP },
        { name: 'Frenos Del.', p: brakesFP },
        { name: 'Frenos Tras.', p: brakesRP },
        { name: 'Cauchos Del.', p: tiresFP },
        { name: 'Cauchos Tras.', p: tiresRP },
        { name: 'Batería', p: batteryP },
        { name: 'Amortiguadores', p: shockP },
      ];
    }
    return [
      { name: 'Aceite', p: oilP },
      { name: 'Caucho Del.', p: tiresFP },
      { name: 'Caucho Tras.', p: tiresRP },
      { name: 'Frenos Del.', p: brakesFP },
      { name: 'Frenos Tras.', p: brakesRP },
      { name: 'Cadena', p: chainP },
      { name: 'Filtro Aire', p: airP },
      { name: 'Filtro Gas', p: fuelP },
      { name: 'Bujías', p: sparkP },
    ];
  }, [isCurrentCar, oilP, timingBeltP, coolantP, brakeFluidP, cabinP, airP, fuelP, sparkP, brakesFP, brakesRP, tiresFP, tiresRP, batteryP, shockP, chainP]);

  const lowComponents = componentsList.filter(c => c.p < 15);

  // Cálculo dinámico de los 4 estados reales del vehículo: Óptimo, Regular, En Mantenimiento, Atención
  const vehicleStatus = useMemo(() => {
    const minPercent = Math.min(...componentsList.map(c => c.p));
    const criticalCount = componentsList.filter(c => c.p < 15).length;
    const warningCount = componentsList.filter(c => c.p < 30).length;

    if (minPercent < 15 || criticalCount >= 2) {
      return { label: '● Atención', color: '#FF453A', bg: 'rgba(255, 69, 58, 0.18)', desc: 'Requiere servicio urgente' };
    }
    if (minPercent < 30 || warningCount >= 1) {
      return { label: '● En Mantenimiento', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.18)', desc: 'Servicio programado próximo' };
    }
    if (minPercent < 50) {
      return { label: '● Regular', color: '#FFD60A', bg: 'rgba(255, 214, 10, 0.18)', desc: 'Desgaste moderado en piezas' };
    }
    return { label: '● Óptimo', color: '#30D158', bg: 'rgba(48, 209, 88, 0.18)', desc: 'Todos los sistemas en buen estado' };
  }, [componentsList]);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={mode === 'dark' ? '#051838' : '#1E3A8A'} 
      />
      
      {/* DEGRADADO SUPERIOR DE ALTA PRECISIÓN AUTOMOTRIZ (Azul Oscuro en Dark / Azul Rey Fuerte en Light) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={
            mode === 'dark'
              ? ['#051838', '#0A2B5E', '#10408A', '#0D3169', colors.surface]
              : ['#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', colors.surface]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.60 }}
          style={{ width: '100%', height: 480 }}
        />
      </View>
      
      {/* HEADER INTEGRADO */}
      <View style={[styles.header, { borderBottomColor: 'transparent', backgroundColor: 'transparent' }]}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="engine" size={28} color="#00e3fd" />
          <Text style={[styles.headerTitle, { color: '#FFFFFF', fontFamily: F.bold, letterSpacing: 1 }]}>HERMANOS LYNCH</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Botón SOS de Emergencia de Alto Contraste */}
          <TouchableOpacity 
            style={[
              styles.iconButton, 
              { 
                backgroundColor: '#DC2626', 
                borderWidth: 1.5, 
                borderColor: '#FFFFFF',
                shadowColor: '#DC2626',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 5,
                elevation: 4
              }
            ]} 
            onPress={triggerManualSOS}
            accessibilityLabel="Activar SOS de Emergencia"
          >
            <MaterialIcons name="emergency" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: 'rgba(255, 255, 255, 0.16)' }]} 
            onPress={() => {
              setStatsCalInitialTab('calendar');
              setStatsCalVisible(true);
            }}
            accessibilityLabel="Calendario y Estadísticas"
          >
            <MaterialIcons name="event-note" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: 'rgba(255, 255, 255, 0.16)' }]} 
            onPress={() => setTutorialVisible(true)}
            accessibilityLabel="Guía y tutorial"
          >
            <MaterialIcons name="help-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: 'rgba(255, 255, 255, 0.16)' }]} onPress={toggleTheme}>
            <MaterialIcons name={mode === 'dark' ? 'light-mode' : 'dark-mode'} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* BANNER DETECTOR DE IMPACTO & SEGURIDAD SOS */}
        <View style={{
          backgroundColor: isCrashEnabled ? (mode === 'dark' ? '#0F231D' : '#E8F5E9') : (mode === 'dark' ? '#2A1B1B' : '#FFEBEE'),
          marginHorizontal: 16,
          marginTop: 12,
          padding: 12,
          borderRadius: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 0.5,
          borderColor: isCrashEnabled ? '#30D158' : '#FF453A'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <MaterialCommunityIcons 
              name={isCrashEnabled ? "shield-check" : "shield-alert"} 
              size={24} 
              color={isCrashEnabled ? '#30D158' : '#ff443a8e'} 
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 12 }}>
                Detector de Caídas & SOS en Ruta
              </Text>
              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 10 }}>
                {isCrashEnabled ? 'Acelerómetro activo (>3.5G). Aviso GPS por Correo/Tel.' : 'Monitoreo de impacto desactivado'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              onPress={simulateTestCrash}
              style={{ backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
            >
              <Text style={{ fontFamily: F.bold, fontSize: 10, color: colors.primary }}>PROBAR</Text>
            </TouchableOpacity>
            <Switch
              value={isCrashEnabled}
              onValueChange={toggleCrashDetection}
              trackColor={{ false: '#767577', true: '#30D158' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* REMINDERS BANNER */}
        {lowComponents.length > 0 && (
          <View style={{ backgroundColor: colors.errorContainer, margin: 16, marginBottom: 0, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="warning" size={24} color={colors.onErrorContainer} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, color: colors.onErrorContainer, fontSize: 13 }}>¡Mantenimiento Requerido!</Text>
              <Text style={{ fontFamily: F.medium, color: colors.onErrorContainer, fontSize: 11, marginTop: 2 }}>
                Debes revisar: {lowComponents.map(c => c.name).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* HERO SECTION CON ESTUDIO DEGRADADO AUTOMOTRIZ & CARRUSEL DESLIZABLE */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          
          {/* Tagline superior automotriz */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: F.extrabold, color: '#FFFFFF', fontSize: 24, letterSpacing: -0.6 }}>
              Tu Garaje. <Text style={{ color: mode === 'dark' ? '#00e3fd' : '#FFE082' }}>Inteligente en Ruta.</Text>
            </Text>
            <Text style={{ fontFamily: F.medium, color: mode === 'dark' ? 'rgba(255, 255, 255, 0.78)' : '#FFF3E0', fontSize: 12.5, marginTop: 3 }}>
              Desliza para cambiar de vehículo o toca para ver sus detalles.
            </Text>
          </View>

          {/* Sección de Estudio Automotriz con Degradado Natural Integrado */}
          <LinearGradient
            colors={
              mode === 'dark' 
                ? ['transparent', 'rgba(10, 43, 94, 0.35)', 'rgba(16, 64, 138, 0.45)', 'rgba(10, 43, 94, 0.35)', 'transparent'] 
                : ['transparent', 'rgba(255, 112, 0, 0.18)', 'rgba(255, 146, 0, 0.28)', 'rgba(255, 112, 0, 0.18)', 'transparent']
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 0,
              width: '100%',
              alignItems: 'center',
            }}
          >
            {/* Carrusel Deslizable de Vehículos */}
            <ScrollView
              ref={carouselScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                if (motos && motos[idx] && motos[idx].id !== myMoto.id) {
                  setActiveSlideIndex(idx);
                  selectMoto(motos[idx].id);
                } else {
                  setActiveSlideIndex(idx);
                }
              }}
              style={{ width: slideWidth }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {motos && motos.length > 0 ? (
                motos.map((moto, index) => {
                  const catMoto = VEHICLE_CATALOG.find(
                    m => m.brand.toLowerCase() === moto.brand.toLowerCase() && m.model.toLowerCase() === moto.model.toLowerCase()
                  ) || VEHICLE_CATALOG.find(
                    m => m.brand.toLowerCase() === moto.brand.toLowerCase()
                  );
                  const isMotoCar = isCar(moto);
                  return (
                    <TouchableOpacity 
                      key={moto.id} 
                      onPress={() => setTechSheetVisible(true)}
                      activeOpacity={0.9}
                      accessibilityLabel="Toca para inspeccionar tu vehículo en 3D"
                      style={{ width: slideWidth, height: 215, justifyContent: 'center', alignItems: 'center', position: 'relative' }}
                    >
                      {moto.imageUrl ? (
                        <Image source={{ uri: moto.imageUrl }} style={{ width: '96%', height: 195, zIndex: 5 }} resizeMode="contain" />
                      ) : catMoto?.imageRes ? (
                        <Image source={catMoto.imageRes} style={{ width: '96%', height: 195, zIndex: 5 }} resizeMode="contain" />
                      ) : (
                        <View style={{ width: '100%', height: 195, justifyContent: 'center', alignItems: 'center', zIndex: 5 }}>
                          <MaterialIcons name={isMotoCar ? "directions-car" : "two-wheeler"} size={106} color={colors.onSurfaceVariant} />
                        </View>
                      )}

                      {/* Spotlight Glow de suelo */}
                      <View style={[styles.podiumGlow, { backgroundColor: mode === 'dark' ? 'rgba(10, 132, 255, 0.28)' : 'rgba(0, 122, 255, 0.15)', bottom: 6 }]} />
                      <View style={[styles.podiumRing, { borderColor: mode === 'dark' ? 'rgba(10, 132, 255, 0.35)' : 'rgba(0, 122, 255, 0.2)', bottom: -4 }]}>
                        <View style={[styles.podiumInnerRing, { borderColor: mode === 'dark' ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)' }]} />
                      </View>

                      {/* 3D Interactive Inspection Badge */}
                      <View style={{
                        position: 'absolute',
                        top: 2,
                        right: 22,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: mode === 'dark' ? 'rgba(10, 132, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        borderWidth: 0.8,
                        borderColor: colors.primary,
                        zIndex: 10,
                      }}>
                        <MaterialIcons name="3d-rotation" size={12} color={colors.primary} />
                        <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: colors.primary, letterSpacing: 0.4 }}>
                          3D
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ width: slideWidth, height: 180, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="two-wheeler" size={96} color={colors.onSurfaceVariant} />
                </View>
              )}
            </ScrollView>

            {/* Puntos de Carrusel Deslizables e Interactivos */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: 8 }}>
              {motos && motos.length > 1 ? (
                motos.map((m, idx) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => {
                      setActiveSlideIndex(idx);
                      selectMoto(m.id);
                      carouselScrollRef.current?.scrollTo({ x: idx * slideWidth, animated: true });
                    }}
                    style={{
                      width: activeSlideIndex === idx ? 18 : 6,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: activeSlideIndex === idx ? colors.primary : (mode === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)')
                    }}
                  />
                ))
              ) : (
                <View style={{ width: 18, height: 5, borderRadius: 2.5, backgroundColor: colors.primary }} />
              )}
            </View>

            {/* Barra de Datos del Vehículo Integrada */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingTop: 8, paddingHorizontal: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18 }}>
                  {myMoto.brand} {myMoto.model}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={{ backgroundColor: vehicleStatus.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontFamily: F.bold, color: vehicleStatus.color, fontSize: 11 }}>
                      {vehicleStatus.label}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 12 }}>
                    PLACA: {myMoto.plate || 'S/N'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setOdoUpdateVisible(true)}
                style={{ alignItems: 'flex-end', backgroundColor: colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 0.5, borderColor: colors.outlineVariant }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>
                    {isCurrentPlanta ? 'Horómetro' : 'Odómetro'}
                  </Text>
                  <MaterialIcons name="edit" size={11} color={colors.primary} />
                </View>
                <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 16 }}>
                  {(myMoto.currentHours || myMoto.currentOdometer).toLocaleString()} <Text style={{ fontSize: 11, color: colors.primary }}>{isCurrentPlanta ? 'hrs' : 'km'}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* PRÓXIMO SERVICIO ESTIMADO (Barra Cápsula como en la Referencia) */}
          <TouchableOpacity
            onPress={() => {
              setStatsCalInitialTab('calendar');
              setStatsCalVisible(true);
            }}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.surfaceContainerLow,
              borderRadius: 20,
              padding: 16,
              marginTop: 12,
              borderWidth: 0.5,
              borderColor: colors.outlineVariant,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Próximo Servicio Estimado
                </Text>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14, marginTop: 2 }}>
                  {isCurrentPlanta
                    ? 'En ~250 hrs • Cambio de Aceite Diésel 15W-40 & Filtros'
                    : isCurrentCar
                    ? 'En ~1,500 km • Cambio de Aceite 10W-30 / Filtro'
                    : 'En ~1,250 km • Cambio de Aceite 4T'}
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(10,132,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 11 }}>Planificar →</Text>
              </View>
            </View>

            {/* Barra de Progreso Cápsula */}
            <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.surfaceContainerHighest, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: '65%', height: '100%', borderRadius: 3, backgroundColor: '#30D158' }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* TECHNICAL SHEET SECTION */}
        {specs && (
          <View style={[styles.section, { paddingTop: 0 }]}>
            <TouchableOpacity 
              onPress={() => setTechSheetVisible(true)}
              activeOpacity={0.85}
              style={[styles.manualContainer, { backgroundColor: colors.surfaceContainerLow }]}
            >
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <MaterialIcons name="list-alt" size={20} color={colors.primary} />
                  <Text style={{color: colors.onSurface, fontFamily: F.semibold, fontSize: 16}}>Ficha Técnica</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.badgeSys, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={[styles.badgeSysText, { color: colors.primary, fontFamily: F.bold }]}>VER COMPLETA</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
                </View>
              </View>

              <View style={{gap: 12}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{color: colors.onSurfaceVariant, fontFamily: F.medium, fontSize: 12}}>Motor</Text>
                  <Text style={{color: colors.onSurface, fontFamily: F.bold, fontSize: 12}}>{specs.engineType}</Text>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{color: colors.onSurfaceVariant, fontFamily: F.medium, fontSize: 12}}>Cilindrada / HP</Text>
                  <Text style={{color: colors.onSurface, fontFamily: F.bold, fontSize: 12}}>{specs.displacement} / {specs.hp}</Text>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{color: colors.onSurfaceVariant, fontFamily: F.medium, fontSize: 12}}>Capacidad de Aceite</Text>
                  <Text style={{color: colors.tertiary, fontFamily: F.bold, fontSize: 12}}>{specs.oilCapacity}</Text>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{color: colors.onSurfaceVariant, fontFamily: F.medium, fontSize: 12}}>Presión de Cauchos (Del/Tras)</Text>
                  <Text style={{color: colors.secondary, fontFamily: F.bold, fontSize: 12}}>{specs.frontTirePressure} / {specs.rearTirePressure}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* SHORTCUT BANNER: PLANIFICACIÓN Y CALENDARIO */}
            <TouchableOpacity
              onPress={() => {
                setStatsCalInitialTab('calendar');
                setStatsCalVisible(true);
              }}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#1E40AF',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 18,
                marginTop: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="event" size={22} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: '#FFF', fontSize: 14 }}>Calendario & Planificación</Text>
                  <Text style={{ fontFamily: F.medium, color: '#A5C9FF', fontSize: 11, marginTop: 2 }}>
                    Anticípate a los próximos cambios y revisa tus estadísticas
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#D4E737', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontFamily: F.bold, color: '#000', fontSize: 11 }}>VER</Text>
              </View>
            </TouchableOpacity>

            {/* SHORTCUT BANNER: EXPEDIENTE Y REPORTE PDF */}
            <TouchableOpacity
              onPress={() => setReportModalVisible(true)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#dc2626',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 18,
                marginTop: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="picture-as-pdf" size={22} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: '#FFF', fontSize: 14 }}>Expediente & Reporte PDF</Text>
                  <Text style={{ fontFamily: F.medium, color: '#FECACA', fontSize: 11, marginTop: 2 }}>
                    Ficha técnica, telemetría, consumo y bitácora
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontFamily: F.bold, color: '#dc2626', fontSize: 11 }}>PDF</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* TELEMETRY SECTION */}
        <View style={styles.section}>
          {/* Fuel Level Estimation */}
          {(() => {
            const lastFuel = records.find(r => r.type === 'fuel');
            const fuelCapacityStr = specs?.fuelCapacity || '10 Litros';
            const capacityLiters = parseFloat(fuelCapacityStr) || 10;
            
            let fuelPercent = 0;
            let fuelLabel = 'Sin datos';
            let fuelColor = colors.onSurfaceVariant;

            if (lastFuel) {
              const match = lastFuel.notes?.match(/([\d.]+)/);
              const litersAdded = match ? parseFloat(match[1]) : capacityLiters;
              const distanceSinceFuel = myMoto.currentOdometer - lastFuel.odometer;
              
              const estEfficiency = 30; // km per liter
              const litersConsumed = distanceSinceFuel / estEfficiency;
              
              const currentLiters = Math.max(0, litersAdded - litersConsumed);
              fuelPercent = Math.min(100, Math.round((currentLiters / capacityLiters) * 100));
              
              fuelLabel = `${currentLiters.toFixed(1)}L / ${capacityLiters}L est.`;
              
              if (fuelPercent > 50) fuelColor = colors.tertiary;
              else if (fuelPercent > 20) fuelColor = colors.secondary;
              else fuelColor = colors.error;
            }

            return (
              <TelemetryItem colors={colors} F={F} icon="local-gas-station" title="Combustible (Estimado)" subtitle={fuelLabel} percent={fuelPercent} iconColor={fuelColor} barColor={fuelColor} />
            );
          })()}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: F.semibold }]}>Vida Útil de Componentes</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant, fontFamily: F.regular }]}>Cálculo automático según Odómetro</Text>
            </View>
            <View style={[styles.badgeSys, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.badgeSysText, { color: colors.secondary, fontFamily: F.bold }]}>
                {isCurrentCar ? '10 SISTEMAS' : '8 SISTEMAS'}
              </Text>
            </View>
          </View>

          {/* Oil */}
          {records.filter(r => r.type === 'oil').length === 0 ? (
            <TouchableOpacity 
              onPress={() => setOilSetupVisible(true)}
              style={{ backgroundColor: colors.errorContainer, padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="warning" size={24} color={colors.onErrorContainer} style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ color: colors.onErrorContainer, fontFamily: F.bold, fontSize: 14 }}>Configurar Aceite</Text>
                  <Text style={{ color: colors.onErrorContainer, fontFamily: F.medium, fontSize: 11, marginTop: 2 }}>¿Cuándo fue el último cambio?</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.onErrorContainer} />
            </TouchableOpacity>
          ) : (
            <TelemetryItem colors={colors} F={F} icon="oil-barrel" title={isCurrentCar ? "Aceite & Filtro de Motor" : "Aceite de Motor"} subtitle={isCurrentCar ? "4.0L Semi-Sintético / Sintético" : "Nivel de vida"} percent={oilP} iconColor={colors.primary} barColor={colors.primary} />
          )}

          {isCurrentCar ? (
            <>
              {/* Timing Belt (Crítico Optra) */}
              <TelemetryItem 
                colors={colors} 
                F={F} 
                icon="sync" 
                title="Correa de Distribución (Tiempo)" 
                subtitle="Kit DOHC 16V (40.000 - 50.000 km)" 
                percent={timingBeltP} 
                iconColor={timingBeltP < 30 ? colors.error : colors.tertiary} 
                barColor={timingBeltP < 30 ? colors.error : colors.tertiary} 
              />

              {/* Coolant & Battery */}
              <DualTelemetryItem 
                colors={colors} 
                F={F} 
                icon="invert-colors" 
                title="Refrigerante & Batería" 
                subtitle="Sistemas Térmico & Eléctrico" 
                p1={coolantP} 
                label1="Coolant Dex-Cool" 
                color1={colors.primary}
                p2={batteryP} 
                label2="Batería 12V 60Ah" 
                color2={colors.tertiary} 
                iconColor={colors.primary} 
              />

              {/* Tires */}
              <DualTelemetryItem 
                colors={colors} 
                F={F} 
                icon="trip-origin" 
                title="Neumáticos 195/55 R15" 
                subtitle="30 - 32 PSI en frío" 
                p1={tiresFP} 
                label1="Delanteros" 
                color1={colors.tertiary}
                p2={tiresRP} 
                label2="Traseros" 
                color2={colors.primary} 
                iconColor={colors.secondary} 
              />

              {/* Brakes */}
              <DualTelemetryItem 
                colors={colors} 
                F={F} 
                icon="disc-full" 
                title="Duración de Frenos" 
                subtitle="Discos Del. 256mm / Tras. 258mm (ABS)" 
                p1={brakesFP} 
                label1="Delanteros" 
                color1={colors.tertiary}
                p2={brakesRP} 
                label2="Traseros" 
                color2={colors.error} 
                iconColor={colors.error} 
              />

              {/* Filters Grid for Cars */}
              <View style={{flexDirection:'row', gap: 10, marginBottom: 12}}>
                <FilterCard colors={colors} F={F} icon="air" title="Filtro A/C" percent={cabinP} color={colors.primary} />
                <FilterCard colors={colors} F={F} icon="air" title="Filtro Aire" percent={airP} color={colors.secondary} />
                <FilterCard colors={colors} F={F} icon="local-gas-station" title="Filtro Gas" percent={fuelP} color={colors.tertiary} />
              </View>

              {/* Shock Absorbers */}
              <TelemetryItem 
                colors={colors} 
                F={F} 
                icon="build" 
                title="Amortiguadores & Suspensión" 
                subtitle="McPherson Del. / Dual-Link Tras." 
                percent={shockP} 
                iconColor={colors.secondary} 
                barColor={colors.secondary} 
              />

              {/* Spark Plugs */}
              <TelemetryItem 
                colors={colors} 
                F={F} 
                icon="bolt" 
                title="Bujías (Encendido MPFI)" 
                subtitle="NGK BKR6E-11 (Luz: 1.1 mm)" 
                percent={sparkP} 
                iconColor={colors.secondary} 
                barColor={colors.secondary} 
              />
            </>
          ) : (
            <>
              {/* Tires */}
              <DualTelemetryItem colors={colors} F={F} icon="trip-origin" title="Cauchos / Neumáticos" subtitle="Desgaste actual" 
                p1={tiresFP} label1="Delantero" color1={colors.tertiary}
                p2={tiresRP} label2="Trasero" color2={colors.primary} 
                iconColor={colors.secondary} />

              {/* Brakes */}
              <DualTelemetryItem colors={colors} F={F} icon="disc-full" title="Duración de Frenos" subtitle="Pastillas & Discos" 
                p1={brakesFP} label1="Delanteros" color1={colors.tertiary}
                p2={brakesRP} label2="Traseros" color2={colors.error} 
                iconColor={colors.error} />

              {/* Chain */}
              <TelemetryItem colors={colors} F={F} icon="link" title="Cadena de Transmisión" subtitle="Tensión y lubricación" percent={chainP} iconColor={colors.primary} barColor={colors.tertiary} />

              {/* Filters Grid */}
              <View style={{flexDirection:'row', gap: 12, marginBottom: 12}}>
                <FilterCard colors={colors} F={F} icon="air" title="Filtro Aire" percent={airP} color={colors.primary} />
                <FilterCard colors={colors} F={F} icon="local-gas-station" title="Filtro Gas" percent={fuelP} color={colors.tertiary} />
              </View>

              {/* Spark Plugs */}
              <TelemetryItem colors={colors} F={F} icon="bolt" title="Bujías (Ignición)" subtitle="Brecha / Chispa" percent={sparkP} iconColor={colors.secondary} barColor={colors.secondary} />
            </>
          )}
          
        </View>

        {/* MANUAL & SPECS SECTION */}
        <View style={styles.section}>
          <View style={[styles.manualContainer, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <MaterialIcons name="menu-book" size={20} color={colors.primary} />
                <Text style={{color: colors.onSurface, fontFamily: F.semibold, fontSize: 16}}>Manual & Specs</Text>
              </View>
              <View style={[styles.badgeSys, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.badgeSysText, { color: colors.onSurface, fontFamily: F.bold }]}>PDF</Text>
              </View>
            </View>

            <View style={[styles.manualRow, { backgroundColor: colors.surfaceContainer }]}>
              <View style={{flexDirection:'row', alignItems:'center', gap:12, flex: 1}}>
                <View style={[styles.pdfIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <MaterialIcons name="picture-as-pdf" size={24} color={colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={{color: colors.onSurface, fontFamily: F.semibold, fontSize: 14}} numberOfLines={1}>Manual {myMoto.brand}</Text>
                  <Text style={{color: colors.onSurfaceVariant, fontFamily: F.regular, fontSize: 12}}>Propietario</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.openBtn, { backgroundColor: colors.surfaceBright }]}>
                <Text style={{color: colors.secondary, fontFamily: F.bold, fontSize: 12}}>ABRIR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}>
            <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                <MaterialIcons name="local-gas-station" size={24} color={colors.primary} />
                <Text style={{color: colors.onSurface, fontFamily: F.bold, fontSize: 20}}>
                  Cargar Combustible
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <View>
              <Text style={{color: colors.onSurfaceVariant, fontFamily: F.bold, fontSize: 12, marginBottom: 8}}>MONTO PAGADO (USD)</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, marginBottom: 16 }]}>
                <Text style={{color: colors.onSurfaceVariant, fontSize: 18}}>$</Text>
                <TextInput style={[styles.modalInput, { color: colors.onSurface }]} placeholder="0.00" placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={usdAmount} onChangeText={setUsdAmount} />
              </View>
              
              <Text style={{color: colors.onSurfaceVariant, fontFamily: F.bold, fontSize: 12, marginBottom: 8}}>CANTIDAD (LITROS)</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, marginBottom: 24 }]}>
                <Text style={{color: colors.onSurfaceVariant, fontSize: 18}}>L</Text>
                <TextInput style={[styles.modalInput, { color: colors.onSurface }]} placeholder="0.0" placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={litersAmount} onChangeText={setLitersAmount} />
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveFuel}>
                <Text style={{color: colors.onPrimaryContainer, fontFamily: F.bold, fontSize: 16, letterSpacing: 1}}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={oilSetupVisible} transparent animationType='fade'>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}>
            <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                <MaterialIcons name='oil-barrel' size={24} color={colors.primary} />
                <Text style={{color: colors.onSurface, fontFamily: F.bold, fontSize: 18}}>
                  {isCurrentPlanta ? 'Último Mantenimiento de Aceite' : 'Último Cambio'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOilSetupVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}><MaterialIcons name='close' size={24} color={colors.onSurfaceVariant} /></TouchableOpacity>
            </View>
            <View>
              <Text style={{color: colors.onSurfaceVariant, fontFamily: F.regular, fontSize: 13, marginBottom: 16}}>
                {isCurrentPlanta
                  ? 'Para calcular la vida útil del aceite diésel 15W-40, ingresa las horas que tenía el horómetro en el último servicio.'
                  : 'Para calcular la vida útil del aceite, ingresa el kilometraje que tenía la moto en el último cambio.'}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, marginBottom: 24 }]}>
                <Text style={{color: colors.onSurfaceVariant, fontSize: 18}}>{isCurrentPlanta ? 'hrs' : 'km'}</Text>
                <TextInput style={[styles.modalInput, { color: colors.onSurface }]} placeholder={(myMoto?.currentHours || myMoto?.currentOdometer)?.toString() || '0'} placeholderTextColor={colors.onSurfaceVariant} keyboardType='numeric' value={lastOilOdo} onChangeText={setLastOilOdo} />
              </View>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveOilSetup}><Text style={{color: colors.onPrimaryContainer, fontFamily: F.bold, fontSize: 16, letterSpacing: 1}}>GUARDAR CONFIGURACIÓN</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={odoUpdateVisible} transparent animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}>
            <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeader}>
              <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                <MaterialIcons name="speed" size={24} color={colors.primary} />
                <Text style={{color: colors.onSurface, fontFamily: F.bold, fontSize: 18}}>
                  {isCurrentPlanta ? 'Actualizar Horómetro' : 'Actualizar Odómetro'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOdoUpdateVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}><MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} /></TouchableOpacity>
            </View>
            <View>
              <Text style={{color: colors.onSurfaceVariant, fontFamily: F.regular, fontSize: 13, marginBottom: 16}}>
                {isCurrentPlanta
                  ? 'Actualiza las horas de operación acumuladas de la planta para recalcular automáticamente el desgaste de todos los componentes.'
                  : 'Actualiza el odómetro de tu moto para recalcular automáticamente el desgaste de todos los componentes.'}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, marginBottom: 24 }]}>
                <Text style={{color: colors.onSurfaceVariant, fontSize: 18}}>{isCurrentPlanta ? 'hrs' : 'km'}</Text>
                <TextInput style={[styles.modalInput, { color: colors.onSurface }]} placeholder={(myMoto?.currentHours || myMoto?.currentOdometer)?.toString() || "0"} placeholderTextColor={colors.onSurfaceVariant} keyboardType="numeric" value={newOdo} onChangeText={setNewOdo} />
              </View>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => {
                const odo = parseInt(newOdo);
                const currentVal = myMoto.currentHours || myMoto.currentOdometer || 0;
                if (!odo || odo <= currentVal) {
                  alert(isCurrentPlanta ? 'Ingresa un número de horas mayor al actual' : 'Ingresa un kilometraje mayor al actual');
                  return;
                }
                updateMoto({ currentOdometer: odo, currentHours: odo });
                alert(isCurrentPlanta ? `Horómetro actualizado a ${odo} horas` : `Odómetro actualizado a ${odo} km`);
                setOdoUpdateVisible(false);
                setNewOdo('');
              }}><Text style={{color: colors.onPrimaryContainer, fontFamily: F.bold, fontSize: 16, letterSpacing: 1}}>ACTUALIZAR</Text></TouchableOpacity>
            </View>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      <TutorialModal visible={tutorialVisible} onClose={() => setTutorialVisible(false)} />
      <TechnicalSheetModal 
        visible={techSheetVisible} 
        onClose={() => setTechSheetVisible(false)} 
        myMoto={myMoto} 
        specs={specs} 
      />
      <VehicleStatsAndCalendarModal 
        visible={statsCalVisible} 
        onClose={() => setStatsCalVisible(false)} 
        initialTab={statsCalInitialTab}
      />
      <AssignedOperatorModal
        visible={crashTriggered}
        onClose={dismissCrashAlert}
        myMoto={myMoto}
      />
      <VehicleReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        myMoto={myMoto}
        specs={specs}
      />
    </SafeAreaView>
  );
};

// ... Telemetry UI Components
const TelemetryItem = ({ colors, F, icon, title, subtitle, percent, iconColor, barColor }: any) => (
  <View style={[telStyles.card, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
    <View style={telStyles.header}>
      <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
        <View style={[telStyles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
          <MaterialIcons name={icon} size={20} color={percent > 0 ? iconColor : colors.onSurfaceVariant} />
        </View>
        <View>
          <Text style={{color: colors.onSurface, fontFamily: F.semibold, fontSize: 15}}>{title}</Text>
          <Text style={{color: colors.onSurfaceVariant, fontFamily: F.regular, fontSize: 11}}>{subtitle}</Text>
        </View>
      </View>
      <View style={{alignItems:'flex-end'}}>
        <Text style={{color: percent > 0 ? barColor : colors.onSurfaceVariant, fontFamily: F.bold, fontSize: 16}}>{percent > 0 ? `${percent}%` : 'S/D'}</Text>
      </View>
    </View>
    <View style={[telStyles.barBg, { backgroundColor: colors.surfaceContainerHighest }]}>
      <View style={[telStyles.barFill, { width: percent > 0 ? `${percent}%` : '0%', backgroundColor: percent > 0 ? barColor : colors.onSurfaceVariant }]} />
    </View>
  </View>
);

const DualTelemetryItem = ({ colors, F, icon, title, subtitle, p1, label1, color1, p2, label2, color2, iconColor }: any) => {
  const active = p1 > 0 || p2 > 0;
  return (
    <View style={[telStyles.card, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={telStyles.header}>
        <View style={{flexDirection:'row', alignItems:'center', gap: 12}}>
          <View style={[telStyles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
            <MaterialIcons name={icon} size={20} color={active ? iconColor : colors.onSurfaceVariant} />
          </View>
          <View>
            <Text style={{color: colors.onSurface, fontFamily: F.semibold, fontSize: 15}}>{title}</Text>
            <Text style={{color: colors.onSurfaceVariant, fontFamily: F.regular, fontSize: 11}}>{subtitle}</Text>
          </View>
        </View>
      </View>
      <View style={{flexDirection: 'row', gap: 12}}>
        <View style={{flex: 1, backgroundColor: colors.surfaceContainer, padding: 8, borderRadius: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
            <Text style={{color: colors.onSurfaceVariant, fontFamily: F.semibold, fontSize: 10, textTransform: 'uppercase'}}>{label1}</Text>
            <Text style={{color: p1 > 0 ? color1 : colors.onSurfaceVariant, fontFamily: F.bold, fontSize: 12}}>{p1 > 0 ? `${p1}%` : 'S/D'}</Text>
          </View>
          <View style={[telStyles.barBg, { backgroundColor: colors.surfaceContainerHighest }]}>
            <View style={[telStyles.barFill, { width: p1 > 0 ? `${p1}%` : '0%', backgroundColor: p1 > 0 ? color1 : colors.onSurfaceVariant }]} />
          </View>
        </View>
        <View style={{flex: 1, backgroundColor: colors.surfaceContainer, padding: 8, borderRadius: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
            <Text style={{color: colors.onSurfaceVariant, fontFamily: F.semibold, fontSize: 10, textTransform: 'uppercase'}}>{label2}</Text>
            <Text style={{color: p2 > 0 ? color2 : colors.onSurfaceVariant, fontFamily: F.bold, fontSize: 12}}>{p2 > 0 ? `${p2}%` : 'S/D'}</Text>
          </View>
          <View style={[telStyles.barBg, { backgroundColor: colors.surfaceContainerHighest }]}>
            <View style={[telStyles.barFill, { width: p2 > 0 ? `${p2}%` : '0%', backgroundColor: p2 > 0 ? color2 : colors.onSurfaceVariant }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const FilterCard = ({ colors, F, icon, title, percent, color }: any) => (
  <View style={[{flex: 1, borderRadius: 12, padding: 16, backgroundColor: colors.surfaceContainerLow}]}>
    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
      <MaterialIcons name={icon} size={20} color={percent > 0 ? color : colors.onSurfaceVariant} />
      <Text style={{color: percent > 0 ? color : colors.onSurfaceVariant, fontFamily: F.bold, fontSize: 13}}>{percent > 0 ? `${percent}%` : 'S/D'}</Text>
    </View>
    <Text style={{color: colors.onSurface, fontFamily: F.semibold, fontSize: 14, marginTop: 4}}>{title}</Text>
    <View style={[{width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.surfaceContainerHighest, marginTop: 8}]}>
      <View style={[{height: '100%', borderRadius: 3, width: percent > 0 ? `${percent}%` : '0%', backgroundColor: percent > 0 ? color : colors.onSurfaceVariant}]} />
    </View>
  </View>
);

const telStyles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  barBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 64, borderBottomWidth: 0.5 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, textTransform: 'uppercase', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { position: 'relative', padding: 8, borderRadius: 20 },
  scrollContent: { paddingBottom: 20 },
  heroSection: { padding: 16, alignItems: 'center' },
  heroImageContainer: { width: '100%', alignItems: 'center', marginBottom: 20, height: 215 },
  heroImage: { width: '100%', height: '100%', zIndex: 10 },
  podiumGlow: { position: 'absolute', bottom: 0, width: 280, height: 34, borderRadius: 100 },
  podiumRing: { position: 'absolute', bottom: -10, width: 310, height: 44, borderRadius: 155, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  podiumInnerRing: { width: 250, height: 28, borderRadius: 125, borderWidth: 1 },
  specsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', borderBottomWidth: 1, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  motoName: { fontSize: 22, textTransform: 'uppercase' },
  yearBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  yearText: { fontSize: 12 },
  plateText: { fontSize: 12, marginTop: 4 },
  statusLabel: { fontSize: 10, textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 12 },
  statsGrid: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 },
  statCard: { flex: 1, borderWidth: 0.5, borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 20 },
  statUnit: { fontSize: 12 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20 },
  sectionSubtitle: { fontSize: 12 },
  badgeSys: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeSysText: { fontSize: 10 },
  manualContainer: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  manualRow: { padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pdfIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  openBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  fab: { position: 'absolute', bottom: 100, right: 24, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 28, padding: 24, width: '92%', borderWidth: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16 },
  modalInput: { flex: 1, height: 48, fontSize: 16, fontFamily: 'Montserrat_700Bold', marginLeft: 8 },
  saveBtn: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});






