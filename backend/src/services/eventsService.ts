import { prisma } from '../lib';
import { EventFilters, EventWithDistance, EventsResponse } from '../types/events';

// Interface pour la création d'événements
export interface CreateEventData {
  name: string;
  sport: string;
  location_name: string;
  location_address: string;
  location_city: string;
  location_country: string;
  latitude: number;
  longitude: number;
  date_time: string;
  duration: number;
  total_slots: number;
  organizer_slots: number;
  available_slots: number;
  levels: string[];
  description?: string;
  price?: number;
  organizer_id: string;
}

// Fonction pour traduire les niveaux en français
const translateLevels = (levels: string[]): string[] => {
  const levelTranslations: Record<string, string> = {
    'Beginner': 'Débutant',
    'Intermediate': 'Intermédiaire', 
    'Advanced': 'Avancé',
    'All': 'Tous niveaux'
  };
  
  return levels.map(level => levelTranslations[level] || level);
};

// Fonction pour convertir les niveaux français vers les enums
const convertFrenchLevelsToEnum = (frenchLevels: string[]): string[] => {
  const levelConversions: Record<string, string> = {
    'Débutant': 'Beginner',
    'Intermédiaire': 'Intermediate', 
    'Avancé': 'Advanced',
    'Expert': 'Advanced', // Expert n'existe pas dans l'enum, on utilise Advanced
    'Tous niveaux': 'All'
  };
  
  return frenchLevels.map(level => levelConversions[level] || 'Beginner');
};

export class EventsService {
  /**
   * Récupère les événements avec filtres géospatiaux optimisés
   */
  static async getEvents(filters: EventFilters): Promise<EventsResponse> {
    try {
      const {
        latitude,
        longitude,
        radius = 10,
        sports = [],
        levels = [],
        priceMin,
        priceMax,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0
      } = filters;

      // Construction de la requête Prisma
      const where: any = {
        dateTime: {
          gt: new Date() // Seulement les événements futurs
        }
      };

      // Filtre par sports
      if (sports.length > 0) {
        where.sport = {
          in: sports
        };
      }

      // Filtre par niveaux (vérifier si au moins un niveau correspond)
      if (levels.length > 0) {
        where.levels = {
          hasSome: levels
        };
      }

      // Filtre par prix
      if (priceMin !== undefined || priceMax !== undefined) {
        where.price = {};
        if (priceMin !== undefined) {
          where.price.gte = priceMin;
        }
        if (priceMax !== undefined) {
          where.price.lte = priceMax;
        }
      }

      // Filtre par date
      if (dateFrom) {
        where.dateTime = {
          ...where.dateTime,
          gte: new Date(dateFrom)
        };
      }
      if (dateTo) {
        where.dateTime = {
          ...where.dateTime,
          lte: new Date(dateTo)
        };
      }

      // Récupérer les événements avec géolocalisation si nécessaire
      const events = await prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              profilePictureUrl: true,
              ratingAverage: true
            }
          }
        },
        take: limit,
        skip: offset,
        orderBy: {
          dateTime: 'asc'
        }
      });

      // Calculer la distance si nécessaire et filtrer géographiquement
      let filteredEvents: EventWithDistance[] = [];

      if (latitude && longitude) {
        filteredEvents = events
          .filter(event => {
            if (!event.latitude || !event.longitude) return false;

            const eventLat = parseFloat(event.latitude.toString());
            const eventLng = parseFloat(event.longitude.toString());
            const distance = calculateDistance(latitude, longitude, eventLat, eventLng);

            return distance <= radius;
          })
          .map(event => this.transformEventToEventWithDistance(event, latitude, longitude));
      } else {
        filteredEvents = events.map(event => this.transformEventToEventWithDistance(event));
      }

      return {
        success: true,
        events: filteredEvents,
        total: filteredEvents.length,
        hasMore: filteredEvents.length === limit
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return {
        success: false,
        error: 'Erreur lors de la récupération des événements',
        events: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Crée un nouvel événement
   */
  static async createEvent(eventData: CreateEventData): Promise<any> {
    try {
      const event = await prisma.event.create({
        data: {
          name: eventData.name,
          sport: eventData.sport,
          locationName: eventData.location_name,
          locationAddress: eventData.location_address,
          locationCity: eventData.location_city,
          locationCountry: eventData.location_country,
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          dateTime: new Date(eventData.date_time),
          duration: eventData.duration,
          totalSlots: eventData.total_slots,
          organizerSlots: eventData.organizer_slots,
          availableSlots: eventData.available_slots,
          levels: eventData.levels,
          description: eventData.description,
          price: eventData.price,
          organizerId: eventData.organizer_id
        },
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              profilePictureUrl: true,
              ratingAverage: true
            }
          }
        }
      });

      return this.transformEventToEventWithDistance(event);
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement:', error);
      throw error;
    }
  }

  /**
   * Récupère un événement par ID
   */
  static async getEventById(id: string): Promise<EventWithDistance | null> {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              profilePictureUrl: true,
              ratingAverage: true
            }
          }
        }
      });

      if (!event) return null;

      return this.transformEventToEventWithDistance(event);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'événement:', error);
      return null;
    }
  }

  /**
   * Récupère les statistiques d'un utilisateur
   */
  static async getUserStats(userId: string): Promise<any> {
    try {
      const [eventsCreated, eventsJoined, eventsCompleted] = await Promise.all([
        prisma.event.count({
          where: { organizerId: userId }
        }),
        prisma.participant.count({
          where: { userId }
        }),
        prisma.participant.count({
          where: {
            userId,
            event: {
              dateTime: {
                lt: new Date()
              }
            }
          }
        })
      ]);

      return {
        eventsCreated,
        eventsJoined,
        eventsCompleted
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques générales des événements
   */
  static async getEventStats(): Promise<any> {
    try {
      const [totalEvents, upcomingEvents, pastEvents, totalParticipants] = await Promise.all([
        prisma.event.count(),
        prisma.event.count({
          where: {
            dateTime: {
              gte: new Date()
            }
          }
        }),
        prisma.event.count({
          where: {
            dateTime: {
              lt: new Date()
            }
          }
        }),
        prisma.participant.count()
      ]);

      return {
        totalEvents,
        upcomingEvents,
        pastEvents,
        totalParticipants
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  /**
   * Récupère les événements créés par un utilisateur
   */
  static async getUserCreatedEvents(
    userId: string,
    options: { timeframe: 'upcoming' | 'past'; limit: number; offset: number }
  ): Promise<EventWithDistance[]> {
    try {
      const where: any = {
        organizerId: userId
      };

      if (options.timeframe === 'upcoming') {
        where.dateTime = { gte: new Date() };
      } else {
        where.dateTime = { lt: new Date() };
      }

      const events = await prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              profilePictureUrl: true,
              ratingAverage: true
            }
          }
        },
        take: options.limit,
        skip: options.offset,
        orderBy: {
          dateTime: options.timeframe === 'upcoming' ? 'asc' : 'desc'
        }
      });

      return events.map(event => this.transformEventToEventWithDistance(event));
    } catch (error) {
      console.error('Erreur lors de la récupération des événements créés:', error);
      throw error;
    }
  }

  /**
   * Récupère les événements rejoints par un utilisateur
   */
  static async getUserJoinedEvents(
    userId: string,
    options: { timeframe: 'upcoming' | 'past'; limit: number; offset: number }
  ): Promise<EventWithDistance[]> {
    try {
      const where: any = {
        userId
      };

      if (options.timeframe === 'upcoming') {
        where.event = {
          dateTime: { gte: new Date() }
        };
      } else {
        where.event = {
          dateTime: { lt: new Date() }
        };
      }

      const participants = await prisma.participant.findMany({
        where,
        include: {
          event: {
            include: {
              organizer: {
                select: {
                  firstName: true,
                  lastName: true,
                  username: true,
                  profilePictureUrl: true,
                  ratingAverage: true
                }
              }
            }
          }
        },
        take: options.limit,
        skip: options.offset,
        orderBy: {
          event: {
            dateTime: options.timeframe === 'upcoming' ? 'asc' : 'desc'
          }
        }
      });

      return participants.map(p => this.transformEventToEventWithDistance(p.event));
    } catch (error) {
      console.error('Erreur lors de la récupération des événements rejoints:', error);
      throw error;
    }
  }

  /**
   * Récupère la liste des sports disponibles
   */
  static async getAvailableSports(): Promise<string[]> {
    try {
      const events = await prisma.event.findMany({
        select: {
          sport: true
        },
        distinct: ['sport']
      });

      return events.map(e => e.sport).sort();
    } catch (error) {
      console.error('Erreur lors de la récupération des sports disponibles:', error);
      throw error;
    }
  }

  /**
   * Crée une conversation pour un événement avec message système
   */
  static async createConversationForEvent(eventId: string): Promise<any> {
    try {
      // Vérifier si la conversation existe déjà
      const existingConversation = await prisma.conversation.findUnique({
        where: { eventId }
      });

      if (existingConversation) {
        console.log('⚠️ Conversation déjà existante pour cet événement');
        return existingConversation;
      }

      // Récupérer l'événement pour avoir le nom et l'organisateur
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          name: true,
          organizerId: true
        }
      });

      if (!event) {
        throw new Error('Événement non trouvé');
      }

      // Créer la conversation
      const conversation = await prisma.conversation.create({
        data: {
          eventId
        }
      });

      // Créer le message système de bienvenue
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: event.organizerId,
          content: `🎉 Conversation créée ! Bienvenue dans le chat de l'événement "${event.name}". Organisez-vous ici avec les participants !`,
          type: 'system',
          read: true
        }
      });

      console.log('✅ Conversation créée avec message système:', conversation.id);
      return conversation;
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      throw error;
    }
  }

  /**
   * Transforme un événement Prisma en EventWithDistance
   */
  private static transformEventToEventWithDistance(
    event: any,
    userLat?: number,
    userLng?: number
  ): EventWithDistance {
    const eventLat = parseFloat(event.latitude.toString());
    const eventLng = parseFloat(event.longitude.toString());

    let distance_km: number | undefined = undefined;
    if (userLat !== undefined && userLng !== undefined) {
      distance_km = calculateDistance(userLat, userLng, eventLat, eventLng);
    }

    return {
      id: event.id,
      name: event.name,
      sport: event.sport,
      location_name: event.locationName,
      location_address: event.locationAddress,
      location_city: event.locationCity,
      location_country: event.locationCountry,
      latitude: eventLat,
      longitude: eventLng,
      date_time: event.dateTime.toISOString(),
      duration: event.duration,
      total_slots: event.totalSlots,
      available_slots: event.availableSlots,
      organizer_id: event.organizerId,
      organizer_slots: event.organizerSlots || 1,
      organizer_first_name: event.organizer?.firstName,
      organizer_last_name: event.organizer?.lastName,
      organizer_username: event.organizer?.username,
      organizer_profile_picture_url: event.organizer?.profilePictureUrl || undefined,
      organizer_rating_average: event.organizer?.ratingAverage ? parseFloat(event.organizer.ratingAverage.toString()) : undefined,
      description: event.description || undefined,
      price: event.price ? parseFloat(event.price.toString()) : 0,
      levels: event.levels,
      levels_fr: translateLevels(event.levels),
      created_at: event.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: event.updatedAt?.toISOString() || new Date().toISOString(),
      distance_km
    };
  }
}

// Fonction utilitaire pour calculer la distance entre deux points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const eventsService = new EventsService();
