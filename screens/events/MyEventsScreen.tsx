import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Database } from '../../types/database';
import { eventsBackendService, EventWithDistance } from '../../services/events-backend';
import { Colors } from '../../constants/Colors';
import { Theme } from '../../constants/Theme';
import { EventCardMyevent, FilterTabs, ActivityTypeFilter } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

const PRIMARY_COLOR = '#0C3B2E';

export default function MyEventsScreen() {
  const navigation = useNavigation();
  const { user, userId, isAuthenticated, loading: authLoading, refreshProfile } = useAuth();
  const inFlightRef = React.useRef(false);
  const isFocused = useIsFocused();
  const [selectedTab, setSelectedTab] = useState<'created' | 'joined'>('created');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'upcoming' | 'past'>('upcoming');
  const [createdEvents, setCreatedEvents] = useState<EventWithDistance[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<EventWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async (showLoader = true) => {
    try {
      // Ne lance pas si écran non focus ou auth non prête
      if (!isFocused || authLoading || !isAuthenticated || !userId) return;
      if (inFlightRef.current) return;
      if (showLoader) setLoading(true);
      inFlightRef.current = true;

      // Récupérer les événements créés par l'utilisateur
      const { data: created, error: createdError } = await eventsBackendService.getUserCreatedEvents(userId, {
        timeframe: selectedTimeframe,
        limit: 50,
        offset: 0
      });

      if (createdError) {
        console.error('Erreur lors de la récupération des événements créés:', createdError);
        setCreatedEvents([]);
      } else {
        setCreatedEvents(created);
      }

      // Récupérer les événements rejoints par l'utilisateur
      const { data: joined, error: joinedError } = await eventsBackendService.getUserJoinedEvents(userId, {
        timeframe: selectedTimeframe,
        limit: 50,
        offset: 0
      });

      if (joinedError) {
        console.error('Erreur lors de la récupération des événements rejoints:', joinedError);
        setJoinedEvents([]);
      } else {
        setJoinedEvents(joined);
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
    } finally {
      inFlightRef.current = false;
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  // Chargement des événements avec reset
  useEffect(() => {
    if (isFocused && !authLoading && isAuthenticated && userId) {
      // Reset immédiat avant de charger
      setCreatedEvents([]);
      setJoinedEvents([]);
      setLoading(true);
      // Petit délai pour s'assurer que le state est bien réinitialisé
      setTimeout(() => fetchEvents(), 10);
    } else if (isFocused && !authLoading && !isAuthenticated) {
      setLoading(false);
      setCreatedEvents([]);
      setJoinedEvents([]);
    }
  }, [isFocused, selectedTimeframe, selectedTab, authLoading, isAuthenticated, userId]);

  // Rechargement silencieux à chaque focus
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated && userId) {
        fetchEvents(false);
      } else if (!authLoading && !isAuthenticated) {
        refreshProfile();
      }
    }, [authLoading, isAuthenticated, userId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (isFocused && !authLoading && isAuthenticated && userId) {
      fetchEvents();
    } else {
      setRefreshing(false);
    }
  }, []);

  const sections = useMemo(() => {
    let events = selectedTab === 'created' ? createdEvents : joinedEvents;

    const groupedEvents = events.reduce((acc: { [key: string]: EventWithDistance[] }, event) => {
      const eventDate = new Date(event.date_time);
      const dateKey = eventDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {});

    return Object.entries(groupedEvents).map(([title, data]) => ({
      title,
      data,
    }));
  }, [selectedTab, selectedTimeframe, createdEvents, joinedEvents]);

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const handleEventPress = (event: EventWithDistance) => {
    if (selectedTab === 'created') {
      (navigation as any).navigate('EventAdmin', { eventId: event.id });
    } else {
      (navigation as any).navigate('EventDetails', { eventId: event.id, fromFeed: false });
    }
  };

  const handleAddReview = (event: EventWithDistance) => {
    console.log("Ajouter un avis pour l'événement:", event.name);
    (navigation as any).navigate('RateParticipants', { 
      eventId: event.id,
      eventName: event.name,
    });
  };

  const renderEvent = ({ item, index }: { item: EventWithDistance; index: number }) => {
    const isFirstItem = index === 0;
    const now = new Date();
    const eventDate = new Date(item.date_time);
    const isPast = eventDate < now;

    return (
      <View style={isFirstItem ? { paddingTop: 10 } : null}>
        <EventCardMyevent
          event={item}
          onPress={handleEventPress}
          isPast={selectedTimeframe === 'past' && isPast}
          onAddReview={handleAddReview}
          currentUserId={userId || undefined}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Activités</Text>
      </View>

      {!isAuthenticated && !authLoading ? (
        <View style={styles.notAuthenticatedContainer}>
          <Text style={styles.notAuthenticatedText}>
            Vous devez être connecté pour voir vos événements
          </Text>
        </View>
      ) : (
        <>
          <ActivityTypeFilter
            selectedType={selectedTab}
            onTypeChange={setSelectedTab}
            createdCount={createdEvents.length}
            joinedCount={joinedEvents.length}
          />

          <FilterTabs
            tabs={[
              { id: 'upcoming', label: 'À venir' },
              { id: 'past', label: 'Historique' },
            ]}
            selectedTab={selectedTimeframe}
            onTabChange={(tabId) => setSelectedTimeframe(tabId as 'upcoming' | 'past')}
          />

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
          ) : (
            <SectionList
              key={`${selectedTab}-${selectedTimeframe}`}
              sections={sections}
              renderItem={renderEvent}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.id}
              style={{ backgroundColor: '#FFF' }}
              contentContainerStyle={styles.listContainer}
              stickySectionHeadersEnabled={true}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[PRIMARY_COLOR]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
                  <Text style={styles.emptyTitle}>Aucun événement</Text>
                  <Text style={styles.emptySubtitle}>
                    {selectedTab === 'created' 
                      ? "Vous n'organisez aucun événement" 
                      : "Vous ne participez à aucun événement"
                    }
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFF',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    marginHorizontal: -16,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});



