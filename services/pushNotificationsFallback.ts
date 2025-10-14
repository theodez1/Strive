// Version de fallback pour les notifications push
// À utiliser si expo-notifications ne fonctionne pas

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PushNotificationToken {
  token: string;
  deviceId: string;
  deviceName?: string;
}

class PushNotificationServiceFallback {
  private static instance: PushNotificationServiceFallback;
  private token: string | null = null;

  static getInstance(): PushNotificationServiceFallback {
    if (!PushNotificationServiceFallback.instance) {
      PushNotificationServiceFallback.instance = new PushNotificationServiceFallback();
    }
    return PushNotificationServiceFallback.instance;
  }

  // Version simplifiée pour le développement
  async requestPermissions(): Promise<boolean> {
    console.log('📱 Mode fallback: Permissions simulées');
    return true;
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Générer un token de test
      const testToken = `ExponentPushToken[test-${Date.now()}]`;
      this.token = testToken;
      
      // Sauvegarder localement
      await AsyncStorage.setItem('pushToken', this.token);
      
      // Envoyer au backend
      await this.sendTokenToBackend(this.token);
      
      console.log('📱 Token push de test généré:', this.token);
      return this.token;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du token de test:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').trim();
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (!base || !authToken) {
        console.log('Backend URL ou token auth manquant - mode fallback');
        return;
      }

      const deviceInfo = {
        token,
        deviceId: 'test-device-id',
        deviceName: 'Test Device',
        platform: 'test',
        osVersion: '1.0.0',
      };

      const response = await fetch(`${base}/api/users/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(deviceInfo),
      });

      if (response.ok) {
        console.log('✅ Token de test envoyé au backend avec succès');
      } else {
        console.error('❌ Erreur lors de l\'envoi du token de test:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du token de test au backend:', error);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async initialize(): Promise<void> {
    try {
      console.log('📱 Initialisation du service de notifications (mode fallback)');
      
      // Récupérer le token sauvegardé
      const savedToken = await AsyncStorage.getItem('pushToken');
      if (savedToken) {
        this.token = savedToken;
        console.log('📱 Token de test récupéré:', savedToken);
      }

      // Enregistrer pour les notifications push
      await this.registerForPushNotifications();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des notifications (fallback):', error);
    }
  }

  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<string> {
    console.log(`📅 Notification locale simulée: ${title} - ${body}`);
    return 'test-notification-id';
  }

  async cancelAllNotifications(): Promise<void> {
    console.log('🗑️ Toutes les notifications de test annulées');
  }
}

export default PushNotificationServiceFallback.getInstance();

