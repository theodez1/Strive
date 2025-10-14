import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SimpleCalendar } from '../../components/calendar';

const PRIMARY_COLOR = '#0C3B2E';

// Composant calendrier complet avec navigation mensuelle
const FullCalendar = ({ 
  selectedDate, 
  onSelectDate 
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const isPast = (day: number, month: number, year: number) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (day: number, month: number, year: number) => {
    return day === selectedDate.getDate() && 
           month === selectedDate.getMonth() && 
           year === selectedDate.getFullYear();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    // Jours vides au début
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const isPastDay = isPast(day, currentMonth, currentYear);
      const isTodayDay = isToday(day, currentMonth, currentYear);
      const isSelectedDay = isSelected(day, currentMonth, currentYear);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isSelectedDay && styles.selectedCalendarDay,
            isPastDay && styles.pastCalendarDay,
            isTodayDay && styles.todayCalendarDay
          ]}
          onPress={() => {
            if (!isPastDay) {
              onSelectDate(new Date(currentYear, currentMonth, day));
            }
          }}
          disabled={isPastDay}
        >
          <Text style={[
            styles.calendarDayText,
            isSelectedDay && styles.selectedCalendarDayText,
            isPastDay && styles.pastCalendarDayText,
            isTodayDay && styles.todayCalendarDayText
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <ScrollView 
      style={styles.fullCalendar}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.calendarScrollContent}
    >
      {/* Header avec navigation */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => navigateMonth('prev')}>
          <Ionicons name="chevron-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>

        <Text style={styles.calendarMonthText}>
          {months[currentMonth]} {currentYear}
        </Text>

        <TouchableOpacity onPress={() => navigateMonth('next')}>
          <Ionicons name="chevron-forward" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* En-têtes des jours */}
      <View style={styles.dayHeaders}>
        {dayNames.map(day => (
          <View key={day} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Grille des jours */}
      <View style={styles.calendarGrid}>
        {renderCalendarDays()}
      </View>
    </ScrollView>
  );
};

// Composant sélecteur d'heure avec scroll horizontal
const TimeSelector = ({ 
  selectedTime, 
  onTimeSelect 
}: {
  selectedTime: Date;
  onTimeSelect: (hours: number, minutes: number) => void;
}) => {
  // Générer toutes les heures de 0 à 23
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  
  // Minutes : 00, 15, 30, 45
  const minutes = [0, 15, 30, 45];

  return (
    <View style={styles.timeSelector}>
      {/* Ligne des heures */}
      <Text style={styles.timeSelectorTitle}>Heures</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timeScrollView}
        contentContainerStyle={styles.timeScrollContent}
      >
        {allHours.map(hour => (
          <TouchableOpacity
            key={hour}
            style={[
              styles.timeButton,
              selectedTime.getHours() === hour && styles.selectedTimeButton
            ]}
            onPress={() => onTimeSelect(hour, selectedTime.getMinutes())}
          >
            <Text style={[
              styles.timeButtonText,
              selectedTime.getHours() === hour && styles.selectedTimeButtonText
            ]}>
              {hour.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Ligne des minutes */}
      <Text style={styles.timeSelectorTitle}>Minutes</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.timeScrollView}
        contentContainerStyle={styles.timeScrollContent}
      >
        {minutes.map(minute => (
          <TouchableOpacity
            key={minute}
            style={[
              styles.timeButton,
              selectedTime.getMinutes() === minute && styles.selectedTimeButton
            ]}
            onPress={() => onTimeSelect(selectedTime.getHours(), minute)}
          >
            <Text style={[
              styles.timeButtonText,
              selectedTime.getMinutes() === minute && styles.selectedTimeButtonText
            ]}>
              {minute.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

type FormData = {
  name: string;
  sport: string;
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  dateTime: string;
  totalSlots: string;
  levels: string[];
  description: string;
  price: number;
  duration?: number;
  organizerSlots?: number;
};

const CreateStep5 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData: routeFormData } = route.params as { formData: FormData };
  
  // Initialiser avec la date actuelle ou une date par défaut
  const getInitialDate = () => {
    if (routeFormData?.dateTime) {
      return new Date(routeFormData.dateTime);
    }
    const now = new Date();
    // Ajouter 1 heure pour éviter les événements dans le passé immédiat
    now.setHours(now.getHours() + 1);
    return now;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [selectedTime, setSelectedTime] = useState(getInitialDate());

  const handleNext = () => {
    // Combiner la date et l'heure
    const combinedDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );


    // Vérifier que la date/heure n'est pas dans le passé
    const now = new Date();
    if (combinedDateTime <= now) {
      Alert.alert('Erreur', 'La date et l\'heure de l\'événement doivent être dans le futur.');
      return;
    }

    const updatedFormData = {
      ...routeFormData,
      dateTime: combinedDateTime.toISOString(),
    };

    (navigation as any).navigate('CreateStep6', { formData: updatedFormData });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0, 0);
    setSelectedTime(newTime);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Quand aura lieu votre événement ?</Text>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            <View style={styles.componentFrame}>
              <FullCalendar
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
              />
            </View>
          </View>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heure</Text>
            <View style={styles.componentFrame}>
              <TimeSelector
                selectedTime={selectedTime}
                onTimeSelect={handleTimeSelect}
              />
            </View>
          </View>
        </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  componentFrame: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButtonFooter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fullCalendar: {
    backgroundColor: 'transparent',
    marginTop: 8,
    maxHeight: 280,
  },
  calendarScrollContent: {
    flexGrow: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  selectedCalendarDay: {
    backgroundColor: PRIMARY_COLOR,
  },
  pastCalendarDay: {
    opacity: 0.3,
  },
  todayCalendarDay: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedCalendarDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  pastCalendarDayText: {
    color: '#999',
  },
  todayCalendarDayText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  emptyDay: {
    width: '14.28%',
    height: 40,
  },
  timeSelector: {
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  timeSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 8,
    marginTop: 8,
  },
  timeScrollView: {
    maxHeight: 44,
  },
  timeScrollContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  timeButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  selectedTimeButton: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  timeButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  selectedTimeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CreateStep5;