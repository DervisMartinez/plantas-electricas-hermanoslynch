import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../data/supabaseClient';
import { ENV } from '../../../constants/config';
import { PLANTAS_CATALOG, CatalogPlanta } from '../../../data/catalogPlantas';
import { MOTO_CATALOG, CAR_CATALOG } from '../../../data/catalog';

const CORAL_PRIMARY = '#f46d5f';
const CORAL_BADGE_BG = 'rgba(244, 109, 95, 0.14)';

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

const QUICK_DEPARTMENTS = [
  'OFICINAS EDV - C.C ARA',
  'PLANTAS ELÉCTRICAS',
  'SOPORTE DE CAMPO',
  'MANTENIMIENTO PREVENTIVO',
  'DIRECCIÓN EJECUTIVA',
  'CLIENTE TITULAR',
];

const SUPPORT_VEHICLES = [
  { id: 'none', label: 'Sin vehículo asignado', brand: '', model: '' },
  ...MOTO_CATALOG.slice(0, 6).map((m) => ({
    id: m.id,
    label: `🏍️ ${m.brand} ${m.model}`,
    brand: m.brand,
    model: m.model,
  })),
  ...CAR_CATALOG.map((c) => ({
    id: c.id,
    label: `🚗 ${c.brand} ${c.model}`,
    brand: c.brand,
    model: c.model,
  })),
];

const notifyUser = (title: string, msg: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Non-persisting Supabase client so creating an Auth account never logs out the Super Admin
const createNonPersistingClient = () =>
  createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

// Resilient insert/update helper for public.plantas
const upsertPlantResilient = async (payload: Record<string, any>, editId?: string | null) => {
  const dataCopy = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = editId
      ? await supabase.from('plantas').update(dataCopy).eq('id', editId)
      : await supabase.from('plantas').insert(dataCopy);
    if (!res.error) return;
    const missingCol = String(res.error.message || '').match(/Could not find the '([^']+)' column/);
    if (missingCol && missingCol[1] && missingCol[1] in dataCopy) {
      delete dataCopy[missingCol[1]];
      continue;
    }
    throw res.error;
  }
};

// Resilient upsert helper for role tables
const upsertTableResilient = async (tableName: string, payload: Record<string, any>) => {
  const dataCopy = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from(tableName).upsert(dataCopy);
    if (!error) return;
    const missingCol = String(error.message || '').match(/Could not find the '([^']+)' column/);
    if (missingCol && missingCol[1] && missingCol[1] in dataCopy) {
      delete dataCopy[missingCol[1]];
      continue;
    }
    throw error;
  }
};

// ============================================================================
// 1. GESTIÓN DE DISPOSITIVOS (PLANTAS ELÉCTRICAS) — TABLA + FORMULARIO INLINE
//    Inspirado directamente en las capturas "Gestión disposit." y "⬅ Añadir"
// ============================================================================
interface DeviceManagementProps {
  allPlants: any[];
  operatorsList: any[];
  isDark: boolean;
  isMobile: boolean;
  externalFormTrigger?: number;
  onRefreshData: () => Promise<void>;
  onExportPdf: () => void;
}

export const DeviceManagementSection: React.FC<DeviceManagementProps> = ({
  allPlants,
  operatorsList,
  isDark,
  isMobile,
  externalFormTrigger,
  onRefreshData,
  onExportPdf,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formSectionTab, setFormSectionTab] = useState<'basic' | 'engine' | 'fluids'>('basic');
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);

  // Left tree & toolbar filters
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedStateGroup, setSelectedStateGroup] = useState('Todas');
  const [availabilityFilter, setAvailabilityFilter] = useState<'Todas' | 'Disponibles' | 'Asignadas'>('Todas');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [importingCatalog, setImportingCatalog] = useState(false);

  // Form fields (normal enterprise horizontal form)
  const [brand, setBrand] = useState('Blue Power Generation');
  const [model, setModel] = useState('C75');
  const [serialNumber, setSerialNumber] = useState('BPG-C75-01');
  const [powerKva, setPowerKva] = useState('75');
  const [powerKw, setPowerKw] = useState('60');
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
  const [frequencyHz, setFrequencyHz] = useState('60 Hz / 1800 RPM');
  const [dimensions, setDimensions] = useState('2750 x 1100 x 1780 mm');
  const [weightKg, setWeightKg] = useState('1.520 kg (Insonorizada)');
  const [currentHours, setCurrentHours] = useState('0');
  const [locationState, setLocationState] = useState('Carabobo');
  const [locationZone, setLocationZone] = useState('Zona Central');
  const [locationCountry, setLocationCountry] = useState('Venezuela');
  const [assignedOperatorId, setAssignedOperatorId] = useState<string | null>(null);

  useEffect(() => {
    if (externalFormTrigger && externalFormTrigger > 0) {
      openAddDeviceForm();
    }
  }, [externalFormTrigger]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const surfaceWhite = isDark ? '#141923' : '#ffffff';
  const surfaceSub = isDark ? '#1b2230' : '#f5f6f8';
  const surfaceHeader = isDark ? '#202838' : '#f0f2f5';
  const borderCol = isDark ? 'rgba(255,255,255,0.09)' : '#e2e6ec';
  const textMain = isDark ? '#f8fafc' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f141d' : '#ffffff';

  const applyCatalogTemplate = (item: CatalogPlanta) => {
    const existingSameModel = allPlants.filter(
      (p) => (p.model || '').toLowerCase().trim() === item.model.toLowerCase().trim()
    ).length;
    const suffix = existingSameModel === 0 ? '-01' : `-${String(existingSameModel + 1).padStart(2, '0')}`;
    setBrand(item.brand);
    setModel(item.model);
    setSerialNumber(`BPG-${item.model}${suffix}`);
    setPowerKva(String(item.powerKva));
    setPowerKw(String(item.powerKw));
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
    setFrequencyHz(item.frequencyHz || '60 Hz / 1800 RPM');
    setDimensions(item.dimensions || '');
    setWeightKg(item.weightKg || '');
  };

  const openAddDeviceForm = () => {
    setEditingPlantId(null);
    setFormSectionTab('basic');
    applyCatalogTemplate(PLANTAS_CATALOG[2] || PLANTAS_CATALOG[0]);
    setCurrentHours('0');
    setLocationState(selectedStateGroup !== 'Todas' ? selectedStateGroup : 'Carabobo');
    setLocationZone('Zona Central');
    setLocationCountry('Venezuela');
    setAssignedOperatorId(null);
    setIsFormOpen(true);
  };

  const openEditDeviceForm = (plant: any) => {
    setEditingPlantId(plant.id);
    setFormSectionTab('basic');
    setBrand(plant.brand || 'Blue Power Generation');
    setModel(plant.model || 'C75');
    setSerialNumber(plant.serialNumber || plant.plate || '');
    setPowerKva(String(plant.powerKva || 75));
    setPowerKw(String(plant.powerKw || Math.round((plant.powerKva || 75) * 0.8)));
    setEngineBrand(plant.engineBrand || 'Cummins');
    setEngineModel(plant.engineModel || '4BTA3.9-G2');
    setAlternatorBrand(plant.alternatorBrand || 'Leroy Somer');
    setAlternatorModel(plant.alternatorModel || 'TAL-A44-B');
    setControllerModel(plant.controllerModel || 'ComAp InteliLite IL-9');
    setInstallationType(plant.installationType === 'Abierta' ? 'Abierta' : 'Canopy Insonorizada');
    setFuelTankCapacity(String(plant.fuelTankCapacity || 180));
    setFuelConsumptionLh(plant.fuelConsumptionLh || '16.5 L/h @ 100% Prime');
    setOilPanCapacity(String(plant.oilPanCapacity || 10.9));
    setOilType(plant.oilType || 'SAE 15W-40 API CI-4 / CK-4 Diésel');
    setCoolantCapacity(String(plant.coolantCapacity || 7.2));
    setSystemVoltage(plant.systemVoltage || '24V DC');
    setVoltageOutput(plant.voltageOutput || '208V / 220V / 440V Trifásico');
    setFrequencyHz(plant.frequencyHz || '60 Hz / 1800 RPM');
    setDimensions(plant.dimensions || '2750 x 1100 x 1780 mm');
    setWeightKg(plant.weightKg || '1.520 kg');
    setCurrentHours(String(plant.currentHours || plant.currentOdometer || 0));
    setLocationState(plant.geoState && plant.geoState !== 'Sin Estado en BD' ? plant.geoState : plant.location || 'Carabobo');
    setLocationZone(plant.geoZone && plant.geoZone !== 'Sin Zona en BD' ? plant.geoZone : 'Zona Central');
    setLocationCountry(plant.geoCountry && plant.geoCountry !== 'Sin País en BD' ? plant.geoCountry : 'Venezuela');
    setAssignedOperatorId(plant.assignedOperatorId || null);
    setIsFormOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!model.trim() || !brand.trim()) {
      notifyUser('Campos obligatorios', 'Por favor ingresa al menos el Nombre/Modelo y la Marca del dispositivo.');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const selectedOp = (operatorsList || []).find((op: any) => op.id === assignedOperatorId);
      const assignedOpName = selectedOp ? (selectedOp.full_name || selectedOp.email || null) : null;

      const payload: Record<string, any> = {
        brand: brand.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim() || `BPG-${model.trim().toUpperCase()}`,
        power_kva: Number(powerKva) || 35,
        power_kw: Number(powerKw) || Math.round((Number(powerKva) || 35) * 0.8),
        fuel_type: 'Diesel',
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
        voltage_output: voltageOutput.trim() || '208V / 220V / 440V Trifásico',
        frequency_hz: frequencyHz.trim() || '60 Hz / 1800 RPM',
        dimensions: dimensions.trim() || null,
        weight_kg: weightKg.trim() || null,
        fuel_consumption_lh: fuelConsumptionLh.trim() || null,
        oil_type: oilType.trim() || 'SAE 15W-40 API CI-4 / CK-4 Diésel',
        current_hours: Number(currentHours) || 0,
        location: locationState.trim() || 'Carabobo',
        assigned_operator_id: assignedOperatorId || null,
        assigned_operator_name: assignedOpName,
        is_from_agency: true,
      };

      if (!editingPlantId && userId) {
        payload.user_id = userId;
      }

      await upsertPlantResilient(payload, editingPlantId);
      await onRefreshData();
      setIsFormOpen(false);
      notifyUser(
        editingPlantId ? 'Dispositivo actualizado' : 'Dispositivo anexado al catálogo',
        `La planta ${brand.trim()} ${model.trim()} (${powerKva} kVA) se guardó correctamente en la tabla de plantas.`
      );
    } catch (err: any) {
      notifyUser('Error al guardar dispositivo', err.message || 'Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFullCatalog = async () => {
    setImportingCatalog(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const existingModels = new Set(allPlants.map((p) => (p.model || '').toLowerCase().trim()));
      const missing = PLANTAS_CATALOG.filter((c) => !existingModels.has(c.model.toLowerCase().trim()));
      const itemsToInsert = missing.length > 0 ? missing : PLANTAS_CATALOG;
      const targetLoc = selectedStateGroup !== 'Todas' ? selectedStateGroup : 'Carabobo';

      for (const item of itemsToInsert) {
        const countSame = allPlants.filter((p) => (p.model || '').toLowerCase().trim() === item.model.toLowerCase().trim()).length;
        const suffix = countSame === 0 ? '' : `-${String(countSame + 1).padStart(2, '0')}`;
        await upsertPlantResilient({
          user_id: userId,
          brand: item.brand,
          model: item.model,
          serial_number: `BPG-${item.model}${suffix}`,
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
          frequency_hz: item.frequencyHz || '60 Hz / 1800 RPM',
          dimensions: item.dimensions || null,
          weight_kg: item.weightKg || null,
          fuel_consumption_lh: item.fuelConsumptionLh || null,
          oil_type: item.oilType || 'SAE 15W-40 API CI-4 / CK-4 Diésel',
          current_hours: 0,
          location: targetLoc,
          catalog_id: item.id,
          is_from_agency: true,
        });
      }

      await onRefreshData();
      notifyUser(
        'Catálogo Incorporado',
        `Se anexaron ${itemsToInsert.length} modelos del catálogo oficial en ${targetLoc}.`
      );
    } catch (err: any) {
      notifyUser('Error al importar catálogo', err.message || 'Intenta nuevamente.');
    } finally {
      setImportingCatalog(false);
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    try {
      await supabase.from('plantas').delete().eq('id', plantId);
      setSelectedIds((prev) => prev.filter((id) => id !== plantId));
      await onRefreshData();
    } catch (err: any) {
      notifyUser('Error al eliminar', err.message || 'No se pudo eliminar.');
    }
  };

  const stateGroups = useMemo(() => {
    const counts: Record<string, number> = { Todas: allPlants.length };
    QUICK_STATES.forEach((st) => {
      counts[st] = 0;
    });
    allPlants.forEach((p) => {
      const st = p.geoState && p.geoState !== 'Sin Estado en BD' ? p.geoState : p.location || 'Carabobo';
      counts[st] = (counts[st] || 0) + 1;
    });
    const list = ['Todas', ...Object.keys(counts).filter((k) => k !== 'Todas')];
    if (!groupSearch.trim()) return list.map((name) => ({ name, count: counts[name] || 0 }));
    const q = groupSearch.toLowerCase().trim();
    return list
      .filter((name) => name.toLowerCase().includes(q))
      .map((name) => ({ name, count: counts[name] || 0 }));
  }, [allPlants, groupSearch]);

  const filteredPlants = useMemo(() => {
    return allPlants.filter((plant) => {
      if (selectedStateGroup !== 'Todas') {
        const st = (plant.geoState || plant.location || '').toLowerCase();
        if (!st.includes(selectedStateGroup.toLowerCase())) return false;
      }
      if (availabilityFilter === 'Disponibles' && plant.isAssigned) return false;
      if (availabilityFilter === 'Asignadas' && !plant.isAssigned) return false;
      if (categoryFilter !== 'Todas' && plant.category !== categoryFilter) return false;

      if (deviceSearch.trim()) {
        const q = deviceSearch.toLowerCase().trim();
        const match =
          (plant.model || '').toLowerCase().includes(q) ||
          (plant.brand || '').toLowerCase().includes(q) ||
          (plant.serialNumber || plant.plate || '').toLowerCase().includes(q) ||
          (plant.engineBrand || '').toLowerCase().includes(q) ||
          (plant.engineModel || '').toLowerCase().includes(q) ||
          (plant.location || '').toLowerCase().includes(q) ||
          (plant.assignedOperatorName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allPlants, selectedStateGroup, availabilityFilter, categoryFilter, deviceSearch]);

  // ==========================================================================
  // VIEW B: INLINE ENTERPRISE FORM ("⬅ Añadir dispositivo" / "⬅ Editar")
  // ==========================================================================
  if (isFormOpen) {
    return (
      <View style={[styles.enterpriseSheet, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
        {/* Top Back Header + Pill Section Tabs (Exact Screenshot 4 Style) */}
        <View style={[styles.formTopBar, { borderBottomColor: borderCol, backgroundColor: surfaceSub }]}>
          <TouchableOpacity
            onPress={() => setIsFormOpen(false)}
            style={styles.backHeaderBtn}
            activeOpacity={0.75}
          >
            <MaterialIcons name="arrow-back" size={20} color={textMain} />
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: textMain }}>
              {editingPlantId ? `Editar dispositivo (${model})` : 'Añadir dispositivo al catálogo'}
            </Text>
          </TouchableOpacity>

          <View style={styles.pillTabsRow}>
            {[
              { id: 'basic' as const, label: 'Información básica' },
              { id: 'engine' as const, label: 'Motor y Alternador' },
              { id: 'fluids' as const, label: 'Fluidos y Dimensiones' },
            ].map((t) => {
              const active = formSectionTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setFormSectionTab(t.id)}
                  style={[
                    styles.pillTabItem,
                    {
                      backgroundColor: active ? CORAL_PRIMARY : surfaceWhite,
                      borderColor: active ? CORAL_PRIMARY : borderCol,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 12,
                      color: active ? '#ffffff' : textMain,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ padding: isMobile ? 16 : 28, gap: 26 }}>
          {/* Quick Catalog Template Selector Bar */}
          {!editingPlantId && (
            <View style={[styles.templateSelectorBar, { backgroundColor: surfaceSub, borderColor: borderCol }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View>
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: textMain }}>
                    Autocompletar con modelo del Catálogo Oficial Hermanos Lynch:
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textMuted }}>
                    Selecciona un modelo para cargar todas sus características técnicas en el formulario o escribe uno nuevo:
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleImportFullCatalog}
                  disabled={importingCatalog}
                  style={[styles.secondaryActionPill, { borderColor: CORAL_PRIMARY, backgroundColor: CORAL_BADGE_BG }]}
                >
                  <MaterialIcons name="library-add-check" size={16} color={CORAL_PRIMARY} />
                  <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: CORAL_PRIMARY }}>
                    {importingCatalog ? 'Importando...' : `Importar las ${PLANTAS_CATALOG.length} plantas del catálogo`}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
                {PLANTAS_CATALOG.map((item) => {
                  const isSelected = model.toUpperCase() === item.model.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => applyCatalogTemplate(item)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: isSelected ? CORAL_PRIMARY : borderCol,
                        backgroundColor: isSelected ? CORAL_PRIMARY : surfaceWhite,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isSelected ? F.bold : F.medium,
                          fontSize: 12,
                          color: isSelected ? '#ffffff' : textMain,
                        }}
                      >
                        {item.model} ({item.powerKva} kVA / {item.powerKw} kW)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* SECTION 1: INFORMACIÓN BÁSICA */}
          <View style={{ gap: 16 }}>
            <Text style={[styles.sectionHeaderTitle, { color: textMain, fontFamily: F.bold, borderBottomColor: borderCol }]}>
              Información básica
            </Text>

            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 28, alignItems: 'flex-start' }}>
              {/* Left Column: Horizontal Label + Input Rows */}
              <View style={{ flex: 1, width: '100%', gap: 14 }}>
                {/* Row: *Nombre / Modelo */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    <Text style={{ color: '#ef4444' }}>*</Text>Nombre del dispositivo
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      value={model}
                      onChangeText={setModel}
                      placeholder="Modelo (Ej. C75)"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                    <TextInput
                      value={brand}
                      onChangeText={setBrand}
                      placeholder="Marca (Blue Power Generation)"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { flex: 1.3, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                  </View>
                </View>

                {/* Row: *N.º de serie */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    <Text style={{ color: '#ef4444' }}>*</Text>N.º de serie del dispositivo
                  </Text>
                  <TextInput
                    value={serialNumber}
                    onChangeText={setSerialNumber}
                    placeholder="Ej. BPG-C75-01"
                    placeholderTextColor={textMuted}
                    style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                  />
                </View>

                {/* Row: *Potencia kVA / kW */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    <Text style={{ color: '#ef4444' }}>*</Text>Capacidad (kVA / kW)
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      value={powerKva}
                      onChangeText={(v) => {
                        setPowerKva(v);
                        const num = parseFloat(v);
                        if (!isNaN(num)) setPowerKw(String(Math.round(num * 0.8)));
                      }}
                      keyboardType="numeric"
                      placeholder="Potencia Standby (kVA)"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                    <TextInput
                      value={powerKw}
                      onChangeText={setPowerKw}
                      keyboardType="numeric"
                      placeholder="Potencia Activa (kW)"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                  </View>
                </View>

                {/* Row: Grupo / Ubicación (Estado, Zona, País) */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    Grupo / Ubicación
                  </Text>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        value={locationState}
                        onChangeText={setLocationState}
                        placeholder="Estado / Sede (Ej. Carabobo)"
                        placeholderTextColor={textMuted}
                        style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                      />
                      <TextInput
                        value={locationZone}
                        onChangeText={setLocationZone}
                        placeholder="Zona (Ej. Zona Central)"
                        placeholderTextColor={textMuted}
                        style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                      />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {QUICK_STATES.map((st) => {
                        const active = locationState.toLowerCase() === st.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setLocationState(st)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 99,
                              borderWidth: 1,
                              borderColor: active ? CORAL_PRIMARY : borderCol,
                              backgroundColor: active ? CORAL_PRIMARY : surfaceSub,
                            }}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11, color: active ? '#fff' : textMuted }}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Row: Horómetro actual */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    Horómetro (Horas)
                  </Text>
                  <TextInput
                    value={currentHours}
                    onChangeText={setCurrentHours}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={textMuted}
                    style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                  />
                </View>
              </View>

              {/* Right Column: Credential / Device Preview Box (Matches Screenshot 4 Avatar Box) */}
              <View style={{ width: isMobile ? '100%' : 240, alignItems: 'center', gap: 10 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMuted }}>
                  Ficha del dispositivo
                </Text>
                <View style={[styles.avatarPreviewBox, { backgroundColor: surfaceSub, borderColor: borderCol }]}>
                  <MaterialCommunityIcons name="generator-stationary" size={54} color={CORAL_PRIMARY} />
                  <Text style={{ fontFamily: F.bold, fontSize: 14, color: textMain, marginTop: 8 }}>
                    {model || 'Modelo'} · {powerKva || '0'} kVA
                  </Text>
                  <Text style={{ fontFamily: F.medium, fontSize: 11, color: textMuted, marginTop: 2 }}>
                    {serialNumber || 'Sin serial'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="bolt" size={15} color="#16a34a" />
                    </View>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="settings" size={15} color="#2563eb" />
                    </View>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="place" size={15} color={CORAL_PRIMARY} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* SECTION 2: MOTOR DIÉSEL, ALTERNADOR Y PANEL DE CONTROL */}
          <View style={{ gap: 14 }}>
            <Text style={[styles.sectionHeaderTitle, { color: textMain, fontFamily: F.bold, borderBottomColor: borderCol }]}>
              Parámetros de motor, alternador y control
            </Text>

            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                <Text style={{ color: '#ef4444' }}>*</Text>Motor Diésel
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={engineBrand}
                  onChangeText={setEngineBrand}
                  placeholder="Marca (Cummins)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={engineModel}
                  onChangeText={setEngineModel}
                  placeholder="Modelo y cilindrada (Ej. 4BTA3.9-G2)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1.6, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            </View>

            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                <Text style={{ color: '#ef4444' }}>*</Text>Alternador
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={alternatorBrand}
                  onChangeText={setAlternatorBrand}
                  placeholder="Marca (Leroy Somer)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={alternatorModel}
                  onChangeText={setAlternatorModel}
                  placeholder="Modelo (Ej. TAL-A44-B 12 Puntas)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1.6, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            </View>

            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Panel Controlador
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={controllerModel}
                  onChangeText={setControllerModel}
                  placeholder="Ej. ComAp InteliLite IL-9"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={voltageOutput}
                  onChangeText={setVoltageOutput}
                  placeholder="Voltaje (208V / 220V / 440V)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            </View>
          </View>

          {/* SECTION 3: CAPACIDADES DE TANQUE, FLUIDOS Y ASIGNACIÓN DE OPERADOR */}
          <View style={{ gap: 14 }}>
            <Text style={[styles.sectionHeaderTitle, { color: textMain, fontFamily: F.bold, borderBottomColor: borderCol }]}>
              Información del recurso y asignación operativa
            </Text>

            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Tanque Diésel y Consumo
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={fuelTankCapacity}
                  onChangeText={setFuelTankCapacity}
                  keyboardType="numeric"
                  placeholder="Tanque (Litros)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={fuelConsumptionLh}
                  onChangeText={setFuelConsumptionLh}
                  placeholder="Consumo (Ej. 16.5 L/h)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1.4, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            </View>

            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Aceite y Refrigerante (L)
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={oilPanCapacity}
                  onChangeText={setOilPanCapacity}
                  keyboardType="numeric"
                  placeholder="Aceite (L)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={coolantCapacity}
                  onChangeText={setCoolantCapacity}
                  keyboardType="numeric"
                  placeholder="Refrigerante (L)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={dimensions}
                  onChangeText={setDimensions}
                  placeholder="Dimensiones (mm)"
                  placeholderTextColor={textMuted}
                  style={[styles.hRoundedInput, { flex: 1.4, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            </View>

            {/* Row: Operador Técnico Asignado (Solo de Tabla operadores) */}
            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Operador Técnico (Tabla Op.)
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setAssignedOperatorId(null)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: !assignedOperatorId ? '#16a34a' : borderCol,
                    backgroundColor: !assignedOperatorId ? 'rgba(22, 163, 74, 0.14)' : surfaceSub,
                  }}
                >
                  <Text style={{ fontFamily: !assignedOperatorId ? F.bold : F.medium, fontSize: 12, color: !assignedOperatorId ? '#16a34a' : textMain }}>
                    ● Disponible (Sin asignar)
                  </Text>
                </TouchableOpacity>

                {(operatorsList || []).map((op: any) => {
                  const active = assignedOperatorId === op.id;
                  return (
                    <TouchableOpacity
                      key={op.id}
                      onPress={() => setAssignedOperatorId(op.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: active ? CORAL_PRIMARY : borderCol,
                        backgroundColor: active ? CORAL_PRIMARY : surfaceSub,
                      }}
                    >
                      <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 12, color: active ? '#ffffff' : textMain }}>
                        👷 {op.full_name || op.email}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Bottom Form Buttons: Guardar / Cancelar (Exact Screenshot 4 Style) */}
          <View style={[styles.formBottomBar, { borderTopColor: borderCol }]}>
            <TouchableOpacity
              onPress={handleSaveDevice}
              disabled={saving}
              style={[styles.coralPrimaryBtn, { backgroundColor: CORAL_PRIMARY }]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: '#ffffff' }}>
                  Guardar
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFormOpen(false)}
              disabled={saving}
              style={[styles.whiteCancelBtn, { backgroundColor: surfaceWhite, borderColor: borderCol }]}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: textMain }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ==========================================================================
  // VIEW A: DEVICE MANAGEMENT TABLE ("Gestión disposit." — Exact Screenshot 5)
  // ==========================================================================
  return (
    <View style={[styles.splitManagementContainer, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
      {/* LEFT GROUP SIDEBAR ("Gestión disposit.") */}
      {!isMobile && (
        <View style={[styles.leftGroupPane, { borderRightColor: borderCol, backgroundColor: surfaceSub }]}>
          <View style={styles.leftPaneHeaderRow}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: textMain }}>Gestión disposit.</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={openAddDeviceForm} style={styles.iconTinyBtn}>
                <MaterialIcons name="add-circle-outline" size={18} color={textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefreshData} style={styles.iconTinyBtn}>
                <MaterialIcons name="refresh" size={18} color={textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.leftPaneSearchBox, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
            <TextInput
              value={groupSearch}
              onChangeText={setGroupSearch}
              placeholder="Buscar sede / estado"
              placeholderTextColor={textMuted}
              style={{ flex: 1, fontFamily: F.medium, fontSize: 12, color: textMain, paddingVertical: 4 }}
            />
            <MaterialIcons name="search" size={16} color={textMuted} />
          </View>

          <ScrollView style={{ flex: 1, marginTop: 8 }} showsVerticalScrollIndicator={false}>
            {stateGroups.map((g) => {
              const active = selectedStateGroup === g.name;
              return (
                <TouchableOpacity
                  key={g.name}
                  onPress={() => setSelectedStateGroup(g.name)}
                  style={[
                    styles.groupTreeItem,
                    active && { backgroundColor: CORAL_BADGE_BG, borderLeftWidth: 3, borderLeftColor: CORAL_PRIMARY },
                  ]}
                >
                  <MaterialIcons
                    name={g.name === 'Todas' ? 'domain' : 'place'}
                    size={16}
                    color={active ? CORAL_PRIMARY : textMuted}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 12.5,
                      color: active ? CORAL_PRIMARY : textMain,
                    }}
                    numberOfLines={1}
                  >
                    {g.name === 'Todas' ? 'Todas las Sedes' : g.name}
                  </Text>
                  <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textMuted }}>{g.count}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* RIGHT MAIN TABLE AREA */}
      <View style={{ flex: 1 }}>
        {/* Row 1: Top Title + Badge + Coral "+ Añadir" Button */}
        <View style={[styles.rightTopHeaderRow, { borderBottomColor: borderCol }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: textMain }}>
              Dispositivo de generación
            </Text>
            <View style={{ backgroundColor: CORAL_BADGE_BG, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: CORAL_PRIMARY }}>
                Dispositivo de generación ({filteredPlants.length})
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={openAddDeviceForm}
            activeOpacity={0.85}
            style={[styles.coralAddTopBtn, { backgroundColor: CORAL_PRIMARY }]}
          >
            <MaterialIcons name="add" size={18} color="#ffffff" />
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>Añadir</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Secondary Action Toolbar (Actualizar todo | Exportar | Importar catálogo | Parámetro | Localización | Search) */}
        <View style={[styles.secondaryToolbarRow, { borderBottomColor: borderCol, backgroundColor: surfaceWhite }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, flex: 1 }}>
            <TouchableOpacity onPress={onRefreshData} style={styles.toolbarTextAction}>
              <MaterialIcons name="refresh" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>Actualizar todo</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onExportPdf} style={styles.toolbarTextAction}>
              <MaterialIcons name="file-upload" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>Exportar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImportFullCatalog}
              disabled={importingCatalog}
              style={styles.toolbarTextAction}
            >
              <MaterialIcons name="library-add" size={16} color={CORAL_PRIMARY} />
              <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: CORAL_PRIMARY }}>
                {importingCatalog ? 'Importando...' : `Importar catálogo (${PLANTAS_CATALOG.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const order: ('Todas' | 'Disponibles' | 'Asignadas')[] = ['Todas', 'Disponibles', 'Asignadas'];
                const next = order[(order.indexOf(availabilityFilter) + 1) % order.length];
                setAvailabilityFilter(next);
              }}
              style={styles.toolbarTextAction}
            >
              <MaterialIcons name="tune" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                Estado: {availabilityFilter} ▾
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const cats = [
                  'Todas',
                  'Alta Capacidad (≥100 kVA)',
                  'Media Capacidad (50-99 kVA)',
                  'Compactas (<50 kVA)',
                ];
                const next = cats[(cats.indexOf(categoryFilter) + 1) % cats.length];
                setCategoryFilter(next);
              }}
              style={styles.toolbarTextAction}
            >
              <MaterialIcons name="bolt" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                Parámetro: {categoryFilter === 'Todas' ? 'Todos los kVA' : categoryFilter} ▾
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.rightToolbarSearch, { backgroundColor: inputBg, borderColor: borderCol }]}>
            <TextInput
              value={deviceSearch}
              onChangeText={setDeviceSearch}
              placeholder="Introduzca el nombre del dispositivo..."
              placeholderTextColor={textMuted}
              style={{ flex: 1, fontFamily: F.medium, fontSize: 12, color: textMain, paddingVertical: 4 }}
            />
            <MaterialIcons name="search" size={17} color={textMuted} />
          </View>
        </View>

        {/* Row 3: Enterprise Table Header (Screenshot 5 Columns) */}
        {!isMobile && (
          <View style={[styles.entTableHeader, { backgroundColor: surfaceHeader, borderBottomColor: borderCol }]}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <MaterialIcons name="check-box-outline-blank" size={16} color={textMuted} />
            </View>
            <Text style={[styles.entThText, { flex: 1.4, color: textMain, fontFamily: F.semibold }]}>
              Nombre del dispositivo ⇅
            </Text>
            <Text style={[styles.entThText, { flex: 1.1, color: textMain, fontFamily: F.semibold }]}>
              N.º de serie del dispositivo ⇅
            </Text>
            <Text style={[styles.entThText, { flex: 1.7, color: textMain, fontFamily: F.semibold }]}>
              Motor & Alternador ⇅
            </Text>
            <Text style={[styles.entThText, { flex: 0.9, color: textMain, fontFamily: F.semibold }]}>
              Estado
            </Text>
            <Text style={[styles.entThText, { flex: 1.9, color: textMain, fontFamily: F.semibold }]}>
              Información del recurso (Capacidad)
            </Text>
            <Text style={[styles.entThText, { flex: 1.2, color: textMain, fontFamily: F.semibold }]}>
              Grupo / Sede
            </Text>
            <Text style={[styles.entThText, { width: 100, textAlign: 'center', color: textMain, fontFamily: F.semibold }]}>
              Operación
            </Text>
          </View>
        )}

        {/* Row 4: Enterprise Table Body */}
        <View>
          {filteredPlants.length === 0 ? (
            <View style={{ padding: 42, alignItems: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="generator-stationary" size={40} color={textMuted} />
              <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: textMain }}>
                No hay dispositivos registrados en este grupo.
              </Text>
              <TouchableOpacity
                onPress={openAddDeviceForm}
                style={[styles.coralAddTopBtn, { backgroundColor: CORAL_PRIMARY, marginTop: 4 }]}
              >
                <MaterialIcons name="add" size={16} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#ffffff' }}>Añadir dispositivo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPlants.map((plant) => {
              const checked = selectedIds.includes(plant.id);
              const kva = plant.powerKva || 0;
              const kw = plant.powerKw || Math.round(kva * 0.8);
              const hrs = plant.currentHours || plant.currentOdometer || 0;
              return (
                <TouchableOpacity
                  key={plant.id}
                  onPress={() => openEditDeviceForm(plant)}
                  activeOpacity={0.75}
                  style={[
                    styles.entTableRow,
                    {
                      borderBottomColor: borderCol,
                      backgroundColor: checked ? CORAL_BADGE_BG : surfaceWhite,
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                    },
                  ]}
                >
                  {!isMobile && (
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedIds((prev) =>
                          prev.includes(plant.id) ? prev.filter((i) => i !== plant.id) : [...prev, plant.id]
                        )
                      }
                      style={{ width: 32, alignItems: 'center' }}
                    >
                      <MaterialIcons
                        name={checked ? 'check-box' : 'check-box-outline-blank'}
                        size={16}
                        color={checked ? CORAL_PRIMARY : textMuted}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Nombre del dispositivo */}
                  <View style={{ flex: 1.4, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: textMain }} numberOfLines={1}>
                      {plant.model || 'Planta'} · {plant.brand || 'Blue Power'}
                    </Text>
                    <Text style={{ fontFamily: F.medium, fontSize: 11, color: textMuted }} numberOfLines={1}>
                      {plant.assignedOperatorName ? `👷 Op: ${plant.assignedOperatorName}` : 'Disponible en inventario'}
                    </Text>
                  </View>

                  {/* N.º de serie */}
                  <View style={{ flex: 1.1, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {plant.serialNumber || plant.plate || '--'}
                    </Text>
                  </View>

                  {/* Motor & Alternador */}
                  <View style={{ flex: 1.7, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {plant.engineBrand || 'Cummins'} {plant.engineModel || 'Serie B/C'}
                    </Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 11, color: textMuted }} numberOfLines={1}>
                      {plant.alternatorBrand || 'Leroy Somer'} {plant.alternatorModel || ''}
                    </Text>
                  </View>

                  {/* Estado (🟢 dot like Screenshot 5) */}
                  <View style={{ flex: 0.9, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 5,
                        backgroundColor: plant.isAssigned ? '#2563eb' : '#22c55e',
                      }}
                    />
                    <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textMain }}>
                      {plant.isAssigned ? 'Asignada' : 'Disponible'}
                    </Text>
                  </View>

                  {/* Información del recurso */}
                  <View style={{ flex: 1.9, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {kva} kVA / {kw} kW · {hrs} hrs
                    </Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 11, color: textMuted }} numberOfLines={1}>
                      Diésel {plant.fuelTankCapacity || 180}L · Aceite {plant.oilPanCapacity || 10.9}L · {plant.controllerModel || 'ComAp IL-9'}
                    </Text>
                  </View>

                  {/* Grupo / Sede */}
                  <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {plant.location || (plant.geoState !== 'Sin Estado en BD' ? plant.geoState : 'Carabobo')}
                    </Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 10.5, color: textMuted }} numberOfLines={1}>
                      {plant.geoZone !== 'Sin Zona en BD' ? plant.geoZone : 'Venezuela'}
                    </Text>
                  </View>

                  {/* Operación (⚙️ / 🗑) */}
                  <View style={{ width: isMobile ? '100%' : 100, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={() => openEditDeviceForm(plant)} style={styles.opIconBtn}>
                      <MaterialIcons name="settings" size={18} color={textMain} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePlant(plant.id)} style={styles.opIconBtn}>
                      <MaterialIcons name="delete-outline" size={18} color={textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// 2. DIRECTORIO DE PERSONAS (OPERADORES / USUARIOS / JEFES) — TABLA + FORMULARIO
//    Inspirado directamente en las capturas "Persona" y "⬅ Añadir persona"
// ============================================================================
interface PersonManagementProps {
  roleScope: 'operator' | 'client' | 'superadmin';
  peopleList: any[];
  allPlants: any[];
  isDark: boolean;
  isMobile: boolean;
  externalAddTrigger?: number;
  onRefreshData: () => Promise<void>;
  onExportPdf: () => void;
  onApproveUser?: (id: string) => void;
  onRejectUser?: (id: string) => void;
}

export const PersonManagementSection: React.FC<PersonManagementProps> = ({
  roleScope,
  peopleList,
  allPlants,
  isDark,
  isMobile,
  externalAddTrigger,
  onRefreshData,
  onExportPdf,
  onApproveUser,
  onRejectUser,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [personTab, setPersonTab] = useState<'basic' | 'vehicle' | 'plants'>('basic');
  const [editingPerson, setEditingPerson] = useState<any | null>(null);

  // Left department/state tree filter
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('Todos');
  const [selectedStateFilter, setSelectedStateFilter] = useState('Todos');
  const [personSearch, setPersonSearch] = useState('');
  const [savingPerson, setSavingPerson] = useState(false);

  // Form fields (Exact Screenshot 4: "⬅ Añadir persona")
  const [targetRole, setTargetRole] = useState<'operator' | 'client' | 'superadmin'>(roleScope);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('OFICINAS EDV - C.C ARA');
  const [personIdCode, setPersonIdCode] = useState('');
  const [stateLoc, setStateLoc] = useState('Carabobo');
  const [zoneLoc, setZoneLoc] = useState('Zona Central');
  const [countryLoc, setCountryLoc] = useState('Venezuela');
  const [appUsageEnabled, setAppUsageEnabled] = useState(true);
  const [accountType, setAccountType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [observations, setObservations] = useState('');

  // Operator-specific vehicle & plants fields
  const [drivesVehicle, setDrivesVehicle] = useState(false);
  const [vehicleName, setVehicleName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);

  useEffect(() => {
    setTargetRole(roleScope);
  }, [roleScope]);

  useEffect(() => {
    if (externalAddTrigger && externalAddTrigger > 0) {
      openAddPersonForm();
    }
  }, [externalAddTrigger]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const surfaceWhite = isDark ? '#141923' : '#ffffff';
  const surfaceSub = isDark ? '#1b2230' : '#f5f6f8';
  const surfaceHeader = isDark ? '#202838' : '#f0f2f5';
  const borderCol = isDark ? 'rgba(255,255,255,0.09)' : '#e2e6ec';
  const textMain = isDark ? '#f8fafc' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f141d' : '#ffffff';

  const openAddPersonForm = () => {
    setEditingPerson(null);
    setPersonTab('basic');
    setTargetRole(roleScope);
    setFirstName('');
    setLastName('');
    setDepartment(
      roleScope === 'superadmin'
        ? 'DIRECCIÓN EJECUTIVA'
        : roleScope === 'operator'
        ? 'OFICINAS EDV - C.C ARA'
        : 'CLIENTE TITULAR'
    );
    const randomId = String(Math.floor(1000000000 + Math.random() * 9000000000));
    setPersonIdCode(randomId);
    setStateLoc(selectedStateFilter !== 'Todos' ? selectedStateFilter : 'Carabobo');
    setZoneLoc('Zona Central');
    setCountryLoc('Venezuela');
    setAppUsageEnabled(true);
    setAccountType('email');
    setEmail('');
    setPhone('');
    setPassword('');
    setObservations('');
    setDrivesVehicle(false);
    setVehicleName('');
    setVehiclePlate('');
    setSelectedPlantIds([]);
    setIsFormOpen(true);
  };

  const openEditPersonForm = (person: any) => {
    setEditingPerson(person);
    setPersonTab('basic');
    const resolved = person.resolvedRole || roleScope;
    setTargetRole(resolved);
    setFirstName(person.firstName && person.firstName !== 'Sin Nombre' ? person.firstName : person.full_name || '');
    setLastName(person.lastName && person.lastName !== '--' ? person.lastName : '');
    setDepartment(person.deptLabel || 'OFICINAS EDV - C.C ARA');
    setPersonIdCode(person.operator_code || person.id?.slice(0, 10) || '');
    setStateLoc(person.geoState && person.geoState !== 'Sin Estado en BD' ? person.geoState : 'Carabobo');
    setZoneLoc(person.geoZone && person.geoZone !== 'Sin Zona en BD' ? person.geoZone : 'Zona Central');
    setCountryLoc(person.geoCountry && person.geoCountry !== 'Sin País en BD' ? person.geoCountry : 'Venezuela');
    setAppUsageEnabled(person.approval_status !== 'rejected');
    setAccountType('email');
    setEmail(person.email || '');
    setPhone(person.phone || '');
    setPassword('');
    setObservations(person.observations && person.observations !== '--' ? person.observations : '');
    setDrivesVehicle(resolved === 'operator' ? !!person.drives_company_vehicle : false);
    setVehicleName(resolved === 'operator' ? person.assigned_vehicle_name || '' : '');
    setVehiclePlate(resolved === 'operator' ? person.assigned_vehicle_plate || '' : '');

    if (resolved === 'operator') {
      const assignedIds = allPlants
        .filter(
          (p) =>
            p.assignedOperatorId === person.id ||
            (p.assignedOperatorName &&
              person.full_name &&
              p.assignedOperatorName.toLowerCase().trim() === person.full_name.toLowerCase().trim())
        )
        .map((p) => p.id);
      setSelectedPlantIds(assignedIds);
    } else {
      setSelectedPlantIds([]);
    }
    setIsFormOpen(true);
  };

  const handleSavePerson = async () => {
    const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullNameCombined) {
      notifyUser('Campo requerido', 'Por favor ingresa el Nombre de la persona.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      notifyUser('Cuenta requerida', 'Ingresa al menos el Correo electrónico o el Número de teléfono.');
      return;
    }

    setSavingPerson(true);
    try {
      const finalEmail =
        email.trim() || `${personIdCode.trim() || Date.now()}@operaciones.hermanoslynch.com`;
      const finalCode = personIdCode.trim() || `HL-${Math.floor(100000 + Math.random() * 900000)}`;
      const structuredSpecialty = [
        department.trim() || 'OFICINAS EDV - C.C ARA',
        stateLoc.trim() || 'Carabobo',
        zoneLoc.trim() || 'Zona Central',
        countryLoc.trim() || 'Venezuela',
        observations.trim(),
      ].join(' | ');

      let targetUserId = editingPerson?.id || null;

      // If creating a brand new person and password/email provided, attempt non-persisting Auth signUp
      if (!targetUserId) {
        const tempPass = password.trim().length >= 6 ? password.trim() : `HLynch${finalCode}!`;
        try {
          const tempClient = createNonPersistingClient();
          const { data: signUpData } = await tempClient.auth.signUp({
            email: finalEmail,
            password: tempPass,
            options: {
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: fullNameCombined,
                role: targetRole,
                approval_status: appUsageEnabled ? 'approved' : 'pending',
                phone: phone.trim() || undefined,
                operator_code: finalCode,
                specialty: structuredSpecialty,
              },
            },
          });
          if (signUpData?.user?.id) {
            targetUserId = signUpData.user.id;
          }
        } catch {
          // Fallback to generated UUID if Auth email already exists or rate-limits
        }
        if (!targetUserId) {
          targetUserId = generateUUID();
        }
      }

      const isOp = targetRole === 'operator';
      const commonPayload: Record<string, any> = {
        id: targetUserId,
        email: finalEmail,
        full_name: fullNameCombined,
        phone: phone.trim() || null,
        operator_code: finalCode,
        specialty: structuredSpecialty,
        department: department.trim() || 'OFICINAS EDV - C.C ARA',
        state: stateLoc.trim() || 'Carabobo',
        zone: zoneLoc.trim() || 'Zona Central',
        country: countryLoc.trim() || 'Venezuela',
        observations: observations.trim() || null,
        role: targetRole,
        approval_status: appUsageEnabled ? 'approved' : 'pending',
      };

      // 1. Upsert in profiles (which also triggers trg_sync_separate_role_tables)
      await upsertTableResilient('profiles', {
        ...commonPayload,
        drives_company_vehicle: isOp ? drivesVehicle : false,
        assigned_vehicle_name: isOp && drivesVehicle ? vehicleName.trim() || null : null,
        assigned_vehicle_plate: isOp && drivesVehicle ? vehiclePlate.trim() || null : null,
      });

      // 2. Explicitly upsert in the corresponding independent table & clean from the other 2
      if (targetRole === 'operator') {
        await supabase.from('administradores').delete().eq('id', targetUserId);
        await supabase.from('usuarios_clientes').delete().eq('id', targetUserId);
        await upsertTableResilient('operadores', {
          ...commonPayload,
          user_id: targetUserId,
          drives_company_vehicle: drivesVehicle,
          assigned_vehicle_name: drivesVehicle ? vehicleName.trim() || null : null,
          assigned_vehicle_plate: drivesVehicle ? vehiclePlate.trim() || null : null,
        });

        // Update plant assignments in public.plantas
        for (const plant of allPlants) {
          const shouldAssign = selectedPlantIds.includes(plant.id);
          const wasAssignedToThisOp =
            plant.assignedOperatorId === targetUserId ||
            (plant.assignedOperatorName &&
              plant.assignedOperatorName.toLowerCase().trim() === fullNameCombined.toLowerCase());

          if (shouldAssign) {
            await supabase
              .from('plantas')
              .update({
                assigned_operator_id: targetUserId,
                assigned_operator_name: fullNameCombined,
              })
              .eq('id', plant.id);
          } else if (wasAssignedToThisOp) {
            await supabase
              .from('plantas')
              .update({
                assigned_operator_id: null,
                assigned_operator_name: null,
              })
              .eq('id', plant.id);
          }
        }
      } else if (targetRole === 'superadmin') {
        await supabase.from('operadores').delete().eq('id', targetUserId);
        await supabase.from('usuarios_clientes').delete().eq('id', targetUserId);
        await upsertTableResilient('administradores', {
          ...commonPayload,
          user_id: targetUserId,
          role: 'superadmin',
        });
        // Super Admins NEVER have plants assigned
        await supabase
          .from('plantas')
          .update({ assigned_operator_id: null, assigned_operator_name: null })
          .eq('assigned_operator_id', targetUserId);
      } else {
        await supabase.from('administradores').delete().eq('id', targetUserId);
        await supabase.from('operadores').delete().eq('id', targetUserId);
        await upsertTableResilient('usuarios_clientes', {
          ...commonPayload,
          user_id: targetUserId,
          role: 'client',
        });
      }

      await onRefreshData();
      setIsFormOpen(false);
      notifyUser(
        editingPerson ? 'Persona actualizada' : 'Persona añadida',
        `Los datos de "${fullNameCombined}" fueron guardados exitosamente en su tabla correspondiente.`
      );
    } catch (err: any) {
      notifyUser('Error al guardar persona', err.message || 'Intenta nuevamente.');
    } finally {
      setSavingPerson(false);
    }
  };

  const departmentsTree = useMemo(() => {
    const counts: Record<string, number> = { Todos: peopleList.length };
    QUICK_DEPARTMENTS.forEach((d) => {
      counts[d] = 0;
    });
    peopleList.forEach((p) => {
      const d = (p.deptLabel || 'OFICINAS EDV - C.C ARA').toUpperCase();
      counts[d] = (counts[d] || 0) + 1;
    });
    const list = ['Todos', ...Object.keys(counts).filter((k) => k !== 'Todos')];
    if (!deptSearch.trim()) return list.map((name) => ({ name, count: counts[name] || 0 }));
    const q = deptSearch.toLowerCase().trim();
    return list
      .filter((name) => name.toLowerCase().includes(q))
      .map((name) => ({ name, count: counts[name] || 0 }));
  }, [peopleList, deptSearch]);

  const filteredPeople = useMemo(() => {
    return peopleList.filter((p) => {
      if (selectedDeptFilter !== 'Todos') {
        if ((p.deptLabel || '').toUpperCase() !== selectedDeptFilter.toUpperCase()) return false;
      }
      if (selectedStateFilter !== 'Todos') {
        if ((p.geoState || '').toLowerCase() !== selectedStateFilter.toLowerCase()) return false;
      }
      if (personSearch.trim()) {
        const q = personSearch.toLowerCase().trim();
        const match =
          (p.full_name || '').toLowerCase().includes(q) ||
          (p.firstName || '').toLowerCase().includes(q) ||
          (p.lastName || '').toLowerCase().includes(q) ||
          (p.operator_code || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.deptLabel || '').toLowerCase().includes(q) ||
          (p.geoState || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [peopleList, selectedDeptFilter, selectedStateFilter, personSearch]);

  // ==========================================================================
  // VIEW B: INLINE "⬅ Añadir persona" / "⬅ Editar persona" FORM (Screenshot 4)
  // ==========================================================================
  if (isFormOpen) {
    return (
      <View style={[styles.enterpriseSheet, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
        {/* Top Back Bar + Pill Tabs (Exact Screenshot 4: "⬅ Añadir persona  [Información básica] [Vehículo] [Plantas]") */}
        <View style={[styles.formTopBar, { borderBottomColor: borderCol, backgroundColor: surfaceSub }]}>
          <TouchableOpacity
            onPress={() => setIsFormOpen(false)}
            style={styles.backHeaderBtn}
            activeOpacity={0.75}
          >
            <MaterialIcons name="arrow-back" size={20} color={textMain} />
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: textMain }}>
              {editingPerson ? `Editar persona (${firstName})` : 'Añadir persona'}
            </Text>
          </TouchableOpacity>

          <View style={styles.pillTabsRow}>
            {[
              { id: 'basic' as const, label: 'Información básica' },
              ...(targetRole === 'operator'
                ? [
                    { id: 'vehicle' as const, label: 'Vehículo' },
                    { id: 'plants' as const, label: 'Plantas a Cargo' },
                  ]
                : []),
            ].map((t) => {
              const active = personTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setPersonTab(t.id)}
                  style={[
                    styles.pillTabItem,
                    {
                      backgroundColor: active ? CORAL_PRIMARY : surfaceWhite,
                      borderColor: active ? CORAL_PRIMARY : borderCol,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 12,
                      color: active ? '#ffffff' : textMain,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ padding: isMobile ? 16 : 28, gap: 26 }}>
          {/* BLOCK 1: INFORMACIÓN BÁSICA (Exact Screenshot 4 Layout) */}
          <View style={{ gap: 16 }}>
            <Text style={[styles.sectionHeaderTitle, { color: textMain, fontFamily: F.bold, borderBottomColor: borderCol }]}>
              Información básica
            </Text>

            <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 28, alignItems: 'flex-start' }}>
              {/* Left Form Rows */}
              <View style={{ flex: 1, width: '100%', gap: 14 }}>
                {/* Row: *Nombre [Nombre] [Apellido] */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    <Text style={{ color: '#ef4444' }}>*</Text>Nombre
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Nombre"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Apellido"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                  </View>
                </View>

                {/* Row: Departamento */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    Departamento
                  </Text>
                  <View style={{ flex: 1, gap: 8 }}>
                    <TextInput
                      value={department}
                      onChangeText={setDepartment}
                      placeholder="Ej. OFICINAS EDV - C.C ARA"
                      placeholderTextColor={textMuted}
                      style={[styles.hRoundedInput, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {QUICK_DEPARTMENTS.map((dept) => {
                        const active = department.toUpperCase() === dept.toUpperCase();
                        return (
                          <TouchableOpacity
                            key={dept}
                            onPress={() => setDepartment(dept)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 99,
                              borderWidth: 1,
                              borderColor: active ? CORAL_PRIMARY : borderCol,
                              backgroundColor: active ? CORAL_PRIMARY : surfaceSub,
                            }}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 10.5, color: active ? '#fff' : textMuted }}>
                              {dept}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Row: *ID */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    <Text style={{ color: '#ef4444' }}>*</Text>ID
                  </Text>
                  <TextInput
                    value={personIdCode}
                    onChangeText={setPersonIdCode}
                    placeholder="Ej. 2246983711"
                    placeholderTextColor={textMuted}
                    style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                  />
                </View>

                {/* Row: Ubicación (Estado / Zona / País) */}
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    Ubicación (Estado)
                  </Text>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        value={stateLoc}
                        onChangeText={setStateLoc}
                        placeholder="Estado (Ej. Carabobo)"
                        placeholderTextColor={textMuted}
                        style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                      />
                      <TextInput
                        value={zoneLoc}
                        onChangeText={setZoneLoc}
                        placeholder="Zona (Ej. Zona Central)"
                        placeholderTextColor={textMuted}
                        style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                      />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {QUICK_STATES.map((st) => {
                        const active = stateLoc.toLowerCase() === st.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={st}
                            onPress={() => setStateLoc(st)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 99,
                              borderWidth: 1,
                              borderColor: active ? CORAL_PRIMARY : borderCol,
                              backgroundColor: active ? CORAL_PRIMARY : surfaceSub,
                            }}
                          >
                            <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 10.5, color: active ? '#fff' : textMuted }}>
                              {st}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Right Column: Profile Avatar & Credential Box (Exact Screenshot 4) */}
              <View style={{ width: isMobile ? '100%' : 240, alignItems: 'center', gap: 10 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMuted }}>
                  Imagen del perfil
                </Text>
                <View style={[styles.avatarPreviewBox, { backgroundColor: surfaceSub, borderColor: borderCol }]}>
                  <View style={[styles.personAvatarCircle, { backgroundColor: isDark ? '#2563eb' : '#cbd5e1' }]}>
                    <MaterialIcons name="person" size={46} color="#ffffff" />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="badge" size={15} color={textMuted} />
                    </View>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="vpn-key" size={15} color={textMuted} />
                    </View>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="smartphone" size={15} color={textMuted} />
                    </View>
                    <View style={[styles.credMiniIcon, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
                      <MaterialIcons name="verified-user" size={15} color="#16a34a" />
                    </View>
                  </View>
                </View>
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: borderCol,
                    backgroundColor: surfaceWhite,
                  }}
                >
                  <Text style={{ fontFamily: F.medium, fontSize: 11.5, color: textMain }}>
                    Administración de credencial
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* BLOCK 2: CONCESIÓN DE ACCESO (Tabla de Destino + Vehículo y Plantas si es Operador) */}
          <View style={{ gap: 16 }}>
            <Text style={[styles.sectionHeaderTitle, { color: textMain, fontFamily: F.bold, borderBottomColor: borderCol }]}>
              Concesión de acceso
            </Text>

            {/* Target Table Selector */}
            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Nivel / Tabla en BD
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { id: 'operator' as const, label: 'Operador Técnico (Tabla: operadores)' },
                  { id: 'client' as const, label: 'Usuario / Cliente (Tabla: usuarios_clientes)' },
                  { id: 'superadmin' as const, label: 'Jefe / Super Admin (Tabla: administradores)' },
                ].map((opt) => {
                  const active = targetRole === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setTargetRole(opt.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 99,
                        borderWidth: 1,
                        borderColor: active ? CORAL_PRIMARY : borderCol,
                        backgroundColor: active ? CORAL_BADGE_BG : surfaceSub,
                      }}
                    >
                      <MaterialIcons
                        name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={16}
                        color={active ? CORAL_PRIMARY : textMuted}
                      />
                      <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 12, color: active ? CORAL_PRIMARY : textMain }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Operator-only: Vehículo de soporte y Plantas a cargo */}
            {targetRole === 'operator' && (
              <>
                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    Vehículo / Matrícula
                  </Text>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <Switch
                        value={drivesVehicle}
                        onValueChange={setDrivesVehicle}
                        trackColor={{ false: '#cbd5e1', true: CORAL_PRIMARY }}
                      />
                      <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                        {drivesVehicle ? 'Con vehículo de soporte asignado' : 'Sin vehículo de flota'}
                      </Text>
                    </View>
                    {drivesVehicle && (
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TextInput
                            value={vehicleName}
                            onChangeText={setVehicleName}
                            placeholder="Modelo del vehículo (Ej. BERA SBR 150cc)"
                            placeholderTextColor={textMuted}
                            style={[styles.hRoundedInput, { flex: 1.4, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                          />
                          <TextInput
                            value={vehiclePlate}
                            onChangeText={setVehiclePlate}
                            placeholder="Número de matrícula / Placa"
                            placeholderTextColor={textMuted}
                            style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                          />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {SUPPORT_VEHICLES.filter((v) => v.id !== 'none').map((v) => {
                            const fullLabel = `${v.brand} ${v.model}`;
                            const active = vehicleName === fullLabel;
                            return (
                              <TouchableOpacity
                                key={v.id}
                                onPress={() => setVehicleName(fullLabel)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 99,
                                  borderWidth: 1,
                                  borderColor: active ? CORAL_PRIMARY : borderCol,
                                  backgroundColor: active ? CORAL_PRIMARY : surfaceSub,
                                }}
                              >
                                <Text style={{ fontFamily: active ? F.bold : F.medium, fontSize: 11, color: active ? '#fff' : textMain }}>
                                  {v.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                  <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                    Plantas a su cargo
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {allPlants.map((plant) => {
                      const checked = selectedPlantIds.includes(plant.id);
                      return (
                        <TouchableOpacity
                          key={plant.id}
                          onPress={() =>
                            setSelectedPlantIds((prev) =>
                              prev.includes(plant.id) ? prev.filter((id) => id !== plant.id) : [...prev, plant.id]
                            )
                          }
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: checked ? CORAL_PRIMARY : borderCol,
                            backgroundColor: checked ? CORAL_BADGE_BG : surfaceSub,
                          }}
                        >
                          <MaterialIcons
                            name={checked ? 'check-box' : 'check-box-outline-blank'}
                            size={16}
                            color={checked ? CORAL_PRIMARY : textMuted}
                          />
                          <Text style={{ fontFamily: checked ? F.bold : F.medium, fontSize: 12, color: textMain }}>
                            {plant.model} ({plant.serialNumber || plant.plate}) · {plant.powerKva || 0} kVA
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* BLOCK 3: INFORMACIÓN DE LA CUENTA (Exact Screenshot 4 Layout) */}
          <View style={{ gap: 16 }}>
            <Text style={[styles.sectionHeaderTitle, { color: textMain, fontFamily: F.bold, borderBottomColor: borderCol }]}>
              Información de la cuenta
            </Text>

            {/* Row: Uso de la aplicación Switch */}
            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Uso de la aplicación
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Switch
                  value={appUsageEnabled}
                  onValueChange={setAppUsageEnabled}
                  trackColor={{ false: '#cbd5e1', true: CORAL_PRIMARY }}
                />
              </View>
            </View>

            {/* Row: *Cuenta Radio (Correo electrónico / Número de teléfono) */}
            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                <Text style={{ color: '#ef4444' }}>*</Text>Cuenta
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
                <TouchableOpacity
                  onPress={() => setAccountType('email')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <MaterialIcons
                    name={accountType === 'email' ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={18}
                    color={accountType === 'email' ? CORAL_PRIMARY : textMuted}
                  />
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMain }}>Correo electrónico</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAccountType('phone')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <MaterialIcons
                    name={accountType === 'phone' ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={18}
                    color={accountType === 'phone' ? CORAL_PRIMARY : textMuted}
                  />
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMain }}>Número de teléfono</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row: Correo electrónico & Teléfono */}
            <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
              <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                Correo electrónico
              </Text>
              <View style={{ flex: 1, flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ejemplo@hermanoslynch.com"
                  placeholderTextColor={textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Teléfono / WhatsApp (+58 412...)"
                  placeholderTextColor={textMuted}
                  keyboardType="phone-pad"
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            </View>

            {!editingPerson && (
              <View style={[styles.hFormRow, isMobile && styles.hFormRowMobile]}>
                <Text style={[styles.hFormLabel, { color: textMain, fontFamily: F.medium }]}>
                  Contraseña temporal
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Opcional (mínimo 6 caracteres para inicio de sesión)"
                  placeholderTextColor={textMuted}
                  secureTextEntry
                  style={[styles.hRoundedInput, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                />
              </View>
            )}
          </View>

          {/* Bottom Action Bar: Guardar / Cancelar (Exact Screenshot 4) */}
          <View style={[styles.formBottomBar, { borderTopColor: borderCol }]}>
            <TouchableOpacity
              onPress={handleSavePerson}
              disabled={savingPerson}
              style={[styles.coralPrimaryBtn, { backgroundColor: CORAL_PRIMARY }]}
              activeOpacity={0.85}
            >
              {savingPerson ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: '#ffffff' }}>
                  Guardar
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFormOpen(false)}
              disabled={savingPerson}
              style={[styles.whiteCancelBtn, { backgroundColor: surfaceWhite, borderColor: borderCol }]}
              activeOpacity={0.85}
            >
              <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: textMain }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ==========================================================================
  // VIEW A: PERSON DIRECTORY TABLE ("Persona" — Exact Screenshot 3)
  // ==========================================================================
  return (
    <View style={[styles.splitManagementContainer, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
      {/* LEFT DEPARTMENT / STATE SIDEBAR ("Persona") */}
      {!isMobile && (
        <View style={[styles.leftGroupPane, { borderRightColor: borderCol, backgroundColor: surfaceSub }]}>
          <View style={styles.leftPaneHeaderRow}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: textMain }}>Persona</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={openAddPersonForm} style={styles.iconTinyBtn}>
                <MaterialIcons name="add-circle-outline" size={18} color={textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefreshData} style={styles.iconTinyBtn}>
                <MaterialIcons name="refresh" size={18} color={textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.leftPaneSearchBox, { backgroundColor: surfaceWhite, borderColor: borderCol }]}>
            <TextInput
              value={deptSearch}
              onChangeText={setDeptSearch}
              placeholder="Buscar"
              placeholderTextColor={textMuted}
              style={{ flex: 1, fontFamily: F.medium, fontSize: 12, color: textMain, paddingVertical: 4 }}
            />
            <MaterialIcons name="search" size={16} color={textMuted} />
          </View>

          <ScrollView style={{ flex: 1, marginTop: 8 }} showsVerticalScrollIndicator={false}>
            {departmentsTree.map((d) => {
              const active = selectedDeptFilter === d.name;
              return (
                <TouchableOpacity
                  key={d.name}
                  onPress={() => setSelectedDeptFilter(d.name)}
                  style={[
                    styles.groupTreeItem,
                    active && { backgroundColor: CORAL_BADGE_BG, borderLeftWidth: 3, borderLeftColor: CORAL_PRIMARY },
                  ]}
                >
                  <MaterialIcons
                    name={d.name === 'Todos' ? 'account-tree' : 'folder-open'}
                    size={16}
                    color={active ? CORAL_PRIMARY : textMuted}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: active ? F.bold : F.medium,
                      fontSize: 12,
                      color: active ? CORAL_PRIMARY : textMain,
                    }}
                    numberOfLines={1}
                  >
                    {d.name === 'Todos' ? 'Todos los Departamentos' : d.name}
                  </Text>
                  <Text style={{ fontFamily: F.semibold, fontSize: 11, color: textMuted }}>{d.count}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* RIGHT MAIN TABLE AREA */}
      <View style={{ flex: 1 }}>
        {/* Top Action Toolbar (Exact Screenshot 3: + Añadir | Actualizar | Exportar | Ajustar departamento / Estado | Search) */}
        <View style={[styles.secondaryToolbarRow, { borderBottomColor: borderCol, backgroundColor: surfaceWhite }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, flex: 1 }}>
            <TouchableOpacity
              onPress={openAddPersonForm}
              activeOpacity={0.85}
              style={[styles.coralAddTopBtn, { backgroundColor: CORAL_PRIMARY }]}
            >
              <MaterialIcons name="add" size={17} color="#ffffff" />
              <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#ffffff' }}>Añadir</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onRefreshData} style={styles.toolbarTextAction}>
              <MaterialIcons name="refresh" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>Actualizar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onExportPdf} style={styles.toolbarTextAction}>
              <MaterialIcons name="file-upload" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>Exportar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const states = ['Todos', ...QUICK_STATES];
                const next = states[(states.indexOf(selectedStateFilter) + 1) % states.length];
                setSelectedStateFilter(next);
              }}
              style={styles.toolbarTextAction}
            >
              <MaterialIcons name="place" size={16} color={textMain} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                Ubicación: {selectedStateFilter} ▾
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.rightToolbarSearch, { backgroundColor: inputBg, borderColor: borderCol }]}>
            <TextInput
              value={personSearch}
              onChangeText={setPersonSearch}
              placeholder="Buscar por ID, nombre, apellido..."
              placeholderTextColor={textMuted}
              style={{ flex: 1, fontFamily: F.medium, fontSize: 12, color: textMain, paddingVertical: 4 }}
            />
            <MaterialIcons name="search" size={17} color={textMuted} />
          </View>
        </View>

        {/* Enterprise Table Header (Exact Screenshot 3 Columns) */}
        {!isMobile && (
          <View style={[styles.entTableHeader, { backgroundColor: surfaceHeader, borderBottomColor: borderCol }]}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <MaterialIcons name="check-box-outline-blank" size={16} color={textMuted} />
            </View>
            <Text style={[styles.entThText, { width: 90, color: textMain, fontFamily: F.semibold }]}>
              Imagen del perfil
            </Text>
            <Text style={[styles.entThText, { flex: 1.1, color: textMain, fontFamily: F.semibold }]}>
              ID ⇅
            </Text>
            <Text style={[styles.entThText, { flex: 1.1, color: textMain, fontFamily: F.semibold }]}>
              Nombre ⇅
            </Text>
            <Text style={[styles.entThText, { flex: 1.1, color: textMain, fontFamily: F.semibold }]}>
              Apellido
            </Text>
            <Text style={[styles.entThText, { flex: 1.5, color: textMain, fontFamily: F.semibold }]}>
              Departamento ⇅
            </Text>
            <Text style={[styles.entThText, { flex: 1.3, color: textMain, fontFamily: F.semibold }]}>
              Información de credenciales
            </Text>
            <Text style={[styles.entThText, { flex: 1.2, color: textMain, fontFamily: F.semibold }]}>
              Número de matrícula
            </Text>
            <Text style={[styles.entThText, { flex: 1.4, color: textMain, fontFamily: F.semibold }]}>
              Ubicación / Planta
            </Text>
            <Text style={[styles.entThText, { width: 100, textAlign: 'center', color: textMain, fontFamily: F.semibold }]}>
              Operación
            </Text>
          </View>
        )}

        {/* Enterprise Table Rows */}
        <View>
          {filteredPeople.length === 0 ? (
            <View style={{ padding: 42, alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="people-outline" size={40} color={textMuted} />
              <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: textMain }}>
                No se encontraron registros en este departamento.
              </Text>
              <TouchableOpacity
                onPress={openAddPersonForm}
                style={[styles.coralAddTopBtn, { backgroundColor: CORAL_PRIMARY, marginTop: 4 }]}
              >
                <MaterialIcons name="add" size={16} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: '#ffffff' }}>Añadir persona</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPeople.map((person, idx) => {
              const isOp = person.resolvedRole === 'operator';
              const assignedPlants = isOp
                ? allPlants.filter(
                    (p) =>
                      p.assignedOperatorId === person.id ||
                      (p.assignedOperatorName &&
                        person.full_name &&
                        p.assignedOperatorName.toLowerCase().trim() === person.full_name.toLowerCase().trim())
                  )
                : [];
              const primaryPlant = assignedPlants[0];

              return (
                <TouchableOpacity
                  key={person.id}
                  onPress={() => openEditPersonForm(person)}
                  activeOpacity={0.75}
                  style={[
                    styles.entTableRow,
                    {
                      borderBottomColor: borderCol,
                      backgroundColor: surfaceWhite,
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                    },
                  ]}
                >
                  {!isMobile && (
                    <View style={{ width: 32, alignItems: 'center' }}>
                      <MaterialIcons name="check-box-outline-blank" size={16} color={textMuted} />
                    </View>
                  )}

                  {/* Imagen del perfil */}
                  <View style={{ width: isMobile ? '100%' : 90, justifyContent: 'center' }}>
                    {person.avatar_url ? (
                      <Image source={{ uri: person.avatar_url }} style={styles.rowAvatarImg} />
                    ) : (
                      <View style={[styles.rowAvatarCircle, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]}>
                        <MaterialIcons name="person" size={20} color="#ffffff" />
                      </View>
                    )}
                  </View>

                  {/* ID */}
                  <View style={{ flex: 1.1, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {person.operator_code || person.id?.slice(0, 10) || `22469837${idx + 10}`}
                    </Text>
                  </View>

                  {/* Nombre */}
                  <View style={{ flex: 1.1, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: textMain }} numberOfLines={1}>
                      {person.firstName}
                    </Text>
                  </View>

                  {/* Apellido */}
                  <View style={{ flex: 1.1, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }} numberOfLines={1}>
                      {person.lastName}
                    </Text>
                  </View>

                  {/* Departamento */}
                  <View style={{ flex: 1.5, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {(person.deptLabel || 'OFICINAS EDV - C.C ARA').toUpperCase()}
                    </Text>
                  </View>

                  {/* Información de credenciales */}
                  <View style={{ flex: 1.3, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="badge" size={16} color={textMuted} />
                    <MaterialIcons name="vpn-key" size={15} color={textMuted} />
                    <Text style={{ fontFamily: F.regular, fontSize: 11, color: textMuted }} numberOfLines={1}>
                      {person.email || person.phone || '--'}
                    </Text>
                  </View>

                  {/* Número de matrícula */}
                  <View style={{ flex: 1.2, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {isOp && person.assigned_vehicle_name
                        ? `${person.assigned_vehicle_plate || person.assigned_vehicle_name}`
                        : '--'}
                    </Text>
                  </View>

                  {/* Ubicación / Planta */}
                  <View style={{ flex: 1.4, width: isMobile ? '100%' : undefined }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }} numberOfLines={1}>
                      {person.geoState !== 'Sin Estado en BD' ? person.geoState : 'Carabobo'}
                    </Text>
                    {primaryPlant && (
                      <Text style={{ fontFamily: F.semibold, fontSize: 10.5, color: CORAL_PRIMARY }} numberOfLines={1}>
                        ⚡ {primaryPlant.model} ({primaryPlant.serialNumber || primaryPlant.plate})
                      </Text>
                    )}
                  </View>

                  {/* Operación */}
                  <View style={{ width: isMobile ? '100%' : 100, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                    {person.isPending && onApproveUser && (
                      <TouchableOpacity
                        onPress={() => onApproveUser(person.id)}
                        style={{ backgroundColor: '#16a34a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ fontFamily: F.bold, fontSize: 10, color: '#fff' }}>Aprobar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => openEditPersonForm(person)} style={styles.opIconBtn}>
                      <MaterialIcons name="edit" size={17} color={textMain} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  splitManagementContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 540,
  },
  leftGroupPane: {
    width: 235,
    borderRightWidth: 1,
    padding: 14,
  },
  leftPaneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconTinyBtn: {
    padding: 4,
  },
  leftPaneSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 34,
  },
  groupTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  rightTopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 10,
  },
  coralAddTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  secondaryToolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 12,
  },
  toolbarTextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  rightToolbarSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 34,
    minWidth: 230,
  },
  entTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  entThText: {
    fontSize: 12,
  },
  entTableRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  opIconBtn: {
    padding: 5,
  },
  rowAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  // Enterprise Inline Form ("⬅ Añadir persona" / "⬅ Añadir dispositivo")
  enterpriseSheet: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 12,
  },
  backHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pillTabItem: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  templateSelectorBar: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  sectionHeaderTitle: {
    fontSize: 14.5,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  hFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hFormRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  hFormLabel: {
    width: 175,
    fontSize: 12.5,
    textAlign: 'right',
  },
  hRoundedInput: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 12.5,
  },
  avatarPreviewBox: {
    width: 190,
    minHeight: 190,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  personAvatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  credMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 18,
    borderTopWidth: 1,
  },
  coralPrimaryBtn: {
    paddingHorizontal: 28,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteCancelBtn: {
    paddingHorizontal: 24,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
