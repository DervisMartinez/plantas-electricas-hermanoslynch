import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { calculateWearPercentage, COMPONENT_NAMES, COMPONENT_LIFESPAN_KM, ComponentType } from '../../../constants/telemetry';
import { getMotoSpecs } from '../../../data/specs';
import { isCar, isPlanta } from '../../../domain/entities/Moto';

interface WebTelemetrySectionProps {
  onOpenSpecs: () => void;
  onOpenQuickOdo: () => void;
  onOpenQuickFuel: () => void;
  onOpenServicesTab: (comp?: string) => void;
}

export const WebTelemetrySection: React.FC<WebTelemetrySectionProps> = ({
  onOpenSpecs,
  onOpenQuickOdo,
  onOpenQuickFuel,
  onOpenServicesTab,
}) => {
  const { colors, mode } = useTheme();
  const { myMoto, records } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const isDark = mode === 'dark';
  const isVehiclePlanta = isPlanta(myMoto);
  const isVehicleCar = isCar(myMoto);

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

  // Telemetry wear calculations
  const wearData = useMemo(() => {
    if (!myMoto) return [];

    const isVehicleCar = isCar(myMoto);
    const isVehiclePlanta = isPlanta(myMoto);

    const getComponentData = (
      type: ComponentType,
      defaultName: string,
      defaultMaxKm: number,
      icon: string,
      iconFamily: 'material' | 'community',
      recommendation: string
    ) => {
      const typeRecords = records.filter((r) => r.type === type);

      if (isVehiclePlanta) {
        const currentHours = myMoto.currentHours || myMoto.currentOdometer || 0;
        if (typeRecords.length === 0) {
          if (currentHours > 0) {
            const usedInCycle = currentHours % defaultMaxKm;
            const remaining = Math.max(0, 1 - (usedInCycle / defaultMaxKm));
            const wear = Math.round(remaining * 100);
            return {
              id: type,
              name: defaultName,
              wear,
              isConfigured: true,
              maxKm: defaultMaxKm,
              icon,
              iconFamily,
              recommendation,
            };
          } else {
            return {
              id: type,
              name: defaultName,
              wear: 0,
              isConfigured: false,
              maxKm: defaultMaxKm,
              icon,
              iconFamily,
              recommendation,
            };
          }
        } else {
          const lastServiceHours = Math.max(...typeRecords.map((r) => r.odometer));
          const hoursSince = Math.max(0, currentHours - lastServiceHours);
          const remaining = Math.max(0, 1 - (hoursSince / defaultMaxKm));
          const wear = Math.round(remaining * 100);
          return {
            id: type,
            name: defaultName,
            wear,
            isConfigured: true,
            maxKm: defaultMaxKm,
            icon,
            iconFamily,
            recommendation,
          };
        }
      }

      const isConfigured = typeRecords.length > 0 || !!myMoto.isFromAgency;

      if (!isConfigured) {
        return {
          id: type,
          name: defaultName,
          wear: 0,
          isConfigured: false,
          maxKm: defaultMaxKm,
          icon,
          iconFamily,
          recommendation,
        };
      }

      const lastOdo = typeRecords.length > 0 ? Math.max(...typeRecords.map((r) => r.odometer)) : 0;
      let override = undefined;
      if (type === 'oil') {
        const lastRecord = typeRecords.reduce((prev, current) => (prev.odometer > current.odometer ? prev : current), typeRecords[0]);
        if (isVehicleCar) {
          if (lastRecord?.notes?.includes('Sintético')) override = 7500;
          else override = 5000;
        } else {
          if (lastRecord?.notes?.includes('Mineral')) override = 3000;
          else if (lastRecord?.notes?.includes('Semi')) override = 5000;
          else if (lastRecord?.notes?.includes('Sintético')) override = 8000;
        }
      }

      const wear = calculateWearPercentage(
        myMoto.currentOdometer,
        lastOdo,
        type as any,
        override,
        isVehicleCar
      );

      return {
        id: type,
        name: defaultName,
        wear,
        isConfigured: true,
        maxKm: defaultMaxKm,
        icon,
        iconFamily,
        recommendation,
      };
    };

    if (isVehiclePlanta) {
      const oil = getComponentData(
        'oil',
        'Aceite Motor Diésel (15W-40)',
        250,
        'opacity',
        'material',
        specs?.oilTypeRecommended || 'SAE 15W-40 API CI-4/CK-4 (Cada 250 hrs)'
      );

      const fuel = getComponentData(
        'fuel_filter' as ComponentType,
        'Filtros (Aceite & Diésel)',
        250,
        'filter-alt',
        'material',
        'Filtro de lubricante y separador de agua (Cada 250 hrs)'
      );

      const air = getComponentData(
        'air_filter' as ComponentType,
        'Filtro de Aire Industrial',
        500,
        'air',
        'material',
        'Elemento primario de admisión de aire (Cada 500 hrs)'
      );

      const coolant = getComponentData(
        'coolant' as ComponentType,
        'Refrigerante & Batería 24V',
        1000,
        'severe-cold',
        'material',
        'Circuito de agua/radiador y cargador estático (Cada 1000 hrs)'
      );

      return [oil, fuel, air, coolant];
    }

    const oil = getComponentData(
      'oil',
      isVehicleCar ? 'Aceite & Filtro Motor' : 'Aceite de Motor (4T)',
      isVehicleCar ? 7500 : COMPONENT_LIFESPAN_KM.oil,
      'opacity',
      'material',
      specs?.oilTypeRecommended || (isVehicleCar ? '10W-30 Semi-Sintético' : '20W-50 4T JASO MA2')
    );

    const beltOrChain = getComponentData(
      (isVehicleCar ? 'timing_belt' : 'chain') as ComponentType,
      isVehicleCar ? 'Correa de Distribución (Tiempo)' : 'Cadena de Transmisión',
      isVehicleCar ? 45000 : COMPONENT_LIFESPAN_KM.chain,
      isVehicleCar ? 'sync' : 'link',
      'material',
      isVehicleCar ? (specs?.timingBeltType || 'Correa DOHC 16V') : (specs?.chainType || 'Paso 428H reforzada')
    );

    const brakes = getComponentData(
      'brakes_front',
      isVehicleCar ? 'Frenos Del. & Tras. (ABS)' : 'Pastillas de Freno',
      isVehicleCar ? 30000 : COMPONENT_LIFESPAN_KM.brakes_front,
      'disc-alert',
      'community',
      specs?.brakesFront || (isVehicleCar ? 'Discos ventilados 256mm' : 'Disco hidráulico')
    );

    const tires = getComponentData(
      'tires_front',
      isVehicleCar ? 'Neumáticos (195/55 R15)' : 'Neumáticos (Presión)',
      isVehicleCar ? 40000 : COMPONENT_LIFESPAN_KM.tires_front,
      'tire',
      'community',
      `Del: ${specs?.frontTirePressure || (isVehicleCar ? '30 PSI' : '28 PSI')} • Tras: ${specs?.rearTirePressure || '32 PSI'}`
    );

    return [oil, beltOrChain, brakes, tires];
  }, [myMoto, records, specs]);

  const hasUnconfigured = useMemo(() => {
    return wearData.some((item) => !item.isConfigured);
  }, [wearData]);

  // Financial summary
  const totalFuelUSD = useMemo(() => {
    return records
      .filter((r) => r.type === 'fuel')
      .reduce((sum, r) => sum + (r.costUSD || 0), 0);
  }, [records]);

  const totalMaintenanceUSD = useMemo(() => {
    return records
      .filter((r) => r.type !== 'fuel')
      .reduce((sum, r) => sum + (r.costUSD || 0), 0);
  }, [records]);

  if (!myMoto) return null;

  return (
    <View nativeID="telemetry-section" style={{ width: '100%', paddingVertical: windowWidth < 1200 ? 24 : 40, paddingHorizontal: windowWidth < 600 ? 14 : (windowWidth < 1200 ? 20 : 48) }}>
      <View style={[styles.sectionHeaderRow, { flexDirection: windowWidth < 700 ? 'column' : 'row', alignItems: windowWidth < 700 ? 'flex-start' : 'flex-end', gap: 12 }]}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MaterialCommunityIcons name="gauge" size={20} color="#00e3fd" />
            <Text style={[styles.sectionSubtitle, { color: '#00e3fd' }]}>TELEMETRÍA EN TIEMPO REAL</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, fontSize: windowWidth < 600 ? 20 : 24 }]}>
            Desgaste y Ciclos de Mantenimiento
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.openServicesBtn, { borderColor: isDark ? '#40485c' : '#d0d4dc' }]}
          onPress={() => onOpenServicesTab()}
          activeOpacity={0.8}
        >
          <Text style={[styles.openServicesBtnText, { color: colors.onSurface }]}>VER TODOS LOS SERVICIOS</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* INITIAL CALIBRATION NOTICE (When vehicle has unconfigured components) */}
      {hasUnconfigured && (
        <View style={[
          styles.unconfiguredBanner,
          {
            backgroundColor: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.08)',
            borderColor: 'rgba(255, 149, 0, 0.35)',
            flexDirection: windowWidth < 650 ? 'column' : 'row',
            alignItems: windowWidth < 650 ? 'stretch' : 'center',
            gap: 12,
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <MaterialIcons name="build-circle" size={24} color="#ff9500" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.unconfiguredBannerTitle, { color: isDark ? '#ffb703' : '#b25e00' }]}>
                Ajuste Inicial Requerido
              </Text>
              <Text style={[styles.unconfiguredBannerDesc, { color: colors.onSurfaceVariant }]}>
                {isVehiclePlanta
                  ? (myMoto.isFromAgency
                      ? 'Planta nueva de fábrica: los ciclos inician desde 0 horas.'
                      : 'Ingresa las horas de operación de tus últimos servicios para que la telemetría calcule el desgaste exacto.')
                  : (myMoto.isFromAgency
                      ? 'Vehículo de agencia: los ciclos arrancan desde 0 km.'
                      : 'Ingresa el kilometraje de tus últimos servicios para que la telemetría calcule el desgaste exacto desde cero.')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.unconfiguredBannerBtn, { backgroundColor: '#ff9500', alignSelf: windowWidth < 650 ? 'flex-start' : 'center' }]}
            onPress={() => onOpenServicesTab()}
            activeOpacity={0.8}
          >
            <Text style={styles.unconfiguredBannerBtnText}>Ajustar Todo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4 TELEMETRY WEAR CARDS (GRID) */}
      <View style={[
        styles.wearCardsGrid,
        {
          flexDirection: windowWidth < 650 ? 'column' : 'row',
          gap: windowWidth < 650 ? 14 : 20,
        }
      ]}>
        {wearData.map((item) => {
          const isHealthy = item.isConfigured && item.wear > 40;
          const isWarning = item.isConfigured && item.wear <= 40 && item.wear > 15;
          const isUnconfigured = !item.isConfigured;

          const statusColor = isUnconfigured 
            ? '#ff9500' 
            : (isHealthy ? '#00ae78' : (isWarning ? '#ffb703' : '#ba1a1a'));

          const statusLabel = isUnconfigured
            ? 'AJUSTAR'
            : (isHealthy ? 'ÓPTIMO' : (isWarning ? 'ATENCIÓN' : 'RECAMBIO'));

          return (
            <View 
              key={item.id}
              style={[
                styles.wearCard,
                { 
                  backgroundColor: isDark ? '#191c21' : '#ffffff',
                  borderColor: isUnconfigured
                    ? 'rgba(255, 149, 0, 0.45)'
                    : (isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)'),
                  width: windowWidth < 650 ? '100%' : undefined,
                  minWidth: windowWidth < 650 ? 0 : 260,
                  flex: windowWidth < 650 ? undefined : 1,
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: isDark ? '#272a30' : '#ececf0' }]}>
                  {item.iconFamily === 'community' ? (
                    <MaterialCommunityIcons name={item.icon as any} size={20} color={statusColor} />
                  ) : (
                    <MaterialIcons name={item.icon as any} size={20} color={statusColor} />
                  )}
                </View>

                <View style={[styles.statusPill, { 
                  backgroundColor: `${statusColor}1A`, 
                  borderColor: statusColor 
                }]}>
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                {item.name}
              </Text>
              
              <Text style={[styles.cardRecommendation, { color: colors.onSurfaceVariant }]}>
                {item.recommendation}
              </Text>

              {/* PROGRESS BAR */}
              <View style={styles.progressRow}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#272a30' : '#e0e0e6' }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: isUnconfigured ? '0%' : `${item.wear}%`, 
                        backgroundColor: statusColor 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.wearPercentText, { color: statusColor }]}>
                  {isUnconfigured ? '0%' : `${item.wear}%`}
                </Text>
              </View>

              {isUnconfigured ? (
                <TouchableOpacity
                  style={[
                    styles.unconfiguredActionBtn,
                    {
                      borderColor: statusColor,
                      backgroundColor: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.08)',
                    }
                  ]}
                  onPress={() => onOpenServicesTab(item.id)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add-circle-outline" size={14} color={statusColor} />
                  <Text style={[styles.unconfiguredActionText, { color: statusColor }]}>
                    Ajustar servicio inicial
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.wearSubDetail, { color: colors.onSurfaceVariant }]}>
                  Ciclo nominal: {item.maxKm.toLocaleString()} {isVehiclePlanta ? 'horas' : 'km'}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* SECOND ROW: QUICK SPECS & EXPENSE SUMMARY (Like Slide 2 & 3 in reference) */}
      <View style={[
        styles.bottomOverviewRow,
        {
          flexDirection: windowWidth < 768 ? 'column' : 'row',
          gap: windowWidth < 768 ? 14 : 20,
        }
      ]}>
        
        {/* QUICK SPECS OVERVIEW */}
        <View style={[styles.overviewCard, { 
          backgroundColor: isDark ? '#191c21' : '#ffffff',
          borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)',
          width: windowWidth < 768 ? '100%' : undefined,
          minWidth: windowWidth < 768 ? 0 : 280,
          flex: windowWidth < 768 ? undefined : 1,
        }]}>
          <View style={styles.overviewCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="tune" size={18} color="#00e3fd" />
              <Text style={[styles.overviewTitle, { color: colors.onSurface }]}>
                Especificaciones Clave de Fábrica
              </Text>
            </View>
            <TouchableOpacity onPress={onOpenSpecs}>
              <Text style={styles.viewFullSpecsLink}>Ficha Completa ↗</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specMiniItem}>
              <Text style={[styles.specMiniLabel, { color: colors.onSurfaceVariant }]}>
                {isVehiclePlanta ? 'POTENCIA' : 'CILINDRADA'}
              </Text>
              <Text style={[styles.specMiniValue, { color: colors.onSurface }]}>
                {isVehiclePlanta ? (specs?.hp || `${myMoto.powerKva || 35} kVA`) : (specs?.displacement || 'N/D')}
              </Text>
            </View>

            <View style={styles.specMiniItem}>
              <Text style={[styles.specMiniLabel, { color: colors.onSurfaceVariant }]}>
                {isVehiclePlanta ? 'MOTOR DIÉSEL' : 'POTENCIA'}
              </Text>
              <Text style={[styles.specMiniValue, { color: colors.onSurface }]}>
                {isVehiclePlanta ? (specs?.displacement || myMoto.engineBrand || 'Cummins') : (specs?.hp || 'N/D')}
              </Text>
            </View>

            <View style={styles.specMiniItem}>
              <Text style={[styles.specMiniLabel, { color: colors.onSurfaceVariant }]}>
                {isVehiclePlanta ? 'TANQUE DIÉSEL' : 'TANQUE'}
              </Text>
              <Text style={[styles.specMiniValue, { color: colors.onSurface }]}>
                {specs?.fuelCapacity || (isVehiclePlanta ? '180 Litros' : 'N/D')}
              </Text>
            </View>

            <View style={styles.specMiniItem}>
              <Text style={[styles.specMiniLabel, { color: colors.onSurfaceVariant }]}>
                {isVehiclePlanta ? 'ALTERNADOR' : 'TRANSMISIÓN'}
              </Text>
              <Text style={[styles.specMiniValue, { color: colors.onSurface }]}>
                {isVehiclePlanta ? (specs?.transmission || myMoto.alternatorBrand || 'Leroy Somer') : (specs?.transmission || 'Manual')}
              </Text>
            </View>
          </View>
        </View>

        {/* FINANCIAL & LOG OVERVIEW */}
        <View style={[styles.overviewCard, { 
          backgroundColor: isDark ? '#191c21' : '#ffffff',
          borderColor: isDark ? 'rgba(64, 72, 92, 0.45)' : 'rgba(0, 0, 0, 0.08)',
          width: windowWidth < 768 ? '100%' : undefined,
          minWidth: windowWidth < 768 ? 0 : 280,
          flex: windowWidth < 768 ? undefined : 1,
        }]}>
          <View style={styles.overviewCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="account-balance-wallet" size={18} color="#4169E1" />
              <Text style={[styles.overviewTitle, { color: colors.onSurface }]}>
                {isVehiclePlanta ? 'Balance Operativo de Planta Eléctrica' : 'Balance de Gastos del Vehículo'}
              </Text>
            </View>
          </View>

          <View style={styles.financeMetricsRow}>
            <View style={styles.financeMetricBox}>
              <Text style={[styles.specMiniLabel, { color: colors.onSurfaceVariant }]}>TOTAL COMBUSTIBLE</Text>
              <Text style={[styles.financeAmount, { color: '#00e3fd', fontSize: windowWidth < 420 ? 20 : 24 }]}>
                ${totalFuelUSD.toFixed(2)}{' '}
                <Text style={{ fontSize: windowWidth < 420 ? 11 : 13, color: colors.onSurfaceVariant }}>USD</Text>
              </Text>
              <TouchableOpacity onPress={onOpenQuickFuel} style={{ marginTop: 6 }}>
                <Text style={styles.actionLinkText}>+ Registrar carga</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.financeDivider, { backgroundColor: isDark ? '#272a30' : '#e0e0e6' }]} />

            <View style={styles.financeMetricBox}>
              <Text style={[styles.specMiniLabel, { color: colors.onSurfaceVariant }]}>TOTAL MANTENIMIENTO</Text>
              <Text style={[styles.financeAmount, { color: '#4169E1', fontSize: windowWidth < 420 ? 20 : 24 }]}>
                ${totalMaintenanceUSD.toFixed(2)}{' '}
                <Text style={{ fontSize: windowWidth < 420 ? 11 : 13, color: colors.onSurfaceVariant }}>USD</Text>
              </Text>
              <TouchableOpacity onPress={() => onOpenServicesTab()} style={{ marginTop: 6 }}>
                <Text style={styles.actionLinkText}>+ Nuevo servicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: -0.3,
  },
  openServicesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  openServicesBtnText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  wearCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 24,
  },
  wearCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusPillText: {
    fontSize: 9.5,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  cardRecommendation: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  wearPercentText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    width: 44,
    textAlign: 'right',
  },
  wearSubDetail: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_500Medium',
  },
  bottomOverviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  overviewCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  overviewTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  viewFullSpecsLink: {
    color: '#4169E1',
    fontSize: 11.5,
    fontFamily: 'Montserrat_600SemiBold',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  specMiniItem: {
    flex: 1,
    minWidth: 130,
    gap: 2,
  },
  specMiniLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.8,
  },
  specMiniValue: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  financeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  financeMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  financeDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 12,
  },
  financeAmount: {
    fontSize: 24,
    fontFamily: 'Montserrat_800ExtraBold',
    marginTop: 4,
  },
  actionLinkText: {
    color: '#00e3fd',
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
  },
  unconfiguredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  unconfiguredBannerTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  unconfiguredBannerDesc: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 16,
  },
  unconfiguredBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  unconfiguredBannerBtnText: {
    color: '#111319',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  unconfiguredActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  unconfiguredActionText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
  },
});
