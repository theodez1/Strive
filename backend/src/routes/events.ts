import express, { Router } from 'express';
import { EventsService, CreateEventData } from '../services/eventsService';
import { EventFilters } from '../types/events';
import { scheduleEventEnd } from '../services/eventScheduler';

const router: Router = express.Router();

/**
 * GET /api/events
 * Récupère les événements avec filtres
 */
router.get('/', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius,
      sports,
      levels,
      priceMin,
      priceMax,
      dateFrom,
      dateTo,
      limit,
      offset
    } = req.query;

    // Validation des paramètres
    const filters: EventFilters = {};

    if (lat && lng) {
      filters.latitude = parseFloat(lat as string);
      filters.longitude = parseFloat(lng as string);
    }

    if (radius) {
      filters.radius = parseFloat(radius as string);
    }

    if (sports) {
      if (Array.isArray(sports)) {
        filters.sports = sports as string[];
      } else {
        // Support des sports séparés par des virgules : "Football,Basketball,Tennis"
        filters.sports = (sports as string).split(',').map(s => s.trim());
      }
    }

    if (levels) {
      if (Array.isArray(levels)) {
        filters.levels = levels as string[];
      } else {
        // Support des niveaux séparés par des virgules : "Beginner,Intermediate"
        filters.levels = (levels as string).split(',').map(l => l.trim());
      }
    }

    if (priceMin) {
      filters.priceMin = parseFloat(priceMin as string);
    }

    if (priceMax) {
      filters.priceMax = parseFloat(priceMax as string);
    }

    if (dateFrom) {
      filters.dateFrom = dateFrom as string;
    }

    if (dateTo) {
      filters.dateTo = dateTo as string;
    }

    if (limit) {
      filters.limit = parseInt(limit as string);
    }

    if (offset) {
      filters.offset = parseInt(offset as string);
    }

    // Récupérer les événements
    const result = await EventsService.getEvents(filters);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur lors de la récupération des événements',
        data: {
          events: [],
          total: 0,
          hasMore: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        events: result.events,
        total: result.total,
        hasMore: result.hasMore
      },
      message: `${result.events.length} événements trouvés`
    });

  } catch (error) {
    console.error('Erreur GET /api/events:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des événements',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      data: {
        events: [],
        total: 0,
        hasMore: false
      }
    });
  }
});

/**
 * POST /api/events
 * Crée un nouvel événement
 */
router.post('/', async (req, res) => {
  try {
    const eventData: CreateEventData = req.body;

    // Validation des champs requis
    const requiredFields = [
      'name', 'sport', 'location_name', 'location_address', 
      'location_city', 'location_country', 'latitude', 'longitude',
      'date_time', 'duration', 'total_slots', 'organizer_slots',
      'available_slots', 'levels', 'organizer_id'
    ];

    for (const field of requiredFields) {
      if (!eventData[field as keyof CreateEventData]) {
        return res.status(400).json({
          success: false,
          error: `Le champ ${field} est requis`
        });
      }
    }

    // Validation des types
    if (typeof eventData.latitude !== 'number' || typeof eventData.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Les coordonnées latitude et longitude doivent être des nombres'
      });
    }

    if (typeof eventData.total_slots !== 'number' || eventData.total_slots <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Le nombre total de places doit être un nombre positif'
      });
    }

    if (typeof eventData.organizer_slots !== 'number' || eventData.organizer_slots <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Le nombre de places organisateur doit être un nombre positif'
      });
    }

    if (eventData.organizer_slots > eventData.total_slots) {
      return res.status(400).json({
        success: false,
        error: 'Le nombre de places organisateur ne peut pas dépasser le nombre total de places'
      });
    }

    // Validation de la date
    const eventDate = new Date(eventData.date_time);
    if (isNaN(eventDate.getTime()) || eventDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'La date de l\'événement doit être dans le futur'
      });
    }

    console.log('Création d\'événement:', {
      name: eventData.name,
      sport: eventData.sport,
      organizer_id: eventData.organizer_id,
      date_time: eventData.date_time
    });

    const event = await EventsService.createEvent(eventData);

    // Créer automatiquement la conversation pour l'événement
    try {
      await EventsService.createConversationForEvent(event.id);
      console.log('✅ Conversation créée pour l\'événement:', event.id);
    } catch (convError) {
      console.error('⚠️ Erreur lors de la création de la conversation:', convError);
      // Ne pas bloquer la création de l'événement si la conversation échoue
    }

    // Programmer la fin de l'événement
    const eventEndTime = new Date(new Date(eventData.date_time).getTime() + eventData.duration * 60000);
    await scheduleEventEnd(event.id, eventEndTime);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Événement créé avec succès'
    });

  } catch (error) {
    console.error('Erreur POST /api/events:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'événement',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/events/user/:userId/stats
 * Récupère les statistiques d'un utilisateur
 */
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    console.log('Récupération des statistiques pour l\'utilisateur:', userId);

    const stats = await EventsService.getUserStats(userId);

    res.json({
      success: true,
      data: stats,
      message: 'Statistiques utilisateur récupérées avec succès'
    });

  } catch (error) {
    console.error('Erreur GET /api/events/user/:userId/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques utilisateur',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/events/:id
 * Récupère un événement par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de l\'événement requis'
      });
    }

    const event = await EventsService.getEventById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Événement non trouvé'
      });
    }

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('Erreur GET /api/events/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'événement',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/events/stats/overview
 * Statistiques générales des événements
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await EventsService.getEventStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erreur GET /api/events/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/events/user/:userId/created
 * Récupère les événements créés par un utilisateur
 */
router.get('/user/:userId/created', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = 'upcoming', limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    const events = await EventsService.getUserCreatedEvents(userId, {
      timeframe: timeframe as 'upcoming' | 'past',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: events,
      message: `${events.length} événements créés trouvés`
    });

  } catch (error) {
    console.error('Erreur GET /api/events/user/:userId/created:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des événements créés',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/events/user/:userId/joined
 * Récupère les événements rejoints par un utilisateur
 */
router.get('/user/:userId/joined', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe = 'upcoming', limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur requis'
      });
    }

    const events = await EventsService.getUserJoinedEvents(userId, {
      timeframe: timeframe as 'upcoming' | 'past',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: events,
      message: `${events.length} événements rejoints trouvés`
    });

  } catch (error) {
    console.error('Erreur GET /api/events/user/:userId/joined:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des événements rejoints',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/events/sports/available
 * Liste des sports disponibles
 */
router.get('/sports/available', async (req, res) => {
  try {
    const sports = await EventsService.getAvailableSports();

    res.json({
      success: true,
      data: sports
    });

  } catch (error) {
    console.error('Erreur GET /api/events/sports:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des sports',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export { router as eventRoutes };
