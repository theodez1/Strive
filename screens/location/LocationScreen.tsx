import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Theme } from '../../constants/Theme';
import { useLocation } from '../../context/LocationContext';
import { SavedLocation, locationService } from '../../services/location';

const LocationScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isLargePhone = width >= 410 && width < 768;
  const isTablet = width >= 768;

  const dynamicSizes = {
    radiusValueFont: isTablet ? 28 : isLargePhone ? 24 : isSmallPhone ? 18 : 22,
    radiusButtonSize: isTablet ? 48 : isLargePhone ? 44 : isSmallPhone ? 36 : 40,
    radiusIconSize: isTablet ? 24 : isLargePhone ? 22 : isSmallPhone ? 18 : 20,
    trackHeight: isTablet ? 8 : isSmallPhone ? 5 : 6,
    trackRadius: isTablet ? 4 : 3,
    presetsGap: isTablet ? 12 : isLargePhone ? 10 : 8,
    presetPaddingV: isTablet ? 12 : isSmallPhone ? 8 : 10,
    presetPaddingH: isTablet ? 16 : isSmallPhone ? 10 : 12,
    presetFont: isTablet ? 16 : isSmallPhone ? 12 : 14,
    presetMinWidth: isTablet ? 88 : isSmallPhone ? 56 : 64,
    presetBasis: isTablet ? '22%' as const : isSmallPhone ? '30%' as const : '28%' as const,
  };
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState<SavedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigation = useNavigation();
  const { 
    currentLocation, 
    savedLocations, 
    searchAddresses, 
    setCurrentLocation, 
    saveLocation,
    removeLocation,
    getLocationDisplayName,
    setFixedCity,
    enableCurrentLocationMode,
    isCurrentLocationMode,
    searchRadius,
    setSearchRadius
  } = useLocation();

  const fetchSuggestions = async (query: string): Promise<SavedLocation[]> => {
    if (!query.trim() || query.length < 2) return [];

    try {
      setIsSearching(true);
      const results = await searchAddresses(query);
      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };


  const debouncedFetchSuggestions = useCallback(
    (query: string) => {
      // Annuler le timeout précédent s'il existe
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Créer un nouveau timeout
      const timeout = setTimeout(async () => {
        const results = await fetchSuggestions(query);
        
        // Filtrage des doublons
        const uniqueResults = results.filter((value, index, self) =>
          index === self.findIndex((t) => t.name === value.name)
        );
    
        setSuggestions(uniqueResults);
      }, 300); // 300ms de délai

      setSearchTimeout(timeout);
    },
    [searchTimeout]
  );

  const handleSelectSuggestion = async (suggestion: SavedLocation) => {
    const locationData = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.address,
      city: suggestion.city,
      region: suggestion.region,
      country: 'France',
    };

    // Définir comme ville fixe
    await setFixedCity(locationData);
    setLocation(suggestion.name);
    setSuggestions([]);
    
    // Sauvegarder comme localisation récente
    await saveLocation({
      name: suggestion.name,
      address: suggestion.address,
      city: suggestion.city,
      region: suggestion.region,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    
    navigation.goBack();
  };

  const handleUseCurrentLocation = async () => {
    await enableCurrentLocationMode();
    navigation.goBack();
  };

  const handleClearInput = () => {
    setLocation('');
    setSuggestions([]);
  };

  // Le rayon est maintenant chargé automatiquement par le LocationContext

  // Nettoyer le timeout au démontage du composant
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Localisation</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content Container with Keyboard Avoidance */}
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Location Options */}
          <View style={styles.optionsContainer}>
          {/* Current Location Option */}
          <TouchableOpacity 
            style={[
              styles.optionCard,
              isCurrentLocationMode() && styles.optionCardActive
            ]}
            onPress={handleUseCurrentLocation}
          >
            <View style={styles.optionContent}>
              <Ionicons 
                name="navigate" 
                size={24} 
                color={isCurrentLocationMode() ? Colors.background : Colors.primary} 
                style={styles.optionIcon}
              />
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  isCurrentLocationMode() && styles.optionTitleActive
                ]}>
                  Localisation actuelle
                </Text>
                <Text style={[
                  styles.optionSubtitle,
                  isCurrentLocationMode() && styles.optionSubtitleActive
                ]}>
                  {isCurrentLocationMode() ? (
                    <>
                      <Ionicons name="navigate" size={12} color={isCurrentLocationMode() ? 'rgba(255, 255, 255, 0.8)' : Colors.textSecondary} />
                      {' '}{getLocationDisplayName()}
                    </>
                  ) : 'Utilise votre position GPS'}
                </Text>
              </View>
              {isCurrentLocationMode() && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.background} />
              )}
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Manual Location Option */}
          <View style={[
            styles.manualLocationContainer,
            !isCurrentLocationMode() && styles.manualLocationContainerActive
          ]}>
            <View style={styles.manualLocationHeader}>
              <View style={[
                styles.manualLocationIconContainer,
                !isCurrentLocationMode() && styles.manualLocationIconContainerActive
              ]}>
                <Ionicons name="location" size={20} color={!isCurrentLocationMode() ? Colors.primary : Colors.background} />
              </View>
              <View style={styles.manualLocationTitleContainer}>
                <Text style={[
                  styles.manualLocationTitle,
                  !isCurrentLocationMode() && styles.manualLocationTitleActive
                ]}>
                  Choisir une ville
                </Text>
                {!isCurrentLocationMode() && (
                  <Text style={styles.selectedCityName}>{getLocationDisplayName()}</Text>
                )}
              </View>
            </View>
            
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchInputIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une ville..."
                placeholderTextColor={Colors.textSecondary}
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  if (text.trim() === '') {
                    setSuggestions([]);
                  } else {
                    debouncedFetchSuggestions(text);
                  }
                }}
              />
              {location.length > 0 && (
                <TouchableOpacity onPress={handleClearInput} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Loading Indicator */}
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Recherche en cours...</Text>
              </View>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && !isSearching && (
              <View style={styles.suggestionsContainer}>
                <Text style={[
                  styles.suggestionsTitle,
                  !isCurrentLocationMode() && styles.suggestionsTitleActive
                ]}>Villes trouvées :</Text>
                {suggestions.map((item) => {
                  return (
                    <TouchableOpacity 
                      key={item.id}
                      style={[
                        styles.suggestionItem,
                        !isCurrentLocationMode() && styles.suggestionItemActive
                      ]} 
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <View style={[
                        styles.suggestionIconContainer,
                        !isCurrentLocationMode() && styles.suggestionIconContainerActive
                      ]}>
                        <Ionicons 
                          name="location-outline" 
                          size={18} 
                          color={!isCurrentLocationMode() ? Colors.background : Colors.primary} 
                        />
                      </View>
                      <View style={styles.suggestionContent}>
                        <Text style={[
                          styles.suggestionCity,
                          !isCurrentLocationMode() && styles.suggestionCityActive
                        ]}>{item.name}</Text>
                        <Text style={[
                          styles.suggestionDepartment,
                          !isCurrentLocationMode() && styles.suggestionDepartmentActive
                        ]}>
                          {item.codesPostaux && item.codesPostaux.length > 0 ? 
                            item.codesPostaux[0] :
                            (item.region && !item.region.match(/^\d+$/) ? item.region : 'France')
                          }
                        </Text>
                      </View>
                      <Ionicons 
                        name="chevron-forward" 
                        size={16} 
                        color={!isCurrentLocationMode() ? 'rgba(255, 255, 255, 0.7)' : Colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Radius Selection */}
          <View style={styles.radiusContainer}>
            <Text style={styles.radiusTitle}>Rayon de recherche</Text>
            <Text style={styles.radiusSubtitle}>Définissez le rayon autour de votre localisation (en km)</Text>
            
            <View style={styles.radiusSliderContainer}>
              <Text style={[styles.radiusValue, { fontSize: dynamicSizes.radiusValueFont }]}>{searchRadius} km</Text>
              <View style={styles.radiusSlider}>
                <TouchableOpacity 
                  style={[styles.radiusButton, { width: dynamicSizes.radiusButtonSize, height: dynamicSizes.radiusButtonSize, borderRadius: dynamicSizes.radiusButtonSize / 2 }]}
                  onPress={() => setSearchRadius(Math.max(1, searchRadius - 1))}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Ionicons name="remove" size={dynamicSizes.radiusIconSize} color={Colors.primary} />
                </TouchableOpacity>
                
                <View style={[styles.radiusTrack, { height: dynamicSizes.trackHeight, borderRadius: dynamicSizes.trackRadius }]}>
                  <View style={[styles.radiusProgress, { width: `${(searchRadius / 50) * 100}%`, borderRadius: dynamicSizes.trackRadius }]} />
                </View>
                
                <TouchableOpacity 
                  style={[styles.radiusButton, { width: dynamicSizes.radiusButtonSize, height: dynamicSizes.radiusButtonSize, borderRadius: dynamicSizes.radiusButtonSize / 2 }]}
                  onPress={() => setSearchRadius(Math.min(50, searchRadius + 1))}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Ionicons name="add" size={dynamicSizes.radiusIconSize} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              
              <View style={[styles.radiusPresets, { gap: dynamicSizes.presetsGap, rowGap: dynamicSizes.presetsGap, flexWrap: 'wrap' }]}>
                {[5, 10, 20, 30, 50].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.radiusPreset,
                      {
                        paddingVertical: dynamicSizes.presetPaddingV,
                        paddingHorizontal: dynamicSizes.presetPaddingH,
                        minWidth: dynamicSizes.presetMinWidth,
                        flexGrow: 1,
                        flexBasis: dynamicSizes.presetBasis,
                      },
                      searchRadius === preset && styles.radiusPresetActive
                    ]}
                    onPress={() => setSearchRadius(preset)}
                  >
                    <Text style={[
                      styles.radiusPresetText,
                      { fontSize: dynamicSizes.presetFont },
                      searchRadius === preset && styles.radiusPresetTextActive
                    ]}>
                      {preset}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.extendedColors.gray300,
  },
  backButton: {
    padding: Theme.spacing.sm,
    width: 40,
  },
  headerTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  
  // Keyboard Container
  keyboardContainer: {
    flex: 1,
  },
  
  // Scroll Container
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  
  // Options Container
  optionsContainer: {
    flex: 1,
  },
  
  // Current Location Option
  optionCard: {
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  optionCardActive: {
    backgroundColor: Colors.primary,
    ...Theme.shadows.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  optionIcon: {
    marginRight: Theme.spacing.sm,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  optionTitleActive: {
    color: Colors.background,
  },
  optionSubtitle: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  optionSubtitleActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.extendedColors.gray300,
  },
  dividerText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
    marginHorizontal: Theme.spacing.sm,
    fontWeight: '500',
  },
  
  // Manual Location Container
  manualLocationContainer: {
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray300,
    padding: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  manualLocationContainerActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Theme.shadows.md,
  },
  manualLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  manualLocationTitleContainer: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
  },
  manualLocationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  manualLocationIconContainerActive: {
    backgroundColor: Colors.background,
  },
  manualLocationTitle: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: 'bold',
    color: Colors.text,
  },
  manualLocationTitleActive: {
    color: Colors.background,
  },
  selectedCityName: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.background,
    marginTop: Theme.spacing.xs,
    fontWeight: '500',
    opacity: 0.9,
  },
  
  // Search Input
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray300,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  searchInputIcon: {
    marginRight: Theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.text,
    paddingVertical: Theme.spacing.xs,
  },
  clearButton: {
    marginLeft: Theme.spacing.xs,
    padding: Theme.spacing.xs,
  },
  
  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  loadingText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Theme.spacing.xs,
  },
  
  // Suggestions
  suggestionsContainer: {
    marginTop: Theme.spacing.xs,
  },
  suggestionsTitle: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Theme.extendedColors.gray200,
  },
  suggestionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.xs,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionCity: {
    fontSize: Theme.typography.fontSize.base,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionDepartment: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  // Styles pour fond vert (ville sélectionnée)
  suggestionsTitleActive: {
    color: Colors.background,
  },
  suggestionItemActive: {
    // Pas de surlignage blanc
  },
  suggestionIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionCityActive: {
    color: Colors.background,
  },
  suggestionDepartmentActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Radius Selection Styles
  radiusContainer: {
    marginTop: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
  },
  radiusTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
  },
  radiusSubtitle: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  radiusSliderContainer: {
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray200,
  },
  radiusValue: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  radiusSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  radiusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.extendedColors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Theme.extendedColors.gray200,
    borderRadius: 3,
    marginHorizontal: Theme.spacing.md,
    position: 'relative',
  },
  radiusProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  radiusPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusPreset: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.extendedColors.gray100,
    minWidth: 50,
    alignItems: 'center',
  },
  radiusPresetActive: {
    backgroundColor: Colors.primary,
  },
  radiusPresetText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  radiusPresetTextActive: {
    color: Colors.background,
  },
});

export default LocationScreen;
