import { useState, useEffect } from 'react';
import { signInAnonymous, subscribeToAuthChanges, AuthUser } from '../firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      setLoading(false);
      
      // Auto sign-in anonymously if no user
      if (!authUser) {
        handleSignIn();
      }
    });

    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInAnonymous();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // For anonymous users, we just refresh the page
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  };

  return {
    user,
    loading,
    error,
    signIn: handleSignIn,
    signOut,
    isAuthenticated: !!user
  };
};
