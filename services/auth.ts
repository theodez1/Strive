import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthService {
  signUp: (email: string, password: string, userData: Partial<UserData>) => Promise<{ user: User | null; error: any }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>;
  signOut: () => Promise<{ error: any }>;
  getCurrentUser: () => Promise<User | null>;
  getSession: () => Promise<Session | null>;
}

export interface UserData {
  username: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  region?: string;
  phone_number?: string;
  favorite_sports?: string[];
}

class AuthServiceImpl implements AuthService {
  async signUp(email: string, password: string, userData: Partial<UserData>) {
    try {
      // L'inscription via Supabase Auth
      // Le trigger "on_auth_user_created" créera automatiquement le profil dans la table users
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData, // Les données seront dans raw_user_meta_data
        },
      });

      if (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);
        return { user: null, error };
      }

      // Attendre un peu pour que le trigger Supabase crée le profil
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Inscription réussie, profil créé automatiquement par le trigger');
      return { user: data.user, error: null };
    } catch (error) {
      console.error('❌ Erreur dans signUp:', error);
      return { user: null, error };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { user: data.user, error };
    } catch (error) {
      return { user: null, error };
    }
  }

  async signOut() {
    try {
      // Vider le stockage local avant de se déconnecter
      await AsyncStorage.removeItem('@user_profile');
      console.log('🗑️ Stockage local vidé lors de la déconnexion');
      
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
}

export const authService = new AuthServiceImpl();
