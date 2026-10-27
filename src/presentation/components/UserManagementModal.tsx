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
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
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
    operatorsList,
    clientsList,
    loadSystemUsers,
    approveUser,
    rejectUser,
  } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const [activeFilter, setActiveFilter] = useState<'pending' | 'operators' | 'clients' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOperatorVisible, setCreateOperatorVisible] = useState(false);
  const [assigningOperator, setAssigningOperator] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
    else if (activeFilter === 'operators') list = operatorsList;
    else if (activeFilter === 'clients') list = clientsList;
    else list = [...pendingUsersList, ...operatorsList, ...clientsList];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.operator_code || '').toLowerCase().includes(q) ||
        (u.specialty || '').toLowerCase().includes(q)
    );
  }, [activeFilter, pendingUsersList, operatorsList, clientsList, searchQuery]);

  const handleApprove = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await approveUser(userId);
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

          {/* 4 KPI CARDS */}
          <View style={styles.kpiGrid}>
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

            {/* BUTTON CREATE OPERATOR */}
            <TouchableOpacity
              onPress={() => setCreateOperatorVisible(true)}
              style={[styles.createOperatorBtn, { backgroundColor: accentBlue }]}
              activeOpacity={0.85}
            >
              <MaterialIcons name="person-add" size={16} color="#ffffff" />
              <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                + Crear Operador
              </Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH INPUT */}
          <View style={[styles.searchContainer, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
            <MaterialIcons name="search" size={18} color={textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nombre, correo, código o especialidad..."
              placeholderTextColor={textSecondary}
              style={[styles.searchInput, { color: textPrimary, fontFamily: F.medium }]}
            />
          </View>

          {/* USERS LIST */}
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {currentList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="check-circle-outline" size={40} color={textSecondary} />
                <Text style={[styles.emptyText, { color: textSecondary, fontFamily: F.medium }]}>
                  {activeFilter === 'pending'
                    ? 'No hay solicitudes de registro pendientes.'
                    : 'No se encontraron usuarios en esta sección.'}
                </Text>
              </View>
            ) : (
              currentList.map((user) => {
                const isPending = user.approval_status === 'pending';
                const isApproved = user.approval_status === 'approved';
                const isRejected = user.approval_status === 'rejected';
                const isOperator = user.role === 'operator';
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={[styles.userName, { color: textPrimary, fontFamily: F.bold }]}>
                          {user.full_name || 'Usuario'}
                        </Text>
                        
                        {/* ROLE BADGE */}
                        <View
                          style={[
                            styles.badgePill,
                            {
                              backgroundColor: isOperator
                                ? 'rgba(26, 92, 255, 0.15)'
                                : user.role === 'superadmin'
                                ? 'rgba(0, 180, 216, 0.15)'
                                : 'rgba(142, 150, 170, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: F.bold,
                              fontSize: 10,
                              color: isOperator
                                ? accentBlue
                                : user.role === 'superadmin'
                                ? accentCyan
                                : textSecondary,
                            }}
                          >
                            {isOperator
                              ? 'OPERADOR HL'
                              : user.role === 'superadmin'
                              ? 'SUPERADMIN'
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
                        <Text style={[styles.userExtra, { color: accentCyan, fontFamily: F.semibold }]}>
                          Carnet: {user.operator_code} • {user.specialty || 'Técnico de Generadores'}
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
                        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                                <MaterialIcons name="check" size={16} color="#ffffff" />
                                <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11 }}>
                                  Aprobar
                                </Text>
                              </>
                            )}
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

                      {/* ASIGNACIÓN DE PLANTAS Y MÓVIL AL OPERADOR */}
                      {isApproved && (isOperator || user.role === 'superadmin') && (
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

                      {isApproved && user.role !== 'superadmin' && (
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
        onSaveSuccess={() => loadSystemUsers()}
      />
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
