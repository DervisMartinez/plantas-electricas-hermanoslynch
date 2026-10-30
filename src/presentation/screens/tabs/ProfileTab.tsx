// Run: npx expo install expo-image-picker
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Linking
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../../data/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { TutorialModal } from '../../components/TutorialModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LegalDocModal, LegalDocType } from '../../components/LegalDocModal';
import { AssignedOperatorModal } from '../../components/AssignedOperatorModal';
import { isWebPlatform } from '../../utils/platformMode';
import { isCar, isPlanta } from '../../../domain/entities/Moto';
import { VehicleReportModal } from '../../components/VehicleReportModal';
import { UserManagementModal } from '../../components/UserManagementModal';

interface ProfileTabProps {
  onOpenReport?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onOpenReport }) => {
  const { 
    myMoto, 
    motos, 
    selectMoto, 
    deleteMoto, 
    updateMoto, 
    logout, 
    setIsAddingMoto, 
    drivesCompanyVehicle, 
    setDrivesCompanyVehicle,
    userRole,
    isAdmin,
    isSuperAdmin,
    userName,
    userRoleTitle,
    superAdminsList,
    operatorsList,
    clientsList,
    pendingUsersList,
    loadSystemUsers
  } = useMyMoto();
  const { colors, mode, isDark, toggleTheme } = useTheme();
  
  const isVehiclePlanta = isPlanta(myMoto);
  
  const [userData, setUserData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserMgmtModal, setShowUserMgmtModal] = useState(false);

  // Super Admin Executive Classifier State
  const [execTab, setExecTab] = useState<'plants' | 'operators' | 'users'>('plants');
  const [execCountry, setExecCountry] = useState('Todos');
  const [execZone, setExecZone] = useState('Todas');
  const [execState, setExecState] = useState('Todos');
  const [execDept, setExecDept] = useState('Todos');
  const [execCategory, setExecCategory] = useState('Todas');
  const [execSearch, setExecSearch] = useState('');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [docId, setDocId] = useState('');
  const [city, setCity] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');

  const [motoYear, setMotoYear] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [assignedVehicleProfile, setAssignedVehicleProfile] = useState<{
    name?: string;
    plate?: string;
    imageUrl?: string;
    odometer?: number;
  } | null>(null);

  // Legal Modal Management
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocType>('terms');
  const [showSOSModal, setShowSOSModal] = useState(false);

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  useEffect(() => {
    // 1. Load local cached avatar immediately
    AsyncStorage.getItem('@user_avatar_url').then(cached => {
      if (cached) setLocalAvatarUri(cached);
    });

    // 2. Load local cached profile data immediately so fields are never empty
    AsyncStorage.getItem('@user_profile_data').then(cached => {
      if (cached) {
        try {
          const p = JSON.parse(cached);
          if (p.first_name) setFirstName(p.first_name);
          if (p.last_name) setLastName(p.last_name);
          if (p.phone) setPhone(p.phone);
          if (p.document_id) setDocId(p.document_id);
          if (p.city) setCity(p.city);
          if (p.blood_type) setBloodType(p.blood_type);
          if (p.emergency_contact_name) setEmergencyContact(p.emergency_contact_name);
          if (p.emergency_contact_phone) setEmergencyPhone(p.emergency_contact_phone);
          if (p.emergency_email) setEmergencyEmail(p.emergency_email);
        } catch (e) {}
      }
    });

    // 3. Sync from Supabase session
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserData(data.user);
        const meta = data.user.user_metadata || {};
        if (meta.first_name) setFirstName(meta.first_name);
        if (meta.last_name) setLastName(meta.last_name);
        if (meta.phone) setPhone(meta.phone);
        if (meta.document_id || meta.dni) setDocId(meta.document_id || meta.dni);
        if (meta.city || meta.state) setCity(meta.city || meta.state);
        if (meta.blood_type) setBloodType(meta.blood_type);
        if (meta.emergency_contact_name) setEmergencyContact(meta.emergency_contact_name);
        if (meta.emergency_contact_phone) setEmergencyPhone(meta.emergency_contact_phone);
        if (meta.emergency_email) setEmergencyEmail(meta.emergency_email);

        if (meta.avatar_url) {
          setLocalAvatarUri(meta.avatar_url);
          AsyncStorage.setItem('@user_avatar_url', meta.avatar_url);
        }

        // Consultar asignación oficial de flota en perfil
        supabase
          .from('profiles')
          .select('drives_company_vehicle, assigned_vehicle_name, assigned_vehicle_plate, assigned_vehicle_image')
          .eq('id', data.user.id)
          .single()
          .then(({ data: prof }) => {
            if (prof && prof.assigned_vehicle_name) {
              setAssignedVehicleProfile({
                name: prof.assigned_vehicle_name,
                plate: prof.assigned_vehicle_plate,
                imageUrl: prof.assigned_vehicle_image,
              });
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      loadSystemUsers();
    }
  }, [isSuperAdmin, isAdmin, loadSystemUsers]);

  useEffect(() => {
    if (myMoto) {
      setMotoYear(myMoto.year.toString());
    }
  }, [myMoto?.year, myMoto?.id]);

  if (!myMoto) return null;

  const isOperatorOrAdmin = isAdmin || userRole === 'admin';
  const displayName = firstName || userName || (isSuperAdmin ? 'Kalioverload' : (isOperatorOrAdmin ? 'Operador Técnico' : 'Titular de Planta'));
  const displayLastName = lastName || '';
  const avatarUrl = localAvatarUri || userData?.user_metadata?.avatar_url;

  const plantasBajoControl = useMemo(() => {
    return (motos || []).filter((m) => isPlanta(m));
  }, [motos]);

  const vehiculosAsignados = useMemo(() => {
    return (motos || []).filter((m) => isCar(m) || m.vehicleType === 'car');
  }, [motos]);

  // Helper to resolve geographical & categorical metadata for any plant or user
  const getZoneFromState = (st: string) => {
    const s = (st || '').toLowerCase();
    if (s.includes('capital') || s.includes('caracas') || s.includes('miranda')) return 'Zona Capital';
    if (s.includes('zulia') || s.includes('lara') || s.includes('falc')) return 'Zona Occidental';
    if (s.includes('anzo') || s.includes('bol') || s.includes('monagas') || s.includes('sucre')) return 'Zona Oriental';
    if (s.includes('táchira') || s.includes('tachira') || s.includes('mérida') || s.includes('merida')) return 'Zona Andina';
    return 'Zona Central';
  };

  const enrichedPlants = useMemo(() => {
    return plantasBajoControl.map((m, idx) => {
      const loc = (m.location || '').toLowerCase();
      const country = (m as any).country || (loc.includes('colombia') || loc.includes('bogot') ? 'Colombia' : loc.includes('panam') ? 'Panamá' : loc.includes('ee.uu') || loc.includes('miami') ? 'EE.UU.' : 'Venezuela');
      const state = (m as any).state || (loc.includes('caracas') || loc.includes('capital') ? 'Distrito Capital' : loc.includes('miranda') ? 'Miranda' : loc.includes('zulia') || loc.includes('maracaibo') ? 'Zulia' : loc.includes('aragua') || loc.includes('maracay') ? 'Aragua' : loc.includes('lara') ? 'Lara' : idx % 3 === 1 ? 'Distrito Capital' : idx % 3 === 2 ? 'Miranda' : 'Carabobo');
      const zone = (m as any).zone || getZoneFromState(state);
      const kva = m.powerKva || 35;
      const department = (m as any).department || (kva >= 100 ? 'Generación Eléctrica' : kva >= 50 ? 'Media Tensión' : 'Mantenimiento Preventivo');
      const category = kva >= 100 ? 'Alta Capacidad (≥100 kVA)' : kva >= 50 ? 'Media Capacidad (50-99 kVA)' : 'Compactas (<50 kVA)';
      return {
        ...m,
        metaCountry: country,
        metaState: state,
        metaZone: zone,
        metaDept: department,
        metaCategory: category,
      };
    });
  }, [plantasBajoControl]);

  const allSystemUsers = useMemo(() => {
    const map = new Map<string, any>();
    (superAdminsList || []).forEach((u: any) => map.set(u.id, { ...u, resolvedRole: 'superadmin' }));
    (operatorsList || []).forEach((u: any) => {
      if (!map.has(u.id)) map.set(u.id, { ...u, resolvedRole: 'operator' });
    });
    (clientsList || []).forEach((u: any) => {
      if (!map.has(u.id)) map.set(u.id, { ...u, resolvedRole: 'client' });
    });
    (pendingUsersList || []).forEach((u: any) => {
      if (!map.has(u.id)) map.set(u.id, { ...u, resolvedRole: u.role || 'operator', isPending: true });
    });
    return Array.from(map.values()).map((u: any) => {
      const loc = (u.state || u.city || '').toLowerCase();
      const country = u.country || (loc.includes('colombia') || loc.includes('bogot') ? 'Colombia' : loc.includes('panam') ? 'Panamá' : loc.includes('miami') ? 'EE.UU.' : 'Venezuela');
      const state = u.state || u.city || 'Carabobo';
      const zone = u.zone || getZoneFromState(state);
      const dept = u.department || u.specialty || (u.resolvedRole === 'superadmin' ? 'Dirección Ejecutiva' : u.resolvedRole === 'client' ? 'Clientes Corporativos' : 'Generación Eléctrica');
      const category = u.resolvedRole === 'superadmin' ? 'Super Admins (Jefes)' : u.resolvedRole === 'operator' ? 'Operadores Técnicos' : 'Clientes / Empresas';
      return {
        ...u,
        metaCountry: country,
        metaState: state,
        metaZone: zone,
        metaDept: dept,
        metaCategory: category,
      };
    });
  }, [superAdminsList, operatorsList, clientsList, pendingUsersList]);

  const filteredExecPlants = useMemo(() => {
    return enrichedPlants.filter((p) => {
      if (execCountry !== 'Todos' && p.metaCountry.toLowerCase() !== execCountry.toLowerCase()) return false;
      if (execZone !== 'Todas' && p.metaZone.toLowerCase() !== execZone.toLowerCase()) return false;
      if (execState !== 'Todos' && !p.metaState.toLowerCase().includes(execState.toLowerCase())) return false;
      if (execDept !== 'Todos' && !p.metaDept.toLowerCase().includes(execDept.toLowerCase())) return false;
      if (execCategory !== 'Todas') {
        if (execCategory === 'Disponibles en Red' && false) return false;
        if (
          execCategory !== 'Disponibles en Red' &&
          p.metaCategory !== execCategory &&
          !(execCategory === 'Diésel Industrial' && (p.fuelType || 'Diesel').toLowerCase().includes('diesel'))
        ) {
          return false;
        }
      }
      if (execSearch.trim()) {
        const q = execSearch.toLowerCase().trim();
        const match =
          (p.brand || '').toLowerCase().includes(q) ||
          (p.model || '').toLowerCase().includes(q) ||
          (p.serialNumber || p.plate || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          p.metaState.toLowerCase().includes(q) ||
          p.metaCountry.toLowerCase().includes(q) ||
          p.metaCategory.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [enrichedPlants, execCountry, execZone, execState, execDept, execCategory, execSearch]);

  const filteredExecUsers = useMemo(() => {
    const base = execTab === 'operators'
      ? allSystemUsers.filter((u) => u.resolvedRole === 'operator')
      : allSystemUsers;

    return base.filter((u) => {
      if (execCountry !== 'Todos' && u.metaCountry.toLowerCase() !== execCountry.toLowerCase()) return false;
      if (execZone !== 'Todas' && u.metaZone.toLowerCase() !== execZone.toLowerCase()) return false;
      if (execState !== 'Todos' && !u.metaState.toLowerCase().includes(execState.toLowerCase())) return false;
      if (execDept !== 'Todos' && !u.metaDept.toLowerCase().includes(execDept.toLowerCase())) return false;
      if (execCategory !== 'Todas') {
        if (execCategory === 'Con Móvil de Flota') {
          if (!u.drives_company_vehicle && !u.assigned_vehicle_name) return false;
        } else if (u.metaCategory !== execCategory) {
          return false;
        }
      }
      if (execSearch.trim()) {
        const q = execSearch.toLowerCase().trim();
        const match =
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.operator_code || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q) ||
          u.metaState.toLowerCase().includes(q) ||
          u.metaCountry.toLowerCase().includes(q) ||
          u.metaDept.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allSystemUsers, execTab, execCountry, execZone, execState, execDept, execCategory, execSearch]);

  const actualFleetVehicle = useMemo(() => {
    if (vehiculosAsignados.length > 0) {
      return vehiculosAsignados[0];
    }
    if (assignedVehicleProfile?.name) {
      return {
        brand: assignedVehicleProfile.name,
        model: '',
        plate: assignedVehicleProfile.plate || 'OFICIAL',
        imageUrl: assignedVehicleProfile.imageUrl,
        currentOdometer: assignedVehicleProfile.odometer || 0,
      };
    }
    return null;
  }, [vehiculosAsignados, assignedVehicleProfile]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setUploading(true);
        
        let userId = userData?.id;
        if (!userId) {
          const { data: authData } = await supabase.auth.getUser();
          userId = authData?.user?.id;
        }

        if (!userId) {
          Alert.alert('Error', 'No se pudo identificar tu sesión de usuario');
          return;
        }

        const fileUri = result.assets[0].uri;
        const ext = fileUri.substring(fileUri.lastIndexOf('.') + 1) || 'jpg';
        const path = `${userId}/avatar.${ext}`;
        
        const response = await fetch(fileUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, {
            contentType: `image/${ext}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        const freshUrl = `${publicUrl}?t=${Date.now()}`;

        setLocalAvatarUri(freshUrl);
        await AsyncStorage.setItem('@user_avatar_url', freshUrl);

        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: freshUrl }
        });

        if (updateError) throw updateError;
        
        if (updateData?.user) {
          setUserData(updateData.user);
        }
        
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la foto de perfil');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfileData = async () => {
    setSavingProfile(true);
    try {
      const profilePayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        document_id: docId.trim(),
        city: city.trim(),
        blood_type: bloodType,
        emergency_contact_name: emergencyContact.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_email: emergencyEmail.trim(),
      };

      // 1. Persist locally to device storage immediately
      await AsyncStorage.setItem('@user_profile_data', JSON.stringify(profilePayload));

      // 2. Persist to Supabase auth user metadata
      const { data: updateData, error } = await supabase.auth.updateUser({
        data: profilePayload
      });

      if (error) {
        console.warn('Supabase updateUser notice:', error);
      }
      if (updateData?.user) {
        setUserData(updateData.user);
      }
      Alert.alert('Perfil Guardado', 'Tus datos personales y de emergencia han sido guardados con éxito.');
    } catch (e: any) {
      Alert.alert('Perfil Guardado', 'Tus datos se guardaron localmente en el dispositivo.');
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmDeleteMoto = (id: string, name?: string) => {
    const label = name ? `el vehículo "${name}"` : 'este vehículo';
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar ${label}? Esta acción no se puede deshacer.`);
      if (confirmed) {
        deleteMoto(id);
      }
      return;
    }
    Alert.alert(
      'Eliminar Vehículo',
      `¿Estás seguro de que deseas eliminar ${label}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMoto(id) }
      ]
    );
  };

  const handleAddMoto = () => {
    setIsAddingMoto(true);
  };

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, width: '100%', backgroundColor: isDark ? '#0c0d12' : colors.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
          
          {/* PROFILE AVATAR & HEADER */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={pickImage} disabled={uploading} style={[styles.avatarBox, { backgroundColor: colors.primary }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 38, fontFamily: F.bold, color: colors.onPrimary }}>
                  {displayName.charAt(0)}{displayLastName.charAt(0)}
                </Text>
              )}
              {uploading && (
                 <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                   <ActivityIndicator color="#FFF" />
                 </View>
              )}
              <View style={styles.cameraIconBadge}>
                <MaterialIcons name="photo-camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            
            <Text style={{ fontSize: 22, fontFamily: F.bold, color: colors.onSurface, marginTop: 12 }}>
              {displayName} {displayLastName}
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isOperatorOrAdmin ? 'rgba(26, 92, 255, 0.15)' : 'rgba(0, 180, 216, 0.15)',
              borderColor: isOperatorOrAdmin ? '#1a5cff' : '#00b4d8',
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 14,
              marginTop: 6
            }}>
              <MaterialIcons
                name={isOperatorOrAdmin ? "verified-user" : "badge"}
                size={14}
                color={isOperatorOrAdmin ? "#1a5cff" : "#00b4d8"}
              />
              <Text style={{
                fontFamily: F.bold,
                fontSize: 11,
                color: isSuperAdmin ? (isDark ? '#00e3fd' : '#0284c7') : (isOperatorOrAdmin ? (isDark ? '#60a5fa' : '#1a5cff') : (isDark ? '#38bdf8' : '#0284c7')),
                letterSpacing: 0.5
              }}>
                {isSuperAdmin
                  ? 'JEFE / SUPER ADMINISTRADOR • ACCESO TOTAL'
                  : (isOperatorOrAdmin ? 'OPERADOR TÉCNICO • HERMANOS LYNCH' : 'CLIENTE / TITULAR DE PLANTA')}
              </Text>
            </View>

            <Text style={{ fontSize: 13, fontFamily: F.medium, color: colors.onSurfaceVariant, marginTop: 6 }}>
              {userData?.email || (isSuperAdmin ? 'direccion@hermanoslynch.com' : (isOperatorOrAdmin ? 'operaciones@hermanoslynch.com' : 'cliente@empresa.com'))}
            </Text>
          </View>

          {/* SECCIÓN 1: DATOS PERSONALES DEL DIRECTOR / OPERADOR / RESPONSABLE */}
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 15, fontFamily: F.bold, color: colors.onSurface }}>
                {isSuperAdmin
                  ? 'Credenciales Ejecutivas — Dirección General'
                  : (isOperatorOrAdmin ? 'Ficha Técnica del Operador' : 'Datos del Responsable de Planta')}
              </Text>
              <MaterialIcons name={isSuperAdmin ? "admin-panel-settings" : "person-outline"} size={20} color={colors.primary} />
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Nombre</Text>
                  <TextInput 
                    style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.onSurfaceVariant}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Apellido</Text>
                  <TextInput 
                    style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Tu apellido"
                    placeholderTextColor={colors.onSurfaceVariant}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Cédula / DNI</Text>
                  <TextInput 
                    style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                    value={docId}
                    onChangeText={setDocId}
                    placeholder="V-12345678"
                    placeholderTextColor={colors.onSurfaceVariant}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Teléfono / WhatsApp</Text>
                  <TextInput 
                    style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+58 412..."
                    placeholderTextColor={colors.onSurfaceVariant}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Ciudad / Ubicación</Text>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ej. Caracas, Miranda"
                  placeholderTextColor={colors.onSurfaceVariant}
                />
              </View>
            </View>
          </View>

          {/* SECCIÓN 2: SEGURIDAD Y CONTACTO DE EMERGENCIA */}
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="shield-cross" size={20} color="#FF453A" />
                <Text style={{ fontSize: 15, fontFamily: F.bold, color: colors.onSurface }}>Ficha Médica & Emergencia</Text>
              </View>
              <View style={[styles.alertPill, { backgroundColor: 'rgba(255,69,58,0.15)' }]}>
                <Text style={{ fontFamily: F.bold, color: '#FF453A', fontSize: 10 }}>VITAL</Text>
              </View>
            </View>

            {/* Selector de Tipo de Sangre */}
            <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Tipo de Sangre:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {bloodTypes.map(bt => (
                <TouchableOpacity
                  key={bt}
                  onPress={() => setBloodType(bt)}
                  style={[
                    styles.bloodChip,
                    { 
                      backgroundColor: bloodType === bt ? colors.primary : colors.surfaceContainer,
                      borderColor: colors.outlineVariant 
                    }
                  ]}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 12, color: bloodType === bt ? colors.onPrimary : colors.onSurface }}>
                    {bt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ gap: 10 }}>
              <View>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Nombre Contacto de Emergencia</Text>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  placeholder="Ej. Esposa / Madre / Hermano"
                  placeholderTextColor={colors.onSurfaceVariant}
                />
              </View>
              
              <View>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Teléfono de Emergencia</Text>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder="+58 424..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>Correo Familiar Designado (Aviso GPS / SOS)</Text>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.medium }]} 
                  value={emergencyEmail}
                  onChangeText={setEmergencyEmail}
                  placeholder="familiar@correo.com"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Botón Guardar Cambios del Perfil */}
            <TouchableOpacity 
              onPress={handleSaveProfileData} 
              disabled={savingProfile}
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            >
              {savingProfile ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="save" size={18} color={colors.onPrimary} />
                  <Text style={{ fontFamily: F.bold, color: colors.onPrimary, fontSize: 14 }}>
                    {isSuperAdmin
                      ? 'Guardar Credenciales Ejecutivas'
                      : (isOperatorOrAdmin ? 'Guardar Ficha del Operador' : 'Guardar Datos del Perfil')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Ficha del Operador Asignado (Solo visible para Clientes) */}
            {!isOperatorOrAdmin && isWebPlatform() && (
              <TouchableOpacity 
                onPress={() => setShowSOSModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 180, 216, 0.12)',
                  borderColor: 'rgba(0, 180, 216, 0.45)',
                  borderWidth: 1,
                  paddingVertical: 11,
                  borderRadius: 14,
                  marginTop: 10,
                  gap: 8,
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="support-agent" size={18} color="#00b4d8" />
                <Text style={{ fontFamily: F.bold, color: '#00b4d8', fontSize: 13, letterSpacing: 0.3 }}>
                  Ver Ficha del Operador Asignado
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ======================================================================== */}
          {/* CENTRO DE MANDO & CLASIFICADOR GLOBAL (EXCLUSIVO DEL JEFE / SUPER ADMIN) */}
          {/* ======================================================================== */}
          {isSuperAdmin && (
            <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: isDark ? 'rgba(0, 227, 253, 0.35)' : 'rgba(2, 132, 199, 0.35)', borderWidth: 1 }]}>
              {/* Header Ejecutivo */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, minWidth: 240 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <MaterialIcons name="admin-panel-settings" size={22} color={isDark ? '#00e3fd' : '#0284c7'} />
                    <Text style={{ fontSize: 16, fontFamily: F.extrabold, color: colors.onSurface }}>
                      Centro de Mando & Clasificador Global
                    </Text>
                  </View>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 17 }}>
                    Como Super Administrador tienes acceso total al listado de usuarios, personal operador y máquinas/plantas disponibles, sin tener unidades asignadas como operador de campo.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    onPress={() => {
                      loadSystemUsers();
                      setShowUserMgmtModal(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#2563eb',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="manage-accounts" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11.5 }}>
                      Control de Usuarios
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAddMoto}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: isDark ? 'rgba(0, 227, 253, 0.14)' : 'rgba(2, 132, 199, 0.12)',
                      borderColor: isDark ? '#00e3fd' : '#0284c7',
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add-circle-outline" size={16} color={isDark ? '#00e3fd' : '#0284c7'} />
                    <Text style={{ fontFamily: F.bold, color: isDark ? '#00e3fd' : '#0284c7', fontSize: 11.5 }}>
                      Incorporar Máquina
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* KPIs de Dirección General */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, minWidth: 130, backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>Total Usuarios</Text>
                  <Text style={{ fontFamily: F.extrabold, color: isDark ? '#00e3fd' : '#0284c7', fontSize: 20, marginTop: 2 }}>{allSystemUsers.length}</Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 10 }}>Directorio global</Text>
                </View>
                <View style={{ flex: 1, minWidth: 130, backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>Personal Operador</Text>
                  <Text style={{ fontFamily: F.extrabold, color: '#2563eb', fontSize: 20, marginTop: 2 }}>{(operatorsList || []).length}</Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 10 }}>Técnicos activos</Text>
                </View>
                <View style={{ flex: 1, minWidth: 130, backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>Máquinas / Plantas</Text>
                  <Text style={{ fontFamily: F.extrabold, color: '#16a34a', fontSize: 20, marginTop: 2 }}>{enrichedPlants.length}</Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 10 }}>Disponibles en red</Text>
                </View>
                <View style={{ flex: 1, minWidth: 130, backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>Super Admins</Text>
                  <Text style={{ fontFamily: F.extrabold, color: '#d97706', fontSize: 20, marginTop: 2 }}>{Math.max((superAdminsList || []).length, 1)}</Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 10 }}>Jefes / Directores</Text>
                </View>
              </View>

              {/* Pestañas de Entidad a Clasificar */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {[
                  { id: 'plants' as const, label: `Máquinas / Plantas Disponibles (${enrichedPlants.length})`, icon: 'bolt' },
                  { id: 'operators' as const, label: `Personal Operador (${(operatorsList || []).length})`, icon: 'engineering' },
                  { id: 'users' as const, label: `Listado de Usuarios (${allSystemUsers.length})`, icon: 'groups' },
                ].map((tab) => {
                  const active = execTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => {
                        setExecTab(tab.id);
                        setExecCategory('Todas');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: active ? '#2563eb' : colors.surfaceContainer,
                        borderColor: active ? '#2563eb' : colors.outlineVariant,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 12,
                      }}
                    >
                      <MaterialIcons name={tab.icon as any} size={16} color={active ? '#ffffff' : colors.onSurfaceVariant} />
                      <Text style={{ fontFamily: F.bold, color: active ? '#ffffff' : colors.onSurface, fontSize: 12 }}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Buscador Global + Botón Reset */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.outlineVariant,
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                }}>
                  <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
                  <TextInput
                    value={execSearch}
                    onChangeText={setExecSearch}
                    placeholder="Buscar por nombre, modelo, serial, estado, departamento o país..."
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={{ flex: 1, fontFamily: F.medium, color: colors.onSurface, fontSize: 12.5, paddingVertical: 2 }}
                  />
                  {execSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setExecSearch('')}>
                      <MaterialIcons name="clear" size={16} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                </View>

                {(execCountry !== 'Todos' || execZone !== 'Todas' || execState !== 'Todos' || execDept !== 'Todos' || execCategory !== 'Todas' || execSearch !== '') && (
                  <TouchableOpacity
                    onPress={() => {
                      setExecCountry('Todos');
                      setExecZone('Todas');
                      setExecState('Todos');
                      setExecDept('Todos');
                      setExecCategory('Todas');
                      setExecSearch('');
                    }}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.14)',
                      borderColor: '#ef4444',
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 9,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontFamily: F.bold, color: '#ef4444', fontSize: 11 }}>Limpiar Filtros</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtros Multi-Criterio: PAÍS, ZONA, ESTADO, DEPARTAMENTO, CATEGORÍA */}
              <View style={{ backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, gap: 8, marginBottom: 14 }}>
                {/* 1. PAÍS */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10.5, width: 92 }}>PAÍS:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Todos', 'Venezuela', 'Colombia', 'Panamá', 'EE.UU.'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setExecCountry(c)}
                        style={{
                          backgroundColor: execCountry === c ? '#00e3fd' : colors.surfaceContainerLow,
                          borderColor: execCountry === c ? '#00e3fd' : colors.outlineVariant,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontFamily: execCountry === c ? F.bold : F.medium, color: execCountry === c ? '#0c0d12' : colors.onSurfaceVariant, fontSize: 11 }}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 2. ZONA */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10.5, width: 92 }}>ZONA:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Todas', 'Zona Central', 'Zona Capital', 'Zona Occidental', 'Zona Oriental', 'Zona Andina'].map((z) => (
                      <TouchableOpacity
                        key={z}
                        onPress={() => setExecZone(z)}
                        style={{
                          backgroundColor: execZone === z ? '#2563eb' : colors.surfaceContainerLow,
                          borderColor: execZone === z ? '#2563eb' : colors.outlineVariant,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontFamily: execZone === z ? F.bold : F.medium, color: execZone === z ? '#ffffff' : colors.onSurfaceVariant, fontSize: 11 }}>
                          {z}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. ESTADO */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10.5, width: 92 }}>ESTADO:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Todos', 'Carabobo', 'Distrito Capital', 'Miranda', 'Aragua', 'Zulia', 'Lara', 'Anzoátegui', 'Táchira', 'Bolívar'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setExecState(st)}
                        style={{
                          backgroundColor: execState === st ? '#2563eb' : colors.surfaceContainerLow,
                          borderColor: execState === st ? '#2563eb' : colors.outlineVariant,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontFamily: execState === st ? F.bold : F.medium, color: execState === st ? '#ffffff' : colors.onSurfaceVariant, fontSize: 11 }}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 4. DEPARTAMENTO */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10.5, width: 92 }}>DPTO:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Todos', 'Generación Eléctrica', 'Mantenimiento Preventivo', 'Media Tensión', 'Electrónica ComAp', 'Dirección Ejecutiva', 'Clientes Corporativos'].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setExecDept(d)}
                        style={{
                          backgroundColor: execDept === d ? '#00e3fd' : colors.surfaceContainerLow,
                          borderColor: execDept === d ? '#00e3fd' : colors.outlineVariant,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontFamily: execDept === d ? F.bold : F.medium, color: execDept === d ? '#0c0d12' : colors.onSurfaceVariant, fontSize: 11 }}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 5. CATEGORÍA */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, fontSize: 10.5, width: 92 }}>CATEGORÍA:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {(execTab === 'plants'
                      ? ['Todas', 'Alta Capacidad (≥100 kVA)', 'Media Capacidad (50-99 kVA)', 'Compactas (<50 kVA)', 'Diésel Industrial', 'Disponibles en Red']
                      : ['Todas', 'Super Admins (Jefes)', 'Operadores Técnicos', 'Clientes / Empresas', 'Con Móvil de Flota']
                    ).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setExecCategory(cat)}
                        style={{
                          backgroundColor: execCategory === cat ? '#22c55e' : colors.surfaceContainerLow,
                          borderColor: execCategory === cat ? '#22c55e' : colors.outlineVariant,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontFamily: execCategory === cat ? F.bold : F.medium, color: execCategory === cat ? '#0c0d12' : colors.onSurfaceVariant, fontSize: 11 }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* RESULTADOS DEL CLASIFICADOR GLOBAL */}
              {execTab === 'plants' ? (
                <View style={{ gap: 10 }}>
                  {filteredExecPlants.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.outlineVariant }}>
                      <MaterialCommunityIcons name="generator-portable" size={32} color={colors.onSurfaceVariant} />
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, marginTop: 8 }}>
                        No hay máquinas disponibles con esta clasificación
                      </Text>
                    </View>
                  ) : (
                    filteredExecPlants.map((m) => {
                      const isAudited = m.id === myMoto.id;
                      return (
                        <View
                          key={m.id}
                          style={{
                            backgroundColor: colors.surfaceContainer,
                            padding: 14,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: isAudited ? (isDark ? '#00e3fd' : '#0284c7') : colors.outlineVariant,
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <MaterialCommunityIcons name="generator-portable" size={22} color={isDark ? '#00e3fd' : '#0284c7'} />
                              <View>
                                <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 14 }}>
                                  {m.brand} {m.model} • {m.powerKva || 35} kVA
                                </Text>
                                <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11 }}>
                                  Serial: {m.serialNumber || m.plate || `BPG-${m.model}`} · Combustible: {m.fuelType || 'Diesel'} · {(m.currentHours || m.currentOdometer || 0)} hrs
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                <Text style={{ fontFamily: F.bold, color: '#16a34a', fontSize: 10 }}>DISPONIBLE EN RED</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => selectMoto(m.id)}
                                style={{
                                  backgroundColor: isAudited ? (isDark ? '#00e3fd' : '#0284c7') : '#2563eb',
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                }}
                              >
                                <Text style={{ fontFamily: F.bold, color: isAudited ? (isDark ? '#0c0d12' : '#ffffff') : '#ffffff', fontSize: 10.5 }}>
                                  {isAudited ? 'AUDITANDO TELEMETRÍA' : 'AUDITAR PLANTA'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Etiquetas de Clasificación Territorial y Categoría */}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(0, 227, 253, 0.12)' : 'rgba(2, 132, 199, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#00e3fd' : '#0284c7', fontSize: 10 }}>🌍 País: {m.metaCountry}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#60a5fa' : '#1d4ed8', fontSize: 10 }}>🗺️ {m.metaZone}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#fbbf24' : '#b45309', fontSize: 10 }}>📍 Estado: {m.metaState}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#c4b5fd' : '#6d28d9', fontSize: 10 }}>🏢 Dpto: {m.metaDept}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#4ade80' : '#15803d', fontSize: 10 }}>🏷️ {m.metaCategory}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {filteredExecUsers.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.outlineVariant }}>
                      <MaterialIcons name="groups" size={32} color={colors.onSurfaceVariant} />
                      <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, marginTop: 8 }}>
                        No se encontraron usuarios o personal en esta clasificación
                      </Text>
                    </View>
                  ) : (
                    filteredExecUsers.map((u: any) => {
                      const roleBadgeColor = u.resolvedRole === 'superadmin' ? (isDark ? '#00e3fd' : '#0284c7') : u.resolvedRole === 'operator' ? '#2563eb' : '#16a34a';
                      const roleLabel = u.resolvedRole === 'superadmin' ? 'JEFE / SUPER ADMIN' : u.resolvedRole === 'operator' ? 'PERSONAL OPERADOR' : 'CLIENTE / TITULAR';
                      return (
                        <View
                          key={u.id}
                          style={{
                            backgroundColor: colors.surfaceContainer,
                            padding: 14,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: colors.outlineVariant,
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: roleBadgeColor, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontFamily: F.bold, color: u.resolvedRole === 'superadmin' && isDark ? '#0c0d12' : '#ffffff', fontSize: 13 }}>
                                  {(u.full_name || u.email || 'U').slice(0, 2).toUpperCase()}
                                </Text>
                              </View>
                              <View>
                                <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 13.5 }}>
                                  {u.full_name || 'Usuario Registrado'}
                                </Text>
                                <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11 }}>
                                  {u.email || 'Sin correo'} {u.operator_code ? `· Carnet: ${u.operator_code}` : ''}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.05)', borderColor: roleBadgeColor, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                <Text style={{ fontFamily: F.bold, color: roleBadgeColor, fontSize: 9.5 }}>{roleLabel}</Text>
                              </View>
                              {u.phone && (
                                <TouchableOpacity
                                  onPress={() => {
                                    const rawDigits = String(u.phone).replace(/\D/g, '');
                                    const ph = rawDigits.startsWith('58') ? rawDigits : ('58' + rawDigits.replace(/^0/, ''));
                                    Linking.openURL('https://wa.me/' + ph).catch(() => {});
                                  }}
                                  style={{ backgroundColor: '#25D366', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                >
                                  <MaterialCommunityIcons name="whatsapp" size={14} color="#ffffff" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <View style={{ backgroundColor: isDark ? 'rgba(0, 227, 253, 0.12)' : 'rgba(2, 132, 199, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#00e3fd' : '#0284c7', fontSize: 10 }}>🌍 País: {u.metaCountry}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#60a5fa' : '#1d4ed8', fontSize: 10 }}>🗺️ {u.metaZone}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#fbbf24' : '#b45309', fontSize: 10 }}>📍 Estado: {u.metaState}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#c4b5fd' : '#6d28d9', fontSize: 10 }}>🏢 Dpto: {u.metaDept}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.semibold, color: isDark ? '#4ade80' : '#15803d', fontSize: 10 }}>🏷️ {u.metaCategory}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}

          {/* SECCIÓN: PLANTAS ELÉCTRICAS BAJO CONTROL / SUPERVISIÓN (SOLO OPERADORES Y CLIENTES, NO SUPER ADMIN) */}
          {!isSuperAdmin && (
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="generator-portable" size={22} color={colors.primary} />
                <Text style={{ fontSize: 15, fontFamily: F.bold, color: colors.onSurface }}>
                  {isOperatorOrAdmin ? 'Plantas Eléctricas Bajo Mi Control' : 'Mis Plantas Eléctricas Registradas'}
                </Text>
              </View>
              <View style={{ backgroundColor: isDark ? 'rgba(0, 227, 253, 0.12)' : 'rgba(39, 95, 227, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>
                  {isOperatorOrAdmin ? 'SUPERVISIÓN TÉCNICA' : 'TELEMETRÍA'}
                </Text>
              </View>
            </View>

            <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 14 }}>
              {isOperatorOrAdmin
                ? 'Grupos electrógenos bajo supervisión directa, mantenimiento preventivo y control de telemetría.'
                : 'Plantas eléctricas vinculadas a tu cuenta con monitoreo de horas y servicio.'}
            </Text>

            <ScrollView 
              horizontal 
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            >
              {(plantasBajoControl.length > 0 ? plantasBajoControl : [myMoto]).map((m) => {
                const isSelected = m.id === myMoto.id;
                return (
                  <TouchableOpacity 
                    key={m.id}
                    onPress={() => selectMoto(m.id)}
                    onLongPress={() => confirmDeleteMoto(m.id)}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: colors.surfaceContainer,
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : (mode === 'dark' ? 'rgba(64, 72, 92, 0.4)' : colors.outlineVariant),
                      minWidth: 200,
                      maxWidth: 240,
                      cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 4 }}>
                        <MaterialCommunityIcons 
                          name="generator-portable" 
                          size={20} 
                          color={isSelected ? colors.primary : colors.onSurfaceVariant} 
                        />
                        <Text style={{ fontFamily: F.bold, color: isSelected ? colors.primary : colors.onSurface, fontSize: 13, flex: 1 }} numberOfLines={1}>
                          {m.brand}
                        </Text>
                      </View>
                      {plantasBajoControl.length > 1 && (
                        <TouchableOpacity 
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            confirmDeleteMoto(m.id, `${m.brand} ${m.model}`);
                          }} 
                          style={{ 
                            padding: 5, 
                            borderRadius: 6,
                            backgroundColor: mode === 'dark' ? 'rgba(255, 69, 58, 0.18)' : 'rgba(255, 69, 58, 0.12)',
                            cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined 
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityLabel="Eliminar planta"
                        >
                          <MaterialIcons name="delete-outline" size={16} color="#FF453A" />
                        </TouchableOpacity>
                      )}
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                      )}
                    </View>
                    
                    <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 15 }} numberOfLines={1}>
                      {m.model}
                    </Text>

                    <Text style={{ fontFamily: F.medium, color: colors.primary, fontSize: 11.5, marginTop: 2 }}>
                      {m.powerKva ? `${m.powerKva} kVA` : `${m.powerKw || 35} kW`} • {m.fuelType || 'Diesel'}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="clock-outline" size={12} color={colors.onSurfaceVariant} />
                        <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11 }}>
                          {m.currentHours || m.currentOdometer || 0} hrs
                        </Text>
                      </View>
                      <View style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontFamily: F.bold, color: colors.secondary, fontSize: 10 }}>
                          {m.serialNumber || m.plate || `BPG-${m.model}`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              <TouchableOpacity
                onPress={handleAddMoto}
                activeOpacity={0.7}
                style={{
                  backgroundColor: mode === 'dark' ? 'rgba(0, 227, 253, 0.08)' : 'rgba(39, 95, 227, 0.06)',
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: mode === 'dark' ? '#00e3fd' : colors.primary,
                  minWidth: 175,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
                }}
              >
                <MaterialIcons name="add-circle" size={26} color={mode === 'dark' ? '#00e3fd' : colors.primary} />
                <Text style={{ fontFamily: F.bold, color: mode === 'dark' ? '#00e3fd' : colors.primary, fontSize: 12, textAlign: 'center' }}>
                  {isOperatorOrAdmin ? 'Anexar planta bajo control' : 'Anexar una nueva planta'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          )}

          {/* SECCIÓN: VEHÍCULOS DE FLOTA ASIGNADOS (MÓVIL DE SOPORTE TÉCNICO - SOLO OPERADORES, NO SUPER ADMIN) */}
          {isOperatorOrAdmin && !isSuperAdmin && (
            <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="local-shipping" size={22} color={colors.primary} />
                  <Text style={{ fontSize: 15, fontFamily: F.bold, color: colors.onSurface }}>
                    Vehículos Asignados de Flota
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(37, 211, 102, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontFamily: F.bold, color: '#25D366', fontSize: 10 }}>MÓVIL DE SOPORTE</Text>
                </View>
              </View>

              <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 14 }}>
                Unidades oficiales de Hermanos Lynch asignadas para inspección en campo, guardias técnicas y traslado de repuestos.
              </Text>

              {/* SWITCH DE CONDUCCIÓN DE VEHÍCULO CORPORATIVO */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: colors.surfaceContainer,
                padding: 12,
                borderRadius: 14,
                marginBottom: drivesCompanyVehicle ? 12 : 0
              }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13 }}>
                    Conduzco Unidad de Flota Oficial
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11.5, marginTop: 2 }}>
                    {drivesCompanyVehicle 
                      ? 'Guantera Digital (Wallet) activa para pólizas, RCV, trimestres y licencias.'
                      : 'Activa si tienes una camioneta o vehículo de asistencia asignado en tu turno.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDrivesCompanyVehicle(!drivesCompanyVehicle)}
                  style={{
                    backgroundColor: drivesCompanyVehicle ? colors.primary : colors.surfaceContainerHigh,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons 
                    name={drivesCompanyVehicle ? "check-circle" : "radio-button-unchecked"} 
                    size={16} 
                    color={drivesCompanyVehicle ? "#FFF" : colors.onSurfaceVariant} 
                  />
                  <Text style={{ fontFamily: F.bold, color: drivesCompanyVehicle ? "#FFF" : colors.onSurfaceVariant, fontSize: 12 }}>
                    {drivesCompanyVehicle ? 'Asignado' : 'Sin Móvil'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TARJETA DEL VEHÍCULO DE FLOTA ASIGNADO */}
              {drivesCompanyVehicle && (
                actualFleetVehicle ? (
                  <View style={{
                    backgroundColor: colors.surfaceContainer,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.outlineVariant,
                    gap: 12
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {actualFleetVehicle.imageUrl ? (
                          <Image
                            source={{ uri: actualFleetVehicle.imageUrl }}
                            style={{ width: 48, height: 48, borderRadius: 12 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: 'rgba(26, 92, 255, 0.15)',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <MaterialIcons name="directions-car" size={24} color="#1a5cff" />
                          </View>
                        )}
                        <View>
                          <Text style={{ fontFamily: F.extrabold, color: colors.onSurface, fontSize: 14 }}>
                            {actualFleetVehicle.brand} {actualFleetVehicle.model}
                          </Text>
                          <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11.5 }}>
                            Vehículo Oficial de Flota Hermanos Lynch
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: 'rgba(26, 92, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontFamily: F.bold, color: '#1a5cff', fontSize: 11 }}>
                          {actualFleetVehicle.plate || 'OFICIAL'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.outlineVariant }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="speed" size={16} color={colors.primary} />
                        <Text style={{ fontFamily: F.semibold, color: colors.onSurface, fontSize: 12 }}>
                          Odómetro Flota: {Number(actualFleetVehicle.currentOdometer || 0).toLocaleString()} km
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="account-balance-wallet" size={16} color="#00e3fd" />
                        <Text style={{ fontFamily: F.bold, color: '#00e3fd', fontSize: 11 }}>
                          Wallet Activa
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: colors.surfaceContainer,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.outlineVariant,
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 18,
                  }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <MaterialIcons name="no-transfer" size={24} color="#f59e0b" />
                    </View>
                    <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 13, textAlign: 'center' }}>
                      Sin Unidad de Flota Asignada
                    </Text>
                    <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 11.5, textAlign: 'center', maxWidth: 360 }}>
                      El Super Administrador aún no ha asignado un vehículo oficial a tu perfil desde el catálogo de flota corporativo.
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <MaterialIcons name="account-balance-wallet" size={15} color="#00e3fd" />
                      <Text style={{ fontFamily: F.bold, color: '#00e3fd', fontSize: 11 }}>
                        Guantera Digital (Wallet) habilitada para tus documentos
                      </Text>
                    </View>
                  </View>
                )
              )}
            </View>
          )}

          {/* GENERADOR DE REPORTE TÉCNICO PDF */}
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: '#0b3b60', borderWidth: 1.2 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="picture-as-pdf" size={22} color="#00e3fd" />
                <Text style={{ fontSize: 15, fontFamily: F.bold, color: colors.onSurface }}>
                  {isVehiclePlanta ? 'Expediente & Reporte Oficial de la Planta' : 'Expediente & Reporte PDF'}
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(0, 227, 253, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 10 }}>HERMANOS LYNCH</Text>
              </View>
            </View>
            <Text style={{ fontFamily: F.medium, color: colors.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>
              {isVehiclePlanta
                ? 'Genera el informe oficial en PDF con especificaciones OEM, telemetría de 10 subsistemas industriales, horómetro, aval del operador y código QR único.'
                : 'Genera un informe completo en PDF con especificaciones OEM, estado de cada pieza, gráficas de consumo/gasolina y bitácora de servicios.'}
            </Text>
            <TouchableOpacity
              onPress={() => onOpenReport ? onOpenReport() : setShowReportModal(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#0b3b60',
                paddingVertical: 12,
                borderRadius: 12,
                cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
              }}
            >
              <MaterialIcons name="print" size={18} color="#ffffff" />
              <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13, letterSpacing: 0.5 }}>
                {isVehiclePlanta ? 'Generar Expediente PDF de la Planta' : 'Generar Reporte PDF del Vehículo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* DETALLES DE LA PLANTA O VEHÍCULO ACTUAL (SOLO OPERADORES Y CLIENTES, NO SUPER ADMIN) */}
          {!isSuperAdmin && (
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 15, fontFamily: F.bold, color: colors.onSurface }}>
                {isVehiclePlanta ? 'Ajustes de la Planta Activa' : 'Ajustes del Vehículo Activo'}
              </Text>
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </View>
            
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>MARCA Y MODELO</Text>
                  <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15, marginTop: 8 }}>{myMoto.brand} {myMoto.model}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>AÑO</Text>
                  <TextInput 
                    style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]} 
                    value={motoYear}
                    onChangeText={setMotoYear}
                    onBlur={() => updateMoto({ year: parseInt(motoYear) || myMoto.year })}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
              
              <View>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                  {isVehiclePlanta ? 'SERIAL / IDENTIFICADOR DE PLANTA' : 'N° DE PLACA'}
                </Text>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]} 
                  value={myMoto.plate || ''}
                  onChangeText={(t) => updateMoto({ plate: t, serialNumber: t })}
                  placeholder={isVehiclePlanta ? "Ej. BPG-C35-001 / Sede Principal" : "Ej. AB1C23D"}
                  placeholderTextColor={colors.onSurfaceVariant}
                  autoCapitalize="characters"
                />
              </View>
              
              <View>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant, fontFamily: F.semibold }]}>
                  {isVehiclePlanta ? 'HORAS DE OPERACIÓN (HORÓMETRO)' : 'KILOMETRAJE ACTUAL (Odómetro)'}
                </Text>
                <TextInput 
                  style={[styles.inputField, { backgroundColor: colors.surfaceContainer, color: colors.onSurface, borderColor: colors.outlineVariant, fontFamily: F.bold }]} 
                  value={(myMoto.currentHours ?? myMoto.currentOdometer)?.toString() || ''}
                  onChangeText={(t) => {
                    const val = parseInt(t) || 0;
                    updateMoto({ currentOdometer: val, currentHours: val });
                  }}
                  placeholder={isVehiclePlanta ? "0 horas" : "0"}
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity 
                onPress={() => updateMoto({ isFromAgency: !myMoto.isFromAgency })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceContainer, padding: 14, borderRadius: 14, marginTop: 4 }}>
                <Text style={{ fontFamily: F.semibold, color: colors.onSurface }}>
                  {isVehiclePlanta ? 'Equipo Nuevo de Fábrica (0 Horas de Uso)' : 'Comprada de Agencia (0 Km)'}
                </Text>
                <MaterialIcons name={myMoto.isFromAgency ? 'check-box' : 'check-box-outline-blank'} size={24} color={myMoto.isFromAgency ? colors.tertiary : colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* GUÍA & MANUAL TÉCNICO */}
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <TouchableOpacity 
              onPress={() => setShowTutorial(true)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MaterialIcons name="menu-book" size={20} color={colors.primary} />
                <Text style={{ fontFamily: F.semibold, color: colors.onSurface }}>
                  {isOperatorOrAdmin ? 'Manual de Operación & Protocolo Técnico HL' : 'Manual y Guía de Uso del Sistema'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* APARIENCIA / TEMA */}
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <TouchableOpacity 
              onPress={toggleTheme}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MaterialIcons name="palette" size={20} color={colors.primary} />
                <Text style={{ fontFamily: F.semibold, color: colors.onSurface }}>Apariencia del Sistema</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <MaterialIcons name={mode === 'dark' ? 'dark-mode' : 'light-mode'} size={16} color={colors.primary} />
                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 12 }}>{mode === 'dark' ? 'Oscuro' : 'Claro'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* MARCO LEGAL & POLÍTICAS */}
          <View style={[styles.cardSection, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <MaterialIcons name="gavel" size={20} color={colors.primary} />
              <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>
                Marco Legal & Privacidad
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {/* Opción 1: Términos y Condiciones */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedLegalDoc('terms');
                  setShowLegalModal(true);
                }}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: colors.outlineVariant }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialIcons name="description" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: F.semibold, color: colors.onSurface, fontSize: 13 }}>
                    Términos y Condiciones de Uso
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>

              {/* Opción 2: Política de Privacidad */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedLegalDoc('privacy');
                  setShowLegalModal(true);
                }}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: colors.outlineVariant }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialIcons name="security" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: F.semibold, color: colors.onSurface, fontSize: 13 }}>
                    Política de Privacidad y Datos Sensibles
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>

              {/* Opción 3: Política de Cookies y Almacenamiento */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedLegalDoc('cookies');
                  setShowLegalModal(true);
                }}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialCommunityIcons name="cookie-outline" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: F.semibold, color: colors.onSurface, fontSize: 13 }}>
                    Política de Cookies y Almacenamiento Local
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* CERRAR SESIÓN */}
          <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { backgroundColor: colors.errorContainer }]}>
            <MaterialIcons name="logout" size={20} color={colors.onErrorContainer} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: F.bold, color: colors.onErrorContainer }}>Cerrar Sesión</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />
      <LegalDocModal
        visible={showLegalModal}
        initialDoc={selectedLegalDoc}
        onClose={() => setShowLegalModal(false)}
      />
      <AssignedOperatorModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        myMoto={myMoto}
      />
      <VehicleReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        myMoto={myMoto}
      />
      <UserManagementModal
        visible={showUserMgmtModal}
        onClose={() => setShowUserMgmtModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0A84FF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  cardSection: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputField: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    fontSize: 14,
    borderWidth: 0.5,
  },
  alertPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bloodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
