import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface WorkingHours {
  off_days: string[];
  holidays: string[];
  morning?: string;
  evening?: string;
  consultation_duration: number;
  buffer_minutes: number;
  on_call_nights?: string[];
  slots?: string[];
}

interface ScheduleEditorProps {
  value: WorkingHours;
  onChange: (value: WorkingHours) => void;
  showOnCall?: boolean;
  title?: string;
}

const DAYS = [
  { id: 'saturday', name: 'السبت', name_en: 'Saturday' },
  { id: 'sunday', name: 'الأحد', name_en: 'Sunday' },
  { id: 'monday', name: 'الإثنين', name_en: 'Monday' },
  { id: 'tuesday', name: 'الثلاثاء', name_en: 'Tuesday' },
  { id: 'wednesday', name: 'الأربعاء', name_en: 'Wednesday' },
  { id: 'thursday', name: 'الخميس', name_en: 'Thursday' },
  { id: 'friday', name: 'الجمعة', name_en: 'Friday' },
];

const DURATIONS = [
  { value: 15, label: '15 دقيقة' },
  { value: 25, label: '25 دقيقة' },
  { value: 30, label: '30 دقيقة' },
  { value: 45, label: '45 دقيقة' },
  { value: 60, label: '60 دقيقة' },
];

export default function ScheduleEditor({
  value,
  onChange,
  showOnCall = false,
  title = 'جدولة العمل',
}: ScheduleEditorProps) {
  const [localValue, setLocalValue] = useState<WorkingHours>({
    off_days: [],
    holidays: [],
    morning: '08:00-14:00',
    evening: '',
    consultation_duration: 30,
    buffer_minutes: 10,
    on_call_nights: [],
    ...value,
  });

  useEffect(() => {
    onChange(localValue);
  }, [localValue]);

  const toggleDayOff = (dayId: string) => {
    setLocalValue(prev => {
      const offDays = prev.off_days || [];
      const newOffDays = offDays.includes(dayId)
        ? offDays.filter(d => d !== dayId)
        : [...offDays, dayId];
      return { ...prev, off_days: newOffDays };
    });
  };

  const updateTimeRange = (field: 'morning' | 'evening', value: string) => {
    setLocalValue(prev => ({ ...prev, [field]: value }));
  };

  const updateDuration = (duration: number) => {
    setLocalValue(prev => ({ ...prev, consultation_duration: duration }));
  };

  const updateBuffer = (buffer: string) => {
    const num = parseInt(buffer) || 0;
    setLocalValue(prev => ({ ...prev, buffer_minutes: num }));
  };

  const toggleOnCall = (dayId: string) => {
    setLocalValue(prev => {
      const onCallNights = prev.on_call_nights || [];
      const newOnCall = onCallNights.includes(dayId)
        ? onCallNights.filter(d => d !== dayId)
        : [...onCallNights, dayId];
      return { ...prev, on_call_nights: newOnCall };
    });
  };

  const addHoliday = (date: string) => {
    if (date && !localValue.holidays?.includes(date)) {
      setLocalValue(prev => ({
        ...prev,
        holidays: [...(prev.holidays || []), date],
      }));
    }
  };

  const removeHoliday = (date: string) => {
    setLocalValue(prev => ({
      ...prev,
      holidays: prev.holidays?.filter(h => h !== date) || [],
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Off Days */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>أيام العطلة</Text>
        <View style={styles.daysGrid}>
          {DAYS.map(day => {
            const isOff = localValue.off_days?.includes(day.id);
            return (
              <TouchableOpacity
                key={day.id}
                style={[styles.dayButton, isOff && styles.dayButtonActive]}
                onPress={() => toggleDayOff(day.id)}
              >
                <Text style={[styles.dayText, isOff && styles.dayTextActive]}>
                  {day.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Working Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ساعات العمل</Text>
        
        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="weather-sunny" size={20} color="#F39C12" />
          <Text style={styles.timeLabel}>الفترة الصباحية</Text>
          <TextInput
            style={styles.timeInput}
            value={localValue.morning}
            onChangeText={(text) => updateTimeRange('morning', text)}
            placeholder="08:00-14:00"
          />
        </View>

        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="weather-night" size={20} color="#5D6D7E" />
          <Text style={styles.timeLabel}>الفترة المسائية</Text>
          <TextInput
            style={styles.timeInput}
            value={localValue.evening}
            onChangeText={(text) => updateTimeRange('evening', text)}
            placeholder="17:00-21:00"
          />
        </View>
      </View>

      {/* Consultation Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>مدة الاستشارة</Text>
        <View style={styles.durationGrid}>
          {DURATIONS.map((dur) => (
            <TouchableOpacity
              key={dur.value}
              style={[
                styles.durationButton,
                localValue.consultation_duration === dur.value && styles.durationButtonActive,
              ]}
              onPress={() => updateDuration(dur.value)}
            >
              <Text
                style={[
                  styles.durationText,
                  localValue.consultation_duration === dur.value && styles.durationTextActive,
                ]}
              >
                {dur.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Buffer Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>وقت الانتظار بين المواعيد (دقيقة)</Text>
        <TextInput
          style={styles.bufferInput}
          value={String(localValue.buffer_minutes || 10)}
          onChangeText={updateBuffer}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>

      {/* On-Call Nights (for pharmacy) */}
      {showOnCall && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أيام المناوبة الليلية</Text>
          <View style={styles.daysGrid}>
            {DAYS.map(day => {
              const isOnCall = localValue.on_call_nights?.includes(day.id);
              return (
                <TouchableOpacity
                  key={`oncall-${day.id}`}
                  style={[styles.dayButton, isOnCall && styles.onCallButtonActive]}
                  onPress={() => toggleOnCall(day.id)}
                >
                  <MaterialCommunityIcons
                    name="moon-waning-crescent"
                    size={14}
                    color={isOnCall ? '#FFF' : '#666'}
                    style={{ marginBottom: 2 }}
                  />
                  <Text style={[styles.dayText, isOnCall && styles.dayTextActive]}>
                    {day.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    minWidth: 70,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#E53935',
  },
  onCallButtonActive: {
    backgroundColor: '#5D6D7E',
  },
  dayText: {
    fontSize: 13,
    color: '#666',
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  durationButtonActive: {
    backgroundColor: '#2E7D32',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  durationTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  bufferInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
    width: 80,
    textAlign: 'center',
  },
});
