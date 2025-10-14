import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { eventsService } from '../../services/events';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';

interface JoinEventButtonProps {
  eventId: string;
  availableSlots: number;
  totalSlots: number;
  onJoinSuccess?: () => void;
  onLeaveSuccess?: () => void;
  style?: any;
  textStyle?: any;
  showIcon?: boolean;
  compact?: boolean;
}

const JoinEventButton: React.FC<JoinEventButtonProps> = ({
  eventId,
  availableSlots,
  totalSlots,
  onJoinSuccess,
  onLeaveSuccess,
  style,
  textStyle,
  showIcon = true,
  compact = false,
}) => {
  const { userId } = useAuth();
  const [isParticipating, setIsParticipating] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (userId) {
      checkParticipationStatus();
    }
  }, [eventId, userId]);

  const checkParticipationStatus = async () => {
    if (!userId) return;
    
    try {
      setIsChecking(true);
      
      // Vérifier si l'utilisateur participe déjà
      const { data: participants } = await eventsService.getParticipantsByEvent(eventId);
      const isParticipant = participants.some(p => p.user_id === userId);
      setIsParticipating(isParticipant);
      
      // Vérifier s'il y a une demande en attente
      const { data: pendingRequests } = await eventsService.getPendingRequestsByEvent(eventId);
      const hasRequest = pendingRequests.some((r: any) => r.user_id === userId);
      setHasPendingRequest(hasRequest);
      
    } catch (error) {
      console.error('Erreur lors de la vérification de participation:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!userId) {
      Alert.alert('Erreur', 'Vous devez être connecté pour rejoindre un événement');
      return;
    }

    if (isParticipating) {
      // L'utilisateur participe déjà, proposer de quitter
      Alert.alert(
        'Quitter l\'événement',
        'Êtes-vous sûr de vouloir quitter cet événement ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Quitter', 
            style: 'destructive',
            onPress: handleLeaveEvent
          }
        ]
      );
    } else if (hasPendingRequest) {
      // L'utilisateur a déjà une demande en attente
      Alert.alert(
        'Demande en attente',
        'Vous avez déjà une demande de participation en attente pour cet événement.',
        [{ text: 'OK' }]
      );
    } else {
      // L'utilisateur ne participe pas, proposer de faire une demande
      if (availableSlots <= 0) {
        Alert.alert(
          'Événement complet',
          'Désolé, cet événement est complet.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Demander le nombre d'invités et un commentaire optionnel
      Alert.prompt(
        'Demander à rejoindre l\'événement',
        'Combien d\'invités souhaitez-vous amener ? (0 si aucun)',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Envoyer la demande', 
            onPress: (guestsText) => {
              const guests = parseInt(guestsText || '0', 10) || 0;
              if (guests < 0) {
                Alert.alert('Erreur', 'Le nombre d\'invités ne peut pas être négatif.');
                return;
              }
              if (availableSlots < guests + 1) {
                Alert.alert('Erreur', 'Pas assez de places disponibles pour vous et vos invités.');
                return;
              }
              
              // Demander un commentaire optionnel
              Alert.prompt(
                'Commentaire (optionnel)',
                'Voulez-vous ajouter un commentaire à votre demande ?',
                [
                  { text: 'Passer', onPress: () => requestToJoin(guests) },
                  { 
                    text: 'Ajouter', 
                    onPress: (comment) => requestToJoin(guests, comment)
                  }
                ],
                'plain-text',
                ''
              );
            }
          }
        ],
        'plain-text',
        '0'
      );
    }
  };

  const requestToJoin = async (guests: number = 0, comment?: string) => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const { error } = await eventsService.requestToJoin(eventId, userId, guests, comment);
      
      if (error) {
        Alert.alert('Erreur', (error as any).message || 'Impossible d\'envoyer la demande');
        return;
      }
      
      // Mettre à jour l'état local
      setHasPendingRequest(true);
      
      // Callback de succès
      if (onJoinSuccess) {
        onJoinSuccess();
      }
      
      Alert.alert(
        'Demande envoyée', 
        `Votre demande de participation${guests > 0 ? ` avec ${guests} invité${guests > 1 ? 's' : ''}` : ''} a été envoyée à l'organisateur.`
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de la demande');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const { error } = await eventsService.leaveEvent(eventId, userId);
      
      if (error) {
        Alert.alert('Erreur', error.message || 'Impossible de quitter l\'événement');
        return;
      }
      
      // Mettre à jour l'état local
      setIsParticipating(false);
      
      // Callback de succès
      if (onLeaveSuccess) {
        onLeaveSuccess();
      }
      
      Alert.alert('Succès', 'Vous avez quitté l\'événement');
    } catch (error) {
      console.error('Erreur lors de la sortie:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sortie');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton, style]} disabled>
        <ActivityIndicator size="small" color="#FFF" />
        {!compact && <Text style={[styles.buttonText, textStyle]}>Chargement...</Text>}
      </TouchableOpacity>
    );
  }

  const isEventFull = availableSlots <= 0;
  const canRequest = !isParticipating && !hasPendingRequest && !isEventFull && !isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isParticipating && styles.leaveButton,
        hasPendingRequest && styles.pendingButton,
        !canRequest && styles.disabledButton,
        style,
      ]}
      onPress={handleJoinEvent}
      disabled={isLoading || isEventFull}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          {showIcon && (
            <Ionicons
              name={
                isParticipating 
                  ? "exit-outline" 
                  : hasPendingRequest 
                    ? "time-outline" 
                    : "add-outline"
              }
              size={16}
              color="#FFF"
              style={styles.icon}
            />
          )}
          <Text style={[styles.buttonText, textStyle]}>
            {isParticipating 
              ? (compact ? 'Quitter' : 'Quitter l\'événement')
              : hasPendingRequest
                ? (compact ? 'En attente' : 'Demande en attente')
              : isEventFull 
                ? 'Complet'
                : (compact ? 'Demander' : 'Demander à rejoindre')
            }
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  leaveButton: {
    backgroundColor: '#EF4444',
  },
  pendingButton: {
    backgroundColor: '#F59E0B',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  loadingButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: 6,
  },
});

export default JoinEventButton;
