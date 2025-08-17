import React, { useState, useCallback } from 'react';
import { useAuth } from '../../firebase';
import styles from './LandingPage.module.css';

interface UserControlsProps {
  onUsernameChange?: (username: string) => void;
}

const UserControls: React.FC<UserControlsProps> = ({ onUsernameChange }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');

  // Get display name from user
  const getDisplayName = useCallback(() => {
    if (!user) return 'Anonymous';
    if (currentUsername) return currentUsername;
    if (user.isAnonymous) {
      const uidSuffix = user.uid.slice(-6);
      return `User${uidSuffix}`;
    }
    return user.displayName || user.email || 'User';
  }, [user, currentUsername]);

  const handleStartEdit = () => {
    setTempUsername(getDisplayName());
    setIsEditing(true);
  };

  const handleSaveUsername = () => {
    const trimmed = tempUsername.trim();
    if (trimmed && trimmed !== getDisplayName()) {
      setCurrentUsername(trimmed);
      onUsernameChange?.(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTempUsername('');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveUsername();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={styles.userControls}>
      <div className={styles.userInfo}>
        <div className={styles.userAvatar}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </div>
        
        {isEditing ? (
          <div className={styles.usernameEdit}>
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveUsername}
              className={styles.usernameInput}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
            />
          </div>
        ) : (
          <div className={styles.usernameDisplay}>
            <span className={styles.username}>{getDisplayName()}</span>
            <button
              onClick={handleStartEdit}
              className={styles.editButton}
              title="Change username"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {user && (
        <div className={styles.userMeta}>
          <span className={styles.userType}>
            {user.isAnonymous ? 'Anonymous' : 'Signed In'}
          </span>
          <span className={styles.userSeparator}>•</span>
          <span className={styles.userId} title={`User ID: ${user.uid}`}>
            ID: {user.uid.slice(-6)}
          </span>
        </div>
      )}
    </div>
  );
};

export default UserControls;
