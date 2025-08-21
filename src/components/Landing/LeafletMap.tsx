import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChatRoom, Location } from '../../types/chat';

import { useMap as useMapState } from '../../hooks/useMap';
import { formatGeohashForDisplay } from '../../utils/geohashGrid';
import styles from './LandingPage.module.css';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapProps {
  userLocation: Location | null;
  nearbyRooms: ChatRoom[];
  onRoomSelect: (room: ChatRoom) => void;
  onCreateRoom: (geohash: string, coordinates: { lat: number; lng: number }) => void;
  selectedRoom?: ChatRoom | null;
  onLocationReset: () => void;
}

// Component to handle map events
const MapEventHandler: React.FC<{
  onBoundsChange: (bounds: LatLngBounds, zoom: number) => void;
}> = ({ onBoundsChange }) => {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds(), map.getZoom());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds(), map.getZoom());
    },
  });

  return null;
};

// Component to handle map centering with robust feedback loop prevention
const MapCenterController: React.FC<{
  center: [number, number];
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  const [lastCenter, setLastCenter] = useState<[number, number]>(center);
  const [lastZoom, setLastZoom] = useState<number>(zoom);
  const [isSettingView, setIsSettingView] = useState(false);
  const lastProgrammaticCenter = useRef<[number, number]>(center);
  const lastProgrammaticZoom = useRef<number>(zoom);

  useEffect(() => {
    // Skip if we're currently setting the view to prevent feedback loops
    if (isSettingView) {
      return;
    }

    // Use zoom-dependent tolerance to handle precision issues at different scales
    const BASE_TOLERANCE = 0.00001; // 1 meter precision at max zoom
    const MAX_ZOOM = 18;
    const ZOOM_TOLERANCE = 0.1;
    
    // Calculate dynamic tolerance based on zoom level
    // At lower zoom levels (world view), tolerance increases exponentially
    const zoomFactor = Math.pow(2, Math.max(0, MAX_ZOOM - zoom));
    const COORD_TOLERANCE = BASE_TOLERANCE * zoomFactor;
    
    const latDiff = Math.abs(center[0] - lastCenter[0]);
    const lngDiff = Math.abs(center[1] - lastCenter[1]);
    const zoomDiff = Math.abs(zoom - lastZoom);
    
    // Check if this change is likely from our own setView call
    const isProgrammaticChange = (
      Math.abs(center[0] - lastProgrammaticCenter.current[0]) < COORD_TOLERANCE &&
      Math.abs(center[1] - lastProgrammaticCenter.current[1]) < COORD_TOLERANCE &&
      Math.abs(zoom - lastProgrammaticZoom.current) < ZOOM_TOLERANCE
    );
    
    // Skip programmatic changes to prevent feedback loops
    if (isProgrammaticChange) {
      console.log('MapCenterController: Skipping programmatic change');
      setLastCenter(center);
      setLastZoom(zoom);
      return;
    }
    
    const hasSignificantChange = (
      latDiff > COORD_TOLERANCE || 
      lngDiff > COORD_TOLERANCE || 
      zoomDiff > ZOOM_TOLERANCE
    );

    // Only update if there's a significant change
    if (hasSignificantChange) {
      console.log(`MapCenterController: Setting view with tolerance ${COORD_TOLERANCE.toFixed(8)} at zoom ${zoom} (lat diff: ${latDiff.toFixed(8)}, lng diff: ${lngDiff.toFixed(8)})`);
      setIsSettingView(true);
      
      // Store the coordinates we're about to set
      lastProgrammaticCenter.current = center;
      lastProgrammaticZoom.current = zoom;
      
      map.setView(center, zoom, { animate: true, duration: 0.5 });
      setLastCenter(center);
      setLastZoom(zoom);
      
      // Reset the flag after a longer timeout to ensure animation is complete
      setTimeout(() => {
        setIsSettingView(false);
        console.log('MapCenterController: Reset isSettingView flag');
      }, 1000); // Increased timeout
    }
  }, [center, zoom, map, lastCenter, lastZoom, isSettingView]);

  return null;
};

// Custom user location icon
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: var(--primary);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};



const LeafletMap: React.FC<LeafletMapProps> = ({
  userLocation,
  nearbyRooms,
  onRoomSelect,
  onCreateRoom,
  selectedRoom,
  onLocationReset
}) => {
  const { mapState, updateMapBounds, goToLocation } = useMapState(userLocation);
  const [showGeohashOverlays, setShowGeohashOverlays] = useState(true);

  // Create room markers with geohash data
  const roomsByGeohash = useCallback(() => {
    const roomMap = new Map<string, ChatRoom>();
    nearbyRooms.forEach(room => {
      roomMap.set(room.geohash, room);
    });
    return roomMap;
  }, [nearbyRooms]);

  // Handle location reset
  const handleLocationReset = useCallback(() => {
    if (userLocation) {
      goToLocation(userLocation.lat, userLocation.lng, 14);
      onLocationReset();
    }
  }, [userLocation, goToLocation, onLocationReset]);



  return (
    <div className={styles.mapContainer} style={{ position: 'relative' }}>
      <MapContainer
        center={mapState.center}
        zoom={mapState.zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map event handlers */}
        <MapEventHandler onBoundsChange={updateMapBounds} />
        <MapCenterController center={mapState.center} zoom={mapState.zoom} />
        
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
          >
            <Popup>
              <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                <strong>Your Location</strong>
                <br />
                <small>
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </small>
                {userLocation.accuracy && (
                  <>
                    <br />
                    <small>Accuracy: ±{Math.round(userLocation.accuracy)}m</small>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Geohash cell overlays */}
        {showGeohashOverlays && mapState.visibleCells.map((cell) => {
          const rooms = roomsByGeohash();
          const hasRoom = rooms.has(cell.geohash);
          const room = rooms.get(cell.geohash);
          const isSelected = selectedRoom?.geohash === cell.geohash;
          
          return (
            <React.Fragment key={cell.geohash}>
              {/* Geohash boundary rectangle */}
              <Rectangle
                bounds={[
                  [cell.bounds.south, cell.bounds.west],
                  [cell.bounds.north, cell.bounds.east]
                ]}
                pathOptions={{
                  color: hasRoom ? 'var(--primary)' : 'var(--muted-foreground)',
                  weight: isSelected ? 3 : 1,
                  opacity: hasRoom ? 0.8 : 0.3,
                  fillOpacity: hasRoom ? 0.1 : 0.05,
                  fillColor: hasRoom ? 'var(--primary)' : 'var(--muted)',
                  dashArray: hasRoom ? undefined : '5, 5'
                }}
                eventHandlers={{
                  click: () => {
                    // For empty regions, just show the popup (don't auto-create)
                    // For existing rooms, the popup button will handle joining
                    console.log('Clicked geohash region:', cell.geohash);
                  },
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      fillOpacity: hasRoom ? 0.2 : 0.1,
                      weight: isSelected ? 3 : 2
                    });
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      fillOpacity: hasRoom ? 0.1 : 0.05,
                      weight: isSelected ? 3 : 1
                    });
                  }
                }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                    <strong>Region: {formatGeohashForDisplay(cell.geohash)}</strong>
                    <br />
                    {hasRoom ? (
                      <div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <strong>{room!.name}</strong>
                          <br />
                          <small>{room!.userCount} users active</small>
                          <br />
                          <small style={{ opacity: 0.7 }}>Click to join conversation</small>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Join Chat clicked for room:', room!.id, room!.name);
                            console.log('Calling onRoomSelect with:', room);
                            onRoomSelect(room!);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease-out',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          💬 Join Chat
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <small style={{ opacity: 0.7 }}>No conversation yet</small>
                          <br />
                          <small style={{ opacity: 0.7 }}>Click to start one</small>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Create Room clicked for geohash:', cell.geohash);
                            onCreateRoom(cell.geohash, cell.center);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--secondary)',
                            color: 'var(--secondary-foreground)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease-out',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}
                        >
                          ✨ Start Chat
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Rectangle>
              
              {/* Geohash center label - only show when not too many cells */}
              {mapState.visibleCells.length <= 20 && (
                <Marker
                  position={[cell.center.lat, cell.center.lng]}
                  icon={L.divIcon({
                    className: 'geohash-label',
                    html: `
                      <div style="
                        background: rgba(255, 255, 255, 0.9);
                        border: 1px solid var(--border);
                        border-radius: 4px;
                        padding: 2px 6px;
                        font-family: var(--font-mono);
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: var(--foreground);
                        text-align: center;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                        pointer-events: none;
                      ">
                        ${formatGeohashForDisplay(cell.geohash)}
                      </div>
                    `,
                    iconSize: [60, 20],
                    iconAnchor: [30, 10],
                  })}
                />
              )}
            </React.Fragment>
          );
        })}

      </MapContainer>
      
      {/* Map controls overlay */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {/* Location reset button */}
        <button
          onClick={handleLocationReset}
          disabled={!userLocation}
          style={{
            padding: '0.75rem',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: userLocation ? 'pointer' : 'not-allowed',
            opacity: userLocation ? 1 : 0.5,
            boxShadow: 'var(--shadow)',
            transition: 'all 0.2s ease-out'
          }}
          title="Go to my location"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </button>
        
        {/* Toggle geohash overlays */}
        <button
          onClick={() => setShowGeohashOverlays(!showGeohashOverlays)}
          style={{
            padding: '0.75rem',
            background: showGeohashOverlays ? 'var(--primary)' : 'var(--card)',
            color: showGeohashOverlays ? 'var(--primary-foreground)' : 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow)',
            transition: 'all 0.2s ease-out'
          }}
          title={showGeohashOverlays ? 'Hide regions' : 'Show regions'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <line x1="9" x2="9" y1="3" y2="21" />
            <line x1="15" x2="15" y1="3" y2="21" />
            <line x1="3" x2="21" y1="9" y2="9" />
            <line x1="3" x2="21" y1="15" y2="15" />
          </svg>
        </button>
      </div>
      
      {/* Loading indicator */}
      {mapState.isLoading && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'var(--card)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <div style={{
            width: '1rem',
            height: '1rem',
            border: '2px solid var(--muted)',
            borderTop: '2px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading regions...
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
