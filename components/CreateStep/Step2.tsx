import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_COLOR = '#0C3B2E';
const SELECTED_BACKGROUND = '#3A5F0B';
const POINT_COLOR = '#fff';
const UNSELECTED_POINT_COLOR = 'grey';

const SPORTS = [
  { name: 'Football', icon: 'football-outline' },
  { name: 'Basketball', icon: 'basketball-outline' },
  { name: 'Tennis', icon: 'tennisball-outline' },
  { name: 'Padel', icon: 'ellipse-outline' },
];

const LEVELS = [
  { name: 'Débutant', points: 1 },
  { name: 'Intermédiaire', points: 2 },
  { name: 'Confirmé', points: 3 },
];

const Step2 = () => {
  const router = useRouter();
  const { formData } = useLocalSearchParams();
  const parsedFormData = typeof formData === 'string' ? JSON.parse(formData) : {};
  const [selectedSport, setSelectedSport] = useState(parsedFormData.sport || '');
  const [selectedLevels, setSelectedLevels] = useState(parsedFormData.levels || []);

interface Level {
    name: string;
    points: number;
}

interface Sport {
    name: string;
    icon: string;
}

const toggleLevel = (level: string) => {
    if (selectedLevels.includes('Tous niveaux')) {
        setSelectedLevels([level]); // Désélectionne "Tous niveaux" et sélectionne le niveau choisi
    } else if (selectedLevels.includes(level)) {
        setSelectedLevels(selectedLevels.filter((l: string) => l !== level)); // Retire le niveau s'il est déjà sélectionné
    } else {
        const newLevels = [...selectedLevels, level];
        if (newLevels.length === LEVELS.length) {
            setSelectedLevels(['Tous niveaux']); // Sélectionne "Tous niveaux" si tous les niveaux sont sélectionnés
        } else {
            setSelectedLevels(newLevels); // Ajoute le niveau sélectionné
        }
    }
};

  const handleTousNiveaux = () => {
    if (selectedLevels.includes('Tous niveaux')) {
      setSelectedLevels([]); // Désélectionner si "Tous niveaux" est déjà sélectionné
    } else {
      setSelectedLevels(['Tous niveaux']); // Sélectionner uniquement "Tous niveaux"
    }
  };

  const handleNext = () => {
    if (!selectedSport || selectedLevels.length === 0) {
      alert('Veuillez sélectionner un sport et au moins un niveau pour continuer.');
      return;
    }

    router.push({
      pathname: '/(screens)/CreateStep/Step3',
      params: { formData: JSON.stringify({ ...parsedFormData, sport: selectedSport, levels: selectedLevels }) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={28} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Quel sport souhaitez-vous pratiquer ?</Text>
        <View style={styles.optionsContainer}>
          {SPORTS.map((sport) => (
            <TouchableOpacity
              key={sport.name}
              style={[
                styles.option,
                selectedSport === sport.name && styles.selectedOption,
              ]}
              onPress={() => setSelectedSport(sport.name)}
            >
              <Icon
                name={sport.icon}
                size={24}
                color={selectedSport === sport.name ? POINT_COLOR : PRIMARY_COLOR}
              />
              <Text
                style={[
                  styles.optionText,
                  selectedSport === sport.name && styles.selectedOptionText,
                ]}
              >
                {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.title, { marginTop: 20 }]}>Quels niveaux recherchez-vous ?</Text>
        <View style={styles.levelsContainer}>
          {LEVELS.map((level) => (
            <TouchableOpacity
              key={level.name}
              style={[
                styles.levelOption,
                selectedLevels.includes(level.name) && styles.selectedLevelOption,
              ]}
              onPress={() => toggleLevel(level.name)}
            >
              <Text
                style={[
                  styles.levelText,
                  selectedLevels.includes(level.name) && styles.selectedLevelText,
                ]}
              >
                {level.name}
              </Text>
              <View style={styles.dotsContainer}>
                {[...Array(3)].map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index < level.points
                        ? selectedLevels.includes(level.name)
                          ? styles.selectedFilledDot
                          : styles.filledDot
                        : styles.unfilledDot,
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.tousNiveauxButton,
            selectedLevels.includes('Tous niveaux') && styles.selectedLevelOption,
          ]}
          onPress={handleTousNiveaux}
        >
          <Text
            style={[
              styles.levelText,
              selectedLevels.includes('Tous niveaux') && styles.selectedLevelText,
            ]}
          >
            Tous niveaux
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: selectedSport && selectedLevels.length > 0 ? PRIMARY_COLOR : '#ddd' },
          ]}
          onPress={handleNext}
          disabled={!selectedSport || selectedLevels.length === 0}
        >
          <Icon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  option: {
    width: '40%',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignItems: 'center',
    margin: 8,
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: PRIMARY_COLOR,
  },
  selectedOptionText: {
    color: POINT_COLOR,
  },
  optionText: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    textAlign: 'center',
  },
  levelsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  levelOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  selectedLevelOption: {
    backgroundColor: PRIMARY_COLOR,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filledDot: {
    backgroundColor: PRIMARY_COLOR,
  },
  unfilledDot: {
    backgroundColor: UNSELECTED_POINT_COLOR,
  },
  selectedFilledDot: {
    backgroundColor: POINT_COLOR,
  },
  levelText: {
    fontSize: 16,
    color: PRIMARY_COLOR,
  },
  selectedLevelText: {
    color: POINT_COLOR,
  },
  tousNiveauxButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  footer: {
    padding: 16,
    alignItems: 'flex-end',
  },
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Step2;