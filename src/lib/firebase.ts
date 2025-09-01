
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/**
 * Initialize Firebase with configuration from localStorage or empty values
 * Users will need to provide their own Firebase config in the settings
 */
export const initializeFirebase = () => {
  // Get Firebase config from localStorage if it exists
  const savedConfig = localStorage.getItem('firebase_config');
  const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  };

  // Only initialize if apiKey exists
  if (firebaseConfig.apiKey) {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const auth = getAuth(app);
      const storage = getStorage(app);

      return { app, firestore, auth, storage, isConfigured: true };
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      return { isConfigured: false, error };
    }
  } else {
    return { isConfigured: false };
  }
};

// Create a singleton instance to be used across the app
let firebaseInstance = null;

export const getFirebaseInstance = () => {
  if (!firebaseInstance) {
    firebaseInstance = initializeFirebase();
  }
  return firebaseInstance;
};

// Reset the Firebase instance (used when updating config)
export const resetFirebaseInstance = () => {
  firebaseInstance = null;
  return getFirebaseInstance();
};
