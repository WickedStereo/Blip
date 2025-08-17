import React, { useState } from 'react';
import { ChatRoom } from './components/Chat';
import { LandingPage } from './components/Landing';
import { ChatRoom as ChatRoomType } from './types/chat';

// Import global styles
import './App.css';

const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<ChatRoomType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleJoinRoom = async (room: ChatRoomType) => {
    setIsTransitioning(true);
    
    // Add smooth transition delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentRoom(room);
    setIsTransitioning(false);
  };

  const handleLeaveRoom = async () => {
    setIsTransitioning(true);
    
    // Add smooth transition delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setCurrentRoom(null);
    setIsTransitioning(false);
  };

  // Show transition overlay
  if (isTransitioning) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid var(--muted)',
            borderTop: '3px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {currentRoom ? 'Loading chat room...' : 'Returning to map...'}
          </div>
        </div>
      </div>
    );
  }

  // Show chat room if one is selected
  if (currentRoom) {
    return (
      <div style={{ 
        animation: 'slideInUp 0.4s ease-out',
        height: '100vh'
      }}>
        <ChatRoom 
          room={currentRoom} 
          onBackClick={handleLeaveRoom}
        />
      </div>
    );
  }

  // Show landing page with map
  return (
    <div style={{ 
      animation: 'fadeIn 0.4s ease-out',
      height: '100vh'
    }}>
      <LandingPage onJoinRoom={handleJoinRoom} />
    </div>
  );
};

export default App;
