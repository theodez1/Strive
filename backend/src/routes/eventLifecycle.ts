import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Fonction pour calculer la fin d'un événement
function getEventEndTime(dateTime: Date, durationMinutes: number): Date {
  return new Date(dateTime.getTime() + (durationMinutes * 60 * 1000));
}

// Fonction pour détecter les événements qui viennent de se terminer
async function getRecentlyEndedEvents() {
  const now = new Date();
  
  // Récupérer tous les événements
  const events = await prisma.event.findMany({
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, username: true }
          }
        }
      },
      organizer: {
        select: { id: true, firstName: true, lastName: true, username: true }
      },
      conversation: {
        select: { id: true }
      }
    }
  });

  const recentlyEndedEvents = [];

  for (const event of events) {
    const eventEndTime = getEventEndTime(event.dateTime, event.duration);
    
    // Vérifier si l'événement s'est terminé dans les dernières 5 minutes
    // (pour éviter les doublons et gérer les délais)
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    if (eventEndTime >= oneHourAgo && eventEndTime <= fiveMinutesAgo) {
      recentlyEndedEvents.push({
        event,
        endTime: eventEndTime,
        allParticipants: [
          ...event.participants.map(p => p.user),
          event.organizer
        ]
      });
    }
  }

  return recentlyEndedEvents;
}

// Endpoint pour traiter les événements terminés (à appeler périodiquement)
router.post('/process-ended-events', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Début du traitement des événements terminés...');
    
    const recentlyEndedEvents = await getRecentlyEndedEvents();
    
    console.log(`📊 ${recentlyEndedEvents.length} événement(s) récemment terminé(s) trouvé(s)`);
    
    const results = [];
    
    for (const { event, endTime, allParticipants } of recentlyEndedEvents) {
      console.log(`🎯 Traitement de l'événement "${event.name}" (${event.id})`);
      
      // 1. Supprimer la conversation et tous les messages
      if (event.conversation) {
        console.log(`🗑️ Suppression de la conversation ${event.conversation.id}`);
        
        // Supprimer tous les messages de la conversation
        await prisma.message.deleteMany({
          where: { conversationId: event.conversation.id }
        });
        
        // Supprimer la conversation
        await prisma.conversation.delete({
          where: { id: event.conversation.id }
        });
        
        console.log(`✅ Conversation et messages supprimés pour "${event.name}"`);
      }
      
      // 2. Créer des notifications pour les reviews
      const reviewNotifications = allParticipants.map(participant => ({
        userId: participant.id,
        type: 'EVENT_REVIEW_REQUEST',
        title: `Événement terminé: ${event.name}`,
        body: `Comment s'est passé l'événement "${event.name}" ? Partagez votre avis !`,
        data: {
          eventId: event.id,
          eventName: event.name,
          eventDate: event.dateTime.toISOString(),
          sport: event.sport,
          locationName: event.locationName,
          organizerId: event.organizerId,
          organizerName: `${event.organizer.firstName} ${event.organizer.lastName}`.trim()
        }
      }));
      
      // Insérer les notifications
      await prisma.notification.createMany({
        data: reviewNotifications
      });
      
      console.log(`📬 ${reviewNotifications.length} notifications créées pour "${event.name}"`);
      
      results.push({
        eventId: event.id,
        eventName: event.name,
        endTime: endTime.toISOString(),
        messagesDeleted: true,
        notificationsCreated: reviewNotifications.length
      });
    }
    
    res.json({
      success: true,
      message: `${recentlyEndedEvents.length} événement(s) traité(s)`,
      results
    });
    
  } catch (error) {
    console.error('💥 Erreur lors du traitement des événements terminés:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement des événements terminés'
    });
  }
});

// Endpoint pour tester manuellement (à supprimer en production)
router.get('/test-ended-events', async (req: Request, res: Response) => {
  try {
    const recentlyEndedEvents = await getRecentlyEndedEvents();
    
    res.json({
      success: true,
      message: `Test: ${recentlyEndedEvents.length} événement(s) récemment terminé(s)`,
      events: recentlyEndedEvents.map(({ event, endTime }) => ({
        id: event.id,
        name: event.name,
        dateTime: event.dateTime.toISOString(),
        duration: event.duration,
        endTime: endTime.toISOString(),
        participantsCount: event.participants.length,
        hasConversation: !!event.conversation
      }))
    });
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test'
    });
  }
});

export default router;

