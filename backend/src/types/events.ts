export interface EventFilters {
  latitude?: number;
  longitude?: number;
  radius?: number; // en km
  sports?: string[];
  levels?: string[];
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string; // ISO string
  dateTo?: string; // ISO string
  limit?: number;
  offset?: number;
}

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
  duration: number;
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
  levels_fr?: string[]; // Niveaux traduits en français
  created_at: string;
  updated_at: string;
  distance_km?: number; // Calculé côté serveur
}

export interface EventsResponse {
  success: boolean;
  events: EventWithDistance[];
  total: number;
  hasMore: boolean;
  error?: string;
}
