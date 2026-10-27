import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LegalDocType } from './LegalDocModal';

interface Props {
  termsAccepted: boolean;
  onToggleTerms: () => void;
  privacyAccepted: boolean;
  onTogglePrivacy: () => void;
  onOpenDoc: (docType: LegalDocType) => void;
  showValidationErrors?: boolean;
  disabled?: boolean;
}

export const LegalConsentCheckboxes: React.FC<Props> = ({
  termsAccepted,
  onToggleTerms,
  privacyAccepted,
  onTogglePrivacy,
  onOpenDoc,
  showValidationErrors = false,
  disabled = false,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  const tokens = {
    primary: isDark ? '#3B82F6' : '#2563EB',
    secondary: isDark ? '#00e3fd' : '#0284C7',
    tertiary: isDark ? '#10B981' : '#059669',
    alert: '#EF4444',
    surfaceCard: isDark ? 'rgba(15, 23, 42, 0.75)' : '#FFFFFF',
    surfaceContainer: isDark ? 'rgba(30, 41, 59, 0.65)' : '#F1F5F9',
    outline: isDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1',
    outlineError: '#EF4444',
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
  };

  const termsHasError = showValidationErrors && !termsAccepted;
  const privacyHasError = showValidationErrors && !privacyAccepted;

  return (
    <View style={styles.container}>
      {/* MENSAJE DE VALIDACIÓN SI FALTA ALGUNA CASILLA */}
      {(termsHasError || privacyHasError) && (
        <View style={[styles.errorBanner, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)' }]}>
          <MaterialIcons name="error-outline" size={16} color={tokens.alert} />
          <Text style={[styles.errorBannerText, { color: tokens.alert, fontFamily: F.bold }]}>
            Debes marcar ambas casillas por separado para continuar
          </Text>
        </View>
      )}

      {/* CASILLA 1: TÉRMINOS Y CONDICIONES */}
      <View
        style={[
          styles.checkboxRowCard,
          {
            backgroundColor: tokens.surfaceCard,
            borderColor: termsHasError ? tokens.outlineError : termsAccepted ? tokens.tertiary : tokens.outline,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onToggleTerms}
          disabled={disabled}
          activeOpacity={0.7}
          style={styles.touchableArea}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: termsAccepted ? tokens.primary : tokens.outline,
                backgroundColor: termsAccepted ? tokens.primary : 'transparent',
              },
            ]}
          >
            {termsAccepted && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={[styles.labelMain, { color: tokens.textPrimary, fontFamily: F.semibold }]}>
            He leído y acepto los{' '}
            <Text
              onPress={() => onOpenDoc('terms')}
              style={[styles.linkText, { color: tokens.secondary, fontFamily: F.bold }]}
            >
              Términos y Condiciones
            </Text>
          </Text>
          <TouchableOpacity
            onPress={() => onOpenDoc('terms')}
            style={styles.openDocChip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.openDocText, { color: tokens.secondary, fontFamily: F.bold }]}>
              Leer documento
            </Text>
            <MaterialIcons name="open-in-new" size={13} color={tokens.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CASILLA 2: POLÍTICA DE PRIVACIDAD */}
      <View
        style={[
          styles.checkboxRowCard,
          {
            backgroundColor: tokens.surfaceCard,
            borderColor: privacyHasError ? tokens.outlineError : privacyAccepted ? tokens.tertiary : tokens.outline,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onTogglePrivacy}
          disabled={disabled}
          activeOpacity={0.7}
          style={styles.touchableArea}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: privacyAccepted ? tokens.primary : tokens.outline,
                backgroundColor: privacyAccepted ? tokens.primary : 'transparent',
              },
            ]}
          >
            {privacyAccepted && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={[styles.labelMain, { color: tokens.textPrimary, fontFamily: F.semibold }]}>
            He leído y acepto la{' '}
            <Text
              onPress={() => onOpenDoc('privacy')}
              style={[styles.linkText, { color: tokens.secondary, fontFamily: F.bold }]}
            >
              Política de Privacidad
            </Text>
          </Text>
          <Text style={[styles.labelSub, { color: tokens.textSecondary, fontFamily: F.medium }]}>
            Consiento el tratamiento de mis datos de perfil, ubicación y plantas eléctricas para telemetría y soporte técnico.
          </Text>
          <TouchableOpacity
            onPress={() => onOpenDoc('privacy')}
            style={styles.openDocChip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.openDocText, { color: tokens.secondary, fontFamily: F.bold }]}>
              Leer documento
            </Text>
            <MaterialIcons name="open-in-new" size={13} color={tokens.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* AVISO DE COOKIES Y ALMACENAMIENTO LOCAL */}
      <View style={[styles.cookiesNoticeCard, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline }]}>
        <MaterialCommunityIcons name="cookie-outline" size={18} color={tokens.secondary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cookiesNoticeText, { color: tokens.textSecondary, fontFamily: F.medium }]}>
            Hermanos Lynch emplea almacenamiento técnico estrictamente necesario para sesión y telemetría de equipos. Consulta nuestra{' '}
            <Text
              onPress={() => onOpenDoc('cookies')}
              style={[styles.linkTextUnderline, { color: tokens.secondary, fontFamily: F.bold }]}
            >
              Política de Cookies
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  errorBannerText: {
    fontSize: 12,
    flex: 1,
  },
  checkboxRowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  touchableArea: {
    paddingRight: 10,
    paddingTop: 2,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  labelMain: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  labelSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  linkText: {
    textDecorationLine: 'underline',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  linkTextUnderline: {
    textDecorationLine: 'underline',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  openDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  openDocText: {
    fontSize: 11.5,
  },
  cookiesNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cookiesNoticeText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
