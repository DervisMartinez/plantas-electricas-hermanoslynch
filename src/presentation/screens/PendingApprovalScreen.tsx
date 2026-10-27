import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../data/supabaseClient';

interface Props {
  userEmail?: string;
  isRejected?: boolean;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

export const PendingApprovalScreen: React.FC<Props> = ({
  userEmail,
  isRejected = false,
  onRefresh,
  onLogout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [checking, setChecking] = useState(false);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const bgMain = isDark ? '#0c0e14' : '#f4f6fa';
  const cardBg = isDark ? '#141721' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#8e96aa' : '#64748b';
  const accentBlue = '#1a5cff';
  const accentCyan = '#00b4d8';

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setChecking(false);
    }
  };

  const handleContactWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola equipo Hermanos Lynch, me he registrado con el correo ${userEmail || ''} para el monitoreo de mi planta eléctrica y solicito la validación de mi acceso.`
    );
    Linking.openURL(`https://wa.me/584143059921?text=${text}`).catch(() => {});
  };

  const handleCall = () => {
    Linking.openURL('tel:+584143059921').catch(() => {});
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: bgMain }]}>
      
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/images/logo and media coorporative/logo-sin-nombre.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
            HERMANOS LYNCH
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          >
            <MaterialIcons
              name={isDark ? 'light-mode' : 'dark-mode'}
              size={18}
              color={isDark ? '#ffb703' : '#1a5cff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogout}
            style={[styles.logoutPill, { backgroundColor: cardBg, borderColor: cardBorder }]}
          >
            <MaterialIcons name="logout" size={16} color={textSecondary} />
            <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 12 }}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CENTER CARD */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          
          {/* ICON BADGE */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                borderColor: isRejected ? '#ef4444' : '#f59e0b',
              },
            ]}
          >
            <MaterialIcons
              name={isRejected ? 'gpp-bad' : 'verified-user'}
              size={42}
              color={isRejected ? '#ef4444' : '#f59e0b'}
            />
          </View>

          {/* STATUS PILL */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isRejected ? '#ef4444' : '#f59e0b' },
              ]}
            />
            <Text
              style={{
                fontFamily: F.bold,
                fontSize: 11,
                color: isRejected ? '#ef4444' : '#f59e0b',
                letterSpacing: 0.5,
              }}
            >
              {isRejected ? 'REGISTRO NO APROBADO' : 'SOLICITUD EN ESPERA DE APROBACIÓN'}
            </Text>
          </View>

          {/* TITLE & DESCRIPTION */}
          <Text style={[styles.title, { color: textPrimary, fontFamily: F.extrabold }]}>
            {isRejected ? 'Acceso Restringido' : 'Cuenta en Proceso de Aprobación'}
          </Text>

          <Text style={[styles.description, { color: textSecondary, fontFamily: F.medium }]}>
            {isRejected
              ? 'Tu cuenta ha sido evaluada y no cuenta con autorización de acceso en este momento. Si consideras que se trata de un error, comunícate con el Operador Principal.'
              : 'Tu solicitud de acceso ha sido enviada con éxito. Por políticas de seguridad industrial y control técnico de grupos electrógenos, el Operador Principal de Hermanos Lynch debe validar y autorizar tu perfil antes de permitir la vinculación de plantas y telemetría.'}
          </Text>

          {/* USER INFO BOX */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1c202d' : '#f8fafc', borderColor: cardBorder }]}>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color={accentCyan} />
              <Text style={[styles.infoLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Correo Registrado:
              </Text>
              <Text style={[styles.infoValue, { color: textPrimary, fontFamily: F.bold }]}>
                {userEmail || 'Usuario'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#f59e0b" />
              <Text style={[styles.infoLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Estado:
              </Text>
              <Text
                style={{
                  fontFamily: F.bold,
                  fontSize: 12,
                  color: isRejected ? '#ef4444' : '#f59e0b',
                }}
              >
                {isRejected ? 'Rechazado' : 'Pendiente de Validación'}
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={handleCheckStatus}
              disabled={checking}
              style={[styles.primaryBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.85}
            >
              {checking ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={18} color="#ffffff" />
                  <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                    Comprobar Aprobación
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContactWhatsApp}
              style={[styles.secondaryBtn, { backgroundColor: '#25D366' }]}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#ffffff" />
              <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 13 }}>
                Contactar al Operador Principal
              </Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER NOTICE */}
          <Text style={[styles.noticeText, { color: textSecondary, fontFamily: F.regular }]}>
            Atención Técnica y Central Hermanos Lynch: +58 (212) 238-1244 • operaciones@hermanoslynch.com
          </Text>

        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  topBar: {
    paddingHorizontal: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImg: {
    width: 34,
    height: 34,
  },
  brandTitle: {
    fontSize: 16,
    letterSpacing: 1.2,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 580,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 12,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noticeText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
