export interface Message {
  id: string;
  text: string;
  type: 'user' | 'other' | 'system';
  username: string;
  timestamp: Date;
  timeProgress: number; // Percentage of time elapsed before expiry (0-100)
  isDisappearing?: boolean;
}

export interface User {
  id: string;
  username: string;
  isTyping?: boolean;
  status: 'online' | 'away' | 'offline';
}

export interface ChatRoom {
  id: string;
  code: string;
  name: string;
  location: string;
  userCount: number;
  isNew?: boolean;
  isKidSafe?: boolean;
  geohash: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distanceFromUser?: number; // in meters
  lastActivity?: Date;
}

export interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isConnected?: boolean;
}

export interface ChatHeaderProps {
  room: ChatRoom;
  onBackClick: () => void;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface RoomCardProps {
  room: ChatRoom;
  onJoin: (room: ChatRoom) => void;
  isSelected?: boolean;
}

export interface GeohashInputProps {
  onJoinRoom: (geohash: string) => void;
  isLoading?: boolean;
}

export interface LandingPageProps {
  onJoinRoom: (room: ChatRoom) => void;
}
