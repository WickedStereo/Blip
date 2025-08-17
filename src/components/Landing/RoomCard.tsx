import React from 'react';
import { RoomCardProps } from '../../types/chat';
import { formatGeohashForDisplay } from '../../utils/geohashGrid';
import styles from './LandingPage.module.css';

const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin, isSelected = false }) => {
  const formatDistance = (distance?: number): string => {
    if (!distance || distance < 100) return 'Here';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const isCurrentLocation = (room.distanceFromUser || 0) < 100;
  const isPlaceholder = room.id.startsWith('placeholder-');

  const cardClasses = [
    styles.roomCard,
    styles.roomCardEnhanced,
    isSelected ? styles.roomCardSelected : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={() => onJoin(room)}>
      <div className={styles.roomCardHeader}>
        <div className={styles.roomInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 className={styles.roomName}>
              Region {formatGeohashForDisplay(room.geohash)}
            </h3>
            {isCurrentLocation && (
              <span style={{
                fontSize: '0.7rem',
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
                padding: '0.125rem 0.375rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '500'
              }}>
                You're here
              </span>
            )}
          </div>
          <p className={styles.roomLocation}>{room.location}</p>
        </div>
        
        <div className={styles.roomUsers}>
          {isPlaceholder ? (
            <span style={{ 
              fontSize: '0.75rem', 
              color: 'var(--muted-foreground)',
              fontStyle: 'italic'
            }}>
              Create
            </span>
          ) : (
            <>
              <span className={styles.userCount}>{room.userCount}</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="m22 21-3-3m0 0-3-3m3 3h-3h3v-3v3" />
              </svg>
            </>
          )}
        </div>
        
        {/* Activity indicator */}
        {!isPlaceholder && room.userCount > 0 && (
          <div className={`${styles.roomActivityIndicator} ${
            room.userCount > 5 ? '' : room.userCount > 2 ? 'medium' : 'low'
          }`} />
        )}
      </div>
      
      <div className={styles.roomMeta}>
        <div className={styles.metaItem}>
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
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{formatDistance(room.distanceFromUser)}</span>
        </div>
        
        {!isPlaceholder && room.lastActivity && (
          <div className={styles.metaItem}>
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span>{formatTimeAgo(room.lastActivity)}</span>
          </div>
        )}
        
        {room.isKidSafe && (
          <div className={styles.kidSafeIcon} title="Family-friendly area">
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Geohash display chip */}
      <div className={styles.roomGeohashChip}>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <line x1="9" x2="9" y1="3" y2="21" />
          <line x1="15" x2="15" y1="3" y2="21" />
          <line x1="3" x2="21" y1="9" y2="9" />
          <line x1="3" x2="21" y1="15" y2="15" />
        </svg>
        {room.geohash}
      </div>
    </div>
  );
};

export default RoomCard;