import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StarRating from '../../components/ui/StarRating';
import reviewsService, { CreateReviewData } from '../../services/reviewsService';

const PRIMARY_COLOR = '#0C3B2E';

interface RouteParams {
  eventId: string;
  eventName: string;
}

interface ParticipantToRate {
  user_id: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    rating_average: number;
    rating_count: number;
  };
  existing_review: {
    rating: number;
    comment: string | null;
  } | null;
}

interface ParticipantRating {
  userId: string;
  rating: number;
  comment: string;
}

const RateParticipantsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, eventName } = route.params as RouteParams;
  
  const [participants, setParticipants] = useState<ParticipantToRate[]>([]);
  const [ratings, setRatings] = useState<{ [key: string]: ParticipantRating }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const { data, error } = await reviewsService.getParticipantsToReview(eventId);

      if (error) {
        Alert.alert('Erreur', error);
        navigation.goBack();
        return;
      }

      setParticipants(data || []);

      // Initialiser les ratings avec les reviews existantes
      const initialRatings: { [key: string]: ParticipantRating } = {};
      data?.forEach(p => {
        if (p.existing_review) {
          initialRatings[p.user_id] = {
            userId: p.user_id,
            rating: p.existing_review.rating,
            comment: p.existing_review.comment || '',
          };
        } else {
          initialRatings[p.user_id] = {
            userId: p.user_id,
            rating: 0,
            comment: '',
          };
        }
      });
      setRatings(initialRatings);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les participants');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (userId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        rating,
      },
    }));
  };

  const handleCommentChange = (userId: string, comment: string) => {
    setRatings(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        comment,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      // Vérifier qu'au moins une personne a été notée
      const validRatings = Object.values(ratings).filter(r => r.rating > 0);
      
      if (validRatings.length === 0) {
        Alert.alert('Attention', 'Veuillez noter au moins un participant');
        return;
      }

      setSubmitting(true);

      // Créer les reviews
      const reviewsToCreate: CreateReviewData[] = validRatings.map(r => ({
        reviewed_user_id: r.userId,
        event_id: eventId,
        rating: r.rating,
        comment: r.comment.trim() || undefined,
      }));

      const { data, error } = await reviewsService.createMultipleReviews(reviewsToCreate);

      if (error) {
        Alert.alert('Erreur', error);
        return;
      }

      Alert.alert(
        'Merci !',
        `Vos avis ont été enregistrés (${validRatings.length} participant${validRatings.length > 1 ? 's' : ''} noté${validRatings.length > 1 ? 's' : ''})`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer vos avis');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatedCount = () => {
    return Object.values(ratings).filter(r => r.rating > 0).length;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Noter les participants</Text>
            <Text style={styles.headerSubtitle}>{eventName}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Ionicons name="star" size={18} color={PRIMARY_COLOR} />
          <Text style={styles.progressText}>
            {getRatedCount()} / {participants.length} participant{participants.length > 1 ? 's' : ''} noté{participants.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Liste des participants */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {participants.map((participant, index) => {
            const participantRating = ratings[participant.user_id];
            const hasExistingReview = participant.existing_review !== null;

            return (
              <View key={participant.user_id} style={styles.participantCard}>
                {/* En-tête participant */}
                <View style={styles.participantHeader}>
                  <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={24} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.user.first_name} {participant.user.last_name}
                    </Text>
                    <Text style={styles.participantUsername}>@{participant.user.username}</Text>
                    {participant.user.rating_count > 0 && (
                      <View style={styles.userRatingContainer}>
                        <StarRating
                          rating={parseFloat(participant.user.rating_average.toString())}
                          size={14}
                          readonly
                          color="#FFB800"
                        />
                        <Text style={styles.userRatingText}>
                          ({participant.user.rating_count})
                        </Text>
                      </View>
                    )}
                  </View>
                  {hasExistingReview && (
                    <View style={styles.alreadyRatedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.alreadyRatedText}>Noté</Text>
                    </View>
                  )}
                </View>

                {/* Notation */}
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>Votre note</Text>
                  <StarRating
                    rating={participantRating?.rating || 0}
                    onRatingChange={(rating) => handleRatingChange(participant.user_id, rating)}
                    size={32}
                    color="#FFD700"
                  />
                </View>

                {/* Commentaire */}
                {participantRating?.rating > 0 && (
                  <View style={styles.commentSection}>
                    <Text style={styles.commentLabel}>Commentaire (optionnel)</Text>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Partagez votre expérience..."
                      placeholderTextColor="#999"
                      value={participantRating?.comment || ''}
                      onChangeText={(text) => handleCommentChange(participant.user_id, text)}
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                      textAlignVertical="top"
                    />
                    <Text style={styles.characterCount}>
                      {participantRating?.comment?.length || 0}/500
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {participants.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Aucun participant à noter</Text>
              <Text style={styles.emptySubtext}>
                Les autres participants apparaîtront ici
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {participants.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || getRatedCount() === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    Envoyer {getRatedCount() > 0 ? `(${getRatedCount()})` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  participantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  participantUsername: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  userRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  alreadyRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alreadyRatedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  ratingSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 12,
  },
  commentSection: {
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  characterCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RateParticipantsScreen;


