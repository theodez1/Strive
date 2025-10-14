import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_COLOR = '#0C3B2E';
const LOCATION_HISTORY_KEY = '@location_history';
const MAX_HISTORY_ITEMS = 5;

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
    isPlace: boolean;
  };
  dateTime: string;
  totalSlots: string;
  levels: string[];
  description: string;
  price: number;
  duration?: number;
  organizerSlots?: number;
};

interface LocationResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface LocationData {
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isPlace: boolean;
}

const CreateStep6 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData: routeFormData } = route.params as { formData: FormData };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    (routeFormData?.location?.address && routeFormData?.location?.city) ? routeFormData.location : null
  );
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Charger l'historique au montage
  useEffect(() => {
    loadLocationHistory();
  }, []);

  const loadLocationHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
      if (history) {
        const parsedHistory = JSON.parse(history);
        console.log('📍 Historique chargé:', parsedHistory.length, 'lieux');
        setLocationHistory(parsedHistory);
      } else {
        console.log('📍 Aucun historique trouvé');
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'historique:', error);
    }
  };

  const saveToHistory = async (location: LocationData) => {
    try {
      const newHistory = [
        location,
        ...locationHistory.filter(item => 
          item.address !== location.address || item.name !== location.name
        )
      ].slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(newHistory));
      setLocationHistory(newHistory);
      console.log('💾 Lieu sauvegardé dans l\'historique:', location.address);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(LOCATION_HISTORY_KEY);
      setLocationHistory([]);
    } catch (error) {
      console.warn('Erreur lors de la suppression:', error);
    }
  };

  const searchPlaces = async (query: string) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('Google Maps API Key non configurée');
      return [];
    }

    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(query)}&` +
      `key=${apiKey}&` +
      `language=fr&` +
      `components=country:fr`;

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Erreur API: ${data.status}`);
    }

    return (data.predictions || []).map((prediction: any) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      main_text: prediction.structured_formatting?.main_text || prediction.description,
      secondary_text: prediction.structured_formatting?.secondary_text || '',
      types: prediction.types || [],
    }));
  };

  const getPlaceDetails = async (placeId: string) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `key=${apiKey}&` +
      `language=fr&` +
      `fields=place_id,formatted_address,geometry,address_components,name`;

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Erreur API: ${data.status}`);
    }

    return data.result;
  };

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setSearchResults(results.slice(0, 5));
      } catch (error) {
        console.warn('Erreur de recherche:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelectPlace = async (place: LocationResult) => {
    try {
      setIsSearching(true);
      const details = await getPlaceDetails(place.place_id);
      
      const addressComponents = details.address_components || [];
      const isPlace = place.types.some(type => 
        ['establishment', 'point_of_interest', 'restaurant', 'store', 'tourist_attraction'].includes(type)
      );
      
      const locationData: LocationData = {
        name: isPlace ? (details.name || place.main_text) : '',
        address: details.formatted_address || place.description,
        city: addressComponents.find((c: any) => c.types.includes('locality'))?.long_name || 
              addressComponents.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name || '',
        country: addressComponents.find((c: any) => c.types.includes('country'))?.long_name || '',
        latitude: details.geometry.location.lat || 0,
        longitude: details.geometry.location.lng || 0,
        isPlace: isPlace,
      };

      setSelectedLocation(locationData);
      saveToHistory(locationData);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.warn('Erreur:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFromHistory = (location: LocationData) => {
    setSelectedLocation(location);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleNext = () => {
    if (!selectedLocation || !selectedLocation.address || !selectedLocation.city) {
      alert('Veuillez sélectionner un lieu');
      return;
    }

    const updatedFormData = {
      ...routeFormData,
      location: selectedLocation,
    };

    (navigation as any).navigate('CreateStep7', { formData: updatedFormData });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const hasApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY && 
                    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';

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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Titre */}
          <Text style={styles.title}>Où aura lieu votre événement ?</Text>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={hasApiKey ? "Rechercher un lieu, une adresse..." : "Saisir une adresse manuellement"}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Loading */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>Recherche...</Text>
            </View>
          )}

          {/* Résultats de recherche */}
          {searchResults.length > 0 && !isSearching && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>Résultats</Text>
              {searchResults.map((result) => {
                const isPlace = result.types.some(type => 
                  ['establishment', 'point_of_interest', 'restaurant', 'store'].includes(type)
                );
                return (
                  <TouchableOpacity
                    key={result.place_id}
                    style={styles.resultCard}
                    onPress={() => handleSelectPlace(result)}
                  >
                    <View style={[styles.resultIcon, isPlace && styles.resultIconPlace]}>
                      <Ionicons 
                        name={isPlace ? "business" : "location"} 
                        size={20} 
                        color={isPlace ? PRIMARY_COLOR : "#666"} 
                      />
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={[styles.resultMainText, isPlace && styles.resultMainTextPlace]}>
                        {result.main_text}
                      </Text>
                      {result.secondary_text && (
                        <Text style={styles.resultSecondaryText}>{result.secondary_text}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Lieu sélectionné */}
          {selectedLocation && selectedLocation.address && (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.selectedTitle}>Lieu sélectionné</Text>
                <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                  <Text style={styles.changeText}>Modifier</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.selectedCard}>
                <View style={styles.selectedIconContainer}>
                  <Ionicons 
                    name={selectedLocation.isPlace ? "business" : "location"} 
                    size={24} 
                    color={PRIMARY_COLOR} 
                  />
                </View>
                <View style={styles.selectedInfo}>
                  {selectedLocation.name && (
                    <Text style={styles.selectedName}>{selectedLocation.name}</Text>
                  )}
                  <Text style={styles.selectedAddress}>{selectedLocation.address}</Text>
                  {(selectedLocation.city || selectedLocation.country) && (
                    <Text style={styles.selectedCity}>
                      {[selectedLocation.city, selectedLocation.country].filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Historique */}
          {!selectedLocation && searchQuery.length === 0 && locationHistory.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historySectionHeader}>
                <Text style={styles.sectionTitle}>Recherches récentes</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Tout effacer</Text>
                </TouchableOpacity>
              </View>
              
              {locationHistory.map((item, index) => (
                <TouchableOpacity
                  key={`history-${index}`}
                  style={styles.historyCard}
                  onPress={() => handleSelectFromHistory(item)}
                >
                  <View style={styles.historyIcon}>
                    <Ionicons 
                      name={item.isPlace ? "business-outline" : "location-outline"} 
                      size={18} 
                      color="#999" 
                    />
                  </View>
                  <View style={styles.historyContent}>
                    {item.name && <Text style={styles.historyName}>{item.name}</Text>}
                    <Text style={styles.historyAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ddd" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Message si pas d'API key */}
          {!hasApiKey && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={24} color="#ff9800" />
              <Text style={styles.warningText}>
                L'API Google Maps n'est pas configurée. Vous pouvez saisir une adresse manuellement.
              </Text>
            </View>
          )}
        </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            {selectedLocation && selectedLocation.address && (
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultIconPlace: {
    backgroundColor: '#e8f5e9',
  },
  resultContent: {
    flex: 1,
  },
  resultMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  resultMainTextPlace: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  resultSecondaryText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  selectedSection: {
    marginBottom: 24,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
    flex: 1,
  },
  changeText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  selectedCard: {
    flexDirection: 'row',
    backgroundColor: '#f1f8f4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 6,
  },
  selectedAddress: {
    fontSize: 15,
    color: '#333',
    lineHeight: 21,
    marginBottom: 4,
  },
  selectedCity: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  historySection: {
    marginTop: 8,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  historyAddress: {
    fontSize: 13,
    color: '#666',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ffcc80',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#e65100',
    marginLeft: 12,
    lineHeight: 18,
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

export default CreateStep6;
