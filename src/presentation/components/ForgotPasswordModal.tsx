import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '@/data/supabaseClient';

export type ForgotPasswordStep = 'request' | 'reset';

interface Props {
  visible: boolean;
  initialEmail?: string;
  initialStep?: ForgotPasswordStep;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordModal: React.FC<Props> = ({
  visible,
  initialEmail = '',
  initialStep = 'request',
  onClose,
  onSuccess,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [step, setStep] = useState<ForgotPasswordStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  React.useEffect(() => {
    if (visible) {
      setStep(initialStep);
      setEmail(initialEmail);
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage(null);
    }
  }, [visible, initialStep, initialEmail]);

  const F = {
    extrabold: 'Montserrat_800ExtraBold',
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
  };

  const tokens = {
    primary: isDark ? '#4169E1' : '#275FE3',
    secondary: '#00e3fd',
    tertiary: '#00ae78',
    surface: isDark ? '#111319' : '#f5f5f7',
    surfaceCard: isDark ? '#191c21' : '#ffffff',
    surfaceContainer: isDark ? '#1d2025' : '#ececf0',
    outline: isDark ? '#40485c' : '#c4c6d0',
    textPrimary: isDark ? '#ffffff' : '#111319',
    textSecondary: isDark ? '#a0a5b5' : '#575b66',
    danger: '#ff4d4d',
    success: '#00ae78',
  };

  const handleSendResetEmail = async () => {
    if (!email || !email.includes('@')) {
      setStatusMessage({ text: 'Por favor ingresa un correo electrónico válido.', isError: true });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setStatusMessage({ text: error.message || 'Error al enviar correo de recuperación.', isError: true });
      } else {
        setStatusMessage({
          text: `Se ha enviado un enlace a ${email.trim()}. Revisa tu bandeja de entrada o spam.`,
          isError: false,
        });
      }
    } catch (e: any) {
      setStatusMessage({ text: e?.message || 'Error inesperado.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setStatusMessage({ text: 'La contraseña debe tener al menos 6 caracteres.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ text: 'Las contraseñas no coinciden.', isError: true });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setStatusMessage({ text: error.message || 'Error al actualizar la contraseña.', isError: true });
      } else {
        setStatusMessage({ text: '¡Contraseña actualizada exitosamente!', isError: false });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      }
    } catch (e: any) {
      setStatusMessage({ text: e?.message || 'Error inesperado.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.card, { backgroundColor: tokens.surfaceCard, borderColor: tokens.outline }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.iconWrap, { backgroundColor: tokens.surfaceContainer }]}>
                <MaterialCommunityIcons name="lock-reset" size={24} color={tokens.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: tokens.textPrimary, fontFamily: F.bold }]}>
                  {step === 'request' ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
                </Text>
                <Text style={[styles.subtitle, { color: tokens.textSecondary, fontFamily: F.regular }]}>
                  {step === 'request'
                    ? 'Te enviaremos un enlace de restablecimiento'
                    : 'Ingresa tu nueva contraseña para tu cuenta'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={22} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Feedback Message */}
          {statusMessage && (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: statusMessage.isError
                    ? 'rgba(255, 77, 77, 0.12)'
                    : 'rgba(0, 174, 120, 0.12)',
                  borderColor: statusMessage.isError ? tokens.danger : tokens.success,
                },
              ]}
            >
              <MaterialIcons
                name={statusMessage.isError ? 'error-outline' : 'check-circle-outline'}
                size={18}
                color={statusMessage.isError ? tokens.danger : tokens.success}
              />
              <Text
                style={[
                  styles.feedbackText,
                  {
                    color: statusMessage.isError ? tokens.danger : tokens.success,
                    fontFamily: F.medium,
                  },
                ]}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          {/* Form Body */}
          <ScrollView bounces={false} style={{ width: '100%' }}>
            {step === 'request' ? (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: F.semibold }]}>
                  Correo Electrónico
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline }]}>
                  <MaterialIcons name="alternate-email" size={18} color={tokens.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: tokens.textPrimary, fontFamily: F.regular }]}
                    placeholder="usuario@ejemplo.com"
                    placeholderTextColor={tokens.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: tokens.primary }]}
                  onPress={handleSendResetEmail}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={18} color="#FFFFFF" />
                      <Text style={[styles.submitText, { fontFamily: F.bold }]}>
                        Enviar Enlace de Recuperación
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: F.semibold }]}>
                  Nueva Contraseña (mínimo 6 caracteres)
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline }]}>
                  <MaterialIcons name="lock" size={18} color={tokens.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: tokens.textPrimary, fontFamily: F.regular }]}
                    placeholder="••••••••"
                    placeholderTextColor={tokens.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={18}
                      color={tokens.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: tokens.textPrimary, fontFamily: F.semibold, marginTop: 12 }]}>
                  Confirmar Nueva Contraseña
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: tokens.surfaceContainer, borderColor: tokens.outline }]}>
                  <MaterialIcons name="lock-outline" size={18} color={tokens.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: tokens.textPrimary, fontFamily: F.regular }]}
                    placeholder="••••••••"
                    placeholderTextColor={tokens.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: tokens.primary }]}
                  onPress={handleUpdatePassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={18} color="#FFFFFF" />
                      <Text style={[styles.submitText, { fontFamily: F.bold }]}>
                        Actualizar Contraseña
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  feedbackText: {
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12.5,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
