import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { ComponentType, COMPONENT_NAMES, getVehicleComponents } from '../../../constants/telemetry';
import { isCar, isPlanta } from '../../../domain/entities/Moto';

interface ServicesTabProps {
  initialComponent?: ComponentType;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ initialComponent }) => {
  const { myMoto, records, addRecord, updateMoto } = useMyMoto();
  const { colors } = useTheme();

  const isCurrentCar = isCar(myMoto);
  const isVehiclePlanta = isPlanta(myMoto);

  const plantComps: ComponentType[] = [
    'oil',
    'oil_filter',
    'fuel_filter',
    'air_filter',
    'coolant',
    'battery',
    'accessory_belt',
    'spark_plugs',
    'fuel',
    'other',
  ];

  const comps: ComponentType[] = isVehiclePlanta
    ? plantComps
    : getVehicleComponents(isCurrentCar);

  const getCompName = (c: ComponentType) => {
    if (isVehiclePlanta) {
      switch (c) {
        case 'oil': return 'Aceite Diésel (15W-40)';
        case 'oil_filter': return 'Filtro de Aceite';
        case 'fuel_filter': return 'Filtro Diésel / Trampa';
        case 'air_filter': return 'Filtro de Aire Industrial';
        case 'coolant': return 'Refrigerante / Radiador';
        case 'battery': return 'Banco Baterías 24V';
        case 'accessory_belt': return 'Correa Poli-V';
        case 'spark_plugs': return 'Calibración Válvulas / Iny.';
        case 'fuel': return 'Carga de Diésel';
        case 'other': return 'Otro / Megado Alternador';
        default: return COMPONENT_NAMES[c] || c;
      }
    }
    return COMPONENT_NAMES[c] || c;
  };

  const [selectedComp, setSelectedComp] = useState<ComponentType>(initialComponent || 'oil');

  React.useEffect(() => {
    if (initialComponent) {
      setSelectedComp(initialComponent);
    }
  }, [initialComponent]);
  const [odoStr, setOdoStr] = useState((myMoto?.currentHours || myMoto?.currentOdometer || 0).toString());
  const [costStr, setCostStr] = useState('');
  const [notes, setNotes] = useState('');

  if (!myMoto) return null;

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };


  // Calcular estadísticas
  const totalGasto = records.reduce((sum, r) => sum + (Number(r.costUSD) || 0), 0);
  const gastoGasolina = records.filter(r => r.type === 'fuel').reduce((sum, r) => sum + (Number(r.costUSD) || 0), 0);
  const gastoMantenimiento = totalGasto - gastoGasolina;

  const handleSave = () => {
    const odo = parseInt(odoStr);
    if (isNaN(odo)) {
      alert(isVehiclePlanta ? 'Horómetro de horas inválido' : 'Odómetro inválido');
      return;
    }
    
    addRecord({
      id: Math.random().toString(),
      type: selectedComp,
      date: new Date().toISOString(),
      odometer: odo,
      costUSD: parseFloat(costStr) || 0,
      notes: notes || (isVehiclePlanta ? `Mantenimiento preventivo de ${getCompName(selectedComp)}` : undefined)
    });

    const currentVal = myMoto.currentHours || myMoto.currentOdometer || 0;
    if (odo > currentVal) {
      updateMoto({ currentOdometer: odo, currentHours: odo });
    }

    alert('Servicio registrado exitosamente');
    setCostStr('');
    setNotes('');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 160 }} 
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 24, fontFamily: F.bold, color: colors.onSurface }}>Registrar Actividad</Text>
        <Text style={{ fontSize: 14, fontFamily: F.regular, color: colors.onSurfaceVariant, marginTop: 4 }}>
          Guarda tus repostajes de gasolina y mantenimientos.
        </Text>
      </View>

      {/* ESTADISTICAS */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        <View style={{ flex: 1, backgroundColor: colors.surfaceContainerLow, padding: 16, borderRadius: 20, borderColor: colors.outlineVariant, borderWidth: 0.5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 12 }}>TOTAL GASTADO</Text>
          <Text style={{ fontFamily: F.extrabold, color: colors.primary, fontSize: 22, marginTop: 4 }}>${totalGasto.toFixed(2)}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ backgroundColor: colors.surfaceContainerLowest, padding: 12, borderRadius: 14 }}>
            <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 10 }}>
              {isVehiclePlanta ? '⛽ DIÉSEL' : '⛽ GASOLINA'}
            </Text>
            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14 }}>${gastoGasolina.toFixed(2)}</Text>
          </View>
          <View style={{ backgroundColor: colors.surfaceContainerLowest, padding: 12, borderRadius: 14 }}>
            <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 10 }}>🔧 MANTENIMIENTO</Text>
            <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 14 }}>${gastoMantenimiento.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' }}>
            {isVehiclePlanta ? '1. ¿Qué subsistema o componente atendiste?' : '1. ¿Qué componente cambiaste?'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {comps.map(c => (
              <TouchableOpacity 
                key={c}
                onPress={() => setSelectedComp(c)}
                style={{ 
                  backgroundColor: selectedComp === c ? colors.primary : colors.surfaceContainer, 
                  paddingHorizontal: 16, 
                  paddingVertical: 10, 
                  borderRadius: 20 
                }}>
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: selectedComp === c ? colors.onPrimary : colors.onSurface }}>
                  {getCompName(c)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' }}>
            {isVehiclePlanta ? '2. Horas de Operación (Horómetro) al momento del servicio' : '2. Kilometraje (Odómetro) al momento del cambio'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 16, paddingHorizontal: 16, borderWidth: 0.5, borderColor: colors.outlineVariant }}>
            <MaterialIcons name="speed" size={20} color={colors.onSurfaceVariant} />
            <TextInput 
              style={{ flex: 1, height: 50, fontFamily: F.bold, color: colors.onSurface, marginLeft: 12 }} 
              value={odoStr}
              onChangeText={setOdoStr}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View>
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' }}>3. Costo del repuesto / Mano de obra (USD)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 16, paddingHorizontal: 16, borderWidth: 0.5, borderColor: colors.outlineVariant }}>
            <MaterialIcons name="attach-money" size={20} color={colors.onSurfaceVariant} />
            <TextInput 
              style={{ flex: 1, height: 50, fontFamily: F.bold, color: colors.onSurface, marginLeft: 12 }} 
              value={costStr}
              onChangeText={setCostStr}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>
        </View>

        {selectedComp === 'fuel' && (
          <View>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' }}>4. Litros Anexados</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 16, paddingHorizontal: 16, borderWidth: 0.5, borderColor: colors.outlineVariant }}>
              <MaterialIcons name="local-gas-station" size={20} color={colors.onSurfaceVariant} />
              <TextInput 
                style={{ flex: 1, height: 50, fontFamily: F.bold, color: colors.onSurface, marginLeft: 12 }} 
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: 4"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {selectedComp !== 'fuel' && (
          <View>
            <Text style={{ fontFamily: F.bold, fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' }}>4. Notas / Detalles</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 16, paddingHorizontal: 16, borderWidth: 0.5, borderColor: colors.outlineVariant }}>
              <MaterialIcons name="notes" size={20} color={colors.onSurfaceVariant} />
              <TextInput 
                style={{ flex: 1, height: 50, fontFamily: F.regular, color: colors.onSurface, marginLeft: 12 }} 
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: Yamalube 10w40"
                placeholderTextColor={colors.onSurfaceVariant}
              />
            </View>
          </View>
        )}

        <TouchableOpacity 
          onPress={handleSave}
          style={{ backgroundColor: colors.primary, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ fontFamily: F.bold, color: colors.onPrimaryContainer, fontSize: 16, textTransform: 'uppercase' }}>Guardar Registro</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
