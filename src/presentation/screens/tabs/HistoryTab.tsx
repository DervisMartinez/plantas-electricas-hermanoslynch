import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyMoto } from '../../context/MotoContext';
import { useTheme } from '../../context/ThemeContext';
import { COMPONENT_NAMES } from '../../../constants/telemetry';
import { isPlanta } from '../../../domain/entities/Moto';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const parseSafeDate = (d: string) => {
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) {
    const parts = d.split('/');
    if (parts.length === 3) {
      const fallback = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(fallback.getTime())) return fallback;
    }
    return new Date();
  }
  return parsed;
};

export const HistoryTab = () => {
  const { records, deleteRecord, myMoto } = useMyMoto();
  const { colors } = useTheme();

  const F = {
    bold: 'Montserrat_700Bold',
    semibold: 'Montserrat_600SemiBold',
    regular: 'Montserrat_400Regular',
  };

  const { groupedData, totalThisMonth, totalLastMonth } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear = currentYear - 1;
    }

    let tThisMonth = 0;
    let tLastMonth = 0;

    const groups: Record<string, { label: string; year: number; month: number; total: number; days: Record<string, any[]> }> = {};

    records.forEach(record => {
      const d = parseSafeDate(record.date);
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      
      const cost = Number(record.costUSD) || 0;

      if (year === currentYear && month === currentMonth) {
        tThisMonth += cost;
      } else if (year === lastMonthYear && month === lastMonth) {
        tLastMonth += cost;
      }

      const monthKey = `${year}-${month}`;
      if (!groups[monthKey]) {
        groups[monthKey] = {
          label: `${MONTHS[month]} ${year}`,
          year,
          month,
          total: 0,
          days: {}
        };
      }
      
      groups[monthKey].total += cost;
      
      const dayKey = `${year}-${month}-${day}`;
      if (!groups[monthKey].days[dayKey]) {
        groups[monthKey].days[dayKey] = [];
      }
      
      groups[monthKey].days[dayKey].push(record);
    });

    const sortedMonths = Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    sortedMonths.forEach(mGroup => {
      const dayEntries = Object.keys(mGroup.days).map(k => {
        const parts = k.split('-');
        return { key: k, day: parseInt(parts[2]) };
      });
      dayEntries.sort((a, b) => b.day - a.day);
      
      const newDays: Record<string, any[]> = {};
      dayEntries.forEach(de => {
        const recs = mGroup.days[de.key];
        recs.sort((a, b) => parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime());
        newDays[de.key] = recs;
      });
      mGroup.days = newDays;
    });

    return {
      groupedData: sortedMonths,
      totalThisMonth: tThisMonth,
      totalLastMonth: tLastMonth
    };
  }, [records]);

  const diffStr = useMemo(() => {
    if (totalLastMonth === 0) return totalThisMonth > 0 ? '+100%' : '0%';
    const diff = totalThisMonth - totalLastMonth;
    const pct = (diff / totalLastMonth) * 100;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }, [totalThisMonth, totalLastMonth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'left', 'right']}>
      <View style={{ padding: 24, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontFamily: F.bold, color: colors.onSurface }}>Historial de Gastos</Text>
        <Text style={{ fontSize: 14, fontFamily: F.regular, color: colors.onSurfaceVariant, marginTop: 4 }}>
          Todos los mantenimientos y combustible
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <View style={{ backgroundColor: colors.primaryContainer, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontFamily: F.semibold, color: colors.onPrimaryContainer, fontSize: 14 }}>
            Gastos este mes
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
            <Text style={{ fontFamily: F.bold, color: colors.onPrimaryContainer, fontSize: 32 }}>
              ${totalThisMonth.toFixed(2)}
            </Text>
            <Text style={{ fontFamily: F.regular, color: colors.onPrimaryContainer, fontSize: 14, marginLeft: 12, marginBottom: 6 }}>
              {diffStr} vs mes anterior
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {groupedData.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <MaterialIcons name="receipt-long" size={64} color={colors.surfaceContainerHighest} />
            <Text style={{ fontFamily: F.bold, color: colors.onSurfaceVariant, marginTop: 16 }}>Sin registros todavía</Text>
          </View>
        ) : (
          groupedData.map((monthGroup) => (
            <View key={monthGroup.label} style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 18 }}>
                  {monthGroup.label}
                </Text>
                <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 16 }}>
                  ${monthGroup.total.toFixed(2)}
                </Text>
              </View>

              {Object.entries(monthGroup.days).map(([dayKey, dayRecords]) => {
                const day = dayKey.split('-')[2];
                return (
                  <View key={dayKey} style={{ marginBottom: 16 }}>
                    <Text style={{ fontFamily: F.semibold, color: colors.onSurfaceVariant, fontSize: 14, marginBottom: 8, marginLeft: 4 }}>
                      {day} de {monthGroup.label.split(' ')[0]}
                    </Text>
                    {dayRecords.map((record) => (
                      <View key={record.id} style={{ backgroundColor: colors.surfaceContainerLow, padding: 16, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: record.type === 'fuel' ? colors.tertiaryContainer : colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                          <MaterialIcons name={record.type === 'fuel' ? 'local-gas-station' : 'build'} size={24} color={record.type === 'fuel' ? colors.onTertiary : colors.onPrimaryContainer} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.bold, color: colors.onSurface, fontSize: 15 }}>{(COMPONENT_NAMES as any)[record.type] || record.type}</Text>
                          <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                            {record.odometer} {isPlanta(myMoto) ? 'hrs' : 'km'}
                          </Text>
                          {record.notes && <Text style={{ fontFamily: F.regular, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>{record.notes}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                          <Text style={{ fontFamily: F.bold, color: colors.primary, fontSize: 16 }}>${Number(record.costUSD).toFixed(2)}</Text>
                          <TouchableOpacity onPress={() => deleteRecord(record.id)} style={{ padding: 4, marginTop: 4 }}>
                            <MaterialIcons name="delete" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
