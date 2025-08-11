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

// 3. DOM Elements
const userIdElement = document.getElementById('user-id');
const geohashElement = document.getElementById('geohash');
const privacyToggle = document.getElementById('privacy-toggle');
const nearbyRoomsContainer = document.getElementById('nearby-rooms');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

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
    // Remove existing back button
    const existingBackBtn = document.querySelector('.back-button');
    if (existingBackBtn) {
        existingBackBtn.remove();
    }
    
    // Add back button only in chat state
    if (currentNavState === 'chat') {
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.innerHTML = '← Back to Rooms';
        
        backButton.addEventListener('click', () => {
            navigateToMain();
        });
        
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.appendChild(backButton);
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

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function setupThemeToggle() {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Sound Management
function setupSoundToggle() {
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
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
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
    const textarea = document.getElementById('new-message');
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 96) + 'px'; // Max 6rem (96px)
    });
    
    // Reset height when message is sent
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('send-button').click();
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

    joinBtn.addEventListener('click', () => {
        const roomId = input.value.trim();
        if (roomId) {
            // For testing navigation without Firebase
            if (typeof firebase === 'undefined') {
                // Test navigation directly
                navigateToChat(roomId, `Test Room ${roomId}`);
                input.value = '';
                return;
            }
            
            selectChatRoom(roomId);
            input.value = '';
        }
    });
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
    const emojiBtn = document.getElementById('emoji-btn');
    const messageInput = document.getElementById('new-message');
    const picker = document.createElement('emoji-picker');

    picker.style.position = 'absolute';
    picker.style.zIndex = '1000';
    picker.style.display = 'none';
    document.body.appendChild(picker);

    emojiBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        
        if (picker.style.display === 'none') {
            // Position picker relative to the emoji button
            const btnRect = emojiBtn.getBoundingClientRect();
            const pickerWidth = 320;
            const pickerHeight = 350;
            
            // Calculate position to keep picker in viewport
            let left = btnRect.left;
            let top = btnRect.top - pickerHeight - 10;
            
            // Adjust if picker would go off screen
            if (left + pickerWidth > window.innerWidth) {
                left = window.innerWidth - pickerWidth - 10;
            }
            if (left < 10) {
                left = 10;
            }
            if (top < 10) {
                top = btnRect.bottom + 10;
            }
            
            picker.style.left = left + 'px';
            picker.style.top = top + 'px';
            picker.style.display = 'block';
        } else {
            picker.style.display = 'none';
        }
    });

    picker.addEventListener('emoji-click', event => {
        messageInput.value += event.detail.emoji.unicode;
        // Focus back to input and trigger resize
        messageInput.focus();
        messageInput.dispatchEvent(new Event('input'));
    });

    document.addEventListener('click', (event) => {
        if (!picker.contains(event.target) && event.target !== emojiBtn) {
            picker.style.display = 'none';
        }
    });

    // Hide picker when scrolling
    window.addEventListener('scroll', () => {
        picker.style.display = 'none';
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
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('new-message');

    sendButton.addEventListener('click', () => {
        const text = messageInput.value.trim();
        if (text && activeChatRoom) {
            sendMessage(activeChatRoom, text);
            messageInput.value = ''; // Clear input field
            updateTypingStatus(false); // User is no longer typing
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        updateTypingStatus(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            updateTypingStatus(false);
        }, 3000); // User is considered "not typing" after 3 seconds of inactivity

        if (e.key === 'Enter') {
            sendButton.click();
        }
    });
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
        return;
    }

    const messageData = {
        text: text,
        senderId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyToMessage) {
        messageData.replyTo = replyToMessage.id;
        messageData.replyToText = replyToMessage.text; // Store a snippet for context
    }

    const messagesRef = db.collection('chatRooms').doc(geohash).collection('messages');
    messagesRef.add(messageData);

    // Reset reply state
    replyToMessage = null;
    document.getElementById('reply-context').style.display = 'none';
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
    const userCountElement = document.getElementById('user-count');
    if (userCountElement) {
        userCountElement.textContent = `(${count} online)`;
    }
}

function displayTypingIndicator(typingUsers) {
    const indicator = document.getElementById('typing-indicator');
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

            const initialRadius = document.getElementById('radius-input').value;
            showRoomSearchLoading();
            discoverRoomsByKmRadius(lastKnownPosition, parseFloat(initialRadius));

        }, error => {
            console.error("Geolocation error:", error);
            geohashElement.textContent = 'Unavailable';
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
