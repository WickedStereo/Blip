import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration (from your existing setup)
const firebaseConfig = {
  apiKey: "AIzaSyCMl-iIeU6cpr-Bk6qucd4bGzI7fYSGQ6E",
  authDomain: "blip-d93fe.firebaseapp.com",
  projectId: "blip-d93fe",
  storageBucket: "blip-d93fe.firebasestorage.app",
  messagingSenderId: "1072811487056",
  appId: "1:1072811487056:web:83ac5279538a6e5f898655",
  measurementId: "G-J2V4RT6XHN"
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Analytics only in production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    analytics = getAnalytics(app);
  }
  
  // Connect to emulators in development (optional)
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      // Note: Emulator connections should only be done once per app lifecycle
      // connectAuthEmulator(auth, 'http://localhost:9099');
      // connectFirestoreEmulator(db, 'localhost', 8080);
    } catch (error) {
      console.log('Emulator connection skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  // Create mock objects to prevent errors during development
  auth = null;
  db = null;
  analytics = null;
}

export { auth, db, analytics };
export default app;
