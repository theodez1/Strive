import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
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

const CreateStep4 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData: routeFormData } = route.params as { formData: FormData };
  
  const [description, setDescription] = useState(routeFormData?.description || '');
  const [price, setPrice] = useState('');

  const handleNext = () => {
    if (!description.trim()) {
      alert('Veuillez saisir une description pour votre événement.');
      return;
    }
    
    // Le prix est complètement optionnel
    let priceValue = 0;
    if (price.trim() !== '') {
      const parsed = parseFloat(price);
      if (!isNaN(parsed) && parsed >= 0) {
        priceValue = parsed;
      } else {
        alert('Veuillez saisir un prix valide (nombre positif) ou laissez vide pour un événement gratuit.');
        return;
      }
    }

    const updatedFormData = {
      ...routeFormData,
      description,
      price: priceValue,
    };

    (navigation as any).navigate('CreateStep5', { formData: updatedFormData });
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
            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Décrivez votre événement..."
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prix</Text>
              <View style={styles.priceContainer}>
                <Ionicons name="cash-outline" size={24} color="#555" style={styles.priceIcon} />
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                  <Text style={styles.euroSymbol}>€</Text>
                </View>
              </View>
              <Text style={styles.hintText}>Laissez vide pour un événement gratuit</Text>
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
  inputContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    minHeight: 100,
  },
  input: {
    flex: 1,
    color: PRIMARY_COLOR,
    fontSize: 16,
    marginLeft: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 4,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    color: PRIMARY_COLOR,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  euroSymbol: {
    color: PRIMARY_COLOR,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  priceIcon: {
    marginRight: 12,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
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

export default CreateStep4;