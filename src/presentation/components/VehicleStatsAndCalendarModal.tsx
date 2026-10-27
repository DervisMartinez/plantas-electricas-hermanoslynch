import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  useWindowDimensions, 
  Platform,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMyMoto } from '../context/MotoContext';
import { COMPONENT_NAMES, ComponentType } from '../../constants/telemetry';
import { ServiceRecord, isPlanta } from '../../domain/entities/Moto';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'stats' | 'calendar';
}

export const VehicleStatsAndCalendarModal: React.FC<Props> = ({ 
  visible, 
  onClose,
  initialTab = 'calendar'
}) => {
  const { colors, mode } = useTheme();
  const { myMoto, records, addRecord, deleteRecord } = useMyMoto();
  const { width: windowWidth } = useWindowDimensions();

  const isDark = mode === 'dark';
  const isVehiclePlanta = isPlanta(myMoto);

  // Screen & View state (Day / Month / Year like reference Image 4)
  const [activeScreen, setActiveScreen] = useState<'stats' | 'calendar'>(initialTab);
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('month');
  const [statsPeriod, setStatsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Form State for "+ Agendar Mantenimiento"
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedType, setSchedType] = useState<ComponentType>('oil');
  const [schedTime, setSchedTime] = useState('09:30 - 11:30');
  const [schedHours, setSchedHours] = useState('');
  const [schedNotes, setSchedNotes] = useState('');
  const [schedCost, setSchedCost] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Slide & Fade Animation for Drawer
  const slideAnim = useRef(new Animated.Value(450)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(450);
      fadeAnim.setValue(0);
      setShowScheduleForm(false);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 450,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    medium: 'Montserrat_500Medium',
    regular: 'Montserrat_400Regular',
    extrabold: 'Montserrat_800ExtraBold',
  };

  // Calendar calculations
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayIndex = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday = 0
  }, [currentYear, currentMonth]);

  // Group records by day in current month
  const monthRecords = useMemo(() => {
    const map: { [day: number]: ServiceRecord[] } = {};
    records.forEach(r => {
      try {
        const parts = r.date.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          if (y === currentYear && m === currentMonth) {
            if (!map[d]) map[d] = [];
            map[d].push(r);
          }
        }
      } catch (e) {}
    });
    return map;
  }, [records, currentYear, currentMonth]);

  // Projected services based on plant horometer wear
  const projectedServices = useMemo(() => {
    if (!myMoto) return [];
    const currentHrs = myMoto.currentHours || myMoto.currentOdometer || 0;
    const avgHoursPerDay = 4; // Typical generator standby/operational exercise

    const items = [
      { name: 'Cambio de Aceite 15W-40 & Filtros', type: 'oil', interval: 250, color: '#3B82F6', icon: 'opacity' },
      { name: 'Filtro de Aire Industrial', type: 'air_filter', interval: 500, color: '#00E3FD', icon: 'air' },
      { name: 'Refrigerante 50/50 & Batería 24V', type: 'coolant', interval: 1000, color: '#10B981', icon: 'battery-charging-full' },
      { name: 'Calibración de Válvulas Cummins', type: 'other', interval: 1500, color: '#F59E0B', icon: 'tune' },
    ];

    return items.map(item => {
      const typeRecords = records.filter(r => r.type === item.type);
      const lastService = typeRecords.length > 0 ? Math.max(...typeRecords.map(r => r.odometer)) : 0;
      const hoursSince = Math.max(0, currentHrs - lastService);
      const hoursLeft = Math.max(0, item.interval - hoursSince);
      const daysLeft = Math.max(1, Math.round(hoursLeft / avgHoursPerDay));
      
      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + daysLeft);

      return {
        ...item,
        hoursLeft,
        dueHours: lastService + item.interval,
        daysLeft,
        date: projectedDate,
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [myMoto, records]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSaveSchedule = async () => {
    if (!myMoto) return;
    setSavingSchedule(true);
    try {
      const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      const newRecord: ServiceRecord = {
        id: `sched_${Date.now()}`,
        type: schedType,
        date: formattedDate,
        odometer: Number(schedHours) || myMoto.currentOdometer || 0,
        costUSD: Number(schedCost) || 0,
        notes: schedNotes.trim() || `Mantenimiento Programado • ${COMPONENT_NAMES[schedType as keyof typeof COMPONENT_NAMES] || schedType}`,
        status: 'scheduled',
        scheduledTime: schedTime,
      };

      await addRecord(newRecord);
      setShowScheduleForm(false);
      setSchedNotes('');
      setSchedHours('');
      setSchedCost('');
    } catch (e) {
      console.error('Error guardando cita agendada:', e);
    } finally {
      setSavingSchedule(false);
    }
  };

  const selectedDayRecords = monthRecords[selectedDay] || [];
  
  // Scheduled appointments to show (selected day or next upcoming)
  const scheduledList = useMemo(() => {
    if (selectedDayRecords.length > 0) {
      return selectedDayRecords;
    }
    // If no records on that specific day, show all upcoming in this month
    const allInMonth: ServiceRecord[] = [];
    Object.keys(monthRecords).forEach(d => {
      allInMonth.push(...monthRecords[Number(d)]);
    });
    return allInMonth;
  }, [selectedDayRecords, monthRecords]);

  // Color tokens
  const bgPanel = isDark ? '#0D1117' : '#FFFFFF';
  const cardBg = isDark ? '#161B22' : '#F8FAFC';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const accentPrimary = '#007AFF';
  const accentNavy = isDark ? '#1E293B' : '#0A192F';
  const accentCyan = '#00E3FD';
  const panelWidth = Math.min(460, windowWidth);

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlayRoot}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[
          styles.sidebarDrawer,
          { 
            width: panelWidth,
            backgroundColor: bgPanel,
            borderLeftColor: cardBorder,
            transform: [{ translateX: slideAnim }]
          }
        ]}>

          {/* TOP BAR: TIMETABLE & ICONS (MATCHING IMAGE 4) */}
          <View style={[styles.topHeader, { borderBottomColor: cardBorder }]}>
            <Text style={[styles.topTitle, { color: textPrimary, fontFamily: F.extrabold }]}>
              Timetable
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ position: 'relative' }}>
                <MaterialIcons name="notifications-none" size={22} color={textPrimary} />
                <View style={styles.notifBadge} />
              </View>

              <View style={[styles.userAvatar, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <MaterialIcons name="person" size={18} color={textPrimary} />
              </View>

              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <MaterialIcons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* VIEW SELECTOR TABS: DAY | MONTH | YEAR (MATCHING IMAGE 4) */}
          <View style={[styles.viewTabsRow, { borderBottomColor: cardBorder }]}>
            {(['day', 'month', 'year'] as const).map((v) => {
              const isSelected = viewMode === v;
              const label = v === 'day' ? 'Day' : v === 'month' ? 'Month' : 'Year';
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => setViewMode(v)}
                  style={[styles.viewTabItem, isSelected && styles.viewTabItemActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.viewTabText,
                    { 
                      color: isSelected ? textPrimary : textSecondary,
                      fontFamily: isSelected ? F.bold : F.medium,
                    }
                  ]}>
                    {label}
                  </Text>
                  {isSelected && <View style={[styles.viewTabActiveLine, { backgroundColor: accentPrimary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* MONTH HEADER WITH NAVIGATION ARROWS (MATCHING IMAGE 4) */}
            <View style={styles.monthHeaderRow}>
              <Text style={[styles.monthTitleText, { color: textPrimary, fontFamily: F.bold }]}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrowBtn} activeOpacity={0.7}>
                  <MaterialIcons name="arrow-back" size={20} color={textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrowBtn} activeOpacity={0.7}>
                  <MaterialIcons name="arrow-forward" size={20} color={textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* WEEKDAYS ROW (Mn, Tu, Ws, Th, Fr, Sa, Su) */}
            <View style={styles.weekDaysRow}>
              {WEEK_DAYS.map((d, index) => {
                const isWeekend = index >= 5;
                return (
                  <Text 
                    key={d} 
                    style={[
                      styles.weekDayText, 
                      { 
                        color: isWeekend ? '#EF4444' : textSecondary, 
                        fontFamily: F.semibold 
                      }
                    ]}
                  >
                    {d}
                  </Text>
                );
              })}
            </View>

            {/* DAYS GRID (7 COLUMNS) */}
            <View style={styles.daysGrid}>
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell}>
                  <Text style={[styles.dayNumFaded, { color: isDark ? '#334155' : '#CBD5E1', fontFamily: F.regular }]}>
                    {28 + i}
                  </Text>
                </View>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = selectedDay === dayNum;
                const hasAppointments = !!monthRecords[dayNum]?.length;
                const dayOfWeek = (firstDayIndex + i) % 7;
                const isWeekend = dayOfWeek >= 5;

                return (
                  <TouchableOpacity
                    key={dayNum}
                    onPress={() => setSelectedDay(dayNum)}
                    style={styles.dayCell}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.dayCircle,
                      hasAppointments && !isSelected && { backgroundColor: isDark ? 'rgba(0, 227, 253, 0.2)' : '#E0F2FE' },
                      isSelected && { backgroundColor: accentNavy }
                    ]}>
                      <Text style={[
                        styles.dayNumText,
                        {
                          fontFamily: isSelected ? F.bold : F.semibold,
                          color: isSelected 
                            ? '#FFFFFF' 
                            : (hasAppointments 
                              ? (isDark ? '#00E3FD' : '#0284C7') 
                              : (isWeekend ? '#EF4444' : textPrimary)),
                        }
                      ]}>
                        {dayNum}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PROMINENT BUTTON: "+ AGENDAR MANTENIMIENTO" */}
            <View style={{ marginTop: 20, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.scheduleBtn, { backgroundColor: accentPrimary }]}
                onPress={() => setShowScheduleForm(!showScheduleForm)}
                activeOpacity={0.85}
              >
                <MaterialIcons name={showScheduleForm ? "close" : "add-circle-outline"} size={20} color="#FFFFFF" />
                <Text style={[styles.scheduleBtnText, { fontFamily: F.bold }]}>
                  {showScheduleForm ? 'Cancelar Agendamiento' : '+ Agendar Mantenimiento'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* INLINE SCHEDULING FORM */}
            {showScheduleForm && (
              <View style={[styles.scheduleCardForm, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14, marginBottom: 12 }}>
                  Nueva Cita para el {selectedDay} de {MONTH_NAMES[currentMonth]}
                </Text>

                <View style={{ gap: 10 }}>
                  <View>
                    <Text style={[styles.formLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                      TIPO DE SERVICIO TÉCNICO
                    </Text>
                    <View style={styles.quickTypeRow}>
                      {[
                        { type: 'oil' as ComponentType, label: 'Aceite 15W-40' },
                        { type: 'fuel_filter' as ComponentType, label: 'Filtros Diésel' },
                        { type: 'air_filter' as ComponentType, label: 'Filtro Aire' },
                        { type: 'coolant' as ComponentType, label: 'Refrigerante/Batería' },
                      ].map((t) => (
                        <TouchableOpacity
                          key={t.type}
                          onPress={() => setSchedType(t.type)}
                          style={[
                            styles.typeChip,
                            { 
                              backgroundColor: schedType === t.type ? accentPrimary : (isDark ? '#1E293B' : '#E2E8F0'),
                              borderColor: schedType === t.type ? accentPrimary : cardBorder,
                            }
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={{ 
                            fontSize: 11, 
                            fontFamily: F.bold, 
                            color: schedType === t.type ? '#FFF' : textPrimary 
                          }}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                        HORARIO ESTIMADO
                      </Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: isDark ? '#0D1117' : '#FFFFFF', borderColor: cardBorder, color: textPrimary }]}
                        placeholder="Ej. 09:30 - 13:40"
                        placeholderTextColor={textSecondary}
                        value={schedTime}
                        onChangeText={setSchedTime}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                        HORÓMETRO (HRS)
                      </Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: isDark ? '#0D1117' : '#FFFFFF', borderColor: cardBorder, color: textPrimary }]}
                        placeholder="Ej. 250"
                        placeholderTextColor={textSecondary}
                        keyboardType="numeric"
                        value={schedHours}
                        onChangeText={setSchedHours}
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={[styles.formLabel, { color: textSecondary, fontFamily: F.semibold }]}>
                      NOTAS / TÉCNICO RESPONSABLE
                    </Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: isDark ? '#0D1117' : '#FFFFFF', borderColor: cardBorder, color: textPrimary }]}
                      placeholder="Ej. Sala de Generadores • Técnico Lynch"
                      placeholderTextColor={textSecondary}
                      value={schedNotes}
                      onChangeText={setSchedNotes}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#10B981' }]}
                    onPress={handleSaveSchedule}
                    disabled={savingSchedule}
                    activeOpacity={0.85}
                  >
                    {savingSchedule ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="check" size={18} color="#FFF" />
                        <Text style={{ color: '#FFF', fontFamily: F.bold, fontSize: 13 }}>
                          Confirmar y Guardar Cita
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* SCHEDULED EVENT CARDS (EXACT VISUAL STYLE FROM IMAGE 4) */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 14, marginBottom: 12 }}>
                {selectedDayRecords.length > 0 
                  ? `Mantenimientos para el ${selectedDay} de ${MONTH_NAMES[currentMonth]}`
                  : `Citas y Servicios Programados (${MONTH_NAMES[currentMonth]})`}
              </Text>

              {scheduledList.length === 0 ? (
                <View style={[styles.emptyScheduleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <MaterialIcons name="event-available" size={32} color={accentPrimary} />
                  <Text style={{ fontFamily: F.semibold, color: textPrimary, fontSize: 13, marginTop: 8 }}>
                    Sin citas pendientes para este día
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: textSecondary, fontSize: 11.5, textAlign: 'center', marginTop: 4 }}>
                    Presiona el botón "+ Agendar Mantenimiento" para programar el próximo cambio de filtros o inspección técnica.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {scheduledList.map((item, idx) => {
                    const timeRange = item.scheduledTime || '09:30 - 13:40';
                    const [startTime, endTime] = timeRange.includes('-') 
                      ? timeRange.split('-').map(s => s.trim()) 
                      : [timeRange, ''];

                    const isEven = idx % 2 === 0;
                    const pillColor = isEven ? accentNavy : (isDark ? '#0284C7' : '#0284C7');

                    return (
                      <View key={item.id || idx} style={[styles.eventCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {/* LEFT TIME BADGE (IMAGE 4 STYLE) */}
                        <View style={[styles.eventTimePill, { backgroundColor: pillColor }]}>
                          <Text style={[styles.eventTimeText, { fontFamily: F.bold }]}>
                            {startTime}
                          </Text>
                          {endTime ? (
                            <Text style={[styles.eventTimeText, { fontFamily: F.medium, opacity: 0.8 }]}>
                              {endTime}
                            </Text>
                          ) : null}
                          <View style={styles.eventNowBadge}>
                            <Text style={[styles.eventNowText, { fontFamily: F.extrabold }]}>
                              {item.status === 'completed' ? 'OK' : 'CITA'}
                            </Text>
                          </View>
                        </View>

                        {/* MIDDLE EVENT DETAILS */}
                        <View style={styles.eventDetailsBox}>
                          <Text style={[styles.eventTitle, { color: textPrimary, fontFamily: F.bold }]}>
                            {COMPONENT_NAMES[item.type as keyof typeof COMPONENT_NAMES] || item.type}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <Text style={[styles.eventLocation, { color: textSecondary, fontFamily: F.medium }]}>
                              {item.notes || (isVehiclePlanta ? 'Planta Blue Power • Sala de Máquinas' : 'Taller Técnico')}
                            </Text>
                          </View>
                          {item.odometer > 0 && (
                            <Text style={{ fontSize: 11, color: isDark ? '#00E3FD' : '#0284C7', fontFamily: F.semibold, marginTop: 2 }}>
                              Objetivo: {item.odometer} {isVehiclePlanta ? 'hrs' : 'km'}
                            </Text>
                          )}
                        </View>

                        {/* RIGHT ACTION & TECHNICAL ICON (IMAGE 4 STYLE) */}
                        <View style={{ alignItems: 'center', gap: 8 }}>
                          <MaterialIcons 
                            name={
                              item.type === 'oil' ? 'opacity' :
                              item.type === 'air_filter' ? 'air' :
                              item.type === 'coolant' ? 'severe-cold' : 'build'
                            } 
                            size={24} 
                            color={accentPrimary} 
                          />
                          <TouchableOpacity 
                            onPress={() => deleteRecord(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons name="delete-outline" size={16} color={textSecondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* PROJECTED UPCOMING CYCLES OVERVIEW */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 13, textTransform: 'uppercase', marginBottom: 10 }}>
                  Próximos Ciclos Preventivos Recomendados
                </Text>

                <View style={{ gap: 8 }}>
                  {projectedServices.map(proj => (
                    <View key={proj.name} style={[styles.projectedRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <View style={[styles.projectedIconWrap, { backgroundColor: `${proj.color}20` }]}>
                        <MaterialIcons name={proj.icon as any} size={18} color={proj.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.bold, color: textPrimary, fontSize: 12.5 }}>
                          {proj.name}
                        </Text>
                        <Text style={{ fontFamily: F.medium, color: textSecondary, fontSize: 11, marginTop: 1 }}>
                          Ciclo de {proj.interval} hrs • Faltan aprox. {proj.hoursLeft} hrs ({proj.daysLeft} d)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sidebarDrawer: {
    height: '100%',
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  viewTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  viewTabItem: {
    paddingBottom: 10,
    position: 'relative',
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  viewTabItemActive: {},
  viewTabText: {
    fontSize: 14,
  },
  viewTabActiveLine: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitleText: {
    fontSize: 20,
  },
  monthArrowBtn: {
    padding: 6,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumText: {
    fontSize: 13,
  },
  dayNumFaded: {
    fontSize: 13,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  scheduleBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  scheduleCardForm: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 10.5,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  formInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  quickTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  saveBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  emptyScheduleCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  eventTimePill: {
    width: 62,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  eventTimeText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  eventNowBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  eventNowText: {
    color: '#FFFFFF',
    fontSize: 8.5,
  },
  eventDetailsBox: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13.5,
  },
  eventLocation: {
    fontSize: 11.5,
  },
  projectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  projectedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
