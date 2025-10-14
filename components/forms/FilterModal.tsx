import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  PanResponder,
  FlatList
} from 'react-native';
import { useFilter } from '../../context/FilterContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../constants/Theme';

const { height, width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 150;

interface FilterItem {
  name: string;
  icon: string;
}

const SPORTS: FilterItem[] = [
  { name: 'Football', icon: 'football-outline' },
  { name: 'Basketball', icon: 'basketball-outline' },
  { name: 'Tennis', icon: 'tennisball-outline' },
  { name: 'Running', icon: 'walk-outline' },
  { name: 'Volleyball', icon: 'basketball-outline' },
];

const DIFFICULTY_LEVELS: FilterItem[] = [
  { name: 'Débutant', icon: 'leaf-outline' },
  { name: 'Intermédiaire', icon: 'flame-outline' },
  { name: 'Avancé', icon: 'trophy-outline' }
];

const TIME_PERIODS = [
  { period: 'Matin', time: '6h-12h', icon: 'sunny-outline' },
  { period: 'Après-midi', time: '12h-18h', icon: 'partly-sunny-outline' },
  { period: 'Soir', time: '18h-00h', icon: 'moon-outline' }
];

// Mapping français → anglais pour le backend
const LEVEL_FR_TO_EN: Record<string, string> = {
  'Débutant': 'Beginner',
  'Intermédiaire': 'Intermediate',
  'Avancé': 'Advanced'
};

// Mapping anglais → français pour l'affichage
const LEVEL_EN_TO_FR: Record<string, string> = {
  'Beginner': 'Débutant',
  'Intermediate': 'Intermédiaire',
  'Advanced': 'Avancé'
};

const FilterModal = () => {
  const { isFilterVisible, hideFilter, selectedFilters, updateFilters } = useFilter();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // États locaux : utiliser les noms français pour l'affichage
  const [selectedSports, setSelectedSports] = useState<string[]>(selectedFilters.sports);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(
    selectedFilters.levels.map(level => LEVEL_EN_TO_FR[level] || level)
  );
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(selectedFilters.timeSlots);

  // Synchroniser les états locaux avec les filtres globaux quand la modal s'ouvre
  useEffect(() => {
    if (isFilterVisible) {
      setSelectedSports(selectedFilters.sports);
      // Convertir les niveaux anglais en français pour l'affichage
      setSelectedLevels(selectedFilters.levels.map(level => LEVEL_EN_TO_FR[level] || level));
      setSelectedTimeSlots(selectedFilters.timeSlots);
    }
  }, [isFilterVisible, selectedFilters]);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
          const newOpacity = Math.max(0, 1 - (gestureState.dy / (height / 2)));
          backdropAnim.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          closeWithAnimation();
        } else {
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 11
            }),
            Animated.timing(backdropAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true
            })
          ]).start();
        }
      }
    })
  ).current;

  const closeWithAnimation = () => {
    // Convertir les niveaux français en anglais pour le backend
    const levelsEnglish = selectedLevels.map(level => LEVEL_FR_TO_EN[level] || level);
    
    updateFilters({
      sports: selectedSports,
      levels: levelsEnglish,
      timeSlots: selectedTimeSlots,
    });
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => hideFilter(), 100);
    });
  };

  useEffect(() => {
    if (isFilterVisible) {
      setSelectedSports(selectedFilters.sports);
      // Convertir les niveaux anglais en français pour l'affichage
      setSelectedLevels(selectedFilters.levels.map(level => LEVEL_EN_TO_FR[level] || level));
      setSelectedTimeSlots(selectedFilters.timeSlots);
      slideAnim.setValue(height);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
          velocity: 3
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [isFilterVisible]);

  const toggleSelection = (item: string, selectedItems: string[], setSelectedItems: (items: string[]) => void) => {
    setSelectedItems(
      selectedItems.includes(item)
        ? selectedItems.filter(i => i !== item)
        : [...selectedItems, item]
    );
  };

  const resetFilters = () => {
    setSelectedSports([]);
    setSelectedLevels([]);
    setSelectedTimeSlots([]);
  };

  const FilterSection = React.memo(({ 
    title, 
    items, 
    selectedItems, 
    onToggle 
  }: { 
    title: string, 
    items: FilterItem[], 
    selectedItems: string[], 
    onToggle: (item: string) => void 
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => `${item.name}-${item.icon}`}
        renderItem={({ item }) => {
          const isSelected = selectedItems.includes(item.name);
          
          return (
            <TouchableOpacity
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected
              ]}
              onPress={() => onToggle(item.name)}
              accessible={true}
              accessibilityLabel={`Select ${item.name}`}
              accessibilityRole="button"
            >
              <Ionicons 
                name={item.icon as any} 
                size={20} 
                color={isSelected ? Colors.background : Colors.textSecondary} 
                style={styles.optionIcon}
              />
              <Text style={[
                styles.optionText,
                isSelected && styles.optionTextSelected
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.optionsContainer}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  ));

  const TimeSection = React.memo(() => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Horaires</Text>
      <View style={styles.timeContainer}>
        {TIME_PERIODS.map((timeGroup) => (
          <TouchableOpacity
            key={timeGroup.period}
            style={[
              styles.timeBox,
              selectedTimeSlots.includes(timeGroup.period) && styles.timeBoxSelected
            ]}
            onPress={() => toggleSelection(timeGroup.period, selectedTimeSlots, setSelectedTimeSlots)}
            accessible={true}
            accessibilityLabel={`Select ${timeGroup.period}`}
            accessibilityRole="button"
          >
            <Ionicons 
              name={timeGroup.icon as any} 
              size={24} 
              color={selectedTimeSlots.includes(timeGroup.period) ? Colors.background : Colors.textSecondary} 
              style={styles.timeIcon}
            />
            <Text style={[
              styles.periodTitle,
              selectedTimeSlots.includes(timeGroup.period) && styles.periodTitleSelected
            ]}>
              {timeGroup.period}
            </Text>
            <Text style={[
              styles.timeText,
              selectedTimeSlots.includes(timeGroup.period) && styles.timeTextSelected
            ]}>
              {timeGroup.time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ));

  if (!isFilterVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View 
        style={[
          styles.backdrop,
          { opacity: backdropAnim }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={closeWithAnimation}
          activeOpacity={1}
        />
      </Animated.View>
      
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }]
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragIndicator} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="options-outline" size={22} color={Colors.text} style={styles.headerIcon} />
              <Text style={styles.title}>Filtres</Text>
            </View>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.primary} style={styles.resetIcon} />
              <Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContent}>
            <FilterSection
              title="Sports"
              items={SPORTS}
              selectedItems={selectedSports}
              onToggle={(sport) => toggleSelection(sport, selectedSports, setSelectedSports)}
            />

            <FilterSection
              title="Niveau"
              items={DIFFICULTY_LEVELS}
              selectedItems={selectedLevels}
              onToggle={(level) => toggleSelection(level, selectedLevels, setSelectedLevels)}
            />

            <TimeSection />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={closeWithAnimation}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.extendedColors.gray300,
    backgroundColor: Colors.background,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  resetIcon: {
    marginRight: 4,
  },
  resetText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterContent: {
    flex: 1,
    padding: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Theme.extendedColors.gray300,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  applyButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: Theme.extendedColors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
    paddingLeft: 4,
  },
  optionsContainer: {
    paddingHorizontal: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray300,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  optionTextSelected: {
    color: Colors.background,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeBox: {
    width: width * 0.27,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray300,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timeBoxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  periodTitleSelected: {
    color: Colors.background,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timeTextSelected: {
    color: Colors.background,
  },
  optionIcon: {
    marginRight: 6,
  },
  timeIcon: {
    marginBottom: 4,
  },
});

export default FilterModal;
