import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

export interface EventsService {
  getEvents: (filters?: EventFilters) => Promise<{ data: Event[]; error: any }>;
  getEvent: (id: string) => Promise<{ data: Event | null; error: any }>;
  createEvent: (event: EventInsert) => Promise<{ data: Event | null; error: any }>;
  updateEvent: (id: string, updates: EventUpdate) => Promise<{ data: Event | null; error: any }>;
  deleteEvent: (id: string) => Promise<{ error: any }>;
  joinEvent: (eventId: string, userId: string, guests?: number) => Promise<{ error: any }>;
  leaveEvent: (eventId: string, userId: string) => Promise<{ error: any }>;
  requestToJoin: (eventId: string, userId: string, guests?: number, comment?: string) => Promise<{ error: any }>;
  getNearbyEvents: (latitude: number, longitude: number, radiusKm?: number) => Promise<{ data: Event[]; error: any }>;
  getParticipantsByEvent: (eventId: string) => Promise<{ data: { id: string; user_id: string; guests: number; created_at: string }[]; error: any }>;
  getPendingRequestsByEvent: (eventId: string) => Promise<{ data: { id: string; user_id: string; guests: number; comment: string | null; requested_at: string }[]; error: any }>;
  approvePendingRequest: (pendingId: string) => Promise<{ error: any }>;
  rejectPendingRequest: (pendingId: string) => Promise<{ error: any }>;
  isUserParticipant: (eventId: string, userId: string) => Promise<{ data: boolean; error: any }>;
  isUserPendingRequest: (eventId: string, userId: string) => Promise<{ data: boolean; error: any }>;
  getUserPendingRequests: (userId: string) => Promise<{ data: { id: string; event_id: string; guests: number; comment: string | null; requested_at: string; event: Event }[]; error: any }>;
}

export interface EventFilters {
  sport?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  availableSlots?: boolean;
  organizerId?: string;
}

class EventsServiceImpl implements EventsService {
  async getEvents(filters?: EventFilters) {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .order('date_time', { ascending: true });

      if (filters) {
        if (filters.sport) {
          query = query.eq('sport', filters.sport);
        }
        if (filters.city) {
          query = query.eq('location_city', filters.city);
        }
        if (filters.dateFrom) {
          query = query.gte('date_time', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('date_time', filters.dateTo);
        }
        if (filters.availableSlots) {
          query = query.gt('available_slots', 0);
        }
        if (filters.organizerId) {
          query = query.eq('organizer_id', filters.organizerId);
        }
      }

      const { data, error } = await query;
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  async getEvent(id: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async createEvent(event: EventInsert) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(event as any)
        .select()
        .single();

      // Créer automatiquement une conversation liée à l'événement
      if (!error && data) {
        await supabase
          .from('conversations')
          .insert({ event_id: (data as any).id } as any)
          .select()
          .single();
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateEvent(id: string, updates: EventUpdate) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async deleteEvent(id: string) {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async joinEvent(eventId: string, userId: string, guests = 0) {
    try {
      // Vérifier si l'utilisateur est déjà participant
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (existingParticipant) {
        return { error: { message: 'Already participating in this event' } };
      }

      // Vérifier les places disponibles
      const { data: event } = await supabase
        .from('events')
        .select('available_slots')
        .eq('id', eventId)
        .single();

      if (!event || (event as any).available_slots < guests + 1) {
        return { error: { message: 'Not enough available slots' } };
      }

      // Ajouter le participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          user_id: userId,
          event_id: eventId,
          guests,
        } as any);

      if (participantError) {
        return { error: participantError };
      }

      // Mettre à jour les places disponibles
      const { error: updateError } = await supabase
        .from('events')
        .update({
          available_slots: (event as any).available_slots - guests - 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', eventId);

      if (updateError) {
        return { error: updateError };
      }

      // Créer un message système dans la conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', eventId)
        .single();

      if ((conversation as any)?.id) {
        await supabase.from('messages').insert({
          conversation_id: (conversation as any).id,
          sender_id: userId,
          content: `A rejoint l'événement${guests > 0 ? ` (${guests} invité${guests > 1 ? 's' : ''})` : ''}`,
          type: 'system'
        } as any);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async leaveEvent(eventId: string, userId: string) {
    try {
      // Récupérer les informations du participant
      const { data: participant } = await supabase
        .from('participants')
        .select('guests')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (!participant) {
        return { error: { message: 'Not participating in this event' } };
      }

      // Supprimer le participant
      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (deleteError) {
        return { error: deleteError };
      }

      // Récupérer l'événement pour mettre à jour les places
      const { data: event } = await supabase
        .from('events')
        .select('available_slots')
        .eq('id', eventId)
        .single();

      if (event) {
        // Restaurer les places disponibles
        const { error: updateError } = await supabase
          .from('events')
        .update({
          available_slots: (event as any).available_slots + (participant as any).guests + 1,
          updated_at: new Date().toISOString(),
        } as any)
          .eq('id', eventId);

        return { error: updateError };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async requestToJoin(eventId: string, userId: string, guests = 0, comment?: string) {
    try {
      // Vérifier si une demande existe déjà
      const { data: existingRequest } = await supabase
        .from('pending_participants')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (existingRequest) {
        return { error: { message: 'Request already exists' } };
      }

      // Créer la demande
      const { error } = await supabase
        .from('pending_participants')
        .insert({
          user_id: userId,
          event_id: eventId,
          guests,
          comment,
          requested_at: new Date().toISOString(),
        } as any);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getNearbyEvents(latitude: number, longitude: number, radiusKm = 10) {
    try {
      // Cette requête utilise une fonction PostGIS ou une approximation simple
      // Pour une implémentation plus précise, vous devriez utiliser PostGIS
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date_time', new Date().toISOString());

      if (error) {
        return { data: [], error };
      }

      // Filtrer par distance (approximation simple)
      const nearbyEvents = data?.filter(event => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          (event as any).latitude,
          (event as any).longitude
        );
        return distance <= radiusKm;
      }) || [];

      return { data: nearbyEvents, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getParticipantsByEvent(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, user_id, guests, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      return { data: (data as any) || [], error };
    } catch (error) {
      return { data: [], error } as any;
    }
  }

  async getPendingRequestsByEvent(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('pending_participants')
        .select('id, user_id, guests, comment, requested_at')
        .eq('event_id', eventId)
        .order('requested_at', { ascending: true });

      return { data: (data as any) || [], error };
    } catch (error) {
      return { data: [], error } as any;
    }
  }

  async approvePendingRequest(pendingId: string) {
    try {
      console.log('approvePendingRequest: Début pour ID', pendingId);
      
      // Récupérer la demande
      const { data: pending, error: fetchError } = await supabase
        .from('pending_participants')
        .select('id, user_id, event_id, guests')
        .eq('id', pendingId)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la récupération de la demande:', fetchError);
        return { error: fetchError };
      }
      
      if (!pending) {
        console.error('Demande non trouvée pour ID:', pendingId);
        return { error: { message: 'Demande non trouvée' } };
      }

      console.log('Demande trouvée:', pending);

      // Vérifier les places disponibles
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, available_slots, total_slots')
        .eq('id', (pending as any).event_id)
        .single();

      if (eventError) {
        console.error('Erreur lors de la récupération de l\'événement:', eventError);
        return { error: eventError };
      }
      
      if (!event) {
        console.error('Événement non trouvé pour ID:', (pending as any).event_id);
        return { error: { message: 'Événement non trouvé' } };
      }

      console.log('Événement trouvé:', event);
      console.log('Places nécessaires:', (pending as any).guests + 1);
      console.log('Places disponibles:', (event as any).available_slots);

      if ((event as any).available_slots < (pending as any).guests + 1) {
        console.error('Pas assez de places disponibles');
        return { error: { message: `Pas assez de places disponibles. Requis: ${(pending as any).guests + 1}, Disponible: ${(event as any).available_slots}` } };
      }

      // Vérifier si l'utilisateur n'est pas déjà participant
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', (pending as any).user_id)
        .eq('event_id', (pending as any).event_id)
        .single();

      if (existingParticipant) {
        console.error('Utilisateur déjà participant');
        return { error: { message: 'Cet utilisateur participe déjà à l\'événement' } };
      }

      // Ajouter le participant
      const { error: insertError } = await supabase
        .from('participants')
        .insert({ user_id: (pending as any).user_id, event_id: (pending as any).event_id, guests: (pending as any).guests } as any);

      if (insertError) {
        console.error('Erreur lors de l\'ajout du participant:', insertError);
        return { error: insertError };
      }

      console.log('Participant ajouté avec succès');

      // Mettre à jour les places
      const newAvailableSlots = (event as any).available_slots - (pending as any).guests - 1;
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          available_slots: newAvailableSlots, 
          updated_at: new Date().toISOString() 
        } as any)
        .eq('id', (pending as any).event_id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour des places:', updateError);
        return { error: updateError };
      }

      console.log('Places mises à jour:', newAvailableSlots);

      // Supprimer la demande
      const { error: deleteError } = await supabase
        .from('pending_participants')
        .delete()
        .eq('id', pendingId);

      if (deleteError) {
        console.error('Erreur lors de la suppression de la demande:', deleteError);
        return { error: deleteError };
      }

      console.log('Demande supprimée avec succès');

      // Créer un message système dans la conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', (pending as any).event_id)
        .single();

      if ((conversation as any)?.id) {
        await supabase.from('messages').insert({
          conversation_id: (conversation as any).id,
          sender_id: (pending as any).user_id,
          content: `A rejoint l'événement${(pending as any).guests > 0 ? ` (${(pending as any).guests} invité${(pending as any).guests > 1 ? 's' : ''})` : ''}`,
          type: 'system'
        } as any);
      }

      return { error: null };
    } catch (error) {
      console.error('Erreur inattendue dans approvePendingRequest:', error);
      return { error: { message: 'Erreur inattendue lors de l\'approbation' } };
    }
  }

  async rejectPendingRequest(pendingId: string) {
    try {
      const { error } = await supabase
        .from('pending_participants')
        .delete()
        .eq('id', pendingId);
      return { error };
    } catch (error) {
      return { error } as any;
    }
  }

  async isUserParticipant(eventId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      return { data: !!data, error };
    } catch (error) {
      return { data: false, error };
    }
  }

  async isUserPendingRequest(eventId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('pending_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      return { data: !!data, error };
    } catch (error) {
      return { data: false, error };
    }
  }

  async getUserPendingRequests(userId: string) {
    try {
      const { data, error } = await supabase
        .from('pending_participants')
        .select(`
          id,
          event_id,
          guests,
          comment,
          requested_at,
          event:events(*)
        `)
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });

      return { data: (data as any) || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }
}

export const eventsService = new EventsServiceImpl();
