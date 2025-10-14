import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../constants/Theme';

interface EventData {
  id: string;
  name: string;
  sport: string;
  date_time: string;
  location_name: string;
  location_address?: string;
  location_city?: string;
  levels?: string[];
  levels_fr?: string[]; // Niveaux traduits en français
  total_slots: number;
  available_slots: number;
  organizer_username?: string;
  organizer_first_name?: string;
  organizer_last_name?: string;
  organizer_profile_picture_url?: string;
  organizer_rating_average?: number | string;
  price?: number;
  distance_km?: number; // Distance en km
}

interface EventCardProps {
  event: EventData;
  onPress?: () => void;
  navigation?: any; // Navigation prop pour React Navigation
  isParticipant?: boolean; // Indique si l'utilisateur participe déjà à l'événement
}

const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onPress, 
  navigation,
  isParticipant = false
}) => {
  const formatTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getOrganizerDisplayName = (): string => {
    const firstName = event.organizer_first_name || '';
    const lastName = event.organizer_last_name || '';
    const username = event.organizer_username || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username || 'Organisateur inconnu';
  };

  const getSportIcon = (sport: string): string => {
    switch (sport.toLowerCase()) {
      case 'football': return 'football-outline';
      case 'basketball': return 'basketball-outline';
      case 'tennis': return 'tennisball-outline';
      case 'padel': return 'ellipse-outline';
      case 'running': return 'walk-outline';
      case 'fitness': return 'barbell-outline';
      case 'swimming': return 'water-outline';
      case 'volleyball': return 'ellipse-outline';
      default: return 'fitness-outline';
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation) {
      navigation.navigate('EventDetails', { eventId: event.id, fromFeed: true });
    }
  };

  return (
    <TouchableOpacity style={[styles.eventCard, isParticipant && styles.participantCard]} onPress={handlePress} activeOpacity={0.7}>
      
      {/* Ligne supérieure : Sport, Heure */}
      <View style={styles.eventHeader}>
        <View style={styles.sportContainer}>
          <View style={styles.sportIconContainer}>
            <Ionicons name={getSportIcon(event.sport) as any} size={18} color={Colors.background} />
          </View>
          <Text style={styles.sportText}>{event.sport}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.eventTime}>{formatTime(event.date_time)}</Text>
        </View>
      </View>

      {/* Nom de l'événement */}
      <Text style={styles.eventName} numberOfLines={1} ellipsizeMode="tail">
        {event.name}
      </Text>

      {/* Informations principales : Lieu, Niveau, Participants */}
      <View style={styles.eventDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
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
                    {event.distance_km !== undefined && (
                      <Text style={styles.distanceText}> • {parseFloat(event.distance_km.toString()).toFixed(1)}km</Text>
                    )}
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
          <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
          <Text style={styles.detailText}>
            {event.levels_fr && event.levels_fr.length > 0 ? event.levels_fr.join(', ') : 'Non spécifié'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <View style={styles.participantsContainer}>
            <View style={styles.participantsInfo}>
              <Text style={styles.detailText}>
                {event.total_slots - event.available_slots}/{event.total_slots} participants
              </Text>
              <Text style={[styles.statusText, { color: event.available_slots === 0 ? '#EF4444' : event.available_slots <= 2 ? '#F59E0B' : Colors.primary }]}>
                {event.available_slots === 0 ? 'Complet' : 
                 event.available_slots === 1 ? '1 place libre' : 
                 `${event.available_slots} places libres`}
              </Text>
            </View>
            <View style={styles.slotsContainer}>
              {event.total_slots <= 30 ? (
                // Affichage avec tirets pour <= 30 places
                <>
                  {Array.from({ length: event.total_slots - event.available_slots }, (_, i) => (
                    <View 
                      key={`occupied-${i}`}
                      style={[
                        styles.slot,
                        { backgroundColor: event.available_slots === 0 ? '#EF4444' : event.available_slots <= 2 ? '#F59E0B' : Colors.primary }
                      ]}
                    />
                  ))}
                  {Array.from({ length: event.available_slots }, (_, i) => (
                    <View 
                      key={`available-${i}`}
                      style={[styles.slot, styles.availableSlot]}
                    />
                  ))}
                </>
              ) : (
                // Affichage avec nombre pour > 30 places
                <View style={styles.largeEventIndicator}>
                  <Text style={styles.largeEventText}>
                    {event.total_slots - event.available_slots}/{event.total_slots}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Organisateur et Prix */}
      <View style={styles.footerRow}>
        <View style={styles.profileImageContainer}>
          {(() => {
            const profileUrl = event.organizer_profile_picture_url;
            console.log('Profile URL for organizer:', profileUrl, 'Event:', event.name);
            
            if (profileUrl && profileUrl.trim() !== '') {
              return (
                <Image
                  source={{ uri: profileUrl }}
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('Error loading profile image:', error.nativeEvent.error);
                  }}
                  onLoad={() => {
                    console.log('Profile image loaded successfully');
                  }}
                />
              );
            } else {
              return (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {getOrganizerDisplayName().charAt(0).toUpperCase()}
                  </Text>
                </View>
              );
            }
          })()}
          <View style={styles.organizerInfo}>
            <View style={styles.organizerRow}>
              <Text style={styles.organizerText}>{getOrganizerDisplayName()}</Text>
              {(() => {
                const rating = event.organizer_rating_average;
                if (rating != null && rating !== undefined) {
                  const numRating = typeof rating === 'number' ? rating : parseFloat(rating.toString());
                  if (!isNaN(numRating) && numRating > 0) {
                    return (
                      <>
                        <Ionicons name="star" size={14} color={Colors.warning} style={styles.ratingIcon} />
                        <Text style={styles.ratingText}>
                          {numRating.toFixed(1)}
                        </Text>
                      </>
                    );
                  }
                }
                return null;
              })()}
            </View>
          </View>
        </View>
        <Text style={styles.footerPrice}>
          {(() => {
            const numericPrice = event.price != null ? parseFloat(String(event.price)) : NaN;
            if (!isNaN(numericPrice) && numericPrice === 0) return 'Gratuit';
            if (!isNaN(numericPrice)) return `${numericPrice} €`;
            return 'Gratuit';
          })()}
        </Text>
      </View>

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    marginTop: Theme.spacing.sm,
    marginBottom: 15,
    marginHorizontal: 2, // Réduit encore plus drastiquement
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray300,
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
    backgroundColor: Colors.primary,
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
    color: Colors.background,
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
    color: Colors.primary,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationTexts: {
    flex: 1,
    marginLeft: 8,
  },
  locationName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailText: {
    fontSize: 15,
    marginLeft: 8,
    color: Colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.extendedColors.gray300,
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
    borderColor: Colors.primary,
  },
  profileImageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
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
    color: Colors.textSecondary,
  },
  ratingIcon: {
    marginLeft: 5,
  },
  ratingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  footerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  participantCard: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  participantsContainer: {
    flex: 1,
    marginLeft: 8,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  slotsContainer: {
    flexDirection: 'row',
    height: 6,
  },
  slot: {
    flex: 1,
    height: 6,
    marginRight: 1,
  },
  availableSlot: {
    backgroundColor: '#E5E7EB',
  },
  largeEventIndicator: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  largeEventText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default EventCard;
