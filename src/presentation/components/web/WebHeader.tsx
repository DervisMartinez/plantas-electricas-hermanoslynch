import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useMyMoto } from '../../context/MotoContext';
import { supabase } from '../../../data/supabaseClient';
import { isCar, isPlanta } from '../../../domain/entities/Moto';

interface WebHeaderProps {
  activeTab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile';
  onSelectTab: (tab: 'moto' | 'specs' | 'services' | 'wallet' | 'history' | 'profile') => void;
  onOpenQuickOdo: () => void;
  onOpenQuickFuel: () => void;
  onOpenSOS?: () => void;
  onOpenReport?: () => void;
}

export const WebHeader: React.FC<WebHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickOdo,
  onOpenQuickFuel,
  onOpenReport,
}) => {
  const { colors, mode, toggleTheme } = useTheme();
  const { myMoto, motos, selectMoto, setIsAddingMoto, drivesCompanyVehicle } = useMyMoto();
  const [motoMenuVisible, setMotoMenuVisible] = useState(false);
  const { width } = useWindowDimensions();

  // Clean responsive thresholds:
  // - showInlineTabs: Only on wide displays (>= 1500px) with ample room for 3 columns.
  // - showSubNav: On all laptop, tablet, and mobile displays (< 1500px) to guarantee ZERO overlap!
  const isDesktopWide = width >= 1340;
  const isDesktopCompact = width >= 1080 && width < 1340;
  const isTablet = width >= 600 && width < 1080;
  const showInlineTabs = width >= 1180;
  const showSubNav = width < 1180;
  const isSmallPhone = width < 520;
  const isTinyPhone = width < 360;
  const isCurrentCar = isCar(myMoto);
  const isCurrentPlanta = isPlanta(myMoto);

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  const isDark = mode === 'dark';

  const navItems = [
    { 
      id: 'moto' as const, 
      label: isDesktopWide ? (isCurrentPlanta ? 'PLANTA' : isCurrentCar ? 'VEHÍCULO' : 'MOTO') : (isCurrentPlanta ? 'Planta' : isCurrentCar ? 'Vehículo' : 'Moto'), 
      icon: isCurrentPlanta ? 'generator-portable' : isCurrentCar ? 'directions-car' : 'engine', 
      iconFamily: (isCurrentPlanta || !isCurrentCar) ? ('community' as const) : ('material' as const) 
    },
    { 
      id: 'specs' as const, 
      label: isDesktopWide ? 'FICHA TÉCNICA' : 'Ficha', 
      icon: 'description', 
      iconFamily: 'material' as const 
    },
    { 
      id: 'services' as const, 
      label: isDesktopWide ? 'SERVICIOS' : 'Servicios', 
      icon: 'build', 
      iconFamily: 'material' as const 
    },
    { 
      id: 'history' as const, 
      label: isDesktopWide ? 'HISTORIAL' : 'Historial', 
      icon: 'receipt-long', 
      iconFamily: 'material' as const 
    },
    { 
      id: 'wallet' as const, 
      label: isDesktopWide ? 'WALLET' : 'Wallet', 
      icon: 'account-balance-wallet', 
      iconFamily: 'material' as const 
    },
    { 
      id: 'profile' as const, 
      label: isDesktopWide ? 'PERFIL' : 'Perfil', 
      icon: 'person', 
      iconFamily: 'material' as const 
    },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ width: '100%', position: Platform.OS === 'web' ? ('sticky' as any) : 'relative', top: 0, zIndex: 1000 }}>
      {/* FIXED TRANSPARENT BACKDROP FOR MOTO DROPDOWN */}
      {motoMenuVisible && (
        <TouchableOpacity 
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setMotoMenuVisible(false)}
        />
      )}

      {/* MAIN TOP NAVIGATION BAR */}
      <View style={[
        styles.headerContainer, 
        { 
          backgroundColor: isDark ? 'rgba(17, 19, 25, 0.97)' : 'rgba(255, 255, 255, 0.97)', 
          borderBottomColor: isDark ? 'rgba(64, 72, 92, 0.35)' : 'rgba(0, 0, 0, 0.08)',
          paddingHorizontal: isDesktopWide ? 24 : (isDesktopCompact ? 16 : (isSmallPhone ? 10 : 14)),
          height: isSmallPhone ? 58 : 64,
        }
      ]}>
        
        {/* LEFT: BRAND & MOTO SWITCHER */}
        <View style={[styles.leftGroup, { gap: isDesktopWide ? 14 : (isSmallPhone ? 6 : 10), marginRight: isSmallPhone ? 6 : 14, flexShrink: 1, minWidth: 0 }]}>
          <TouchableOpacity 
            style={styles.logoRow} 
            activeOpacity={0.8}
            onPress={() => onSelectTab('moto')}
          >
            <Image
              source={require('../../../../assets/images/logo and media coorporative/logo-sin-nombre.png')}
              style={{ width: isSmallPhone ? 28 : 34, height: isSmallPhone ? 28 : 34, marginRight: 6 }}
              resizeMode="contain"
            />
            <Text style={[
              styles.brandText, 
              { 
                color: isDark ? '#ffffff' : '#111319',
                fontSize: isTinyPhone ? 14 : (isSmallPhone ? 15 : 18),
                letterSpacing: 1.2,
              }
            ]}>
              HERMANOS LYNCH
            </Text>
            <View style={[styles.brandAccentDot, isSmallPhone && { width: 5, height: 5, marginTop: 7, marginLeft: -3 }]} />
          </TouchableOpacity>

          {/* MOTO SELECTOR PILL & FLOATING DROPDOWN */}
          {myMoto && (
            <View style={{ position: 'relative', zIndex: 99999, flexShrink: 1, minWidth: 0 }}>
              <TouchableOpacity
                style={[styles.motoSelectorPill, { 
                  backgroundColor: isDark ? 'rgba(29, 32, 37, 0.9)' : '#ececf0',
                  borderColor: motoMenuVisible ? '#00e3fd' : (isDark ? '#40485c' : '#d0d4dc'),
                  maxWidth: isDesktopWide ? 220 : (isTinyPhone ? 115 : (isSmallPhone ? 175 : (isTablet ? 180 : 150))),
                  paddingHorizontal: isSmallPhone ? 8 : 10,
                  paddingVertical: isSmallPhone ? 4 : 5,
                }]}
                onPress={() => setMotoMenuVisible(!motoMenuVisible)}
                activeOpacity={0.8}
              >
                <MaterialIcons 
                  name={isCurrentPlanta ? "bolt" : isCurrentCar ? "directions-car" : "two-wheeler"} 
                  size={isSmallPhone ? 13 : 15} 
                  color="#4169E1" 
                  style={{ marginRight: 3 }} 
                />
                <Text style={[styles.motoSelectorText, { color: colors.onSurface, fontSize: isSmallPhone ? 10.5 : 11.5 }]} numberOfLines={1}>
                  {isSmallPhone ? myMoto.model : `${myMoto.brand} ${myMoto.model}`}
                </Text>
                <MaterialIcons 
                  name={motoMenuVisible ? "arrow-drop-up" : "arrow-drop-down"} 
                  size={isSmallPhone ? 14 : 16} 
                  color={colors.onSurfaceVariant} 
                />
              </TouchableOpacity>

              {/* DROPDOWN MENU */}
              {motoMenuVisible && (
                <View style={[styles.dropdownMenu, { 
                  backgroundColor: isDark ? '#191c21' : '#ffffff',
                  borderColor: isDark ? 'rgba(0, 227, 253, 0.4)' : '#d0d4dc',
                  width: isSmallPhone ? 260 : 290,
                }]}>
                  <View style={styles.dropdownHeaderRow}>
                    <Text style={[styles.dropdownTitle, { color: colors.onSurfaceVariant }]}>
                      TUS VEHÍCULOS ({motos.length})
                    </Text>
                  </View>

                  <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={true}>
                    {motos.map((m) => {
                      const isCurrent = m.id === myMoto.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.dropdownItem,
                            isCurrent && { 
                              backgroundColor: isDark ? 'rgba(65, 105, 225, 0.2)' : 'rgba(39, 95, 227, 0.12)',
                              borderLeftColor: '#4169E1',
                              borderLeftWidth: 3,
                            }
                          ]}
                          onPress={() => {
                            selectMoto(m.id);
                            setMotoMenuVisible(false);
                          }}
                        >
                          <MaterialIcons 
                            name={isCar(m) ? "directions-car" : "two-wheeler"} 
                            size={18} 
                            color={isCurrent ? '#00e3fd' : colors.onSurfaceVariant} 
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.dropdownItemText, { 
                              color: isCurrent ? (isDark ? '#ffffff' : '#275FE3') : colors.onSurface,
                              fontFamily: isCurrent ? F.bold : F.semibold
                            }]}>
                              {m.brand} {m.model}
                            </Text>
                            <Text style={[styles.dropdownItemSub, { color: colors.onSurfaceVariant }]}>
                              {isPlanta(m) ? `${(m.currentHours || m.currentOdometer).toLocaleString()} hrs` : `${m.currentOdometer.toLocaleString()} km`} {m.year ? `• Año ${m.year}` : ''}
                            </Text>
                          </View>
                          {isCurrent && (
                            <MaterialIcons name="check-circle" size={18} color="#00e3fd" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  
                  {/* BOTÓN PROMINENTE: ANEXAR OTRA PLANTA / VEHÍCULO */}
                  <TouchableOpacity
                    style={[styles.addNewMotoBtn, { 
                      backgroundColor: isDark ? 'rgba(0, 227, 253, 0.12)' : 'rgba(0, 174, 120, 0.1)',
                      borderColor: '#00e3fd',
                      cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
                    }]}
                    onPress={() => {
                      setMotoMenuVisible(false);
                      setIsAddingMoto(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add-circle" size={19} color="#00e3fd" />
                    <Text style={styles.addNewMotoText}>
                      {isCurrentPlanta ? 'Anexar una nueva planta / equipo' : 'Anexar un nuevo vehículo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* CENTER: DESKTOP NAVIGATION TABS (visible >= 1340px only) */}
        {showInlineTabs && (
          <View style={styles.centerNavContainer}>
            <View style={[styles.centerNavScroll, { gap: isDesktopWide ? 8 : 4 }]}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onSelectTab(item.id)}
                    style={[
                      styles.navLink,
                      {
                        paddingVertical: isDesktopWide ? 7 : 5,
                        paddingHorizontal: isDesktopWide ? 12 : 7,
                      },
                      isActive && {
                        backgroundColor: isDark ? 'rgba(65, 105, 225, 0.18)' : 'rgba(39, 95, 227, 0.12)',
                        borderColor: '#4169E1',
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    {item.iconFamily === 'community' ? (
                      <MaterialCommunityIcons 
                        name={item.icon as any} 
                        size={isDesktopWide ? 16 : 14} 
                        color={isActive ? '#00e3fd' : colors.onSurfaceVariant} 
                      />
                    ) : (
                      <MaterialIcons 
                        name={item.icon as any} 
                        size={isDesktopWide ? 16 : 14} 
                        color={isActive ? '#00e3fd' : colors.onSurfaceVariant} 
                      />
                    )}
                    <Text style={[
                      styles.navLabel, 
                      { 
                        fontSize: isDesktopWide ? 11.5 : 10,
                        color: isActive ? (isDark ? '#ffffff' : '#275FE3') : colors.onSurfaceVariant,
                        fontFamily: isActive ? F.bold : F.medium,
                      }
                    ]}>
                      {item.label}
                    </Text>
                    {isActive && <View style={styles.navActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* RIGHT: ACTIONS & USER */}
        <View style={[styles.rightGroup, { gap: isDesktopWide ? 8 : (isSmallPhone ? 4 : 6), flexShrink: 0 }]}>
          
          {/* THEME TOGGLE */}
          <TouchableOpacity
            style={[styles.iconButton, { 
              borderColor: isDark ? '#40485c' : '#d0d4dc',
              width: isSmallPhone ? 30 : 34,
              height: isSmallPhone ? 30 : 34,
              borderRadius: isSmallPhone ? 15 : 17,
            }]}
            onPress={toggleTheme}
            accessibilityLabel={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            <MaterialIcons 
              name={isDark ? 'wb-sunny' : 'nightlight-round'} 
              size={isSmallPhone ? 15 : 17} 
              color={isDark ? '#ffb703' : '#4169E1'} 
            />
          </TouchableOpacity>

          {/* QUICK LOG BUTTON (+ KM) - On desktop/tablets; on mobile phones buttons are prominent in Hero */}
          {!isSmallPhone && (
            <TouchableOpacity
              style={[
                styles.quickAddButton,
                {
                  paddingHorizontal: isDesktopCompact ? 9 : 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }
              ]}
              onPress={onOpenQuickOdo}
              activeOpacity={0.8}
              accessibilityLabel="Actualizar kilometraje"
            >
              <MaterialIcons name="speed" size={15} color="#ffffff" />
              <Text style={styles.quickAddText}>{isCurrentPlanta ? '+ HORAS' : '+ KM'}</Text>
            </TouchableOpacity>
          )}

          {/* FUEL LOG BUTTON (+ GAS) */}
          {!isSmallPhone && (
            <TouchableOpacity
              style={[
                styles.fuelButton,
                {
                  paddingHorizontal: isDesktopCompact ? 9 : 11,
                  paddingVertical: 6,
                  borderRadius: 16,
                }
              ]}
              onPress={onOpenQuickFuel}
              activeOpacity={0.8}
              accessibilityLabel="Registrar gasolina"
            >
              <MaterialCommunityIcons name="gas-station" size={15} color="#00e3fd" />
              <Text style={styles.fuelText}>{isCurrentPlanta ? '+ DIÉSEL' : '+ GAS'}</Text>
            </TouchableOpacity>
          )}

          {/* PDF REPORT BUTTON */}
          <TouchableOpacity
            style={[
              styles.reportButton,
              {
                paddingHorizontal: isDesktopCompact ? 8 : 11,
                paddingVertical: 6,
                borderRadius: 16,
              }
            ]}
            onPress={onOpenReport}
            activeOpacity={0.8}
            accessibilityLabel="Generar Reporte PDF"
          >
            <MaterialIcons name="picture-as-pdf" size={15} color="#e53e3e" />
            {!isSmallPhone && <Text style={styles.reportText}>PDF</Text>}
          </TouchableOpacity>

          {/* SIGN OUT */}
          <TouchableOpacity
            style={[styles.iconButton, { 
              borderColor: isDark ? '#40485c' : '#d0d4dc',
              width: isSmallPhone ? 30 : 34,
              height: isSmallPhone ? 30 : 34,
              borderRadius: isSmallPhone ? 15 : 17,
            }]}
            onPress={handleSignOut}
            accessibilityLabel="Cerrar sesión"
          >
            <MaterialIcons name="logout" size={isSmallPhone ? 14 : 16} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

      </View>

      {/* RESPONSIVE HORIZONTAL SUB-NAVIGATION (< 1340px) */}
      {showSubNav && (
        <View style={[
          styles.mobileSubNav,
          { 
            backgroundColor: isDark ? 'rgba(21, 24, 32, 0.98)' : 'rgba(245, 247, 250, 0.98)',
            borderBottomColor: isDark ? 'rgba(64, 72, 92, 0.35)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.mobileSubNavScroll, width >= 768 && { justifyContent: 'center', width: '100%' }]}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onSelectTab(item.id)}
                  style={[
                    styles.mobileNavChip,
                    {
                      backgroundColor: isActive 
                        ? (isDark ? 'rgba(65, 105, 225, 0.22)' : 'rgba(39, 95, 227, 0.12)') 
                        : (isDark ? 'rgba(35, 40, 52, 0.5)' : 'rgba(230, 235, 245, 0.7)'),
                      borderColor: isActive ? '#00e3fd' : (isDark ? 'rgba(64, 72, 92, 0.3)' : 'rgba(0, 0, 0, 0.08)'),
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  {item.iconFamily === 'community' ? (
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={14} 
                      color={isActive ? '#00e3fd' : colors.onSurfaceVariant} 
                    />
                  ) : (
                    <MaterialIcons 
                      name={item.icon as any} 
                      size={14} 
                      color={isActive ? '#00e3fd' : colors.onSurfaceVariant} 
                    />
                  )}
                  <Text style={[
                    styles.mobileNavChipText,
                    {
                      color: isActive ? (isDark ? '#ffffff' : '#275FE3') : colors.onSurfaceVariant,
                      fontFamily: isActive ? F.bold : F.semibold,
                    }
                  ]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.navActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    overflow: 'visible', // Permite que el menú desplegable sea visible
    position: 'relative',
    zIndex: 1000,
  },
  dropdownBackdrop: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 227, 253, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 227, 253, 0.3)',
  },
  brandText: {
    fontSize: 22,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 2,
  },
  brandAccentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4169E1',
    marginLeft: -4,
    marginTop: 10,
  },
  motoSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  motoSelectorText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_600SemiBold',
    marginRight: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    zIndex: 99999,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  dropdownHeaderRow: {
    paddingHorizontal: 8,
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(64, 72, 92, 0.25)',
  },
  dropdownTitle: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 2,
  },
  dropdownItemText: {
    fontSize: 12.5,
  },
  dropdownItemSub: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  addNewMotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  addNewMotoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: '#00e3fd',
    letterSpacing: 0.3,
  },
  centerNavContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  centerNavScroll: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navLabel: {
    letterSpacing: 0.8,
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00e3fd',
    marginLeft: 2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#4169E1',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  quickAddText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  fuelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 227, 253, 0.15)',
    borderColor: 'rgba(0, 227, 253, 0.4)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    gap: 4,
  },
  fuelText: {
    color: '#00e3fd',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 62, 62, 0.12)',
    borderColor: 'rgba(229, 62, 62, 0.4)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    gap: 4,
  },
  reportText: {
    color: '#e53e3e',
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
  },
  mobileSubNav: {
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  mobileSubNavScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
  },
  mobileNavChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  mobileNavChipText: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
