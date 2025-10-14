import { prisma } from '../lib/prisma';
import { Event, SportType, EventLevel, Prisma } from '@prisma/client';

export interface CreateEventData {
  name: string;
  sport: SportType;
  locationName: string;
  locationAddress: string;
  locationCity: string;
  locationCountry: string;
  latitude: number;
  longitude: number;
  dateTime: Date;
  duration: number;
  totalSlots: number;
  organizerId: string;
  organizerSlots?: number;
  description?: string;
  price?: number;
  levels?: EventLevel[];
}

export interface EventWithDetails extends Event {
  organizer: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    ratingAverage: number;
    ratingCount: number;
  };
  participants: {
    id: string;
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
    };
    guests: number;
  }[];
  _count: {
    participants: number;
  };
}

export interface NearbyEventsParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  sport?: SportType;
  levels?: EventLevel[];
  limit?: number;
  offset?: number;
}

export class EventsPrismaService {
  /**
   * Créer un nouvel événement
   */
  async createEvent(data: CreateEventData): Promise<Event> {
    return await prisma.event.create({
      data: {
        ...data,
        organizerSlots: data.organizerSlots || 1,
        levels: data.levels || ['all'],
      },
    });
  }

  /**
   * Trouver des événements proches avec géolocalisation
   */
  async findNearbyEvents({
    latitude,
    longitude,
    radiusKm,
    sport,
    levels,
    limit = 20,
    offset = 0,
  }: NearbyEventsParams): Promise<EventWithDetails[]> {
    // Requête SQL brute pour la géolocalisation
    const events = await prisma.$queryRaw<EventWithDetails[]>`
      SELECT 
        e.*,
        json_build_object(
          'id', u.id,
          'username', u.username,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'ratingAverage', u.rating_average,
          'ratingCount', u.rating_count
        ) as organizer,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'user', json_build_object(
                'id', pu.id,
                'username', pu.username,
                'firstName', pu.first_name,
                'lastName', pu.last_name
              ),
              'guests', p.guests
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as participants,
        json_build_object(
          'participants', COUNT(p.id)
        ) as _count,
        ST_Distance(
          ST_Point(e.longitude, e.latitude)::geography,
          ST_Point(${longitude}, ${latitude})::geography
        ) / 1000 as distance_km
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN participants p ON e.id = p.event_id
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE e.date_time > NOW()
        AND ST_DWithin(
          ST_Point(e.longitude, e.latitude)::geography,
          ST_Point(${longitude}, ${latitude})::geography,
          ${radiusKm * 1000}
        )
        ${sport ? Prisma.sql`AND e.sport = ${sport}` : Prisma.empty}
        ${levels && levels.length > 0 ? Prisma.sql`AND e.levels && ${levels}` : Prisma.empty}
      GROUP BY e.id, u.id
      ORDER BY distance_km ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return events;
  }

  /**
   * Trouver un événement par ID avec tous les détails
   */
  async findEventById(id: string): Promise<EventWithDetails | null> {
    return await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });
  }

  /**
   * Trouver les événements d'un utilisateur
   */
  async findUserEvents(userId: string, limit = 20, offset = 0): Promise<EventWithDetails[]> {
    return await prisma.event.findMany({
      where: {
        OR: [
          { organizerId: userId },
          {
            participants: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        dateTime: 'asc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Rejoindre un événement
   */
  async joinEvent(eventId: string, userId: string, guests = 0): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Vérifier que l'événement existe et a de la place
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error('Événement introuvable');
      }

      if (event.availableSlots < (1 + guests)) {
        throw new Error('Plus de places disponibles');
      }

      // Ajouter le participant
      await tx.participant.create({
        data: {
          userId,
          eventId,
          guests,
        },
      });
    });
  }

  /**
   * Quitter un événement
   */
  async leaveEvent(eventId: string, userId: string): Promise<void> {
    await prisma.participant.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
  }

  /**
   * Rechercher des événements par nom ou description
   */
  async searchEvents(
    query: string,
    latitude?: number,
    longitude?: number,
    radiusKm?: number,
    limit = 20,
    offset = 0
  ): Promise<EventWithDetails[]> {
    const whereClause: Prisma.EventWhereInput = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { locationName: { contains: query, mode: 'insensitive' } },
            { locationCity: { contains: query, mode: 'insensitive' } },
          ],
        },
        { dateTime: { gt: new Date() } },
      ],
    };

    // Si géolocalisation fournie, filtrer par distance
    if (latitude && longitude && radiusKm) {
      // Pour l'instant, on utilise une approximation simple
      // Dans une vraie app, on utiliserait PostGIS
      const latRange = radiusKm / 111; // Approximation: 1° ≈ 111km
      const lngRange = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

      whereClause.AND!.push({
        latitude: {
          gte: latitude - latRange,
          lte: latitude + latRange,
        },
        longitude: {
          gte: longitude - lngRange,
          lte: longitude + lngRange,
        },
      });
    }

    return await prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        dateTime: 'asc',
      },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Mettre à jour un événement
   */
  async updateEvent(id: string, data: Partial<CreateEventData>): Promise<Event> {
    return await prisma.event.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprimer un événement
   */
  async deleteEvent(id: string): Promise<void> {
    await prisma.event.delete({
      where: { id },
    });
  }
}

export const eventsPrismaService = new EventsPrismaService();
