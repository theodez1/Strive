import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY_COLOR = '#0C3B2E';

interface LocationResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface LocationDetail {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface LocationData {
  name: string;        // Nom du lieu (ex: "McDonald's", "Stade de France")
  address: string;     // Adresse complète
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isPlace: boolean;    // true si c'est un lieu/établissement, false si c'est une adresse
}

interface CustomLocationAutocompleteProps {
  onLocationSelect: (location: LocationData) => void;
  placeholder?: string;
  debounceMs?: number;
  minLength?: number;
  maxResults?: number;
  restrictToCountry?: string; // Optionnel : filtrer par pays (ex: 'fr')
  selectedLocation?: LocationData | null; // Localisation actuellement sélectionnée
}

const LOCATION_HISTORY_KEY = '@location_history';
const MAX_HISTORY_ITEMS = 5;

const CustomLocationAutocomplete: React.FC<CustomLocationAutocompleteProps> = ({
  onLocationSelect,
  placeholder = "Rechercher une adresse ou un lieu...",
  debounceMs = 300,
  minLength = 2,
  maxResults = 5,
  restrictToCountry,
  selectedLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction pour nettoyer le debounce
  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Fonction pour annuler les requêtes en cours
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Fonction pour rechercher des lieux via l'API Google Places
  const searchPlaces = useCallback(async (query: string): Promise<LocationResult[]> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    console.log('🔑 API Key status:', apiKey ? 'Configured' : 'NOT SET');
    console.log('🔑 API Key value:', apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
    console.log('🔍 Searching for:', query);
    
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.warn('❌ Google Maps API Key not configured or empty');
      throw new Error('Clé API Google Maps non configurée. Consultez GOOGLE_PLACES_SETUP.md');
    }

    // URL avec types larges pour trouver le maximum de lieux
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(query)}&` +
      `key=${apiKey}&` +
      `language=fr`;
    
    // Ajouter la restriction par pays si demandée
    if (restrictToCountry) {
      url += `&components=country:${restrictToCountry}`;
    }
    
    // Pas de restriction de types pour avoir le maximum de résultats

    console.log('🌐 API URL:', url.replace(apiKey, 'HIDDEN_KEY'));

    const response = await fetch(url);
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('📊 API Response:', {
      status: data.status,
      predictions_count: data.predictions?.length || 0,
      error_message: data.error_message
    });
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      const errorMsg = data.error_message || `Erreur API: ${data.status}`;
      console.error('❌ API Error:', errorMsg);
      throw new Error(errorMsg);
    }

    const results = (data.predictions || []).map((prediction: any) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      main_text: prediction.structured_formatting?.main_text || prediction.description,
      secondary_text: prediction.structured_formatting?.secondary_text || '',
      types: prediction.types || [],
    }));

    console.log('✅ Results found:', results.length);
    return results;
  }, []);

  // Fonction pour obtenir les détails d'un lieu
  const getPlaceDetails = useCallback(async (placeId: string): Promise<LocationDetail> => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      throw new Error('Clé API Google Maps non configurée');
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `key=${apiKey}&` +
      `language=fr&` +
      `fields=place_id,formatted_address,geometry,address_components`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Erreur API: ${data.status}`);
    }

    return data.result;
  }, []);

  // Fonction pour gérer la recherche avec debounce
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setError(null);
    
    // Nettoyer le debounce précédent
    clearDebounce();
    
    // Annuler les requêtes en cours
    cancelPendingRequests();

    if (term.length < minLength) {
      setResults([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();

    // Débouncer la recherche
    debounceRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchPlaces(term);
        setResults(searchResults.slice(0, maxResults));
        setShowResults(true);
      } catch (err) {
        console.warn('Erreur de recherche:', err);
        setError('Erreur de recherche. Veuillez réessayer.');
        setResults([]);
        setShowResults(false);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [searchPlaces, debounceMs, minLength, maxResults, clearDebounce, cancelPendingRequests]);

  // Fonction pour sélectionner un lieu
  const handleSelectPlace = useCallback(async (place: LocationResult) => {
    try {
      setIsLoading(true);
      const details = await getPlaceDetails(place.place_id);
      
      const addressComponents = details.address_components || [];
      
      // Déterminer si c'est un lieu/établissement ou une adresse
      const isPlace = place.types.some(type => 
        type === 'establishment' || 
        type === 'point_of_interest' || 
        type === 'restaurant' ||
        type === 'store' ||
        type === 'tourist_attraction'
      );
      
      // Extraire le nom du lieu
      const name = isPlace ? place.main_text : '';
      
      const locationData: LocationData = {
        name: name,
        address: details.formatted_address || place.description || '',
        city: addressComponents.find((component) =>
          component.types.includes('locality')
        )?.long_name || 
        addressComponents.find((component) =>
          component.types.includes('administrative_area_level_2')
        )?.long_name || '',
        country: addressComponents.find((component) =>
          component.types.includes('country')
        )?.long_name || '',
        latitude: details.geometry.location.lat || 0,
        longitude: details.geometry.location.lng || 0,
        isPlace: isPlace,
      };

      console.log('📍 Lieu sélectionné:', {
        name: name,
        address: locationData.address,
        isPlace: isPlace
      });

      onLocationSelect(locationData);
      saveToHistory(locationData); // Sauvegarder dans l'historique
      setShowResults(false);
      setShowHistory(false);
      setSearchTerm('');
      setResults([]);
    } catch (err) {
      console.warn('Erreur lors de la récupération des détails:', err);
      Alert.alert('Erreur', 'Impossible de récupérer les détails de ce lieu.');
    } finally {
      setIsLoading(false);
    }
  }, [getPlaceDetails, onLocationSelect, saveToHistory]);

  // Fonction pour vider la recherche
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    setShowHistory(false);
    setError(null);
    clearDebounce();
    cancelPendingRequests();
  }, [clearDebounce, cancelPendingRequests]);

  // Sélectionner un lieu depuis l'historique
  const handleSelectFromHistory = useCallback((location: LocationData) => {
    onLocationSelect(location);
    setShowHistory(false);
    setSearchTerm('');
  }, [onLocationSelect]);

  // Charger l'historique au montage
  useEffect(() => {
    loadLocationHistory();
  }, []);

  // Nettoyer les timeouts et requêtes à la destruction
  useEffect(() => {
    return () => {
      clearDebounce();
      cancelPendingRequests();
    };
  }, [clearDebounce, cancelPendingRequests]);

  // Charger l'historique depuis AsyncStorage
  const loadLocationHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
      if (history) {
        setLocationHistory(JSON.parse(history));
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'historique:', error);
    }
  };

  // Sauvegarder une localisation dans l'historique
  const saveToHistory = async (location: LocationData) => {
    try {
      // Éviter les doublons et garder seulement les 5 derniers
      const newHistory = [
        location,
        ...locationHistory.filter(item => 
          item.address !== location.address || item.name !== location.name
        )
      ].slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(newHistory));
      setLocationHistory(newHistory);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  };

  // Effacer l'historique
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(LOCATION_HISTORY_KEY);
      setLocationHistory([]);
    } catch (error) {
      console.warn('Erreur lors de la suppression de l\'historique:', error);
    }
  };

  // Déterminer l'icône selon le type de lieu
  const getIconForPlace = (types: string[]) => {
    const isPlace = types.some(type => 
      type === 'establishment' || 
      type === 'point_of_interest' || 
      type === 'store' ||
      type === 'restaurant' ||
      type === 'tourist_attraction'
    );
    return isPlace ? 'business-outline' : 'location-outline';
  };

  const hasApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY && 
                   process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY';

  return (
    <View style={styles.container}>
      {/* Affichage de la localisation sélectionnée */}
      {selectedLocation && selectedLocation.address && selectedLocation.address.trim() !== '' && (
        <View style={styles.selectedLocationContainer}>
          <View style={styles.selectedLocationHeader}>
            <Ionicons 
              name={selectedLocation.isPlace ? "business" : "location"} 
              size={20} 
              color={PRIMARY_COLOR} 
            />
            <Text style={styles.selectedLocationTitle}>
              {selectedLocation.isPlace ? 'Lieu sélectionné' : 'Adresse sélectionnée'}
            </Text>
            <TouchableOpacity 
              onPress={() => onLocationSelect({
                name: '',
                address: '',
                city: '',
                country: '',
                latitude: 0,
                longitude: 0,
                isPlace: false,
              })}
              style={styles.clearSelectedButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectedLocationContent}>
            {selectedLocation.name && selectedLocation.name.trim() !== '' && (
              <Text style={styles.selectedLocationName}>{selectedLocation.name}</Text>
            )}
            <Text style={styles.selectedLocationAddress}>{selectedLocation.address}</Text>
            {(selectedLocation.city || selectedLocation.country) && (
              <Text style={styles.selectedLocationDetails}>
                {[selectedLocation.city, selectedLocation.country].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Champ de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color="#666" />
          </View>
          
          <TextInput
            style={styles.textInput}
            placeholder={hasApiKey ? placeholder : "Saisissez une adresse manuellement..."}
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={handleSearch}
            onFocus={() => {
              if (locationHistory.length > 0 && searchTerm.length === 0) {
                setShowHistory(true);
              }
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          
          {searchTerm.length > 0 && (
            <TouchableOpacity 
              style={styles.clearIconContainer}
              onPress={clearSearch}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Indicateur de chargement */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Recherche en cours...</Text>
          </View>
        )}

        {/* Message d'avertissement si pas de clé API */}
        {!hasApiKey && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#ff9800" />
            <Text style={styles.warningText}>
              API Google Maps non configurée. Consultez GOOGLE_PLACES_SETUP.md
            </Text>
          </View>
        )}

        {/* Message d'erreur */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Historique */}
        {showHistory && locationHistory.length > 0 && !showResults && (
          <View style={styles.resultsContainer}>
            <View style={styles.historyHeader}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.historyTitle}>Lieux récents</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Effacer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyScrollView} nestedScrollEnabled>
              {locationHistory.map((item, index) => (
                <TouchableOpacity
                  key={`history-${index}`}
                  style={[
                    styles.resultItem,
                    index === locationHistory.length - 1 && styles.resultItemLast
                  ]}
                  onPress={() => handleSelectFromHistory(item)}
                >
                  <View style={styles.resultIconContainer}>
                    <Ionicons 
                      name={item.isPlace ? 'business-outline' : 'location-outline'} 
                      size={18} 
                      color="#666" 
                    />
                  </View>
                  <View style={styles.resultContent}>
                    {item.name && item.name.trim() !== '' && (
                      <Text style={styles.resultMainText}>{item.name}</Text>
                    )}
                    <Text style={styles.resultSecondaryText}>{item.address}</Text>
                    {(item.city || item.country) && (
                      <Text style={styles.resultCityText}>
                        {[item.city, item.country].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.resultArrow}>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Résultats */}
        {showResults && results.length > 0 && (
          <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
            {results.map((item, index) => {
              const isPlace = item.types.some(type => 
                type === 'establishment' || 
                type === 'point_of_interest' || 
                type === 'restaurant' ||
                type === 'store' ||
                type === 'tourist_attraction'
              );
              
              return (
                <TouchableOpacity
                  key={item.place_id}
                  style={[
                    styles.resultItem,
                    index === results.length - 1 && styles.resultItemLast
                  ]}
                  onPress={() => handleSelectPlace(item)}
                >
                  <View style={styles.resultIconContainer}>
                    <Ionicons 
                      name={getIconForPlace(item.types)} 
                      size={18} 
                      color={isPlace ? PRIMARY_COLOR : "#666"} 
                    />
                  </View>
                  <View style={styles.resultContent}>
                    <Text style={[
                      styles.resultMainText,
                      isPlace && styles.resultMainTextPlace
                    ]}>
                      {item.main_text}
                    </Text>
                    {item.secondary_text && (
                      <Text style={styles.resultSecondaryText}>
                        {item.secondary_text}
                      </Text>
                    )}
                    {isPlace && (
                      <Text style={styles.resultPlaceType}>Lieu</Text>
                    )}
                  </View>
                  <View style={styles.resultArrow}>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Bouton de validation pour saisie manuelle (sans API) */}
        {!hasApiKey && searchTerm.trim().length > 0 && (
          <TouchableOpacity 
            style={styles.manualSubmitButton}
            onPress={() => {
              const locationData: LocationData = {
                name: '',
                address: searchTerm.trim(),
                city: '',
                country: 'France',
                latitude: 0,
                longitude: 0,
                isPlace: false,
              };
              onLocationSelect(locationData);
              clearSearch();
            }}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.manualSubmitButtonText}>Utiliser cette adresse</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1000,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchIconContainer: {
    padding: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  clearIconContainer: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1001,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  resultItemLast: {
    borderBottomWidth: 0,
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultMainText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
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
  resultPlaceType: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  resultArrow: {
    padding: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ffcc02',
  },
  warningText: {
    fontSize: 14,
    color: '#e65100',
    marginLeft: 8,
    flex: 1,
  },
  manualSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  manualSubmitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedLocationContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 16,
    padding: 16,
  },
  selectedLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginLeft: 8,
    flex: 1,
  },
  clearSelectedButton: {
    padding: 4,
  },
  selectedLocationContent: {
    paddingLeft: 28,
  },
  selectedLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  selectedLocationDetails: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  clearHistoryText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  historyScrollView: {
    maxHeight: 200,
  },
  resultCityText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default CustomLocationAutocomplete;
