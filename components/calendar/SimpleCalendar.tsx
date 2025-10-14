import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Platform,
} from 'react-native';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const TOTAL_WEEKS = 52; // Nombre total de semaines à générer (1 an)
const WEEKS_BEFORE_TODAY = 0; // Commencer à partir d'aujourd'hui

interface Day {
  date: Date;
  isToday: boolean;
}

interface SimpleCalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
}

interface SimpleCalendarRef {
  scrollToDate: (date: Date) => void;
}

const SimpleCalendar = forwardRef<SimpleCalendarRef, SimpleCalendarProps>(
  ({ selectedDate: propSelectedDate, onSelectDate }, ref) => {
    const windowDimensions = Dimensions.get('window');
    const flatListRef = useRef<FlatList<Day[]>>(null);

    const [dateData, setDateData] = useState<Day[][] | undefined>(undefined);
    const [currentMonth, setCurrentMonth] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(
      propSelectedDate || new Date()
    );

    // Utility Functions
    const getStartOfWeek = (date: Date): Date => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(start.setDate(diff));
    };

    const formatMonth = (date: Date): string => {
      const month = date.toLocaleString('fr-FR', { month: 'short' }).slice(0, 3);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 6); // Vérifier la date à la fin de la semaine
      const nextMonth = nextDate
        .toLocaleString('fr-FR', { month: 'short' })
        .slice(0, 3);

      return month !== nextMonth ? `${month}. / ${nextMonth}.` : `${month}.`;
    };

    const isSameDate = (date1: Date, date2: Date): boolean => {
      return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      );
    };

    // Effects
    useEffect(() => {
      if (propSelectedDate) {
        setSelectedDate(propSelectedDate);
      }
    }, [propSelectedDate]);

    useEffect(() => {
      const today = new Date();
      setCurrentMonth(formatMonth(today));
    }, []);

    useEffect(() => {
      const generateCalendarData = (): Day[][] => {
        const weeks: Day[][] = [];
        const today = new Date();
        const startOfToday = getStartOfWeek(today);

        // Commencer à partir de la semaine d'aujourd'hui (pas de semaines passées)
        for (let weekOffset = 0; weekOffset < TOTAL_WEEKS; weekOffset++) {
          const week: Day[] = [];
          for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date(startOfToday);
            date.setDate(
              startOfToday.getDate() + weekOffset * 7 + dayOffset
            );
            week.push({
              date,
              isToday: isSameDate(date, today),
            });
          }
          weeks.push(week);
        }

        return weeks;
      };

      setDateData(generateCalendarData());
    }, []);

    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      onSelectDate?.(date);
    };

    const scrollToDate = (date: Date) => {
      if (!dateData || !flatListRef.current) return;

      const index = dateData.findIndex((week) =>
        week.some((day) => isSameDate(day.date, date))
      );

      if (index !== -1) {
        flatListRef.current.scrollToIndex({ index, animated: true });
        handleDateSelect(date);
      }
    };

    // Expose scrollToDate to parent via ref
    useImperativeHandle(ref, () => ({
      scrollToDate,
    }));

    // Utility function to check if a date is in the past
    const isPastDate = (date: Date): boolean => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0); // Reset to start of day
      return compareDate < today;
    };

    // Components
    const DayComponent = ({ item }: { item: Day[] }) => (
      <View style={styles.weekContainer}>
        {item.map((day, index) => {
          const isToday = isSameDate(day.date, new Date());
          const isSelected = isSameDate(day.date, selectedDate);
          const isPast = isPastDate(day.date);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayContainer,
                { width: windowDimensions.width / 7 },
              ]}
              onPress={() => !isPast && handleDateSelect(day.date)}
              disabled={isPast}
            >
              <View style={styles.dayWrapper}>
                <View
                  style={[
                    styles.dateCircle,
                    isToday && styles.todayCircle,
                    isSelected && (isToday ? styles.selectedTodayCircle : styles.selectedDateCircle),
                    isPast && styles.pastDateCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayDateText,
                      isToday && styles.todayText,
                      isSelected && (isToday ? styles.selectedTodayText : styles.selectedDateText),
                      isPast && styles.pastDateText,
                    ]}
                  >
                    {day.date.getDate()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );

    const MonthHeader = () => (
      <View style={styles.monthHeader}>
        <TouchableOpacity 
          style={styles.monthTextContainer}
          onPress={() => scrollToDate(new Date())}
        >
          <Text style={styles.monthText}>{currentMonth}</Text>
          <View style={styles.monthUnderline} />
        </TouchableOpacity>
      </View>
    );

    const WeekDayHeader = () => (
      <View style={styles.weekDayHeader}>
        {DAYS_OF_WEEK.map((day, index) => (
          <View
            key={index}
            style={[
              styles.dayHeaderContainer,
              { width: windowDimensions.width / 7 },
            ]}
          >
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
    );

    return (
      <View style={styles.container}>
        <MonthHeader />
        <WeekDayHeader />
        {dateData && (
          <FlatList
            ref={flatListRef}
            horizontal
            data={dateData}
            initialScrollIndex={0}
            getItemLayout={(data, index) => ({
              length: windowDimensions.width,
              offset: windowDimensions.width * index,
              index,
            })}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => <DayComponent item={item} />}
            snapToAlignment="start"
            snapToInterval={windowDimensions.width}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const index = Math.floor(
                event.nativeEvent.contentOffset.x / windowDimensions.width
              );
              
              if (dateData[index]) {
                setCurrentMonth(formatMonth(dateData[index][0].date));
              }
            }}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    paddingBottom: 0,
    marginBottom: 0,
  },
  monthHeader: {
    height: 35,
    justifyContent: 'flex-start',
    paddingLeft: 15,
  },
  monthTextContainer: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  monthUnderline: {
    width: 24,
    height: 2,
    backgroundColor: '#0C3B2E',
    borderRadius: 1,
  },
  weekDayHeader: {
    flexDirection: 'row',
    width: Dimensions.get('window').width,
    height: 20,
    alignItems: 'center',
  },
  dayHeaderContainer: { alignItems: 'center', justifyContent: 'center', height: 20 },
  dayHeaderText: { fontSize: 12, color: '#666', fontWeight: '600' },
  weekContainer: {
    width: Dimensions.get('window').width,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  dayContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 40,
  },
  dayWrapper: {
    alignItems: 'center',
    height: 40,
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#0C3B2E',
  },
  selectedDateCircle: { 
    backgroundColor: '#0C3B2E' 
  },
  dayDateText: { 
    fontSize: 14, 
    color: '#333' 
  },
  todayText: {
    color: '#0C3B2E',
    fontWeight: '600',
  },
  selectedDateText: { 
    color: '#fff',
    fontWeight: '600',
  },
  selectedTodayCircle: {
    backgroundColor: '#0C3B2E',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  selectedTodayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pastDateCircle: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pastDateText: {
    color: '#B0B0B0',
    fontWeight: '400',
  },
});

export default SimpleCalendar;