import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export type UserProfile = Database['public']['Tables']['users']['Row'];

export interface UserService {
  getCurrentUserProfile: () => Promise<UserProfile | null>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  createUserProfile: (userData: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
}

class UserServiceImpl implements UserService {
  /**
   * Récupère le profil complet de l'utilisateur connecté
   */
  async getCurrentUserProfile(maxRetries: number = 3): Promise<UserProfile | null> {
    try {
      console.log('🔍 userService.getCurrentUserProfile - Début');

      // Récupérer l'utilisateur actuellement connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.log('❌ Aucun utilisateur authentifié');
        return null;
      }

      console.log('✅ Utilisateur auth trouvé:', user.id, user.email);

      // Essayer de récupérer le profil avec retries
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 Tentative ${attempt}/${maxRetries} de récupération du profil...`);

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError && userProfile) {
          console.log('✅ Profil utilisateur trouvé:', userProfile.username);
          return userProfile;
        }

        // Si profil non trouvé et dernière tentative, attendre un peu plus
        if (attempt === maxRetries) {
          if (profileError?.code === 'PGRST116') {
            console.log('⏳ Profil non trouvé après toutes les tentatives');
            console.log('💡 Le trigger Supabase n\'a peut-être pas encore créé le profil');
            console.log('💡 Réessayez de vous connecter dans quelques secondes.');
          } else {
            console.error('❌ Erreur lors de la récupération du profil:', profileError?.message);
          }
          return null;
        }

        // Attendre avant la prochaine tentative (backoff exponentiel)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Attente de ${delay}ms avant la prochaine tentative...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur dans getCurrentUserProfile:', error);
      return null;
    }
  }

  /**
   * Met à jour le profil de l'utilisateur
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Erreur lors de la mise à jour du profil:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur dans updateUserProfile:', error);
      return { success: false, error: 'Erreur inconnue' };
    }
  }

  /**
   * Crée un profil utilisateur (lors de l'inscription)
   */
  async createUserProfile(userData: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          username: userData.username || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          ...userData
        });

      if (error) {
        console.error('Erreur lors de la création du profil:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur dans createUserProfile:', error);
      return { success: false, error: 'Erreur inconnue' };
    }
  }
}

export const userService = new UserServiceImpl();
