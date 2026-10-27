import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Moto } from '../../domain/entities/Moto';

interface Props {
  visible: boolean;
  onClose: () => void;
  myMoto?: Moto | null;
}

export const AssignedOperatorModal: React.FC<Props> = ({ visible, onClose, myMoto }) => {
  const { isDark } = useTheme();

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

  const plantName = myMoto ? `${myMoto.brand} ${myMoto.model}` : 'Planta Eléctrica';
  const plantSerial = myMoto?.plate || myMoto?.serialNumber || 'BPG-HL-001';
  const plantLocation = myMoto?.location || 'Sede del Cliente';

  const operatorData = {
    name: 'Ing. Alejandro Rivas Silva',
    title: 'Especialista Técnico Senior de Planta',
    code: 'HL-TECH-4098',
    status: 'EN GUARDIA Y ACTIVO',
    phone: '+58 414 305 9921',
    phoneFormatted: '+58 (414) 305-9921',
    officePhone: '+58 (212) 238-1244',
    email: 'operaciones@hermanoslynch.com',
    certifications: [
      'Cummins Power Generation & Motores Diésel QSB/6BT',
      'Alternadores Industriales Leroy Somer TAL Series',
      'Módulos de Control ComAp InteliLite & Sincronismo',
      'Norma Internacional ISO 8528 / Grupos Electrógenos',
    ],
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola ${operatorData.name}, me comunico desde la plataforma Hermanos Lynch respecto a la ${plantName} (Serial: ${plantSerial}) ubicada en ${plantLocation}. Requiero asistencia técnica.`
    );
    const url = `https://wa.me/584143059921?text=${text}`;
    Linking.openURL(url).catch(() => {
      alert(`Puedes escribir directamente al WhatsApp: ${operatorData.phone}`);
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:+584143059921`).catch(() => {
      alert(`Línea directa: ${operatorData.phone}`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(
      `mailto:${operatorData.email}?subject=Asistencia Tecnica Planta ${plantSerial}&body=Hola equipo Hermanos Lynch, solicito visita tecnica para mi planta electrica.`
    ).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(0, 180, 216, 0.15)' }]}>
                <MaterialIcons name="engineering" size={22} color={accentCyan} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Operador Técnico Asignado
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Ficha Técnica & Contactos Hermanos Lynch
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
            
            {/* CARNET DEL OPERADOR ACREDITADO */}
            <View style={[styles.operatorCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <View style={styles.operatorTopRow}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarCircle, { backgroundColor: accentBlue }]}>
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 20 }}>AR</Text>
                  </View>
                  <View style={styles.verifiedCheckBadge}>
                    <MaterialIcons name="verified" size={16} color="#22c55e" />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.statusPill}>
                    <View style={styles.liveGreenDot} />
                    <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 10 }}>
                      {operatorData.status}
                    </Text>
                  </View>
                  <Text style={[styles.operatorName, { color: textPrimary, fontFamily: F.extrabold }]}>
                    {operatorData.name}
                  </Text>
                  <Text style={[styles.operatorTitle, { color: accentCyan, fontFamily: F.semibold }]}>
                    {operatorData.title}
                  </Text>
                  <Text style={[styles.operatorCode, { color: textSecondary, fontFamily: F.medium }]}>
                    Acreditación HL: <Text style={{ fontFamily: F.bold, color: textPrimary }}>{operatorData.code}</Text>
                  </Text>
                </View>
              </View>

              {/* PLANTA ASIGNADA */}
              <View style={[styles.assignedPlantBox, { borderColor: borderModal }]}>
                <MaterialCommunityIcons name="generator-portable" size={20} color={accentCyan} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12 }}>
                    Equipo a Cargo: {plantName}
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                    Serial: {plantSerial} • Ubicación: {plantLocation}
                  </Text>
                </View>
              </View>
            </View>

            {/* BOTONES DE CONTACTO DIRECTO */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                onPress={handleOpenWhatsApp}
                style={[styles.whatsappActionBtn, { backgroundColor: '#25D366' }]}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="whatsapp" size={20} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                  WhatsApp Inmediato
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCall}
                style={[styles.callActionBtn, { backgroundColor: accentBlue }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="phone" size={20} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                  Llamar al Operador
                </Text>
              </TouchableOpacity>
            </View>

            {/* CANALES DE ATENCIÓN DIRECTA */}
            <View style={[styles.channelsCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary, fontFamily: F.bold }]}>
                Canales de Atención Técnica
              </Text>

              <TouchableOpacity onPress={handleCall} style={styles.channelRow}>
                <View style={[styles.channelIcon, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                  <MaterialIcons name="call" size={16} color={accentBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 12 }}>
                    Línea Móvil de Guardia 24/7
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                    {operatorData.phoneFormatted}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={textSecondary} />
              </TouchableOpacity>

              <View style={styles.channelRow}>
                <View style={[styles.channelIcon, { backgroundColor: 'rgba(0, 180, 216, 0.15)' }]}>
                  <MaterialIcons name="business" size={16} color={accentCyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 12 }}>
                    Central Hermanos Lynch Caracas
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                    {operatorData.officePhone}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleEmail} style={styles.channelRow}>
                <View style={[styles.channelIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <MaterialIcons name="email" size={16} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 12 }}>
                    Correo de Operaciones & Repuestos
                  </Text>
                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11 }}>
                    {operatorData.email}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* ACREDITACIONES Y COMPETENCIAS TÉCNICAS */}
            <View style={[styles.certificationsCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary, fontFamily: F.bold }]}>
                Acreditaciones de Fábrica Avaladas
              </Text>
              {operatorData.certifications.map((cert, index) => (
                <View key={index} style={styles.certRow}>
                  <MaterialIcons name="check-circle" size={16} color="#22c55e" />
                  <Text style={[styles.certText, { color: textPrimary, fontFamily: F.medium }]}>
                    {cert}
                  </Text>
                </View>
              ))}
            </View>

          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.dismissBtn, { backgroundColor: cardSubBg, borderColor: borderModal }]}
            >
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenWhatsApp}
              style={[styles.confirmBtn, { backgroundColor: accentBlue }]}
            >
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#ffffff" />
              <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                Solicitar Visita Técnica
              </Text>
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
    maxWidth: 560,
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
  operatorCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  operatorTopRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    borderRadius: 9,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  operatorName: {
    fontSize: 15,
  },
  operatorTitle: {
    fontSize: 12,
    marginVertical: 2,
  },
  operatorCode: {
    fontSize: 11,
  },
  assignedPlantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  whatsappActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  channelsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificationsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  certText: {
    fontSize: 11.5,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  dismissBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
  },
});
