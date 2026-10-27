import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MotoSpecs } from '../../data/specs';
import { useTheme } from '../context/ThemeContext';
import { MOTO_CATALOG, VEHICLE_CATALOG } from '../../data/catalog';
import { isCar, isPlanta } from '../../domain/entities/Moto';

interface Props {
  visible: boolean;
  onClose: () => void;
  myMoto: any;
  specs: MotoSpecs | null;
}

export const TechnicalSheetModal: React.FC<Props> = ({ visible, onClose, myMoto, specs }) => {
  const { colors, mode } = useTheme();

  if (!myMoto || !specs) return null;

  const isVehicleCar = isCar(myMoto);
  const isVehiclePlanta = isPlanta(myMoto);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  // Find vehicle image from catalog if available
  const catMoto = VEHICLE_CATALOG.find(
    m => m.brand.toLowerCase() === myMoto.brand.toLowerCase() && m.model.toLowerCase() === myMoto.model.toLowerCase()
  ) || VEHICLE_CATALOG.find(
    m => m.brand.toLowerCase() === myMoto.brand.toLowerCase()
  );
  const imageSource = myMoto.imageUrl ? { uri: myMoto.imageUrl } : (catMoto?.imageRes || null);

  const SpecItem = ({ label, value, icon, color = colors.onSurface }: { label: string; value?: string; icon: string; color?: string }) => {
    if (!value) return null;
    const isLong = value.length > 35;
    if (isLong) {
      return (
        <View style={[styles.specRow, { borderBottomColor: colors.outlineVariant, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name={icon as any} size={17} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 12.5 }}>
              {label}
            </Text>
          </View>
          <Text style={{ fontFamily: F.medium, color, fontSize: 13, lineHeight: 18, width: '100%' }}>
            {value}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.specRow, { borderBottomColor: colors.outlineVariant }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '44%', paddingRight: 8 }}>
          <MaterialIcons name={icon as any} size={17} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12.5 }} numberOfLines={2}>
            {label}
          </Text>
        </View>
        <Text style={{ fontFamily: F.bold, color, fontSize: 13, textAlign: 'right', flex: 1, flexWrap: 'wrap' }}>
          {value}
        </Text>
      </View>
    );
  };

  const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
      <MaterialCommunityIcons name={icon as any} size={18} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          {/* Sheet Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.outlineVariant }]} />

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 20 }}>Ficha Técnica Oficial</Text>
              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                Especificaciones verificadas del fabricante
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}>
              <MaterialIcons name="close" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* Top Showcase Card */}
            <View style={[styles.heroCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
              {imageSource ? (
                <Image source={imageSource} style={styles.bikeImage} resizeMode="contain" />
              ) : (
                <View style={{ height: 110, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name={isVehicleCar ? "directions-car" : "two-wheeler"} size={60} color={colors.onSurfaceVariant} />
                </View>
              )}
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18 }}>
                  {myMoto.brand} {myMoto.model}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <View style={[styles.pill, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={{ fontFamily: F.semibold, color: colors.secondary, fontSize: 11 }}>Año {myMoto.year}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 11 }}>Placa: {myMoto.plate || 'S/N'}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: 'rgba(48,209,88,0.18)' }]}>
                    <Text style={{ fontFamily: F.bold, color: '#30D158', fontSize: 11 }}>{specs.displacement || (isVehicleCar ? '1.8L' : '150 cc')}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* SECCIÓN 1: MOTOR Y RENDIMIENTO */}
            <SectionHeader title="Motor & Rendimiento" icon="engine" />
            <View style={[styles.specGroupCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
              <SpecItem label="Tipo de Motor" value={specs.engineType} icon="settings" />
              <SpecItem label="Cilindrada" value={specs.displacement} icon="speed" />
              <SpecItem label="Potencia" value={specs.hp} icon="flash-on" color={colors.primary} />
              <SpecItem label="Torque" value={specs.torque} icon="offline-bolt" />
              <SpecItem label="Refrigeración" value={specs.cooling} icon="ac-unit" />
            </View>

            {/* SECCIÓN 2: CAPACIDADES Y FLUIDOS */}
            <SectionHeader title="Capacidades & Fluidos Oficiales" icon="oil" />
            <View style={[styles.specGroupCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
              <SpecItem label="Capacidad de Aceite" value={specs.oilCapacity} icon="opacity" color={colors.tertiary} />
              <SpecItem label="Aceite Recomendado" value={specs.oilTypeRecommended} icon="verified" color={colors.primary} />
              <SpecItem label="Refrigerante (Coolant)" value={specs.coolantCapacity} icon="invert-colors" color={colors.primary} />
              <SpecItem label="Tanque de Gasolina" value={specs.fuelCapacity} icon="local-gas-station" color={colors.secondary} />
              <SpecItem label="Intervalo de Aceite" value={specs.maintenanceIntervalOil} icon="update" color="#FF9500" />
            </View>

            {/* SECCIÓN 3: RUEDAS Y NEUMÁTICOS (SOLO VEHÍCULOS) */}
            {!isVehiclePlanta && (
              <>
                <SectionHeader title="Ruedas & Neumáticos (PSI)" icon="tire" />
                <View style={[styles.specGroupCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                  <SpecItem label={isVehicleCar ? "Neumáticos Delanteros" : "Caucho Delantero"} value={specs.frontTireSize} icon="radio-button-checked" />
                  <SpecItem label="Presión Delantera" value={specs.frontTirePressure} icon="compress" color={colors.secondary} />
                  <SpecItem label={isVehicleCar ? "Neumáticos Traseros" : "Caucho Trasero"} value={specs.rearTireSize} icon="radio-button-checked" />
                  <SpecItem label="Presión Trasera" value={specs.rearTirePressure} icon="compress" color={colors.secondary} />
                </View>
              </>
            )}

            {/* SECCIÓN 4: TRANSMISIÓN Y CHASIS */}
            <SectionHeader title="Transmisión, Chasis & Frenos" icon={isVehicleCar ? "car-cog" : "motorbike"} />
            <View style={[styles.specGroupCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
              <SpecItem label="Transmisión" value={specs.transmission} icon="compare-arrows" />
              {specs.timingBeltType && (
                <SpecItem label="Correa Distribución" value={specs.timingBeltType} icon="sync" color={colors.error} />
              )}
              {specs.maintenanceIntervalTimingBelt && (
                <SpecItem label="Intervalo Correa" value={specs.maintenanceIntervalTimingBelt} icon="update" color="#FF9500" />
              )}
              {specs.chainType && (
                <SpecItem label="Cadena de Arrastre" value={specs.chainType} icon="link" />
              )}
              <SpecItem label="Freno Delantero" value={specs.brakesFront} icon="pan-tool" />
              <SpecItem label="Freno Trasero" value={specs.brakesRear} icon="pan-tool" />
              {specs.suspensionFront && (
                <SpecItem label="Suspensión Delantera" value={specs.suspensionFront} icon="build" />
              )}
              {specs.suspensionRear && (
                <SpecItem label="Suspensión Trasera" value={specs.suspensionRear} icon="build" />
              )}
              <SpecItem label="Peso en Seco" value={specs.weight} icon="fitness-center" />
            </View>

            {/* SECCIÓN 5: SISTEMA ELÉCTRICO & EQUIPAMIENTO */}
            <SectionHeader title="Sistema Eléctrico & Confort" icon="lightning-bolt" />
            <View style={[styles.specGroupCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
              <SpecItem label="Bujía de Encendido" value={specs.sparkPlug} icon="wb-incandescent" color={colors.tertiary} />
              <SpecItem label="Batería Oficial" value={specs.battery} icon="battery-charging-full" />
              {specs.dimensions && (
                <SpecItem label="Dimensiones" value={specs.dimensions} icon="straighten" />
              )}
              {specs.trunkCapacity && (
                <SpecItem label="Capacidad de Baúl" value={specs.trunkCapacity} icon="luggage" />
              )}
              {specs.equipment && (
                <SpecItem label="Equipamiento" value={specs.equipment} icon="star" color={colors.primary} />
              )}
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    maxHeight: '92%',
    borderWidth: 0.5,
  },
  sheetHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 0.5,
    marginBottom: 6,
  },
  bikeImage: {
    width: '100%',
    height: 120,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  specGroupCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderWidth: 0.5,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
});
