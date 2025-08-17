import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatRoom as ChatRoomType, User } from '../../types/chat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import TypingIndicator from './TypingIndicator';
import { useMessages } from '../../firebase';
import styles from './ChatRoom.module.css';

interface ChatRoomProps {
  room: ChatRoomType;
  onBackClick: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ room, onBackClick }) => {
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [onlineCount] = useState(room.userCount);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use Firebase hooks
  const { messages, loading: messagesLoading, error: messagesError, sendMessage } = useMessages(room.id);
  
  const isConnected = !messagesError;

  // Log room changes
  useEffect(() => {
    console.log('Joined room:', room.code, room.id);
  }, [room.id, room.code]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle new message
  const handleSendMessage = useCallback(async (text: string) => {
    try {
      await sendMessage(text);
      // Message will be automatically added via the useMessages hook
    } catch (error) {
      console.error('Failed to send message:', error);
      // Error handling is done in the useMessages hook
    }
  }, [sendMessage]);

  // Simulate typing indicator (keeping for demo purposes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const usernames = ['alex', 'sam', 'jordan', 'casey', 'morgan'];
        const username = usernames[Math.floor(Math.random() * usernames.length)];
        
        setTypingUsers([{
          id: username,
          username,
          status: 'online',
          isTyping: true,
        }]);

        setTimeout(() => {
          setTypingUsers([]);
        }, 2000 + Math.random() * 3000);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Handle visibility change for battery optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      const animationElements = document.querySelectorAll(`.${styles.pulseGlow}, .${styles.typingDot}`);
      animationElements.forEach(el => {
        const element = el as HTMLElement;
        if (document.hidden) {
          element.style.animationPlayState = 'paused';
        } else {
          element.style.animationPlayState = 'running';
        }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const roomWithUpdatedCount = { ...room, userCount: onlineCount };

  return (
    <div className={styles.chatContainer}>
      <ChatHeader room={roomWithUpdatedCount} onBackClick={onBackClick} />
      
      {/* Ephemeral Notice Bar */}
      <div className={`${styles.noticeBar} ${styles.ephemeralNotice}`}>
        <div className={styles.noticeContent}>
          <span>⚡</span>
          <span>Messages disappear in 24h</span>
          <span>•</span>
          <span>🛡️ Kid-safe mode</span>
        </div>
      </div>

      {/* New Room Banner */}
      {room.isNew && (
        <div className={`${styles.noticeBar} ${styles.newRoomBanner} ${styles.messageEnter}`}>
          <div className={styles.noticeContent}>
            <span>🎉</span>
            <span>Welcome to {room.code}! You're the first here.</span>
          </div>
        </div>
      )}

      <MessageList messages={messages} />
      
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}
      
      <MessageComposer 
        onSendMessage={handleSendMessage}
        isConnected={isConnected}
        disabled={messagesLoading}
      />
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatRoom;
