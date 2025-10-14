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

type PendingRequest = Database['public']['Tables']['pending_participants']['Row'] & {
  user: Database['public']['Tables']['users']['Row'];
};

export default function EventRequestsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { eventId } = route.params as RouteParams;
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      // Récupérer les demandes avec les informations utilisateur
      const { data: requestsData, error } = await supabase
        .from('pending_participants')
        .select(`
          *,
          user:users(*)
        `)
        .eq('event_id', eventId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des demandes:', error);
        Alert.alert('Erreur', 'Impossible de charger les demandes');
        return;
      }

      setRequests(requestsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [eventId]);

  const approve = async (id: string) => {
    try {
      setBusy(id);
      console.log('Tentative d\'approbation de la demande:', id);
      
      const { error } = await eventsService.approvePendingRequest(id);
      
      if (error) {
        console.error('Erreur lors de l\'approbation:', error);
        const errorMessage = error.message || 'Impossible d\'approuver la demande';
        Alert.alert('Erreur', errorMessage);
      } else {
        console.log('Demande approuvée avec succès');
        
        // Poster un message système dans la conversation
        const { data: pending } = await supabase
          .from('pending_participants')
          .select('user_id, event_id, guests')
          .eq('id', id)
          .single();
          
        if (pending) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('event_id', pending.event_id)
            .single();
            
          if (conv?.id) {
            await supabase.from('messages').insert({
              conversation_id: conv.id,
              sender_id: pending.user_id,
              content: `Demande acceptée (${pending.guests} invité(s))`,
              type: 'system'
            });
          }
        }
        
        Alert.alert('Succès', 'Demande approuvée avec succès');
      }
      
      await load();
    } catch (error) {
      console.error('Erreur inattendue:', error);
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    try {
      setBusy(id);
      const { error } = await eventsService.rejectPendingRequest(id);
      if (error) Alert.alert('Erreur', 'Impossible de rejeter la demande');
      else {
        const { data: pending } = await supabase
          .from('pending_participants')
          .select('user_id, event_id')
          .eq('id', id)
          .single();
        if (pending) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('event_id', pending.event_id)
            .single();
          if (conv?.id) {
            await supabase.from('messages').insert({
              conversation_id: conv.id,
              sender_id: pending.user_id,
              content: 'Demande rejetée',
              type: 'system'
            });
          }
        }
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header avec padding top pour la safe area */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demandes d'inscription</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Theme.spacing.md }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              {/* Header de la demande */}
              <View style={styles.requestHeader}>
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
                <Text style={styles.requestDate}>
                  {new Date(item.requested_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              {/* Détails de la demande */}
              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {item.guests > 0 ? `${item.guests} invité${item.guests > 1 ? 's' : ''}` : 'Seul'}
                  </Text>
                </View>
                {item.comment && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Message :</Text>
                    <Text style={styles.commentText}>{item.comment}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  onPress={() => approve(item.id)} 
                  disabled={busy === item.id} 
                  style={[styles.actionButton, styles.approveButton]}
                >
                  {busy === item.id ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={Colors.background} />
                      <Text style={styles.actionText}>Accepter</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => reject(item.id)} 
                  disabled={busy === item.id} 
                  style={[styles.actionButton, styles.rejectButton]}
                >
                  {busy === item.id ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <>
                      <Ionicons name="close" size={18} color={Colors.background} />
                      <Text style={styles.actionText}>Refuser</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>Aucune demande</Text>
              <Text style={styles.emptySubtitle}>
                Les demandes d'inscription apparaîtront ici
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
  
  // Request Card
  requestCard: {
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  requestHeader: {
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
  requestDate: {
    fontSize: Theme.typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  
  // Request Details
  requestDetails: {
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
  commentContainer: {
    marginTop: Theme.spacing.sm,
    padding: Theme.spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Theme.borderRadius.md,
  },
  commentLabel: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  commentText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Colors.text,
    lineHeight: Theme.typography.lineHeight.normal * Theme.typography.fontSize.sm,
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  actionText: {
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


