import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

interface AdBannerProps {
  size?: BannerAdSize;
  style?: any;
}

// IDs AdMob de production
const BANNER_AD_UNIT_IDS = {
  ios: 'ca-app-pub-7140135240053533/3309903318',
  android: 'ca-app-pub-7140135240053533/8989088489',
};

const AdBanner: React.FC<AdBannerProps> = ({ 
  size = BannerAdSize.ADAPTIVE_BANNER,
  style 
}) => {
  const adUnitId = Platform.OS === 'ios' 
    ? BANNER_AD_UNIT_IDS.ios 
    : BANNER_AD_UNIT_IDS.android;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // RGPD compliant
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
});

export default AdBanner;

