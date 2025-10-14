import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { userService, UserProfile } from '../services/userService';
import { authService } from '../services/auth';

const USER_PROFILE_KEY = '@user_profile';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil depuis le stockage local
  const loadProfileFromStorage = async (userId: string): Promise<UserProfile | null> => {
    try {
      const storedProfile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        // Vérifier que c'est bien le bon utilisateur
        if (profile.id === userId) {
          console.log('💾 Profil chargé depuis le stockage local:', profile.username);
          return profile;
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement du profil depuis le stockage:', error);
    }
    return null;
  };

  // Sauvegarder le profil dans le stockage local
  const saveProfileToStorage = async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      console.log('💾 Profil sauvegardé dans le stockage local:', profile.username);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du profil:', error);
    }
  };

  // Vider le stockage local
  const clearProfileFromStorage = async () => {
    try {
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      console.log('🗑️ Profil supprimé du stockage local');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du profil:', error);
    }
  };

  const fetchUserProfile = async (authUser: User | null) => {
    console.log('🔍 fetchUserProfile appelé avec:', authUser ? `user ${authUser.id}` : 'null');
    if (authUser) {
      // D'abord essayer de charger depuis le stockage local
      let profile = await loadProfileFromStorage(authUser.id);

      // Si pas trouvé en local, récupérer depuis l'API avec retries
      if (!profile) {
        console.log('🌐 Profil non trouvé en local, récupération depuis l\'API...');
        profile = await userService.getCurrentUserProfile(3); // 3 tentatives avec retries

        // Sauvegarder en local si trouvé
        if (profile) {
          await saveProfileToStorage(profile);
          console.log('✅ Profil récupéré et sauvegardé en local');
        } else {
          console.log('⚠️ Profil toujours non trouvé après retries');
        }
      }

      console.log('📋 Profil final:', profile ? `profil ${profile.username}` : 'null');
      setUserProfile(profile);
    } else {
      // Ne pas effacer le profil ici: cela peut être un état transitoire
      console.log('ℹ️ Session absente (transitoire). Conservation du profil en mémoire.');
    }
  };

  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      await fetchUserProfile(session?.user ?? null);
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          if (event === 'SIGNED_OUT') {
            console.log('👋 Déconnexion détectée, nettoyage du profil');
            setUserProfile(null);
            await clearProfileFromStorage();
          } else {
            // Autres événements: conserver le profil (évite les clignotements)
            console.log('ℹ️ Événement auth:', event, '— conservation du profil existant');
          }
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fonction pour rafraîchir le profil depuis l'API
  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Rafraîchissement du profil depuis l\'API...');
      const profile = await userService.getCurrentUserProfile();
      if (profile) {
        await saveProfileToStorage(profile);
        setUserProfile(profile);
      }
    }
  };

  // Fonction pour mettre à jour le profil localement et en API
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (user && userProfile) {
      const updatedProfile = { ...userProfile, ...updates };
      setUserProfile(updatedProfile);
      await saveProfileToStorage(updatedProfile);
      
      // Mettre à jour aussi en API
      await userService.updateUserProfile(updates);
    }
  };

  // Fonction de déconnexion
  const signOut = async () => {
    try {
      console.log('👋 Déconnexion en cours...');
      const { error } = await authService.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        throw error;
      }
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  };

  return {
    user,
    userProfile,
    loading,
    userId: user?.id || null,
    isAuthenticated: !!user && !!userProfile,
    // Fonctions utilitaires
    refreshProfile,
    updateProfile,
    clearProfile: clearProfileFromStorage,
    signOut
  };
}
