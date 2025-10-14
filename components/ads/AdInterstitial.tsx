import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// IDs AdMob de production pour les interstitiels
const INTERSTITIAL_AD_UNIT_IDS = {
  ios: 'ca-app-pub-7140135240053533/1971419845',
  android: 'ca-app-pub-7140135240053533/3118331626', // À compléter quand vous créez l'interstitiel Android
};

const adUnitId = Platform.OS === 'ios' 
  ? INTERSTITIAL_AD_UNIT_IDS.ios 
  : INTERSTITIAL_AD_UNIT_IDS.android;

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

/**
 * Hook pour gérer les publicités interstitielles
 */
export const useInterstitialAd = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
      console.log('📱 Interstitiel chargé');
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      console.log('📱 Interstitiel fermé');
      // Recharger une nouvelle pub
      interstitial.load();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('❌ Erreur interstitiel:', error);
      setLoaded(false);
    });

    // Charger la première pub
    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const showAd = async () => {
    if (loaded) {
      await interstitial.show();
    } else {
      console.log('⚠️ Interstitiel pas encore chargé');
    }
  };

  return { loaded, showAd };
};

export default interstitial;


