import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const expo = new Expo();

export interface PushNotificationData {
  type: string;
  eventId?: string;
  eventName?: string;
  sport?: string;
  organizerName?: string;
  [key: string]: any;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

/**
 * Envoie une notification push à un utilisateur spécifique
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer l'utilisateur et ses tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true, firstName: true, lastName: true }
    });

    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      console.log(`📱 Aucun token trouvé pour l'utilisateur ${userId}`);
      return { success: false, error: 'Aucun token de device trouvé' };
    }

    // Créer les messages pour chaque token
    const messages: ExpoPushMessage[] = user.deviceTokens
      .filter(token => Expo.isExpoPushToken(token))
      .map(token => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: payload.sound || 'default',
        badge: payload.badge,
        channelId: payload.channelId || 'default',
      }));

    if (messages.length === 0) {
      console.log(`📱 Aucun token Expo valide trouvé pour l'utilisateur ${userId}`);
      return { success: false, error: 'Aucun token Expo valide' };
    }

    // Envoyer les notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Erreur lors de l\'envoi d\'un chunk:', error);
      }
    }

    // Traiter les tickets (pour les erreurs)
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error(`❌ Erreur notification ${index}:`, ticket.message);
        
        // Si le token est invalide, le supprimer de la base
        if (ticket.details?.error === 'DeviceNotRegistered') {
          const token = user.deviceTokens[index];
          if (token) {
            removeInvalidToken(userId, token);
          }
        }
      } else {
        console.log(`✅ Notification ${index} envoyée avec succès`);
      }
    });

    const successCount = tickets.filter(t => t.status === 'ok').length;
    console.log(`📱 ${successCount}/${tickets.length} notifications envoyées à l'utilisateur ${userId}`);

    return { success: successCount > 0 };

  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification push:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Envoie une notification push à plusieurs utilisateurs
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, payload))
  );

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      errorCount++;
      const error = result.status === 'rejected' 
        ? result.reason 
        : result.value.error;
      errors.push(`Utilisateur ${userIds[index]}: ${error}`);
    }
  });

  console.log(`📱 Notifications envoyées: ${successCount} succès, ${errorCount} erreurs`);
  return { successCount, errorCount, errors };
}

/**
 * Supprime un token invalide de la base de données
 */
async function removeInvalidToken(userId: string, invalidToken: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true }
    });

    if (user && user.deviceTokens) {
      const updatedTokens = user.deviceTokens.filter(token => token !== invalidToken);
      
      await prisma.user.update({
        where: { id: userId },
        data: { deviceTokens: updatedTokens }
      });

      console.log(`🗑️ Token invalide supprimé pour l'utilisateur ${userId}`);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du token invalide:', error);
  }
}

/**
 * Envoie une notification de fin d'événement avec demande de review
 */
export async function sendEventEndNotification(
  eventId: string,
  eventName: string,
  sport: string,
  organizerName: string,
  userIds: string[]
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: `Événement terminé: ${eventName}`,
    body: `Comment s'est passé l'événement "${eventName}" ? Partagez votre avis !`,
    data: {
      type: 'EVENT_REVIEW_REQUEST',
      eventId,
      eventName,
      sport,
      organizerName,
    },
    sound: 'default',
    badge: 1,
  };

  const result = await sendPushNotificationToUsers(userIds, payload);
  
  if (result.successCount > 0) {
    console.log(`✅ Notification de fin d'événement envoyée à ${result.successCount} utilisateurs pour l'événement "${eventName}"`);
  }
  
  if (result.errorCount > 0) {
    console.error(`❌ Erreurs lors de l'envoi des notifications:`, result.errors);
  }
}

/**
 * Envoie une notification pour un nouveau message
 */
export async function sendNewMessageNotification(
  conversationId: string,
  senderName: string,
  messagePreview: string,
  userIds: string[]
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: `Nouveau message de ${senderName}`,
    body: messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
    data: {
      type: 'NEW_MESSAGE',
      conversationId,
      senderName,
    },
    sound: 'default',
    badge: 1,
  };

  const result = await sendPushNotificationToUsers(userIds, payload);
  
  if (result.successCount > 0) {
    console.log(`✅ Notification de nouveau message envoyée à ${result.successCount} utilisateurs`);
  }
}

/**
 * Envoie une notification pour une nouvelle demande de participation
 */
export async function sendParticipationRequestNotification(
  eventId: string,
  eventName: string,
  requesterName: string,
  organizerId: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: `Nouvelle demande de participation`,
    body: `${requesterName} souhaite rejoindre votre événement "${eventName}"`,
    data: {
      type: 'PARTICIPATION_REQUEST',
      eventId,
      eventName,
      requesterName,
    },
    sound: 'default',
    badge: 1,
  };

  const result = await sendPushNotification(organizerId, payload);
  
  if (result.success) {
    console.log(`✅ Notification de demande de participation envoyée à l'organisateur de "${eventName}"`);
  } else {
    console.error(`❌ Erreur lors de l'envoi de la notification de demande:`, result.error);
  }
}

