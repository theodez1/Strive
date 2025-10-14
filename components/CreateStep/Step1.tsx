import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_COLOR = '#0C3B2E';

type FormData = {
  name: string;
  sport: string;
  location: {
    address: string;
    city : string;
    country : string;
    latitude: number;
    longitude: number;
  };
  dateTime: string;
  totalSlots: string;
  levels: string[];
  description: string;
  price: number;
};

const Step1 = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sport: '',
    location: {
      address: '',
      city: '',
      country: '',
      latitude: 0,
      longitude: 0,
    },
    dateTime: '',
    totalSlots: '',
    levels: [],
    description: '',
    price: 0,
  });

  const handleNext = () => {
    if (!formData.name.trim()) {
      alert('Veuillez entrer un nom pour continuer.');
      return;
    }

    router.push({
      pathname: '/(screens)/CreateStep/Step2',
      params: { formData: JSON.stringify(formData) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.topSection}>
          <Text style={styles.title}>Quel est le nom de l'événement ?</Text>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="Nom de l'événement"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topSection: {
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1F1F1F',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'flex-end', // Aligns the button to the right
  },
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0C3B2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default Step1;