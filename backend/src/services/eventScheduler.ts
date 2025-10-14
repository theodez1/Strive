import { PrismaClient } from '@prisma/client';
import { sendEventEndNotification } from './pushNotificationService';

const prisma = new PrismaClient();

// Map pour stocker les timers
const eventTimers = new Map<string, NodeJS.Timeout>();

// Fonction pour programmer la fin d'un événement
export async function scheduleEventEnd(eventId: string, endTime: Date) {
  const delay = endTime.getTime() - Date.now();
  
  if (delay > 0) {
    console.log(`⏰ Programmation de la fin de l'événement ${eventId} dans ${Math.round(delay / 1000)}s`);
    
    // Annuler le timer existant s'il y en a un
    if (eventTimers.has(eventId)) {
      clearTimeout(eventTimers.get(eventId)!);
    }
    
    // Programmer le nouveau timer
    const timer = setTimeout(async () => {
      await processEventEnd(eventId);
      eventTimers.delete(eventId);
    }, delay);
    
    eventTimers.set(eventId, timer);
    
    // Backup timer (1h après la fin)
    setTimeout(async () => {
      await processEventEnd(eventId);
    }, delay + (60 * 60 * 1000));
    
  } else {
    // L'événement est déjà fini, le traiter immédiatement
    await processEventEnd(eventId);
  }
}

// Fonction pour traiter la fin d'un événement
async function processEventEnd(eventId: string) {
  try {
    console.log(`🔄 Traitement de la fin de l'événement ${eventId}`);

    // Récupérer l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        conversation: true,
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, username: true }
            }
          }
        },
        organizer: {
          select: { id: true, firstName: true, lastName: true, username: true }
        }
      }
    });

    if (!event) {
      console.log(`❌ Événement ${eventId} non trouvé`);
      return;
    }

    console.log(`🗑️ Suppression de la conversation pour l'événement "${event.name}"`);

    // Supprimer la conversation et tous les messages
    if (event.conversation) {
      await prisma.message.deleteMany({
        where: { conversationId: event.conversation.id }
      });

      await prisma.conversation.delete({
        where: { id: event.conversation.id }
      });
    }

    // Créer des notifications pour les reviews
    const allParticipants = [
      ...event.participants.map(p => p.user),
      event.organizer
    ];

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

    await prisma.notification.createMany({
      data: reviewNotifications
    });

    // Envoyer les push notifications
    const userIds = allParticipants.map(p => p.id);
    const organizerName = `${event.organizer.firstName} ${event.organizer.lastName}`.trim();

    await sendEventEndNotification(
      event.id,
      event.name,
      event.sport,
      organizerName,
      userIds
    );

    console.log(`✅ Événement "${event.name}" traité avec succès`);
    console.log(`📬 ${reviewNotifications.length} notifications créées`);
    console.log(`📱 Push notifications envoyées à ${userIds.length} utilisateurs`);

  } catch (error) {
    console.error(`💥 Erreur lors du traitement de l'événement ${eventId}:`, error);
  }
}

// Fonction pour annuler la programmation d'un événement
export function cancelEventScheduling(eventId: string) {
  if (eventTimers.has(eventId)) {
    clearTimeout(eventTimers.get(eventId)!);
    eventTimers.delete(eventId);
    console.log(`❌ Programmation annulée pour l'événement ${eventId}`);
  }
}

// Fonction pour programmer tous les événements existants (au démarrage)
export async function scheduleExistingEvents() {
  console.log('🔄 Programmation des événements existants...');

  const events = await prisma.event.findMany({
    where: {
      dateTime: {
        gt: new Date() // Seulement les événements futurs
      }
    },
    select: {
      id: true,
      name: true,
      dateTime: true,
      duration: true
    }
  });

  let scheduled = 0;

  for (const event of events) {
    if (event.duration) {
      const eventEndTime = new Date(event.dateTime.getTime() + event.duration * 60000);
      const now = new Date();

      if (eventEndTime > now) {
        await scheduleEventEnd(event.id, eventEndTime);
        scheduled++;
      } else {
        // L'événement est déjà fini, le traiter immédiatement
        await processEventEnd(event.id);
      }
    }
  }

  console.log(`✅ ${scheduled} événement(s) programmé(s), ${events.length - scheduled} traité(s)`);
}
