import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Alert, 
  Dimensions,
  ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { eventsService } from '../../services/events';
import { Database } from '../../types/database';
import { Colors, Theme } from '../../constants/Theme';

type Event = Database['public']['Tables']['events']['Row'];

interface RouteParams {
  eventId: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function EventAdminScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { eventId } = route.params as RouteParams;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const loadEventData = async () => {
    try {
      const [eventResult, participantsResult, requestsResult] = await Promise.all([
        eventsService.getEvent(eventId),
        eventsService.getParticipantsByEvent(eventId),
        eventsService.getPendingRequestsByEvent(eventId)
      ]);
      
      setEvent(eventResult.data);
      setParticipantsCount(participantsResult.data?.length || 0);
      setPendingRequestsCount(requestsResult.data?.length || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  useFocusEffect(
    React.useCallback(() => {
      loadEventData();
      return () => {};
    }, [eventId])
  );

  const handleEdit = () => (navigation as any).navigate('EventEdit', { eventId });
  const handleParticipants = () => (navigation as any).navigate('EventParticipants', { eventId });
  const handleRequests = () => (navigation as any).navigate('EventRequests', { eventId });
  const handleCancel = () => {
    Alert.alert(
      "Annuler l'événement",
      "Êtes-vous sûr de vouloir annuler cet événement ?",
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui', 
          style: 'destructive', 
          onPress: async () => {
            const { error } = await eventsService.deleteEvent(eventId);
            if (error) {
              Alert.alert('Erreur', "Impossible d'annuler l'événement");
              return;
            }
            // Retourner à l'écran Mes Activités
            navigation.goBack();
            setTimeout(() => {
              Alert.alert('Événement annulé', 'Votre événement a été annulé');
            }, 300);
          }
        },
      ]
    );
  };
  const handleChat = () => (navigation as any).navigate('Main', { screen: 'Messages' });

  if (loading || !event) {
    return (
      <View style={styles.container}>
        {/* Header avec padding top pour la safe area */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Administration</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  const occupiedSlots = event.total_slots - event.available_slots;

  return (
    <View style={styles.container}>
      {/* Header avec padding top pour la safe area */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.name}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: insets.bottom + Theme.spacing.md }}
        showsVerticalScrollIndicator={false}
      >
          {/* Event Info Card */}
          <View style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventName}>{event.name}</Text>
              <View style={styles.sportBadge}>
                <Text style={styles.sportText}>{event.sport}</Text>
              </View>
            </View>
            
            <View style={styles.eventDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>
                  {new Date(event.date_time).toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{event.location_city}</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{event.total_slots}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{occupiedSlots}</Text>
              <Text style={styles.statLabel}>Occupées</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{event.available_slots}</Text>
              <Text style={styles.statLabel}>Libres</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleParticipants}>
                <Text style={styles.actionText}>Participants</Text>
                <Text style={styles.actionSubtext}>({participantsCount})</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleRequests}>
                <Text style={styles.actionText}>Demandes</Text>
                <Text style={styles.actionSubtext}>
                  {pendingRequestsCount > 0 ? `(${pendingRequestsCount})` : '(0)'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                <Text style={styles.actionText}>Modifier</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
                <Text style={styles.actionText}>Chat</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.dangerButton} onPress={handleCancel}>
              <Text style={styles.dangerText}>Annuler l'événement</Text>
            </TouchableOpacity>
          </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: Theme.spacing.sm,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Theme.typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Theme.spacing.sm,
  },
  
  // Event Card
  eventCard: {
    backgroundColor: Colors.background,
    margin: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  eventName: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  sportBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  sportText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  eventDetails: {
    gap: Theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  detailText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    alignItems: 'center',
    ...Theme.shadows.sm,
  },
  statValue: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: Theme.typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  
  // Actions Container
  actionsContainer: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.primary,
  },
  actionText: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: '600',
    color: Colors.background,
    marginBottom: Theme.spacing.xs,
  },
  actionSubtext: {
    fontSize: Theme.typography.fontSize.xs,
    color: Colors.background,
    opacity: 0.8,
  },
  dangerButton: {
    backgroundColor: Colors.error,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.md,
  },
  dangerText: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: '600',
    color: Colors.background,
  },
  
  // Bottom spacing
  bottomSpacing: {
    height: Theme.spacing.lg,
  },
});


