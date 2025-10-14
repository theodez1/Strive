import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Theme, ExtendedColors } from '../../constants/Theme';
import { useFilter } from '../../context/FilterContext';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../hooks/useAuth';
import { SimpleCalendar, EventCard } from '../../components';
import { apiService, ApiEvent, ApiEventFilters } from '../../services/api';
import { EventWithDistance } from '../../services/events-backend';
import { eventsBackendService } from '../../services/events-backend';
import AdBanner from '../../components/ads/AdBanner';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, userId } = useAuth();
  const { selectedFilters, showFilter } = useFilter();
  const { currentLocation, getLocationDisplayName, refreshCurrentLocation, searchRadius, calculateDistance } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const calendarRef = useRef<any>(null);
  const [location, setLocation] = useState(getLocationDisplayName());
  const [events, setEvents] = useState<EventWithDistance[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithDistance[]>([]);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDate, setIsLoadingDate] = useState(false); // Chargement spécifique pour les changements de date
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  const filterOptions = [
    { id: 'level', name: 'Débutant', type: 'level' },
    { id: 'time', name: 'Matin', type: 'time' },
    { id: 'distance', name: '< 5km', type: 'distance' },
  ];

  // Fonction pour charger les événements depuis l'API
  const loadEvents = useCallback(async (isDateChange = false, dateToUse?: Date) => {
    try {
      // Gestion intelligente du loading
      if (isDateChange) {
        setIsLoadingDate(true);
      } else if (!hasLoadedInitialData) {
        setIsLoading(true);
      }
      
      // Utiliser la date passée en paramètre ou la date sélectionnée
      const currentDate = dateToUse || selectedDate;
      
      // Construire les filtres pour l'API
      const apiFilters: ApiEventFilters = {
        limit: 50,
        offset: 0
      };

      // Filtre par localisation et rayon
      if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
        apiFilters.lat = currentLocation.latitude;
        apiFilters.lng = currentLocation.longitude;
        apiFilters.radius = searchRadius;
      }

      // Filtre par sports
      if (selectedFilters.sports && selectedFilters.sports.length > 0) {
        apiFilters.sports = selectedFilters.sports;
      }

      // Filtre par niveaux
      if (selectedFilters.levels && selectedFilters.levels.length > 0) {
        apiFilters.levels = selectedFilters.levels;
      }

      // Filtre par prix
      if (selectedFilters.price && selectedFilters.price.length > 0) {
        const priceRange = selectedFilters.price[0];
        switch (priceRange) {
          case 'Gratuit':
            apiFilters.priceMax = 0;
            break;
          case '< 10€':
            apiFilters.priceMax = 10;
            break;
          case '< 20€':
            apiFilters.priceMax = 20;
            break;
          case '< 50€':
            apiFilters.priceMax = 50;
            break;
        }
      }

      // Filtre par date (utiliser UTC pour éviter les décalages de fuseau horaire)
      if (currentDate) {
        // Utiliser UTC directement pour éviter tout décalage
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();
        
        // Créer startOfDay à 00:00:00 UTC
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        // Créer endOfDay à 23:59:59.999 UTC
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        
        apiFilters.dateFrom = startOfDay.toISOString();
        apiFilters.dateTo = endOfDay.toISOString();
        
      }

      // Appeler l'API pour les événements généraux via eventsBackendService
      const { data: apiEventsData, error: apiEventsError } = await eventsBackendService.getEvents({
        latitude: apiFilters.lat,
        longitude: apiFilters.lng,
        radius: apiFilters.radius,
        sports: apiFilters.sports,
        levels: apiFilters.levels,
        priceMin: apiFilters.priceMin,
        priceMax: apiFilters.priceMax,
        dateFrom: apiFilters.dateFrom,
        dateTo: apiFilters.dateTo,
        limit: apiFilters.limit,
        offset: apiFilters.offset
      });
      
      const apiEvents = apiEventsData?.events || [];
      
      // Récupérer aussi les événements où l'utilisateur participe déjà
      let joinedEvents: EventWithDistance[] = [];
      if (userId) {
        try {
          const { data: userJoinedEvents } = await eventsBackendService.getUserJoinedEvents(userId, {
            timeframe: 'upcoming',
            limit: 50,
            offset: 0
          });
          
          // Convertir les événements rejoints au format ApiEvent
          joinedEvents = userJoinedEvents.map(event => ({
            id: event.id,
            name: event.name,
            sport: event.sport,
            location_name: event.location_name,
            location_address: event.location_address,
            location_city: event.location_city,
            location_country: event.location_country,
            latitude: event.latitude,
            longitude: event.longitude,
            date_time: event.date_time,
            duration: event.duration || 0,
            total_slots: event.total_slots,
            available_slots: event.available_slots,
            organizer_id: event.organizer_id,
            organizer_slots: event.organizer_slots,
            organizer_first_name: event.organizer_first_name,
            organizer_last_name: event.organizer_last_name,
            organizer_username: event.organizer_username,
            description: event.description,
            price: event.price || 0,
            levels: event.levels,
            levels_fr: event.levels_fr,
            created_at: event.created_at,
            updated_at: event.updated_at,
            distance_km: event.distance_km
          }));
          
          // Créer un Set des IDs des événements rejoints pour vérification rapide
          setJoinedEventIds(new Set(userJoinedEvents.map(event => event.id)));
        } catch (error) {
          console.error('Erreur lors de la récupération des événements rejoints:', error);
        }
      }
      
      // Combiner les événements généraux et les événements rejoints
      // Éviter les doublons en utilisant un Set
      const allEvents = [...apiEvents];
      const existingEventIds = new Set(apiEvents.map(e => e.id));
      
      joinedEvents.forEach(joinedEvent => {
        if (!existingEventIds.has(joinedEvent.id)) {
          allEvents.push(joinedEvent);
        }
      });
      
      setEvents(allEvents);
      setHasLoadedInitialData(true);

    } catch (error) {
      console.error('❌ Erreur API:', error);
      // En cas d'erreur, ne pas vider la liste pour garder la fluidité
      // Les événements existants restent affichés
    } finally {
      setIsLoading(false);
      setIsLoadingDate(false);
    }
  }, [currentLocation, searchRadius, selectedFilters, selectedDate]);

  // Fonction pour calculer la distance d'un événement
  const getEventDistance = useCallback((event: ApiEvent): number => {
    // Si l'API a déjà calculé la distance, l'utiliser
    if (event.distance_km !== undefined) {
      return parseFloat(event.distance_km.toString());
    }

    // Sinon, calculer côté client
    if (!currentLocation || !event.latitude || !event.longitude) {
      return Infinity; // Si pas de localisation, considérer comme très loin
    }
    
    return calculateDistance(
      event.latitude,
      event.longitude
    );
  }, [currentLocation, calculateDistance]);

  // Fonction pour filtrer et trier les événements
  const filterAndSortEvents = useCallback(() => {
    let filtered = [...events];

    // Filtrage des événements de l'utilisateur connecté
    if (user?.id) {
      filtered = filtered.filter(event => event.organizer_id !== user.id);
    }

    // Filtrage par recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const beforeCount = filtered.length;
      filtered = filtered.filter(event => 
        event.name.toLowerCase().includes(query) ||
        event.sport.toLowerCase().includes(query) ||
        event.location_name.toLowerCase().includes(query) ||
        event.location_city.toLowerCase().includes(query)
      );
    }

    // Filtrage par sport
    if (selectedFilters.sports.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(event => 
        selectedFilters.sports.includes(event.sport)
      );
    }

    // Filtrage par niveau
    if (selectedFilters.levels.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(event => 
        event.levels.some((level: string) => 
          selectedFilters.levels.includes(level)
        )
      );
    }

    // Filtrage par créneaux horaires
    if (selectedFilters.timeSlots.length > 0) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date_time);
        const hour = eventDate.getHours();
        
        return selectedFilters.timeSlots.some((timeSlot: string) => {
          switch (timeSlot) {
            case 'Matin':
              return hour >= 6 && hour < 12;
            case 'Après-midi':
              return hour >= 12 && hour < 18;
            case 'Soir':
              return hour >= 18 && hour < 23;
            default:
              return true;
          }
        });
      });
    }

    // Filtrage par distance réelle
    if (currentLocation) {
      filtered = filtered.filter(event => {
        const distance = getEventDistance(event);
        return distance <= searchRadius;
      });
    }

    // Filtrage par distance (filtres utilisateur)
    if (selectedFilters.distance.length > 0) {
      filtered = filtered.filter(event => {
        const distance = getEventDistance(event);
        const maxDistance = selectedFilters.distance[0];
        switch (maxDistance) {
          case '< 5km':
            return distance <= 5;
          case '< 10km':
            return distance <= 10;
          case '< 20km':
            return distance <= 20;
          default:
            return true;
        }
      });
    }

    // Tri par ordre de priorité
    filtered.sort((a, b) => {
      // 1. Tri par distance (plus proche en premier)
      const distanceA = getEventDistance(a);
      const distanceB = getEventDistance(b);
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

        // 2. Tri par disponibilité (plus de places disponibles en premier)
        const availabilityA = a.available_slots / a.total_slots;
        const availabilityB = b.available_slots / b.total_slots;
      if (availabilityA !== availabilityB) {
        return availabilityB - availabilityA;
      }

      // 3. Tri par prix (moins cher en premier)
      if (a.price !== b.price) {
        return a.price - b.price;
      }

      // 4. Tri alphabétique par nom
      return a.name.localeCompare(b.name);
    });


    setFilteredEvents(filtered);
  }, [events, searchQuery, selectedFilters, currentLocation, searchRadius, getEventDistance, user?.id]);

  // Effect pour appliquer les filtres quand les données changent
  useEffect(() => {
    filterAndSortEvents();
  }, [filterAndSortEvents]);

  // Fonction pour rafraîchir
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents(false);
    setRefreshing(false);
  }, [loadEvents]);

  // Fonction pour obtenir les filtres actifs
  const getActiveFilters = () => {
    const filters = [];
    if (selectedFilters.sports.length > 0) {
      filters.push(...selectedFilters.sports);
    }
    if (selectedFilters.levels.length > 0) {
      filters.push(...selectedFilters.levels);
    }
    if (selectedFilters.timeSlots.length > 0) {
      filters.push(...selectedFilters.timeSlots);
    }
    if (selectedFilters.distance.length > 0) {
      filters.push(...selectedFilters.distance);
    }
    return filters;
  };

  // Fonction pour naviguer vers une date spécifique
  const navigateToDate = (date: Date) => {
    if (calendarRef.current) {
      calendarRef.current.scrollToDate(date);
    }
  };

  // Fonction pour rafraîchir la localisation
  const handleLocationRefresh = async () => {
    await refreshCurrentLocation();
  };

  // Debouncing pour la recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterAndSortEvents();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterAndSortEvents]);

  // Chargement initial au démarrage
  useEffect(() => {
    loadEvents(false);
  }, []); // Seulement au montage du composant

  // Debouncing pour éviter les appels multiples lors des changements (sauf date)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Éviter les appels inutiles si pas de localisation
      if (currentLocation && currentLocation.latitude && currentLocation.longitude && hasLoadedInitialData) {
        loadEvents(false);
      }
    }, 500); // 500ms de délai

    return () => clearTimeout(timeoutId);
  }, [currentLocation, searchRadius, selectedFilters]); // Retiré selectedDate

  // Mettre à jour l'affichage de la localisation
  useEffect(() => {
    setLocation(getLocationDisplayName());
  }, [currentLocation, getLocationDisplayName]);



  const renderEventItem = ({ item }: { item: ApiEvent }) => {
    // Convertir la structure API vers la structure attendue par EventCard
    const eventForCard = {
      id: item.id,
      name: item.name,
      sport: item.sport,
      date_time: item.date_time,
      location_name: item.location_name,
      location_address: item.location_address,
      total_slots: item.total_slots,
      available_slots: item.available_slots,
      organizer_username: item.organizer_username,
      organizer_first_name: item.organizer_first_name,
      organizer_last_name: item.organizer_last_name,
      price: item.price,
      levels: item.levels,
      levels_fr: item.levels_fr,
      distance_km: getEventDistance(item)
    };
    
    return (
      <EventCard 
        event={eventForCard} 
        navigation={navigation}
        isParticipant={joinedEventIds.has(item.id)}
      />
    );
  };


  return (
    <View style={styles.container}>
      {/* Top Bar fixe */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.locationBubble}
            onPress={() => navigation.getParent()?.navigate('Location' as never)}
            onLongPress={handleLocationRefresh}
          >
            <View style={styles.locationTextContainer}>
              <MaterialIcons name="location-on" size={20} color={Colors.primary} />
              <Text style={styles.locationText}>{location} ({searchRadius}km)</Text>
              <Ionicons name="chevron-down-outline" size={16} color={Colors.primary} style={styles.chevronIcon} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.notificationIconContainer}
            onPress={() => (navigation as any).navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={26} color={Colors.primary} />
            {notifications > 0 && (
              <View style={styles.notificationBadgeContainer}>
                <View style={styles.notificationBadge} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar with Filter Button */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
            <TextInput
              placeholder="Rechercher un événement..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.filterButtonContainer}>
            <TouchableOpacity style={styles.filterButton} onPress={showFilter}>
              <Ionicons name="options-outline" size={16} color={Colors.background} style={styles.filterIcon} />
              <Text style={styles.filterButtonText}>Filtres</Text>
            </TouchableOpacity>
            {getActiveFilters().length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilters().length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Calendar */}
        <SimpleCalendar
          ref={calendarRef}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setEvents([]);
            setFilteredEvents([]);
            loadEvents(true, date);
          }}
        />
      </View>

      {/* Events List */}
      {isLoading && filteredEvents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des événements...</Text>
        </View>
      ) : isLoadingDate ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des événements...</Text>
        </View>
      ) : (
        <View style={styles.eventsContainer}>
          <FlatList
            data={filteredEvents}
            renderItem={({ item, index }) => (
              <>
                {renderEventItem({ item, index })}
                {(index + 1) % 3 === 0 && index < filteredEvents.length - 1 && (
                  <AdBanner style={styles.adBanner} />
                )}
              </>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>
                  {searchQuery.trim() || getActiveFilters().length > 0 
                    ? 'Aucun événement trouvé' 
                    : 'Aucun événement disponible'
                  }
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {searchQuery.trim() || getActiveFilters().length > 0 
                    ? 'Essayez de modifier vos filtres ou votre recherche' 
                    : `Aucun événement prévu le ${selectedDate.toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}`
                  }
                </Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Fond blanc
  },
  
  // Header Container (Top Bar + Search + Calendar)
  headerContainer: {
    backgroundColor: Colors.background, // Fond blanc
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ExtendedColors.gray200, // Barre grise claire de séparation
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  locationBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: Theme.spacing.xs,
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.text,
    fontWeight: 'bold',
  },
  chevronIcon: {
    marginLeft: Theme.spacing.xs,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadgeContainer: {
    position: 'absolute',
    top: 1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
      searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: Theme.spacing.xs,
        paddingLeft: Theme.spacing.md,
        paddingVertical: Theme.spacing.xs / 2,
        borderRadius: 10,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.primary,
        height: 36,
        marginRight: Theme.spacing.sm,
      },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
      searchInput: {
        flex: 1,
        fontSize: Theme.typography.fontSize.sm,
        color: Colors.text,
        paddingVertical: Theme.spacing.xs,
      },
      filterButtonContainer: {
        position: 'relative',
      },
      filterButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.xs,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        height: 36,
        flexDirection: 'row',
      },
      filterIcon: {
        marginRight: Theme.spacing.xs,
      },
      filterButtonText: {
        color: Colors.background,
        fontSize: Theme.typography.fontSize.sm,
        fontWeight: '600',
      },

  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  filterBadgeText: {
    fontSize: 10,
    color: Colors.background,
    fontWeight: 'bold',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  filterCloseIcon: {
    marginLeft: Theme.spacing.xs,
  },



  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing['3xl'],
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: Theme.typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Theme.spacing.md,
  },

  // Events Container
  eventsContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Events List
  eventsList: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing['2xl'],
    paddingHorizontal: Theme.spacing.md,
  },
  adBanner: {
    marginVertical: 8,
  },

  // Empty State
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing['3xl'],
    paddingTop: Theme.spacing['2xl'],
    backgroundColor: Colors.background,
  },
  emptyStateTitle: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: Theme.typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    marginHorizontal: Theme.spacing.lg,
  },
});
