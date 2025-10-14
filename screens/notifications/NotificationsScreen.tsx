import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMARY_COLOR = '#0C3B2E';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: {
    eventId?: string;
    eventName?: string;
    sport?: string;
    organizerName?: string;
  };
  readAt: string | null;
  createdAt: string;
}

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { userProfile, isAuthenticated } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${base}/notifications/${userProfile.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des notifications');
      }

      const data = await response.json();
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Erreur fetchNotifications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      const token = await AsyncStorage.getItem('authToken');
      
      await fetch(`${base}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, readAt: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Erreur markAsRead:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }

    // Naviguer selon le type
    if (notification.type === 'EVENT_REVIEW_REQUEST' && notification.data?.eventId) {
      // Naviguer vers l'écran de review
      (navigation as any).navigate('ReviewEvent', { 
        eventId: notification.data.eventId,
        eventName: notification.data.eventName 
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Maintenant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR');
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.readAt && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons 
          name={item.type === 'EVENT_REVIEW_REQUEST' ? 'star-outline' : 'notifications-outline'} 
          size={24} 
          color={item.readAt ? '#999' : PRIMARY_COLOR} 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !item.readAt && styles.unreadText
        ]}>
          {item.title}
        </Text>
        
        <Text style={styles.notificationBody}>
          {item.body}
        </Text>
        
        <Text style={styles.notificationTime}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
      
      {!item.readAt && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isAuthenticated && userProfile?.id) {
      fetchNotifications();
    }
  }, [isAuthenticated, userProfile?.id, fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && userProfile?.id) {
        fetchNotifications();
      }
    }, [isAuthenticated, userProfile?.id, fetchNotifications])
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()}>
          <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.headerRight}>
          <Ionicons name="checkmark-done" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>Aucune notification</Text>
          <Text style={styles.emptySubtext}>
            Vous recevrez des notifications pour vos événements
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PRIMARY_COLOR]}
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  headerRight: {
    width: 24,
    height: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E5E5',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
    borderLeftColor: PRIMARY_COLOR,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    color: '#000',
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default NotificationsScreen;

