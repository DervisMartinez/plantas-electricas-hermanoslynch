import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { MOTO_CATALOG, VEHICLE_CATALOG } from '../../../data/catalog';
import { isCar, isPlanta } from '../../../domain/entities/Moto';
import { calculateWearPercentage } from '../../../constants/telemetry';

interface WebVehicleHeroProps {
  onOpenSpecs: () => void;
  onOpenStats: () => void;
  onOpenQuickOdo: () => void;
  onOpenQuickFuel: () => void;
  onScrollToTelemetry: () => void;
  onOpenInspection?: () => void;
  onOpenServicesTab?: () => void;
  onOpenReport?: () => void;
}

export const WebVehicleHero: React.FC<WebVehicleHeroProps> = ({
  onOpenSpecs,
  onOpenStats,
  onOpenQuickOdo,
  onOpenQuickFuel,
  onScrollToTelemetry,
  onOpenInspection,
  onOpenServicesTab,
  onOpenReport,
}) => {
  const { colors, mode } = useTheme();
  const { myMoto, motos, selectMoto, records } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const isDark = mode === 'dark';
  const isMobile = windowWidth < 900;
  const isSmallPhone = windowWidth < 500;

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Find image of active moto
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
    );
    if (cat?.imageRes) return cat.imageRes;
    // First catalog fallback if brand matches
    const brandCat = VEHICLE_CATALOG.find(
      (m) => m.brand.toLowerCase() === myMoto.brand.toLowerCase()
    );
    return brandCat?.imageRes || null;
  }, [myMoto]);

  // Index of active moto in motos list
  const activeIndex = useMemo(() => {
    if (!myMoto || !motos.length) return 0;
    const idx = motos.findIndex((m) => m.id === myMoto.id);
    return idx >= 0 ? idx : 0;
  }, [myMoto, motos]);

  const handlePrevMoto = () => {
    if (motos.length <= 1) return;
    const prevIdx = (activeIndex - 1 + motos.length) % motos.length;
    selectMoto(motos[prevIdx].id);
  };

  const handleNextMoto = () => {
    if (motos.length <= 1) return;
    const nextIdx = (activeIndex + 1) % motos.length;
    selectMoto(motos[nextIdx].id);
  };

  const prevMotoName = motos.length > 1 ? `${motos[(activeIndex - 1 + motos.length) % motos.length].brand} ${motos[(activeIndex - 1 + motos.length) % motos.length].model}` : '';
  const nextMotoName = motos.length > 1 ? `${motos[(activeIndex + 1) % motos.length].brand} ${motos[(activeIndex + 1) % motos.length].model}` : '';

  const isOilConfigured = useMemo(() => {
    if (!myMoto) return false;
    if (myMoto.isFromAgency) return true;
    return records.some((r) => r.type === 'oil');
  }, [myMoto, records]);

  // Oil telemetry calculation
  const oilWear = useMemo(() => {
    if (!myMoto) return 100;
    const oilRecords = records.filter((r) => r.type === 'oil');
    if (!isOilConfigured) {
      return 0;
    }
    const lastOilOdo = oilRecords.length > 0 ? Math.max(...oilRecords.map((r) => r.odometer)) : 0;
    return calculateWearPercentage(myMoto.currentOdometer, lastOilOdo, 'oil', undefined, isCar(myMoto));
  }, [myMoto, records, isOilConfigured]);

  if (!myMoto) return null;

  return (
    <View style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
      <LinearGradient
        colors={isDark ? ['#111319', '#141a29', '#0f1218'] : ['#f0f4fa', '#e4ecf8', '#edf2fa']}
        style={[
          styles.heroContainer, 
          { 
            paddingHorizontal: isSmallPhone ? 14 : (isMobile ? 20 : (windowWidth < 1200 ? 28 : 40)),
            minHeight: isMobile ? 'auto' : (windowWidth < 1200 ? 520 : 600),
            paddingTop: isMobile ? 18 : 36,
            paddingBottom: isMobile ? 20 : 28,
          }
        ]}
      >
        {/* ATMOSPHERIC BACKGROUND RADIAL GLOW */}
        <View style={{
          position: 'absolute',
          top: isMobile ? '5%' : '15%',
          left: isMobile ? '10%' : '25%',
          width: isMobile ? 350 : 700,
          height: isMobile ? 280 : 520,
          borderRadius: 350,
          backgroundColor: isDark ? 'rgba(65, 105, 225, 0.14)' : 'rgba(39, 95, 227, 0.09)',
          pointerEvents: 'none',
          zIndex: 1,
        } as any} />

        {/* WATERMARK TEXT (Like "2024" in Yamaha reference image) */}
        <Text style={{
          position: 'absolute',
          top: isMobile ? '4%' : '10%',
          left: isMobile ? '4%' : '8%',
          fontSize: isSmallPhone ? 64 : (isMobile ? 96 : 180),
          fontFamily: F.extrabold,
          color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.035)',
          zIndex: 1,
          letterSpacing: isMobile ? 4 : 8,
        }}>
          {myMoto.year || '2024'}
        </Text>

        {/* HERO MAIN CONTENT: DESKTOP (ROW) VS MOBILE WEB (RESPONSIVE COLUMN) */}
        <View style={[
          styles.heroContentRow, 
          { 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 16 : (windowWidth < 1200 ? 16 : 24),
            alignItems: 'center',
          }
        ]}>
          
          {/* DESKTOP PREV ARROW (hidden on mobile, mobile uses clean inline switcher) */}
          {!isMobile && (
            <TouchableOpacity
              style={[styles.carouselArrowBtn, { 
                backgroundColor: isDark ? 'rgba(25, 28, 33, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                borderColor: isDark ? 'rgba(64, 72, 92, 0.4)' : 'rgba(0, 0, 0, 0.1)',
                opacity: motos.length > 1 ? 1 : 0.3
              }]}
              onPress={handlePrevMoto}
              disabled={motos.length <= 1}
              activeOpacity={0.8}
              accessibilityLabel="Moto anterior"
            >
              <MaterialIcons name="chevron-left" size={32} color={colors.onSurface} />
            </TouchableOpacity>
          )}

          {/* MOTORCYCLE SHOWCASE WITH SOFT SHADOW & 3D INSPECTION */}
          <View style={[
            styles.bikeShowcaseContainer,
            {
              width: '100%',
              minHeight: isSmallPhone ? 200 : (isMobile ? 260 : 420),
            }
          ]}>
            <TouchableOpacity 
              style={{ width: '100%', alignItems: 'center' }}
              onPress={onOpenInspection}
              activeOpacity={0.9}
              accessibilityLabel="Abrir inspección interactiva 3D"
            >
              {imageSource ? (
                <Image
                  source={imageSource}
                  style={[
                    styles.bikeImage, 
                    { 
                      height: isSmallPhone ? 180 : (isMobile ? 240 : (windowWidth < 1340 ? 330 : 400)),
                      maxHeight: isSmallPhone ? 190 : 400,
                    }
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.bikePlaceholder, { height: isMobile ? 220 : 330 }]}>
                  <MaterialIcons name={isCar(myMoto) ? "directions-car" : "two-wheeler"} size={isMobile ? 80 : 130} color="#4169E1" />
                  <Text style={[styles.bikePlaceholderText, { color: colors.onSurfaceVariant }]}>
                    {myMoto.brand} {myMoto.model}
                  </Text>
                </View>
              )}

              {/* FLOATING 3D INSPECTION BADGE */}
              <View style={{
                position: 'absolute',
                top: 4,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: isDark ? 'rgba(17, 25, 40, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 0.8,
                borderColor: '#00e3fd',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6,
                zIndex: 10,
              }}>
                <MaterialIcons name="3d-rotation" size={14} color="#00e3fd" />
                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: isDark ? '#ffffff' : '#111319', letterSpacing: 0.5 }}>
                  TOCA PARA INSPECCIONAR EN 3D
                </Text>
              </View>

              {/* SOFT REALISTIC GROUND CONTACT SHADOW */}
              <View style={{
                width: isMobile ? '70%' : '75%',
                height: 10,
                marginHorizontal: 'auto',
                marginTop: isMobile ? -8 : -14,
                borderRadius: 100,
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.16)',
                filter: 'blur(8px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
              } as any} />
            </TouchableOpacity>

            {/* MOBILE QUICK CAROUSEL SWITCHER (When user has multiple motos) */}
            {isMobile && motos.length > 1 && (
              <View style={styles.mobileCarouselRow}>
                <TouchableOpacity 
                  style={[styles.mobileArrowBtn, { borderColor: isDark ? '#40485c' : '#d0d4dc' }]} 
                  onPress={handlePrevMoto}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.onSurface} />
                </TouchableOpacity>
                <Text style={[styles.mobileCounterText, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                  {activeIndex + 1} de {motos.length}
                </Text>
                <TouchableOpacity 
                  style={[styles.mobileArrowBtn, { borderColor: isDark ? '#40485c' : '#d0d4dc' }]} 
                  onPress={handleNextMoto}
                >
                  <MaterialIcons name="chevron-right" size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* VEHICLE TITLE, TELEMETRY SPECS & CTA BUTTONS */}
          <View style={[
            styles.heroInfoBlock, 
            { 
              maxWidth: isMobile ? '100%' : (windowWidth < 1200 ? 350 : 420),
              width: isMobile ? '100%' : 'auto',
              paddingLeft: isMobile ? 0 : (windowWidth < 1200 ? 6 : 12),
            }
          ]}>
            
            {/* BRAND & MODEL HEADLINE */}
            <View style={styles.brandBadgeRow}>
              <View style={styles.brandPill}>
                <Text style={styles.brandPillText}>{myMoto.brand.toUpperCase()}</Text>
              </View>
              {myMoto.year && (
                <Text style={[styles.yearText, { color: colors.onSurfaceVariant }]}>
                  MOD. {myMoto.year}
                </Text>
              )}
            </View>

            <Text style={[
              styles.modelHeading, 
              { 
                color: colors.onSurface, 
                fontSize: isSmallPhone ? 24 : (isMobile ? 28 : (windowWidth < 1200 ? 30 : 36)), 
                lineHeight: isSmallPhone ? 28 : (isMobile ? 32 : (windowWidth < 1200 ? 34 : 40)), 
                marginBottom: isMobile ? 12 : 20 
              }
            ]}>
              {myMoto.model.toUpperCase()}
            </Text>

            {/* TELEMETRY READINGS */}
            <View style={[
              styles.telemetryQuickSpecs, 
              { 
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12, 
                marginBottom: isMobile ? 16 : 24,
                width: '100%',
              }
            ]}>
              <View style={[styles.telemetrySpecItem, { flex: 1 }]}>
                <Text style={[styles.specLabel, { color: colors.onSurfaceVariant }]}>{isPlanta(myMoto) ? 'HORÓMETRO TOTAL' : 'ODÓMETRO TOTAL'}</Text>
                <Text style={[styles.specValueMain, { color: isDark ? '#ffffff' : '#111319', fontSize: isSmallPhone ? 18 : 22 }]}>
                  {myMoto.currentOdometer.toLocaleString()}{' '}
                  <Text style={{ fontSize: isSmallPhone ? 13 : 15, color: '#00e3fd' }}>{isPlanta(myMoto) ? 'HRS' : 'KM'}</Text>
                </Text>
              </View>

              <View style={[styles.telemetrySpecItem, { flex: 1 }]}>
                <Text style={[styles.specLabel, { color: colors.onSurfaceVariant }]}>SALUD DE ACEITE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!isOilConfigured ? (
                    <TouchableOpacity
                      onPress={onOpenServicesTab || onScrollToTelemetry}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.specValueMain, { color: '#ff9500', fontSize: isSmallPhone ? 18 : 22 }]}>
                        0%
                      </Text>
                      <View style={[styles.healthBadge, {
                        backgroundColor: 'rgba(255, 149, 0, 0.15)',
                        borderColor: '#ff9500',
                      }]}>
                        <Text style={[styles.healthBadgeText, { color: '#ff9500', fontSize: 8.5 }]}>
                          AJUSTAR
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Text style={[
                        styles.specValueMain, 
                        { 
                          color: oilWear > 40 ? '#00ae78' : (oilWear > 15 ? '#ffb703' : '#ba1a1a'),
                          fontSize: isSmallPhone ? 18 : 22,
                        }
                      ]}>
                        {oilWear}%
                      </Text>
                      <View style={[styles.healthBadge, {
                        backgroundColor: oilWear > 40 ? 'rgba(0, 174, 120, 0.15)' : (oilWear > 15 ? 'rgba(255, 183, 3, 0.15)' : 'rgba(186, 26, 26, 0.15)'),
                        borderColor: oilWear > 40 ? '#00ae78' : (oilWear > 15 ? '#ffb703' : '#ba1a1a'),
                      }]}>
                        <Text style={[styles.healthBadgeText, {
                          color: oilWear > 40 ? '#00ae78' : (oilWear > 15 ? '#ffb703' : '#ffb4ab'),
                          fontSize: 8.5,
                        }]}>
                          {oilWear > 40 ? 'ÓPTIMO' : (oilWear > 15 ? 'ATENCIÓN' : 'CAMBIO')}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={[
              styles.ctaButtonGroup, 
              { 
                flexDirection: isSmallPhone ? 'column' : 'row',
                width: '100%',
                gap: 10,
              }
            ]}>
              <TouchableOpacity
                style={[
                  styles.primaryCtaBtn, 
                  { 
                    flex: isSmallPhone ? undefined : 1,
                    width: isSmallPhone ? '100%' : 'auto',
                    minHeight: 46,
                    borderColor: isDark ? '#ffffff' : '#111319',
                  }
                ]}
                onPress={onOpenQuickOdo}
                activeOpacity={0.8}
              >
                <MaterialIcons name="speed" size={17} color={isDark ? '#ffffff' : '#111319'} style={{ marginRight: 8 }} />
                <Text style={[styles.primaryCtaText, { color: isDark ? '#ffffff' : '#111319' }]}>
                  {isPlanta(myMoto) ? 'ACTUALIZAR HORAS' : 'ACTUALIZAR KM'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryCtaBtn, 
                  { 
                    flex: isSmallPhone ? undefined : 1,
                    width: isSmallPhone ? '100%' : 'auto',
                    minHeight: 46,
                  }
                ]}
                onPress={onOpenQuickFuel}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="gas-station" size={17} color="#00e3fd" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryCtaText}>{isPlanta(myMoto) ? 'CARGAR DIÉSEL' : 'CARGAR GASOLINA'}</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* DESKTOP NEXT ARROW */}
          {!isMobile && (
            <TouchableOpacity
              style={[styles.carouselArrowBtn, { 
                backgroundColor: isDark ? 'rgba(25, 28, 33, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                borderColor: isDark ? 'rgba(64, 72, 92, 0.4)' : 'rgba(0, 0, 0, 0.1)',
                opacity: motos.length > 1 ? 1 : 0.3
              }]}
              onPress={handleNextMoto}
              disabled={motos.length <= 1}
              activeOpacity={0.8}
              accessibilityLabel="Moto siguiente"
            >
              <MaterialIcons name="chevron-right" size={32} color={colors.onSurface} />
            </TouchableOpacity>
          )}

        </View>

        {/* BOTTOM SUB-NAVIGATION PILLS (No SOS tab) */}
        <View style={[
          styles.subPillsRow, 
          { 
            justifyContent: isMobile ? 'center' : 'flex-start', 
            marginTop: isSmallPhone ? 16 : (isMobile ? 18 : 0),
            gap: isSmallPhone ? 8 : 10,
          }
        ]}>
          {onOpenInspection && (
            <TouchableOpacity
              style={[styles.subPill, { 
                borderColor: '#00e3fd', 
                backgroundColor: isDark ? 'rgba(0, 227, 253, 0.12)' : 'rgba(0, 227, 253, 0.08)',
                paddingHorizontal: isSmallPhone ? 10 : 14,
              }]}
              onPress={onOpenInspection}
              activeOpacity={0.8}
            >
              <MaterialIcons name="3d-rotation" size={14} color="#00e3fd" style={{ marginRight: 6 }} />
              <Text style={[styles.subPillText, { color: '#00e3fd', fontFamily: F.bold, fontSize: isSmallPhone ? 10 : 10.5 }]}>+ INSPECCIÓN 3D</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.subPill, { 
              borderColor: isDark ? 'rgba(64, 72, 92, 0.5)' : '#d0d4dc',
              paddingHorizontal: isSmallPhone ? 10 : 14,
            }]}
            onPress={onScrollToTelemetry}
            activeOpacity={0.8}
          >
            <Text style={[styles.subPillText, { color: colors.onSurface, fontSize: isSmallPhone ? 10 : 10.5 }]}>+ TELEMETRÍA Y DESGASTE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subPill, { 
              borderColor: isDark ? 'rgba(64, 72, 92, 0.5)' : '#d0d4dc',
              paddingHorizontal: isSmallPhone ? 10 : 14,
            }]}
            onPress={onOpenSpecs}
            activeOpacity={0.8}
          >
            <Text style={[styles.subPillText, { color: colors.onSurface, fontSize: isSmallPhone ? 10 : 10.5 }]}>+ FICHA TÉCNICA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subPill, { borderColor: isDark ? 'rgba(64, 72, 92, 0.5)' : '#d0d4dc' }]}
            onPress={onOpenStats}
            activeOpacity={0.8}
          >
            <Text style={[styles.subPillText, { color: colors.onSurface }]}>+ CALENDARIO Y GASTOS</Text>
          </TouchableOpacity>

          {/* REPORTE EXPEDIENTE PDF */}
          <TouchableOpacity
            style={[styles.subPill, { 
              borderColor: '#e53e3e',
              backgroundColor: isDark ? 'rgba(229, 62, 62, 0.12)' : 'rgba(229, 62, 62, 0.08)',
              paddingHorizontal: isSmallPhone ? 10 : 14,
            }]}
            onPress={onOpenReport}
            activeOpacity={0.8}
          >
            <MaterialIcons name="picture-as-pdf" size={14} color="#e53e3e" style={{ marginRight: 6 }} />
            <Text style={[styles.subPillText, { color: '#e53e3e', fontFamily: F.bold, fontSize: isSmallPhone ? 10 : 10.5 }]}>
              REPORTE PDF
            </Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM FOOTER CAROUSEL BAR */}
        {motos.length > 1 && !isMobile && (
          <View style={styles.footerCarouselBar}>
            <TouchableOpacity 
              style={styles.footerNavSide} 
              onPress={handlePrevMoto}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={18} color="#00e3fd" />
              <Text style={styles.footerNavSideText}>{prevMotoName}</Text>
            </TouchableOpacity>

            {/* PAGINATION DOTS */}
            <View style={styles.footerDotsRow}>
              {motos.map((m, i) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => selectMoto(m.id)}
                  style={[
                    styles.footerDot,
                    i === activeIndex && styles.footerDotActive
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.footerNavSide} 
              onPress={handleNextMoto}
              activeOpacity={0.7}
            >
              <Text style={styles.footerNavSideText}>{nextMotoName}</Text>
              <MaterialIcons name="chevron-right" size={18} color="#00e3fd" />
            </TouchableOpacity>
          </View>
        )}

      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
  },
  heroContentRow: {
    zIndex: 2,
    width: '100%',
    justifyContent: 'space-between',
  },
  carouselArrowBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeShowcaseContainer: {
    flex: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bikeImage: {
    width: '100%',
    maxWidth: 780,
  },
  bikePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bikePlaceholderText: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 12,
  },
  mobileCarouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  mobileArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileCounterText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  heroInfoBlock: {
    flex: 1,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  brandPill: {
    backgroundColor: '#4169E1',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  brandPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.5,
  },
  yearText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 1,
  },
  modelHeading: {
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: -0.5,
  },
  telemetryQuickSpecs: {
    gap: 14,
  },
  telemetrySpecItem: {
    borderLeftWidth: 2,
    borderLeftColor: '#00e3fd',
    paddingLeft: 10,
  },
  specLabel: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  specValueMain: {
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: -0.5,
  },
  healthBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  healthBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  ctaButtonGroup: {
    marginTop: 6,
  },
  primaryCtaBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  primaryCtaText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
  },
  secondaryCtaBtn: {
    backgroundColor: 'rgba(0, 227, 253, 0.12)',
    borderColor: '#00e3fd',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    color: '#00e3fd',
    fontSize: 11.5,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
  },
  subPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    zIndex: 2,
  },
  subPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subPillText: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.6,
  },
  footerCarouselBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(64, 72, 92, 0.25)',
    zIndex: 2,
    marginTop: 14,
  },
  footerNavSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerNavSideText: {
    color: '#00e3fd',
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  footerDotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(64, 72, 92, 0.5)',
  },
  footerDotActive: {
    width: 22,
    backgroundColor: '#00e3fd',
  },
});
