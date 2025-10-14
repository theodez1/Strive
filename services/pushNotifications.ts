import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Handler comme dans l'exemple Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class SimplePushService {
  private static instance: SimplePushService;
  private initialized = false;

  static getInstance(): SimplePushService {
    if (!SimplePushService.instance) {
      SimplePushService.instance = new SimplePushService();
    }
    return SimplePushService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Canal Android (comme l'exemple Expo)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (!Device.isDevice) {
        console.log('⚠️ Les notifications push nécessitent un appareil physique.');
        return;
      }

      const perms = await Notifications.getPermissionsAsync();
      let status = perms.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        console.log('❌ Permission de notification refusée');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || (Constants as any)?.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log('📱 Expo push token:', token.data);
    } catch (error) {
      console.error('Erreur notifications simples:', error);
    }
  }
}

export default SimplePushService.getInstance();
