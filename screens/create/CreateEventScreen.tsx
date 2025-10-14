import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Text, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';


const PRIMARY_COLOR = '#0C3B2E';
const DISABLED_COLOR = '#ddd';

type FormData = {
  name: string;
  sport: string;
  location: {
    name: string;
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  dateTime: string;
  duration: number; // Durée en minutes
  totalSlots: number;
  organizerSlots: number;
  availableSlots: number;
  participants: {
    userId: string;
    guests: number;
  }[];
  levels: string[];
  description: string;
  price: number;
};

const CreerEventScreen = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sport: '',
    location: {
      name: '',
      address: '',
      city: '',
      country: '',
      latitude: 0,
      longitude: 0,
    },
    dateTime: '',
    duration: 60, // Valeur par défaut : 1 heure
    totalSlots: 0,
    organizerSlots: 1,
    availableSlots: 0,
    participants: [],
    levels: [],
    description: '',
    price: 0,
  });
  
  useEffect(() => {

    setFormData((prev) => ({
      ...prev,
      availableSlots: prev.totalSlots - prev.organizerSlots, // Calcul dynamique
    }));
  }, [formData.totalSlots, formData.organizerSlots]);

  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('Utilisateur connecté :', user);
    }
  }, [user]);

  const handleNext = () => {
    if (formData.name.trim()) {
      (navigation as any).navigate('CreateStep2', { formData });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <Text style={styles.title}>Quel est le nom de votre événement ?</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="pencil-outline" size={24} color="#aaa" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Match de football"
                placeholderTextColor="#555"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>

        {formData.name.trim().length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: PRIMARY_COLOR }]}
              onPress={handleNext}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'flex-start', // Aligner le contenu en haut
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  footer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4, // Pour Android
  },
});

export default CreerEventScreen;