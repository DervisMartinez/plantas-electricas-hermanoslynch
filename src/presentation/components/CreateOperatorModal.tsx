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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../data/supabaseClient';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOperatorCreated: () => void;
}

export const CreateOperatorModal: React.FC<Props> = ({
  visible,
  onClose,
  onOperatorCreated,
}) => {
  const { isDark } = useTheme();

  // Rol seleccionado: por defecto superadmin o el que el usuario elija
  const [selectedRole, setSelectedRole] = useState<'superadmin' | 'operator' | 'client'>('superadmin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [operatorCode, setOperatorCode] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const bgModal = isDark ? '#141721' : '#ffffff';
  const borderModal = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#8e96aa' : '#64748b';
  const cardSubBg = isDark ? '#1c202d' : '#f8fafc';
  const accentBlue = '#1a5cff';
  const accentCyan = '#00b4d8';

  const resetForm = () => {
    setSelectedRole('superadmin');
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setOperatorCode('');
    setSpecialty('');
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      const msg = 'Por favor completa al menos el nombre, correo y contraseña.';
      if (Platform.OS === 'web') window.alert(msg);
      else alert(msg);
      return;
    }

    if (password.length < 6) {
      const msg = 'La contraseña temporal debe tener al menos 6 caracteres.';
      if (Platform.OS === 'web') window.alert(msg);
      else alert(msg);
      return;
    }

    setLoading(true);
    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const codePrefix = selectedRole === 'superadmin' ? 'HL-SUPER' : (selectedRole === 'operator' ? 'HL-TECH' : 'HL-CLI');
      const autoCode = operatorCode.trim() || `${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      const defaultSpec = selectedRole === 'superadmin'
        ? 'Super Administrador Principal'
        : (selectedRole === 'operator' ? 'Técnico de Generadores Diésel' : 'Titular de Planta Eléctrica');

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName.trim(),
            role: selectedRole,
            approval_status: 'approved',
            phone: phone.trim() || undefined,
            operator_code: autoCode,
            specialty: specialty.trim() || defaultSpec,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          role: selectedRole,
          approval_status: 'approved',
          phone: phone.trim() || null,
          operator_code: autoCode,
          specialty: specialty.trim() || defaultSpec,
        });
      }

      const roleLabel = selectedRole === 'superadmin' ? 'Super Administrador' : (selectedRole === 'operator' ? 'Operador Técnico' : 'Cliente');
      const msg = `¡${roleLabel} "${fullName.trim()}" registrado y acreditado con éxito!`;
      if (Platform.OS === 'web') window.alert(msg);
      else alert(msg);

      resetForm();
      onOperatorCreated();
      onClose();
    } catch (err: any) {
      const msg = 'Error al crear usuario: ' + (err.message || 'Error desconocido');
      if (Platform.OS === 'web') window.alert(msg);
      else alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const isSuper = selectedRole === 'superadmin';
  const roleColor = isSuper ? '#00e3fd' : (selectedRole === 'operator' ? accentBlue : '#22c55e');

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: isSuper ? 'rgba(0, 227, 253, 0.15)' : 'rgba(26, 92, 255, 0.15)' }]}>
                <MaterialIcons name={isSuper ? "security" : (selectedRole === 'operator' ? "engineering" : "person-add")} size={22} color={roleColor} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  {isSuper ? 'Crear Super Usuario Administrador' : (selectedRole === 'operator' ? 'Crear Operador Técnico HL' : 'Crear Cuenta de Cliente')}
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  {isSuper ? 'Acceso global total, control de usuarios y supervisión de flota' : 'Registro y acreditación de personal de mantenimiento'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            
            {/* SELECTOR DE ROL */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.bold, marginBottom: 8 }]}>
                TIPO DE USUARIO / NIVEL DE PRIVILEGIO *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedRole('superadmin')}
                  style={[
                    styles.roleOptionBtn,
                    {
                      backgroundColor: selectedRole === 'superadmin' ? 'rgba(0, 227, 253, 0.15)' : cardSubBg,
                      borderColor: selectedRole === 'superadmin' ? '#00e3fd' : borderModal,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="security" size={18} color={selectedRole === 'superadmin' ? '#00e3fd' : textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, color: selectedRole === 'superadmin' ? '#00e3fd' : textPrimary, fontSize: 11.5 }}>
                      Super Admin
                    </Text>
                    <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 9.5 }}>
                      Control total
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedRole('operator')}
                  style={[
                    styles.roleOptionBtn,
                    {
                      backgroundColor: selectedRole === 'operator' ? 'rgba(26, 92, 255, 0.15)' : cardSubBg,
                      borderColor: selectedRole === 'operator' ? accentBlue : borderModal,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="engineering" size={18} color={selectedRole === 'operator' ? accentBlue : textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, color: selectedRole === 'operator' ? accentBlue : textPrimary, fontSize: 11.5 }}>
                      Operador HL
                    </Text>
                    <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 9.5 }}>
                      Mantenimiento
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedRole('client')}
                  style={[
                    styles.roleOptionBtn,
                    {
                      backgroundColor: selectedRole === 'client' ? 'rgba(34, 197, 94, 0.15)' : cardSubBg,
                      borderColor: selectedRole === 'client' ? '#22c55e' : borderModal,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="apartment" size={18} color={selectedRole === 'client' ? '#22c55e' : textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, color: selectedRole === 'client' ? '#22c55e' : textPrimary, fontSize: 11.5 }}>
                      Cliente
                    </Text>
                    <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 9.5 }}>
                      Titular planta
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* NOMBRE COMPLETO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                {isSuper ? 'NOMBRE Y APELLIDO DEL ADMINISTRADOR *' : 'NOMBRE Y APELLIDO DEL OPERADOR *'}
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={isSuper ? "Ej. Ing. Dervis Martínez" : "Ej. Ing. Roberto Fernández"}
                placeholderTextColor={textSecondary}
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* CORREO ELECTRÓNICO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                CORREO ELECTRÓNICO *
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={isSuper ? "admin@hermanoslynch.com" : "operaciones@hermanoslynch.com"}
                placeholderTextColor={textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* CONTRASEÑA TEMPORAL */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                CONTRASEÑA TEMPORAL DE ACCESO *
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={textSecondary}
                secureTextEntry={true}
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* TELÉFONO / WHATSAPP */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                NÚMERO DE TELÉFONO / WHATSAPP
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej. +58 412 123 4567"
                placeholderTextColor={textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* CÓDIGO DE CARNET HL */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                {isSuper ? 'CÓDIGO DE CARNET ADMINISTRATIVO' : 'CÓDIGO DE ACREDITACIÓN / CARNET HL'}
              </Text>
              <TextInput
                value={operatorCode}
                onChangeText={setOperatorCode}
                placeholder={isSuper ? "Ej. HL-SUPER-01 (Opcional, auto)" : "Ej. HL-TECH-5012 (Opcional, auto)"}
                placeholderTextColor={textSecondary}
                autoCapitalize="characters"
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* ESPECIALIDAD TÉCNICA */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                {isSuper ? 'CARGO / DEPARTAMENTO' : 'ESPECIALIDAD / CERTIFICACIÓN PRINCIPAL'}
              </Text>
              <TextInput
                value={specialty}
                onChangeText={setSpecialty}
                placeholder={isSuper ? "Ej. Dirección General de Operaciones" : "Ej. Cummins 3.9L & Alternadores Leroy Somer"}
                placeholderTextColor={textSecondary}
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* AVISO DE AUTORIZACIÓN */}
            <View style={[styles.noticeBox, { backgroundColor: isSuper ? 'rgba(0, 227, 253, 0.08)' : 'rgba(0, 180, 216, 0.1)', borderColor: isSuper ? 'rgba(0, 227, 253, 0.3)' : 'rgba(0, 180, 216, 0.3)' }]}>
              <MaterialIcons name={isSuper ? "security" : "info-outline"} size={16} color={roleColor} />
              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, flex: 1, lineHeight: 16 }}>
                {isSuper
                  ? 'Este usuario tendrá rango de Super Administrador con acceso completo a crear otros administradores, supervisar toda la flota de plantas y modificar parámetros.'
                  : 'El usuario quedará automáticamente aprobado y habilitado con privilegios en el sistema.'}
              </Text>
            </View>

          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={[styles.cancelBtn, { borderColor: borderModal }]}
            >
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={[styles.saveBtn, { backgroundColor: isSuper ? '#00b4d8' : accentBlue }]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name={isSuper ? "verified-user" : "how-to-reg"} size={18} color="#ffffff" />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                    {isSuper ? 'Crear Super Administrador' : (selectedRole === 'operator' ? 'Crear Operador Técnico' : 'Crear Cliente')}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
});
