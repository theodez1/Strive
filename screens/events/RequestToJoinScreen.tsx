import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { eventsService } from '../../services/events';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';
import { Database } from '../../types/database';

type Event = Database['public']['Tables']['events']['Row'];

interface RouteParams {
  eventId: string;
  eventName?: string;
}

const PRIMARY_COLOR = '#0C3B2E';
const SECONDARY_COLOR = '#6D9773';

export default function RequestToJoinScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId, eventName } = route.params as RouteParams;
  const { userId } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState('0');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await eventsService.getEvent(eventId);
      
      if (error) {
        setError("Erreur lors du chargement de l'événement");
        return;
      }
      
      if (!data) {
        setError('Événement non trouvé');
        return;
      }
      
      setEvent(data);
    } catch (err) {
      setError("Erreur lors du chargement de l'événement");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!event || !userId) return;
    
    const guestsCount = parseInt(guests, 10) || 0;
    
    // Validation
    if (guestsCount < 0) {
      Alert.alert('Erreur', 'Le nombre d\'invités ne peut pas être négatif.');
      return;
    }
    
    if (event.available_slots < guestsCount + 1) {
      Alert.alert('Erreur', 'Pas assez de places disponibles pour vous et vos invités.');
      return;
    }
    
    try {
      setSubmitting(true);
      const { error } = await eventsService.requestToJoin(eventId, userId, guestsCount, comment.trim() || undefined);
      
      if (error) {
        Alert.alert('Erreur', (error as any).message || 'Impossible d\'envoyer la demande');
        return;
      }
      
      // Succès - retourner à l'écran précédent
      Alert.alert(
        'Demande envoyée',
        `Votre demande de participation${guestsCount > 0 ? ` avec ${guestsCount} invité${guestsCount > 1 ? 's' : ''}` : ''} a été envoyée à l'organisateur.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
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

  const guestsCount = parseInt(guests, 10) || 0;
  const totalPeople = guestsCount + 1;
  const remainingSlots = event.available_slots - totalPeople;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleCancel}
        >
          <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demander à rejoindre</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventInfoCard}>
          <View style={styles.eventHeader}>
            <View style={styles.sportBadge}>
              <Ionicons name="football" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.sportText}>{event.sport}</Text>
            </View>
            <Text style={styles.eventTime}>
              {new Date(event.date_time).toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          
          <Text style={styles.eventName}>{event.name}</Text>
          
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{event.location_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {event.total_slots - event.available_slots}/{event.total_slots} participants
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {new Date(event.date_time).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Request Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Détails de votre demande</Text>
          
          {/* Number of guests */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre d'invités</Text>
            <Text style={styles.inputDescription}>
              Combien de personnes souhaitez-vous amener avec vous ?
            </Text>
            <View style={styles.guestsInputContainer}>
              <TouchableOpacity
                style={[styles.guestsButton, guestsCount <= 0 && styles.guestsButtonDisabled]}
                onPress={() => setGuests(Math.max(0, guestsCount - 1).toString())}
                disabled={guestsCount <= 0}
              >
                <Ionicons name="remove" size={20} color={guestsCount <= 0 ? '#9CA3AF' : PRIMARY_COLOR} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.guestsInput}
                value={guests}
                onChangeText={setGuests}
                keyboardType="numeric"
                placeholder="0"
                maxLength={2}
              />
              
              <TouchableOpacity
                style={[styles.guestsButton, remainingSlots < 1 && styles.guestsButtonDisabled]}
                onPress={() => setGuests(Math.min(guestsCount + 1, event.available_slots - 1).toString())}
                disabled={remainingSlots < 1}
              >
                <Ionicons name="add" size={20} color={remainingSlots < 1 ? '#9CA3AF' : PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>
            
            {guestsCount > 0 && (
              <Text style={styles.guestsInfo}>
                Total : {totalPeople} personne{totalPeople > 1 ? 's' : ''} 
                ({remainingSlots} place{remainingSlots > 1 ? 's' : ''} restante{remainingSlots > 1 ? 's' : ''})
              </Text>
            )}
          </View>

          {/* Comment */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Commentaire (optionnel)</Text>
            <Text style={styles.inputDescription}>
              Ajoutez un message pour l'organisateur
            </Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Bonjour, j'aimerais participer à cet événement..."
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé de votre demande</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vous</Text>
            <Text style={styles.summaryValue}>1 personne</Text>
          </View>
          {guestsCount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Invités</Text>
              <Text style={styles.summaryValue}>{guestsCount} personne{guestsCount > 1 ? 's' : ''}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={[styles.summaryValue, styles.summaryTotal]}>{totalPeople} personne{totalPeople > 1 ? 's' : ''}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  eventInfoCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sportText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    marginLeft: 6,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  formCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  guestsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  guestsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  guestsButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  guestsInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  guestsInfo: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FFF',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    height: 50,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

