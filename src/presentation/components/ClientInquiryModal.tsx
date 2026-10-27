import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { supabase } from '../../data/supabaseClient';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClientInquiryModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const { myMoto } = useMyMoto();

  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'mantenimiento' | 'falla' | 'alarma' | 'repuesto'>('mantenimiento');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgente' | 'alta' | 'media'>('media');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('09:00 - 11:30 AM');
  const [contactPhone, setContactPhone] = useState('');

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

  const typeOptions: { id: 'mantenimiento' | 'falla' | 'alarma' | 'repuesto'; label: string; icon: string }[] = [
    { id: 'mantenimiento', label: 'Cita Mantenimiento', icon: 'build' },
    { id: 'falla', label: 'Falla o Inquietud', icon: 'warning' },
    { id: 'alarma', label: 'Alarma en Panel', icon: 'notifications-active' },
    { id: 'repuesto', label: 'Filtros / Repuestos', icon: 'settings' },
  ];

  const priorityOptions: { id: 'urgente' | 'alta' | 'media'; label: string; color: string }[] = [
    { id: 'urgente', label: 'Urgente (Planta Detenida)', color: '#ef4444' },
    { id: 'alta', label: 'Alta Prioridad', color: '#f59e0b' },
    { id: 'media', label: 'Normal / Preventivo', color: '#10b981' },
  ];

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      const msg = 'Por favor ingresa el motivo y una breve descripción de tu requerimiento.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Campos Incompletos', msg);
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      const plantaInfo = myMoto
        ? `${myMoto.brand} ${myMoto.model} (${myMoto.powerKva || 35} kVA) - Serial: ${myMoto.serialNumber || myMoto.plate || 'S/N'}`
        : 'Planta Eléctrica en Sitio';

      const plantaLocation = myMoto?.location || 'Sede Principal';

      // Insert into client_tickets
      const { error } = await supabase.from('client_tickets').insert({
        user_id: user?.id,
        planta_id: myMoto?.id,
        assigned_operator_id: myMoto?.assignedOperatorId || null,
        client_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cliente',
        client_email: user?.email || '',
        client_phone: contactPhone.trim() || user?.user_metadata?.phone || '',
        planta_info: plantaInfo,
        planta_location: plantaLocation,
        type: type,
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        status: 'pending',
        scheduled_date: preferredDate.trim() || new Date().toISOString().split('T')[0],
        scheduled_time: preferredTime,
      });

      if (error) throw error;

      const successMsg = 'Tu cita e inquietud técnica ha sido enviada exitosamente a tu Operador Asignado de Hermanos Lynch. Pronto recibirás confirmación técnica.';
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert('Solicitud Enviada', successMsg);

      // Reset
      setTitle('');
      setDescription('');
      setPreferredDate('');
      setContactPhone('');

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al enviar ticket:', err);
      const errMsg = 'No se pudo enviar la solicitud: ' + (err.message || 'Intente de nuevo');
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert('Error', errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color={accentBlue} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Agendar Cita / Reportar Inquietud
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Comunicación directa con tu Operador Técnico Hermanos Lynch
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>

            {/* INFO DE LA PLANTA ASIGNADA */}
            {myMoto && (
              <View style={[styles.plantSummaryPill, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
                <MaterialCommunityIcons name="generator-portable" size={20} color={accentBlue} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12.5 }}>
                    {myMoto.brand} {myMoto.model} • {myMoto.powerKva || 35} kVA
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                    Ubicación: {myMoto.location || 'Sede Principal'} • Operador Asignado: {myMoto.assignedOperatorName || 'Central Hermanos Lynch'}
                  </Text>
                </View>
              </View>
            )}

            {/* TIPO DE SOLICITUD */}
            <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold }]}>
              TIPO DE ATENCIÓN TÉCNICA
            </Text>
            <View style={styles.chipsRow}>
              {typeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setType(opt.id)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: type === opt.id ? accentBlue : cardSubBg,
                      borderColor: type === opt.id ? accentBlue : borderModal,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={opt.icon as any}
                    size={16}
                    color={type === opt.id ? '#ffffff' : textSecondary}
                  />
                  <Text
                    style={{
                      fontFamily: F.bold,
                      fontSize: 11.5,
                      color: type === opt.id ? '#ffffff' : textPrimary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* MOTIVO / ASUNTO */}
            <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold, marginTop: 14 }]}>
              MOTIVO O TÍTULO DEL REQUERIMIENTO *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Mantenimiento 250 Horas / Fuga leve de refrigerante"
              placeholderTextColor={textSecondary}
              style={[styles.textInput, { color: textPrimary, borderColor: borderModal, backgroundColor: cardSubBg, fontFamily: F.medium }]}
            />

            {/* DESCRIPCIÓN DE LA INQUIETUD O PROBLEMA */}
            <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold, marginTop: 14 }]}>
              DESCRIPCIÓN DETALLADA DE LA INQUIETUD O FALLA *
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Explica qué síntoma presenta la planta, lecturas del panel ComAp, o qué mantenimiento requieres agendar..."
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.textArea, { color: textPrimary, borderColor: borderModal, backgroundColor: cardSubBg, fontFamily: F.regular }]}
            />

            {/* PRIORIDAD */}
            <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold, marginTop: 14 }]}>
              NIVEL DE PRIORIDAD
            </Text>
            <View style={styles.chipsRow}>
              {priorityOptions.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPriority(p.id)}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: priority === p.id ? `${p.color}22` : cardSubBg,
                      borderColor: priority === p.id ? p.color : borderModal,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                  <Text
                    style={{
                      fontFamily: F.bold,
                      fontSize: 11,
                      color: priority === p.id ? p.color : textSecondary,
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* FECHA Y HORA SUGERIDA */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1.2 }}>
                <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold }]}>
                  FECHA DESEADA
                </Text>
                <TextInput
                  value={preferredDate}
                  onChangeText={setPreferredDate}
                  placeholder="AAAA-MM-DD o 'Lo antes posible'"
                  placeholderTextColor={textSecondary}
                  style={[styles.textInput, { color: textPrimary, borderColor: borderModal, backgroundColor: cardSubBg, fontFamily: F.medium }]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold }]}>
                  HORARIO PREFERIDO
                </Text>
                <TextInput
                  value={preferredTime}
                  onChangeText={setPreferredTime}
                  placeholder="Ej. Mañana (09:00 - 11:30)"
                  placeholderTextColor={textSecondary}
                  style={[styles.textInput, { color: textPrimary, borderColor: borderModal, backgroundColor: cardSubBg, fontFamily: F.medium }]}
                />
              </View>
            </View>

            {/* TELÉFONO DE CONTACTO */}
            <Text style={[styles.fieldLabel, { color: textSecondary, fontFamily: F.bold, marginTop: 14 }]}>
              TELÉFONO O WHATSAPP DE CONTACTO DIRECTO
            </Text>
            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+58 414 123 4567"
              placeholderTextColor={textSecondary}
              keyboardType="phone-pad"
              style={[styles.textInput, { color: textPrimary, borderColor: borderModal, backgroundColor: cardSubBg, fontFamily: F.medium }]}
            />

          </ScrollView>

          {/* FOOTER ACTIONS */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: borderModal }]}>
              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 13 }}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={[styles.submitBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#ffffff" />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                    Enviar Solicitud a Mi Operador
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
    maxWidth: 620,
    maxHeight: '92%',
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
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    padding: 22,
  },
  plantSummaryPill: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  textArea: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
  },
  footerRow: {
    paddingHorizontal: 22,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
  },
});
