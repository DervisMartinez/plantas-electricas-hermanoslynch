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

  // Todos los campos inician 100% vacíos
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
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setOperatorCode('');
    setSpecialty('');
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      alert('Por favor completa al menos el nombre, correo y contraseña del operador.');
      return;
    }

    if (password.length < 6) {
      alert('La contraseña temporal debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName.trim(),
            role: 'operator',
            approval_status: 'approved',
            phone: phone.trim() || undefined,
            operator_code: operatorCode.trim() || `HL-TECH-${Math.floor(1000 + Math.random() * 9000)}`,
            specialty: specialty.trim() || 'Técnico de Generadores Diésel',
          },
        },
      });

      if (error) throw error;

      alert(`¡Operador "${fullName.trim()}" registrado y acreditado exitosamente!`);
      resetForm();
      onOperatorCreated();
      onClose();
    } catch (err: any) {
      alert('Error al crear operador: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                <MaterialIcons name="person-add" size={22} color={accentBlue} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Crear Nuevo Operador Técnico
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Registro y acreditación de personal de mantenimiento
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            
            {/* NOMBRE COMPLETO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                NOMBRE Y APELLIDO DEL OPERADOR *
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ej. Ing. Roberto Fernández"
                placeholderTextColor={textSecondary}
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* CORREO ELECTRÓNICO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                CORREO ELECTRÓNICO CORPORATIVO *
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Ej. roberto.fernandez@hermanoslynch.com"
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
                CÓDIGO DE ACREDITACIÓN / CARNET HL
              </Text>
              <TextInput
                value={operatorCode}
                onChangeText={setOperatorCode}
                placeholder="Ej. HL-TECH-5012 (Opcional, se genera auto)"
                placeholderTextColor={textSecondary}
                autoCapitalize="characters"
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* ESPECIALIDAD TÉCNICA */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                ESPECIALIDAD / CERTIFICACIÓN PRINCIPAL
              </Text>
              <TextInput
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="Ej. Cummins 3.9L & Alternadores Leroy Somer"
                placeholderTextColor={textSecondary}
                style={[styles.input, { backgroundColor: cardSubBg, color: textPrimary, borderColor: borderModal, fontFamily: F.medium }]}
              />
            </View>

            {/* AVISO DE AUTORIZACIÓN */}
            <View style={[styles.noticeBox, { backgroundColor: 'rgba(0, 180, 216, 0.1)', borderColor: 'rgba(0, 180, 216, 0.3)' }]}>
              <MaterialIcons name="info-outline" size={16} color={accentCyan} />
              <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, flex: 1, lineHeight: 16 }}>
                El operador quedará automáticamente aprobado y habilitado con privilegios de mantenimiento en el sistema.
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
              style={[styles.saveBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="how-to-reg" size={18} color="#ffffff" />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                    Crear y Acreditar Operador
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
