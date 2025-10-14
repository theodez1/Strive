import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_COLOR = '#0C3B2E';

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

const CreateStep3 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData: routeFormData } = route.params as { formData: FormData };

  const [totalSlots, setTotalSlots] = useState(routeFormData?.totalSlots || '');
  const [organizerSlots, setOrganizerSlots] = useState(routeFormData?.organizerSlots?.toString() || '');
  const [availableSlots, setAvailableSlots] = useState(0);
  const [duration, setDuration] = useState<number | null>(routeFormData?.duration || null);

  const animatedValue = new Animated.Value(1);

  useEffect(() => {
    const total = parseInt(totalSlots || '0');
    const organizer = parseInt(organizerSlots || '0');
    setAvailableSlots(Math.max(total - organizer, 0));
  }, [totalSlots, organizerSlots]);

  const handleNext = () => {
    const total = parseInt(totalSlots || '0');
    const organizer = parseInt(organizerSlots || '0');
    
    if (!totalSlots.trim()) {
      alert('Veuillez saisir le nombre total de places.');
      return;
    }
    if (isNaN(organizer) || organizer < 1) {
      alert('Veuillez saisir un nombre valide d\'au moins 1 pour l\'organisateur.');
      return;
    }
    if (organizer > total) {
      alert('L\'organisateur ne peut pas avoir plus de places que le total disponible.');
      return;
    }

    const updatedFormData = {
      ...routeFormData,
      totalSlots,
      organizerSlots: organizer,
      duration,
    };

    (navigation as any).navigate('CreateStep4', { formData: updatedFormData });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
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
            {/* Total Slots */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nombre total de places</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color="#555" />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 10"
                  placeholderTextColor="#999"
                  value={totalSlots}
                  onChangeText={setTotalSlots}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Organizer Slots */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Places pour l'organisateur</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#555" />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 1"
                  placeholderTextColor="#999"
                  value={organizerSlots}
                  onChangeText={setOrganizerSlots}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.hintText}>Combien êtes-vous ?</Text>
            </View>

            {/* Available Slots Display */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Places disponibles</Text>
              <View style={styles.availableSlotsContainer}>
                <Text style={styles.availableSlotsText}>{availableSlots}</Text>
              </View>
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Durée (en minutes)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={20} color="#555" />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 90"
                  placeholderTextColor="#999"
                  value={duration?.toString() || ''}
                  onChangeText={(text) => setDuration(parseInt(text) || null)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            {totalSlots && (
              <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => {
                    animateButton();
                    handleNext();
                  }}
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
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
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    marginLeft: 12,
  },
  availableSlotsContainer: {
    backgroundColor: '#0C3B2E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  availableSlotsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
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

export default CreateStep3;