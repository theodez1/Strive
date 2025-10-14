import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_COLOR = '#0C3B2E';
const SELECTED_BACKGROUND = '#E8F5E8';
const POINT_COLOR = '#fff';
const UNSELECTED_POINT_COLOR = 'grey';

const SPORTS = [
  { name: 'Football', icon: 'football-outline' },
  { name: 'Basketball', icon: 'basketball-outline' },
  { name: 'Tennis', icon: 'tennisball-outline' },
  { name: 'Padel', icon: 'ellipse-outline' },
  { name: 'Running', icon: 'walk-outline' },
  { name: 'Fitness', icon: 'barbell-outline' },
  { name: 'Swimming', icon: 'water-outline' },
  { name: 'Volleyball', icon: 'ellipse-outline' },
];

const LEVELS = [
  { name: 'Débutant', points: 1 },
  { name: 'Intermédiaire', points: 2 },
  { name: 'Confirmé', points: 3 },
];

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
};

const CreateStep2 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData: routeFormData } = route.params as { formData: FormData };
  
  const [selectedSport, setSelectedSport] = useState(routeFormData?.sport || '');
  const [selectedLevels, setSelectedLevels] = useState(routeFormData?.levels || []);

  const toggleLevel = (level: string) => {
    if (selectedLevels.includes('Tous niveaux')) {
      setSelectedLevels([level]);
    } else if (selectedLevels.includes(level)) {
      setSelectedLevels(selectedLevels.filter((l: string) => l !== level));
    } else {
      const newLevels = [...selectedLevels, level];
      if (newLevels.length === LEVELS.length) {
        setSelectedLevels(['Tous niveaux']);
      } else {
        setSelectedLevels(newLevels);
      }
    }
  };

  const handleNext = () => {
    if (!selectedSport) {
      alert('Veuillez sélectionner un sport.');
      return;
    }

    const updatedFormData = {
      ...routeFormData,
      sport: selectedSport,
      levels: selectedLevels,
    };

    (navigation as any).navigate('CreateStep3', { formData: updatedFormData });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sport Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choisissez un sport</Text>
            <View style={styles.sportsGrid}>
              {SPORTS.map((sport, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.sportCard,
                    selectedSport === sport.name && styles.selectedSportCard,
                  ]}
                  onPress={() => setSelectedSport(sport.name)}
                >
                  <Ionicons
                    name={sport.icon as any}
                    size={32}
                    color={selectedSport === sport.name ? PRIMARY_COLOR : '#555'}
                  />
                  <Text
                    style={[
                      styles.sportText,
                      selectedSport === sport.name && styles.selectedSportText,
                    ]}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Level Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Niveau requis</Text>
            <View style={styles.levelsContainer}>
              {LEVELS.map((level, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.levelCard,
                    selectedLevels.includes(level.name) && styles.selectedLevelCard,
                  ]}
                  onPress={() => toggleLevel(level.name)}
                >
                  <View style={styles.levelHeader}>
                    <Text
                      style={[
                        styles.levelName,
                        selectedLevels.includes(level.name) && styles.selectedLevelName,
                      ]}
                    >
                      {level.name}
                    </Text>
                    <View style={styles.pointsContainer}>
                      {[...Array(3)].map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.point,
                            i < level.points
                              ? styles.filledPoint
                              : styles.emptyPoint,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          {selectedSport && selectedLevels.length > 0 && (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          )}
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
    marginBottom: 30,
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sportCard: {
    width: '48%',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSportCard: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: SELECTED_BACKGROUND,
  },
  sportText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  selectedSportText: {
    color: PRIMARY_COLOR,
  },
  levelsContainer: {
    gap: 12,
  },
  levelCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLevelCard: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: SELECTED_BACKGROUND,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedLevelName: {
    color: PRIMARY_COLOR,
  },
  pointsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filledPoint: {
    backgroundColor: PRIMARY_COLOR,
  },
  emptyPoint: {
    backgroundColor: '#ddd',
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
});

export default CreateStep2;