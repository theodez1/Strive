// Configuration API
const API_BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();

export interface ApiEvent {
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
  duration: number;
  total_slots: number;
  available_slots: number;
  organizer_id: string;
  organizer_slots: number;
  organizer_first_name?: string;
  organizer_last_name?: string;
  organizer_username?: string;
  description?: string;
  price: number;
  levels: string[];
  levels_fr?: string[]; // Niveaux traduits en français
  created_at: string;
  updated_at: string;
  distance_km?: number;
}

export interface ApiEventFilters {
  lat?: number;
  lng?: number;
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

export interface ApiEventsResponse {
  success: boolean;
  data: {
    events: ApiEvent[];
    total: number;
    hasMore: boolean;
    filters?: ApiEventFilters;
  };
  message?: string;
  error?: string;
}

export interface ApiHealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  database: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    if (!this.baseURL) {
      console.warn('EXPO_PUBLIC_BACKEND_URL non défini. Configurez-le dans .env (ex: http://192.168.1.X:3001/api)');
    }
  }

  /**
   * Vérifie si l'API est accessible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiHealthResponse = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.warn('API non accessible:', error);
      return false;
    }
  }

  /**
   * Récupère les événements avec filtres
   */
  async getEvents(filters: ApiEventFilters): Promise<ApiEvent[]> {
    try {
      if (!this.baseURL) throw new Error('Backend URL non configurée');

      // Construire les paramètres de requête
      const queryParams = new URLSearchParams();
      
      if (filters.lat !== undefined) queryParams.append('lat', filters.lat.toString());
      if (filters.lng !== undefined) queryParams.append('lng', filters.lng.toString());
      if (filters.radius !== undefined) queryParams.append('radius', filters.radius.toString());
      if (filters.sports && filters.sports.length > 0) {
        filters.sports.forEach(sport => queryParams.append('sports', sport));
      }
      if (filters.levels && filters.levels.length > 0) {
        filters.levels.forEach(level => queryParams.append('levels', level));
      }
      if (filters.priceMin !== undefined) queryParams.append('priceMin', filters.priceMin.toString());
      if (filters.priceMax !== undefined) queryParams.append('priceMax', filters.priceMax.toString());
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.limit !== undefined) queryParams.append('limit', filters.limit.toString());
      if (filters.offset !== undefined) queryParams.append('offset', filters.offset.toString());

      const url = `${this.baseURL}/events?${queryParams.toString()}`;
      console.log('🔎 GET Events URL:', url);
      
      // Appel API optimisé

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${body}`);
      }

      const data: ApiEventsResponse = await response.json();
      
      if (!data || !data.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      if (!data.success) {
        throw new Error(data.message || data.error || 'Erreur API');
      }

      // Événements récupérés avec succès
      return data.data.events || [];

    } catch (error) {
      console.error('❌ Erreur API getEvents:', error);
      console.error('BaseURL:', this.baseURL);
      throw error;
    }
  }

  /**
   * Récupère un événement par ID
   */
  async getEventById(id: string): Promise<ApiEvent | null> {
    try {
      const response = await fetch(`${this.baseURL}/events/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;

    } catch (error) {
      console.error('❌ Erreur API getEventById:', error);
      return null;
    }
  }

  /**
   * Récupère les sports disponibles
   */
  async getAvailableSports(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/events/sports/available`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];

    } catch (error) {
      console.error('❌ Erreur API getAvailableSports:', error);
      return [];
    }
  }
}

// Export de l'instance singleton
export const apiService = new ApiService();
