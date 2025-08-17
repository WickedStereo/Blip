import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types/chat';
import { subscribeToMessages, sendMessage as sendFirestoreMessage, joinRoom, leaveRoom } from '../firebase/firestore';

interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
}

export const useMessages = (roomId: string | null): UseMessagesResult => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to messages when room changes
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Join the room
    joinRoom(roomId).catch(err => {
      console.warn('Failed to join room:', err);
    });

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    // Cleanup: leave room when component unmounts or room changes
    return () => {
      unsubscribe();
      leaveRoom(roomId).catch(err => {
        console.warn('Failed to leave room:', err);
      });
    };
  }, [roomId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!roomId || !text.trim()) return;

    try {
      setError(null);
      await sendFirestoreMessage(roomId, text.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [roomId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearError
  };
};
