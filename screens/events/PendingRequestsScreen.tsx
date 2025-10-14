import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Database } from '../../types/database';
import { eventsService } from '../../services/events';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';

type Event = Database['public']['Tables']['events']['Row'];

interface PendingRequest {
  id: string;
  event_id: string;
  guests: number;
  comment: string | null;
  requested_at: string;
  event: Event;
}

const PRIMARY_COLOR = '#0C3B2E';

export default function PendingRequestsScreen() {
  const navigation = useNavigation();
  const { userId } = useAuth();
  
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingRequests();
  }, [userId]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      if (!userId) {
        setError('Utilisateur non connecté');
        return;
      }

      const { data, error } = await eventsService.getUserPendingRequests(userId);
      
      if (error) {
        setError('Erreur lors du chargement des demandes');
        return;
      }
      
      setPendingRequests(data);
    } catch (err) {
      setError('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      'Annuler la demande',
      'Êtes-vous sûr de vouloir annuler cette demande de participation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await eventsService.rejectPendingRequest(requestId);
              if (error) {
                Alert.alert('Erreur', 'Impossible d\'annuler la demande');
                return;
              }
              // Recharger la liste
              loadPendingRequests();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible d\'annuler la demande');
            }
          },
        },
      ]
    );
  };

  const handleViewEvent = (eventId: string) => {
    navigation.navigate('EventDetails' as never, { eventId, fromFeed: false } as never);
  };

  const formatDateToFrench = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('fr-FR', { month: 'long' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} à ${hours}h${minutes}`;
  };

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

  const renderPendingRequest = ({ item }: { item: PendingRequest }) => (
    <View style={styles.requestCard}>
      <TouchableOpacity 
        style={styles.eventInfo}
        onPress={() => handleViewEvent(item.event_id)}
      >
        <View style={styles.eventHeader}>
          <View style={styles.sportBadge}>
            <Ionicons name={getSportIcon(item.event.sport)} size={20} color={PRIMARY_COLOR} />
            <Text style={styles.sportText}>{item.event.sport}</Text>
          </View>
          <Text style={styles.eventName} numberOfLines={1}>{item.event.name}</Text>
        </View>
        
        <View style={styles.eventDetails}>
          <Text style={styles.eventDate}>{formatDateToFrench(item.event.date_time)}</Text>
          <Text style={styles.eventLocation}>{item.event.location_name}</Text>
        </View>

        {item.comment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Votre message :</Text>
            <Text style={styles.commentText}>{item.comment}</Text>
          </View>
        )}

        <View style={styles.requestInfo}>
          <Text style={styles.requestDate}>
            Demande envoyée le {new Date(item.requested_at).toLocaleDateString('fr-FR')}
          </Text>
          {item.guests > 0 && (
            <Text style={styles.guestsInfo}>
              + {item.guests} invité{item.guests > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => handleCancelRequest(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadPendingRequests}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes demandes en attente</Text>
        <View style={styles.headerRight} />
      </View>

      {pendingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={60} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Aucune demande en attente</Text>
          <Text style={styles.emptySubtitle}>
            Vous n'avez aucune demande de participation en attente
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderPendingRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
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
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
    overflow: 'hidden',
  },
  eventInfo: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  sportText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '600',
  },
  eventName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  commentContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#92400E',
  },
  requestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
  },
  guestsInfo: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    padding: 12,
    backgroundColor: '#FEF3C7',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
