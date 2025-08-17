import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { ChatRoom, Message, Location } from '../types/chat';
import { getCurrentUser, getUserDisplayName } from './auth';
import { calculateDistance, encodeGeohash } from '../utils/geohash';

export interface FirestoreRoom {
  id: string;
  code: string;
  geohash: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  userCount: number;
  isKidSafe: boolean;
  createdAt: Timestamp;
  lastActivity: Timestamp;
}

export interface FirestoreMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * Get or create a room based on geohash (one room per geohash)
 */
export const getOrCreateGeohashRoom = async (geohash: string, coordinates?: Location): Promise<ChatRoom> => {
  if (!db) throw new Error('Firestore not initialized');
  
  try {
    // Always try to find existing room first
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('geohash', '==', geohash), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const roomDoc = querySnapshot.docs[0];
      const roomData = roomDoc.data() as FirestoreRoom;
      
      return {
        id: roomDoc.id,
        code: roomData.geohash, // Use geohash as the code
        name: `Region ${roomData.geohash.toUpperCase()}`,
        location: roomData.location || `Area ${roomData.geohash.substring(0, 4)}`,
        userCount: roomData.userCount || 0,
        isNew: false,
        isKidSafe: roomData.isKidSafe,
        geohash: roomData.geohash,
        coordinates: roomData.coordinates,
        distanceFromUser: 0, // Will be calculated later
        lastActivity: roomData.lastActivity?.toDate() || new Date()
      };
    }
    
    // Create new room if it doesn't exist and coordinates are provided
    if (!coordinates) {
      // Return a placeholder room for display purposes
      return {
        id: `placeholder-${geohash}`,
        code: geohash,
        name: `Region ${geohash.toUpperCase()}`,
        location: `Area ${geohash.substring(0, 4)}`,
        userCount: 0,
        isNew: true,
        isKidSafe: true,
        geohash,
        coordinates: { lat: 0, lng: 0 }, // Will be set when created
        distanceFromUser: 0,
        lastActivity: new Date()
      };
    }
    
    const newRoom: Omit<FirestoreRoom, 'id'> = {
      code: geohash,
      geohash,
      name: `Region ${geohash.toUpperCase()}`,
      location: `Area ${geohash.substring(0, 4)}`,
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng
      },
      userCount: 1,
      isKidSafe: true,
      createdAt: serverTimestamp() as Timestamp,
      lastActivity: serverTimestamp() as Timestamp
    };
    
    const docRef = await addDoc(roomsRef, newRoom);
    
    return {
      id: docRef.id,
      code: geohash,
      name: `Region ${geohash.toUpperCase()}`,
      location: `Area ${geohash.substring(0, 4)}`,
      userCount: 1,
      isNew: true,
      isKidSafe: true,
      geohash,
      coordinates,
      distanceFromUser: 0,
      lastActivity: new Date()
    };
    
  } catch (error) {
    console.error('Error getting/creating geohash room:', error);
    throw error;
  }
};

/**
 * Check if a room exists for a geohash
 */
export const checkGeohashRoomExists = async (geohash: string): Promise<boolean> => {
  if (!db) return false;
  
  try {
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('geohash', '==', geohash), limit(1));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking geohash room:', error);
    return false;
  }
};

/**
 * Get nearby geohash rooms based on user location (includes user's current geohash)
 */
export const getNearbyGeohashRooms = async (userLocation: Location, radiusKm: number = 10): Promise<ChatRoom[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  try {
    // Get user's current geohash (6 char precision for room level)
    const userGeohash = encodeGeohash(userLocation.lat, userLocation.lng, 6);
    
    // Get all active rooms
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, orderBy('lastActivity', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    
    const activeRooms: ChatRoom[] = [];
    const activeGeohashes = new Set<string>();
    
    // Process active rooms
    querySnapshot.forEach((doc) => {
      const roomData = doc.data() as FirestoreRoom;
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        roomData.coordinates.lat,
        roomData.coordinates.lng
      );
      
      // Filter by radius
      if (distance <= radiusKm * 1000) {
        activeGeohashes.add(roomData.geohash);
        activeRooms.push({
          id: doc.id,
          code: roomData.geohash,
          name: `Region ${roomData.geohash.toUpperCase()}`,
          location: roomData.location || `Area ${roomData.geohash.substring(0, 4)}`,
          userCount: roomData.userCount || 0,
          isNew: false,
          isKidSafe: roomData.isKidSafe,
          geohash: roomData.geohash,
          coordinates: roomData.coordinates,
          distanceFromUser: Math.round(distance),
          lastActivity: roomData.lastActivity?.toDate() || new Date()
        });
      }
    });
    
    // Always include user's current geohash room (active or placeholder)
    if (!activeGeohashes.has(userGeohash)) {
      const userGeohashRoom = await getOrCreateGeohashRoom(userGeohash, userLocation);
      userGeohashRoom.distanceFromUser = 0; // User's current location
      activeRooms.unshift(userGeohashRoom); // Add at the beginning
    }
    
    // Sort by distance, with user's geohash first
    return activeRooms.sort((a, b) => {
      if (a.geohash === userGeohash) return -1;
      if (b.geohash === userGeohash) return 1;
      return (a.distanceFromUser || 0) - (b.distanceFromUser || 0);
    });
    
  } catch (error) {
    console.error('Error getting nearby geohash rooms:', error);
    return [];
  }
};

/**
 * Legacy function for backward compatibility
 */
export const getNearbyRooms = getNearbyGeohashRooms;

/**
 * Subscribe to messages in a room
 */
export const subscribeToMessages = (
  roomId: string, 
  callback: (messages: Message[]) => void
) => {
  if (!db) {
    console.warn('Firestore not initialized');
    return () => {};
  }
  
  const messagesRef = collection(db, `rooms/${roomId}/messages`);
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
  
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    const currentUser = getCurrentUser();
    
    snapshot.forEach((doc) => {
      const messageData = doc.data() as FirestoreMessage;
      const isOwnMessage = currentUser && messageData.userId === currentUser.uid;
      
      // Calculate time progress (0-100% towards expiry)
      const now = new Date();
      const created = messageData.createdAt?.toDate() || now;
      const expires = messageData.expiresAt?.toDate() || new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const totalTime = expires.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      const timeProgress = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
      
      messages.push({
        id: doc.id,
        text: messageData.text,
        type: isOwnMessage ? 'user' : 'other',
        username: isOwnMessage ? 'You' : messageData.username,
        timestamp: created,
        timeProgress,
        isDisappearing: timeProgress > 95
      });
    });
    
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
    callback([]);
  });
};

/**
 * Send a message to a room
 */
export const sendMessage = async (roomId: string, text: string): Promise<void> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');
  
  try {
    const messagesRef = collection(db, `rooms/${roomId}/messages`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const newMessage: Omit<FirestoreMessage, 'id'> = {
      roomId,
      userId: currentUser.uid,
      username: getUserDisplayName(currentUser),
      text: text.trim(),
      createdAt: serverTimestamp() as Timestamp,
      expiresAt: Timestamp.fromDate(expiresAt)
    };
    
    await addDoc(messagesRef, newMessage);
    
    // Update room's last activity
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastActivity: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Join a room (increment user count)
 */
export const joinRoom = async (roomId: string): Promise<void> => {
  if (!db) throw new Error('Firestore not initialized');
  
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      const currentCount = roomDoc.data().userCount || 0;
      await updateDoc(roomRef, {
        userCount: currentCount + 1,
        lastActivity: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error joining room:', error);
  }
};

/**
 * Leave a room (decrement user count)
 */
export const leaveRoom = async (roomId: string): Promise<void> => {
  if (!db) throw new Error('Firestore not initialized');
  
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      const currentCount = roomDoc.data().userCount || 1;
      await updateDoc(roomRef, {
        userCount: Math.max(0, currentCount - 1)
      });
    }
  } catch (error) {
    console.error('Error leaving room:', error);
  }
};

/**
 * Clean up expired messages (called periodically)
 */
export const cleanupExpiredMessages = async (): Promise<void> => {
  if (!db) return;
  
  try {
    // This would typically be handled by Cloud Functions
    // For now, it's a placeholder for client-side cleanup
    console.log('Message cleanup would run here (handled by Cloud Functions)');
  } catch (error) {
    console.error('Error cleaning up messages:', error);
  }
};
