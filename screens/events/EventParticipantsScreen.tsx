import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  FlatList, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { eventsService } from '../../services/events';
import { supabase } from '../../lib/supabase';
import { Colors, Theme } from '../../constants/Theme';
import { Database } from '../../types/database';

interface RouteParams { eventId: string }

type Participant = Database['public']['Tables']['participants']['Row'] & {
  user: Database['public']['Tables']['users']['Row'];
};

export default function EventParticipantsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { eventId } = route.params as RouteParams;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadParticipants = async () => {
    try {
      // Récupérer les participants avec les informations utilisateur
      const { data: participantsData, error } = await supabase
        .from('participants')
        .select(`
          *,
          user:users(*)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des participants:', error);
        Alert.alert('Erreur', 'Impossible de charger les participants');
        return;
      }

      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des participants:', error);
      Alert.alert('Erreur', 'Impossible de charger les participants');
    }
  };

  useEffect(() => {
    (async () => {
      await loadParticipants();
      setLoading(false);
    })();
  }, [eventId]);

  const getConversationId = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('event_id', eventId)
      .single();
    if (data?.id) return data.id as string;
    const { data: created } = await supabase
      .from('conversations')
      .insert({ event_id: eventId })
      .select('id')
      .single();
    return created?.id as string;
  };

  const removeParticipant = async (userId: string) => {
    Alert.alert(
      'Retirer le participant',
      'Êtes-vous sûr de vouloir retirer ce participant de l\'événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Retirer', 
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(userId);
              const { error } = await eventsService.leaveEvent(eventId, userId);
              if (error) {
                Alert.alert('Erreur', 'Impossible de retirer le participant');
                return;
              }
              
              const convId = await getConversationId();
              if (convId) {
                await supabase.from('messages').insert({
                  conversation_id: convId,
                  sender_id: userId,
                  content: "A quitté l'événement",
                  type: 'system'
                });
              }
              
              await loadParticipants();
              Alert.alert('Succès', 'Participant retiré');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
            } finally {
              setBusy(null);
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header avec padding top pour la safe area */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Participants</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des participants...</Text>
        </View>
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Theme.spacing.md }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.participantCard}>
              {/* Header du participant */}
              <View style={styles.participantHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.user.first_name?.[0]?.toUpperCase() || 'U'}
                      {item.user.last_name?.[0]?.toUpperCase() || ''}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {item.user.first_name} {item.user.last_name}
                    </Text>
                    <Text style={styles.userUsername}>@{item.user.username}</Text>
                  </View>
                </View>
                <Text style={styles.joinDate}>
                  {new Date(item.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              {/* Détails du participant */}
              <View style={styles.participantDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {item.guests > 0 ? `${item.guests} invité${item.guests > 1 ? 's' : ''}` : 'Seul'}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  onPress={() => removeParticipant(item.user_id)} 
                  disabled={busy === item.user_id} 
                  style={styles.removeButton}
                >
                  {busy === item.user_id ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color={Colors.background} />
                      <Text style={styles.removeButtonText}>Retirer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>Aucun participant</Text>
              <Text style={styles.emptySubtitle}>
                Les participants apparaîtront ici une fois inscrits
              </Text>
            </View>
          }
        />
      )}
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
  list: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  
  // Participant Card
  participantCard: {
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  avatarText: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.background,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Theme.typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
  },
  userUsername: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  joinDate: {
    fontSize: Theme.typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  
  // Participant Details
  participantDetails: {
    marginBottom: Theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  detailText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  // Actions
  actionsContainer: {
    alignItems: 'flex-end',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: Colors.error,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
  },
  removeButtonText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.background,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});


