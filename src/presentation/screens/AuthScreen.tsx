import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Image,
  ImageBackground, 
  ScrollView,
  useWindowDimensions 
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../data/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { LegalConsentCheckboxes } from '../components/LegalConsentCheckboxes';
import { LegalDocModal, LegalDocType } from '../components/LegalDocModal';
import { ForgotPasswordModal, ForgotPasswordStep } from '../components/ForgotPasswordModal';
import { recordLegalConsent } from '../../services/legalConsentService';

interface Props {
  onBack?: () => void;
  initialRecoveryMode?: boolean;
}

export const AuthScreen: React.FC<Props> = ({ onBack, initialRecoveryMode = false }) => {
  // Theme and responsive state
  const { mode, isDark, toggleTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 960;
  
  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form Fields - Step 1: Acceso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form Fields - Step 2: Datos
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [drivesCompanyVehicle, setDrivesCompanyVehicle] = useState(false);

  // Form Fields - Step 3: Región
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');

  // Legal Consent State (Separate checkboxes & audit)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showLegalErrors, setShowLegalErrors] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<LegalDocType>('terms');

  // Supabase Auth Recovery State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(initialRecoveryMode);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>(
    initialRecoveryMode ? 'reset' : 'request'
  );

  React.useEffect(() => {
    if (initialRecoveryMode) {
      setForgotPasswordStep('reset');
      setShowForgotPasswordModal(true);
    }
  }, [initialRecoveryMode]);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Paleta de tokens de alta legibilidad según modo claro/oscuro
  const t = {
    // Fondos degradados
    bgGradient: isDark 
      ? (['rgba(7, 13, 24, 0.82)', 'rgba(10, 16, 28, 0.94)', 'rgba(13, 17, 26, 0.99)'] as const)
      : (['rgba(241, 245, 249, 0.75)', 'rgba(248, 250, 252, 0.92)', 'rgba(255, 255, 255, 0.98)'] as const),

    // Tarjeta principal
    cardBg: isDark ? 'rgba(20, 26, 40, 0.94)' : 'rgba(255, 255, 255, 0.97)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.85)',
    cardShadow: isDark ? '#000000' : '#64748B',

    // Tipografía principal
    textPrimary: isDark ? '#FFFFFF' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#475569',
    textMuted: isDark ? '#64748B' : '#94A3B8',

    // Acentos de marca Hermanos Lynch
    brandCyan: isDark ? '#00E3FD' : '#0284C7',
    brandBlue: isDark ? '#3B82F6' : '#2563EB',
    brandGreen: isDark ? '#10B981' : '#059669',
    brandAlert: '#EF4444',

    // Switcher segmentado
    segmentBg: isDark ? 'rgba(15, 20, 32, 0.85)' : '#F1F5F9',
    segmentBorder: isDark ? 'rgba(148, 163, 184, 0.22)' : '#E2E8F0',
    segmentActiveBg: isDark ? '#2563EB' : '#007AFF',
    segmentActiveText: '#FFFFFF',
    segmentInactiveText: isDark ? '#94A3B8' : '#64748B',

    // Entradas de formulario
    inputLabel: isDark ? '#E2E8F0' : '#1E293B',
    inputBg: isDark ? 'rgba(15, 23, 42, 0.82)' : '#F8FAFC',
    inputBorder: isDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    inputPlaceholder: isDark ? '#64748B' : '#94A3B8',

    // Hero lateral (Desktop)
    heroCardBg: isDark ? 'rgba(30, 41, 59, 0.70)' : 'rgba(255, 255, 255, 0.90)',
    heroCardBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.85)',
    heroCardText: isDark ? '#FFFFFF' : '#0F172A',

    // Pasos de registro
    stepInactiveBg: isDark ? 'rgba(51, 65, 85, 0.7)' : '#E2E8F0',
    stepInactiveText: isDark ? '#94A3B8' : '#64748B',
    stepActiveBg: isDark ? '#00E3FD' : '#007AFF',
    stepCardBg: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
    stepCardBorder: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',

    // Botones
    btnPrimaryBg: isDark ? '#2563EB' : '#007AFF',
    btnSecondaryBg: isDark ? 'rgba(30, 41, 59, 0.8)' : '#F1F5F9',
    btnSecondaryBorder: isDark ? 'rgba(148, 163, 184, 0.3)' : '#CBD5E1',
    btnSecondaryText: isDark ? '#FFFFFF' : '#0F172A',
  };

  // Validaciones de navegación de pasos en Registro
  const handleNextStep = () => {
    if (registerStep === 1) {
      if (!email || !password) {
        alert('Ingresa correo y contraseña para continuar');
        return;
      }
      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }
      setRegisterStep(2);
    } else if (registerStep === 2) {
      if (!firstName || !lastName) {
        alert('Por favor ingresa tu nombre y apellido');
        return;
      }
      setRegisterStep(3);
    }
  };

  const handlePrevStep = () => {
    if (registerStep > 1) {
      setRegisterStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Correo y contraseña son requeridos');
      return;
    }

    if (!isLogin && (!firstName || !lastName || !country || !state)) {
      alert('Por favor completa los datos de tu perfil');
      return;
    }

    // Validación estricta de casillas separadas (RGPD / Accountability)
    if (!isLogin) {
      if (!termsAccepted || !privacyAccepted) {
        setShowLegalErrors(true);
        if (!termsAccepted && !privacyAccepted) {
          alert('Debes marcar por separado tanto la casilla de Términos y Condiciones como la de Política de Privacidad.');
        } else if (!termsAccepted) {
          alert('Debes aceptar los Términos y Condiciones para registrar tu cuenta.');
        } else {
          alert('Debes aceptar la Política de Privacidad para el tratamiento de tus datos.');
        }
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // 1. Registrar auditoría legal con timestamp, IP y dispositivo
        const consentRecord = await recordLegalConsent({
          email,
          termsAccepted: true,
          privacyAccepted: true,
          cookiesAcknowledged: true,
          acceptanceContext: 'auth_registration_step_3',
        });

        // 2. Crear cuenta en Supabase vinculando los datos de auditoría
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              country: country.trim(),
              state: state.trim(),
              drives_company_vehicle: drivesCompanyVehicle,
              // Metadatos de auditoría legal
              legal_terms_accepted: true,
              legal_terms_accepted_at: consentRecord.termsAcceptedAt,
              legal_terms_version: consentRecord.termsVersion,
              legal_privacy_accepted: true,
              legal_privacy_accepted_at: consentRecord.privacyAcceptedAt,
              legal_privacy_version: consentRecord.privacyVersion,
              legal_cookies_acknowledged: true,
              legal_consent_method: consentRecord.consentMethod,
              legal_consent_ip: consentRecord.ipAddress,
              legal_device_info: consentRecord.deviceInfo,
            }
          }
        });
        if (error) throw error;
        
        // Si ya tenemos el ID de usuario devuelto por Supabase, actualizar el registro
        if (data?.user?.id) {
          recordLegalConsent({
            email,
            userId: data.user.id,
            termsAccepted: true,
            privacyAccepted: true,
            cookiesAcknowledged: true,
            acceptanceContext: 'auth_registration_step_3',
          }).catch(() => {});
        }
        
        if (!data.session) {
          alert('¡Registro exitoso! Revisa tu bandeja de correo para confirmar tu cuenta.');
          setIsLogin(true);
          setRegisterStep(1);
        } else {
          alert('¡Bienvenido a Hermanos Lynch!');
        }
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) msg = 'Correo o contraseña incorrectos.';
      if (msg.includes('User already registered')) msg = 'Este correo ya se encuentra registrado.';
      if (msg.includes('Password should be at least')) msg = 'La contraseña debe tener al menos 6 caracteres.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground 
        source={require('../../../assets/images/fondo_login.jpg')} 
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={t.bgGradient}
          style={{ flex: 1 }}
        >
          {/* BOTÓN TOGGLE TEMA (CLARO / OSCURO) - EN CABECERA SUPERIOR */}
          <View style={styles.topBarContainer}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={[
                  styles.navPillBtn,
                  {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.90)',
                    borderColor: t.cardBorder,
                  }
                ]}
                activeOpacity={0.75}
              >
                <MaterialIcons name="arrow-back" size={16} color={t.brandCyan} />
                <Text style={{ fontFamily: F.bold, color: t.brandCyan, fontSize: 12 }}>
                  Volver a Portada
                </Text>
              </TouchableOpacity>
            ) : <View />}

            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.navPillBtn,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                  borderColor: t.cardBorder,
                }
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
            >
              <MaterialCommunityIcons 
                name={isDark ? 'weather-sunny' : 'weather-night'} 
                size={18} 
                color={isDark ? '#FBBF24' : '#6366F1'} 
              />
              <Text style={{ fontFamily: F.bold, color: t.textPrimary, fontSize: 12.5, marginLeft: 6 }}>
                {isDark ? 'Modo Claro' : 'Modo Oscuro'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={isDesktop ? styles.desktopScrollContent : styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={isDesktop ? styles.desktopSplitLayout : { width: '100%', alignItems: 'center' }}>
              
              {/* COLUMNA HERO IZQUIERDA (DESKTOP) */}
              {isDesktop && (
                <View style={styles.desktopHeroColumn}>
                  <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Image
                      source={require('../../../assets/images/logo and media coorporative/logo-sin-nombre.png')}
                      style={{ width: 68, height: 68 }}
                      resizeMode="contain"
                    />
                    <View>
                      <Text style={{ fontSize: 13, fontFamily: F.bold, color: t.brandCyan, letterSpacing: 1.5 }}>
                        HERMANOS LYNCH
                      </Text>
                      <Text style={{ fontSize: 11.5, fontFamily: F.semibold, color: t.brandBlue }}>
                        www.hermanoslynch.com
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.desktopMainHeading, { color: t.textPrimary }]}>
                    PLANTAS ELÉCTRICAS
                  </Text>
                  
                  <Text style={[styles.desktopSubHeading, { color: t.brandCyan }]}>
                    TELEMETRÍA & GESTIÓN EN LA NUBE
                  </Text>

                  <Text style={[styles.desktopDesc, { color: t.textSecondary }]}>
                    Plataforma técnica de precisión para el control operativo, monitoreo continuo de horómetros y mantenimiento predictivo de generadores diésel Blue Power Generation (C35, C55, C125) y flotas corporativas.
                  </Text>

                  <View style={styles.heroFeatureList}>
                    <View style={[styles.heroFeatureRow, { backgroundColor: t.heroCardBg, borderColor: t.heroCardBorder }]}>
                      <View style={[styles.featureIconBadge, { backgroundColor: isDark ? 'rgba(0, 227, 253, 0.15)' : 'rgba(2, 132, 199, 0.12)' }]}>
                        <MaterialIcons name="speed" size={22} color={t.brandCyan} />
                      </View>
                      <Text style={[styles.heroFeatureText, { color: t.heroCardText, fontFamily: F.semibold }]}>
                        Monitoreo de horómetro y ciclos de servicio (aceite 15W-40, filtros, refrigerante, batería 24V)
                      </Text>
                    </View>

                    <View style={[styles.heroFeatureRow, { backgroundColor: t.heroCardBg, borderColor: t.heroCardBorder }]}>
                      <View style={[styles.featureIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)' }]}>
                        <MaterialIcons name="bolt" size={22} color={t.brandGreen} />
                      </View>
                      <Text style={[styles.heroFeatureText, { color: t.heroCardText, fontFamily: F.semibold }]}>
                        Gestión técnica de generadores diésel (Cummins, Leroy Somer, ComAp)
                      </Text>
                    </View>

                    <View style={[styles.heroFeatureRow, { backgroundColor: t.heroCardBg, borderColor: t.heroCardBorder }]}>
                      <View style={[styles.featureIconBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.12)' }]}>
                        <MaterialIcons name="folder-shared" size={22} color={t.brandBlue} />
                      </View>
                      <Text style={[styles.heroFeatureText, { color: t.heroCardText, fontFamily: F.semibold }]}>
                        Bóveda digital de manuales, diagramas eléctricos y bitácoras de servicio
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* COLUMNA DERECHA (TARJETA DE ACCESO / REGISTRO) */}
              <View 
                style={[
                  styles.cardContainer, 
                  isDesktop && styles.desktopCardContainer,
                  { 
                    backgroundColor: t.cardBg, 
                    borderColor: t.cardBorder,
                    shadowColor: t.cardShadow,
                  }
                ]}
              >

                {/* BRAND HEADER & LOGO */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Image
                    source={require('../../../assets/images/logo and media coorporative/logo-sin-nombre.png')}
                    style={{ width: 72, height: 72, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                  <Text style={{ fontSize: 24, fontFamily: F.extrabold, color: t.textPrimary, letterSpacing: -0.4, textAlign: 'center' }}>
                    HERMANOS LYNCH
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: F.semibold, color: t.textSecondary, marginTop: 4, textAlign: 'center' }}>
                    {isLogin ? 'Control Telemático de Plantas Eléctricas' : 'Registro de Operador / Cliente'}
                  </Text>
                </View>

                {/* SEGMENTED SWITCHER: INICIAR SESIÓN / REGISTRARSE */}
                <View style={[styles.segmentedBar, { backgroundColor: t.segmentBg, borderColor: t.segmentBorder }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsLogin(true);
                      setRegisterStep(1);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.segmentButton,
                      isLogin && [styles.segmentActive, { backgroundColor: t.segmentActiveBg }]
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      { fontFamily: F.bold, color: isLogin ? t.segmentActiveText : t.segmentInactiveText }
                    ]}>
                      INICIAR SESIÓN
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsLogin(false)}
                    activeOpacity={0.8}
                    style={[
                      styles.segmentButton,
                      !isLogin && [styles.segmentActive, { backgroundColor: t.segmentActiveBg }]
                    ]}
                  >
                    <Text style={[
                      styles.segmentText,
                      { fontFamily: F.bold, color: !isLogin ? t.segmentActiveText : t.segmentInactiveText }
                    ]}>
                      REGISTRARSE
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* VISTA 1: INICIAR SESIÓN */}
                {isLogin ? (
                  <View style={{ gap: 14, width: '100%' }}>
                    <View>
                      <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                        CORREO ELECTRÓNICO
                      </Text>
                      <TextInput 
                        style={[
                          styles.input, 
                          { 
                            backgroundColor: t.inputBg, 
                            borderColor: t.inputBorder, 
                            color: t.inputText, 
                            fontFamily: F.medium 
                          }
                        ]} 
                        placeholder="operador@correo.com" 
                        placeholderTextColor={t.inputPlaceholder} 
                        value={email} 
                        onChangeText={setEmail} 
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>

                    <View>
                      <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                        CONTRASEÑA
                      </Text>
                      <View 
                        style={[
                          styles.input, 
                          { 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: t.inputBg, 
                            borderColor: t.inputBorder, 
                            paddingHorizontal: 14 
                          }
                        ]}
                      >
                        <TextInput 
                          style={{ flex: 1, height: 48, color: t.inputText, fontFamily: F.medium, fontSize: 14 }} 
                          placeholder="••••••••" 
                          placeholderTextColor={t.inputPlaceholder} 
                          value={password} 
                          onChangeText={setPassword} 
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity 
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeTouch}
                          accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          <MaterialIcons 
                            name={showPassword ? 'visibility-off' : 'visibility'} 
                            size={22} 
                            color={showPassword ? t.brandCyan : t.textSecondary} 
                          />
                        </TouchableOpacity>
                      </View>

                      {/* ENLACE DE RECUPERACIÓN */}
                      <TouchableOpacity
                        onPress={() => {
                          setForgotPasswordStep('request');
                          setShowForgotPasswordModal(true);
                        }}
                        style={styles.forgotPasswordBtn}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="lock-reset" size={16} color={t.brandCyan} />
                        <Text style={[styles.forgotPasswordText, { color: t.brandCyan, fontFamily: F.bold }]}>
                          ¿Olvidaste tu contraseña?
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Botón Ingresar */}
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: t.btnPrimaryBg, marginTop: 6 }]} 
                      onPress={handleAuth} 
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.btnText, { color: '#FFFFFF', fontFamily: F.extrabold }]}>
                            INGRESAR AL SISTEMA
                          </Text>
                          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Enlaces Legales en Acceso */}
                    <View style={{ marginTop: 12, alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11.5, fontFamily: F.medium, color: t.textSecondary, textAlign: 'center' }}>
                        Al acceder a Hermanos Lynch, aceptas el marco legal aplicable:
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => { setSelectedLegalDoc('terms'); setShowLegalModal(true); }}>
                          <Text style={{ fontSize: 11.5, fontFamily: F.bold, color: t.brandCyan, textDecorationLine: 'underline' }}>
                            Términos
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 11, color: t.textSecondary }}>•</Text>
                        <TouchableOpacity onPress={() => { setSelectedLegalDoc('privacy'); setShowLegalModal(true); }}>
                          <Text style={{ fontSize: 11.5, fontFamily: F.bold, color: t.brandCyan, textDecorationLine: 'underline' }}>
                            Privacidad
                          </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 11, color: t.textSecondary }}>•</Text>
                        <TouchableOpacity onPress={() => { setSelectedLegalDoc('cookies'); setShowLegalModal(true); }}>
                          <Text style={{ fontSize: 11.5, fontFamily: F.bold, color: t.brandCyan, textDecorationLine: 'underline' }}>
                            Cookies
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  
                  /* VISTA 2: REGISTRO PROGRESIVO POR PESTAÑAS (Acceso -> Datos -> Región) */
                  <View style={{ width: '100%' }}>
                    
                    {/* BARRA DE PESTAÑAS / PASOS */}
                    <View style={styles.stepTabsRow}>
                      
                      {/* Paso 1: Acceso */}
                      <TouchableOpacity 
                        onPress={() => setRegisterStep(1)}
                        style={[
                          styles.stepTabItem, 
                          registerStep === 1 && [styles.stepTabActive, { borderColor: t.brandCyan }]
                        ]}
                      >
                        <View style={[
                          styles.stepCircle, 
                          { backgroundColor: registerStep >= 1 ? t.brandCyan : t.stepInactiveBg }
                        ]}>
                          <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: '#FFFFFF' }}>
                            1
                          </Text>
                        </View>
                        <Text style={[
                          styles.stepTabText, 
                          { fontFamily: F.bold, color: registerStep === 1 ? t.textPrimary : t.stepInactiveText }
                        ]}>
                          Acceso
                        </Text>
                      </TouchableOpacity>

                      <View style={[styles.stepConnector, { backgroundColor: registerStep > 1 ? t.brandCyan : t.segmentBorder }]} />

                      {/* Paso 2: Datos */}
                      <TouchableOpacity 
                        onPress={() => {
                          if (email && password.length >= 6) setRegisterStep(2);
                        }}
                        style={[
                          styles.stepTabItem, 
                          registerStep === 2 && [styles.stepTabActive, { borderColor: t.brandCyan }]
                        ]}
                      >
                        <View style={[
                          styles.stepCircle, 
                          { backgroundColor: registerStep >= 2 ? t.brandCyan : t.stepInactiveBg }
                        ]}>
                          <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: registerStep >= 2 ? '#FFFFFF' : t.stepInactiveText }}>
                            2
                          </Text>
                        </View>
                        <Text style={[
                          styles.stepTabText, 
                          { fontFamily: F.bold, color: registerStep === 2 ? t.textPrimary : t.stepInactiveText }
                        ]}>
                          Datos
                        </Text>
                      </TouchableOpacity>

                      <View style={[styles.stepConnector, { backgroundColor: registerStep > 2 ? t.brandCyan : t.segmentBorder }]} />

                      {/* Paso 3: Región */}
                      <TouchableOpacity 
                        onPress={() => {
                          if (email && password.length >= 6 && firstName && lastName) setRegisterStep(3);
                        }}
                        style={[
                          styles.stepTabItem, 
                          registerStep === 3 && [styles.stepTabActive, { borderColor: t.brandCyan }]
                        ]}
                      >
                        <View style={[
                          styles.stepCircle, 
                          { backgroundColor: registerStep >= 3 ? t.brandCyan : t.stepInactiveBg }
                        ]}>
                          <Text style={{ fontFamily: F.extrabold, fontSize: 11, color: registerStep >= 3 ? '#FFFFFF' : t.stepInactiveText }}>
                            3
                          </Text>
                        </View>
                        <Text style={[
                          styles.stepTabText, 
                          { fontFamily: F.bold, color: registerStep === 3 ? t.textPrimary : t.stepInactiveText }
                        ]}>
                          Región
                        </Text>
                      </TouchableOpacity>

                    </View>

                    {/* CONTENEDOR FLUIDO DEL PASO ACTUAL */}
                    <View style={[styles.fluidCardStep, { backgroundColor: t.stepCardBg, borderColor: t.stepCardBorder }]}>
                      
                      {/* PASO 1: ACCESO & CREDENCIALES */}
                      {registerStep === 1 && (
                        <View style={{ gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MaterialIcons name="security" size={18} color={t.brandCyan} />
                            <Text style={{ fontFamily: F.bold, color: t.textPrimary, fontSize: 13, textTransform: 'uppercase' }}>
                              Paso 1: Seguridad & Credenciales
                            </Text>
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              CORREO ELECTRÓNICO
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="operador@correo.com" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={email} 
                              onChangeText={setEmail} 
                              autoCapitalize="none"
                              keyboardType="email-address"
                            />
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              CONTRASEÑA (MÍN. 6 CARACTERES)
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="••••••••" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={password} 
                              onChangeText={setPassword} 
                              secureTextEntry={!showPassword}
                              autoCapitalize="none"
                            />
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              CONFIRMAR CONTRASEÑA
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="••••••••" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={confirmPassword} 
                              onChangeText={setConfirmPassword} 
                              secureTextEntry={!showPassword}
                              autoCapitalize="none"
                            />
                          </View>

                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: t.btnPrimaryBg, marginTop: 8 }]} 
                            onPress={handleNextStep}
                            activeOpacity={0.85}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.btnText, { color: '#FFFFFF', fontFamily: F.extrabold }]}>
                                CONTINUAR A DATOS
                              </Text>
                              <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* PASO 2: DATOS DEL OPERADOR / CLIENTE */}
                      {registerStep === 2 && (
                        <View style={{ gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MaterialIcons name="person" size={18} color={t.brandCyan} />
                            <Text style={{ fontFamily: F.bold, color: t.textPrimary, fontSize: 13, textTransform: 'uppercase' }}>
                              Paso 2: Datos del Operador / Cliente
                            </Text>
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              NOMBRE(S)
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="Ej. Dervis" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={firstName} 
                              onChangeText={setFirstName} 
                            />
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              APELLIDO(S)
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="Ej. Martinez" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={lastName} 
                              onChangeText={setLastName} 
                            />
                          </View>

                          {/* PREGUNTA VEHÍCULO DE LA EMPRESA (Activa Wallet) */}
                          <TouchableOpacity 
                            style={[
                              styles.companyVehicleCard, 
                              { 
                                backgroundColor: drivesCompanyVehicle 
                                  ? (isDark ? 'rgba(0, 227, 253, 0.12)' : 'rgba(2, 132, 199, 0.10)') 
                                  : t.inputBg,
                                borderColor: drivesCompanyVehicle ? t.brandCyan : t.inputBorder 
                              }
                            ]}
                            onPress={() => setDrivesCompanyVehicle(!drivesCompanyVehicle)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons 
                              name={drivesCompanyVehicle ? "check-box" : "check-box-outline-blank"} 
                              size={22} 
                              color={drivesCompanyVehicle ? t.brandCyan : t.textSecondary} 
                            />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={[styles.companyVehicleTitle, { color: t.textPrimary, fontFamily: F.bold }]}>
                                ¿Conduces algún vehículo de la empresa?
                              </Text>
                              <Text style={[styles.companyVehicleSubtitle, { color: t.textSecondary, fontFamily: F.medium }]}>
                                {drivesCompanyVehicle 
                                  ? 'Activará la Guantera Digital (Wallet) para licencias y pólizas del vehículo corporativo.'
                                  : 'Solo operarás plantas eléctricas (la Guantera Digital permanecerá oculta).'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <TouchableOpacity 
                              style={[styles.secondaryActionBtn, { borderColor: t.btnSecondaryBorder, backgroundColor: t.btnSecondaryBg }]} 
                              onPress={handlePrevStep}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="chevron-left" size={20} color={t.btnSecondaryText} />
                              <Text style={{ fontFamily: F.bold, color: t.btnSecondaryText, fontSize: 13 }}>
                                ATRÁS
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[styles.actionBtn, { flex: 1, backgroundColor: t.btnPrimaryBg }]} 
                              onPress={handleNextStep}
                              activeOpacity={0.85}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.btnText, { color: '#FFFFFF', fontFamily: F.extrabold }]}>
                                  SIGUIENTE
                                </Text>
                                <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
                              </View>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* PASO 3: REGIÓN & UBICACIÓN */}
                      {registerStep === 3 && (
                        <View style={{ gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MaterialIcons name="place" size={18} color={t.brandCyan} />
                            <Text style={{ fontFamily: F.bold, color: t.textPrimary, fontSize: 13, textTransform: 'uppercase' }}>
                              Paso 3: Región & Ubicación
                            </Text>
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              PAÍS
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="Ej. Venezuela / Colombia / España" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={country} 
                              onChangeText={setCountry} 
                            />
                          </View>

                          <View>
                            <Text style={[styles.fieldLabel, { color: t.inputLabel, fontFamily: F.bold }]}>
                              ESTADO / PROVINCIA / CIUDAD
                            </Text>
                            <TextInput 
                              style={[
                                styles.input, 
                                { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, fontFamily: F.medium }
                              ]} 
                              placeholder="Ej. Carabobo, Valencia" 
                              placeholderTextColor={t.inputPlaceholder} 
                              value={state} 
                              onChangeText={setState} 
                            />
                          </View>

                          {/* CASILLAS SEPARADAS OBLIGATORIAS */}
                          <LegalConsentCheckboxes
                            termsAccepted={termsAccepted}
                            onToggleTerms={() => {
                              setTermsAccepted((prev) => !prev);
                              if (!termsAccepted) setShowLegalErrors(false);
                            }}
                            privacyAccepted={privacyAccepted}
                            onTogglePrivacy={() => {
                              setPrivacyAccepted((prev) => !prev);
                              if (!privacyAccepted) setShowLegalErrors(false);
                            }}
                            onOpenDoc={(doc) => {
                              setSelectedLegalDoc(doc);
                              setShowLegalModal(true);
                            }}
                            showValidationErrors={showLegalErrors}
                            disabled={loading}
                          />

                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <TouchableOpacity 
                              style={[styles.secondaryActionBtn, { borderColor: t.btnSecondaryBorder, backgroundColor: t.btnSecondaryBg }]} 
                              onPress={handlePrevStep}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="chevron-left" size={20} color={t.btnSecondaryText} />
                              <Text style={{ fontFamily: F.bold, color: t.btnSecondaryText, fontSize: 13 }}>
                                ATRÁS
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[styles.actionBtn, { flex: 1, backgroundColor: t.brandGreen }]} 
                              onPress={handleAuth}
                              disabled={loading}
                              activeOpacity={0.85}
                            >
                              {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                                  <Text style={[styles.btnText, { color: '#FFFFFF', fontFamily: F.extrabold }]}>
                                    CREAR CUENTA
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                    </View>
                  </View>
                )}

              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>

      {/* MODAL VISOR DE DOCUMENTOS LEGALES (TÉRMINOS, PRIVACIDAD, COOKIES) */}
      <LegalDocModal
        visible={showLegalModal}
        initialDoc={selectedLegalDoc}
        onClose={() => setShowLegalModal(false)}
        onAccept={(docType) => {
          if (docType === 'terms') {
            setTermsAccepted(true);
          } else if (docType === 'privacy') {
            setPrivacyAccepted(true);
          }
        }}
      />

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA SUPABASE */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        initialEmail={email}
        initialStep={forgotPasswordStep}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccess={() => {
          setIsLogin(true);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  topBarContainer: {
    width: '100%',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? 20 : 48,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  navPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  desktopSplitLayout: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1120,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 56,
  },
  desktopHeroColumn: {
    flex: 1.15,
    maxWidth: 540,
    paddingRight: 16,
  },
  desktopMainHeading: {
    fontSize: 44,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: -1,
    lineHeight: 48,
    marginBottom: 6,
  },
  desktopSubHeading: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  desktopDesc: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 22,
    marginBottom: 28,
  },
  heroFeatureList: {
    gap: 14,
  },
  heroFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFeatureText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  desktopCardContainer: {
    maxWidth: 450,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
  },
  segmentedBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 22,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentText: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    width: '100%',
    justifyContent: 'center',
  },
  eyeTouch: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  actionBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  secondaryActionBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  btnText: {
    fontSize: 13.5,
    letterSpacing: 0.8,
  },
  stepTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stepTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  stepTabActive: {
    backgroundColor: 'rgba(0, 227, 253, 0.10)',
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTabText: {
    fontSize: 12,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  fluidCardStep: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  forgotPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  forgotPasswordText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  companyVehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  companyVehicleTitle: {
    fontSize: 12.5,
  },
  companyVehicleSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
});
