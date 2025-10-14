
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { addHours, isPast } from 'date-fns';
// import for event details if needed later

const PRIMARY_COLOR = '#0C3B2E';

interface Participant {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface Conversation {
  _id: string;
  eventId: {
    _id: string;
    name: string;
    dateTime: string;
    duration: number;
  } | null;
  participants: Participant[];
  lastMessage: string;
  lastMessageSenderId?: string;
  lastMessageRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

const MessagesScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const isFocused = useIsFocused();
  const mountedRef = React.useRef(true);
  const inFlightRef = React.useRef(false);

  const fetchConversations = async () => {
    try {
      // Ne fetcher que si l'écran est focus et l'auth prête
      if (!isFocused || authLoading || !isAuthenticated || !userProfile?.id) return;
      if (inFlightRef.current) return;
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      if (!base) throw new Error('Backend URL non configurée');
      // À ce stade, auth est prête et userProfile existe
      inFlightRef.current = true;
      const response = await fetch(`${base}/conversations/user/${userProfile.id}`);
  
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des conversations');
      }
  
      const data = await response.json();
      const conversationsWithEventDetails: Conversation[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
  
      // Filtrer les conversations basées sur la date de fin de l'événement
      const filteredConversations = conversationsWithEventDetails.filter((conv: Conversation) => {
        if (!conv.eventId) return true; // Garder les conversations sans événement
  
        const eventEndTime = addHours(
          new Date(conv.eventId.dateTime),
          (conv.eventId.duration ?? 120) / 60
        );
        const archiveTime = addHours(eventEndTime, 24); // Archive après 24h
  
        // Garder la conversation si l'événement n'est pas fini depuis plus de 24h
        return !isPast(archiveTime);
      });
  
      // Trier les conversations : événements à venir en premier, puis par date de dernier message
      const sortedConversations = filteredConversations.sort((a: Conversation, b: Conversation) => {
        if (a.eventId && b.eventId) {
          return new Date(a.eventId.dateTime).getTime() - new Date(b.eventId.dateTime).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  
      if (mountedRef.current) {
        setConversations(sortedConversations);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        inFlightRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    if (isFocused && !authLoading && isAuthenticated && userProfile?.id) {
      fetchConversations();
    } else if (isFocused && !authLoading && !isAuthenticated) {
      setIsLoading(false);
      setConversations([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, authLoading, isAuthenticated, userProfile?.id]);

  // Realtime subscription séparé qui se déclenche quand conversations change
  useEffect(() => {
    if (!isFocused || authLoading || !isAuthenticated || !userProfile?.id || conversations.length === 0) {
      return;
    }

    console.log('🔔 Configuration Realtime pour', conversations.length, 'conversations');
    
    const convIds = conversations.map((c) => c._id);
    const channel = supabase.channel(`conversations:${userProfile.id}`);
    
    // Abonnements INSERT (nouveaux messages)
    convIds.forEach((id) => {
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`
      }, (payload) => {
        console.log('📨 Nouveau message Realtime dans MessagesScreen:', payload.eventType, payload.new);
        // Recharger la liste pour mettre à jour ordre/aperçu/gras
        fetchConversations();
      });
      
      // Abonnements UPDATE pour changements de read
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`
      }, (payload) => {
        console.log('📖 Message lu Realtime dans MessagesScreen:', payload.eventType, payload.new);
        fetchConversations();
      });
    });
    
    channel.subscribe();
    
    // Cleanup
    return () => {
      console.log('🧹 Nettoyage Realtime MessagesScreen');
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [conversations.length, isFocused, authLoading, isAuthenticated, userProfile?.id]);

  // interval géré dans le focus effect pour éviter les fuites au changement d'écran

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => (navigation as any).navigate('Chat' as never, { 
        conversationId: item._id, 
        eventId: item.eventId?._id,
        eventName: item.eventId?.name || 'Chat' 
      } as never)}
    >
      <View style={styles.conversationAvatar}>
        <Ionicons name="people" size={24} color="#FFF" />
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.eventName} numberOfLines={1}>
            {item.eventId?.name || 'Événement'}
          </Text>
          <Text style={styles.timestamp}>
            {formatLastMessageTime(item.updatedAt)}
          </Text>
        </View>
        <Text style={styles.participants} numberOfLines={1}>
          {`${item.participants.length} participant${item.participants.length > 1 ? 's' : ''}`}
        </Text>
        <Text
          style={[
            styles.lastMessage,
            item.lastMessage && item.lastMessageSenderId && item.lastMessageSenderId !== userProfile?.id && !item.lastMessageRead
              ? styles.lastMessageUnread
              : undefined
          ]}
          numberOfLines={1}
        >
          {item.lastMessage || 'Aucun message'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversations</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#0C3B2E" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0C3B2E" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#0C3B2E" />
            <Text style={styles.emptyText}>Aucune conversation</Text>
            <Text style={styles.emptySubtext}>
              Commencez à discuter avec d'autres sportifs !
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0C3B2E']} // Couleur personnalisée pour l'indicateur
              />
            }
          />
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
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
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0C3B2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  participants: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  lastMessageUnread: {
    color: '#000',
    fontWeight: '700',
  },
});

export default MessagesScreen;