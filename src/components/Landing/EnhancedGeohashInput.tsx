import React, { useState, useCallback, useMemo } from 'react';
import { GeohashInputProps } from '../../types/chat';
import { DEMO_ROOM_CODES } from '../../utils/mockData';
import { formatGeohashForDisplay } from '../../utils/geohashGrid';
import styles from './LandingPage.module.css';

interface EnhancedGeohashInputProps extends GeohashInputProps {
  nearbyGeohashes?: string[];
  userLocation?: { lat: number; lng: number } | null;
}

type InputMode = 'geohash' | 'quick';

const EnhancedGeohashInput: React.FC<EnhancedGeohashInputProps> = ({ 
  onJoinRoom, 
  isLoading = false,
  nearbyGeohashes = []
}) => {
  const [geohash, setGeohash] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<InputMode>('geohash');

  // Validate geohash format
  const validateGeohash = (hash: string): boolean => {
    const geohashRegex = /^[0-9b-hjkmnp-z]{3,12}$/i;
    return geohashRegex.test(hash);
  };

  // Generate suggestions based on input
  const suggestions = useMemo(() => {
    if (!geohash || geohash.length < 2) {
      return [...DEMO_ROOM_CODES, ...nearbyGeohashes].slice(0, 6);
    }
    
    const filtered = [...DEMO_ROOM_CODES, ...nearbyGeohashes].filter(code =>
      code.toLowerCase().includes(geohash.toLowerCase())
    );
    
    return filtered.slice(0, 4);
  }, [geohash, nearbyGeohashes]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedHash = geohash.trim().toLowerCase();
    
    if (!trimmedHash) {
      setError('Please enter a room code');
      return;
    }
    
    if (!validateGeohash(trimmedHash)) {
      setError('Invalid room code format');
      return;
    }
    
    setError('');
    onJoinRoom(trimmedHash);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setGeohash(value);
    
    if (error && value.trim()) {
      setError('');
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setGeohash(suggestion);
    setError('');
    onJoinRoom(suggestion);
  }, [onJoinRoom]);

  // Quick join buttons data
  const quickJoinOptions = [
    { label: 'Random Global', code: DEMO_ROOM_CODES[0], icon: '🌍' },
    { label: 'Popular NYC', code: 'dr5ru7', icon: '🗽' },
    { label: 'SF Bay Area', code: '9q8yy8', icon: '🌉' },
    { label: 'London Hub', code: 'gcpuv9', icon: '🇬🇧' }
  ];

  return (
    <div className={styles.enhancedGeohashSection}>
      <div className={styles.enhancedGeohashTitle}>
        <span>Join Any Room</span>
      </div>

      {/* Mode Toggle */}
      <div className={styles.geohashModeToggle}>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === 'geohash' ? styles.active : ''}`}
          onClick={() => setMode('geohash')}
        >
          Enter Code
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === 'quick' ? styles.active : ''}`}
          onClick={() => setMode('quick')}
        >
          Quick Join
        </button>
      </div>

      {mode === 'geohash' ? (
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={geohash}
              onChange={handleInputChange}
              placeholder="e.g. 9q8yy8"
              className={styles.geohashInput}
              disabled={isLoading}
              maxLength={12}
              style={{
                borderColor: error ? 'var(--destructive)' : undefined,
              }}
            />
            <button
              type="submit"
              className={styles.joinButton}
              disabled={!geohash.trim() || isLoading}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div 
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <span>Joining...</span>
                </div>
              ) : (
                'Join'
              )}
            </button>
          </div>
          
          {error && (
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--destructive)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
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
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className={styles.geohashSuggestions}>
              <div>Try these popular areas:</div>
              <div className={styles.suggestionsList}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                  >
                    {formatGeohashForDisplay(suggestion)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className={styles.quickJoinButtons}>
          {quickJoinOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              className={styles.quickJoinButton}
              onClick={() => handleSuggestionClick(option.code)}
              disabled={isLoading}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{option.icon}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{option.label}</span>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
                  {formatGeohashForDisplay(option.code)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      <div style={{
        marginTop: '1rem',
        fontSize: '0.75rem',
        color: 'var(--muted-foreground)',
        lineHeight: 1.4
      }}>
        <p>Room codes are location-based identifiers. Each 6-character code represents a specific geographic area.</p>
      </div>
    </div>
  );
};

export default EnhancedGeohashInput;
