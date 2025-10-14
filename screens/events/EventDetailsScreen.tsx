import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Database } from '../../types/database';
import { eventsService } from '../../services/events';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';
import Theme from '../../constants/Theme';

type Event = Database['public']['Tables']['events']['Row'];

interface RouteParams {
  eventId: string;
  fromFeed?: boolean; // Indique si on vient du feed/découverte
  fromChat?: boolean; // Indique si on vient du chat
}

const PRIMARY_COLOR = '#0C3B2E';
const SECONDARY_COLOR = '#6D9773';

export default function EventDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId, fromFeed, fromChat } = route.params as RouteParams;
  const { userId } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isEventOwner, setIsEventOwner] = useState(false);
  const [userPendingRequestsCount, setUserPendingRequestsCount] = useState(0);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await eventsService.getEvent(eventId);
      
      if (error) {
        setError('Erreur lors du chargement de l\'événement');
        return;
      }
      
      if (!data) {
        setError('Événement non trouvé');
        return;
      }
      
      setEvent(data);
      
      // Vérifier le statut de l'utilisateur par rapport à l'événement
      if (userId) {
        // Vérifier si l'utilisateur est le propriétaire de l'événement
        setIsEventOwner((data as any).organizer_id === userId);
        
        // Vérifier si l'utilisateur participe déjà à l'événement
        const { data: participantStatus } = await eventsService.isUserParticipant(eventId, userId);
        console.log('Participant status:', participantStatus);
        setIsParticipant(participantStatus);
        
        // Vérifier si l'utilisateur a une demande en attente
        const { data: pendingStatus } = await eventsService.isUserPendingRequest(eventId, userId);
        console.log('Pending status:', pendingStatus);
        setHasPendingRequest(pendingStatus);
        
        // Charger le nombre total de demandes en attente de l'utilisateur
        const { data: userPendingRequests } = await eventsService.getUserPendingRequests(userId);
        setUserPendingRequestsCount(userPendingRequests.length);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'événement');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestParticipation = () => {
    if (event) {
      (navigation as any).navigate('RequestToJoin', { 
        eventId: event.id,
        eventName: event.name 
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement de l'événement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error || 'Événement non trouvé'}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Fonction pour formater la date en français
  const formatDateToFrench = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('fr-FR', { month: 'long' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} à ${hours}h${minutes}`;
  };

  // Fonction pour obtenir l'icône du sport
  const getSportIcon = (sport: string) => {
    const sportIcons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'Football': 'football',
      'Basketball': 'basketball',
      'Tennis': 'tennisball',
      'Volleyball': 'football',
      'Badminton': 'tennisball',
      'Running': 'walk',
      'Cycling': 'bicycle',
      'Swimming': 'water',
      'Gym': 'fitness',
      'Yoga': 'flower',
      'Boxing': 'fitness',
      'default': 'fitness'
    };
    return sportIcons[sport] || sportIcons.default;
  };

  // Fonction pour envoyer un message à l'organisateur
  const handleSendMessage = () => {
    // TODO: Implémenter l'envoi de message
    Alert.alert(
      'Contact',
      'Fonctionnalité de messagerie à implémenter',
      [{ text: 'OK' }]
    );
  };

  // Fonction pour ouvrir différentes apps de navigation
  const openMapsWithLocation = async () => {
    const apps = [
      {
        name: 'Google Maps',
        urlScheme: Platform.select({
          ios: `comgooglemaps://?q=${event.latitude},${event.longitude}&name=${event.location_name}`,
          android: `google.navigation:q=${event.latitude},${event.longitude}`
        }),
        webUrl: `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`,
        icon: 'logo-google'
      },
      {
        name: 'Waze',
        urlScheme: `waze://?ll=${event.latitude},${event.longitude}&navigate=yes`,
        webUrl: `https://waze.com/ul?ll=${event.latitude},${event.longitude}&navigate=yes`,
        icon: 'navigate'
      },
      {
        name: 'Plans',
        urlScheme: Platform.select({
          ios: `maps:0,0?q=${event.location_name}@${event.latitude},${event.longitude}`,
          android: `geo:0,0?q=${event.latitude},${event.longitude}(${event.location_name})`
        }),
        icon: 'map'
      }
    ];

    // Vérifier quelles applications sont installées
    const availableApps = await Promise.all(
      apps.map(async app => {
        if (!app.urlScheme) return null;
        try {
          const isAvailable = await Linking.canOpenURL(app.urlScheme as string);
          return isAvailable ? app : null;
        } catch {
          return null;
        }
      })
    );

    // Filtrer les apps nulles et créer les options d'alerte
    const alertOptions = availableApps
      .filter(app => app !== null)
      .map(app => ({
        text: app!.name,
        onPress: () => {
          const url = app!.urlScheme;
          if (url) {
            Linking.openURL(url as string).catch(() => {
              // Si l'ouverture échoue, essayer l'URL web si disponible
              if (app!.webUrl) {
                Linking.openURL(app!.webUrl);
              }
            });
          }
        }
      }));

    // Ajouter l'option Annuler
    alertOptions.push({
      text: 'Annuler',
      onPress: () => {},
    });

    // Afficher l'alerte uniquement si des applications sont disponibles
    if (alertOptions.length > 1) { // > 1 car il y a toujours l'option Annuler
      Alert.alert(
        'Navigation',
        'Choisissez votre application',
        alertOptions
      );
    } else {
      // Si aucune application n'est installée, ouvrir Google Maps dans le navigateur
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`);
    }
  };

  // Pas de redirection automatique ici: l'écran participant reste utilisé pour feed/participations

  // Actions admin retirées de cet écran (gérées dans EventAdmin)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Header fixe */}
        <View style={styles.fixedHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={styles.headerRight}>
            {userPendingRequestsCount > 0 && (
              <TouchableOpacity 
                style={styles.pendingRequestsButton}
                onPress={() => navigation.navigate('PendingRequests' as never)}
              >
                <Ionicons name="time" size={20} color="#F59E0B" />
                {userPendingRequestsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{userPendingRequestsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contenu scrollable */}
        <ScrollView style={styles.scrollView}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.sportBadge}>
                <Ionicons name={getSportIcon(event.sport)} size={24} color={PRIMARY_COLOR} />
                <Text style={styles.sportText}>{event.sport}</Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeItem}>
                  <Text style={styles.dateTimeText}>
                    {formatDateToFrench(event.date_time)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Infos principales */}
          <View style={styles.mainInfo}>
            <View style={styles.simpleInfoGrid}>
              {/* Card Places */}
              <View style={styles.simpleInfoCard}>
                <Ionicons name="people" size={24} color={PRIMARY_COLOR} />
                <Text style={styles.simpleInfoValue}>{event.available_slots}/{event.total_slots}</Text>
                <Text style={styles.simpleInfoLabel}>Places</Text>
              </View>

              {/* Card Niveaux */}
              <View style={styles.simpleInfoCard}>
                <Ionicons name="trophy" size={24} color={PRIMARY_COLOR} />
                <View style={styles.simpleLevelsContainer}>
                  {event.levels.map((level, index) => {
                    const levelFr = level === 'Beginner' ? 'Débutant' :
                                   level === 'Intermediate' ? 'Intermédiaire' :
                                   level === 'Advanced' ? 'Avancé' :
                                   level === 'Expert' ? 'Expert' : level;
                    return (
                      <Text key={index} style={styles.simpleLevelText}>
                        {levelFr}
                      </Text>
                    );
                  })}
                </View>
                <Text style={styles.simpleInfoLabel}>Niveaux</Text>
              </View>

              {/* Card Prix */}
              <View style={styles.simpleInfoCard}>
                <Ionicons name="cash" size={24} color={PRIMARY_COLOR} />
                <Text style={styles.simpleInfoValue}>
                  {event.price ? `${event.price}€` : 'Gratuit'}
                </Text>
                <Text style={styles.simpleInfoLabel}>Prix</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Lieu */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lieu</Text>
            <TouchableOpacity 
              style={styles.locationContainer}
              onPress={openMapsWithLocation}
            >
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={24} color={PRIMARY_COLOR} />
                <View style={styles.locationTexts}>
                  <Text style={styles.locationName}>{event.location_name}</Text>
                  <Text style={styles.locationAddress}>
                    {event.location_address}, {event.location_city}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Informations détaillées */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails de l'événement</Text>
            
            {/* Grille d'informations */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="time-outline" size={24} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.detailLabel}>Durée</Text>
                <Text style={styles.detailValue}>{event.duration} min</Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.detailLabel}>Date de création</Text>
                <Text style={styles.detailValue}>
                  {new Date(event.created_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Section Administration retirée ici */}
        </ScrollView>

        {/* Boutons d'action - Conditionnels selon le statut et la source */}
        {!isEventOwner && (
          <View style={styles.actionContainer}>
            {console.log('Debug - isParticipant:', isParticipant, 'hasPendingRequest:', hasPendingRequest, 'fromFeed:', fromFeed)}
            {isParticipant ? (
              // Utilisateur déjà participant - pas de footer
              <View style={styles.participantStatusContainer}>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.statusText}>Vous participez à cet événement</Text>
                </View>
                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={handleSendMessage}
                >
                  <Ionicons name="mail" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : hasPendingRequest ? (
              // Demande en attente
              <View style={styles.pendingStatusContainer}>
                <View style={styles.pendingBadge}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                  <Text style={styles.pendingText}>Demande en attente</Text>
                </View>
                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={handleSendMessage}
                >
                  <Ionicons name="mail" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              // Pas encore participant - boutons selon la source
              fromFeed ? (
                // On vient du feed - boutons normaux
                <>
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={handleSendMessage}
                  >
                    <Ionicons name="mail" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.joinButton}
                    onPress={handleRequestParticipation}
                  >
                    <Text style={styles.joinButtonText}>Rejoindre l'événement</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // On vient de "Mes événements" - seulement message
                <TouchableOpacity 
                  style={styles.messageButtonOnly}
                  onPress={handleSendMessage}
                >
                  <Ionicons name="mail" size={24} color="#FFF" />
                  <Text style={styles.messageButtonOnlyText}>Contacter l'organisateur</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  mainContainer: {
    flex: 1,
  },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#FFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateTimeContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  dateTimeText: {
    color: PRIMARY_COLOR,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  sportText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mainInfo: {
    backgroundColor: '#FFF',
    paddingVertical: 20,
    marginBottom: 8,
  },
  simpleInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  simpleInfoCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#EEE',
    minHeight: 100,
  },
  simpleInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginVertical: 8,
  },
  simpleInfoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  simpleLevelsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  simpleLevelText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    marginVertical: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  description: {
    color: '#444',
    lineHeight: 22,
    fontSize: 15,
  },
  locationContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingBottom: 16,
  },
  locationTexts: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  locationAddress: {
    color: '#666',
    fontSize: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  adminSummary: {
    gap: 8,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  adminButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FFF',
  },
  messageButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SECONDARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  joinButton: {
    flex: 1,
    height: 50,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    marginBottom: 24,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  levelsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    textAlign: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    minWidth: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  participantStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginRight: 12,
  },
  statusText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFBEB',
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginRight: 12,
  },
  pendingText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  pendingRequestsButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  messageButtonOnly: {
    flex: 1,
    height: 50,
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  messageButtonOnlyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
