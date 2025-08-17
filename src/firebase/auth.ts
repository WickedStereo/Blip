import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from './config';

export type AuthUser = FirebaseUser | null;

/**
 * Sign in anonymously (core feature for Blipz)
 */
export const signInAnonymous = async (): Promise<AuthUser> => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return null;
  }

  try {
    const result = await signInAnonymously(auth);
    console.log('✅ Anonymous sign-in successful:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('❌ Anonymous sign-in failed:', error);
    throw error;
  }
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthChanges = (callback: (user: AuthUser) => void) => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = (): AuthUser => {
  return auth?.currentUser || null;
};

/**
 * Get user display name (anonymous users get a friendly name)
 */
export const getUserDisplayName = (user: AuthUser): string => {
  if (!user) return 'Anonymous';
  
  // For anonymous users, create a friendly name based on their UID
  if (user.isAnonymous) {
    const uidSuffix = user.uid.slice(-6);
    return `User${uidSuffix}`;
  }
  
  return user.displayName || user.email || 'User';
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};
