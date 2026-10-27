import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { useMyMoto } from '@/presentation/context/MotoContext';
import { SetupScreen } from '@/presentation/screens/SetupScreen';
import { MainApp } from '@/presentation/screens/MainApp';
import { AuthScreen } from '@/presentation/screens/AuthScreen';
import { PendingApprovalScreen } from '@/presentation/screens/PendingApprovalScreen';
import { supabase } from '@/data/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { handleRecoveryDeepLink, RecoveryDeepLinkResult } from '@/services/authRecoveryService';

const PreloadScreen = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.preloadContainer}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', transform: [{ scale: pulseAnim }] }}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="generator-portable" size={56} color="#00e3fd" />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.preloadTitle, { opacity: fadeAnim }]}>
        HERMANOS LYNCH
      </Animated.Text>
      <Animated.Text style={[styles.preloadSubtitle, { opacity: fadeAnim }]}>
        Iniciando sistema telemático de plantas eléctricas...
      </Animated.Text>
    </View>
  );
};

export default function HomeScreen() {
  const { 
    myMoto, 
    isLoaded, 
    isAddingMoto, 
    approvalStatus, 
    checkApprovalStatus, 
    isAdmin, 
    logout 
  } = useMyMoto();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [minWaitDone, setMinWaitDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        return;
      }
      if (!session) {
        setIsRecoveryMode(false);
      }
    });

    // Escucha de enlaces profundos de recuperación en Web
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleRecoveryDeepLink(url).then((res: RecoveryDeepLinkResult) => {
          if (res.isRecovery) {
            setIsRecoveryMode(true);
          }
        });
      }
    });

    const urlListener = Linking.addEventListener('url', ({ url }) => {
      handleRecoveryDeepLink(url).then((res: RecoveryDeepLinkResult) => {
        if (res.isRecovery) {
          setIsRecoveryMode(true);
        }
      });
    });

    setTimeout(() => {
      setMinWaitDone(true);
    }, 900);

    return () => {
      authListener?.subscription.unsubscribe();
      urlListener.remove();
    };
  }, []);

  if (authLoading || !isLoaded || !minWaitDone) {
    return <PreloadScreen />;
  }

  // 1. MODO DE RECUPERACIÓN DE CONTRASEÑA
  if (isRecoveryMode) {
    return (
      <AuthScreen
        initialRecoveryMode={true}
        onBack={() => setIsRecoveryMode(false)}
      />
    );
  }

  // 2. USUARIO NO AUTENTICADO: ENTRADA DIRECTA AL LOGIN (SIN LANDING)
  if (!session) {
    return <AuthScreen />;
  }

  // 3. CONTROL DE APROBACIÓN POR EL OPERADOR PRINCIPAL (SUPER USUARIO)
  // Nuevos registros quedan en espera hasta ser avalados en el sistema
  if (approvalStatus !== 'approved' && !isAdmin) {
    return (
      <PendingApprovalScreen
        userEmail={session.user.email}
        isRejected={approvalStatus === 'rejected'}
        onRefresh={checkApprovalStatus}
        onLogout={logout}
      />
    );
  }

  // 4. USUARIO SIN PLANTA REGISTRADA (O REGISTRANDO NUEVA UNIDAD): ONBOARDING DE PLANTA
  if (!myMoto || isAddingMoto) {
    return <SetupScreen />;
  }

  // 5. PANEL PRINCIPAL TELEMÁTICO WEB DE LA PLANTA ELÉCTRICA
  return <MainApp />;
}

const styles = StyleSheet.create({
  preloadContainer: {
    flex: 1,
    backgroundColor: '#0c1017',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#161d2b',
    borderWidth: 1.5,
    borderColor: '#275FE3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00e3fd',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  preloadTitle: {
    color: '#ffffff',
    marginTop: 24,
    fontSize: 18,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 1.5,
  },
  preloadSubtitle: {
    color: '#8ca9ff',
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    letterSpacing: 0.3,
  },
});
