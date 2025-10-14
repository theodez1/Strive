import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Database } from '../../types/database';
import { EventWithDistance } from '../../services/events-backend';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Colors } from '../../constants/Colors';

type Event = Database['public']['Tables']['events']['Row'];

const PRIMARY_COLOR = '#0C3B2E';

interface EventCardMyeventProps {
  event: EventWithDistance;
  onPress?: (event: EventWithDistance) => void;
  isPast?: boolean;
  onAddReview?: (event: EventWithDistance) => void;
  currentUserId?: string;
  pendingRequestsCount?: number;
}

const EventCardMyevent: React.FC<EventCardMyeventProps> = ({ 
  event, 
  onPress, 
  isPast, 
  onAddReview, 
  currentUserId,
  pendingRequestsCount = 0
}) => {
  const formatTimeRange = () => {
    const startTime = new Date(event.date_time);
    const formattedStart = format(startTime, 'HH:mm', { locale: fr });
    
    // Si vous avez une durée dans votre base de données, vous pouvez l'utiliser
    // const endTime = new Date(startTime.getTime() + event.duration * 60000);
    // const formattedEnd = format(endTime, 'HH:mm', { locale: fr });
    // return `${formattedStart} - ${formattedEnd}`;
    
    return formattedStart;
  };

  const getSportIcon = (sport: string): any => {
    const sportIcons: { [key: string]: string } = {
      'Football': 'football',
      'Basketball': 'basketball',
      'Tennis': 'tennisball',
      'Running': 'walk',
      'Cycling': 'bicycle',
      'Swimming': 'water',
      'Volleyball': 'basketball', // Pas d'icône volleyball, utiliser basketball
      'Badminton': 'tennisball',
      'Ping Pong': 'tennisball',
      'default': 'fitness'
    };
    return sportIcons[sport] || sportIcons.default;
  };

  const renderProgressBar = () => {
    if (isPast) {
      return (
        <View style={styles.completedEvent}>
          <View style={styles.participantsCount}>
            <Ionicons name="people-outline" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.countText}>
              <Text style={styles.detailText}>{event.total_slots - event.available_slots}</Text>
              <Text style={styles.detailText}> Participants</Text>
            </Text>
          </View>
        </View>
      );
    }

    const occupiedSlots = event.total_slots - event.available_slots;
    const progress = (occupiedSlots / event.total_slots) * 100;

    const getProgressColor = () => {
      if (progress >= 90) return '#EF4444';
      if (progress >= 70) return '#F59E0B';
      return PRIMARY_COLOR;
    };

    return (
      <View style={styles.progressSection}>
        <View style={styles.participantsInfo}>
          <View style={styles.participantsCount}>
            <Ionicons name="people-outline" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.countText}>
              <Text style={styles.detailText}>{event.total_slots}</Text>
              <Text style={styles.detailText}> places</Text>
            </Text>
          </View>
          <Text style={[styles.statusText, { color: getProgressColor() }]}>
            {event.available_slots === 0 ? 'Complet' : 
             event.available_slots === 1 ? '1 place libre' : 
             `${event.available_slots} places libres`}
          </Text>
        </View>

        <View style={styles.slotsContainer}>
          {[...Array(occupiedSlots)].map((_, i) => (
            <View 
              key={`occupied-${i}`}
              style={[
                styles.slot,
                { backgroundColor: getProgressColor() }
              ]}
            />
          ))}
          {[...Array(event.available_slots)].map((_, i) => (
            <View 
              key={`available-${i}`}
              style={[
                styles.slot,
                styles.availableSlot
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const isOrganizer = event.organizer_id === currentUserId;

  return (
    <View style={[
      styles.eventCard,
      isPast && styles.pastEventCard
    ]}>
      <TouchableOpacity onPress={() => onPress && onPress(event)} disabled={isPast}>
        <View style={styles.eventHeader}>
          <View style={[
            styles.sportContainer,
            isPast && styles.pastSportContainer
          ]}>
            <View style={styles.sportIconContainer}>
              <Ionicons name={getSportIcon(event.sport)} size={18} color="#FFF" />
            </View>
            <Text style={styles.sportText}>{event.sport}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[
              styles.eventTime,
              isPast && styles.pastEventTime
            ]}>
              {formatTimeRange()}
            </Text>
          </View>
        </View>

        <Text style={styles.eventName} numberOfLines={1} ellipsizeMode="tail">
          {event.name}
        </Text>

        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={20} color={PRIMARY_COLOR} />
            <View style={styles.locationTexts}>
              {(() => {
                const name = (event.location_name || '').trim();
                const address = (event.location_address || '').trim();
                const city = (event.location_city || '').trim();
                const addressPlusCity = address && city ? `${address}, ${city}` : address || city;
                const looksLikeAddress = name === addressPlusCity;
                const hasPlaceName = !!name && !looksLikeAddress;

                return (
                  <>
                    <Text style={styles.locationName} numberOfLines={1}>
                      {hasPlaceName ? name : (addressPlusCity || 'Lieu à définir')}
                    </Text>
                    {hasPlaceName && !!addressPlusCity && (
                      <Text style={styles.locationAddress} numberOfLines={1}>
                        {addressPlusCity}
                      </Text>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.detailText}>
              {event.levels_fr && event.levels_fr.length > 0 ? event.levels_fr.join(', ') : 
               event.levels && event.levels.length > 0 ? event.levels.join(', ') : 'Non spécifié'}
            </Text>
          </View>
          {renderProgressBar()}
        </View>

        <View style={[
          styles.footerRow,
          isPast && styles.pastFooterRow
        ]}>
          <View style={styles.profileImageContainer}>
            {event.organizer_profile_picture_url ? (
              <Image
                source={{ uri: event.organizer_profile_picture_url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={20} color={PRIMARY_COLOR} />
              </View>
            )}
            <View style={styles.organizerInfo}>
              <View style={styles.organizerRow}>
                <Text style={styles.organizerText}>
                  {(() => {
                    const firstName = event.organizer_first_name || '';
                    const lastName = event.organizer_last_name || '';
                    const username = event.organizer_username || '';
                    
                    if (firstName && lastName) {
                      return `${firstName} ${lastName}`;
                    }
                    return username || 'Organisateur';
                  })()}
                </Text>
                {(() => {
                  const rating = event.organizer_rating_average;
                  if (rating != null && rating !== undefined && typeof rating === 'number' && rating > 0) {
                    return (
                      <>
                        <Ionicons name="star" size={14} color="#FFD700" style={styles.ratingIcon} />
                        <Text style={styles.ratingText}>
                          {rating.toFixed(1)}
                        </Text>
                      </>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>
          </View>
          <View style={styles.footerRight}>
            {pendingRequestsCount != null && pendingRequestsCount > 0 && (
              <View style={styles.pendingRequestsBadge}>
                <Ionicons name="time-outline" size={14} color="#FFF" />
                <Text style={styles.pendingRequestsText}>{pendingRequestsCount}</Text>
              </View>
            )}
            <Text style={styles.footerPrice}>
              {(() => {
                const numericPrice = event.price != null ? parseFloat(String(event.price)) : NaN;
                if (!isNaN(numericPrice) && numericPrice === 0) return 'Gratuit';
                if (!isNaN(numericPrice)) return `${numericPrice} €`;
                return 'Gratuit';
              })()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {isPast && !isOrganizer && (
        <View style={styles.reviewSection}>
          <View style={styles.reviewDivider} />
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => onAddReview && onAddReview(event)}
          >
            <Ionicons name="star" size={20} color="#FFD700" style={{ marginRight: 8 }} />
            <Text style={styles.addReviewButtonText}>Donnez votre avis</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
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
    marginBottom: 8,
  },
  sportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sportIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 10,
  },
  eventDetails: {
    marginBottom: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationTexts: {
    flex: 1,
    marginLeft: 8,
  },
  locationName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#555',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
  profileImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#0C3B2E',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#0C3B2E',
  },
  organizerInfo: {
    flexDirection: 'column',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 14,
    color: '#555',
  },
  ratingIcon: {
    marginLeft: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  footerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  progressSection: {
    marginBottom: 8,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  participantsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  countText: {
    marginLeft: 8,
    fontSize: 14,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  slotsContainer: {
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    height: 6,
    borderRadius: 2,
    marginRight: 3,
  },
  availableSlot: {
    backgroundColor: '#E5E7EB',
  },
  reviewSection: {
    marginTop: 12,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginBottom: 12,
  },
  addReviewButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReviewButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  pastEventCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowOpacity: 0.05,
  },
  pastSportContainer: {
    backgroundColor: '#94A3B8',
  },
  pastEventTime: {
    color: '#94A3B8',
  },
  pastFooterRow: {
    borderTopColor: '#F1F5F9',
  },
  completedEvent: {
    marginBottom: 12,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingRequestsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  pendingRequestsText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default EventCardMyevent;
