import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import mobileAds from 'react-native-google-mobile-ads';
import LoginScreen from './screens/auth/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import { Colors } from './constants/Theme';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { FilterProvider } from './context/FilterContext';
import { LocationProvider } from './context/LocationContext';
import { FilterModal } from './components';
// Import conditionnel des notifications (sans fallback qui génère des tokens de test)
let PushNotificationService: any;
try {
  PushNotificationService = require('./services/pushNotifications').default;
} catch (error) {
  console.error('🔎 Notifications indisponibles (module natif manquant):', error);
  PushNotificationService = { initialize: async () => console.log('⚠️ Notifications non disponibles: module natif manquant. Aucune tentative de token.') };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialiser AdMob
    const initializeAdMob = async () => {
      try {
        await mobileAds().initialize();
        
        // Configurer le mode test pour votre appareil (sans bandeau)
        await mobileAds().setRequestConfiguration({
          testDeviceIdentifiers: ['EMULATOR'], // Ajouter l'ID de votre appareil ici
        });
        
        console.log('📱 AdMob initialisé avec succès (mode test discret)');
      } catch (error) {
        console.error('Erreur lors de l\'initialisation AdMob:', error);
      }
    };

    // Demander la permission de localisation au démarrage
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('📍 Permission de localisation refusée');
          Alert.alert(
            'Permission requise',
            'Strive a besoin d\'accéder à votre localisation pour vous proposer des événements sportifs près de chez vous.',
            [{ text: 'OK' }]
          );
        } else {
          console.log('📍 Permission de localisation accordée');
        }
      } catch (error) {
        console.error('Erreur lors de la demande de permissions:', error);
      }
    };

    initializeAdMob();
    requestLocationPermission();

    // Vérifier si l'utilisateur est déjà connecté
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Initialiser les push notifications si l'utilisateur est déjà connecté (reconnexion)
      if (session?.user) {
        console.log('🔄 Reconnexion détectée, initialisation des notifications...');
        await PushNotificationService.initialize();
      }
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Initialiser les push notifications quand l'utilisateur se connecte
        if (session?.user) {
          console.log('🔐 Connexion détectée, initialisation des notifications...');
          await PushNotificationService.initialize();
        }
      }
    );

    // Initialiser les push notifications au démarrage (minimal: permission + log token)
    PushNotificationService.initialize();

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <FilterProvider>
        <LocationProvider>
          <View style={styles.container}>
            {user ? <AppNavigator /> : <LoginScreen />}
            <FilterModal />
            <StatusBar style="auto" />
          </View>
        </LocationProvider>
      </FilterProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
