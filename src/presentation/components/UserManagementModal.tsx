import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { supabase } from '../../data/supabaseClient';
import { CreateOperatorModal } from './CreateOperatorModal';
import { AssignOperatorModal } from './AssignOperatorModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<Props> = ({ visible, onClose }) => {
  const { isDark } = useTheme();
  const {
    systemMetrics,
    pendingUsersList,
    superAdminsList,
    operatorsList,
    clientsList,
    loadSystemUsers,
    approveUser,
    rejectUser,
    changeUserRole,
  } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const [activeFilter, setActiveFilter] = useState<'pending' | 'superadmins' | 'operators' | 'clients' | 'fleet' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOperatorVisible, setCreateOperatorVisible] = useState(false);
  const [assigningOperator, setAssigningOperator] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // Fleet Catalog Management
  const [fleetList, setFleetList] = useState<any[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [showCreateFleetModal, setShowCreateFleetModal] = useState(false);
  const [fleetBrand, setFleetBrand] = useState('');
  const [fleetModel, setFleetModel] = useState('');
  const [fleetPlate, setFleetPlate] = useState('');
  const [fleetImageUrl, setFleetImageUrl] = useState('');
  const [fleetKm, setFleetKm] = useState('');
  const [savingFleetVehicle, setSavingFleetVehicle] = useState(false);

  const fetchFleet = async () => {
    setLoadingFleet(true);
    try {
      const { data } = await supabase
        .from('vehiculos_empresa')
        .select('*')
        .order('created_at', { ascending: false });
      setFleetList(data || []);
    } catch (e) {
      console.warn('Notice al cargar flota en admin:', e);
    } finally {
      setLoadingFleet(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      fetchFleet();
      loadSystemUsers();
    }
  }, [visible]);

  const handleCreateFleetVehicle = async () => {
    if (!fleetBrand.trim() || !fleetModel.trim() || !fleetPlate.trim()) {
      const msg = 'Ingresa marca, modelo y placa del vehículo.';
      if (Platform.OS === 'web') window.alert(msg);
      else alert(msg);
      return;
    }
    setSavingFleetVehicle(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const { error } = await supabase.from('vehiculos_empresa').insert({
        user_id: user?.id || null,
        brand: fleetBrand.trim(),
        model: fleetModel.trim(),
        plate: fleetPlate.trim().toUpperCase(),
        image_url: fleetImageUrl.trim() || null,
        current_odometer: parseInt(fleetKm) || 0,
        year: 2026,
      });

      if (error) throw error;

      await fetchFleet();
      setShowCreateFleetModal(false);
      setFleetBrand('');
      setFleetModel('');
      setFleetPlate('');
      setFleetImageUrl('');
      setFleetKm('');
      const successMsg = 'Vehículo de flota registrado con éxito en el catálogo oficial.';
      if (Platform.OS === 'web') window.alert(successMsg);
      else alert(successMsg);
    } catch (err: any) {
      const errorMsg = 'Error al registrar vehículo: ' + (err.message || 'Intenta de nuevo.');
      if (Platform.OS === 'web') window.alert(errorMsg);
      else alert(errorMsg);
    } finally {
      setSavingFleetVehicle(false);
    }
  };

  const handleDeleteFleetVehicle = async (vehicleId: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('¿Deseas eliminar este vehículo del catálogo de flota?')) return;
    }
    try {
      await supabase.from('vehiculos_empresa').delete().eq('id', vehicleId);
      await fetchFleet();
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Error eliminando vehículo: ' + err.message);
      else alert('Error eliminando vehículo: ' + err.message);
    }
  };

  const isDesktop = windowWidth >= 800;

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

  const pendingCount = systemMetrics?.pending_approvals || 0;
  const operatorsCount = systemMetrics?.total_operators || 0;
  const clientsCount = systemMetrics?.total_clients || 0;
  const plantsCount = systemMetrics?.total_plants || 0;

  // Filtered displayed list
  const currentList = useMemo(() => {
    let list: any[] = [];
    if (activeFilter === 'pending') list = pendingUsersList;
    else if (activeFilter === 'superadmins') list = superAdminsList;
    else if (activeFilter === 'operators') list = operatorsList;
    else if (activeFilter === 'clients') list = clientsList;
    else {
      list = [...pendingUsersList, ...superAdminsList, ...operatorsList, ...clientsList];
      // Deduplicate by id if same user appears in multiple lists
      const seen = new Set();
      list = list.filter((u) => {
        if (!u?.id || seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.operator_code || '').toLowerCase().includes(q) ||
        (u.specialty || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    );
  }, [activeFilter, pendingUsersList, superAdminsList, operatorsList, clientsList, searchQuery]);

  const totalPages = useMemo(() => Math.ceil(currentList.length / PAGE_SIZE) || 1, [currentList.length]);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return currentList.slice(start, start + PAGE_SIZE);
  }, [currentList, currentPage]);

  const filteredFleet = useMemo(() => {
    if (!searchQuery.trim()) return fleetList;
    const q = searchQuery.toLowerCase().trim();
    return fleetList.filter(
      (v) =>
        (v.brand || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q) ||
        (v.plate || '').toLowerCase().includes(q)
    );
  }, [fleetList, searchQuery]);

  const totalFleetPages = useMemo(() => Math.ceil(filteredFleet.length / PAGE_SIZE) || 1, [filteredFleet.length]);
  const paginatedFleet = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFleet.slice(start, start + PAGE_SIZE);
  }, [filteredFleet, currentPage]);

  const handleApprove = async (userId: string, asRole?: 'superadmin' | 'operator' | 'client') => {
    setActionLoadingId(userId);
    try {
      if (asRole) {
        await changeUserRole(userId, asRole);
      } else {
        await approveUser(userId);
      }
      await loadSystemUsers();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePromoteRole = async (userId: string, newRole: 'superadmin' | 'operator' | 'client') => {
    const roleName = newRole === 'superadmin' ? 'Super Administrador' : (newRole === 'operator' ? 'Operador Técnico' : 'Cliente');
    if (Platform.OS === 'web') {
      if (!window.confirm(`¿Confirmas asignar el rol de ${roleName} a este usuario?`)) return;
    }
    setActionLoadingId(userId);
    try {
      await changeUserRole(userId, newRole);
      await loadSystemUsers();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await rejectUser(userId);
      await loadSystemUsers();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                <MaterialIcons name="admin-panel-settings" size={24} color={accentBlue} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Control de Usuarios y Aprobaciones
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Supervisión del Operador Principal Hermanos Lynch
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 5 KPI CARDS */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: 'rgba(0, 227, 253, 0.3)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                  Super Admins
                </Text>
                <MaterialIcons name="security" size={14} color="#00e3fd" />
              </View>
              <Text style={[styles.kpiValue, { color: '#00e3fd', fontFamily: F.extrabold }]}>
                {superAdminsList.length}
              </Text>
              <Text style={[styles.kpiSub, { color: '#00e3fd', fontFamily: F.semibold }]}>
                Control Total
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Operadores HL
              </Text>
              <Text style={[styles.kpiValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                {operatorsCount}
              </Text>
              <Text style={[styles.kpiSub, { color: accentCyan, fontFamily: F.semibold }]}>
                Certificados
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Clientes
              </Text>
              <Text style={[styles.kpiValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                {clientsCount}
              </Text>
              <Text style={[styles.kpiSub, { color: textSecondary, fontFamily: F.semibold }]}>
                Con plantas
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Plantas Activas
              </Text>
              <Text style={[styles.kpiValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                {plantsCount}
              </Text>
              <Text style={[styles.kpiSub, { color: '#22c55e', fontFamily: F.semibold }]}>
                En monitoreo
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: pendingCount > 0 ? 'rgba(245, 158, 11, 0.12)' : cardSubBg,
                  borderColor: pendingCount > 0 ? '#f59e0b' : borderModal,
                },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Por Aprobar
              </Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: pendingCount > 0 ? '#f59e0b' : textPrimary, fontFamily: F.extrabold },
                ]}
              >
                {pendingCount}
              </Text>
              <Text
                style={{
                  fontFamily: F.bold,
                  fontSize: 10,
                  color: pendingCount > 0 ? '#f59e0b' : textSecondary,
                }}
              >
                {pendingCount > 0 ? '¡Requiere Acción!' : 'Al día'}
              </Text>
            </View>
          </View>

          {/* ACTION TOOLBAR & FILTER TABS */}
          <View style={styles.toolbarRow}>
            {/* TABS */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                onPress={() => setActiveFilter('pending')}
                style={[
                  styles.tabPill,
                  activeFilter === 'pending' && [styles.activeTabPill, { backgroundColor: '#f59e0b' }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'pending' ? '#0c0e14' : textSecondary,
                  }}
                >
                  Pendientes ({pendingCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('superadmins')}
                style={[
                  styles.tabPill,
                  activeFilter === 'superadmins' && [styles.activeTabPill, { backgroundColor: '#00e3fd' }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'superadmins' ? '#0c0e14' : textSecondary,
                  }}
                >
                  Super Admins ({superAdminsList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('operators')}
                style={[
                  styles.tabPill,
                  activeFilter === 'operators' && [styles.activeTabPill, { backgroundColor: accentBlue }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'operators' ? '#ffffff' : textSecondary,
                  }}
                >
                  Operadores ({operatorsCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('clients')}
                style={[
                  styles.tabPill,
                  activeFilter === 'clients' && [styles.activeTabPill, { backgroundColor: accentCyan }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'clients' ? '#0c0e14' : textSecondary,
                  }}
                >
                  Clientes ({clientsCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('fleet')}
                style={[
                  styles.tabPill,
                  activeFilter === 'fleet' && [styles.activeTabPill, { backgroundColor: '#10b981' }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'fleet' ? '#ffffff' : textSecondary,
                  }}
                >
                  Flota Oficial ({fleetList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                style={[
                  styles.tabPill,
                  activeFilter === 'all' && [styles.activeTabPill, { backgroundColor: textPrimary }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'all' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary,
                  }}
                >
                  Todos
                </Text>
              </TouchableOpacity>
            </View>

            {/* BUTTON CREATE USER / SUPER ADMIN OR FLEET VEHICLE */}
            {activeFilter === 'fleet' ? (
              <TouchableOpacity
                onPress={() => setShowCreateFleetModal(true)}
                style={[styles.createOperatorBtn, { backgroundColor: '#10b981' }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={16} color="#ffffff" />
                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                  + Subir Vehículo a Flota
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCreateOperatorVisible(true)}
                style={[styles.createOperatorBtn, { backgroundColor: '#00e3fd' }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="person-add" size={16} color="#0c0e14" />
                <Text style={{ fontFamily: F.bold, color: '#0c0e14', fontSize: 12 }}>
                  + Crear Super Admin / Operador
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* SEARCH INPUT */}
          <View style={[styles.searchContainer, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
            <MaterialIcons name="search" size={18} color={textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={activeFilter === 'fleet' ? "Buscar vehículo por marca, modelo o placa..." : "Buscar por nombre, correo, código o especialidad..."}
              placeholderTextColor={textSecondary}
              style={[styles.searchInput, { color: textPrimary, fontFamily: F.medium }]}
            />
          </View>

          {/* LIST CONTAINER */}
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {activeFilter === 'fleet' ? (
              /* SECCIÓN DE CATÁLOGO DE FLOTA OFICIAL */
              loadingFleet ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <ActivityIndicator color={accentCyan} />
                </View>
              ) : fleetList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="no-transfer" size={40} color={textSecondary} />
                  <Text style={{ color: textPrimary, fontFamily: F.bold, fontSize: 14, marginTop: 8 }}>
                    Catálogo de Flota Vacío
                  </Text>
                  <Text style={[styles.emptyText, { color: textSecondary, fontFamily: F.medium, textAlign: 'center', marginTop: 4, maxWidth: 380 }]}>
                    Aún no se han subido vehículos de soporte técnico al catálogo oficial. Como Super Administrador, registra las unidades de la empresa con foto, modelo y placa.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCreateFleetModal(true)}
                    style={{
                      marginTop: 14,
                      backgroundColor: '#10b981',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <MaterialIcons name="add" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                      + Subir Primer Vehículo al Catálogo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                paginatedFleet.map((v) => (
                    <View
                      key={v.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: borderModal,
                        backgroundColor: cardSubBg,
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {v.image_url ? (
                          <Image
                            source={{ uri: v.image_url }}
                            style={{ width: 52, height: 52, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            backgroundColor: isDark ? '#141721' : '#ffffff',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                            <MaterialIcons name="directions-car" size={26} color={accentCyan} />
                          </View>
                        )}
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14 }}>
                              {v.brand} {v.model}
                            </Text>
                            <View style={{ backgroundColor: 'rgba(26, 92, 255, 0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 10.5 }}>
                                {v.plate}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11.5, marginTop: 2 }}>
                            Odómetro: {Number(v.current_odometer || 0).toLocaleString()} km • Año {v.year || 2026}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteFleetVehicle(v.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
              )
            ) : currentList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="check-circle-outline" size={40} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textSecondary, fontFamily: F.medium }]}>
                  {activeFilter === 'pending'
                    ? 'No hay solicitudes de registro pendientes.'
                    : 'No se encontraron usuarios en esta sección.'}
                </Text>
              </View>
            ) : (
              paginatedUsers.map((user) => {
                const isPending = user.approval_status === 'pending';
                const isApproved = user.approval_status === 'approved';
                const isRejected = user.approval_status === 'rejected';
                const isSuperAdminUser = user.role === 'superadmin' || user.role === 'admin';
                const isOperator = user.role === 'operator' || user.role === 'technician';
                const isLoading = actionLoadingId === user.id;

                return (
                  <View
                    key={user.id}
                    style={[
                      styles.userRowCard,
                      { backgroundColor: cardSubBg, borderColor: borderModal },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Text style={[styles.userName, { color: textPrimary, fontFamily: F.bold }]}>
                          {user.full_name || 'Usuario'}
                        </Text>
                        
                        {/* ROLE BADGE */}
                        <View
                          style={[
                            styles.badgePill,
                            {
                              backgroundColor: isSuperAdminUser
                                ? 'rgba(0, 227, 253, 0.15)'
                                : isOperator
                                ? 'rgba(26, 92, 255, 0.15)'
                                : 'rgba(142, 150, 170, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: F.bold,
                              fontSize: 10,
                              color: isSuperAdminUser
                                ? '#00e3fd'
                                : isOperator
                                ? accentBlue
                                : textSecondary,
                            }}
                          >
                            {isSuperAdminUser
                              ? '🛡️ SUPER ADMIN'
                              : isOperator
                              ? 'OPERADOR HL'
                              : 'CLIENTE'}
                          </Text>
                        </View>

                        {/* STATUS BADGE */}
                        <View
                          style={[
                            styles.badgePill,
                            {
                              backgroundColor: isPending
                                ? 'rgba(245, 158, 11, 0.15)'
                                : isApproved
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: F.bold,
                              fontSize: 10,
                              color: isPending
                                ? '#f59e0b'
                                : isApproved
                                ? '#22c55e'
                                : '#ef4444',
                            }}
                          >
                            {isPending
                              ? 'PENDIENTE'
                              : isApproved
                              ? 'APROBADO'
                              : 'RECHAZADO'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.userEmail, { color: textSecondary, fontFamily: F.medium }]}>
                        {user.email}
                      </Text>

                      {user.operator_code && (
                        <Text style={[styles.userExtra, { color: isSuperAdminUser ? '#00e3fd' : accentCyan, fontFamily: F.semibold }]}>
                          Carnet: {user.operator_code} • {user.specialty || (isSuperAdminUser ? 'Super Administrador' : 'Técnico de Generadores')}
                        </Text>
                      )}

                      {user.phone && (
                        <Text style={[styles.userExtra, { color: textSecondary, fontFamily: F.regular }]}>
                          Tel: {user.phone}
                        </Text>
                      )}
                    </View>

                    {/* ACTIONS */}
                    <View style={styles.actionsCell}>
                      {isPending && (
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() => handleApprove(user.id)}
                            disabled={isLoading}
                            style={[styles.approveBtn, { backgroundColor: '#22c55e' }]}
                            activeOpacity={0.85}
                          >
                            {isLoading ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <>
                                <MaterialIcons name="check" size={15} color="#ffffff" />
                                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11 }}>
                                  Aprobar
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleApprove(user.id, 'superadmin')}
                            disabled={isLoading}
                            style={[styles.approveBtn, { backgroundColor: '#00e3fd' }]}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name="security" size={14} color="#0c0e14" />
                            <Text style={{ fontFamily: F.bold, color: '#0c0e14', fontSize: 11 }}>
                              Aprobar Super Admin
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleReject(user.id)}
                            disabled={isLoading}
                            style={[styles.rejectBtn, { backgroundColor: '#ef4444' }]}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name="close" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* ACCIONES PARA USUARIOS YA APROBADOS */}
                      {isApproved && (
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* ASIGNACIÓN DE PLANTAS AL OPERADOR O ADMIN */}
                          {(isOperator || isSuperAdminUser) && (
                            <TouchableOpacity
                              onPress={() => setAssigningOperator(user)}
                              style={[styles.assignBtn, { backgroundColor: 'rgba(26, 92, 255, 0.15)', borderColor: accentBlue }]}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="assignment" size={13} color={accentBlue} />
                              <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 10.5 }}>
                                Asignar Plantas
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* BOTÓN HACER SUPER ADMIN SI NO LO ES */}
                          {!isSuperAdminUser ? (
                            <TouchableOpacity
                              onPress={() => handlePromoteRole(user.id, 'superadmin')}
                              disabled={isLoading}
                              style={[styles.promoteBtn, { backgroundColor: 'rgba(0, 227, 253, 0.12)', borderColor: '#00e3fd' }]}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="security" size={13} color="#00e3fd" />
                              <Text style={{ fontFamily: F.bold, color: '#00e3fd', fontSize: 10.5 }}>
                                Hacer Super Admin
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handlePromoteRole(user.id, 'operator')}
                              disabled={isLoading}
                              style={[styles.promoteBtn, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: borderModal }]}
                              activeOpacity={0.8}
                            >
                              <MaterialIcons name="swap-horiz" size={13} color={textSecondary} />
                              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 10.5 }}>
                                Cambiar a Operador
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* SUSPENDER ACCESO */}
                          <TouchableOpacity
                            onPress={() => handleReject(user.id)}
                            disabled={isLoading}
                            style={[styles.suspendBtn, { borderColor: borderModal }]}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 10 }}>
                              Suspender
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {isRejected && (
                        <TouchableOpacity
                          onPress={() => handleApprove(user.id)}
                          disabled={isLoading}
                          style={[styles.reApproveBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 11 }}>
                            Reactivar Acceso
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* PAGINATION CONTROLS */}
          {((activeFilter === 'fleet' ? totalFleetPages : totalPages) > 1) && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 10,
              paddingBottom: 4,
              borderTopWidth: 1,
              borderTopColor: borderModal,
            }}>
              <TouchableOpacity
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: currentPage === 1 ? 'transparent' : cardSubBg,
                  opacity: currentPage === 1 ? 0.35 : 1,
                  borderWidth: 1,
                  borderColor: borderModal,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <MaterialIcons name="chevron-left" size={18} color={textPrimary} />
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>Anterior</Text>
              </TouchableOpacity>

              <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11 }}>
                Página {currentPage} de {activeFilter === 'fleet' ? totalFleetPages : totalPages}
              </Text>

              <TouchableOpacity
                onPress={() => setCurrentPage((p) => Math.min(activeFilter === 'fleet' ? totalFleetPages : totalPages, p + 1))}
                disabled={currentPage >= (activeFilter === 'fleet' ? totalFleetPages : totalPages)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: currentPage >= (activeFilter === 'fleet' ? totalFleetPages : totalPages) ? 'transparent' : cardSubBg,
                  opacity: currentPage >= (activeFilter === 'fleet' ? totalFleetPages : totalPages) ? 0.35 : 1,
                  borderWidth: 1,
                  borderColor: borderModal,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 11 }}>Siguiente</Text>
                <MaterialIcons name="chevron-right" size={18} color={textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {/* FOOTER */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBottomBtn, { borderColor: borderModal }]}
            >
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* MODAL PARA CREAR OPERADOR */}
      <CreateOperatorModal
        visible={createOperatorVisible}
        onClose={() => setCreateOperatorVisible(false)}
        onOperatorCreated={() => loadSystemUsers()}
      />

      {/* MODAL PARA ASIGNAR PLANTAS Y VEHÍCULO AL OPERADOR */}
      <AssignOperatorModal
        visible={!!assigningOperator}
        operator={assigningOperator}
        onClose={() => setAssigningOperator(null)}
        onSaveSuccess={() => {
          loadSystemUsers();
          fetchFleet();
        }}
      />

      {/* MODAL PARA SUBIR VEHÍCULO AL CATÁLOGO DE FLOTA */}
      <Modal visible={showCreateFleetModal} transparent animationType="fade" onRequestClose={() => setShowCreateFleetModal(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.dialogContainer, { maxWidth: 520, backgroundColor: bgModal, borderColor: borderModal }]}>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <MaterialIcons name="add-circle" size={24} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold, fontSize: 16 }]}>
                    Registrar Unidad de Flota
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                    Catálogo Oficial de Vehículos Hermanos Lynch
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setShowCreateFleetModal(false)} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
                <MaterialIcons name="close" size={18} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11.5, marginBottom: 4 }}>
                    Marca
                  </Text>
                  <TextInput
                    value={fleetBrand}
                    onChangeText={setFleetBrand}
                    placeholder="Ej. Toyota, Ford, Chevrolet"
                    placeholderTextColor={textSecondary}
                    style={[styles.searchInput, { borderColor: borderModal, backgroundColor: cardSubBg, color: textPrimary, fontFamily: F.medium, borderRadius: 10, paddingHorizontal: 12, height: 42 }]}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11.5, marginBottom: 4 }}>
                    Modelo
                  </Text>
                  <TextInput
                    value={fleetModel}
                    onChangeText={setFleetModel}
                    placeholder="Ej. Hilux 4x4, Ranger"
                    placeholderTextColor={textSecondary}
                    style={[styles.searchInput, { borderColor: borderModal, backgroundColor: cardSubBg, color: textPrimary, fontFamily: F.medium, borderRadius: 10, paddingHorizontal: 12, height: 42 }]}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11.5, marginBottom: 4 }}>
                    Placa Oficial
                  </Text>
                  <TextInput
                    value={fleetPlate}
                    onChangeText={setFleetPlate}
                    placeholder="Ej. AB123CD"
                    placeholderTextColor={textSecondary}
                    autoCapitalize="characters"
                    style={[styles.searchInput, { borderColor: borderModal, backgroundColor: cardSubBg, color: textPrimary, fontFamily: F.medium, borderRadius: 10, paddingHorizontal: 12, height: 42 }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11.5, marginBottom: 4 }}>
                    Odómetro Inicial (km)
                  </Text>
                  <TextInput
                    value={fleetKm}
                    onChangeText={setFleetKm}
                    placeholder="Ej. 12500"
                    placeholderTextColor={textSecondary}
                    keyboardType="numeric"
                    style={[styles.searchInput, { borderColor: borderModal, backgroundColor: cardSubBg, color: textPrimary, fontFamily: F.medium, borderRadius: 10, paddingHorizontal: 12, height: 42 }]}
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11.5, marginBottom: 4 }}>
                  URL de la Foto Oficial
                </Text>
                <TextInput
                  value={fleetImageUrl}
                  onChangeText={setFleetImageUrl}
                  placeholder="https://... (Foto oficial del vehículo)"
                  placeholderTextColor={textSecondary}
                  style={[styles.searchInput, { borderColor: borderModal, backgroundColor: cardSubBg, color: textPrimary, fontFamily: F.medium, borderRadius: 10, paddingHorizontal: 12, height: 42 }]}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setShowCreateFleetModal(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: borderModal }}
              >
                <Text style={{ fontFamily: F.bold, color: textSecondary, fontSize: 12 }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateFleetVehicle}
                disabled={savingFleetVehicle}
                style={{
                  backgroundColor: '#10b981',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {savingFleetVehicle ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={16} color="#ffffff" />
                    <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                      Guardar en Catálogo
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    maxWidth: 780,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 11,
  },
  kpiValue: {
    fontSize: 22,
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 10,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeTabPill: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  createOperatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  userRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  userName: {
    fontSize: 13,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userEmail: {
    fontSize: 11.5,
  },
  userExtra: {
    fontSize: 11,
    marginTop: 2,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  promoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  suspendBtn: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reApproveBtn: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeBottomBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
