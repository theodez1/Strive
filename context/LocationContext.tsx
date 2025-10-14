import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { locationService, LocationData, SavedLocation } from '../services/location';

interface LocationContextType {
  currentLocation: LocationData | null;
  savedLocations: SavedLocation[];
  isLoading: boolean;
  error: string | null;
  locationMode: 'current' | 'fixed';
  searchRadius: number; // Rayon de recherche en km
  
  // Actions
  refreshCurrentLocation: () => Promise<void>;
  searchAddresses: (query: string) => Promise<SavedLocation[]>;
  saveLocation: (location: Omit<SavedLocation, 'id' | 'savedAt'>) => Promise<void>;
  removeLocation: (locationId: string) => Promise<void>;
  setCurrentLocation: (location: LocationData) => void;
  setFixedCity: (cityData: Omit<LocationData, 'isCurrentLocation'>) => Promise<void>;
  enableCurrentLocationMode: () => Promise<void>;
  setSearchRadius: (radius: number) => Promise<void>;
  
  // Utilitaires
  getLocationDisplayName: () => string;
  calculateDistance: (lat: number, lon: number) => number;
  isCurrentLocationMode: () => boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [currentLocation, setCurrentLocationState] = useState<LocationData | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<'current' | 'fixed'>('current');
  const [searchRadius, setSearchRadiusState] = useState<number>(10); // Rayon par défaut de 10km

  // Charger la localisation au démarrage
  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Charger le mode de localisation
      const mode = await locationService.getLocationMode();
      setLocationMode(mode);
      
      // Charger les localisations sauvegardées
      const saved = await locationService.getSavedLocations();
      setSavedLocations(saved);
      
      // Charger le rayon de recherche sauvegardé
      const savedRadius = await locationService.getSearchRadius();
      setSearchRadiusState(savedRadius);
      
      // Charger la localisation actuelle
      const location = await locationService.getLocation();
      setCurrentLocationState(location);
    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la localisation:', err);
      setError('Erreur lors du chargement de la localisation');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const location = await locationService.getCurrentLocation();
      setCurrentLocationState(location);
    } catch (err) {
      console.error('Erreur lors de l\'actualisation de la localisation:', err);
      setError('Erreur lors de l\'obtention de la localisation');
    } finally {
      setIsLoading(false);
    }
  };

  const searchAddresses = async (query: string): Promise<SavedLocation[]> => {
    try {
      setError(null);
      return await locationService.searchAddresses(query);
    } catch (err) {
      console.error('Erreur lors de la recherche d\'adresses:', err);
      setError('Erreur lors de la recherche');
      return [];
    }
  };

  const saveLocation = async (location: Omit<SavedLocation, 'id' | 'savedAt'>) => {
    try {
      setError(null);
      await locationService.saveLocation(location);
      
      // Actualiser la liste des localisations sauvegardées
      const saved = await locationService.getSavedLocations();
      setSavedLocations(saved);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const removeLocation = async (locationId: string) => {
    try {
      setError(null);
      await locationService.removeLocation(locationId);
      
      // Actualiser la liste des localisations sauvegardées
      const saved = await locationService.getSavedLocations();
      setSavedLocations(saved);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const setCurrentLocation = (location: LocationData) => {
    setCurrentLocationState(location);
  };

  const setFixedCity = async (cityData: Omit<LocationData, 'isCurrentLocation'>) => {
    try {
      setError(null);
      await locationService.setFixedCity(cityData);
      const location = await locationService.getLocation();
      setCurrentLocationState(location);
      setLocationMode('fixed');
    } catch (err) {
      console.error('Erreur lors de la définition de la ville fixe:', err);
      setError('Erreur lors de la définition de la ville');
    }
  };

  const enableCurrentLocationMode = async () => {
    try {
      setError(null);
      await locationService.enableCurrentLocationMode();
      const location = await locationService.getLocation();
      setCurrentLocationState(location);
      setLocationMode('current');
    } catch (err) {
      console.error('Erreur lors de l\'activation du mode position actuelle:', err);
      setError('Erreur lors de l\'activation du mode position actuelle');
    }
  };

  const getLocationDisplayName = (): string => {
    if (!currentLocation) {
      return 'Localisation inconnue';
    }

    if (currentLocation.city) {
      return currentLocation.city;
    }

    if (currentLocation.address) {
      return currentLocation.address;
    }

    return `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
  };

  const calculateDistance = (lat: number, lon: number): number => {
    if (!currentLocation) {
      return 0;
    }

    return locationService.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      lat,
      lon
    );
  };

  const isCurrentLocationMode = (): boolean => {
    return locationMode === 'current';
  };

  const setSearchRadius = async (radius: number): Promise<void> => {
    try {
      setSearchRadiusState(radius);
      // Sauvegarder le rayon dans le stockage local
      await locationService.saveSearchRadius(radius);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du rayon:', err);
    }
  };

  const contextValue: LocationContextType = {
    currentLocation,
    savedLocations,
    isLoading,
    error,
    locationMode,
    searchRadius,
    refreshCurrentLocation,
    searchAddresses,
    saveLocation,
    removeLocation,
    setCurrentLocation,
    setFixedCity,
    enableCurrentLocationMode,
    setSearchRadius,
    getLocationDisplayName,
    calculateDistance,
    isCurrentLocationMode,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation doit être utilisé dans un LocationProvider');
  }
  return context;
}

export default LocationContext;
