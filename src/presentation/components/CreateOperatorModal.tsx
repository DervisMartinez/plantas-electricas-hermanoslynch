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
  Alert,
  Platform,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../data/supabaseClient';
import { ENV } from '../../constants/config';
import { MOTO_CATALOG, CAR_CATALOG } from '../../data/catalog';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOperatorCreated: () => void;
}

const CORAL_PRIMARY = '#f46d5f';
const CORAL_BADGE_BG = 'rgba(244, 109, 95, 0.14)';

const QUICK_DEPARTMENTS = [
  'OFICINAS EDV - C.C ARA',
  'PLANTAS ELÉCTRICAS',
  'SOPORTE DE CAMPO',
  'MANTENIMIENTO PREVENTIVO',
  'DIRECCIÓN EJECUTIVA',
  'CLIENTE TITULAR',
];

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

const createNonPersistingClient = () =>
  createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

export const CreateOperatorModal: React.FC<Props> = ({
  visible,
  onClose,
  onOperatorCreated,
}) => {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Active subtab: 'basic' (Información básica) | 'vehicle' (Vehículo) | 'attendance' (Asistencia)
  const [activeTab, setActiveTab] = useState<'basic' | 'vehicle' | 'attendance'>('basic');

  // Basic Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('OFICINAS EDV - C.C ARA');
  const [personIdCode, setPersonIdCode] = useState(() =>
    String(Math.floor(1000000000 + Math.random() * 9000000000))
  );
  const [targetRole, setTargetRole] = useState<'superadmin' | 'operator' | 'client'>('operator');
  const [stateLoc, setStateLoc] = useState('Carabobo');
  const [zoneLoc, setZoneLoc] = useState('Zona Central');
  const [countryLoc, setCountryLoc] = useState('Venezuela');

  // Access Granting (Concesión de acceso)
  const [tempPassEnabled, setTempPassEnabled] = useState(false);
  const [superAccessPermission, setSuperAccessPermission] = useState(true);
  const [extendedAccess, setExtendedAccess] = useState(false);
  const [deviceAdminPermission, setDeviceAdminPermission] = useState(true);

  // Account Information
  const [appUsageEnabled, setAppUsageEnabled] = useState(true);
  const [accountType, setAccountType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [observations, setObservations] = useState('');

  // Vehicle Tab
  const [assignedVehicleId, setAssignedVehicleId] = useState('none');
  const [assignedVehiclePlate, setAssignedVehiclePlate] = useState('');

  // Attendance Tab
  const [workShift, setWorkShift] = useState('Turno Completo (8:00 AM - 5:00 PM)');
  const [onCallSupport, setOnCallSupport] = useState(true);

  const [saving, setSaving] = useState(false);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const bgModal = isDark ? '#10141e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e6ec';
  const textMain = isDark ? '#f8fafc' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0a0d14' : '#ffffff';
  const cardSubBg = isDark ? '#161b26' : '#f8fafc';

  const resetForm = () => {
    setActiveTab('basic');
    setFirstName('');
    setLastName('');
    setDepartment('OFICINAS EDV - C.C ARA');
    setPersonIdCode(String(Math.floor(1000000000 + Math.random() * 9000000000)));
    setTargetRole('operator');
    setStateLoc('Carabobo');
    setZoneLoc('Zona Central');
    setCountryLoc('Venezuela');
    setTempPassEnabled(false);
    setSuperAccessPermission(true);
    setExtendedAccess(false);
    setDeviceAdminPermission(true);
    setAppUsageEnabled(true);
    setAccountType('email');
    setEmail('');
    setPhone('');
    setPassword('');
    setObservations('');
    setAssignedVehicleId('none');
    setAssignedVehiclePlate('');
  };

  const notify = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleSave = async () => {
    const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullNameCombined) {
      notify('Campo requerido', 'Por favor ingresa el Nombre de la persona.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      notify('Cuenta requerida', 'Ingresa al menos el Correo electrónico o el Número de teléfono.');
      return;
    }

    setSaving(true);
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

      let targetUserId: string | null = null;

      // 1. Create Supabase Auth user if password is provided
      if (password.trim() && password.trim().length >= 6) {
        try {
          const authClient = createNonPersistingClient();
          const { data: authData, error: authErr } = await authClient.auth.signUp({
            email: finalEmail,
            password: password.trim(),
            options: {
              data: {
                full_name: fullNameCombined,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: targetRole,
                department,
                operator_code: finalCode,
                phone: phone.trim() || undefined,
              },
            },
          });
          if (!authErr && authData?.user?.id) {
            targetUserId = authData.user.id;
          }
        } catch (e) {
          console.warn('Registro auth opcional:', e);
        }
      }

      const generatedId =
        targetUserId ||
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

      const selectedVehicle = SUPPORT_VEHICLES.find((v) => v.id === assignedVehicleId);
      const vehicleName = selectedVehicle && selectedVehicle.id !== 'none' ? `${selectedVehicle.brand} ${selectedVehicle.model}`.trim() : '';

      // 2. Insert into public.profiles
      try {
        await supabase.from('profiles').upsert({
          id: generatedId,
          email: finalEmail,
          full_name: fullNameCombined,
          role: targetRole,
          approval_status: appUsageEnabled ? 'approved' : 'rejected',
          phone: phone.trim() || null,
          operator_code: finalCode,
          specialty: structuredSpecialty,
          drives_company_vehicle: assignedVehicleId !== 'none',
          assigned_vehicle_name: vehicleName || null,
          assigned_vehicle_plate: assignedVehiclePlate.trim() || null,
        });
      } catch (err) {
        console.warn('Upsert en profiles:', err);
      }

      // 3. Save into the respective separate table
      if (targetRole === 'superadmin') {
        await supabase.from('administradores').upsert({
          user_id: generatedId,
          email: finalEmail,
          full_name: fullNameCombined,
          department,
          access_level: 'superadmin',
          phone: phone.trim() || null,
          observations: observations.trim() || null,
        });
      } else if (targetRole === 'operator') {
        await supabase.from('operadores').upsert({
          user_id: generatedId,
          operator_code: finalCode,
          full_name: fullNameCombined,
          specialty: structuredSpecialty,
          phone: phone.trim() || null,
          email: finalEmail,
          shift: workShift,
          status: appUsageEnabled ? 'active' : 'inactive',
          drives_company_vehicle: assignedVehicleId !== 'none',
          assigned_vehicle_name: vehicleName || null,
          assigned_vehicle_plate: assignedVehiclePlate.trim() || null,
        });
      } else {
        await supabase.from('usuarios_clientes').upsert({
          user_id: generatedId,
          client_code: finalCode,
          full_name: fullNameCombined,
          email: finalEmail,
          phone: phone.trim() || null,
          company_name: department,
          state: stateLoc,
          city: zoneLoc,
          approval_status: appUsageEnabled ? 'approved' : 'rejected',
        });
      }

      const roleLabel =
        targetRole === 'superadmin'
          ? 'Super Administrador (Jefe)'
          : targetRole === 'operator'
          ? 'Operador Técnico'
          : 'Cliente Titular';

      notify('Registro Exitoso', `¡${roleLabel} "${fullNameCombined}" guardado con éxito en su tabla correspondiente!`);
      resetForm();
      onOperatorCreated();
      onClose();
    } catch (err: any) {
      notify('Error al guardar persona', err.message || 'Error inesperado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: bgModal, borderColor: borderCol }]}>
          {/* HEADER (matching Screenshot: "← Añadir persona" + Tabs) */}
          <View style={[styles.headerRow, { borderBottomColor: borderCol }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                <MaterialIcons name="arrow-back" size={20} color={textMain} />
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: textMain }}>
                  Añadir persona
                </Text>
              </TouchableOpacity>

              {/* TABS: Información básica | Vehículo | Asistencia */}
              <View style={styles.pillTabsContainer}>
                <TouchableOpacity
                  onPress={() => setActiveTab('basic')}
                  style={[
                    styles.pillTab,
                    activeTab === 'basic' && { backgroundColor: CORAL_BADGE_BG, borderColor: CORAL_PRIMARY },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontFamily: F.bold,
                      fontSize: 12.5,
                      color: activeTab === 'basic' ? CORAL_PRIMARY : textMuted,
                    }}
                  >
                    Información básica
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('vehicle')}
                  style={[
                    styles.pillTab,
                    activeTab === 'vehicle' && { backgroundColor: CORAL_BADGE_BG, borderColor: CORAL_PRIMARY },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontFamily: F.bold,
                      fontSize: 12.5,
                      color: activeTab === 'vehicle' ? CORAL_PRIMARY : textMuted,
                    }}
                  >
                    Vehículo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('attendance')}
                  style={[
                    styles.pillTab,
                    activeTab === 'attendance' && { backgroundColor: CORAL_BADGE_BG, borderColor: CORAL_PRIMARY },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontFamily: F.bold,
                      fontSize: 12.5,
                      color: activeTab === 'attendance' ? CORAL_PRIMARY : textMuted,
                    }}
                  >
                    Asistencia
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeIconBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={18} color={textMuted} />
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ padding: isMobile ? 14 : 24, gap: 24 }} showsVerticalScrollIndicator={false}>
            {activeTab === 'basic' && (
              <>
                {/* 1. SECCIÓN: INFORMACIÓN BÁSICA */}
                <View>
                  <Text style={[styles.sectionTitle, { color: textMain, fontFamily: F.bold }]}>
                    Información básica
                  </Text>

                  <View style={[styles.twoColLayout, { flexDirection: isMobile ? 'column' : 'row' }]}>
                    {/* LEFT COLUMN: FIELDS */}
                    <View style={{ flex: 1, gap: 14 }}>
                      {/* ROLE SELECTOR / TABLA DESTINO */}
                      <View>
                        <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.bold }]}>
                          TIPO DE CUENTA Y TABLA DE DESTINO
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setTargetRole('operator');
                              setDepartment('OFICINAS EDV - C.C ARA');
                            }}
                            style={[
                              styles.roleBadgeBtn,
                              targetRole === 'operator' && { borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)' },
                            ]}
                          >
                            <MaterialIcons name="engineering" size={16} color={targetRole === 'operator' ? '#2563eb' : textMuted} />
                            <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: targetRole === 'operator' ? '#2563eb' : textMuted }}>
                              Operador Técnico (public.operadores)
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setTargetRole('superadmin');
                              setDepartment('DIRECCIÓN EJECUTIVA');
                            }}
                            style={[
                              styles.roleBadgeBtn,
                              targetRole === 'superadmin' && { borderColor: '#d97706', backgroundColor: 'rgba(217, 119, 6, 0.1)' },
                            ]}
                          >
                            <MaterialIcons name="security" size={16} color={targetRole === 'superadmin' ? '#d97706' : textMuted} />
                            <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: targetRole === 'superadmin' ? '#d97706' : textMuted }}>
                              Super Admin / Jefe (public.administradores)
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setTargetRole('client');
                              setDepartment('CLIENTE TITULAR');
                            }}
                            style={[
                              styles.roleBadgeBtn,
                              targetRole === 'client' && { borderColor: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)' },
                            ]}
                          >
                            <MaterialIcons name="person" size={16} color={targetRole === 'client' ? '#16a34a' : textMuted} />
                            <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: targetRole === 'client' ? '#16a34a' : textMuted }}>
                              Cliente Final (public.usuarios_clientes)
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* NOMBRE Y APELLIDO SIDE BY SIDE */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                            <Text style={{ color: CORAL_PRIMARY }}>*</Text>Nombre
                          </Text>
                          <TextInput
                            style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                            placeholder="Nombre"
                            placeholderTextColor={textMuted}
                            value={firstName}
                            onChangeText={setFirstName}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                            Apellido
                          </Text>
                          <TextInput
                            style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                            placeholder="Apellido"
                            placeholderTextColor={textMuted}
                            value={lastName}
                            onChangeText={setLastName}
                          />
                        </View>
                      </View>

                      {/* DEPARTAMENTO DROPDOWN / SELECTOR */}
                      <View>
                        <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                          Departamento / Sede
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {QUICK_DEPARTMENTS.map((dept) => {
                            const isSelected = department === dept;
                            return (
                              <TouchableOpacity
                                key={dept}
                                onPress={() => setDepartment(dept)}
                                style={[
                                  styles.quickDeptPill,
                                  {
                                    backgroundColor: isSelected ? CORAL_BADGE_BG : cardSubBg,
                                    borderColor: isSelected ? CORAL_PRIMARY : borderCol,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontFamily: isSelected ? F.bold : F.medium,
                                    fontSize: 11.5,
                                    color: isSelected ? CORAL_PRIMARY : textMain,
                                  }}
                                >
                                  {dept}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* ID CON AVISO */}
                      <View>
                        <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                          <Text style={{ color: CORAL_PRIMARY }}>*</Text>ID
                        </Text>
                        <TextInput
                          style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.bold }]}
                          value={personIdCode}
                          onChangeText={setPersonIdCode}
                        />
                        <Text style={{ fontFamily: F.regular, fontSize: 11, color: textMuted, marginTop: 4 }}>
                          Una vez añadida una persona, el ID no puede modificarse.
                        </Text>
                      </View>

                      {/* ESTADO Y ZONA */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                            Estado
                          </Text>
                          <TextInput
                            style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                            placeholder="Carabobo, Miranda..."
                            placeholderTextColor={textMuted}
                            value={stateLoc}
                            onChangeText={setStateLoc}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                            Zona
                          </Text>
                          <TextInput
                            style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                            placeholder="Zona Central..."
                            placeholderTextColor={textMuted}
                            value={zoneLoc}
                            onChangeText={setZoneLoc}
                          />
                        </View>
                      </View>
                    </View>

                    {/* RIGHT COLUMN: AVATAR CARD & CREDENTIALS (matching Screenshot) */}
                    <View style={[styles.avatarCredentialBox, { borderColor: borderCol, backgroundColor: cardSubBg }]}>
                      <View style={styles.avatarSilhouette}>
                        <MaterialIcons name="person" size={80} color={isDark ? '#475569' : '#cbd5e1'} />
                      </View>

                      {/* CIRCULAR CREDENTIAL ICONS */}
                      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                        {/* Facial Recognition Badge (Active/Highlighted) */}
                        <View style={[styles.credIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.14)', borderColor: '#2563eb' }]}>
                          <MaterialIcons name="face" size={17} color="#2563eb" />
                        </View>
                        {/* Card/Badge */}
                        <View style={[styles.credIconCircle, { backgroundColor: inputBg, borderColor: borderCol }]}>
                          <MaterialIcons name="credit-card" size={17} color={textMuted} />
                        </View>
                        {/* Bluetooth */}
                        <View style={[styles.credIconCircle, { backgroundColor: inputBg, borderColor: borderCol }]}>
                          <MaterialIcons name="bluetooth" size={17} color={textMuted} />
                        </View>
                        {/* Fingerprint */}
                        <View style={[styles.credIconCircle, { backgroundColor: inputBg, borderColor: borderCol }]}>
                          <MaterialIcons name="fingerprint" size={17} color={textMuted} />
                        </View>
                        {/* Mobile User */}
                        <View style={[styles.credIconCircle, { backgroundColor: inputBg, borderColor: borderCol }]}>
                          <MaterialIcons name="phone-android" size={17} color={textMuted} />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.adminCredBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                        activeOpacity={0.8}
                        onPress={() => notify('Credenciales', 'Gestión de credenciales biométricas y electrónicas.')}
                      >
                        <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }}>
                          Administración de credencial
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 2. SECCIÓN: CONCESIÓN DE ACCESO */}
                <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: borderCol, paddingTop: 18 }}>
                  <Text style={[styles.sectionTitle, { color: textMain, fontFamily: F.bold }]}>
                    Concesión de acceso
                  </Text>

                  {/* Concesión de acceso Configurar */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMuted, width: 140 }}>
                      Concesión de acceso
                    </Text>
                    <TouchableOpacity
                      style={[styles.smallPillBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                      onPress={() => notify('Acceso', 'Configuración de matriz de accesos.')}
                    >
                      <Text style={{ fontFamily: F.medium, fontSize: 12, color: textMain }}>
                        Configurar
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Pase temporal Switch */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMuted, width: 140 }}>
                      Pase temporal
                    </Text>
                    <Switch
                      value={tempPassEnabled}
                      onValueChange={setTempPassEnabled}
                      trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
                      thumbColor="#ffffff"
                    />
                    <Text style={{ fontFamily: F.regular, fontSize: 11.5, color: textMuted, flex: 1, minWidth: 200 }}>
                      Permitir que la persona conceda acceso temporal a otras personas bajo su competencia en la aplicación.
                    </Text>
                  </View>

                  {/* Permiso de superacceso Checkbox */}
                  <TouchableOpacity
                    onPress={() => setSuperAccessPermission(!superAccessPermission)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={superAccessPermission ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={superAccessPermission ? CORAL_PRIMARY : textMuted}
                    />
                    <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                      Permiso de superacceso: Permitir que este usuario omita restricciones de seguridad en planta.
                    </Text>
                  </TouchableOpacity>

                  {/* Acceso extendido Checkbox */}
                  <TouchableOpacity
                    onPress={() => setExtendedAccess(!extendedAccess)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={extendedAccess ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={extendedAccess ? CORAL_PRIMARY : textMuted}
                    />
                    <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                      Acceso extendido: Compruebe si desea ampliar el horario de supervisión y control técnico 24/7.
                    </Text>
                  </TouchableOpacity>

                  {/* Administrador de dispositivos Checkbox */}
                  <TouchableOpacity
                    onPress={() => setDeviceAdminPermission(!deviceAdminPermission)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={deviceAdminPermission ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={deviceAdminPermission ? CORAL_PRIMARY : textMuted}
                    />
                    <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: textMain }}>
                      Administrador de dispositivos: Permita que esta persona acceda a la configuración técnica de plantas.
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. SECCIÓN: INFORMACIÓN DE LA CUENTA */}
                <View style={{ gap: 14, borderTopWidth: 1, borderTopColor: borderCol, paddingTop: 18 }}>
                  <Text style={[styles.sectionTitle, { color: textMain, fontFamily: F.bold }]}>
                    Información de la cuenta
                  </Text>

                  {/* Uso de la aplicación Switch */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMuted, width: 140, paddingTop: 4 }}>
                      Uso de la aplicación
                    </Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Switch
                        value={appUsageEnabled}
                        onValueChange={setAppUsageEnabled}
                        trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
                        thumbColor="#ffffff"
                      />
                      <Text style={{ fontFamily: F.regular, fontSize: 11.5, color: textMuted }}>
                        Use la Aplicación para abrir puertas mediante Bluetooth, telemetría de plantas eléctricas, reportes de servicio, etc.
                      </Text>
                    </View>
                  </View>

                  {/* *Cuenta Radio Buttons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMuted, width: 140 }}>
                      <Text style={{ color: CORAL_PRIMARY }}>*</Text>Cuenta
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <TouchableOpacity
                        onPress={() => setAccountType('email')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name={accountType === 'email' ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={18}
                          color={accountType === 'email' ? CORAL_PRIMARY : textMuted}
                        />
                        <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMain }}>
                          Correo electrónico
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setAccountType('phone')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name={accountType === 'phone' ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={18}
                          color={accountType === 'phone' ? CORAL_PRIMARY : textMuted}
                        />
                        <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMain }}>
                          Número de teléfono
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* INPUTS DE CUENTA (Email / Teléfono & Contraseña) */}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                        {accountType === 'email' ? 'Correo Electrónico *' : 'Número de Teléfono *'}
                      </Text>
                      <TextInput
                        style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                        placeholder={accountType === 'email' ? 'ejemplo@hermanoslynch.com' : '+58 412 1234567'}
                        placeholderTextColor={textMuted}
                        keyboardType={accountType === 'email' ? 'email-address' : 'phone-pad'}
                        autoCapitalize="none"
                        value={accountType === 'email' ? email : phone}
                        onChangeText={(t) => {
                          if (accountType === 'email') setEmail(t);
                          else setPhone(t);
                        }}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                        Contraseña de Acceso Temporal
                      </Text>
                      <TextInput
                        style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor={textMuted}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />
                    </View>
                  </View>

                  {/* OBSERVACIONES / NOTAS */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                      Observaciones / Especialidad Técnica
                    </Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.medium }]}
                      placeholder="Ej: Certificación Cummins, mecánico diésel de guardia..."
                      placeholderTextColor={textMuted}
                      value={observations}
                      onChangeText={setObservations}
                    />
                  </View>
                </View>
              </>
            )}

            {activeTab === 'vehicle' && (
              <View style={{ gap: 16 }}>
                <Text style={[styles.sectionTitle, { color: textMain, fontFamily: F.bold }]}>
                  Vehículo de Flota de Apoyo Técnico
                </Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: textMuted }}>
                  Asigna un vehículo utilitario de soporte móvil (Camioneta o Motocicleta) para las labores técnicas de este operador.
                </Text>

                <View style={{ gap: 8 }}>
                  {SUPPORT_VEHICLES.map((v) => {
                    const isSelected = assignedVehicleId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => setAssignedVehicleId(v.id)}
                        style={[
                          styles.vehicleSelectRow,
                          {
                            backgroundColor: isSelected ? CORAL_BADGE_BG : cardSubBg,
                            borderColor: isSelected ? CORAL_PRIMARY : borderCol,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={18}
                          color={isSelected ? CORAL_PRIMARY : textMuted}
                        />
                        <Text style={{ fontFamily: isSelected ? F.bold : F.medium, fontSize: 13, color: textMain }}>
                          {v.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {assignedVehicleId !== 'none' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                      Placa o Identificador de Vehículo
                    </Text>
                    <TextInput
                      style={[styles.inputBox, { backgroundColor: inputBg, borderColor: borderCol, color: textMain, fontFamily: F.bold }]}
                      placeholder="Ej: AB123CD"
                      placeholderTextColor={textMuted}
                      value={assignedVehiclePlate}
                      onChangeText={setAssignedVehiclePlate}
                    />
                  </View>
                )}
              </View>
            )}

            {activeTab === 'attendance' && (
              <View style={{ gap: 16 }}>
                <Text style={[styles.sectionTitle, { color: textMain, fontFamily: F.bold }]}>
                  Configuración de Asistencia y Turnos
                </Text>

                <View style={{ gap: 8 }}>
                  <Text style={[styles.fieldLabel, { color: textMuted, fontFamily: F.medium }]}>
                    Turno Laboral Asignado
                  </Text>
                  {[
                    'Turno Completo (8:00 AM - 5:00 PM)',
                    'Turno Mañana (7:00 AM - 1:00 PM)',
                    'Turno Tarde / Noche (1:00 PM - 9:00 PM)',
                    'Guardia de Emergencia 24 Horas',
                  ].map((shift) => {
                    const isSelected = workShift === shift;
                    return (
                      <TouchableOpacity
                        key={shift}
                        onPress={() => setWorkShift(shift)}
                        style={[
                          styles.vehicleSelectRow,
                          {
                            backgroundColor: isSelected ? CORAL_BADGE_BG : cardSubBg,
                            borderColor: isSelected ? CORAL_PRIMARY : borderCol,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                          size={18}
                          color={isSelected ? CORAL_PRIMARY : textMuted}
                        />
                        <Text style={{ fontFamily: isSelected ? F.bold : F.medium, fontSize: 13, color: textMain }}>
                          {shift}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <Switch
                    value={onCallSupport}
                    onValueChange={setOnCallSupport}
                    trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
                    thumbColor="#ffffff"
                  />
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMain }}>
                    Disponibilidad para atención de fallas críticas en planta
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* FOOTER ACTIONS */}
          <View style={[styles.footerRow, { borderTopColor: borderCol }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: borderCol, backgroundColor: cardSubBg }]}
              disabled={saving}
            >
              <Text style={{ fontFamily: F.medium, fontSize: 13, color: textMuted }}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: CORAL_PRIMARY }]}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="person-add" size={17} color="#ffffff" />
                  <Text style={{ fontFamily: F.bold, fontSize: 13, color: '#ffffff' }}>
                    Guardar / Añadir persona
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 820,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillTabsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  pillTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14.5,
    marginBottom: 12,
  },
  twoColLayout: {
    gap: 20,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  inputBox: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  roleBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickDeptPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  avatarCredentialBox: {
    width: 220,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  avatarSilhouette: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  credIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminCredBtn: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  vehicleSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
});
