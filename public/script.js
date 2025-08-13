// 1. Firebase Configuration (REPLACE with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyCMl-iIeU6cpr-Bk6qucd4bGzI7fYSGQ6E",
    authDomain: "blip-d93fe.firebaseapp.com",
    projectId: "blip-d93fe",
    storageBucket: "blip-d93fe.firebasestorage.app",
    messagingSenderId: "1072811487056",
    appId: "1:1072811487056:web:83ac5279538a6e5f898655",
    measurementId: "G-J2V4RT6XHN"
};

// 2. Initialize Firebase and Services (with error handling)
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} catch (error) {
    console.log('Firebase not available:', error.message);
    // Create mock objects to prevent errors
    auth = { currentUser: null };
    db = { collection: () => ({ doc: () => ({ get: () => Promise.resolve({ exists: false }) }) }) };
}

// Navigation state management
let currentNavState = 'main'; // 'main' or 'chat'
let isTransitioning = false;

// 3. DOM Elements - Safe element selection with null checks
const userIdElement = document.getElementById('user-id');
const geohashElement = document.getElementById('geohash');
const privacyToggle = document.getElementById('privacy-toggle');
const nearbyRoomsContainer = document.getElementById('nearby-rooms');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

// Helper function for safe DOM element access
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

let activeChatRoom = null;
let messageUnsubscribe = null; // To keep track of the active listener
let presenceUnsubscribe = null; // To keep track of presence listener
let typingTimeout = null;
let replyToMessage = null; // To keep track of the message being replied to
let presenceInterval = null;
let lastKnownPosition = null;

// 5. Core App Logic
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeNavigation();
    handleUrlParameters(); // Handle URL parameters for room joining
    handleAnonymousAuth();
    setupLocationListener();
    setupRoomSelectionListener();
    setupMessageSending();
    setupNameChangeListener();
    setupAvatarChangeListener();
    setupEmojiPicker();
    setupJoinByIdListener();
    setupRadiusSearch();
    setupThemeToggle();
    setupSoundToggle();
    setupAutoResizeTextarea();
    setupRecentlyJoinedRooms();
    setupNotificationSystem();
    setupKeyboardShortcuts();
    setupBackButton();
    setupCopyRoomLink();
    checkForFirstVisit(); // Show onboarding for new users
});

// Recently Joined Rooms Management
function getRecentlyJoinedRooms() {
    const recent = localStorage.getItem('recentlyJoinedRooms');
    return recent ? JSON.parse(recent) : [];
}

function addToRecentlyJoinedRooms(geohash) {
    let recentRooms = getRecentlyJoinedRooms();
    
    // Remove if already exists to avoid duplicates
    recentRooms = recentRooms.filter(room => room.geohash !== geohash);
    
    // Add to beginning of array
    recentRooms.unshift({
        geohash: geohash,
        timestamp: Date.now(),
        lastVisited: new Date().toISOString()
    });
    
    // Keep only last 10 rooms
    recentRooms = recentRooms.slice(0, 10);
    
    localStorage.setItem('recentlyJoinedRooms', JSON.stringify(recentRooms));
    updateRecentlyJoinedRoomsDisplay();
}

function updateRecentlyJoinedRoomsDisplay() {
    const recentRooms = getRecentlyJoinedRooms();
    const recentRoomsList = document.querySelector('#recent-rooms .rooms-list');
    
    if (!recentRoomsList) return;
    
    recentRoomsList.innerHTML = '';
    
    if (recentRooms.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.classList.add('empty-state');
        emptyState.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No recently visited rooms</p>';
        recentRoomsList.appendChild(emptyState);
        return;
    }
    
    recentRooms.slice(0, 5).forEach(room => {
        const li = document.createElement('li');
        li.classList.add('room-item');
        
        const roomInfo = document.createElement('div');
        roomInfo.classList.add('room-info');
        
        const roomId = document.createElement('div');
        roomId.classList.add('room-id');
        roomId.textContent = room.geohash;
        
        const roomMeta = document.createElement('div');
        roomMeta.classList.add('room-meta');
        roomMeta.textContent = `Visited ${formatTimeAgo(room.timestamp)}`;
        
        roomInfo.appendChild(roomId);
        roomInfo.appendChild(roomMeta);
        
        const joinButton = document.createElement('button');
        joinButton.classList.add('btn', 'btn-outline', 'btn-sm');
        joinButton.textContent = 'Rejoin';
        joinButton.dataset.geohash = room.geohash;
        
        li.appendChild(roomInfo);
        li.appendChild(joinButton);
        
        recentRoomsList.appendChild(li);
    });
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}

function setupRecentlyJoinedRooms() {
    // This will be called when DOM is ready
    updateRecentlyJoinedRoomsDisplay();
}

// Check if this is the user's first visit and show onboarding
function checkForFirstVisit() {
    const hasVisited = localStorage.getItem('hasVisitedBlipz');
    if (!hasVisited) {
        // Delay onboarding slightly to let the page load
        setTimeout(() => {
            showOnboardingModal();
        }, 1000);
    }
}

// Show onboarding modal for new users
function showOnboardingModal() {
    const onboardingModal = document.createElement('div');
    onboardingModal.classList.add('modal-overlay');
    onboardingModal.setAttribute('role', 'dialog');
    onboardingModal.setAttribute('aria-labelledby', 'onboarding-title');
    onboardingModal.setAttribute('aria-describedby', 'onboarding-content');
    
    onboardingModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="onboarding-title">Welcome to Blipz! 💬</h2>
                <button class="modal-close" aria-label="Close welcome guide">×</button>
            </div>
            <div id="onboarding-content" class="modal-body">
                <div class="onboarding-section">
                    <h3>🛡️ Privacy-First Location Chat</h3>
                    <p>Blipz uses your approximate location to connect you with nearby people without sharing your exact coordinates. Your GPS data never leaves your device.</p>
                </div>
                
                <div class="onboarding-section">
                    <h3>🔐 How It Works</h3>
                    <ul>
                        <li><strong>Anonymous:</strong> No sign-up required</li>
                        <li><strong>Location-based:</strong> Chat with people in your area</li>
                        <li><strong>Private:</strong> Only approximate location is shared</li>
                        <li><strong>Temporary:</strong> Messages are deleted after 24 hours</li>
                    </ul>
                </div>
                
                <div class="onboarding-section">
                    <h3>🚀 Getting Started</h3>
                    <ol>
                        <li>Allow location access when prompted</li>
                        <li>Join an existing room or create a new one</li>
                        <li>Start chatting with nearby people</li>
                        <li>Share room links to invite specific people</li>
                    </ol>
                </div>
                
                <div class="onboarding-section">
                    <h3>⌨️ Quick Tips</h3>
                    <ul>
                        <li>Press <kbd>?</kbd> to see keyboard shortcuts</li>
                        <li>Press <kbd>R</kbd> to quickly join a room</li>
                        <li>Use <kbd>Shift + Enter</kbd> for new lines in messages</li>
                        <li>Toggle dark mode with <kbd>T</kbd></li>
                    </ul>
                </div>
                
                <div class="onboarding-actions">
                    <button class="btn btn-primary onboarding-continue">Get Started</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(onboardingModal);
    
    // Mark as visited
    localStorage.setItem('hasVisitedBlipz', 'true');
    
    // Focus the continue button
    const continueButton = onboardingModal.querySelector('.onboarding-continue');
    const closeButton = onboardingModal.querySelector('.modal-close');
    
    if (continueButton) {
        continueButton.focus();
        
        continueButton.addEventListener('click', () => {
            document.body.removeChild(onboardingModal);
            // Focus the room input to get started
            const roomInput = document.getElementById('room-id-input');
            if (roomInput) {
                roomInput.focus();
            }
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            document.body.removeChild(onboardingModal);
        });
    }
    
    // Close modal on overlay click or Escape key
    onboardingModal.addEventListener('click', (e) => {
        if (e.target === onboardingModal) {
            document.body.removeChild(onboardingModal);
        }
    });
    
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            document.body.removeChild(onboardingModal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Handle URL parameters for direct room joining
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    
    if (roomParam) {
        // Validate room ID format (should be 6 characters)
        if (roomParam.length === 6) {
            // Wait for authentication and then join the room
            setTimeout(() => {
                if (auth && auth.currentUser) {
                    selectChatRoom(roomParam);
                    showNotification(`Joining room from link: ${roomParam}`, 'info');
                } else {
                    // Try again after a short delay if auth is not ready
                    setTimeout(() => {
                        if (auth && auth.currentUser) {
                            selectChatRoom(roomParam);
                            showNotification(`Joining room from link: ${roomParam}`, 'info');
                        }
                    }, 1000);
                }
            }, 500);
        } else {
            showNotification('Invalid room ID in URL. Room IDs must be 6 characters.', 'error');
        }
        
        // Clean up URL without refreshing page
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ===========================================
// TWO-LEVEL NAVIGATION SYSTEM
// ===========================================

function initializeNavigation() {
    // Set initial navigation state to main
    setNavigationState('main');
    
    // Set up body class for initial state
    document.body.className = 'app-state-main';
}

function setNavigationState(state, options = {}) {
    if (isTransitioning) return;
    
    const validStates = ['main', 'chat'];
    if (!validStates.includes(state)) {
        console.error('Invalid navigation state:', state);
        return;
    }
    
    if (currentNavState === state) return;
    
    isTransitioning = true;
    
    // Add transitioning class for smooth animations
    document.body.classList.add('app-state-transitioning');
    
    setTimeout(() => {
        // Update state
        currentNavState = state;
        
        // Update body classes
        document.body.className = `app-state-${state}`;
        
        // Handle back button
        handleBackButton();
        
        // Handle chat action buttons
        handleChatActionButtons();
        
        // Update chat title if entering chat state
        if (state === 'chat' && options.roomId) {
            updateChatTitle(options.roomId);
        }
        
        // Complete transition after allowing CSS animations to complete
        setTimeout(() => {
            isTransitioning = false;
        }, 200);
        
        // Show notification if provided
        if (options.notification) {
            showNotification(options.notification.message, options.notification.type || 'info');
        }
    }, 200); // Increased timing for better visual effect
}

function handleBackButton() {
    // Use our existing back button in the header instead of creating a new one
    const backButton = safeGetElement('back-to-rooms-btn');
    
    if (backButton) {
        if (currentNavState === 'chat') {
            // Show our header back button
            backButton.style.display = 'flex';
        } else {
            // Hide our header back button
            backButton.style.display = 'none';
        }
    }
}

function handleChatActionButtons() {
    const copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
    
    if (copyRoomLinkBtn) {
        if (currentNavState === 'chat') {
            // Show copy room link button
            copyRoomLinkBtn.style.display = 'flex';
        } else {
            // Hide copy room link button
            copyRoomLinkBtn.style.display = 'none';
        }
    }
}

function navigateToMain() {
    setNavigationState('main', {
        notification: {
            message: 'Returned to room selection',
            type: 'info'
        }
    });
}

function navigateToChat(roomId, roomLabel) {
    setNavigationState('chat', {
        roomId: roomId,
        notification: {
            message: `Joined room: ${roomLabel || roomId}`,
            type: 'success'
        }
    });
}

function updateChatTitle(roomId) {
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
        chatTitle.textContent = `Chat Room: ${roomId}`;
    }
}

// Keyboard shortcuts for enhanced navigation
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Only handle shortcuts when not typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            // Handle Enter key in room ID input
            if (event.key === 'Enter' && event.target.id === 'room-id-input') {
                event.preventDefault();
                const joinBtn = document.getElementById('join-by-id-btn');
                if (joinBtn) joinBtn.click();
            }
            return;
        }
        
        // Global keyboard shortcuts
        switch (event.key) {
            case 'Escape':
                // ESC key to go back to main from chat
                if (currentNavState === 'chat') {
                    event.preventDefault();
                    navigateToMain();
                }
                break;
            
            case 'r':
                // 'r' key to focus on room ID input (when in main state)
                if (currentNavState === 'main' && !event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    const roomInput = document.getElementById('room-id-input');
                    if (roomInput) {
                        roomInput.focus();
                        roomInput.select();
                    }
                }
                break;
                
            case 'm':
                // 'm' key to focus on message input (when in chat state)
                if (currentNavState === 'chat' && !event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    const messageInput = document.getElementById('new-message');
                    if (messageInput) {
                        messageInput.focus();
                    }
                }
                break;
                
            case 't':
                // 't' key to toggle theme
                if (!event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    const themeToggle = document.getElementById('theme-toggle');
                    if (themeToggle) themeToggle.click();
                }
                break;
                
            case 's':
                // 's' key to toggle sound
                if (!event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    const soundToggle = document.getElementById('sound-toggle');
                    if (soundToggle) soundToggle.click();
                }
                break;
                
            case '?':
                // '?' key to show keyboard shortcuts help
                if (!event.ctrlKey && !event.metaKey) {
                    event.preventDefault();
                    showKeyboardShortcutsHelp();
                }
                break;
        }
    });
}

// Show keyboard shortcuts help modal
function showKeyboardShortcutsHelp() {
    const helpModal = document.createElement('div');
    helpModal.classList.add('modal-overlay');
    helpModal.setAttribute('role', 'dialog');
    helpModal.setAttribute('aria-labelledby', 'shortcuts-title');
    helpModal.setAttribute('aria-describedby', 'shortcuts-content');
    
    helpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
                <button class="modal-close" aria-label="Close shortcuts help">×</button>
            </div>
            <div id="shortcuts-content" class="modal-body">
                <div class="shortcuts-section">
                    <h3>Global Shortcuts</h3>
                    <div class="shortcut-item">
                        <kbd>?</kbd>
                        <span>Show this help</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>T</kbd>
                        <span>Toggle dark/light theme</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>S</kbd>
                        <span>Toggle sound notifications</span>
                    </div>
                </div>
                
                <div class="shortcuts-section">
                    <h3>Room Selection</h3>
                    <div class="shortcut-item">
                        <kbd>R</kbd>
                        <span>Focus room ID input</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Enter</kbd>
                        <span>Join room (when room ID focused)</span>
                    </div>
                </div>
                
                <div class="shortcuts-section">
                    <h3>Chat Interface</h3>
                    <div class="shortcut-item">
                        <kbd>M</kbd>
                        <span>Focus message input</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Enter</kbd>
                        <span>Send message</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Shift + Enter</kbd>
                        <span>New line in message</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Escape</kbd>
                        <span>Return to room selection</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Focus the modal for keyboard navigation
    const closeButton = helpModal.querySelector('.modal-close');
    if (closeButton) {
        closeButton.focus();
        
        // Close modal on click or Enter/Space
        closeButton.addEventListener('click', () => {
            document.body.removeChild(helpModal);
        });
        
        closeButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.body.removeChild(helpModal);
            }
        });
    }
    
    // Close modal on overlay click or Escape key
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            document.body.removeChild(helpModal);
        }
    });
    
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            document.body.removeChild(helpModal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Enhanced room switching functionality
function switchToRoom(roomId, roomLabel) {
    if (currentNavState === 'chat' && activeChatRoom === roomId) {
        // Already in this room, just show notification
        showNotification(`Already in room ${roomId}`, 'info');
        return;
    }
    
    // Navigate to chat with the new room
    navigateToChat(roomId, roomLabel);
}

// ===========================================
// END NAVIGATION SYSTEM
// ===========================================

// Message Reactions
function addReactionToMessage(messageId, reaction) {
    const user = auth.currentUser;
    if (!user || !activeChatRoom) return;
    
    const reactionRef = db.collection('chatRooms')
        .doc(activeChatRoom)
        .collection('messages')
        .doc(messageId)
        .collection('reactions')
        .doc(`${user.uid}_${reaction}`);
    
    // Toggle reaction - if exists, remove it; if doesn't exist, add it
    reactionRef.get().then(doc => {
        if (doc.exists) {
            reactionRef.delete();
        } else {
            reactionRef.set({
                userId: user.uid,
                reaction: reaction,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

function displayMessageReactions(messageElement, messageId) {
    const reactionsContainer = messageElement.querySelector('.message-reactions');
    if (!reactionsContainer) return;
    
    // Listen for reaction changes
    const reactionRef = db.collection('chatRooms')
        .doc(activeChatRoom)
        .collection('messages')
        .doc(messageId)
        .collection('reactions');
    
    reactionRef.onSnapshot(snapshot => {
        const reactions = {};
        const userReactions = new Set();
        const currentUser = auth.currentUser;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const reaction = data.reaction;
            
            if (!reactions[reaction]) {
                reactions[reaction] = [];
            }
            reactions[reaction].push(data.userId);
            
            if (currentUser && data.userId === currentUser.uid) {
                userReactions.add(reaction);
            }
        });
        
        // Clear and rebuild reactions display
        reactionsContainer.innerHTML = '';
        
        Object.entries(reactions).forEach(([reaction, users]) => {
            const reactionBtn = document.createElement('button');
            reactionBtn.classList.add('reaction-btn');
            if (userReactions.has(reaction)) {
                reactionBtn.classList.add('user-reacted');
            }
            
            reactionBtn.innerHTML = `${reaction} ${users.length}`;
            reactionBtn.onclick = () => addReactionToMessage(messageId, reaction);
            
            reactionsContainer.appendChild(reactionBtn);
        });
    });
}

// Confirmation Dialog utility
function showConfirmationDialog(message, onConfirm, onCancel = null) {
    return new Promise((resolve) => {
        const confirmed = confirm(message);
        if (confirmed) {
            if (onConfirm) onConfirm();
            resolve(true);
        } else {
            if (onCancel) onCancel();
            resolve(false);
        }
    });
}

// Copy Room Link functionality
function setupCopyRoomLink() {
    const copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
    if (!copyRoomLinkBtn) {
        console.warn('Copy room link button not found');
        return;
    }

    copyRoomLinkBtn.addEventListener('click', async () => {
        if (!activeChatRoom) {
            showNotification('No active room to copy link for.', 'warning');
            return;
        }

        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${activeChatRoom}`;
        
        try {
            await navigator.clipboard.writeText(roomUrl);
            showNotification('Room link copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = roomUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showNotification('Room link copied to clipboard!', 'success');
        }
    });
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function setupThemeToggle() {
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Sound Management
function setupSoundToggle() {
    if (!soundToggle) {
        console.warn('Sound toggle button not found');
        return;
    }
    
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    updateSoundIcon(soundEnabled);
    
    soundToggle.addEventListener('click', () => {
        const currentlyEnabled = localStorage.getItem('soundEnabled') !== 'false';
        const newState = !currentlyEnabled;
        
        localStorage.setItem('soundEnabled', newState.toString());
        updateSoundIcon(newState);
        
        if (newState) {
            showNotification('Sound notifications enabled', 'success');
        } else {
            showNotification('Sound notifications disabled', 'info');
        }
    });
}

// Add loading state for room search
function showRoomSearchLoading() {
    const nearbyRoomsList = document.querySelector('#nearby-rooms .rooms-list');
    nearbyRoomsList.innerHTML = '<li class="room-item loading"></li><li class="room-item loading"></li><li class="room-item loading"></li>';
}

function hideRoomSearchLoading() {
    // This will be handled by displayNearbyRooms when it clears the list
}

function updateSoundIcon(enabled) {
    soundIcon.textContent = enabled ? '🔊' : '🔇';
    soundToggle.classList.toggle('muted', !enabled);
}

function playNotificationSound() {
    if (localStorage.getItem('soundEnabled') === 'false') return;
    
    // Create a simple notification sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Web Audio API not supported:', error);
    }
}

// Notification System
function showNotification(message, type = 'info', duration = 3000) {
    // Show visual notification
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Announce to screen readers
    announceToScreenReader(message);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Announce important messages to screen readers
function announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-announcements');
    if (liveRegion) {
        liveRegion.textContent = message;
        // Clear after a short delay to reset for next announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

function setupNotificationSystem() {
    // Request notification permission for browser notifications
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>',
            tag: 'blip-message'
        });
    }
}

// Auto-resize textarea
function setupAutoResizeTextarea() {
    const textarea = safeGetElement('new-message');
    
    if (!textarea) {
        console.error('Message textarea not found');
        return;
    }
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 96) + 'px'; // Max 6rem (96px)
    });
    
    // Reset height when message is sent - this is now handled in setupMessageSending
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const sendButton = safeGetElement('send-button');
            if (sendButton) {
                sendButton.click();
            }
            this.style.height = 'auto';
        }
    });
}

function handleAnonymousAuth() {
    // Skip Firebase auth if not available
    if (!auth.onAuthStateChanged) {
        console.log('Firebase auth not available, skipping authentication');
        return;
    }
    
    auth.onAuthStateChanged(async user => {
        if (user) {
            // User is signed in anonymously.
            console.log('Anonymous user signed in:', user.uid);
            await ensureUserProfile(user); // Make sure the user has a profile
            updateUIForUser(user);
        } else {
            // User is signed out.
            auth.signInAnonymously().catch(error => {
                console.error("Error signing in anonymously:", error);
            });
        }
    });
}

function setupRadiusSearch() {
    const searchBtn = document.getElementById('search-radius-btn');
    const radiusInput = document.getElementById('radius-input');

    searchBtn.addEventListener('click', () => {
        const radiusKm = parseFloat(radiusInput.value);
        if (lastKnownPosition && radiusKm > 0) {
            showRoomSearchLoading();
            showNotification(`Searching for rooms within ${radiusKm}km...`, 'info', 2000);
            discoverRoomsByKmRadius(lastKnownPosition, radiusKm);
        } else if (!lastKnownPosition) {
            showNotification('Location not available. Please enable location services.', 'error');
        } else {
            showNotification('Please enter a valid radius.', 'error');
        }
    });

    // Also allow Enter key to trigger search
    radiusInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
}

async function discoverRoomsByKmRadius(position, radiusKm) {
    try {
        const { latitude, longitude } = position;
        const radiusMeters = radiusKm * 1000;

        // The bboxes method from ngeohash gives us a set of geohash prefixes
        // that are guaranteed to cover the entire search area.
        const geohashPrefixes = ngeohash.bboxes(latitude, longitude, radiusMeters, 6);

        console.log(`Searching within ${geohashPrefixes.length} geohash prefixes for a ${radiusKm}km radius.`);

        // We need to run a query for each prefix.
        const queryPromises = geohashPrefixes.map(prefix => {
            const endPrefix = prefix + '~';
            return db.collection('chatRooms')
                     .where('geohash', '>=', prefix)
                     .where('geohash', '<', endPrefix)
                     .get();
        });

        const querySnapshots = await Promise.all(queryPromises);

        const rooms = [];
        const roomIds = new Set();
        querySnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                if (!roomIds.has(doc.id)) {
                    rooms.push({ id: doc.id, ...doc.data() });
                    roomIds.add(doc.id);
                }
            });
        });
        
        console.log(`Found ${rooms.length} unique rooms.`);
        const userGeohashForJoinButton = ngeohash.encode(latitude, longitude, 6);
        displayNearbyRooms(rooms, userGeohashForJoinButton);
        
        if (rooms.length === 0) {
            showNotification(`No existing rooms found within ${radiusKm}km. Create one by joining your location!`, 'info', 4000);
        } else {
            showNotification(`Found ${rooms.length} room(s) within ${radiusKm}km`, 'success');
        }
    } catch (error) {
        console.error('Error discovering rooms:', error);
        showNotification('Error searching for rooms. Please try again.', 'error');
        
        // Clear loading state on error
        const nearbyRoomsList = document.querySelector('#nearby-rooms .rooms-list');
        nearbyRoomsList.innerHTML = '<li class="empty-state"><p>Error loading rooms. Please try again.</p></li>';
    }
}


function setupJoinByIdListener() {
    const joinBtn = document.getElementById('join-by-id-btn');
    const input = document.getElementById('room-id-input');

    joinBtn.addEventListener('click', async () => {
        const roomId = input.value.trim();
        
        // Validate room ID
        const validationResult = validateRoomId(roomId);
        if (!validationResult.valid) {
            showNotification(validationResult.message, 'error');
            input.focus();
            return;
        }
        
        // Add loading state
        const originalText = joinBtn.textContent;
        joinBtn.disabled = true;
        joinBtn.textContent = 'Joining...';
        
        try {
            // For testing navigation without Firebase
            if (typeof firebase === 'undefined') {
                // Test navigation directly and set active room
                activeChatRoom = roomId;
                navigateToChat(roomId, `Test Room ${roomId}`);
                input.value = '';
            } else {
                await selectChatRoom(roomId);
                input.value = '';
            }
        } finally {
            // Reset button state
            joinBtn.disabled = false;
            joinBtn.textContent = originalText;
        }
    });
    
    // Add real-time validation feedback
    input.addEventListener('input', () => {
        const roomId = input.value.trim();
        const validationResult = validateRoomId(roomId);
        
        // Visual feedback
        input.classList.remove('valid', 'invalid');
        if (roomId.length > 0) {
            input.classList.add(validationResult.valid ? 'valid' : 'invalid');
        }
        
        // Update join button state
        joinBtn.disabled = !validationResult.valid;
    });
}

// Validate room ID input
function validateRoomId(roomId) {
    if (!roomId || roomId.length === 0) {
        return { valid: false, message: 'Please enter a room ID.' };
    }
    
    if (roomId.length !== 6) {
        return { valid: false, message: 'Room ID must be exactly 6 characters long.' };
    }
    
    // Check for valid characters (alphanumeric)
    const validChars = /^[a-zA-Z0-9]+$/;
    if (!validChars.test(roomId)) {
        return { valid: false, message: 'Room ID can only contain letters and numbers.' };
    }
    
    return { valid: true, message: 'Valid room ID' };
}

async function ensureUserProfile(user) {
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        // Create a new profile for the user
        const avatarStyle = ['adventurer', 'avataaars', 'big-ears', 'bottts', 'micah', 'miniavs'][Math.floor(Math.random() * 6)];
        const avatarSeed = Math.random().toString(36).substring(7);
        const avatarUrl = `https://api.dicebear.com/8.x/${avatarStyle}/svg?seed=${avatarSeed}`;

        await userRef.set({
            uid: user.uid,
            name: `User-${user.uid.substring(0, 6)}`, // Default name
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            avatarUrl: avatarUrl
        });
        console.log(`Created new profile for user ${user.uid} with avatar ${avatarUrl}`);
    }
}

function setupEmojiPicker() {
    const emojiBtn = safeGetElement('emoji-btn');
    const messageInput = safeGetElement('new-message');
    
    if (!emojiBtn || !messageInput) {
        console.warn('Emoji picker elements not found');
        return;
    }
    
    const picker = document.createElement('emoji-picker');
    picker.style.position = 'fixed';
    picker.style.zIndex = '1000';
    picker.style.display = 'none';
    picker.style.boxShadow = 'var(--shadow-xl)';
    picker.style.borderRadius = 'var(--radius-lg)';
    document.body.appendChild(picker);

    emojiBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        
        if (picker.style.display === 'none') {
            // Position picker relative to the message input container
            const messageInputContainer = emojiBtn.closest('#message-input');
            const containerRect = messageInputContainer.getBoundingClientRect();
            const pickerWidth = 320;
            const pickerHeight = 350;
            
            // Position above the message input with better spacing
            let left = containerRect.left;
            let top = containerRect.top - pickerHeight - 15;
            
            // Adjust horizontal position to keep picker in viewport
            if (left + pickerWidth > window.innerWidth - 10) {
                left = window.innerWidth - pickerWidth - 10;
            }
            if (left < 10) {
                left = 10;
            }
            
            // If picker would go above viewport, position below instead
            if (top < 10) {
                top = containerRect.bottom + 15;
            }
            
            picker.style.left = left + 'px';
            picker.style.top = top + 'px';
            picker.style.display = 'block';
            
            // Add entrance animation
            picker.style.opacity = '0';
            picker.style.transform = 'scale(0.95) translateY(10px)';
            requestAnimationFrame(() => {
                picker.style.transition = 'all 0.2s ease-out';
                picker.style.opacity = '1';
                picker.style.transform = 'scale(1) translateY(0)';
            });
        } else {
            // Add exit animation
            picker.style.transition = 'all 0.15s ease-in';
            picker.style.opacity = '0';
            picker.style.transform = 'scale(0.95) translateY(10px)';
            setTimeout(() => {
                picker.style.display = 'none';
            }, 150);
        }
    });

    picker.addEventListener('emoji-click', event => {
        messageInput.value += event.detail.emoji.unicode;
        // Focus back to input and trigger resize
        messageInput.focus();
        messageInput.dispatchEvent(new Event('input'));
        
        // Hide picker after selection
        picker.style.display = 'none';
    });

    document.addEventListener('click', (event) => {
        if (!picker.contains(event.target) && event.target !== emojiBtn) {
            picker.style.display = 'none';
        }
    });

    // Hide picker when scrolling or resizing
    window.addEventListener('scroll', () => {
        picker.style.display = 'none';
    });
    
    window.addEventListener('resize', () => {
        picker.style.display = 'none';
    });
}

// Back Button Functionality
function setupBackButton() {
    const backButton = safeGetElement('back-to-rooms-btn');
    
    if (!backButton) {
        console.warn('Back button not found');
        return;
    }
    
    backButton.addEventListener('click', () => {
        // Clean up chat room resources first
        if (messageUnsubscribe) {
            messageUnsubscribe();
            messageUnsubscribe = null;
        }
        if (presenceUnsubscribe) {
            presenceUnsubscribe();
            presenceUnsubscribe = null;
        }
        if (presenceInterval) {
            clearInterval(presenceInterval);
            presenceInterval = null;
        }
        
        activeChatRoom = null;
        replyToMessage = null;
        
        // Use navigation system to return to main
        navigateToMain();
    });
}

function setupAvatarChangeListener() {
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const AVATAR_STYLES = ['adventurer', 'avataaars', 'big-ears', 'bottts', 'micah', 'miniavs'];

    changeAvatarBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const selection = prompt(`Choose an avatar style:\n\n${AVATAR_STYLES.join(', ')}`);
        if (selection && AVATAR_STYLES.includes(selection.trim())) {
            const newStyle = selection.trim();
            const newSeed = Math.random().toString(36).substring(7);
            const newAvatarUrl = `https://api.dicebear.com/8.x/${newStyle}/svg?seed=${newSeed}`;

            const userRef = db.collection('users').doc(user.uid);
            await userRef.update({ avatarUrl: newAvatarUrl });
            console.log(`User ${user.uid} changed avatar to ${newAvatarUrl}`);
        } else if (selection) {
            alert("Invalid style. Please choose from the list.");
        }
    });
}

function setupNameChangeListener() {
    const changeNameBtn = document.getElementById('change-name-btn');
    changeNameBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const newName = prompt("Enter your new name:");
        if (newName && newName.trim().length > 0) {
            const userRef = db.collection('users').doc(user.uid);
            await userRef.update({ name: newName.trim() });
            console.log(`User ${user.uid} changed name to ${newName.trim()}`);
        }
    });
}

function setupLocationListener() {
    getAndGeohashLocation(); // Get initial location

    // Optional: Update location periodically if privacy mode is off
    setInterval(() => {
        if (!privacyToggle.checked) {
            getAndGeohashLocation();
        }
    }, 30000); // e.g., every 30 seconds
}

function setupMessageSending() {
    const sendButton = safeGetElement('send-button');
    const messageInput = safeGetElement('new-message');

    if (!sendButton || !messageInput) {
        console.error('Message sending elements not found');
        return;
    }

    // Remove existing listeners to prevent duplicates
    sendButton.replaceWith(sendButton.cloneNode(true));
    messageInput.replaceWith(messageInput.cloneNode(true));
    
    // Get fresh references after cloning
    const newSendButton = safeGetElement('send-button');
    const newMessageInput = safeGetElement('new-message');

    newSendButton.addEventListener('click', () => {
        const text = newMessageInput.value.trim();
        if (text && activeChatRoom) {
            sendMessage(activeChatRoom, text);
            newMessageInput.value = ''; // Clear input field
            newMessageInput.style.height = 'auto'; // Reset height
            updateTypingStatus(false); // User is no longer typing
        } else if (!activeChatRoom) {
            showNotification('Please select a chat room first.', 'warning');
        }
    });

    newMessageInput.addEventListener('keypress', (e) => {
        updateTypingStatus(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            updateTypingStatus(false);
        }, 3000); // User is considered "not typing" after 3 seconds of inactivity

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            newSendButton.click();
        }
    });

    // Auto-save draft messages
    newMessageInput.addEventListener('input', () => {
        if (activeChatRoom) {
            localStorage.setItem(`draft_${activeChatRoom}`, newMessageInput.value);
        }
    });

    // Load draft message when entering a room
    function loadDraftMessage() {
        if (activeChatRoom) {
            const draft = localStorage.getItem(`draft_${activeChatRoom}`);
            if (draft) {
                newMessageInput.value = draft;
            }
        }
    }

    // Clear draft when message is sent
    const originalSendMessage = window.sendMessage;
    window.sendMessage = function(geohash, text) {
        originalSendMessage(geohash, text);
        localStorage.removeItem(`draft_${geohash}`);
    };
}

function updateTypingStatus(isTyping) {
    const user = auth.currentUser;
    if (!user || !activeChatRoom) return;

    const presenceRef = db.collection('chatRooms').doc(activeChatRoom).collection('users').doc(user.uid);
    presenceRef.set({
        isTyping: isTyping,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function sendMessage(geohash, text) {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user signed in to send message.");
        showNotification('You must be signed in to send messages.', 'error');
        return;
    }

    // Validate message text
    if (!text || text.trim().length === 0) {
        showNotification('Message cannot be empty.', 'error');
        return;
    }

    if (text.length > 300) {
        showNotification('Message is too long. Maximum 300 characters.', 'error');
        return;
    }

    const messageData = {
        text: text.trim(),
        senderId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyToMessage) {
        messageData.replyTo = replyToMessage.id;
        messageData.replyToText = replyToMessage.text.substring(0, 100); // Limit reply text length
    }

    const messagesRef = db.collection('chatRooms').doc(geohash).collection('messages');
    messagesRef.add(messageData).catch(error => {
        console.error('Error sending message:', error);
        showNotification('Failed to send message. Please try again.', 'error');
    });

    // Reset reply state
    replyToMessage = null;
    const replyContext = safeGetElement('reply-context');
    if (replyContext) {
        replyContext.style.display = 'none';
    }
}

function setupRoomSelectionListener() {
    // Handle clicks from both nearby rooms and recently joined rooms
    document.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.geohash) {
            const geohash = e.target.dataset.geohash;
            await selectChatRoom(geohash);
        }
    });
}

async function selectChatRoom(geohash) {
    if (messageUnsubscribe) {
        messageUnsubscribe(); // Stop listening to old room's messages
    }
    if (presenceUnsubscribe) {
        presenceUnsubscribe(); // Stop listening to old room's presence
    }
    if (presenceInterval) {
        clearInterval(presenceInterval); // Stop the old presence updates
    }

    const roomRef = db.collection('chatRooms').doc(geohash);
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists) {
        // Create the room if it doesn't exist
        await roomRef.set({
            geohash: geohash,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Created new chat room: ${geohash}`);
    }

    activeChatRoom = geohash;
    console.log(`Selected chat room: ${activeChatRoom}`);
    
    // Add to recently joined rooms
    addToRecentlyJoinedRooms(geohash);
    
    // Load draft message for this room
    const messageInput = document.getElementById('new-message');
    if (messageInput) {
        const draft = localStorage.getItem(`draft_${geohash}`);
        if (draft) {
            messageInput.value = draft;
        }
    }
    
    // Navigate to chat state with room information
    navigateToChat(geohash, `Room ${geohash}`);

    const messagesDiv = document.getElementById('messages');
    const spinner = document.querySelector('.spinner-container');
    spinner.style.display = 'block'; // Show spinner
    messagesDiv.innerHTML = ''; // Clear old messages for a clean slate

    // Set up a real-time listener for new messages
    const messagesRef = roomRef.collection('messages').orderBy('timestamp');
    let isInitialLoad = true;
    messageUnsubscribe = messagesRef.onSnapshot(snapshot => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (!isInitialLoad) {
            // Check for new messages from other users
            const currentUser = auth.currentUser;
            const newMessages = snapshot.docChanges().filter(change => 
                change.type === 'added' && 
                change.doc.data().senderId !== currentUser?.uid
            );
            
            if (newMessages.length > 0) {
                playNotificationSound();
                
                // Show browser notification if tab is not focused
                if (document.hidden) {
                    const lastMessage = newMessages[newMessages.length - 1].doc.data();
                    showBrowserNotification(
                        `New message in ${activeChatRoom}`,
                        lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : '')
                    );
                }
            }
        }
        
        displayMessages(messages, !isInitialLoad);
        isInitialLoad = false;
    });

    // Set up presence listener for typing indicators
    const presenceRef = roomRef.collection('users');
    presenceUnsubscribe = presenceRef.onSnapshot(snapshot => {
        const typingUsers = [];
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        let onlineUsers = 0;

        const currentUser = auth.currentUser;
        snapshot.forEach(doc => {
            const userData = doc.data();

            // Check if user is typing
            if (userData.isTyping && doc.id !== currentUser.uid) {
                typingUsers.push(doc.id);
            }

            // Check if user is online
            if (userData.lastSeen && userData.lastSeen.toDate() > fiveMinutesAgo) {
                onlineUsers++;
            }
        });
        displayTypingIndicator(typingUsers);
        updateUserCount(onlineUsers);
    });

    // Start updating presence immediately and then every minute
    updatePresence();
    presenceInterval = setInterval(updatePresence, 60 * 1000);
}

function updatePresence() {
    const user = auth.currentUser;
    if (!user || !activeChatRoom) return;

    const presenceRef = db.collection('chatRooms').doc(activeChatRoom).collection('users').doc(user.uid);
    presenceRef.set({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function updateUserCount(count) {
    const userCountElement = safeGetElement('user-count');
    if (userCountElement) {
        userCountElement.textContent = `(${count} online)`;
    }
}

function displayTypingIndicator(typingUsers) {
    const indicator = safeGetElement('typing-indicator');
    if (indicator) {
        if (typingUsers.length === 0) {
            indicator.textContent = '';
        } else if (typingUsers.length === 1) {
            indicator.textContent = `${typingUsers[0].substring(0,6)}... is typing...`;
        } else {
            indicator.textContent = `${typingUsers.length} users are typing...`;
        }
    }
}

async function fetchAndDisplayMessages(geohash) {
    const messagesRef = db.collection('chatRooms').doc(geohash).collection('messages').orderBy('timestamp').limit(50);
    const snapshot = await messagesRef.get();
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayMessages(messages.reverse()); // reverse to show oldest first
}

async function displayMessages(messages, highlightNew = false) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = ''; // Clear old messages
    const currentUser = auth.currentUser;

    // 1. Get all unique user IDs from the messages
    const userIds = [...new Set(messages.map(msg => msg.senderId))];

    // 2. Fetch all user profiles in one go
    let userProfiles = {};
    if (userIds.length > 0) {
        const usersSnapshot = await db.collection('users').where('uid', 'in', userIds).get();
        usersSnapshot.forEach(doc => {
            userProfiles[doc.id] = doc.data();
        });
    }

    // 3. Display messages with avatars
    messages.forEach(msg => {
        const userProfile = userProfiles[msg.senderId];
        const avatarUrl = userProfile ? userProfile.avatarUrl : 'https://i.imgur.com/placeholder.png'; // Fallback avatar
        const userName = userProfile ? userProfile.name : 'Unknown User';

        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        if (currentUser && msg.senderId === currentUser.uid) {
            msgDiv.classList.add('own-message');
        }
        
        // Add new message highlight if this is a real-time update
        if (highlightNew && msg.timestamp && Date.now() - msg.timestamp.toDate().getTime() < 5000) {
            msgDiv.classList.add('new-message');
        }

        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl;
        avatarImg.classList.add('avatar');

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        // Handle replies
        if (msg.replyTo) {
            const replyPreview = document.createElement('div');
            replyPreview.classList.add('reply-preview');
            replyPreview.textContent = `↩️ Replying to: "${msg.replyToText.substring(0, 30)}..."`;
            messageBubble.appendChild(replyPreview);
        }

        const messageHeader = document.createElement('div');
        messageHeader.classList.add('message-header');

        const senderSpan = document.createElement('span');
        senderSpan.classList.add('sender');
        senderSpan.textContent = userName;

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('timestamp');
        timeSpan.textContent = msg.timestamp ? formatTimestamp(msg.timestamp) : '';

        messageHeader.appendChild(senderSpan);
        messageHeader.appendChild(timeSpan);

        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        messageText.textContent = msg.text;

        // Message reactions container
        const reactionsContainer = document.createElement('div');
        reactionsContainer.classList.add('message-reactions');

        // Reaction buttons
        const reactionButtons = document.createElement('div');
        reactionButtons.classList.add('reaction-buttons');
        ['👍', '❤️', '😂'].forEach(reaction => {
            const reactionBtn = document.createElement('button');
            reactionBtn.classList.add('quick-reaction-btn');
            reactionBtn.textContent = reaction;
            reactionBtn.onclick = (e) => {
                e.stopPropagation();
                addReactionToMessage(msg.id, reaction);
            };
            reactionButtons.appendChild(reactionBtn);
        });

        const replyBtn = document.createElement('button');
        replyBtn.textContent = '↩️';
        replyBtn.classList.add('reply-btn');
        replyBtn.dataset.messageId = msg.id;
        replyBtn.dataset.messageText = msg.text;

        messageBubble.appendChild(messageHeader);
        messageBubble.appendChild(messageText);
        messageBubble.appendChild(reactionsContainer);
        messageBubble.appendChild(reactionButtons);
        messageBubble.appendChild(replyBtn);

        msgDiv.appendChild(avatarImg);
        msgDiv.appendChild(messageBubble);
        
        messagesDiv.appendChild(msgDiv);
        
        // Set up reaction display for this message
        displayMessageReactions(msgDiv, msg.id);
    });

    // Add event listener for reply buttons
    messagesDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('reply-btn')) {
            replyToMessage = {
                id: e.target.dataset.messageId,
                text: e.target.dataset.messageText
            };
            const replyContext = document.getElementById('reply-context');
            document.getElementById('reply-context-text').textContent = `Replying to: "${replyToMessage.text.substring(0, 30)}..."`;
            replyContext.style.display = 'flex';
        }
    });

    // Add event listener for cancel reply button
    document.getElementById('cancel-reply-btn').addEventListener('click', () => {
        replyToMessage = null;
        document.getElementById('reply-context').style.display = 'none';
    });


    // Hide spinner once messages are loaded
    if(document.querySelector('.spinner-container')) {
        document.querySelector('.spinner-container').style.display = 'none';
    }

    // Scroll to the bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatTimestamp(firestoreTimestamp) {
    if (!firestoreTimestamp || !firestoreTimestamp.toDate) {
        return '';
    }
    const date = firestoreTimestamp.toDate();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
}

function getAndGeohashLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(position => {
            lastKnownPosition = position.coords; // Save position
            const userGeohash = ngeohash.encode(lastKnownPosition.latitude, lastKnownPosition.longitude, 6);

            console.log(`Geohash updated: ${userGeohash}`);
            geohashElement.textContent = userGeohash;

            // Only do automatic room discovery on first load, not on periodic updates
            // Users can manually search for rooms using the Search button

        }, error => {
            console.error("Geolocation error:", error);
            let errorMessage = 'Location unavailable';
            let userMessage = '';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location denied';
                    userMessage = 'Please enable location access in your browser settings to discover nearby rooms.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location unavailable';
                    userMessage = 'Your location could not be determined. Please check your internet connection.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location timeout';
                    userMessage = 'Location request timed out. Please try refreshing the page.';
                    break;
                default:
                    userMessage = 'Unable to access location. You can still join rooms by ID.';
            }
            
            if (geohashElement) {
                geohashElement.textContent = errorMessage;
            }
            showNotification(userMessage, 'error', 5000);
        }, {
            enableHighAccuracy: false, // We don't need high accuracy
            timeout: 10000,
            maximumAge: 600000
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
        geohashElement.textContent = 'Unsupported';
    }
}

function updateUIForUser(user) {
    userIdElement.textContent = user.uid;
    // Listen for user profile changes to update the name in real-time
    db.collection('users').doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('user-name').textContent = userData.name;
            document.getElementById('user-avatar-preview').src = userData.avatarUrl;
        }
    });
}

async function displayNearbyRooms(rooms, userGeohash) {
    const nearbyRoomsList = document.querySelector('#nearby-rooms .rooms-list');
    nearbyRoomsList.innerHTML = ''; // Clear existing list

    // Get recently joined rooms from localStorage
    const recentRooms = getRecentlyJoinedRooms();

    // Create a map of geohash -> room data for existing rooms
    const existingRoomsByGeohash = new Map();
    rooms.forEach(room => {
        if (room.geohash) {
            existingRoomsByGeohash.set(room.geohash, room);
        }
    });

    // Create a set of all geohashes to display, ensuring uniqueness
    const geohashesToDisplay = new Set(rooms.map(r => r.geohash));
    geohashesToDisplay.add(userGeohash);

    geohashesToDisplay.forEach(geohash => {
        const li = document.createElement('li');
        li.classList.add('room-item');
        
        const roomInfo = document.createElement('div');
        roomInfo.classList.add('room-info');
        
        const roomId = document.createElement('div');
        roomId.classList.add('room-id');
        roomId.textContent = geohash;
        
        const roomMeta = document.createElement('div');
        roomMeta.classList.add('room-meta');
        
        const isExistingRoom = existingRoomsByGeohash.has(geohash);
        const isRecentRoom = recentRooms.some(r => r.geohash === geohash);
        
        if (isExistingRoom && isRecentRoom) {
            roomMeta.textContent = 'Recently visited • Active';
        } else if (isExistingRoom) {
            roomMeta.textContent = 'Active room';
        } else if (isRecentRoom) {
            roomMeta.textContent = 'Recently visited';
        } else {
            roomMeta.textContent = 'Create new room';
        }
        
        roomInfo.appendChild(roomId);
        roomInfo.appendChild(roomMeta);
        
        const joinButton = document.createElement('button');
        joinButton.classList.add('btn', 'btn-outline', 'btn-sm');
        joinButton.textContent = isExistingRoom ? 'Enter' : 'Create';
        joinButton.dataset.geohash = geohash;
        
        li.appendChild(roomInfo);
        li.appendChild(joinButton);
        
        nearbyRoomsList.appendChild(li);
    });

    // Update recently joined rooms display
    updateRecentlyJoinedRoomsDisplay();
}
