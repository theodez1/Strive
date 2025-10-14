import axios, { AxiosInstance } from 'axios';

// Interface pour les événements avec distance
export interface EventWithDistance {
  id: string;
  name: string;
  sport: string;
  location_name: string;
  location_address: string;
  location_city: string;
  location_country: string;
  latitude: number;
  longitude: number;
  date_time: string;
  duration?: number;
  total_slots: number;
  available_slots: number;
  organizer_id: string;
  organizer_slots: number;
  organizer_first_name?: string;
  organizer_last_name?: string;
  organizer_username?: string;
  organizer_profile_picture_url?: string;
  organizer_rating_average?: number;
  description?: string;
  price: number;
  levels: string[];
  levels_fr?: string[];
  created_at: string;
  updated_at: string;
  distance_km?: number;
}

export interface EventsResponse {
  events: EventWithDistance[];
  total: number;
  hasMore: boolean;
}

export interface EventFilters {
  latitude?: number;
  longitude?: number;
  radius?: number;
  sports?: string[];
  levels?: string[];
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface UserEventsOptions {
  timeframe: 'upcoming' | 'past';
  limit?: number;
  offset?: number;
}

class EventsBackendService {
  private baseURL: string;
  private http: AxiosInstance;

  constructor() {
    // Utiliser l'URL du backend via variable d'environnement (recommandé)
    this.baseURL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    if (!this.baseURL) {
      // Laisser vide plutôt que d'imposer localhost (qui ne marche pas sur mobile)
      console.warn('EXPO_PUBLIC_BACKEND_URL non défini. Configurez-le dans .env (ex: http://192.168.1.X:3001/api)');
    }
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 8000,
      validateStatus: (status) => status >= 200 && status < 500,
    });
  }

  setBaseURL(url: string) {
    this.baseURL = url;
    this.http = axios.create({ baseURL: url, timeout: 8000, validateStatus: (s) => s >= 200 && s < 500 });
  }

  /**
   * Récupère les événements avec filtres
   */
  async getEvents(filters?: EventFilters): Promise<{ data: EventsResponse | null; error: any }> {
    try {
      if (!this.baseURL) {
        throw new Error('Backend URL non configurée');
      }
      
      console.log('🔍 eventsBackendService.getEvents - Filtres reçus:', filters);
      console.log('🔍 eventsBackendService.getEvents - URL:', `${this.baseURL}/events`);
      
      const response = await this.http.get(`/events`, { params: filters });
      
      console.log('🔍 eventsBackendService.getEvents - Réponse HTTP:', {
        status: response.status,
        data: response.data
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success) {
        const eventsData = response.data.data || { events: [], total: 0, hasMore: false };
        // Debug pour les photos de profil
        if (eventsData.events && eventsData.events.length > 0) {
          console.log('🔍 Frontend - Événements reçus:', eventsData.events.map(e => ({
            name: e.name,
            organizer_profile_picture_url: e.organizer_profile_picture_url
          })));
        }
        return { data: eventsData, error: null };
      }
      const message = response.data?.error || `HTTP ${response.status}`;
      return { data: { events: [], total: 0, hasMore: false }, error: message };
    } catch (error) {
      console.error('❌ Erreur API getEvents:', (error as any)?.message || error);
      return {
        data: { events: [], total: 0, hasMore: false },
        error: (error as any)?.message || 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère un événement par ID
   */
  async getEventById(id: string): Promise<{ data: EventWithDistance | null; error: any }> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events/${id}`);

      if (response.status >= 200 && response.status < 300) {
        return { data: response.data.data, error: null };
      }
      return { data: null, error: response.data?.error || `HTTP ${response.status}` };
    } catch (error) {
      console.error("Erreur lors de la récupération de l'événement:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les événements créés par un utilisateur
   */
  async getUserCreatedEvents(userId: string, options: UserEventsOptions = { timeframe: 'upcoming' }): Promise<{ data: EventWithDistance[]; error: any }> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events/user/${userId}/created`, {
        params: {
          timeframe: options.timeframe,
          limit: options.limit || 50,
          offset: options.offset || 0
        }
      });

      if (response.status >= 200 && response.status < 300) {
        return { data: response.data.data, error: null };
      }
      return { data: [], error: response.data?.error || `HTTP ${response.status}` };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements créés:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les événements rejoints par un utilisateur
   */
  async getUserJoinedEvents(userId: string, options: UserEventsOptions = { timeframe: 'upcoming' }): Promise<{ data: EventWithDistance[]; error: any }> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events/user/${userId}/joined`, {
        params: {
          timeframe: options.timeframe,
          limit: options.limit || 50,
          offset: options.offset || 0
        }
      });

      if (response.status >= 200 && response.status < 300) {
        return { data: response.data.data, error: null };
      }
      return { data: [], error: response.data?.error || `HTTP ${response.status}` };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements rejoints:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les sports disponibles
   */
  async getAvailableSports(): Promise<{ data: string[]; error: any }> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events/sports/available`);

      if (response.status >= 200 && response.status < 300) {
        return { data: response.data.data, error: null };
      }
      return { data: [], error: response.data?.error || `HTTP ${response.status}` };
    } catch (error) {
      console.error('Erreur lors de la récupération des sports:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les statistiques des événements
   */
  async getEventStats(): Promise<{ data: any; error: any }> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events/stats/overview`);

      if (response.status >= 200 && response.status < 300) {
        return { data: response.data.data, error: null };
      }
      return { data: null, error: response.data?.error || `HTTP ${response.status}` };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les événements près d'une position
   */
  async getNearbyEvents(latitude: number, longitude: number, radiusKm = 10): Promise<{ data: EventWithDistance[]; error: any }> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events`, {
        params: {
          lat: latitude,
          lng: longitude,
          radius: radiusKm,
          limit: 50
        }
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success) {
        return { data: response.data.data?.events || [], error: null };
      }
      return { data: [], error: response.data?.error || `HTTP ${response.status}` };
    } catch (error) {
      console.error('Erreur lors de la récupération des événements proches:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Vérifie la santé du serveur backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.baseURL) return false;
      await this.http.get(`/health`);
      return true;
    } catch (error) {
      console.error('Backend non accessible:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques d'un utilisateur
   */
  async getUserStats(userId: string): Promise<any> {
    try {
      console.log('Récupération des statistiques pour l\'utilisateur:', userId);
      if (!this.baseURL) throw new Error('Backend URL non configurée');
      const response = await this.http.get(`/events/user/${userId}/stats`);
      
      if (response.data.success) {
        console.log('Statistiques utilisateur récupérées:', response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Erreur lors de la récupération des statistiques');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
      // Retourner des statistiques par défaut en cas d'erreur
      return {
        events_organized: 0,
        avg_slots_per_event: 0,
        upcoming_events: 0,
        events_participated: 0,
        total_participations: 0,
        total_guests_brought: 0,
        total_reviews: 0,
        avg_rating: 0,
        unique_partners: 0,
      };
    }
  }

  /**
   * Crée un nouvel événement
   */
  async createEvent(eventData: {
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
    price: number;
    organizer_id: string;
  }): Promise<any> {
    try {
      console.log("Envoi des données d'événement:", eventData);

      const response = await axios.post(`${this.baseURL}/events`, eventData);
      
      if (response.data.success) {
        console.log('Événement créé avec succès:', response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Erreur lors de la création de l'événement");
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'événement:", error);
      throw error;
    }
  }
}

export const eventsBackendService = new EventsBackendService();
