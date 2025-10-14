import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { eventsBackendService } from '../../services/events-backend';
import reviewsService, { Review } from '../../services/reviewsService';
import { StarRating, ProfileImagePicker } from '../../components/ui';
import { userService } from '../../services/userService';

const COLORS = {
  primary: '#0C3B2E',
  background: '#FFFFFF',
  card: '#F9F9F9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  accent: '#FFD700',
  shadow: '#00000020',
  gradientStart: '#F4F6F8',
  gradientEnd: '#FFFFFF',
};

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 3;

type SportId = 'Football' | 'Basketball' | 'Tennis' | 'Padel' | 'Volleyball' | 'Badminton' | 'Ping_pong' | 'Swimming' | 'Running' | 'Cycling' | 'Climbing' | 'Hiking';
type SportInfo = { name: string; icon: string };

const SPORTS_MAP: Record<SportId, SportInfo> = {
  'Football': { name: 'Football', icon: 'football-outline' },
  'Basketball': { name: 'Basketball', icon: 'basketball-outline' }, 
  'Tennis': { name: 'Tennis', icon: 'tennisball-outline' },
  'Padel': { name: 'Padel', icon: 'tennisball-outline' },
  'Volleyball': { name: 'Volleyball', icon: 'basketball-outline' },
  'Badminton': { name: 'Badminton', icon: 'tennisball-outline' },
  'Ping_pong': { name: 'Ping-pong', icon: 'tennisball-outline' },
  'Swimming': { name: 'Natation', icon: 'water-outline' },
  'Running': { name: 'Course', icon: 'walk-outline' },
  'Cycling': { name: 'Vélo', icon: 'bicycle-outline' },
  'Climbing': { name: 'Escalade', icon: 'trending-up-outline' },
  'Hiking': { name: 'Randonnée', icon: 'walk-outline' }
};

interface UserStats {
  events_organized: number;
  avg_slots_per_event: number;
  upcoming_events: number;
  events_participated: number;
  total_participations: number;
  total_guests_brought: number;
  total_reviews: number;
  avg_rating: number;
  unique_partners: number;
}

const ProfileScreen: React.FC = () => {
  const { userProfile, user, isAuthenticated, authLoading, refreshProfile } = useAuth();
  const navigation = useNavigation();
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [userReviews, setUserReviews] = React.useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = React.useState(true);
  const [stats, setStats] = React.useState<any>(null);
  const [updatingImage, setUpdatingImage] = React.useState(false);

  // Gérer la mise à jour de l'image de profil
  const handleImageUpdate = async (imageUrl: string | null) => {
    if (!userProfile?.id) return;

    try {
      setUpdatingImage(true);
      const { success, error } = await userService.updateUserProfile({
        profile_picture_url: imageUrl,
      });

      if (success) {
        // Rafraîchir le profil local
        refreshProfile();
      } else {
        Alert.alert('Erreur', error || 'Impossible de mettre à jour la photo');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    } finally {
      setUpdatingImage(false);
    }
  };

  // Calcul de l'âge
  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = userProfile?.birth_date ? calculateAge(userProfile.birth_date) : 'N/A';

// Sports favoris de l'utilisateur avec normalisation et fallback
const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const SPORT_ALIASES: Record<string, SportId> = {
  'football': 'Football',
  'basketball': 'Basketball',
  'tennis': 'Tennis',
  'padel': 'Padel',
  'volleyball': 'Volleyball',
  'badminton': 'Badminton',
  'ping pong': 'Ping_pong',
  'ping_pong': 'Ping_pong',
  'ping-pong': 'Ping_pong',
  'swimming': 'Swimming',
  'natation': 'Swimming',
  'running': 'Running',
  'course': 'Running',
  'cycling': 'Cycling',
  'vélo': 'Cycling',
  'velo': 'Cycling',
  'climbing': 'Climbing',
  'escalade': 'Climbing',
  'hiking': 'Hiking',
  'randonnée': 'Hiking',
  'randonnee': 'Hiking',
};
const rawFavoriteSports = (userProfile?.favorite_sports || []) as string[];
const normalizedSports = rawFavoriteSports.map((s) => {
  const key = (s || '').toString().trim().toLowerCase();
  const mapped = SPORT_ALIASES[key] as SportId | undefined;
  return mapped ?? (null as unknown as SportId);
});
const displaySports = rawFavoriteSports.map((original, idx) => {
  const mapped = normalizedSports[idx];
  if (mapped && SPORTS_MAP[mapped]) {
    return { key: mapped, name: SPORTS_MAP[mapped].name, icon: SPORTS_MAP[mapped].icon };
  }
  // Fallback: afficher tel quel avec icône par défaut
  return { key: original, name: toTitle(original), icon: 'ellipse-outline' } as { key: string; name: string; icon: string };
});

  // Détecter les informations manquantes pour encourager à compléter le profil
  const missingFields: string[] = [];
  if (!userProfile?.birth_date) missingFields.push('âge');
  if (!userProfile?.region) missingFields.push('région');
  if (!rawFavoriteSports || rawFavoriteSports.length === 0) missingFields.push('sports favoris');

  // Charger les statistiques utilisateur
  React.useEffect(() => {
    const loadUserStats = async () => {
      if (userProfile?.id) {
        try {
          setLoadingStats(true);
          const stats = await eventsBackendService.getUserStats(userProfile.id);
          setUserStats(stats);
        } catch (error) {
          console.error('Erreur lors du chargement des statistiques:', error);
        } finally {
          setLoadingStats(false);
        }
      }
    };

    loadUserStats();
  }, [userProfile?.id]);

  // Charger les reviews de l'utilisateur
  React.useEffect(() => {
    const loadUserReviews = async () => {
      if (userProfile?.id) {
        try {
          setLoadingReviews(true);
          const { data, error } = await reviewsService.getUserReviews(userProfile.id);
          if (!error && data) {
            setUserReviews(data.slice(0, 3)); // Afficher seulement les 3 dernières
          }
        } catch (error) {
          console.error('Erreur lors du chargement des reviews:', error);
        } finally {
          setLoadingReviews(false);
        }
      }
    };

    loadUserReviews();
  }, [userProfile?.id]);

  // Rafraîchir le profil à chaque focus de l'écran
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        refreshProfile();
      }
      // run once per focus
      return undefined;
    }, [isAuthenticated])
  );

  // Si l'utilisateur n'est pas connecté
  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.notAuthenticatedContainer}>
          <Ionicons name="hourglass-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.notAuthenticatedText}>
            Chargement du profil...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.notAuthenticatedContainer}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.notAuthenticatedText}>
            Vous devez être connecté pour voir votre profil
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.notAuthenticatedContainer}>
          <Ionicons name="warning-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.notAuthenticatedText}>
            Profil utilisateur non trouvé
          </Text>
          <Text style={styles.notAuthenticatedSubtext}>
            Veuillez vous reconnecter
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ProfileImagePicker
            currentImageUrl={userProfile?.profile_picture_url || null}
            onImageUpdate={handleImageUpdate}
            size={80}
            editable={true}
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{userProfile?.username}</Text>
            <Text style={styles.fullName}>{userProfile?.first_name} {userProfile?.last_name}</Text>
            <Text style={styles.location}>{userProfile?.region || 'Région non définie'}</Text>
          </View>
        </View>
        <View style={styles.settingsWrapper}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings' as never)}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          {missingFields.length > 0 && <View style={styles.badgeDot} />}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerte subtile profil incomplet (même largeur que le contenu) */}
        {missingFields.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.incompleteCard}
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} style={styles.incompleteIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.incompleteTitle}>Profil incomplet</Text>
              <Text style={styles.incompleteText}>Ajoutez: {missingFields.join(', ')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            {loadingStats ? (
              // Affichage de chargement
              Array.from({ length: 3 }).map((_, index) => (
                <View key={index} style={styles.statCard}>
                  <View style={styles.loadingPlaceholder} />
                  <View style={styles.loadingPlaceholder} />
                  <View style={styles.loadingPlaceholderSmall} />
                </View>
              ))
            ) : (
              [
                { 
                  value: userStats 
                    ? ((userStats.events_participated || 0) + (userStats.events_organized || 0)).toString() 
                    : '0', 
                  label: 'Activités jouées', 
                  icon: 'trophy-outline' 
                },
                { 
                  value: (userStats?.unique_partners || 0).toString(), 
                  label: 'Partenaires uniques', 
                  icon: 'people-outline' 
                },
                { 
                  value: (userStats?.total_reviews || 0).toString(), 
                  label: 'Avis reçus', 
                  icon: 'star-outline' 
                },
              ].map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Ionicons name={stat.icon as keyof typeof Ionicons.glyphMap} size={24} color={COLORS.primary} style={styles.statIcon} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avis reçus</Text>
            {userReviews.length > 3 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => (navigation as any).navigate('Reviews')}
              >
                <Text style={styles.seeAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {loadingReviews ? (
            <View style={styles.loadingReviewsContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : userReviews.length > 0 ? (
            <>
              {/* Note moyenne */}
              <View style={styles.averageRatingCard}>
                <View style={styles.averageRatingLeft}>
                  <Text style={styles.averageRatingNumber}>
                    {stats ? parseFloat(stats.rating_average.toString()).toFixed(1) : '0.0'}
                  </Text>
                  <StarRating
                    rating={stats ? parseFloat(stats.rating_average.toString()) : 0}
                    size={18}
                    readonly
                    color={COLORS.accent}
                  />
                  <Text style={styles.averageRatingText}>
                    {stats?.total_reviews || 0} avis
                  </Text>
                </View>
                <View style={styles.averageRatingRight}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = stats?.reviews_by_rating[star] || 0;
                    const percentage = stats?.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
                    return (
                      <View key={star} style={styles.ratingBarRow}>
                        <Text style={styles.ratingBarLabel}>{star}</Text>
                        <Ionicons name="star" size={12} color={COLORS.accent} />
                        <View style={styles.ratingBarBackground}>
                          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Liste des derniers avis */}
              {userReviews.map((review, index) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Ionicons name="person" size={20} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>
                          {review.reviewer?.first_name} {review.reviewer?.last_name}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <StarRating
                      rating={review.rating}
                      size={16}
                      readonly
                      color={COLORS.accent}
                    />
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewText}>{review.comment}</Text>
                  )}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyReviewsContainer}>
              <Ionicons name="star-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyReviewsText}>Aucun avis reçu pour le moment</Text>
              <Text style={styles.emptyReviewsSubtext}>Participez à des événements pour recevoir des avis !</Text>
            </View>
          )}
        </View>

        {/* Frequent Players Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="people" size={24} color={COLORS.primary} style={styles.sectionTitleIcon} />
              <Text style={styles.sectionTitle}>Partenaires de jeu</Text>
            </View>
            {userStats && userStats.unique_partners > 4 && (
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>

          {loadingStats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : userStats && userStats.unique_partners > 0 ? (
            <>
              <View style={styles.partnersCountCard}>
                <View style={styles.partnersCountBadge}>
                  <Ionicons name="people" size={24} color="#fff" />
                </View>
                <View style={styles.partnersCountContent}>
                  <Text style={styles.partnersCountNumber}>{userStats.unique_partners}</Text>
                  <Text style={styles.partnersCountLabel}>
                    {userStats.unique_partners === 1 ? 'partenaire unique' : 'partenaires uniques'}
                  </Text>
                </View>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playersContainer}
              >
                {/* Afficher les vrais partenaires - temporairement mockés */}
                {Array.from({ length: Math.min(userStats.unique_partners, 6) }, (_, index) => {
                  const players = [
                    { name: 'Alex', initial: 'A', matches: 8, color: '#FF6B6B' },
                    { name: 'Sophia', initial: 'S', matches: 5, color: '#4ECDC4' },
                    { name: 'Marc', initial: 'M', matches: 3, color: '#45B7D1' },
                    { name: 'Julie', initial: 'J', matches: 2, color: '#FFA07A' },
                    { name: 'Thomas', initial: 'T', matches: 1, color: '#98D8C8' },
                    { name: 'Emma', initial: 'E', matches: 1, color: '#F7DC6F' },
                  ];

                  const player = players[index];
                  if (!player) return null;

                  return (
                    <TouchableOpacity key={player.name} style={styles.playerCard} activeOpacity={0.7}>
                      <View style={[styles.playerAvatar, { backgroundColor: player.color }]}>
                        <Text style={styles.playerInitial}>{player.initial}</Text>
                      </View>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <View style={styles.playerMatchesBadge}>
                        <Ionicons name="flash" size={12} color={COLORS.primary} />
                        <Text style={styles.playerMatchesText}>{player.matches}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyPartnersContainer}>
              <View style={styles.emptyPartnersIconContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.primary} style={styles.emptyPartnersIcon} />
              </View>
              <Text style={styles.emptyPartnersTitle}>Construisez votre réseau !</Text>
              <Text style={styles.emptyPartnersText}>
                Participez à des événements sportifs pour rencontrer de nouveaux partenaires de jeu
              </Text>
              <TouchableOpacity 
                style={styles.emptyPartnersButton}
                onPress={() => navigation.navigate('Discover' as never)}
              >
                <Text style={styles.emptyPartnersButtonText}>Découvrir des événements</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Favorite Sports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sports favoris</Text>
          <View style={styles.sportsContainer}>
            {displaySports.length > 0 ? (
              <View style={styles.sportGrid}>
                {displaySports.map((sport, index) => (
                  <View key={`${sport.key}-${index}`} style={styles.sportTile}>
                    <Ionicons name={sport.icon as any} size={32} color={COLORS.primary} style={styles.sportTileIcon} />
                    <Text style={styles.sportTileName} numberOfLines={1}>{sport.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptySportsContainer}>
                <Ionicons name="basketball-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptySportsText}>Aucun sport favori pour le moment</Text>
                <Text style={styles.emptySportsSubtext}>Ajoutez vos sports préférés dans les paramètres</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  fullName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  headerInfo: {
    marginLeft: 15,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  details: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  settingsWrapper: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  simpleBanner: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  simpleBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  simpleBannerText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  // Profile Image Picker Styles
  profileImagePicker: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileImageEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    padding: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
  },
  incompleteCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  incompleteIcon: {
    marginRight: 10,
  },
  incompleteTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  incompleteText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 4,
  },
  
  // Stats section
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCard: {
    width: cardWidth,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Reviews section
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginRight: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reviewText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  loadingReviewsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  averageRatingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  averageRatingLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minWidth: 100,
  },
  averageRatingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  averageRatingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  averageRatingRight: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: 12,
  },
  ratingBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginLeft: 6,
    marginRight: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  ratingBarCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    width: 20,
    textAlign: 'right',
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Section title with icon
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleIcon: {
    marginRight: 8,
  },

  // Partners count card
  partnersCountCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  partnersCountBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  partnersCountContent: {
    flex: 1,
  },
  partnersCountNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  partnersCountLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  // Players section
  playersContainer: {
    paddingRight: 20,
    paddingTop: 4,
  },
  playerCard: {
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    width: 100,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playerInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  playerMatchesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playerMatchesText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 2,
  },

  // Empty partners state
  emptyPartnersContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginTop: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyPartnersIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyPartnersIcon: {
    opacity: 0.6,
  },
  emptyPartnersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyPartnersText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyPartnersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyPartnersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },

  // Loading state
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sports section
  sportsContainer: {
    width: '100%',
    marginTop: 12,
  },
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sportTile: { width: '48%', aspectRatio: 1.2, marginBottom: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, alignItems: 'center', justifyContent: 'center' },
  sportTileIcon: { marginBottom: 8 },
  sportTileName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  emptySportsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginTop: 12,
  },
  emptySportsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySportsSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  notAuthenticatedSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingPlaceholder: {
    width: 20,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  loadingPlaceholderSmall: {
    width: 40,
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginTop: 12,
  },
  emptyReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default ProfileScreen;