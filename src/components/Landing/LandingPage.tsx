import React, { useState, useEffect, useCallback } from 'react';
import { LandingPageProps, ChatRoom } from '../../types/chat';
import LeafletMap from './LeafletMap';
import RoomCard from './RoomCard';
import UserControls from './UserControls';
import EnhancedGeohashInput from './EnhancedGeohashInput';
import { useAuth, useLocation, useRooms } from '../../firebase';
import { getOrCreateGeohashRoom } from '../../firebase/firestore';
import { getRandomDemoRoomCode } from '../../utils/mockData';
import styles from './LandingPage.module.css';

const LandingPage: React.FC<LandingPageProps> = ({ onJoinRoom }) => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
  // Use Firebase hooks
  const { loading: authLoading } = useAuth();
  const { location: userLocation, loading: locationLoading, error: locationError, requestLocation } = useLocation();
  const { nearbyRooms, loading: roomsLoading, joinRoomByGeohash, refreshRooms } = useRooms(userLocation);
  
  const isLoadingLocation = locationLoading || authLoading;

  // Auto-select the closest room when rooms are loaded
  useEffect(() => {
    if (nearbyRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(nearbyRooms[0]);
    }
  }, [nearbyRooms, selectedRoom]);

  // Handle room joining
  const handleJoinRoom = useCallback(async (room: ChatRoom) => {
    setIsJoiningRoom(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onJoinRoom(room);
    setIsJoiningRoom(false);
  }, [onJoinRoom]);

  // Handle room selection from map
  const handleRoomSelect = useCallback((room: ChatRoom) => {
    console.log('Room selected from map:', room.id, room.name);
    setSelectedRoom(room);
    // Automatically join the selected room
    handleJoinRoom(room);
  }, [handleJoinRoom]);

  // Handle creating/joining a geohash room
  const handleGeohashRoomAction = useCallback(async (geohash: string, coordinates: { lat: number; lng: number }) => {
    setIsJoiningRoom(true);
    
    try {
      const room = await getOrCreateGeohashRoom(geohash, { 
        lat: coordinates.lat, 
        lng: coordinates.lng 
      });
      onJoinRoom(room);
      
      // Refresh rooms to show the updated room
      refreshRooms();
    } catch (error) {
      console.error('Failed to join/create geohash room:', error);
    } finally {
      setIsJoiningRoom(false);
    }
  }, [onJoinRoom, refreshRooms]);

  // Handle joining room by geohash
  const handleJoinByGeohash = useCallback(async (geohash: string) => {
    setIsJoiningRoom(true);
    
    try {
      const room = await joinRoomByGeohash(geohash);
      onJoinRoom(room);
    } catch (error) {
      console.error('Failed to join room:', error);
      // Error is already handled by the hook
    } finally {
      setIsJoiningRoom(false);
    }
  }, [onJoinRoom, joinRoomByGeohash]);

  // Handle location reset
  const handleLocationReset = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  // Handle username change
  const handleUsernameChange = useCallback((username: string) => {
    // In a real app, you might want to store this in Firebase or local storage
    console.log('Username changed to:', username);
  }, []);

  const getLocationStatusText = (): string => {
    if (isLoadingLocation) return 'Getting location...';
    if (locationError) return 'Location unavailable';
    if (userLocation) return `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
    return 'Unknown location';
  };

  const getLocationStatusIcon = () => {
    if (isLoadingLocation) {
      return (
        <div className={styles.spinner} style={{ width: '1rem', height: '1rem' }} />
      );
    }
    
    return (
      <svg
        className={styles.locationIcon}
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
    );
  };

  return (
    <div className={styles.landingContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div style={{ 
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>💬</span>
            <span className={styles.logoText}>Blipz</span>
          </div>
        </div>
        
        <div className={styles.locationStatus}>
          {getLocationStatusIcon()}
          <span>{getLocationStatusText()}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Map Section */}
        <div className={styles.mapSection}>
          <LeafletMap
            userLocation={userLocation}
            nearbyRooms={nearbyRooms}
            onRoomSelect={handleRoomSelect}
            onCreateRoom={handleGeohashRoomAction}
            selectedRoom={selectedRoom}
            onLocationReset={handleLocationReset}
          />
        </div>

        {/* Side Panel */}
        <div className={styles.sidePanel}>
          {/* User Controls */}
          <UserControls onUsernameChange={handleUsernameChange} />

          {/* Enhanced Geohash Input */}
          <EnhancedGeohashInput 
            onJoinRoom={handleJoinByGeohash}
            isLoading={isJoiningRoom}
            nearbyGeohashes={nearbyRooms.map(room => room.geohash)}
            userLocation={userLocation}
          />

          {/* Panel Header */}
          <div className={styles.sidePanelHeader}>
            <h2 className={styles.sidePanelTitle}>Geohash Rooms</h2>
            <p className={styles.sidePanelSubtitle}>
              Nearby conversations and your current area
            </p>
          </div>

          {/* Unified Rooms List */}
          <div className={styles.roomsList}>
            <div className={styles.roomsListTitle}>
              <span>Area Rooms</span>
              <span className={styles.roomCount}>
                {nearbyRooms.length} region{nearbyRooms.length !== 1 ? 's' : ''}
              </span>
            </div>

            {isLoadingLocation || roomsLoading ? (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner} />
                <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)' }}>
                  {authLoading ? 'Connecting...' : locationLoading ? 'Getting location...' : 'Finding nearby rooms...'}
                </p>
              </div>
            ) : nearbyRooms.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🌍</div>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  color: 'var(--foreground)'
                }}>
                  No rooms nearby
                </h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
                  Be the first to start a conversation in your area!
                </p>
                <button
                  onClick={() => {
                    const demoCode = getRandomDemoRoomCode();
                    handleJoinByGeohash(demoCode);
                  }}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Try Demo Room
                </button>
              </div>
            ) : (
              nearbyRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={handleJoinRoom}
                  isSelected={selectedRoom?.id === room.id}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Loading overlay when joining */}
      {isJoiningRoom && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--card)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div className={styles.spinner} />
            <p style={{ color: 'var(--foreground)', fontWeight: '500' }}>
              Joining room...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
