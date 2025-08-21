import { useState, useEffect, useCallback } from 'react';
import { LatLngBounds } from 'leaflet';
import { Location } from '../types/chat';
import { 
  ViewportBounds, 
  GeohashCell, 
  getVisibleGeohashCells, 
  debounce
} from '../utils/geohashGrid';

export interface MapState {
  center: [number, number];
  zoom: number;
  bounds: ViewportBounds | null;
  visibleCells: GeohashCell[];
  isLoading: boolean;
}

export interface UseMapResult {
  mapState: MapState;
  updateMapBounds: (bounds: LatLngBounds, zoom: number) => void;
  setUserLocation: (location: Location) => void;
  goToLocation: (lat: number, lng: number, zoom?: number) => void;
  refreshVisibleCells: () => void;
}

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;

export const useMap = (userLocation?: Location | null): UseMapResult => {
  const [mapState, setMapState] = useState<MapState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bounds: null,
    visibleCells: [],
    isLoading: false
  });

  // Debounced function to update visible cells
  const debouncedUpdateCells = useCallback(
    debounce((bounds: ViewportBounds, zoom: number) => {
      setMapState(prev => ({ ...prev, isLoading: true }));
      
      try {
        const cells = getVisibleGeohashCells(bounds, zoom, 50);
        console.log(`Generated ${cells.length} unique geohash cells at zoom ${zoom}`);
        setMapState(prev => ({
          ...prev,
          visibleCells: cells,
          isLoading: false
        }));
      } catch (error) {
        console.error('Error updating visible cells:', error);
        setMapState(prev => ({ ...prev, isLoading: false }));
      }
    }, 300),
    []
  );

  // Update map bounds and calculate visible cells
  const updateMapBounds = useCallback((leafletBounds: LatLngBounds, zoom: number) => {
    const bounds: ViewportBounds = {
      north: leafletBounds.getNorth(),
      south: leafletBounds.getSouth(),
      east: leafletBounds.getEast(),
      west: leafletBounds.getWest()
    };

    const newCenter = leafletBounds.getCenter();
    
    // Use zoom-dependent tolerance to handle precision issues at different scales
    const BASE_TOLERANCE = 0.00001; // 1 meter precision at max zoom
    const MAX_ZOOM = 18;
    
    // Calculate dynamic tolerance based on zoom level
    const zoomFactor = Math.pow(2, Math.max(0, MAX_ZOOM - zoom));
    const COORD_TOLERANCE = BASE_TOLERANCE * zoomFactor;
    
    // Only update center if it's significantly different to avoid feedback loops
    setMapState(prev => {
      const latDiff = Math.abs(newCenter.lat - prev.center[0]);
      const lngDiff = Math.abs(newCenter.lng - prev.center[1]);
      
      const shouldUpdateCenter = (
        latDiff > COORD_TOLERANCE ||
        lngDiff > COORD_TOLERANCE
      );

      if (shouldUpdateCenter) {
        console.log(`updateMapBounds: Updating center with tolerance ${COORD_TOLERANCE.toFixed(8)} at zoom ${zoom} (lat diff: ${latDiff.toFixed(8)}, lng diff: ${lngDiff.toFixed(8)})`);
      }

      return {
        ...prev,
        bounds,
        zoom,
        // Only update center if there's a significant change
        center: shouldUpdateCenter ? [newCenter.lat, newCenter.lng] : prev.center
      };
    });

    // Update visible cells with debouncing
    debouncedUpdateCells(bounds, zoom);
  }, [debouncedUpdateCells]); // Removed mapState.center dependency to prevent circular updates

  // Set user location and update map center
  const setUserLocation = useCallback((location: Location) => {
    setMapState(prev => ({
      ...prev,
      center: [location.lat, location.lng]
    }));
  }, []);

  // Go to specific location
  const goToLocation = useCallback((lat: number, lng: number, zoom: number = DEFAULT_ZOOM) => {
    setMapState(prev => ({
      ...prev,
      center: [lat, lng],
      zoom
    }));
  }, []);

  // Refresh visible cells manually
  const refreshVisibleCells = useCallback(() => {
    if (mapState.bounds) {
      debouncedUpdateCells(mapState.bounds, mapState.zoom);
    }
  }, [mapState.bounds, mapState.zoom, debouncedUpdateCells]);

  // Initialize with user location
  useEffect(() => {
    if (userLocation) {
      setMapState(prev => ({
        ...prev,
        center: [userLocation.lat, userLocation.lng]
      }));
    }
  }, [userLocation]);

  return {
    mapState,
    updateMapBounds,
    setUserLocation,
    goToLocation,
    refreshVisibleCells
  };
};
