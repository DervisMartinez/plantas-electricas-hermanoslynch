import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../data/supabaseClient';
import { PLANTAS_CATALOG, CatalogPlanta } from '../../data/catalogPlantas';

interface Props {
  visible: boolean;
  onClose: () => void;
  operatorsList: any[];
  existingPlants: any[];
  onPlantsAdded: () => Promise<void>;
}

const QUICK_STATES = [
  'Carabobo',
  'Distrito Capital',
  'Miranda',
  'Aragua',
  'Zulia',
  'Lara',
  'Anzoátegui',
  'Táchira',
  'Bolívar',
];

export const SuperAdminPlantCatalogModal: React.FC<Props> = ({
  visible,
  onClose,
  operatorsList,
  existingPlants,
  onPlantsAdded,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [defaultStateLocation, setDefaultStateLocation] = useState('Carabobo');
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingSingleId, setSavingSingleId] = useState<string | null>(null);

  // Full technical characteristics form state (Tab 2)
  const [brand, setBrand] = useState('Blue Power Generation');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [powerKva, setPowerKva] = useState('75');
  const [powerKw, setPowerKw] = useState('60');
  const [fuelType, setFuelType] = useState('Diesel');
  const [frequencyHz, setFrequencyHz] = useState('60 Hz / 1800 RPM');
  const [engineBrand, setEngineBrand] = useState('Cummins');
  const [engineModel, setEngineModel] = useState('4BTA3.9-G2 (4 Cil. Turbo, 3.9L)');
  const [alternatorBrand, setAlternatorBrand] = useState('Leroy Somer');
  const [alternatorModel, setAlternatorModel] = useState('TAL-A44-B (12 Puntas, 3 Fases)');
  const [controllerModel, setControllerModel] = useState('ComAp InteliLite AMF 25 / IL-9');
  const [installationType, setInstallationType] = useState<'Canopy Insonorizada' | 'Abierta'>('Canopy Insonorizada');
  const [fuelTankCapacity, setFuelTankCapacity] = useState('210');
  const [fuelConsumptionLh, setFuelConsumptionLh] = useState('16.5 L/h @ 100% Prime');
  const [oilPanCapacity, setOilPanCapacity] = useState('11.5');
  const [oilType, setOilType] = useState('SAE 15W-40 API CI-4 / CK-4 Diésel');
  const [coolantCapacity, setCoolantCapacity] = useState('8.5');
  const [systemVoltage, setSystemVoltage] = useState('24V DC');
  const [voltageOutput, setVoltageOutput] = useState('208V / 220V / 440V / 480V Trifásico');
  const [dimensions, setDimensions] = useState('2750 x 1100 x 1780 mm');
  const [weightKg, setWeightKg] = useState('1.520 kg (Insonorizada)');
  const [currentHours, setCurrentHours] = useState('0');
  const [locationState, setLocationState] = useState('Carabobo');
  const [assignedOperatorId, setAssignedOperatorId] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const bgModal = isDark ? '#101520' : '#ffffff';
  const cardSubBg = isDark ? '#181f2e' : '#f8fafc';
  const inputBg = isDark ? '#0d111a' : '#ffffff';
  const borderModal = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#002045';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const accentNavy = isDark ? '#2563eb' : '#002045';
  const accentGold = '#D69E2E';

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const insertPlantRecordResilient = async (payload: Record<string, any>) => {
    const dataToInsert = { ...payload };
    for (let attempt = 0; attempt < 6; attempt++) {
      const { error } = await supabase.from('plantas').insert(dataToInsert);
      if (!error) return;
      const missingCol = String(error.message || '').match(/Could not find the '([^']+)' column/);
      if (missingCol && missingCol[1] && missingCol[1] in dataToInsert) {
        delete dataToInsert[missingCol[1]];
        continue;
      }
      throw error;
    }
  };

  // Pre-fill custom form from a catalog item
  const handleLoadCatalogToCustomForm = (item: CatalogPlanta) => {
    setBrand(item.brand);
    setModel(item.model);
    setSerialNumber(`BPG-${item.model}-${Math.floor(100 + Math.random() * 900)}`);
    setPowerKva(String(item.powerKva));
    setPowerKw(String(item.powerKw));
    setFuelType(item.fuelType || 'Diesel');
    setFrequencyHz(item.frequencyHz || '60 Hz / 1800 RPM');
    setEngineBrand(item.engineBrand);
    setEngineModel(item.engineModel);
    setAlternatorBrand(item.alternatorBrand);
    setAlternatorModel(item.alternatorModel);
    setControllerModel(item.controllerModel);
    setInstallationType('Canopy Insonorizada');
    setFuelTankCapacity(String(item.fuelTankCanopyLiters));
    setFuelConsumptionLh(item.fuelConsumptionLh || '');
    setOilPanCapacity(String(item.oilCapacityLiters));
    setOilType(item.oilType || 'SAE 15W-40 API CI-4 / CK-4 Diésel');
    setCoolantCapacity(String(item.coolantCapacityLiters));
    setSystemVoltage(item.systemVoltage || '24V DC');
    setVoltageOutput(item.voltageOutput || '208V / 220V / 440V / 480V Trifásico');
    setDimensions(item.dimensions || '');
    setWeightKg(item.weightKg || '');
    setLocationState(defaultStateLocation || 'Carabobo');
    setActiveTab('custom');
  };

  // Annex a single plant from the catalog directly into public.plantas
  const handleAnnexSingleCatalogPlant = async (item: CatalogPlanta) => {
    setSavingSingleId(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const countSameModel = (existingPlants || []).filter(
        (p) => (p.model || '').toLowerCase().trim() === item.model.toLowerCase().trim()
      ).length;
      const nextSuffix = countSameModel === 0 ? '' : `-${String(countSameModel + 1).padStart(2, '0')}`;
      const generatedSerial = `BPG-${item.model}${nextSuffix}`;

      await insertPlantRecordResilient({
        user_id: userId,
        brand: item.brand,
        model: item.model,
        serial_number: generatedSerial,
        power_kva: item.powerKva,
        power_kw: item.powerKw,
        fuel_type: item.fuelType,
        engine_brand: item.engineBrand,
        engine_model: item.engineModel,
        alternator_brand: item.alternatorBrand,
        alternator_model: item.alternatorModel,
        controller_model: item.controllerModel,
        installation_type: 'Canopy Insonorizada',
        fuel_tank_capacity: item.fuelTankCanopyLiters,
        oil_pan_capacity: item.oilCapacityLiters,
        coolant_capacity: item.coolantCapacityLiters,
        system_voltage: item.systemVoltage,
        voltage_output: item.voltageOutput || '208V / 220V / 440V / 480V Trifásico',
        dimensions: item.dimensions || null,
        weight_kg: item.weightKg || null,
        fuel_consumption_lh: item.fuelConsumptionLh || null,
        oil_type: item.oilType || 'SAE 15W-40 API CI-4 / CK-4 Diésel',
        frequency_hz: item.frequencyHz || '60 Hz / 1800 RPM',
        current_hours: 0,
        location: defaultStateLocation || 'Carabobo',
        catalog_id: item.id,
        is_from_agency: true,
      });

      await onPlantsAdded();
      notify(
        'Planta Incorporada al Inventario',
        `Se anexó ${item.brand} ${item.model} (${item.powerKva} kVA) con serial ${generatedSerial} en ${defaultStateLocation}.`
      );
    } catch (err: any) {
      notify('Error al anexar planta', err.message || 'Intenta nuevamente.');
    } finally {
      setSavingSingleId(null);
    }
  };

  // Annex ALL catalog models into public.plantas with 1 click
  const handleAnnexAllCatalogPlants = async () => {
    setSavingBatch(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const existingModels = new Set(
        (existingPlants || []).map((p) => (p.model || '').toLowerCase().trim())
      );

      // Insert missing catalog models; if all are already present, insert a complete new batch with numbered serials
      const missingCatalog = PLANTAS_CATALOG.filter(
        (item) => !existingModels.has(item.model.toLowerCase().trim())
      );
      const targetItems = missingCatalog.length > 0 ? missingCatalog : PLANTAS_CATALOG;

      for (let i = 0; i < targetItems.length; i++) {
        const item = targetItems[i];
        const countSameModel = (existingPlants || []).filter(
          (p) => (p.model || '').toLowerCase().trim() === item.model.toLowerCase().trim()
        ).length;
        const suffix = countSameModel === 0 ? '' : `-${String(countSameModel + 1).padStart(2, '0')}`;
        const serial = `BPG-${item.model}${suffix}`;

        await insertPlantRecordResilient({
          user_id: userId,
          brand: item.brand,
          model: item.model,
          serial_number: serial,
          power_kva: item.powerKva,
          power_kw: item.powerKw,
          fuel_type: item.fuelType,
          engine_brand: item.engineBrand,
          engine_model: item.engineModel,
          alternator_brand: item.alternatorBrand,
          alternator_model: item.alternatorModel,
          controller_model: item.controllerModel,
          installation_type: 'Canopy Insonorizada',
          fuel_tank_capacity: item.fuelTankCanopyLiters,
          oil_pan_capacity: item.oilCapacityLiters,
          coolant_capacity: item.coolantCapacityLiters,
          system_voltage: item.systemVoltage,
          voltage_output: item.voltageOutput || '208V / 220V / 440V / 480V Trifásico',
          dimensions: item.dimensions || null,
          weight_kg: item.weightKg || null,
          fuel_consumption_lh: item.fuelConsumptionLh || null,
          oil_type: item.oilType || 'SAE 15W-40 API CI-4 / CK-4 Diésel',
          frequency_hz: item.frequencyHz || '60 Hz / 1800 RPM',
          current_hours: 0,
          location: defaultStateLocation || 'Carabobo',
          catalog_id: item.id,
          is_from_agency: true,
        });
      }

      await onPlantsAdded();
      notify(
        'Catálogo Incorporado',
        `Se anexaron ${targetItems.length} plantas del catálogo oficial con todas sus especificaciones técnicas en la pestaña Disponibilidad de Plantas.`
      );
      onClose();
    } catch (err: any) {
      notify('Error al anexar catálogo', err.message || 'Intenta nuevamente.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Save custom plant with full technical specifications
  const handleSaveCustomPlant = async () => {
    if (!brand.trim() || !model.trim()) {
      notify('Campos Requeridos', 'Ingresa al menos la marca y el modelo de la planta eléctrica.');
      return;
    }
    setSavingCustom(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const finalSerial = serialNumber.trim() || `BPG-${model.trim().toUpperCase()}`;

      // Only technical operators from public.operadores can be assigned
      const selectedOp = (operatorsList || []).find((op: any) => op.id === assignedOperatorId);
      const assignedOpName = selectedOp ? (selectedOp.full_name || selectedOp.email || null) : null;

      await insertPlantRecordResilient({
        user_id: userId,
        brand: brand.trim(),
        model: model.trim(),
        serial_number: finalSerial,
        power_kva: Number(powerKva) || 35,
        power_kw: Number(powerKw) || Math.round((Number(powerKva) || 35) * 0.8),
        fuel_type: fuelType.trim() || 'Diesel',
        engine_brand: engineBrand.trim() || 'Cummins',
        engine_model: engineModel.trim() || null,
        alternator_brand: alternatorBrand.trim() || 'Leroy Somer',
        alternator_model: alternatorModel.trim() || null,
        controller_model: controllerModel.trim() || 'ComAp InteliLite IL-9',
        installation_type: installationType,
        fuel_tank_capacity: Number(fuelTankCapacity) || 180,
        oil_pan_capacity: Number(oilPanCapacity) || 10.9,
        coolant_capacity: Number(coolantCapacity) || 7.2,
        system_voltage: systemVoltage.trim() || '24V DC',
        voltage_output: voltageOutput.trim() || '208V / 220V / 440V / 480V Trifásico',
        dimensions: dimensions.trim() || null,
        weight_kg: weightKg.trim() || null,
        fuel_consumption_lh: fuelConsumptionLh.trim() || null,
        oil_type: oilType.trim() || 'SAE 15W-40 API CI-4 / CK-4 Diésel',
        frequency_hz: frequencyHz.trim() || '60 Hz / 1800 RPM',
        current_hours: Number(currentHours) || 0,
        location: locationState.trim() || 'Carabobo',
        assigned_operator_id: assignedOperatorId || null,
        assigned_operator_name: assignedOpName,
        is_from_agency: true,
      });

      await onPlantsAdded();
      notify(
        'Planta Registrada en Catálogo e Inventario',
        `Se registró la planta ${brand.trim()} ${model.trim()} (${powerKva} kVA) con todas sus características técnicas.`
      );
      onClose();
    } catch (err: any) {
      notify('Error al guardar planta', err.message || 'Intenta nuevamente.');
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          {/* HEADER */}
          <View style={[styles.headerRow, { borderBottomColor: borderModal }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={[styles.headerIconBox, { backgroundColor: accentNavy }]}>
                <MaterialCommunityIcons name="generator-stationary" size={24} color="#ffc250" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.extrabold, fontSize: 18, color: textPrimary }}>
                  Catálogo Maestro & Incorporación de Plantas (Super Admin)
                </Text>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: textSecondary, marginTop: 2 }}>
                  Anexa todas las plantas de tu catálogo oficial con sus especificaciones técnicas completas directo a la pestaña Disponibilidad de Plantas
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* MODE TABS */}
          <View style={[styles.modeTabsBar, { backgroundColor: cardSubBg, borderBottomColor: borderModal }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('catalog')}
              style={[
                styles.modeTabBtn,
                activeTab === 'catalog' && { backgroundColor: accentNavy },
              ]}
            >
              <MaterialIcons
                name="library-add-check"
                size={17}
                color={activeTab === 'catalog' ? '#ffc250' : textSecondary}
              />
              <Text
                style={{
                  fontFamily: F.bold,
                  fontSize: 12.5,
                  color: activeTab === 'catalog' ? '#ffffff' : textPrimary,
                }}
              >
                1. Catálogo Oficial Hermanos Lynch ({PLANTAS_CATALOG.length} Modelos)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('custom')}
              style={[
                styles.modeTabBtn,
                activeTab === 'custom' && { backgroundColor: accentNavy },
              ]}
            >
              <MaterialIcons
                name="tune"
                size={17}
                color={activeTab === 'custom' ? '#ffc250' : textSecondary}
              />
              <Text
                style={{
                  fontFamily: F.bold,
                  fontSize: 12.5,
                  color: activeTab === 'custom' ? '#ffffff' : textPrimary,
                }}
              >
                2. Anexar Planta con Ficha Técnica Completa
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 20, gap: 16 }}>
            {activeTab === 'catalog' ? (
              <>
                {/* TOP BATCH ACTION BAR */}
                <View style={[styles.batchCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 14, color: textPrimary }}>
                      Sede / Estado de Incorporación para el Catálogo
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textSecondary, marginTop: 2 }}>
                      Selecciona el Estado donde se registrarán las unidades y anexa todo tu catálogo o modelos individuales con 1 clic:
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, marginTop: 10 }}
                    >
                      {QUICK_STATES.map((st) => {
                        const active = defaultStateLocation.toLowerCase() === st.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setDefaultStateLocation(st)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 99,
                              borderWidth: 1,
                              borderColor: active ? '#16a34a' : borderModal,
                              backgroundColor: active ? '#16a34a' : inputBg,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: active ? F.bold : F.medium,
                                fontSize: 11.5,
                                color: active ? '#ffffff' : textSecondary,
                              }}
                            >
                              📍 {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <TouchableOpacity
                    onPress={handleAnnexAllCatalogPlants}
                    disabled={savingBatch}
                    activeOpacity={0.85}
                    style={[styles.batchCtaBtn, { backgroundColor: '#16a34a' }]}
                  >
                    {savingBatch ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="playlist-add-check" size={20} color="#ffffff" />
                        <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>
                          Anexar Todo el Catálogo ({PLANTAS_CATALOG.length} Plantas)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* CATALOG MODELS LIST WITH FULL TECHNICAL SPECS */}
                <View style={{ gap: 14 }}>
                  {PLANTAS_CATALOG.map((item) => {
                    const alreadyCount = (existingPlants || []).filter(
                      (p) => (p.model || '').toLowerCase().trim() === item.model.toLowerCase().trim()
                    ).length;

                    return (
                      <View
                        key={item.id}
                        style={[styles.catalogCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}
                      >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                          {/* Image Box */}
                          <View style={[styles.catalogImgBox, { backgroundColor: inputBg, borderColor: borderModal }]}>
                            <Image source={item.imageRes} style={{ width: 95, height: 76 }} resizeMode="contain" />
                          </View>

                          {/* Main Specs */}
                          <View style={{ flex: 1, minWidth: 240 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={{ fontFamily: F.extrabold, fontSize: 16, color: textPrimary }}>
                                {item.brand} · Modelo {item.model}
                              </Text>
                              <View style={{ backgroundColor: 'rgba(37, 99, 235, 0.14)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 }}>
                                <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#2563eb' }}>
                                  {item.powerKva} kVA / {item.powerKw} kW Standby
                                </Text>
                              </View>
                              {alreadyCount > 0 && (
                                <View style={{ backgroundColor: 'rgba(22, 163, 74, 0.14)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 }}>
                                  <Text style={{ fontFamily: F.bold, fontSize: 11, color: '#16a34a' }}>
                                    ✓ {alreadyCount} en inventario
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text style={{ fontFamily: F.medium, fontSize: 12, color: textSecondary, marginTop: 4 }}>
                              {item.description}
                            </Text>

                            {/* Technical Characteristics Grid */}
                            <View style={styles.techPillGrid}>
                              <View style={[styles.techPill, { backgroundColor: inputBg, borderColor: borderModal }]}>
                                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textSecondary }}>
                                  Motor: <Text style={{ color: textPrimary }}>{item.engineBrand} {item.engineModel}</Text>
                                </Text>
                              </View>
                              <View style={[styles.techPill, { backgroundColor: inputBg, borderColor: borderModal }]}>
                                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textSecondary }}>
                                  Alternador: <Text style={{ color: textPrimary }}>{item.alternatorBrand} {item.alternatorModel}</Text>
                                </Text>
                              </View>
                              <View style={[styles.techPill, { backgroundColor: inputBg, borderColor: borderModal }]}>
                                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textSecondary }}>
                                  Controlador: <Text style={{ color: textPrimary }}>{item.controllerModel}</Text>
                                </Text>
                              </View>
                              <View style={[styles.techPill, { backgroundColor: inputBg, borderColor: borderModal }]}>
                                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textSecondary }}>
                                  Tanque Diésel: <Text style={{ color: textPrimary }}>{item.fuelTankCanopyLiters}L ({item.fuelConsumptionLh})</Text>
                                </Text>
                              </View>
                              <View style={[styles.techPill, { backgroundColor: inputBg, borderColor: borderModal }]}>
                                <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textSecondary }}>
                                  Aceite / Coolant: <Text style={{ color: textPrimary }}>{item.oilCapacityLiters}L / {item.coolantCapacityLiters}L</Text>
                                </Text>
                              </View>
                              {item.dimensions && (
                                <View style={[styles.techPill, { backgroundColor: inputBg, borderColor: borderModal }]}>
                                  <Text style={{ fontFamily: F.bold, fontSize: 10.5, color: textSecondary }}>
                                    Dimensiones / Peso: <Text style={{ color: textPrimary }}>{item.dimensions} · {item.weightKg}</Text>
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Actions */}
                          <View style={{ gap: 8, minWidth: 190 }}>
                            <TouchableOpacity
                              onPress={() => handleAnnexSingleCatalogPlant(item)}
                              disabled={savingSingleId === item.id}
                              style={[styles.singleAddBtn, { backgroundColor: accentNavy }]}
                            >
                              {savingSingleId === item.id ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                              ) : (
                                <>
                                  <MaterialIcons name="add-circle" size={16} color="#ffc250" />
                                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#ffffff' }}>
                                    Anexar esta Planta
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleLoadCatalogToCustomForm(item)}
                              style={[styles.customizeBtn, { backgroundColor: inputBg, borderColor: borderModal }]}
                            >
                              <MaterialIcons name="edit" size={15} color={textPrimary} />
                              <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: textPrimary }}>
                                Editar Características
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              /* TAB 2: CUSTOM / FULL TECHNICAL SHEET REGISTRATION */
              <View style={{ gap: 16 }}>
                {/* Quick Pre-fill from Official Models */}
                <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                  <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textPrimary, marginBottom: 8 }}>
                    Autocompletar desde plantilla técnica del catálogo (opcional):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {PLANTAS_CATALOG.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleLoadCatalogToCustomForm(item)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: model === item.model ? accentNavy : borderModal,
                          backgroundColor: model === item.model ? accentNavy : inputBg,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: F.bold,
                            fontSize: 11.5,
                            color: model === item.model ? '#ffffff' : textPrimary,
                          }}
                        >
                          ⚡ {item.model} ({item.powerKva} kVA)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 1. IDENTIFICACIÓN Y POTENCIA */}
                <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 13.5, color: textPrimary, marginBottom: 12 }}>
                    1. Identificación, Serie y Capacidad de Generación
                  </Text>
                  <View style={styles.formGridRow}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>MARCA FABRICANTE *</Text>
                      <TextInput
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="Ej. Blue Power Generation"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>MODELO *</Text>
                      <TextInput
                        value={model}
                        onChangeText={setModel}
                        placeholder="Ej. C75, C125, C220..."
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>N.º DE SERIE / PLACA</Text>
                      <TextInput
                        value={serialNumber}
                        onChangeText={setSerialNumber}
                        placeholder="Ej. BPG-C75-01"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGridRow, { marginTop: 10 }]}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>POTENCIA STANDBY (kVA) *</Text>
                      <TextInput
                        value={powerKva}
                        onChangeText={(v) => {
                          setPowerKva(v);
                          const num = parseFloat(v);
                          if (!isNaN(num)) setPowerKw(String(Math.round(num * 0.8)));
                        }}
                        keyboardType="numeric"
                        placeholder="Ej. 75"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>POTENCIA ACTIVA (kW)</Text>
                      <TextInput
                        value={powerKw}
                        onChangeText={setPowerKw}
                        keyboardType="numeric"
                        placeholder="Ej. 60"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>FRECUENCIA / RÉGIMEN</Text>
                      <TextInput
                        value={frequencyHz}
                        onChangeText={setFrequencyHz}
                        placeholder="60 Hz / 1800 RPM"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>
                </View>

                {/* 2. MOTORIZACIÓN, ALTERNADOR Y SISTEMA ELÉCTRICO */}
                <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 13.5, color: textPrimary, marginBottom: 12 }}>
                    2. Motor Diésel, Alternador y Módulo de Control
                  </Text>
                  <View style={styles.formGridRow}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>MARCA DEL MOTOR</Text>
                      <TextInput
                        value={engineBrand}
                        onChangeText={setEngineBrand}
                        placeholder="Ej. Cummins"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={[styles.fieldCol, { flex: 1.5 }]}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>MODELO Y CILINDRADA DEL MOTOR</Text>
                      <TextInput
                        value={engineModel}
                        onChangeText={setEngineModel}
                        placeholder="Ej. 4BTA3.9-G2 (4 Cil. Turbo, 3.9L)"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGridRow, { marginTop: 10 }]}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>MARCA DEL ALTERNADOR</Text>
                      <TextInput
                        value={alternatorBrand}
                        onChangeText={setAlternatorBrand}
                        placeholder="Ej. Leroy Somer / Stamford"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>MODELO DEL ALTERNADOR</Text>
                      <TextInput
                        value={alternatorModel}
                        onChangeText={setAlternatorModel}
                        placeholder="Ej. TAL-A44-B (12 Puntas, 3F)"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>PANEL CONTROLADOR</Text>
                      <TextInput
                        value={controllerModel}
                        onChangeText={setControllerModel}
                        placeholder="Ej. ComAp InteliLite IL-9"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGridRow, { marginTop: 10 }]}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>VOLTAJE DE SALIDA AC</Text>
                      <TextInput
                        value={voltageOutput}
                        onChangeText={setVoltageOutput}
                        placeholder="208V / 220V / 440V / 480V"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>VOLTAJE SISTEMA DC</Text>
                      <TextInput
                        value={systemVoltage}
                        onChangeText={setSystemVoltage}
                        placeholder="24V DC"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>HORÓMETRO INICIAL (HRS)</Text>
                      <TextInput
                        value={currentHours}
                        onChangeText={setCurrentHours}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>
                </View>

                {/* 3. FLUIDOS, DIMENSIONES Y CABINA */}
                <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 13.5, color: textPrimary, marginBottom: 12 }}>
                    3. Fluidos, Capacidades, Cabina y Dimensiones
                  </Text>
                  <View style={styles.formGridRow}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>TANQUE DIÉSEL (LITROS)</Text>
                      <TextInput
                        value={fuelTankCapacity}
                        onChangeText={setFuelTankCapacity}
                        keyboardType="numeric"
                        placeholder="180"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>CONSUMO COMBUSTIBLE</Text>
                      <TextInput
                        value={fuelConsumptionLh}
                        onChangeText={setFuelConsumptionLh}
                        placeholder="Ej. 16.5 L/h @ 100% Prime"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>CAPACIDAD ACEITE (L)</Text>
                      <TextInput
                        value={oilPanCapacity}
                        onChangeText={setOilPanCapacity}
                        keyboardType="numeric"
                        placeholder="10.9"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>REFRIGERANTE (L)</Text>
                      <TextInput
                        value={coolantCapacity}
                        onChangeText={setCoolantCapacity}
                        keyboardType="numeric"
                        placeholder="7.2"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGridRow, { marginTop: 10 }]}>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>ESPECIFICACIÓN DE ACEITE</Text>
                      <TextInput
                        value={oilType}
                        onChangeText={setOilType}
                        placeholder="SAE 15W-40 API CI-4 / CK-4"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>DIMENSIONES (L x A x H)</Text>
                      <TextInput
                        value={dimensions}
                        onChangeText={setDimensions}
                        placeholder="2750 x 1100 x 1780 mm"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                    <View style={styles.fieldCol}>
                      <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold }]}>PESO EN SECO</Text>
                      <TextInput
                        value={weightKg}
                        onChangeText={setWeightKg}
                        placeholder="1.520 kg (Insonorizada)"
                        placeholderTextColor={textSecondary}
                        style={[styles.input, { backgroundColor: inputBg, borderColor: borderModal, color: textPrimary, fontFamily: F.medium }]}
                      />
                    </View>
                  </View>
                </View>

                {/* 4. ESTADO / SEDE Y OPERADOR TÉCNICO (SOLO TABLA OPERADORES) */}
                <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                  <Text style={{ fontFamily: F.extrabold, fontSize: 13.5, color: textPrimary, marginBottom: 8 }}>
                    4. Ubicación Geográfica (Estado / Sede) y Operador Técnico
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                    {QUICK_STATES.map((st) => {
                      const active = locationState.toLowerCase() === st.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => setLocationState(st)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 99,
                            borderWidth: 1,
                            borderColor: active ? '#16a34a' : borderModal,
                            backgroundColor: active ? '#16a34a' : inputBg,
                          }}
                        >
                          <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11.5, color: active ? '#ffffff' : textSecondary }}>
                            📍 {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.semibold, marginTop: 4 }]}>
                    OPERADOR TÉCNICO A CARGO (SOLO TABLA OPERADORES — OPCIONAL)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      onPress={() => setAssignedOperatorId(null)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: !assignedOperatorId ? '#16a34a' : borderModal,
                        backgroundColor: !assignedOperatorId ? 'rgba(22, 163, 74, 0.14)' : inputBg,
                      }}
                    >
                      <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: !assignedOperatorId ? '#16a34a' : textSecondary }}>
                        Disponible en Stock (Sin asignar)
                      </Text>
                    </TouchableOpacity>

                    {(operatorsList || []).map((op: any) => {
                      const selected = assignedOperatorId === op.id;
                      return (
                        <TouchableOpacity
                          key={op.id}
                          onPress={() => setAssignedOperatorId(op.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: selected ? accentNavy : borderModal,
                            backgroundColor: selected ? accentNavy : inputBg,
                          }}
                        >
                          <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: selected ? '#ffffff' : textPrimary }}>
                            👷 {op.full_name || op.email}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    onPress={handleSaveCustomPlant}
                    disabled={savingCustom}
                    style={[styles.saveCustomBtn, { backgroundColor: accentNavy, marginTop: 16 }]}
                  >
                    {savingCustom ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="save" size={18} color="#ffc250" />
                        <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: '#ffffff' }}>
                          Registrar Planta con Todas sus Características en Disponibilidad de Plantas
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 980,
    maxHeight: '92%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modeTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scrollArea: {
    maxHeight: 620,
  },
  batchCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  batchCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  catalogCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  catalogImgBox: {
    width: 110,
    height: 92,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  techPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  singleAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  formGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fieldCol: {
    flex: 1,
    minWidth: 170,
  },
  fieldLabel: {
    fontSize: 10.5,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
  },
  saveCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
});
