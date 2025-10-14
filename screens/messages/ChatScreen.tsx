import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Message {
  _id: string;
  content: string;
  type?: 'text' | 'system';
  sender: {
    _id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  } | null;
  createdAt: string;
  read?: boolean; // Nouveau champ pour le système simple
  localStatus?: 'sending' | 'sent' | 'failed';
}

interface TypingUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

interface GroupedMessageItem {
  date: string;
  messages: Message[];
  firstMessageTime: string;
}

type ChatRouteParams = {
  conversationId: string;
  eventId?: string;
  eventName?: string;
  readOnly?: boolean;
};

const PRIMARY_COLOR = '#0C3B2E';
const SECONDARY_COLOR = '#e2e8f0';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, eventId, eventName, readOnly } = (route.params || {}) as ChatRouteParams;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [inputHeight, setInputHeight] = useState<number>(40);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<GroupedMessageItem>>(null);
  const { userProfile } = useAuth();
  const socketRef = useRef<any>(null); // removed realtime; kept ref to avoid wider refactor
  const scrollY = useRef(new Animated.Value(0)).current;

  const animatedOpacities = useRef<{ [key: string]: Animated.Value }>({}).current;
  const messageAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const messageScales = useRef<{ [key: string]: Animated.Value }>({}).current;
  const isReadOnly = !!readOnly;
  const senderCacheRef = useRef<{ [userId: string]: { firstName?: string; lastName?: string; username?: string } }>({});

  const getSenderProfile = async (userId?: string) => {
    if (!userId) return undefined;
    const cached = senderCacheRef.current[userId];
    if (cached) return cached;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .eq('id', userId)
        .single();
      const profile = data ? { firstName: (data as any).first_name, lastName: (data as any).last_name, username: (data as any).username } : undefined;
      if (profile) senderCacheRef.current[userId] = profile;
      return profile;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    console.log('🚀 useEffect ChatScreen - Chargement initial');
    console.log('📊 conversationId:', conversationId);
    console.log('👤 userProfile?.id:', userProfile?.id);
    
    fetchMessages();
    fetchUnreadCount();

    // Realtime messages via Supabase
    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const row: any = payload.new;
        setMessages((prev) => {
          // Si déjà présent par id, mettre à jour read/localStatus et ne pas dupliquer
          if (prev.some((m) => m._id === row.id)) {
            return prev.map((m) => m._id === row.id ? { ...m, read: !!row.read, localStatus: m.localStatus ?? 'sent' } : m);
          }
          // Essayer de fusionner avec un message optimiste (local sending/sent sans id serveur)
          const findTempCandidate = () => {
            // 1) id temp- prioritaire
            let idx = prev.findIndex((m) => m._id.startsWith?.('temp-') && m.sender?._id === row.sender_id && m.content === row.content);
            if (idx !== -1) return idx;
            // 2) sinon, message localStatus sending avec même contenu/expéditeur
            idx = prev.findIndex((m) => m.localStatus === 'sending' && m.sender?._id === row.sender_id && m.content === row.content);
            if (idx !== -1) return idx;
            return -1;
          };
          const tempIndex = findTempCandidate();
          const serverMsg: Message = {
            _id: row.id,
            content: row.content,
            type: row.type || 'text',
            sender: row.sender_id ? ({ _id: row.sender_id } as any) : null,
            createdAt: row.created_at || new Date().toISOString(),
            read: !!row.read,
            localStatus: 'sent' as const,
          };
          // Récupérer le nom de l'expéditeur en arrière-plan pour éviter le délai visuel
          if (row.sender_id) {
            getSenderProfile(row.sender_id).then((profile) => {
              if (profile) {
                setMessages((curr) => curr.map((m) => m._id === row.id ? { ...m, sender: { _id: row.sender_id, ...profile } as any } : m));
              }
            });
          }
          if (tempIndex !== -1) {
            const copy = [...prev];
            copy[tempIndex] = serverMsg;
            return copy;
          }
          return [...prev, serverMsg];
        });
        // Si on est dans la conv et que le message n'est pas le nôtre, marquer comme lu immédiatement
        if (row.sender_id && row.sender_id !== userProfile?.id) {
          markMessagesAsRead();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const row: any = payload.new;
        // Mettre à jour localement le statut read pour un affichage "Vu" instantané
        setMessages((prev) => prev.map((m) => m._id === row.id ? { ...m, read: !!row.read } : m));
      })
      .subscribe();

    // Typing indicator via broadcast
    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId: typerId, isTyping } = (payload?.payload || {}) as { userId?: string; isTyping?: boolean };
        
        // Debug logs
        console.log('Typing event received:', { typerId, isTyping, currentUserId: userProfile?.id });
        
        // Ne pas afficher si c'est l'utilisateur actuel
        if (!typerId || typerId === userProfile?.id) {
          console.log('Ignoring typing event from current user');
          return;
        }
        
        const updateTypingUsers = async () => {
          setTypingUsers(prev => {
            const has = prev.some(user => user.id === typerId);
            console.log('Current typing users:', prev.map(u => u.id), 'Checking:', typerId, 'Has:', has);
            
            if (isTyping && !has) {
              // Récupérer les informations de l'utilisateur
              supabase
                .from('users')
                .select('id, first_name, last_name, username')
                .eq('id', typerId)
                .single()
                .then(({ data: userData }) => {
                  const u: any = userData as any;
                  if (u) {
                    setTypingUsers(current => {
                      const alreadyExists = current.some(user => user.id === u.id);
                      if (!alreadyExists) {
                        return [...current, {
                          id: u.id,
                          firstName: u.first_name,
                          lastName: u.last_name,
                          username: u.username
                        }];
                      }
                      return current;
                    });
                  }
                });
              return prev; // Retourner l'état actuel en attendant la requête
            } else if (!isTyping && has) {
              return prev.filter((user) => user.id !== typerId);
            }
            
            return prev;
          });
        };
        
        updateTypingUsers();
      })
      .subscribe();

    // Polling fallback (au cas où Realtime n'est pas configuré)
    const interval = setInterval(fetchMessages, 10000);
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', scrollToBottom);
    return () => {
      clearInterval(interval);
      try { supabase.removeChannel(messagesChannel); } catch {}
      try { supabase.removeChannel(typingChannel); } catch {}
      keyboardDidShowListener.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const fetchMessages = async () => {
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      if (!base || !conversationId) {
        setLoading(false);
        return;
      }
      const token = await AsyncStorage.getItem('authToken');
      
      // Utiliser le nouvel endpoint avec statut de lecture (SIMPLE)
      console.log('📥 Utilisation du nouvel endpoint avec statut de lecture...');
      const res = await fetch(`${base}/messages/conversation/${conversationId}/with-read-status?limit=100&offset=0`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (!res.ok) {
        console.log('⚠️ Nouvel endpoint non disponible, utilisation du fallback');
        // Fallback vers l'ancien endpoint
        const fallbackRes = await fetch(`${base}/messages/conversation/${conversationId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);
        const fallbackData = await fallbackRes.json();
        const fallbackList: Message[] = Array.isArray(fallbackData?.data) ? fallbackData.data : Array.isArray(fallbackData) ? fallbackData : [];
        
        // Ajouter read: false par défaut pour le fallback
        const fallbackMessages = fallbackList.map(msg => ({
          ...msg,
          read: false
        }));
        
        console.log('📥 Messages récupérés via fallback:', fallbackMessages.length);
        setMessages(fallbackMessages);
        return;
      }
      
      const data = await res.json();
      const list: Message[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      console.log('📥 Messages récupérés avec statut read:', list.length);
      console.log('📋 Statuts read des messages:', list.map(m => ({
        id: m._id,
        read: m.read,
        content: m.content?.substring(0, 20) + '...'
      })));
      setMessages(list);
    } catch (e) {
      console.error('Erreur lors de la récupération des messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isReadOnly) return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      if (!base || !userProfile?.id || !conversationId) return;
      const token = await AsyncStorage.getItem('authToken');
      const payload = {
        content: newMessage,
        senderId: userProfile.id,
        conversationId,
      };

      // Ajout optimiste local
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimistic: Message = {
        _id: tempId,
        content: newMessage,
        type: 'text',
        sender: { _id: userProfile.id } as any,
        createdAt: new Date().toISOString(),
        read: false,
        localStatus: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);
      setNewMessage('');
      scrollToBottom();
      const res = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      const serverId = saved?.data?.id || saved?.id || saved?.message?.id || null;
      
      // Marquer envoyé/distribué
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m._id === tempId);
        if (idx === -1) return prev; // déjà remplacé via Realtime
        const copy = [...prev];
        copy[idx] = { ...copy[idx], _id: serverId || copy[idx]._id, localStatus: 'sent', createdAt: saved?.data?.createdAt || copy[idx].createdAt };
        // Enrichir le nom de l'expéditeur sans délai
        const sId = userProfile?.id;
        if (sId) {
          const cached = senderCacheRef.current[sId];
          if (cached) {
            copy[idx] = { ...copy[idx], sender: { _id: sId, ...cached } as any };
          } else {
            getSenderProfile(sId).then((profile) => {
              if (profile) {
                setMessages((curr) => curr.map((m) => m._id === (serverId || tempId) ? { ...m, sender: { _id: sId, ...profile } as any } : m));
              }
            });
          }
        }
        return copy;
      });
    } catch (e) {
      console.error("Erreur lors de l'envoi du message:", e);
      // Marquer l'optimiste en failed
      setMessages((prev) => prev.map((m) => m.localStatus === 'sending' ? { ...m, localStatus: 'failed' } : m));
    }
  };

  const retrySend = async (message: Message) => {
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      if (!base || !userProfile?.id || !conversationId) return;
      const token = await AsyncStorage.getItem('authToken');
      setMessages((prev) => prev.map((m) => m._id === message._id ? { ...m, localStatus: 'sending' } : m));
      const payload = {
        content: message.content,
        senderId: userProfile.id,
        conversationId,
      };
      const res = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      const serverId = saved?.data?.id || saved?.id || saved?.message?.id || null;
      setMessages((prev) => prev.map((m) => m._id === message._id ? { ...m, _id: serverId || m._id, localStatus: 'sent' } : m));
    } catch (err) {
      setMessages((prev) => prev.map((m) => m._id === message._id ? { ...m, localStatus: 'failed' } : m));
    }
  };

  // Emit typing state (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!conversationId) return;
      supabase.channel(`typing:${conversationId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: userProfile?.id, isTyping: !!newMessage.trim() }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [newMessage, conversationId, userProfile?.id]);

  // Marquer les messages comme vus quand l'utilisateur entre dans le chat
  useEffect(() => {
    console.log('📝 useEffect messages.length - messages.length:', messages.length, 'userProfile?.id:', userProfile?.id);
    if (messages.length > 0 && userProfile?.id) {
      console.log('📤 Appel de markMessagesAsRead depuis useEffect');
      markMessagesAsRead();
    }
  }, [messages.length, userProfile?.id]);

  const scrollToBottom = () => {
    console.log('📜 scrollToBottom appelé');
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    // Marquer les messages comme vus quand on fait défiler vers le bas
    console.log('⏰ Programmation de markMessagesAsRead dans 500ms');
    setTimeout(() => {
      console.log('📤 Appel de markMessagesAsRead depuis scrollToBottom');
      markMessagesAsRead();
    }, 500);
  };

  const fetchUnreadCount = async () => {
    console.log('🔍 fetchUnreadCount appelé');
    console.log('📊 conversationId:', conversationId);
    
    if (!conversationId) {
      console.log('❌ Pas de conversationId, arrêt');
      return;
    }
    
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      const token = await AsyncStorage.getItem('authToken');
      
      console.log('🌐 Backend URL:', base);
      console.log('🔑 Token disponible:', !!token);
      console.log(`📤 Requête vers: ${base}/messages/conversation/${conversationId}/unread-count`);
      
      const res = await fetch(`${base}/messages/conversation/${conversationId}/unread-count`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      console.log('📥 Réponse unread-count:', res.status, res.statusText);
      
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Données reçues:', data);
        const count = data.data?.unreadCount || 0;
        console.log('📊 Nombre de messages non lus:', count);
        setUnreadCount(count);
      } else {
        const errorText = await res.text();
        console.error('❌ Erreur unread-count:', res.status, errorText);
      }
    } catch (error) {
      console.error('💥 Erreur lors de la récupération du nombre de messages non lus:', error);
    }
  };

  const markMessagesAsRead = async () => {
    console.log('🔍 markMessagesAsRead appelé');
    console.log('📊 conversationId:', conversationId);
    console.log('👤 userProfile?.id:', userProfile?.id);
    console.log('📝 messages.length:', messages.length);
    
    if (!conversationId) {
      console.log('❌ Pas de conversationId, arrêt');
      return;
    }
    
    try {
      // Marquer tous les messages non lus comme vus
      const unreadMessages = messages.filter(msg => 
        msg.sender?._id !== userProfile?.id && 
        !msg.read
      );
      
      console.log('📋 Messages non lus trouvés:', unreadMessages.length);
      console.log('📋 Détails des messages non lus:', unreadMessages.map(m => ({
        id: m._id,
        sender: m.sender?._id,
        read: m.read,
        content: m.content?.substring(0, 20) + '...'
      })));
      
      if (unreadMessages.length === 0) {
        console.log('✅ Aucun message non lu, arrêt');
        return;
      }
      
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      const token = await AsyncStorage.getItem('authToken');
      
      console.log('🌐 Backend URL:', base);
      console.log('🔑 Token disponible:', !!token);
      
      // Marquer chaque message comme lu
      for (const message of unreadMessages) {
        try {
          console.log(`📤 Marquage du message ${message._id} comme lu...`);
          const response = await fetch(`${base}/messages/${message._id}/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          
          console.log(`📥 Réponse pour ${message._id}:`, response.status, response.statusText);
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Message ${message._id} marqué comme lu:`, result);
          } else {
            const errorText = await response.text();
            console.error(`❌ Erreur pour ${message._id}:`, response.status, errorText);
          }
        } catch (error) {
          console.error(`💥 Erreur pour le message ${message._id}:`, error);
        }
      }
      
      // Mettre à jour l'état local
      console.log('🔄 Mise à jour de l\'état local...');
      setMessages(prev => prev.map(msg => {
        if (unreadMessages.some(unread => unread._id === msg._id)) {
          console.log(`✅ Message ${msg._id} marqué comme lu localement`);
          return {
            ...msg,
            read: true
          };
        }
        return msg;
      }));
      
      // Mettre à jour le compteur
      console.log('📊 Mise à jour du compteur à 0');
      setUnreadCount(0);
      
    } catch (error) {
      console.error('💥 Erreur lors du marquage des messages comme vus:', error);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(event.nativeEvent.contentOffset.y);
  };

  const getBackgroundOpacity = (index: number) =>
    scrollY.interpolate({
      inputRange: [(index - 10) * 50, index * 50, (index + 10) * 50],
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

  const getMessageAnimation = (messageId: string) => {
    if (!messageAnimations[messageId]) {
      messageAnimations[messageId] = new Animated.Value(0);
    }
    return messageAnimations[messageId];
  };

  const getMessageScale = (messageId: string) => {
    if (!messageScales[messageId]) {
      messageScales[messageId] = new Animated.Value(1);
    }
    return messageScales[messageId];
  };

  const animateMessagePress = (messageId: string, isPressed: boolean) => {
    const animation = getMessageAnimation(messageId);
    const scale = getMessageScale(messageId);
    
    Animated.parallel([
      Animated.timing(animation, {
        toValue: isPressed ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: isPressed ? 0.95 : 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleMessageTimestamp = (messageId: string) => {
    setSelectedMessageIds((prev) => (prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]));
    if (!animatedOpacities[messageId]) animatedOpacities[messageId] = new Animated.Value(0);
    const toValue = selectedMessageIds.includes(messageId) ? 0 : 1;
    Animated.timing(animatedOpacities[messageId], { toValue, duration: 200, useNativeDriver: true }).start();
  };

  const formatDate = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return `Aujourd'hui, ${timeString}`;
    if (date.toDateString() === yesterday.toDateString()) return `Hier, ${timeString}`;
    return `${date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'numeric' })}, ${timeString}`;
  };

  const groupMessagesByDay = (list: Message[]) => {
    const grouped: { [key: string]: { messages: Message[]; firstMessageTime: string } } = {};
    list.forEach((m) => {
      const dateKey = new Date(m.createdAt).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          messages: [],
          firstMessageTime: new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
      }
      grouped[dateKey].messages.push(m);
    });
    Object.keys(grouped).forEach((k) => grouped[k].messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => ({ date, messages: grouped[date].messages, firstMessageTime: grouped[date].firstMessageTime }));
  };

  const groupedMessages = groupMessagesByDay(messages);
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null;

  const handleLongPress = (messageId: string) => {
    // Animation de vibration/haptic feedback
    animateMessagePress(messageId, true);
    
    setTimeout(() => {
      animateMessagePress(messageId, false);
      setSelectedMessageId(messageId);
      setContextMenuVisible(true);
    }, 100);
  };

  const handleCopy = async () => {
    if (selectedMessageId) {
      const message = messages.find((m) => m._id === selectedMessageId);
      if (message) {
        try {
          // Use navigator clipboard API if available (web), otherwise noop for native unless expo-clipboard is added
          await (navigator as any)?.clipboard?.writeText?.(message.content);
          Alert.alert('Message copié');
        } catch {}
      }
    }
    setContextMenuVisible(false);
  };

  const handleDelete = async () => {
    if (!selectedMessageId) return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      if (!base) return;
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${base}/messages/${selectedMessageId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessages((prev) => prev.filter((m) => m._id !== selectedMessageId));
      setContextMenuVisible(false);
    } catch (e) {
      console.error('Erreur lors de la suppression du message:', e);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.sender?._id === userProfile?.id;
    if (item.type === 'system' || !item.sender) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }
    return (
      <View>
        {!isCurrentUser && item.sender && (
          <Text style={styles.senderName}>
            {item.sender.firstName || ''} {item.sender.lastName || ''}
          </Text>
        )}
        <Animated.View
          style={[
            styles.messageWrapper, 
            isCurrentUser ? styles.currentUserWrapper : styles.otherUserWrapper,
            {
              transform: [{ scale: getMessageScale(item._id) }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.messageTouchable}
            onLongPress={() => isCurrentUser && handleLongPress(item._id)}
            onPressIn={() => animateMessagePress(item._id, true)}
            onPressOut={() => animateMessagePress(item._id, false)}
            activeOpacity={1}
          >
            <Animated.View 
              style={[
                styles.messageContainer, 
                isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                {
                  transform: [
                    {
                      scale: getMessageAnimation(item._id).interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View 
                style={[
                  styles.messageBackground, 
                  { 
                    opacity: getBackgroundOpacity(index),
                    backgroundColor: getMessageAnimation(item._id).interpolate({
                      inputRange: [0, 1],
                      outputRange: ['transparent', isCurrentUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'],
                    }),
                  }
                ]} 
              />
              <View style={styles.messageContent}>
                <Text style={[styles.messageText, { color: isCurrentUser ? '#FFFFFF' : '#000000' }]}>{item.content}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
          {selectedMessageIds.includes(item._id) && (
            <Animated.View style={{ opacity: animatedOpacities[item._id] || 0 }}>
              <Text style={styles.timestamp}>
                {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Animated.View>
          )}
          {/* Statut d'envoi / distribution / vu seulement pour le DERNIER message de l'utilisateur si aucun message après */}
          {isCurrentUser && item._id === lastMessageId && (
            <View style={styles.readReceiptContainer}>
              {item.localStatus === 'failed' ? (
                <TouchableOpacity style={styles.retryContainer} onPress={() => retrySend(item)}>
                  <Icon name="alert-circle" size={14} color="#EF4444" />
                  <Text style={[styles.readReceiptText, { color: '#EF4444' }]}>Échec. Renvoyer</Text>
                </TouchableOpacity>
              ) : item.read ? (
                <>
                  <Icon name="checkmark-done" size={14} color="#4A90E2" />
                  <Text style={styles.readReceiptText}>Vu</Text>
                </>
              ) : (
                <>
                  <Icon name="checkmark" size={14} color="#64748B" />
                  <Text style={[styles.readReceiptText, { color: '#64748B' }]}>Distribué</Text>
                </>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    );
  };

  const renderDayHeader = (date: string, time: string) => (
    <View style={styles.dayHeaderContainer}>
      <Text style={styles.dayHeaderText}>{formatDate(date, time)}</Text>
    </View>
  );

  const renderGroup = ({ item }: { item: GroupedMessageItem }) => (
    <View>
      {renderDayHeader(item.date, item.firstMessageTime)}
      {item.messages.map((m, idx) => (
        <View key={m._id}>{renderMessage({ item: m, index: idx })}</View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{eventName || 'Chat'}</Text>
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => {
              if (eventId) {
                (navigation as any).navigate('EventDetails', { eventId, fromChat: true });
              } else {
                Alert.alert('Erreur', 'ID de l\'événement non disponible');
              }
            }}
          >
            <Icon name="information-circle-outline" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      {typingUsers.length > 0 && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>
            {typingUsers.length === 1 
              ? `${typingUsers[0].firstName || typingUsers[0].username || 'Quelqu\'un'} est en train d'écrire…`
              : `${typingUsers.map(user => user.firstName || user.username || 'Quelqu\'un').join(', ')} écrivent…`
            }
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={renderGroup}
          keyExtractor={(it) => it.date}
          contentContainerStyle={styles.messagesContainer}
          inverted
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />

        {!isReadOnly && (
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                { height: inputHeight }
              ]}
              placeholder="Écrire un message..."
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              onFocus={scrollToBottom}
              multiline
              textAlignVertical="top"
              blurOnSubmit={false}
              onContentSizeChange={(e) => {
                const contentHeight = e.nativeEvent.contentSize.height;
                const MIN_HEIGHT = 40; // ~1 ligne
                const LINE_HEIGHT = 20; // approximatif pour fs=15
                const MAX_HEIGHT = MIN_HEIGHT + (LINE_HEIGHT * 3); // total ~4 lignes
                const next = Math.min(Math.max(contentHeight, MIN_HEIGHT), MAX_HEIGHT);
                setInputHeight(next);
              }}
              scrollEnabled={inputHeight > 40 + (20 * 3)}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Icon name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal transparent visible={contextMenuVisible} onRequestClose={() => setContextMenuVisible(false)}>
        <TouchableOpacity style={styles.contextMenuOverlay} onPress={() => setContextMenuVisible(false)}>
          <Animated.View style={styles.contextMenu}>
            <View style={styles.contextMenuHeader}>
              <Text style={styles.contextMenuTitle}>Actions</Text>
            </View>
            <TouchableOpacity style={styles.contextMenuItem} onPress={handleCopy}>
              <Icon name="copy-outline" size={20} color="#007AFF" />
              <Text style={styles.contextMenuText}>Copier</Text>
            </TouchableOpacity>
            <View style={styles.contextMenuSeparator} />
            <TouchableOpacity style={[styles.contextMenuItem, styles.contextMenuDeleteItem]} onPress={handleDelete}>
              <Icon name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.contextMenuText, styles.contextMenuDeleteText]}>Supprimer</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: SECONDARY_COLOR,
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: PRIMARY_COLOR, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  dayHeaderContainer: { alignItems: 'center', marginVertical: 12 },
  dayHeaderText: { fontSize: 12, color: '#4a5568', fontWeight: '500' },
  messageWrapper: { maxWidth: '85%', marginBottom: 12 },
  currentUserWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherUserWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageContainer: { 
    paddingVertical: 14, 
    paddingHorizontal: 18, 
    borderRadius: 22, 
    overflow: 'hidden', 
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 44,
  },
  messageBackground: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    borderRadius: 22,
  },
  messageContent: { 
    position: 'relative',
    zIndex: 1,
  },
  currentUserMessage: { 
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  otherUserMessage: { 
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  senderName: { fontSize: 10, color: '#64748b', marginBottom: 4, marginLeft: 10 },
  systemMessageContainer: { 
    alignSelf: 'center', 
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 16, 
    marginVertical: 10,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  systemMessageText: { 
    fontSize: 13, 
    color: '#2E7D32', 
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  messageText: { fontSize: 16, color: '#000', lineHeight: 20 },
  timestamp: { fontSize: 10, color: '#A1A1A1', marginTop: 4, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: SECONDARY_COLOR, backgroundColor: '#FFF' },
  input: { flex: 1, padding: 10, backgroundColor: SECONDARY_COLOR, borderRadius: 20, fontSize: 15, marginRight: 8, maxHeight: 120, lineHeight: 20 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY_COLOR, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#94A3B8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contextMenuOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contextMenu: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 0, 
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  contextMenuHeader: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  contextMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  contextMenuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, 
    paddingHorizontal: 20,
    gap: 12,
  },
  contextMenuDeleteItem: {
    backgroundColor: '#FFF5F5',
  },
  contextMenuText: { 
    fontSize: 16, 
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
  },
  contextMenuDeleteText: {
    color: '#FF3B30',
  },
  contextMenuSeparator: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginHorizontal: 20,
  },
  typingBar: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  typingText: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  
  // Read Receipt Styles
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  retryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readReceiptText: {
    fontSize: 10,
    color: '#4A90E2',
    fontStyle: 'italic',
  },
});


