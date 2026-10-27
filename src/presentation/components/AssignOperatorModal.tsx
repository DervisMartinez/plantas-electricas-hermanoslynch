import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../data/supabaseClient';

interface OperatorUser {
  id: string;
  email: string;
  full_name?: string;
  operator_code?: string;
  specialty?: string;
  drives_company_vehicle?: boolean;
  assigned_vehicle_name?: string;
  assigned_vehicle_plate?: string;
  assigned_vehicle_image?: string;
}

interface FleetVehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  year?: number;
  image_url?: string;
  current_odometer?: number;
  user_id?: string;
}

interface PlantWithClient {
  id: string;
  brand: string;
  model: string;
  serial_number?: string;
  location?: string;
  power_kva?: number;
  power_kw?: number;
  current_hours?: number;
  user_id: string;
  assigned_operator_id?: string;
  assigned_operator_name?: string;
  client_email?: string;
  client_name?: string;
}

interface Props {
  visible: boolean;
  operator: OperatorUser | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const AssignOperatorModal: React.FC<Props> = ({
  visible,
  operator,
  onClose,
  onSaveSuccess,
}) => {
  const { isDark } = useTheme();

  const [loadingPlants, setLoadingPlants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plantsList, setPlantsList] = useState<PlantWithClient[]>([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Real Fleet Vehicle Assignment State
  const [drivesVehicle, setDrivesVehicle] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null);
  const [vehicleName, setVehicleName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleImage, setVehicleImage] = useState('');

  // Form for Superadmin to register vehicle directly into fleet catalog
  const [showAddFleetForm, setShowAddFleetForm] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newKm, setNewKm] = useState('');
  const [savingNewFleet, setSavingNewFleet] = useState(false);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const bgModal = isDark ? '#141721' : '#ffffff';
  const borderModal = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#8e96aa' : '#64748b';
  const cardSubBg = isDark ? '#1c202d' : '#f8fafc';
  const accentBlue = '#1a5cff';
  const accentCyan = '#00b4d8';

  // Load plants and existing assignment when operator changes
  useEffect(() => {
    if (visible && operator) {
      setDrivesVehicle(!!operator.drives_company_vehicle);
      setVehicleName(operator.assigned_vehicle_name || '');
      setVehiclePlate(operator.assigned_vehicle_plate || '');
      setVehicleImage(operator.assigned_vehicle_image || '');
      fetchPlants();
      fetchFleet();
    }
  }, [visible, operator]);

  const fetchFleet = async () => {
    setLoadingFleet(true);
    try {
      const { data } = await supabase
        .from('vehiculos_empresa')
        .select('*')
        .order('created_at', { ascending: false });
      const vehicles: FleetVehicle[] = data || [];
      setFleetVehicles(vehicles);

      if (operator?.assigned_vehicle_plate) {
        const found = vehicles.find((v) => v.plate === operator.assigned_vehicle_plate);
        if (found) {
          setSelectedFleetId(found.id);
          setVehicleName(`${found.brand} ${found.model}`);
          setVehiclePlate(found.plate);
          setVehicleImage(found.image_url || '');
        }
      }
    } catch (e) {
      console.warn('Notice al cargar flota en modal de asignación:', e);
    } finally {
      setLoadingFleet(false);
    }
  };

  const handleCreateAndAssignFleetVehicle = async () => {
    if (!newBrand.trim() || !newModel.trim() || !newPlate.trim()) {
      const msg = 'Ingresa la marca, modelo y placa del vehículo de flota.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Campos requeridos', msg);
      return;
    }
    setSavingNewFleet(true);
    try {
      const { data: newV, error } = await supabase
        .from('vehiculos_empresa')
        .insert({
          user_id: operator?.id || null,
          brand: newBrand.trim(),
          model: newModel.trim(),
          plate: newPlate.trim().toUpperCase(),
          image_url: newImageUrl.trim() || null,
          current_odometer: parseInt(newKm) || 0,
          year: 2026,
        })
        .select()
        .single();

      if (error) throw error;

      if (newV) {
        setFleetVehicles((prev) => [newV, ...prev]);
        setSelectedFleetId(newV.id);
        setVehicleName(`${newV.brand} ${newV.model}`);
        setVehiclePlate(newV.plate);
        setVehicleImage(newV.image_url || '');
        setDrivesVehicle(true);
        setShowAddFleetForm(false);
        setNewBrand('');
        setNewModel('');
        setNewPlate('');
        setNewImageUrl('');
        setNewKm('');
      }
    } catch (err: any) {
      console.error('Error al registrar vehículo de flota:', err);
      const msg = err.message || 'No se pudo registrar el vehículo.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSavingNewFleet(false);
    }
  };

  const fetchPlants = async () => {
    if (!operator) return;
    setLoadingPlants(true);
    try {
      // 1. Fetch all plants
      const { data: plantsData, error: plantErr } = await supabase
        .from('plantas')
        .select('*')
        .order('created_at', { ascending: false });

      if (plantErr) throw plantErr;

      // 2. Fetch profiles to get client info
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      const profilesMap = new Map<string, { email: string; full_name?: string }>();
      (profilesData || []).forEach((p: any) => {
        profilesMap.set(p.id, { email: p.email, full_name: p.full_name });
      });

      const initialSelected = new Set<string>();

      const mappedPlants: PlantWithClient[] = (plantsData || []).map((p: any) => {
        const client = profilesMap.get(p.user_id);
        const isAssignedToThis = p.assigned_operator_id === operator.id;
        if (isAssignedToThis) {
          initialSelected.add(p.id);
        }
        return {
          id: p.id,
          brand: p.brand || 'Blue Power Generation',
          model: p.model || 'C35',
          serial_number: p.serial_number || `BPG-${p.model}`,
          location: p.location || 'Sede Principal / Planta Física',
          power_kva: p.power_kva ? Number(p.power_kva) : 35,
          power_kw: p.power_kw ? Number(p.power_kw) : 28,
          current_hours: p.current_hours ? Number(p.current_hours) : 0,
          user_id: p.user_id,
          assigned_operator_id: p.assigned_operator_id,
          assigned_operator_name: p.assigned_operator_name,
          client_email: client?.email || 'cliente@empresa.com',
          client_name: client?.full_name || client?.email?.split('@')[0] || 'Cliente',
        };
      });

      setPlantsList(mappedPlants);
      setSelectedPlantIds(initialSelected);
    } catch (err) {
      console.error('Error al cargar plantas para asignación:', err);
    } finally {
      setLoadingPlants(false);
    }
  };

  const togglePlantSelection = (plantId: string) => {
    setSelectedPlantIds((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) {
        next.delete(plantId);
      } else {
        next.add(plantId);
      }
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    if (!operator) return;
    setSaving(true);
    try {
      const operatorName = operator.full_name || operator.email;

      // 1. Update plants assigned to this operator
      const selectedArray = Array.from(selectedPlantIds);
      
      // Assign selected
      if (selectedArray.length > 0) {
        await supabase
          .from('plantas')
          .update({
            assigned_operator_id: operator.id,
            assigned_operator_name: operatorName,
          })
          .in('id', selectedArray);
      }

      // Unassign previously assigned plants that were unchecked
      const unselectedArray = plantsList
        .filter((p) => p.assigned_operator_id === operator.id && !selectedPlantIds.has(p.id))
        .map((p) => p.id);

      if (unselectedArray.length > 0) {
        await supabase
          .from('plantas')
          .update({
            assigned_operator_id: null,
            assigned_operator_name: null,
          })
          .in('id', unselectedArray);
      }

      // 2. Update operator profile with vehicle assignment
      await supabase
        .from('profiles')
        .update({
          drives_company_vehicle: drivesVehicle,
          assigned_vehicle_name: drivesVehicle && vehicleName.trim() ? vehicleName.trim() : null,
          assigned_vehicle_plate: drivesVehicle && vehiclePlate.trim() ? vehiclePlate.trim().toUpperCase() : null,
          assigned_vehicle_image: drivesVehicle && vehicleImage.trim() ? vehicleImage.trim() : null,
        })
        .eq('id', operator.id);

      // 3. Link or unlink vehicle in vehiculos_empresa
      if (drivesVehicle && selectedFleetId) {
        await supabase
          .from('vehiculos_empresa')
          .update({ user_id: operator.id })
          .eq('id', selectedFleetId);
      } else if (!drivesVehicle && operator.id) {
        await supabase
          .from('vehiculos_empresa')
          .update({ user_id: null })
          .eq('user_id', operator.id);
      }

      if (Platform.OS === 'web') {
        window.alert(`Asignaciones guardadas para el operador ${operatorName}.`);
      } else {
        Alert.alert('Asignación Exitosa', `Se han actualizado las plantas y vehículo para ${operatorName}.`);
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al guardar asignaciones:', err);
      if (Platform.OS === 'web') {
        window.alert('Error al guardar asignaciones: ' + (err.message || 'Intenta de nuevo.'));
      } else {
        Alert.alert('Error', err.message || 'No se pudieron guardar las asignaciones.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filtered plant list
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return plantsList;
    const q = searchQuery.toLowerCase().trim();
    return plantsList.filter(
      (p) =>
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.serial_number || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.client_name || '').toLowerCase().includes(q) ||
        (p.client_email || '').toLowerCase().includes(q)
    );
  }, [plantsList, searchQuery]);

  if (!operator) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                <MaterialIcons name="assignment-ind" size={24} color={accentBlue} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Asignación de Plantas y Móvil de Flota
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Operador: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{operator.full_name || operator.email}</Text> • {operator.operator_code || 'Técnico HL'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>

            {/* SECCIÓN 1: ASIGNACIÓN DE VEHÍCULO CORPORATIVO */}
            <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="local-shipping" size={20} color={accentCyan} />
                  <Text style={[styles.sectionTitle, { color: textPrimary, fontFamily: F.bold }]}>
                    Vehículo Oficial de la Empresa
                  </Text>
                </View>
                <Switch
                  value={drivesVehicle}
                  onValueChange={(val) => {
                    setDrivesVehicle(val);
                    if (!val) {
                      setSelectedFleetId(null);
                      setVehicleName('');
                      setVehiclePlate('');
                      setVehicleImage('');
                    }
                  }}
                  trackColor={{ false: '#475569', true: accentBlue }}
                  thumbColor={drivesVehicle ? '#ffffff' : '#94a3b8'}
                />
              </View>

              <Text style={[styles.sectionDesc, { color: textSecondary, fontFamily: F.medium }]}>
                Habilita si este operador conduce una unidad oficial de asistencia técnica. Los vehículos provienen del catálogo subido por el Super Administrador.
              </Text>

              {drivesVehicle && (
                <View style={{ marginTop: 10, gap: 12 }}>
                  {/* LISTADO DE VEHÍCULOS REALES EN CATÁLOGO */}
                  {loadingFleet ? (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <ActivityIndicator color={accentCyan} size="small" />
                    </View>
                  ) : fleetVehicles.length > 0 ? (
                    <View style={{ gap: 8 }}>
                      <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                        Selecciona la unidad asignada del catálogo oficial ({fleetVehicles.length} disponibles):
                      </Text>
                      {fleetVehicles.map((v) => {
                        const isSelected = selectedFleetId === v.id || vehiclePlate === v.plate;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            onPress={() => {
                              setSelectedFleetId(v.id);
                              setVehicleName(`${v.brand} ${v.model}`);
                              setVehiclePlate(v.plate);
                              setVehicleImage(v.image_url || '');
                            }}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: 12,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              borderColor: isSelected ? accentBlue : borderModal,
                              backgroundColor: isSelected ? (isDark ? 'rgba(26, 92, 255, 0.15)' : '#e0f2fe') : (isDark ? '#141721' : '#ffffff'),
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {v.image_url ? (
                                <Image
                                  source={{ uri: v.image_url }}
                                  style={{ width: 44, height: 44, borderRadius: 8 }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: cardSubBg, justifyContent: 'center', alignItems: 'center' }}>
                                  <MaterialIcons name="directions-car" size={22} color={accentBlue} />
                                </View>
                              )}
                              <View>
                                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>
                                  {v.brand} {v.model}
                                </Text>
                                <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                                  Placa: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{v.plate}</Text> • {Number(v.current_odometer || 0).toLocaleString()} km
                                </Text>
                              </View>
                            </View>

                            <MaterialIcons
                              name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                              size={20}
                              color={isSelected ? accentBlue : textSecondary}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: isDark ? '#141721' : '#ffffff',
                      borderWidth: 1,
                      borderColor: borderModal,
                      gap: 6,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="info-outline" size={16} color="#f59e0b" />
                        <Text style={{ fontFamily: F.bold, color: '#f59e0b', fontSize: 12 }}>
                          No hay vehículos creados en el catálogo de flota
                        </Text>
                      </View>
                      <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11.5 }}>
                        Registra una unidad oficial a continuación con foto y placa para asignarla a este operador.
                      </Text>
                    </View>
                  )}

                  {/* BOTÓN O FORMULARIO PARA REGISTRAR VEHÍCULO EN CATÁLOGO */}
                  {!showAddFleetForm ? (
                    <TouchableOpacity
                      onPress={() => setShowAddFleetForm(true)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: accentBlue,
                        backgroundColor: 'rgba(26, 92, 255, 0.08)',
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="add" size={16} color={accentBlue} />
                      <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 12 }}>
                        + Registrar Nueva Unidad en el Catálogo de Flota
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: isDark ? '#141721' : '#ffffff',
                      borderWidth: 1,
                      borderColor: accentBlue,
                      gap: 10,
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12.5 }}>
                          Registrar Vehículo en Catálogo de Flota
                        </Text>
                        <TouchableOpacity onPress={() => setShowAddFleetForm(false)}>
                          <MaterialIcons name="close" size={16} color={textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          value={newBrand}
                          onChangeText={setNewBrand}
                          placeholder="Marca (ej. Toyota)"
                          placeholderTextColor={textSecondary}
                          style={[styles.textInput, { flex: 1, color: textPrimary, borderColor: borderModal, backgroundColor: isDark ? '#1c202d' : '#f8fafc' }]}
                        />
                        <TextInput
                          value={newModel}
                          onChangeText={setNewModel}
                          placeholder="Modelo (ej. Hilux 4x4)"
                          placeholderTextColor={textSecondary}
                          style={[styles.textInput, { flex: 1, color: textPrimary, borderColor: borderModal, backgroundColor: isDark ? '#1c202d' : '#f8fafc' }]}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          value={newPlate}
                          onChangeText={setNewPlate}
                          placeholder="Placa Oficial"
                          placeholderTextColor={textSecondary}
                          autoCapitalize="characters"
                          style={[styles.textInput, { flex: 1, color: textPrimary, borderColor: borderModal, backgroundColor: isDark ? '#1c202d' : '#f8fafc' }]}
                        />
                        <TextInput
                          value={newKm}
                          onChangeText={setNewKm}
                          placeholder="Km Odómetro"
                          placeholderTextColor={textSecondary}
                          keyboardType="numeric"
                          style={[styles.textInput, { flex: 1, color: textPrimary, borderColor: borderModal, backgroundColor: isDark ? '#1c202d' : '#f8fafc' }]}
                        />
                      </View>

                      <TextInput
                        value={newImageUrl}
                        onChangeText={setNewImageUrl}
                        placeholder="URL de la Foto Oficial del Vehículo"
                        placeholderTextColor={textSecondary}
                        style={[styles.textInput, { color: textPrimary, borderColor: borderModal, backgroundColor: isDark ? '#1c202d' : '#f8fafc' }]}
                      />

                      <TouchableOpacity
                        onPress={handleCreateAndAssignFleetVehicle}
                        disabled={savingNewFleet}
                        style={{
                          backgroundColor: accentBlue,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                        }}
                        activeOpacity={0.8}
                      >
                        {savingNewFleet ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <MaterialIcons name="check" size={16} color="#ffffff" />
                            <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                              Guardar y Asignar a este Operador
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* SECCIÓN 2: PLANTAS ELÉCTRICAS ASIGNADAS AL OPERADOR */}
            <View style={[styles.sectionBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="generator-portable" size={22} color={accentBlue} />
                  <Text style={[styles.sectionTitle, { color: textPrimary, fontFamily: F.bold }]}>
                    Plantas Eléctricas a su Cargo ({selectedPlantIds.size} seleccionadas)
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionDesc, { color: textSecondary, fontFamily: F.medium }]}>
                Selecciona qué grupos electrógenos supervisará este operador. El operador recibirá las citas de agenda, solicitudes y problemas reportados por los clientes de estas plantas.
              </Text>

              {/* BUSCADOR DE PLANTAS */}
              <View style={[styles.plantSearchRow, { borderColor: borderModal, backgroundColor: isDark ? '#141721' : '#ffffff' }]}>
                <MaterialIcons name="search" size={18} color={textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar por planta, cliente, ubicación o serial..."
                  placeholderTextColor={textSecondary}
                  style={[styles.searchInput, { color: textPrimary, fontFamily: F.medium }]}
                />
              </View>

              {/* LISTADO DE PLANTAS */}
              {loadingPlants ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={accentBlue} />
                  <Text style={{ color: textSecondary, fontFamily: F.medium, marginTop: 8, fontSize: 12 }}>
                    Cargando plantas registradas...
                  </Text>
                </View>
              ) : filteredPlants.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <MaterialIcons name="inventory-2" size={32} color={textSecondary} />
                  <Text style={{ color: textSecondary, fontFamily: F.medium, marginTop: 8, fontSize: 12 }}>
                    No se encontraron plantas que coincidan con la búsqueda.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {filteredPlants.map((plant) => {
                    const isSelected = selectedPlantIds.has(plant.id);
                    const isAssignedOther =
                      plant.assigned_operator_id &&
                      plant.assigned_operator_id !== operator.id;

                    return (
                      <TouchableOpacity
                        key={plant.id}
                        onPress={() => togglePlantSelection(plant.id)}
                        activeOpacity={0.8}
                        style={[
                          styles.plantItemCard,
                          {
                            backgroundColor: isDark ? '#141721' : '#ffffff',
                            borderColor: isSelected
                              ? accentBlue
                              : borderModal,
                            borderWidth: isSelected ? 1.8 : 1,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                          <View
                            style={[
                              styles.checkboxCircle,
                              {
                                backgroundColor: isSelected ? accentBlue : 'transparent',
                                borderColor: isSelected ? accentBlue : textSecondary,
                              },
                            ]}
                          >
                            {isSelected && <MaterialIcons name="check" size={14} color="#ffffff" />}
                          </View>

                          <View style={{ flex: 1 }}>
                            {/* TOP ROW: BRAND & MODEL */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.plantModelText, { color: textPrimary, fontFamily: F.extrabold }]}>
                                {plant.brand} {plant.model}
                              </Text>
                              <View style={[styles.powerTag, { backgroundColor: 'rgba(26, 92, 255, 0.12)' }]}>
                                <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 11 }}>
                                  {plant.power_kva} kVA ({plant.power_kw} kW)
                                </Text>
                              </View>
                            </View>

                            {/* CLIENTE DUEÑO */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <MaterialIcons name="person" size={14} color={accentCyan} />
                              <Text style={[styles.clientText, { color: textPrimary, fontFamily: F.bold }]}>
                                Cliente: {plant.client_name}
                              </Text>
                              <Text style={[styles.clientEmailText, { color: textSecondary, fontFamily: F.medium }]}>
                                ({plant.client_email})
                              </Text>
                            </View>

                            {/* UBICACIÓN EXACTA */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <MaterialIcons name="place" size={14} color="#f59e0b" />
                              <Text style={[styles.locationText, { color: textSecondary, fontFamily: F.medium }]}>
                                {plant.location || 'Sede Principal / En sitio'}
                              </Text>
                            </View>

                            {/* SERIAL Y HORÓMETRO */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>
                                Serial: <Text style={{ color: textPrimary }}>{plant.serial_number}</Text>
                              </Text>
                              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>
                                Horómetro: <Text style={{ color: textPrimary }}>{plant.current_hours} hrs</Text>
                              </Text>
                            </View>

                            {/* STATUS DE ASIGNACIÓN */}
                            {isAssignedOther && (
                              <View style={{ marginTop: 6 }}>
                                <Text style={{ fontFamily: F.bold, color: '#f59e0b', fontSize: 10.5 }}>
                                  ⚠️ Actualmente a cargo de: {plant.assigned_operator_name || 'Otro operador'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

          </ScrollView>

          {/* FOOTER ACTIONS */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: borderModal }]}>
              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 13 }}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveAssignments}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="#ffffff" />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                    Guardar Asignaciones ({selectedPlantIds.size} plantas)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

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
    maxWidth: 720,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  headerRow: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    padding: 24,
  },
  sectionBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  vehicleInputsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  textInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  plantSearchRow: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  plantItemCard: {
    padding: 14,
    borderRadius: 16,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  plantModelText: {
    fontSize: 14,
  },
  powerTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  clientText: {
    fontSize: 12,
  },
  clientEmailText: {
    fontSize: 11,
  },
  locationText: {
    fontSize: 11.5,
  },
  footerRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
});
