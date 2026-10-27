import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { supabase } from '../../data/supabaseClient';

export interface TicketItem {
  id: string;
  created_at: string;
  user_id: string;
  planta_id: string;
  assigned_operator_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  planta_info?: string;
  planta_location?: string;
  type: string;
  title: string;
  description: string;
  priority: 'urgente' | 'alta' | 'media' | 'baja';
  status: 'pending' | 'scheduled' | 'in_progress' | 'resolved';
  scheduled_date?: string;
  scheduled_time?: string;
  operator_notes?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const OperatorAgendaModal: React.FC<Props> = ({ visible, onClose }) => {
  const { isDark } = useTheme();
  const { isAdmin } = useMyMoto();

  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'scheduled' | 'in_progress' | 'resolved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Note dialog state
  const [resolvingTicket, setResolvingTicket] = useState<TicketItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Operator Info
  const [operatorProfile, setOperatorProfile] = useState<any>(null);
  const [assignedPlantsCount, setAssignedPlantsCount] = useState(0);

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

  useEffect(() => {
    if (visible) {
      loadAgendaData();
    }
  }, [visible]);

  const loadAgendaData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // 1. Fetch current operator profile to see vehicle and role
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (prof) {
        setOperatorProfile(prof);
      }

      // 2. Count plants assigned to this operator
      const { data: myPlants } = await supabase
        .from('plantas')
        .select('id')
        .eq('assigned_operator_id', user.id);

      setAssignedPlantsCount(myPlants ? myPlants.length : 0);

      // 3. Fetch client tickets
      let query = supabase
        .from('client_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // If not superadmin, only show tickets assigned to this operator or where assigned_operator_id IS NULL
      if (!isAdmin && prof?.role === 'operator') {
        query = query.or(`assigned_operator_id.eq.${user.id},assigned_operator_id.is.null`);
      }

      const { data: ticketsData, error } = await query;
      if (error) throw error;

      setTickets((ticketsData || []) as TicketItem[]);
    } catch (err) {
      console.error('Error al cargar agenda del operador:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketItem['status'], notes?: string) => {
    setActionLoadingId(ticketId);
    try {
      const updates: any = { status: newStatus };
      if (notes) {
        updates.operator_notes = notes.trim();
      }

      const { error } = await supabase
        .from('client_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updates } : t))
      );

      setResolvingTicket(null);
      setResolutionNotes('');
    } catch (err: any) {
      console.error('Error al actualizar estado del ticket:', err);
      Alert.alert('Error', err.message || 'No se pudo actualizar el estado');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenWhatsApp = (ticket: TicketItem) => {
    const phone = ticket.client_phone?.replace(/[^\d+]/g, '') || '';
    const operatorName = operatorProfile?.full_name || 'Técnico Hermanos Lynch';
    const text = encodeURIComponent(
      `Hola ${ticket.client_name || 'Estimado cliente'}, le saluda ${operatorName} del equipo de soporte de Hermanos Lynch. Respecto a su solicitud de "${ticket.title}" para su planta eléctrica en ${ticket.planta_location || 'su sede'}, me pongo a su disposición para coordinar la atención técnica.`
    );

    if (phone) {
      Linking.openURL(`https://wa.me/${phone.replace('+', '')}?text=${text}`).catch(() => {});
    } else {
      Linking.openURL(`https://wa.me/?text=${text}`).catch(() => {});
    }
  };

  // Metrics
  const pendingCount = useMemo(() => tickets.filter((t) => t.status === 'pending').length, [tickets]);
  const scheduledCount = useMemo(() => tickets.filter((t) => t.status === 'scheduled').length, [tickets]);
  const inProgressCount = useMemo(() => tickets.filter((t) => t.status === 'in_progress').length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((t) => t.status === 'resolved').length, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (activeFilter !== 'all') {
      list = tickets.filter((t) => t.status === activeFilter);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.client_name || '').toLowerCase().includes(q) ||
        (t.client_email || '').toLowerCase().includes(q) ||
        (t.planta_info || '').toLowerCase().includes(q) ||
        (t.planta_location || '').toLowerCase().includes(q)
    );
  }, [tickets, activeFilter, searchQuery]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.dialogContainer, { backgroundColor: bgModal, borderColor: borderModal }]}>
          
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: 'rgba(26, 92, 255, 0.15)' }]}>
                <MaterialCommunityIcons name="clipboard-text-clock" size={24} color={accentBlue} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                  Agenda de Clientes e Inquietudes Técnicas
                </Text>
                <Text style={[styles.headerSubtitle, { color: textSecondary, fontFamily: F.medium }]}>
                  Gestión Operativa de Servicios y Citas Hermanos Lynch
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: cardSubBg }]}>
              <MaterialIcons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* KPI CARDS BAR */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Plantas a Mi Cargo
              </Text>
              <Text style={[styles.kpiValue, { color: textPrimary, fontFamily: F.extrabold }]}>
                {assignedPlantsCount}
              </Text>
              <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 10.5 }}>
                Bajo Control Activo
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: pendingCount > 0 ? 'rgba(245, 158, 11, 0.12)' : cardSubBg, borderColor: pendingCount > 0 ? '#f59e0b' : borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Por Atender
              </Text>
              <Text style={[styles.kpiValue, { color: pendingCount > 0 ? '#f59e0b' : textPrimary, fontFamily: F.extrabold }]}>
                {pendingCount}
              </Text>
              <Text style={{ fontFamily: F.bold, color: pendingCount > 0 ? '#f59e0b' : textSecondary, fontSize: 10.5 }}>
                {pendingCount > 0 ? '¡Requiere Respuesta!' : 'Sin pendientes'}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Citas Programadas
              </Text>
              <Text style={[styles.kpiValue, { color: accentBlue, fontFamily: F.extrabold }]}>
                {scheduledCount}
              </Text>
              <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 10.5 }}>
                En Agenda
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <Text style={[styles.kpiLabel, { color: textSecondary, fontFamily: F.medium }]}>
                Móvil Asignado
              </Text>
              <Text style={[styles.kpiValue, { color: textPrimary, fontFamily: F.extrabold, fontSize: 13.5 }]} numberOfLines={1}>
                {operatorProfile?.drives_company_vehicle
                  ? (operatorProfile.assigned_vehicle_plate || 'HL-04')
                  : 'Sin Móvil'}
              </Text>
              <Text style={{ fontFamily: F.bold, color: operatorProfile?.drives_company_vehicle ? '#22c55e' : textSecondary, fontSize: 10.5 }}>
                {operatorProfile?.drives_company_vehicle ? 'Flota Oficial Activa' : 'Guardia Fija'}
              </Text>
            </View>
          </View>

          {/* TOOLBAR: TABS & SEARCH */}
          <View style={styles.toolbar}>
            <View style={styles.tabsScroll}>
              <TouchableOpacity
                onPress={() => setActiveFilter('pending')}
                style={[
                  styles.tabBtn,
                  activeFilter === 'pending' && [styles.activeTabBtn, { backgroundColor: '#f59e0b' }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'pending' ? '#0c0e14' : textSecondary,
                  }}
                >
                  Por Atender ({pendingCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('scheduled')}
                style={[
                  styles.tabBtn,
                  activeFilter === 'scheduled' && [styles.activeTabBtn, { backgroundColor: accentBlue }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'scheduled' ? '#ffffff' : textSecondary,
                  }}
                >
                  Agendadas ({scheduledCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('in_progress')}
                style={[
                  styles.tabBtn,
                  activeFilter === 'in_progress' && [styles.activeTabBtn, { backgroundColor: accentCyan }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'in_progress' ? '#0c0e14' : textSecondary,
                  }}
                >
                  En Proceso ({inProgressCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('resolved')}
                style={[
                  styles.tabBtn,
                  activeFilter === 'resolved' && [styles.activeTabBtn, { backgroundColor: '#22c55e' }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'resolved' ? '#ffffff' : textSecondary,
                  }}
                >
                  Resueltas ({resolvedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                style={[
                  styles.tabBtn,
                  activeFilter === 'all' && [styles.activeTabBtn, { backgroundColor: textPrimary }],
                ]}
              >
                <Text
                  style={{
                    fontFamily: F.bold,
                    fontSize: 11,
                    color: activeFilter === 'all' ? (isDark ? '#0c0e14' : '#ffffff') : textSecondary,
                  }}
                >
                  Todas ({tickets.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* BUSCADOR */}
            <View style={[styles.searchBox, { backgroundColor: cardSubBg, borderColor: borderModal }]}>
              <MaterialIcons name="search" size={18} color={textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por cliente, planta, ubicación o descripción..."
                placeholderTextColor={textSecondary}
                style={[styles.searchInput, { color: textPrimary, fontFamily: F.medium }]}
              />
            </View>
          </View>

          {/* MAIN TICKETS LIST */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ padding: 36, alignItems: 'center' }}>
                <ActivityIndicator color={accentBlue} size="large" />
                <Text style={{ color: textSecondary, fontFamily: F.medium, marginTop: 12, fontSize: 13 }}>
                  Cargando agenda de clientes...
                </Text>
              </View>
            ) : filteredTickets.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="event-available" size={48} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary, fontFamily: F.bold }]}>
                  {activeFilter === 'pending'
                    ? 'No hay solicitudes pendientes por atender.'
                    : 'No se encontraron citas en este filtro.'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary, fontFamily: F.regular }]}>
                  Los requerimientos y citas agendadas por tus clientes asignados aparecerán automáticamente aquí.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {filteredTickets.map((ticket) => {
                  const isPending = ticket.status === 'pending';
                  const isScheduled = ticket.status === 'scheduled';
                  const isInProgress = ticket.status === 'in_progress';
                  const isResolved = ticket.status === 'resolved';

                  const priorityColor =
                    ticket.priority === 'urgente'
                      ? '#ef4444'
                      : ticket.priority === 'alta'
                      ? '#f59e0b'
                      : '#10b981';

                  const isLoadingAction = actionLoadingId === ticket.id;

                  return (
                    <View
                      key={ticket.id}
                      style={[
                        styles.ticketCard,
                        {
                          backgroundColor: cardSubBg,
                          borderColor: isPending
                            ? '#f59e0b'
                            : borderModal,
                          borderLeftWidth: isPending ? 4 : 1,
                        },
                      ]}
                    >
                      {/* CARD TOP BAR */}
                      <View style={styles.cardTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {/* PRIORITY BADGE */}
                          <View
                            style={[
                              styles.badgePill,
                              { backgroundColor: `${priorityColor}22`, borderColor: priorityColor, borderWidth: 1 },
                            ]}
                          >
                            <Text style={{ fontFamily: F.bold, color: priorityColor, fontSize: 10 }}>
                              {ticket.priority.toUpperCase()}
                            </Text>
                          </View>

                          {/* TYPE BADGE */}
                          <View style={[styles.badgePill, { backgroundColor: 'rgba(26, 92, 255, 0.12)' }]}>
                            <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 10 }}>
                              {ticket.type.toUpperCase()}
                            </Text>
                          </View>

                          {/* DATE & TIME BADGE */}
                          <View style={[styles.badgePill, { backgroundColor: 'rgba(0, 180, 216, 0.12)' }]}>
                            <MaterialIcons name="event" size={12} color={accentCyan} />
                            <Text style={{ fontFamily: F.bold, color: accentCyan, fontSize: 10 }}>
                              {ticket.scheduled_date || 'Fecha por acordar'} • {ticket.scheduled_time || 'Horario Flexible'}
                            </Text>
                          </View>
                        </View>

                        {/* STATUS PILL */}
                        <View
                          style={[
                            styles.badgePill,
                            {
                              backgroundColor: isPending
                                ? 'rgba(245, 158, 11, 0.15)'
                                : isScheduled
                                ? 'rgba(26, 92, 255, 0.15)'
                                : isInProgress
                                ? 'rgba(0, 180, 216, 0.15)'
                                : 'rgba(34, 197, 94, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: F.bold,
                              fontSize: 10.5,
                              color: isPending
                                ? '#f59e0b'
                                : isScheduled
                                ? accentBlue
                                : isInProgress
                                ? accentCyan
                                : '#22c55e',
                            }}
                          >
                            {isPending
                              ? 'POR ATENDER'
                              : isScheduled
                              ? 'CITA AGENDADA'
                              : isInProgress
                              ? 'EN PROCESO'
                              : 'RESUELTO'}
                          </Text>
                        </View>
                      </View>

                      {/* TITLE & DESCRIPTION */}
                      <Text style={[styles.ticketTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
                        {ticket.title}
                      </Text>

                      <Text style={[styles.ticketDesc, { color: textSecondary, fontFamily: F.regular }]}>
                        {ticket.description}
                      </Text>

                      {/* CLIENT & PLANT INFO BOX */}
                      <View style={[styles.infoGridBox, { backgroundColor: isDark ? '#141721' : '#ffffff', borderColor: borderModal }]}>
                        <View style={styles.infoCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialCommunityIcons name="generator-portable" size={16} color={accentBlue} />
                            <Text style={[styles.infoLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                              Planta Eléctrica:
                            </Text>
                          </View>
                          <Text style={[styles.infoValue, { color: textPrimary, fontFamily: F.bold }]}>
                            {ticket.planta_info || 'Generador Standby'}
                          </Text>
                        </View>

                        <View style={styles.infoCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name="person" size={16} color={accentCyan} />
                            <Text style={[styles.infoLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                              Cliente:
                            </Text>
                          </View>
                          <Text style={[styles.infoValue, { color: textPrimary, fontFamily: F.bold }]}>
                            {ticket.client_name} ({ticket.client_email})
                          </Text>
                        </View>

                        <View style={styles.infoCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name="place" size={16} color="#f59e0b" />
                            <Text style={[styles.infoLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                              Ubicación de la Planta:
                            </Text>
                          </View>
                          <Text style={[styles.infoValue, { color: textPrimary, fontFamily: F.bold }]}>
                            {ticket.planta_location || 'Sede Principal / En Sitio'}
                          </Text>
                        </View>

                        {ticket.client_phone && (
                          <View style={styles.infoCol}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <MaterialIcons name="phone" size={16} color="#22c55e" />
                              <Text style={[styles.infoLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                                Teléfono Directo:
                              </Text>
                            </View>
                            <Text style={[styles.infoValue, { color: textPrimary, fontFamily: F.bold }]}>
                              {ticket.client_phone}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* OPERATOR NOTES (IF PRESENT) */}
                      {ticket.operator_notes && (
                        <View style={[styles.notesBox, { backgroundColor: 'rgba(26, 92, 255, 0.08)', borderColor: accentBlue }]}>
                          <Text style={{ fontFamily: F.bold, color: accentBlue, fontSize: 11 }}>
                            Notas Técnicas del Operador:
                          </Text>
                          <Text style={{ fontFamily: F.medium, color: textPrimary, fontSize: 12, marginTop: 2 }}>
                            {ticket.operator_notes}
                          </Text>
                        </View>
                      )}

                      {/* ACTIONS ROW */}
                      <View style={styles.actionsRow}>
                        {/* WHATSAPP ACTION */}
                        <TouchableOpacity
                          onPress={() => handleOpenWhatsApp(ticket)}
                          style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons name="whatsapp" size={16} color="#ffffff" />
                          <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11.5 }}>
                            WhatsApp Cliente
                          </Text>
                        </TouchableOpacity>

                        {/* STATUS CHANGERS */}
                        {isPending && (
                          <TouchableOpacity
                            onPress={() => handleUpdateStatus(ticket.id, 'scheduled')}
                            disabled={isLoadingAction}
                            style={[styles.confirmBtn, { backgroundColor: accentBlue }]}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name="event-available" size={16} color="#ffffff" />
                            <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11.5 }}>
                              Confirmar Cita
                            </Text>
                          </TouchableOpacity>
                        )}

                        {(isPending || isScheduled) && (
                          <TouchableOpacity
                            onPress={() => handleUpdateStatus(ticket.id, 'in_progress')}
                            disabled={isLoadingAction}
                            style={[styles.inProgressBtn, { backgroundColor: accentCyan }]}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name="build" size={16} color="#0c0e14" />
                            <Text style={{ fontFamily: F.bold, color: '#0c0e14', fontSize: 11.5 }}>
                              En Proceso
                            </Text>
                          </TouchableOpacity>
                        )}

                        {!isResolved && (
                          <TouchableOpacity
                            onPress={() => setResolvingTicket(ticket)}
                            disabled={isLoadingAction}
                            style={[styles.resolveBtn, { backgroundColor: '#22c55e' }]}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                            <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 11.5 }}>
                              Resolver / Cerrar
                            </Text>
                          </TouchableOpacity>
                        )}

                        {isResolved && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name="verified" size={18} color="#22c55e" />
                            <Text style={{ fontFamily: F.bold, color: '#22c55e', fontSize: 11.5 }}>
                              Caso Técnico Resuelto
                            </Text>
                          </View>
                        )}
                      </View>

                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* MINI MODAL: RESOLVER CASO CON NOTAS TÉCNICAS */}
          {resolvingTicket && (
            <Modal visible transparent animationType="fade">
              <View style={styles.backdrop}>
                <View style={[styles.resolveDialog, { backgroundColor: bgModal, borderColor: borderModal }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <MaterialIcons name="fact-check" size={24} color="#22c55e" />
                    <Text style={{ fontFamily: F.extrabold, color: textPrimary, fontSize: 16 }}>
                      Cierre y Resolución Técnica
                    </Text>
                  </View>

                  <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 12, marginBottom: 10 }}>
                    Caso: <Text style={{ color: textPrimary, fontFamily: F.bold }}>{resolvingTicket.title}</Text>
                  </Text>

                  <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 11, marginBottom: 6 }}>
                    Notas Técnicas del Servicio (Diagnóstico, repuestos cambiados, estado de la planta):
                  </Text>
                  <TextInput
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                    placeholder="Ej. Se inspeccionaron niveles, calibró voltaje a 24V y realizó encendido de prueba satisfactorio."
                    placeholderTextColor={textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[styles.notesInput, { color: textPrimary, borderColor: borderModal, backgroundColor: cardSubBg }]}
                  />

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setResolvingTicket(null);
                        setResolutionNotes('');
                      }}
                      style={[styles.cancelBtn, { borderColor: borderModal }]}
                    >
                      <Text style={{ fontFamily: F.semibold, color: textSecondary, fontSize: 12 }}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(resolvingTicket.id, 'resolved', resolutionNotes)}
                      style={[styles.saveBtn, { backgroundColor: '#22c55e' }]}
                    >
                      <MaterialIcons name="check" size={16} color="#ffffff" />
                      <Text style={{ fontFamily: F.bold, color: '#ffffff', fontSize: 12 }}>
                        Finalizar Caso
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

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
    padding: 16,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 820,
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
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 11,
  },
  kpiValue: {
    fontSize: 20,
  },
  toolbar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  tabsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBox: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  listScroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 18,
  },
  ticketCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ticketTitle: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  ticketDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  infoGridBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  infoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoLabel: {
    fontSize: 11.5,
  },
  infoValue: {
    fontSize: 11.5,
  },
  notesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  inProgressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  resolveDialog: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  notesInput: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 12.5,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
  },
});
