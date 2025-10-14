export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          first_name: string;
          last_name: string;
          birth_date: string | null;
          region: string | null;
          phone_number: string | null;
          favorite_sports: string[] | null;
          rating_average: number | null;
          rating_count: number | null;
          stats: Json | null;
          preferences: Json | null;
          device_tokens: string[] | null;
          profile_picture_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          first_name: string;
          last_name: string;
          birth_date?: string | null;
          region?: string | null;
          phone_number?: string | null;
          favorite_sports?: string[] | null;
          rating_average?: number | null;
          rating_count?: number | null;
          stats?: Json | null;
          preferences?: Json | null;
          device_tokens?: string[] | null;
          profile_picture_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          first_name?: string;
          last_name?: string;
          birth_date?: string | null;
          region?: string | null;
          phone_number?: string | null;
          favorite_sports?: string[] | null;
          rating_average?: number | null;
          rating_count?: number | null;
          stats?: Json | null;
          preferences?: Json | null;
          device_tokens?: string[] | null;
          profile_picture_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
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
          description: string | null;
          price: number | null;
          levels: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
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
          description?: string | null;
          price?: number | null;
          levels: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sport?: string;
          location_name?: string;
          location_address?: string;
          location_city?: string;
          location_country?: string;
          latitude?: number;
          longitude?: number;
          date_time?: string;
          duration?: number;
          total_slots?: number;
          available_slots?: number;
          organizer_id?: string;
          organizer_slots?: number;
          description?: string | null;
          price?: number | null;
          levels?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          guests: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          guests?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          guests?: number;
          created_at?: string;
        };
      };
      pending_participants: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          guests: number;
          comment: string | null;
          requested_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          guests?: number;
          comment?: string | null;
          requested_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          guests?: number;
          comment?: string | null;
          requested_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          event_id: string;
          last_message_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          last_message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          last_message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          type?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
