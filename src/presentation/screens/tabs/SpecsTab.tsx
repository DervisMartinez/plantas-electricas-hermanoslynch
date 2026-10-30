import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { getMotoSpecs, MotoSpecs } from '../../../data/specs';
import { MOTO_CATALOG, VEHICLE_CATALOG } from '../../../data/catalog';
import { isCar, isPlanta } from '../../../domain/entities/Moto';

interface SpecsTabProps {
  onNavigateToServices?: () => void;
}

export const SpecsTab: React.FC<SpecsTabProps> = ({ onNavigateToServices }) => {
  const { colors, mode } = useTheme();
  const { myMoto } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 920;
  const isDark = mode === 'dark';

  const [activeCategory, setActiveCategory] = useState<'all' | 'engine' | 'transmission' | 'chassis' | 'fluids'>('all');

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const specs = useMemo(() => {
    if (!myMoto) return null;
    return getMotoSpecs(myMoto.brand, myMoto.model);
  }, [myMoto]);

  // Image of active moto
  const imageSource = useMemo(() => {
    if (!myMoto) return null;
    if (myMoto.imageUrl && myMoto.imageUrl.trim() !== '') {
      return { uri: myMoto.imageUrl };
    }
    if (myMoto.catalogImageRes) {
      return myMoto.catalogImageRes;
    }
    const cat = VEHICLE_CATALOG.find(
      (m) => m.brand.toLowerCase() === myMoto.brand.toLowerCase() && m.model.toLowerCase() === myMoto.model.toLowerCase()
    ) || VEHICLE_CATALOG.find(
      (m) => m.brand.toLowerCase() === myMoto.brand.toLowerCase()
    );
    if (cat?.imageRes) return cat.imageRes;
    return null;
  }, [myMoto]);

  if (!myMoto) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <MaterialIcons name="directions-car" size={60} color={colors.onSurfaceVariant} />
        <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18, marginTop: 16 }}>
          No hay vehículo activo
        </Text>
      </View>
    );
  }

  const specCategories = [
    { id: 'all' as const, label: 'TODAS LAS ESPECIFICACIONES', icon: 'tune' },
    { id: 'engine' as const, label: 'MOTOR Y POTENCIA', icon: 'speed' },
    { id: 'transmission' as const, label: 'TRANSMISIÓN Y EMBRAGUE', icon: 'settings' },
    { id: 'chassis' as const, label: 'FRENOS Y CAUCHOS', icon: 'album' },
    { id: 'fluids' as const, label: 'FLUIDOS Y CAPACIDADES', icon: 'opacity' },
  ];

  const SpecRow = ({ label, value, icon, color = colors.onSurface, unit }: { label: string; value?: string; icon: string; color?: string; unit?: string }) => {
    if (!value) return null;
    return (
      <View style={[styles.specRowItem, { borderBottomColor: isDark ? 'rgba(64, 72, 92, 0.25)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
          <View style={[styles.specIconBubble, { backgroundColor: isDark ? 'rgba(65, 105, 225, 0.12)' : 'rgba(39, 95, 227, 0.08)' }]}>
            <MaterialIcons name={icon as any} size={16} color="#4169E1" />
          </View>
          <Text style={[styles.specLabelText, { color: colors.onSurfaceVariant }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.specValueText, { color }]}>
          {value} {unit && <Text style={{ fontSize: 11, color: '#00e3fd' }}>{unit}</Text>}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. TOP HERO BANNER (Directly inspired by Yamaha reference image 2) */}
      <View style={styles.topBannerContainer}>
        <LinearGradient
          colors={isDark ? ['#0b111c', '#111520', '#161d2d'] : ['#e9f0fc', '#f2f6fd', '#e0ecfa']}
          style={[styles.bannerGradient, { paddingHorizontal: windowWidth < 600 ? 16 : 32 }]}
        >
          {/* Subtle Watermark */}
          <Text style={{
            position: 'absolute',
            right: '5%',
            top: '10%',
            fontSize: windowWidth < 600 ? 56 : 110,
            fontFamily: F.extrabold,
            color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
            letterSpacing: 6,
            textTransform: 'uppercase',
            zIndex: 0,
          }}>
            {myMoto.brand}
          </Text>

          <View style={[
            styles.bannerContentRow, 
            { 
              maxWidth: 1240, 
              width: '100%', 
              alignSelf: 'center',
              flexDirection: windowWidth < 840 ? 'column' : 'row',
              alignItems: windowWidth < 840 ? 'flex-start' : 'center',
              gap: windowWidth < 840 ? 18 : 32,
            }
          ]}>
            <View style={{ flex: 1.2 }}>
              <View style={styles.bannerBadge}>
                <MaterialCommunityIcons name="shield-check" size={16} color="#00e3fd" />
                <Text style={styles.bannerBadgeText}>MANUAL DE SERVICIO & INGENIERÍA</Text>
              </View>

              <Text style={[styles.bannerTitle, { color: isDark ? '#ffffff' : '#111319' }]}>
                {myMoto.brand.toUpperCase()}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: '#00e3fd' }]}>
                {myMoto.model.toUpperCase()} {myMoto.year ? `• AÑO ${myMoto.year}` : ''}
              </Text>

              <Text style={[styles.bannerDesc, { color: colors.onSurfaceVariant }]}>
                Tolerancias de fábrica, capacidades volumétricas y especificaciones técnicas oficiales para diagnóstico, mantenimiento preventivo y reparación.
              </Text>
            </View>

            {/* Quick Hero Specs Card */}
            <View style={[styles.bannerMiniStatsCard, { 
              backgroundColor: isDark ? 'rgba(25, 28, 33, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: isDark ? 'rgba(64, 72, 92, 0.4)' : '#d0d4dc',
              width: windowWidth < 840 ? '100%' : 'auto',
              justifyContent: windowWidth < 840 ? 'space-around' : 'flex-start',
              paddingHorizontal: windowWidth < 480 ? 12 : 24,
            }]}>
              <View style={styles.statMiniBox}>
                <Text style={styles.statMiniLabel}>{isPlanta(myMoto) ? 'STANDBY' : 'CILINDRADA'}</Text>
                <Text style={[styles.statMiniVal, { color: '#00e3fd' }]}>
                  {isPlanta(myMoto) ? `${myMoto.powerKva || 35} kVA` : (specs?.displacement || '150 cc')}
                </Text>
              </View>
              <View style={styles.statMiniDivider} />
              <View style={styles.statMiniBox}>
                <Text style={styles.statMiniLabel}>{isPlanta(myMoto) ? 'POTENCIA' : 'POTENCIA'}</Text>
                <Text style={[styles.statMiniVal, { color: '#4169E1' }]}>
                  {isPlanta(myMoto) ? `${myMoto.powerKw || 28} kW` : (specs?.hp ? specs.hp.split('@')[0].trim() : '11.5 HP')}
                </Text>
              </View>
              <View style={styles.statMiniDivider} />
              <View style={styles.statMiniBox}>
                <Text style={styles.statMiniLabel}>{isPlanta(myMoto) ? 'SISTEMA' : 'PESO EN SECO'}</Text>
                <Text style={[styles.statMiniVal, { color: colors.onSurface }]}>
                  {isPlanta(myMoto) ? (myMoto.systemVoltage || '24V DC') : (specs?.weight || '120 kg')}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 2. CATEGORY PILLS BAR */}
      <View style={[styles.categoryBar, { maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: windowWidth < 600 ? 16 : 32 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 14 }}>
          {specCategories.map((cat) => {
            const isSel = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryPill,
                  { 
                    backgroundColor: isSel ? '#4169E1' : (isDark ? '#191c21' : '#ececf0'),
                    borderColor: isSel ? '#4169E1' : (isDark ? 'rgba(64, 72, 92, 0.4)' : '#d0d4dc'),
                  }
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons 
                  name={cat.icon as any} 
                  size={15} 
                  color={isSel ? '#ffffff' : colors.onSurfaceVariant} 
                />
                <Text style={[
                  styles.categoryPillText, 
                  { 
                    color: isSel ? '#ffffff' : colors.onSurfaceVariant,
                    fontFamily: isSel ? F.bold : F.semibold
                  }
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. MAIN SPLIT CONTENT (Like Yamaha reference image 2: Left technical details + Right photo card) */}
      <View style={[
        styles.mainSplitLayout, 
        { 
          maxWidth: 1240, 
          width: '100%', 
          alignSelf: 'center', 
          flexDirection: isDesktop ? 'row' : 'column',
          paddingHorizontal: windowWidth < 600 ? 16 : 32,
        }
      ]}>
        
        {/* LEFT COLUMN: TECHNICAL BREAKDOWN SECTIONS */}
        <View style={{ flex: 1.4, gap: 20 }}>
          
          {/* SECTION 1: MOTOR Y POTENCIA */}
          {(activeCategory === 'all' || activeCategory === 'engine') && (
            <View style={[styles.specsBlockCard, { 
              backgroundColor: isDark ? '#191c21' : '#ffffff',
              borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'
            }]}>
              <View style={styles.blockHeader}>
                <View style={[styles.blockHeaderBadge, { backgroundColor: 'rgba(0, 227, 253, 0.15)' }]}>
                  <MaterialIcons name="speed" size={18} color="#00e3fd" />
                </View>
                <Text style={[styles.blockTitle, { color: colors.onSurface }]}>
                  Motor, Potencia & Rendimiento
                </Text>
              </View>

              <View style={styles.specRowsList}>
                <SpecRow label="Tipo de Motor" value={specs?.engineType || 'Monocilíndrico 4T, árbol de levas en culata'} icon="info" />
                <SpecRow label="Cilindrada Exacta" value={specs?.displacement || '149 cc'} icon="straighten" color="#00e3fd" />
                <SpecRow label="Potencia Máxima" value={specs?.hp || '11.5 HP @ 8500 RPM'} icon="flash-on" color="#4169E1" />
                <SpecRow label="Torque / Par Motor" value={specs?.torque || '10.0 Nm @ 7500 RPM'} icon="rotate-right" />
                <SpecRow label="Sistema de Refrigeración" value={specs?.cooling || 'Enfriamiento por aire natural'} icon="ac-unit" />
                <SpecRow label="Bujía Recomendada" value={specs?.sparkPlug || 'NGK D8EA (Luz electrodo: 0.7mm)'} icon="offline-bolt" />
              </View>
            </View>
          )}

          {/* SECTION 2: TRANSMISIÓN Y TRACCIÓN */}
          {(activeCategory === 'all' || activeCategory === 'transmission') && (
            <View style={[styles.specsBlockCard, { 
              backgroundColor: isDark ? '#191c21' : '#ffffff',
              borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'
            }]}>
              <View style={styles.blockHeader}>
                <View style={[styles.blockHeaderBadge, { backgroundColor: 'rgba(65, 105, 225, 0.15)' }]}>
                  <MaterialCommunityIcons name="cog" size={18} color="#4169E1" />
                </View>
                <Text style={[styles.blockTitle, { color: colors.onSurface }]}>
                  Transmisión & Embrague
                </Text>
              </View>

              <View style={styles.specRowsList}>
                <SpecRow label="Caja de Cambios" value={specs?.transmission || '5 Velocidades sincronizadas'} icon="settings" />
                {specs?.timingBeltType ? (
                  <>
                    <SpecRow label="Correa de Distribución (Tiempo)" value={specs.timingBeltType} icon="sync" color="#FF453A" />
                    <SpecRow label="Intervalo Reemplazo Correa" value={specs.maintenanceIntervalTimingBelt || 'Cada 40.000 - 50.000 km'} icon="schedule" color="#FF9500" />
                  </>
                ) : (
                  <>
                    <SpecRow label="Cadena de Transmisión" value={specs?.chainType || 'Paso 428H reforzada'} icon="link" />
                    <SpecRow label="Intervalo de Tensión y Lubricación" value="Cada 500 - 1,000 km" icon="schedule" />
                  </>
                )}
              </View>
            </View>
          )}

          {/* SECTION 3: FRENOS, CHASIS Y NEUMÁTICOS */}
          {(activeCategory === 'all' || activeCategory === 'chassis') && (
            <View style={[styles.specsBlockCard, { 
              backgroundColor: isDark ? '#191c21' : '#ffffff',
              borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'
            }]}>
              <View style={styles.blockHeader}>
                <View style={[styles.blockHeaderBadge, { backgroundColor: 'rgba(255, 183, 3, 0.15)' }]}>
                  <MaterialCommunityIcons name="disc-alert" size={18} color="#ffb703" />
                </View>
                <Text style={[styles.blockTitle, { color: colors.onSurface }]}>
                  Frenos, Chasis & Neumáticos
                </Text>
              </View>

              <View style={styles.specRowsList}>
                <SpecRow label="Freno Delantero" value={specs?.brakesFront || 'Disco hidráulico ventilado'} icon="lens" color="#00ae78" />
                <SpecRow label="Freno Trasero" value={specs?.brakesRear || 'Disco / Tambor'} icon="adjust" />
                <SpecRow label="Neumático Delantero (Medida)" value={specs?.frontTireSize || '195/55 R15'} icon="radio-button-checked" />
                <SpecRow label="Presión Inflado Delantero (Frío)" value={specs?.frontTirePressure || '30 PSI'} icon="compress" color="#00e3fd" />
                <SpecRow label="Neumático Trasero (Medida)" value={specs?.rearTireSize || '195/55 R15'} icon="radio-button-checked" />
                <SpecRow label="Presión Inflado Trasero (Frío)" value={specs?.rearTirePressure || '32 PSI'} icon="compress" color="#00e3fd" />
                {specs?.suspensionFront && (
                  <SpecRow label="Suspensión Delantera" value={specs.suspensionFront} icon="build" />
                )}
                {specs?.suspensionRear && (
                  <SpecRow label="Suspensión Trasera" value={specs.suspensionRear} icon="build" />
                )}
                <SpecRow label="Peso en Seco Oficial" value={specs?.weight || '1.250 kg'} icon="fitness-center" />
              </View>
            </View>
          )}

          {/* SECTION 4: CAPACIDADES, FLUIDOS Y MANTENIMIENTO */}
          {(activeCategory === 'all' || activeCategory === 'fluids') && (
            <View style={[styles.specsBlockCard, { 
              backgroundColor: isDark ? '#191c21' : '#ffffff',
              borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'
            }]}>
              <View style={styles.blockHeader}>
                <View style={[styles.blockHeaderBadge, { backgroundColor: 'rgba(0, 174, 120, 0.15)' }]}>
                  <MaterialIcons name="opacity" size={18} color="#00ae78" />
                </View>
                <Text style={[styles.blockTitle, { color: colors.onSurface }]}>
                  Fluidos, Capacidades & Mantenimiento
                </Text>
              </View>

              <View style={styles.specRowsList}>
                <SpecRow label="Capacidad de Combustible" value={specs?.fuelCapacity || '60 Litros'} icon="local-gas-station" color="#00e3fd" />
                <SpecRow label="Capacidad de Aceite de Motor" value={specs?.oilCapacity || '4.0 Litros'} icon="water-drop" color="#00ae78" />
                <SpecRow label="Tipo y Grado de Aceite Recomendado" value={specs?.oilTypeRecommended || '10W-30 / 15W-40'} icon="verified" color="#4169E1" />
                {specs?.coolantCapacity && (
                  <SpecRow label="Refrigerante / Anticongelante" value={specs.coolantCapacity} icon="invert-colors" color="#00e3fd" />
                )}
                <SpecRow label="Intervalo Recomendado de Aceite" value={specs?.maintenanceIntervalOil || 'Cada 5,000 km'} icon="update" />
                <SpecRow label="Batería / Sistema Eléctrico" value={specs?.battery || '12V 60Ah'} icon="battery-charging-full" />
                {specs?.dimensions && (
                  <SpecRow label="Dimensiones Oficiales" value={specs.dimensions} icon="straighten" />
                )}
                {specs?.trunkCapacity && (
                  <SpecRow label="Capacidad de Maletero / Baúl" value={specs.trunkCapacity} icon="luggage" />
                )}
                {specs?.equipment && (
                  <SpecRow label="Equipamiento" value={specs.equipment} icon="star" color="#FFD60A" />
                )}
              </View>
            </View>
          )}

        </View>

        {/* RIGHT COLUMN: TECHNICAL PHOTO SHOWCASE & HOMOLOGATION BADGE (Direct match of image 2) */}
        <View style={{ flex: 1, gap: 20 }}>
          
          {/* PHOTO SHOWCASE CARD */}
          <View style={[styles.photoShowcaseCard, { 
            backgroundColor: isDark ? '#191c21' : '#ffffff',
            borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'
          }]}>
            <View style={styles.photoShowcaseHeader}>
              <Text style={[styles.photoShowcaseTitle, { color: colors.onSurface }]}>
                {myMoto.brand.toUpperCase()} {myMoto.model.toUpperCase()}
              </Text>
              <View style={styles.statusLivePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN REGLA</Text>
              </View>
            </View>

            <View style={styles.bikeImageWrapper}>
              {imageSource ? (
                <Image source={imageSource} style={styles.bikeImageShowcase} resizeMode="contain" />
              ) : (
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="two-wheeler" size={100} color="#4169E1" />
                </View>
              )}
            </View>

            <View style={[styles.factorySpecsFooter, { borderTopColor: isDark ? 'rgba(64, 72, 92, 0.3)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={styles.factorySpecCol}>
                <Text style={styles.factoryLabel}>ODÓMETRO ACTUAL</Text>
                <Text style={[styles.factoryValue, { color: colors.onSurface }]}>
                  {myMoto.currentOdometer.toLocaleString()} km
                </Text>
              </View>

              <View style={styles.factorySpecCol}>
                <Text style={styles.factoryLabel}>ACEITE RECOMENDADO</Text>
                <Text style={[styles.factoryValue, { color: '#00e3fd' }]}>
                  {specs?.oilTypeRecommended ? specs.oilTypeRecommended.split(' ')[0] : '20W-50'}
                </Text>
              </View>
            </View>
          </View>

          {/* HOMOLOGATION & ENGINEERING CERTIFICATE CARD */}
          <View style={[styles.engineeringCertCard, { 
            backgroundColor: isDark ? 'rgba(29, 32, 37, 0.85)' : '#ffffff',
            borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <MaterialCommunityIcons name="certificate" size={24} color="#00e3fd" />
              <View>
                <Text style={[styles.certTitle, { color: colors.onSurface }]}>Ficha Homologada</Text>
                <Text style={[styles.certSubtitle, { color: colors.onSurfaceVariant }]}>GARAGE Motor Data Engine v1.0</Text>
              </View>
            </View>

            <Text style={[styles.certDesc, { color: colors.onSurfaceVariant }]}>
              Los parámetros de lubricación, presión de inflado en frío y ciclo de servicio han sido contrastados con los manuales de ensamble para garantizar el máximo rendimiento del motor y extender la vida útil de los componentes.
            </Text>

            {onNavigateToServices && (
              <TouchableOpacity
                style={styles.actionServicesBtn}
                onPress={onNavigateToServices}
                activeOpacity={0.8}
              >
                <MaterialIcons name="build" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.actionServicesBtnText}>Ver Historial de Mantenimientos</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  topBannerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  bannerGradient: {
    paddingVertical: 36,
    paddingHorizontal: 32,
    position: 'relative',
  },
  bannerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
    flexWrap: 'wrap',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 227, 253, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  bannerBadgeText: {
    color: '#00e3fd',
    fontSize: 10.5,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.5,
  },
  bannerTitle: {
    fontSize: 38,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  bannerSubtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  bannerDesc: {
    fontSize: 13.5,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 20,
    maxWidth: 580,
  },
  bannerMiniStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 20,
  },
  statMiniBox: {
    alignItems: 'center',
  },
  statMiniLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#8ca9ff',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statMiniVal: {
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  statMiniDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(64, 72, 92, 0.4)',
  },
  categoryBar: {
    paddingHorizontal: 32,
    marginTop: 6,
    marginBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  mainSplitLayout: {
    paddingHorizontal: 32,
    gap: 28,
  },
  specsBlockCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  blockHeaderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  specRowsList: {
    gap: 2,
  },
  specRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  specIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  specLabelText: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_500Medium',
  },
  specValueText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'right',
  },
  photoShowcaseCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
  },
  photoShowcaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoShowcaseTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 0.5,
  },
  statusLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 174, 120, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ae78',
  },
  liveText: {
    color: '#00ae78',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  bikeImageWrapper: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeImageShowcase: {
    width: '100%',
    height: '100%',
  },
  factorySpecsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 12,
  },
  factorySpecCol: {
    gap: 4,
  },
  factoryLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#8ca9ff',
    letterSpacing: 0.8,
  },
  factoryValue: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  engineeringCertCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
  },
  certTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
  },
  certSubtitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  certDesc: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 18,
    marginBottom: 18,
  },
  actionServicesBtn: {
    backgroundColor: '#4169E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionServicesBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
});
