import { useState, useEffect, useCallback } from 'react';
import { ChatRoom, Location } from '../types/chat';
import { getNearbyGeohashRooms, getOrCreateGeohashRoom } from '../firebase/firestore';

interface UseRoomsResult {
  nearbyRooms: ChatRoom[];
  loading: boolean;
  error: string | null;
  refreshRooms: () => void;
  joinRoomByGeohash: (geohash: string) => Promise<ChatRoom>;
}

export const useRooms = (userLocation: Location | null): UseRoomsResult => {
  const [nearbyRooms, setNearbyRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNearbyRooms = useCallback(async () => {
    if (!userLocation) return;

    setLoading(true);
    setError(null);

    try {
      const rooms = await getNearbyGeohashRooms(userLocation, 10); // 10km radius
      setNearbyRooms(rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
      console.error('Error loading nearby geohash rooms:', err);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  // Load rooms when location changes
  useEffect(() => {
    loadNearbyRooms();
  }, [loadNearbyRooms]);

  const refreshRooms = useCallback(() => {
    loadNearbyRooms();
  }, [loadNearbyRooms]);

  const joinRoomByGeohash = useCallback(async (geohash: string): Promise<ChatRoom> => {
    try {
      // Get or create the geohash-based room
      const room = await getOrCreateGeohashRoom(geohash, userLocation || undefined);
      
      // Refresh nearby rooms to include the new room
      if (userLocation) {
        refreshRooms();
      }
      
      return room;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userLocation, refreshRooms]);

  return {
    nearbyRooms,
    loading,
    error,
    refreshRooms,
    joinRoomByGeohash
  };
};
