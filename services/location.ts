import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  isCurrentLocation?: boolean; // true = GPS, false = ville fixe
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  codesPostaux?: string[];
  isCurrentLocation?: boolean;
  savedAt: string;
}

const LOCATION_STORAGE_KEY = 'saved_locations';
const CURRENT_LOCATION_KEY = 'current_location';
const LOCATION_MODE_KEY = 'location_mode'; // 'current' ou 'fixed'
const SEARCH_RADIUS_KEY = 'search_radius'; // Rayon de recherche en km

class LocationService {
  private currentLocation: LocationData | null = null;

  /**
   * Demande les permissions de localisation
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission de localisation refusée');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('Permission background:', backgroundStatus);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la demande de permissions:', error);
      return false;
    }
  }

  /**
   * Obtient la position actuelle de l'utilisateur
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 100,
      });

      const { latitude, longitude } = location.coords;
      
      // Géocodage inverse pour obtenir l'adresse
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const addressData = reverseGeocode[0];
      
      const locationData: LocationData = {
        latitude,
        longitude,
        address: this.formatAddress(addressData),
        city: addressData.city || addressData.district,
        region: addressData.region,
        country: addressData.country,
        isCurrentLocation: true, // C'est une position GPS
      };

      this.currentLocation = locationData;
      
      // Sauvegarder la localisation actuelle
      await this.saveCurrentLocation(locationData);
      
      return locationData;
    } catch (error) {
      console.error('Erreur lors de l\'obtention de la position:', error);
      return null;
    }
  }

  /**
   * Recherche des adresses avec l'API française
   */
  async searchAddresses(query: string): Promise<SavedLocation[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&limit=10&boost=population&fields=nom,code,codeDepartement,codeRegion,centre,codesPostaux`
      );

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      const data = await response.json();
      
      return data.map((commune: any) => ({
        id: `commune_${commune.code}`,
        name: commune.nom,
        address: commune.nom,
        city: commune.nom,
        region: commune.codeRegion,
        latitude: commune.centre.coordinates[1],
        longitude: commune.centre.coordinates[0],
        codesPostaux: commune.codesPostaux || [],
        savedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresses:', error);
      return [];
    }
  }

  /**
   * Sauvegarde une localisation
   */
  async saveLocation(location: Omit<SavedLocation, 'id' | 'savedAt'>): Promise<void> {
    try {
      const savedLocations = await this.getSavedLocations();
      
      const newLocation: SavedLocation = {
        ...location,
        id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        savedAt: new Date().toISOString(),
      };

      savedLocations.push(newLocation);
      
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY, 
        JSON.stringify(savedLocations)
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la localisation:', error);
    }
  }

  /**
   * Récupère les localisations sauvegardées
   */
  async getSavedLocations(): Promise<SavedLocation[]> {
    try {
      const data = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des localisations:', error);
      return [];
    }
  }

  /**
   * Supprime une localisation sauvegardée
   */
  async removeLocation(locationId: string): Promise<void> {
    try {
      const savedLocations = await this.getSavedLocations();
      const filteredLocations = savedLocations.filter(loc => loc.id !== locationId);
      
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY, 
        JSON.stringify(filteredLocations)
      );
    } catch (error) {
      console.error('Erreur lors de la suppression de la localisation:', error);
    }
  }

  /**
   * Sauvegarde la localisation actuelle
   */
  private async saveCurrentLocation(location: LocationData): Promise<void> {
    try {
      await AsyncStorage.setItem(CURRENT_LOCATION_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la localisation actuelle:', error);
    }
  }

  /**
   * Récupère la localisation actuelle sauvegardée
   */
  async getSavedCurrentLocation(): Promise<LocationData | null> {
    try {
      const data = await AsyncStorage.getItem(CURRENT_LOCATION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la localisation actuelle:', error);
      return null;
    }
  }

  /**
   * Calcule la distance entre deux points (formule de Haversine)
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Arrondi à 2 décimales
  }

  /**
   * Convertit les degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Formate une adresse à partir des données de géocodage
   */
  private formatAddress(addressData: any): string {
    const parts = [];
    
    if (addressData.street) parts.push(addressData.street);
    if (addressData.streetNumber) parts.push(addressData.streetNumber);
    if (addressData.city) parts.push(addressData.city);
    if (addressData.region) parts.push(addressData.region);
    
    return parts.join(', ');
  }

  /**
   * Définit une ville fixe comme localisation
   */
  async setFixedCity(cityData: Omit<LocationData, 'isCurrentLocation'>): Promise<void> {
    const fixedLocation: LocationData = {
      ...cityData,
      isCurrentLocation: false, // C'est une ville fixe, pas GPS
    };

    this.currentLocation = fixedLocation;
    await this.saveCurrentLocation(fixedLocation);
    await AsyncStorage.setItem(LOCATION_MODE_KEY, 'fixed');
  }

  /**
   * Active le mode position actuelle (GPS)
   */
  async enableCurrentLocationMode(): Promise<void> {
    const location = await this.getCurrentLocation();
    if (location) {
      location.isCurrentLocation = true;
      this.currentLocation = location;
      await this.saveCurrentLocation(location);
      await AsyncStorage.setItem(LOCATION_MODE_KEY, 'current');
    }
  }

  /**
   * Obtient le mode de localisation actuel
   */
  async getLocationMode(): Promise<'current' | 'fixed'> {
    try {
      const mode = await AsyncStorage.getItem(LOCATION_MODE_KEY);
      return (mode as 'current' | 'fixed') || 'current';
    } catch (error) {
      console.error('Erreur lors de la récupération du mode de localisation:', error);
      return 'current';
    }
  }

  /**
   * Obtient la localisation actuelle (depuis le cache ou GPS)
   */
  async getLocation(): Promise<LocationData | null> {
    const mode = await this.getLocationMode();
    
    if (mode === 'fixed') {
      // En mode fixe, retourner la localisation sauvegardée
      const savedLocation = await this.getSavedCurrentLocation();
      if (savedLocation) {
        this.currentLocation = savedLocation;
        return savedLocation;
      }
    }

    // En mode current ou si pas de localisation fixe, utiliser GPS
    if (this.currentLocation && this.currentLocation.isCurrentLocation) {
      return this.currentLocation;
    }

    // Essayer de récupérer depuis le cache
    const savedLocation = await this.getSavedCurrentLocation();
    if (savedLocation && savedLocation.isCurrentLocation) {
      this.currentLocation = savedLocation;
      return savedLocation;
    }

    // Sinon, obtenir la position GPS
    return await this.getCurrentLocation();
  }

  /**
   * Sauvegarde le rayon de recherche
   */
  async saveSearchRadius(radius: number): Promise<void> {
    try {
      await AsyncStorage.setItem(SEARCH_RADIUS_KEY, radius.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du rayon:', error);
    }
  }

  /**
   * Récupère le rayon de recherche sauvegardé
   */
  async getSearchRadius(): Promise<number> {
    try {
      const savedRadius = await AsyncStorage.getItem(SEARCH_RADIUS_KEY);
      return savedRadius ? parseInt(savedRadius, 10) : 10; // 10km par défaut
    } catch (error) {
      console.error('Erreur lors de la récupération du rayon:', error);
      return 10; // 10km par défaut
    }
  }
}

export const locationService = new LocationService();
