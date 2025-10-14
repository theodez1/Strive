import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { eventsBackendService } from '../../services/events-backend';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

const PRIMARY_COLOR = '#0C3B2E';

// IDs AdMob Interstitiel
const INTERSTITIAL_AD_UNIT_IDS = {
  ios: 'ca-app-pub-7140135240053533/1971419845',
  android: 'ca-app-pub-7140135240053533/3118331626',
};

const adUnitId = Platform.OS === 'ios' 
  ? INTERSTITIAL_AD_UNIT_IDS.ios 
  : INTERSTITIAL_AD_UNIT_IDS.android;

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

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

const CreateStep7 = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData } = route.params as { formData: FormData };
  const { userProfile } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  // Charger l'interstitiel au montage du composant
  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
      console.log('📱 Interstitiel chargé et prêt');
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('❌ Erreur chargement interstitiel:', error);
      setInterstitialLoaded(false);
    });

    // Charger l'interstitiel
    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeError();
    };
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCreateEvent = async () => {
    if (!userProfile) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer un événement.');
      return;
    }

    setIsCreating(true);

    try {
      // Préparer les données pour l'API
      const eventData = {
        name: formData.name,
        sport: formData.sport,
        location_name: (formData.location.isPlace && formData.location.name?.trim())
          ? formData.location.name.trim()
          : `${formData.location.address}, ${formData.location.city}`,
        location_address: formData.location.address,
        location_city: formData.location.city,
        location_country: formData.location.country,
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        date_time: formData.dateTime,
        duration: formData.duration || 60,
        total_slots: parseInt(formData.totalSlots),
        organizer_slots: formData.organizerSlots || 1,
        available_slots: parseInt(formData.totalSlots) - (formData.organizerSlots || 1),
        levels: formData.levels,
        description: formData.description,
        price: formData.price,
        organizer_id: userProfile.id,
      };

      // Appel API pour créer l'événement
      console.log("Données de l'événement à créer:", eventData);
      
      const createdEvent = await eventsBackendService.createEvent(eventData);
      console.log('Événement créé dans la DB:', createdEvent);

      // Afficher l'interstitiel puis naviguer
      const showInterstitialAndNavigate = async () => {
        try {
          if (interstitialLoaded) {
            console.log('📱 Affichage de l\'interstitiel...');
            await interstitial.show();
            
            // Attendre que l'interstitiel soit fermé
            interstitial.addAdEventListener(AdEventType.CLOSED, () => {
              console.log('📱 Interstitiel fermé');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' as never, params: { screen: 'Discover' } }],
              });
            });
          } else {
            // Si la pub n'est pas chargée, naviguer directement
            console.log('⚠️ Interstitiel pas chargé, navigation directe');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' as never, params: { screen: 'Discover' } }],
            });
          }
        } catch (error) {
          console.error('Erreur interstitiel:', error);
          // En cas d'erreur, naviguer quand même
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as never, params: { screen: 'Discover' } }],
          });
        }
      };

      Alert.alert(
        'Succès',
        'Votre événement a été créé avec succès !',
        [
          {
            text: 'OK',
            onPress: showInterstitialAndNavigate,
          },
        ]
      );

    } catch (error) {
      console.error("Erreur lors de la création de l'événement:", error);
      Alert.alert('Erreur', "Une erreur est survenue lors de la création de l'événement.");
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const dateStr = date.toLocaleDateString('fr-FR', options);
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return { date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1), time: timeStr };
  };

  const { date: eventDate, time: eventTime } = formatDate(formData.dateTime);

  const getSportIcon = (sport: string): string => {
    const sportIcons: { [key: string]: string } = {
      'Football': 'football-outline',
      'Basketball': 'basketball-outline',
      'Tennis': 'tennisball-outline',
      'Volleyball': 'football-outline',
      'Badminton': 'tennisball-outline',
      'Running': 'walk-outline',
      'Cycling': 'bicycle-outline',
      'Swimming': 'water-outline',
      'Padel': 'ellipse-outline',
      'Fitness': 'barbell-outline',
      'default': 'fitness-outline'
    };
    return sportIcons[sport] || sportIcons.default;
  };

  const openLocationInMaps = () => {
    const { latitude, longitude, address } = formData.location;
    if (!latitude || !longitude) return;
    const label = encodeURIComponent(address || 'Lieu');
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url).catch(() => {
      const web = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
      Linking.openURL(web).catch(() => {});
    });
  };

  // Overlay de chargement plein écran
  if (isCreating) {
    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingTitle}>Création en cours...</Text>
          <Text style={styles.loadingSubtitle}>
            Nous préparons votre événement
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header fixe */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Récapitulatif</Text>
          <Text style={styles.subtitle}>Vérifiez les détails de votre événement avant de le publier</Text>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
              {/* Carte principale - En-tête événement */}
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.sportBadge}>
                    <Ionicons name={getSportIcon(formData.sport) as any} size={20} color="#fff" />
                    <Text style={styles.sportText}>{formData.sport}</Text>
                  </View>
                  {formData.price === 0 ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeText}>Gratuit</Text>
                    </View>
                  ) : (
                    <View style={styles.priceBadge}>
                      <Ionicons name="cash" size={16} color="#fff" />
                      <Text style={styles.priceText}>{formData.price}€ / pers</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.eventName}>{formData.name}</Text>
              </View>

              {/* Date & Heure */}
              <View style={styles.infoCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name="calendar" size={24} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date et heure</Text>
                  <Text style={styles.infoValue}>{eventDate}</Text>
                  <Text style={styles.infoValueSecondary}>à {eventTime}</Text>
                </View>
              </View>

              {/* Lieu (cliquable) */}
              <TouchableOpacity style={styles.infoCard} onPress={openLocationInMaps} activeOpacity={0.8}>
                <View style={styles.iconContainer}>
                  <Ionicons name="location" size={24} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Lieu</Text>
                  {formData.location.name && formData.location.name.trim() !== '' && (
                    <Text style={styles.infoValue}>{formData.location.name}</Text>
                  )}
                  <Text style={styles.infoValueSecondary}>
                    {formData.location.address}, {formData.location.city}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#999" />
              </TouchableOpacity>

              {/* Participants */}
              <View style={styles.infoCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name="people" size={24} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Participants</Text>
                  <Text style={styles.infoValue}>
                    {parseInt(formData.totalSlots)} places
                  </Text>
                  <Text style={styles.infoValueSecondary}>
                    dont {formData.organizerSlots || 1} pour l'organisateur
                  </Text>
                </View>
              </View>

              {/* Niveaux */}
              <View style={styles.infoCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name="trophy" size={24} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Niveaux acceptés</Text>
                  <View style={styles.levelsContainer}>
                    {formData.levels.map((level, index) => (
                      <View key={index} style={styles.levelChip}>
                        <Text style={styles.levelText}>{level}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Description */}
              {formData.description && formData.description.trim() !== '' && (
                <View style={styles.descriptionCard}>
                  <View style={styles.descriptionHeader}>
                    <Ionicons name="document-text" size={20} color={PRIMARY_COLOR} />
                    <Text style={styles.descriptionLabel}>Description</Text>
                  </View>
                  <Text style={styles.descriptionText}>{formData.description}</Text>
                </View>
              )}

        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.createButtonDisabled]}
            onPress={handleCreateEvent}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Créer l'événement</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  heroCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sportText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  freeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  freeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValueSecondary: {
    fontSize: 14,
    color: '#666',
  },
  levelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  levelChip: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  createButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 280,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default CreateStep7;
