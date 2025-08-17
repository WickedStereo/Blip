import { useState, useEffect } from 'react';
import { Location } from '../types/chat';

interface UseLocationResult {
  location: Location | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
      },
      (err) => {
        let errorMessage = 'Unable to retrieve your location';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        
        // Fallback to demo location (San Francisco)
        console.warn('Using fallback location:', errorMessage);
        setLocation({
          lat: 37.7749,
          lng: -122.4194,
          accuracy: 1000
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation
  };
};
