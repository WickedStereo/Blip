// Firebase configuration
export { default as app, auth, db, analytics } from './config';

// Authentication utilities
export * from './auth';

// Firestore utilities
export * from './firestore';
export { 
  getOrCreateGeohashRoom, 
  checkGeohashRoomExists, 
  getNearbyGeohashRooms 
} from './firestore';

// React hooks
export { useAuth } from '../hooks/useAuth';
export { useLocation } from '../hooks/useLocation';
export { useRooms } from '../hooks/useRooms';
export { useMessages } from '../hooks/useMessages';
