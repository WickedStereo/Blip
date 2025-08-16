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
    initializeMap();
    setupLocationListener();
    setupRoomSelectionListener();
    setupMessageSending();
    setupNameChangeListener();
    setupAvatarChangeListener();
    setupEmojiPicker();
    setupJoinByIdListener();
    initializeGeohashPopup();
    setupMapOverlayControls();
    setupRadiusSearch();
    setupThemeToggle();
    setupSoundToggle();
    setupAutoResizeTextarea();
    setupMapRecenterButton();
    setupMapFilters();
    setupRecentlyJoinedRooms();
    setupNotificationSystem();
    setupKeyboardShortcuts();
    setupBackButton();
    setupCopyRoomLink();
    checkForFirstVisit(); // Show onboarding for new users
});

// Global map reference for location reset functionality
let globalMap = null;

// Map Initialization (Leaflet) — scaffold for Milestone 1
function initializeMap() {
    try {
        if (typeof L === 'undefined') {
            console.warn('Leaflet not loaded yet');
            return;
        }
        const mapEl = document.getElementById('map');
        if (!mapEl) return;

        const map = L.map('map', { zoomControl: true });
        globalMap = map; // Store global reference
        // Default center roughly; will recenter when location is available
        map.setView([37.7749, -122.4194], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Hook: when user moves/zooms, re-render with optimized debouncing
        let overlayUpdateTimer = null;
        let quickUpdateTimer = null;
        let lastBounds = null;
        let lastZoom = null;
        
        // Quick updates during movement for smooth panning
        const scheduleQuickUpdate = () => {
            if (quickUpdateTimer) clearTimeout(quickUpdateTimer);
            quickUpdateTimer = setTimeout(() => {
                // Only update if bounds or zoom changed significantly
                const currentBounds = map.getBounds();
                const currentZoom = map.getZoom();
                
                if (shouldUpdateOverlays(lastBounds, lastZoom, currentBounds, currentZoom)) {
                    renderVisibleGeohashOverlays(map);
                    lastBounds = currentBounds;
                    lastZoom = currentZoom;
                }
            }, 100); // Faster response for smooth panning
        };
        
        // Full updates after movement stops
        const scheduleOverlayRender = () => {
            if (overlayUpdateTimer) clearTimeout(overlayUpdateTimer);
            overlayUpdateTimer = setTimeout(() => {
                renderVisibleGeohashOverlays(map);
                lastBounds = map.getBounds();
                lastZoom = map.getZoom();
            }, 150);
        };
        
        // Listen to multiple events for better responsiveness
        map.on('move', scheduleQuickUpdate);      // Smooth panning
        map.on('moveend', scheduleOverlayRender); // Final update
        map.on('zoomend', scheduleOverlayRender); // Zoom changes

        // When we get the user's location later, recenter map
        const originalGeohashUpdate = getAndGeohashLocation;
        // Wrap existing function to also recenter map once
        let hasCentered = false;
        window.getAndGeohashLocation = function() {
            originalGeohashUpdate();
            if (!hasCentered && lastKnownPosition) {
                hasCentered = true;
                map.setView([lastKnownPosition.latitude, lastKnownPosition.longitude], 14);
                // Initial overlays after first locate
                renderVisibleGeohashOverlays(map);
            }
        };
    } catch (e) {
        console.error('Error initializing map:', e);
    }
}

// Helper function to determine if overlays should be updated (lazy-loading optimization)
function shouldUpdateOverlays(lastBounds, lastZoom, currentBounds, currentZoom) {
    // Always update if this is the first time
    if (!lastBounds || !lastZoom) return true;
    
    // Always update if zoom level changed
    if (Math.abs(currentZoom - lastZoom) >= 1) return true;
    
    // Check if the view has moved significantly
    const threshold = 0.001; // ~100m at typical zoom levels
    const lastCenter = lastBounds.getCenter();
    const currentCenter = currentBounds.getCenter();
    
    const latDiff = Math.abs(currentCenter.lat - lastCenter.lat);
    const lngDiff = Math.abs(currentCenter.lng - lastCenter.lng);
    
    // Update if moved more than threshold
    if (latDiff > threshold || lngDiff > threshold) return true;
    
    // Check if viewport size changed significantly (window resize)
    const lastSize = {
        lat: lastBounds.getNorth() - lastBounds.getSouth(),
        lng: lastBounds.getEast() - lastBounds.getWest()
    };
    const currentSize = {
        lat: currentBounds.getNorth() - currentBounds.getSouth(),
        lng: currentBounds.getEast() - currentBounds.getWest()
    };
    
    const sizeThreshold = 0.1; // 10% change
    if (Math.abs(currentSize.lat - lastSize.lat) / lastSize.lat > sizeThreshold ||
        Math.abs(currentSize.lng - lastSize.lng) / lastSize.lng > sizeThreshold) {
        return true;
    }
    
    return false;
}

// Render geohash 6-character grid overlays within current viewport
let currentGeohashLayers = [];
let overlayCache = new Map(); // Cache for overlay data

function renderVisibleGeohashOverlays(map) {
    try {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        // Create cache key for current viewport
        const cacheKey = `${south.toFixed(4)}-${west.toFixed(4)}-${north.toFixed(4)}-${east.toFixed(4)}-${zoom}`;
        
        // Check if we have cached data for this viewport
        if (overlayCache.has(cacheKey)) {
            const cachedData = overlayCache.get(cacheKey);
            // Update timestamp for LRU cleanup
            cachedData.lastUsed = Date.now();
            
            // Use cached geohashes but refresh active status
            renderCachedOverlays(map, cachedData.geohashes);
            return;
        }

        // Calculate visible geohashes more efficiently
        const visibleGeohashes = calculateVisibleGeohashes(bounds, zoom);
        
        // Cache the geohashes for this viewport
        overlayCache.set(cacheKey, {
            geohashes: visibleGeohashes,
            lastUsed: Date.now()
        });
        
        // Clean up old cache entries (keep last 20)
        if (overlayCache.size > 20) {
            const entries = Array.from(overlayCache.entries())
                .sort((a, b) => b[1].lastUsed - a[1].lastUsed);
            
            // Keep only the 15 most recent entries
            overlayCache.clear();
            entries.slice(0, 15).forEach(([key, value]) => {
                overlayCache.set(key, value);
            });
        }

        // Render overlays with active status
        renderCachedOverlays(map, visibleGeohashes);
        
    } catch (e) {
        console.warn('renderVisibleGeohashOverlays error:', e);
    }
}

function calculateVisibleGeohashes(bounds, zoom) {
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    
    // Adaptive grid resolution based on zoom level
    const gridFactor = Math.max(0.005, 0.02 / Math.pow(2, zoom - 10));
    const latSteps = Math.max(4, Math.min(20, Math.floor((north - south) / gridFactor)));
    const lonSteps = Math.max(4, Math.min(20, Math.floor((east - west) / gridFactor)));
    
    const latStep = (north - south) / latSteps;
    const lonStep = (east - west) / lonSteps;

    const seen = new Set();
    for (let i = 0; i <= latSteps; i++) {
        for (let j = 0; j <= lonSteps; j++) {
            const lat = south + i * latStep;
            const lon = west + j * lonStep;
            const gh = ngeohash.encode(lat, lon, 6);
            seen.add(gh);
        }
    }

    return Array.from(seen).slice(0, 100); // Limit for performance
}

async function renderCachedOverlays(map, geohashes) {
    // Clear previous layers efficiently
    currentGeohashLayers.forEach(layer => map.removeLayer(layer));
    currentGeohashLayers = [];

    // Batch fetch enhanced room data (with caching)
    const roomDataMap = await fetchActiveRoomsByGeohashCached(geohashes);
    
    // Filter geohashes based on current filter settings
    const filteredGeohashes = geohashes.filter(gh => {
        const roomData = roomDataMap.get(gh) || { isActive: false, activityType: 'inactive' };
        return shouldShowGeohash(roomData);
    });
    
    // Render overlays in batches for better performance
    const batchSize = 20;
    for (let i = 0; i < filteredGeohashes.length; i += batchSize) {
        const batch = filteredGeohashes.slice(i, i + batchSize);
        
        // Use requestAnimationFrame to prevent blocking
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                batch.forEach(gh => {
                    const roomData = roomDataMap.get(gh) || { isActive: false, activityType: 'inactive', userCount: 0 };
                    renderSingleOverlay(map, gh, roomData);
                });
                resolve();
            });
        });
    }
}

function shouldShowGeohash(roomData) {
    const { isActive, activityType } = roomData;
    
    // Always show inactive spots if no filters are active
    if (!isActive && !currentFilters.active && !currentFilters.trending && !currentFilters.new) {
        return true;
    }
    
    // Check specific filters
    if (currentFilters.active && activityType === 'active') return true;
    if (currentFilters.trending && activityType === 'trending') return true;
    if (currentFilters.new && activityType === 'new') return true;
    
    // Show inactive spots if active filter is enabled (to show available locations)
    if (currentFilters.active && !isActive) return true;
    
    return false;
}

function renderSingleOverlay(map, geohash, roomData) {
    const { isActive, activityType, userCount } = roomData;
    const bounds = ngeohash.bounds(geohash);
    
    // Get colors based on activity type and heat level
    const { borderColor, fillColor, opacity } = getActivityColors(activityType, userCount);
    
    // Create rectangle overlay with heat-based styling
    const rect = L.rectangle([[bounds.south, bounds.west], [bounds.north, bounds.east]], {
        color: borderColor,
        weight: activityType === 'trending' ? 2 : 1,
        fillColor: fillColor,
        fillOpacity: opacity
    });
    rect.addTo(map);
    currentGeohashLayers.push(rect);

    // Create label marker with activity styling
    const center = ngeohash.decode(geohash);
    const activityEmoji = getActivityEmoji(activityType);
    const userCountDisplay = userCount > 0 ? ` (${userCount})` : '';
    
    const label = L.marker([center.latitude, center.longitude], {
        icon: L.divIcon({
            className: 'geohash-label',
            html: `<div class="gh-label ${activityType}" role="button" tabindex="0" aria-label="${getAriaLabel(activityType, geohash, userCount)}">${activityEmoji}${geohash}${userCountDisplay}</div>`,
            iconSize: null
        })
    });
    label.addTo(map);
    label.on('click', () => showGeohashPopup(geohash, isActive, roomData));
    label.on('keypress', (e) => { 
        if (e.originalEvent.key === 'Enter') showGeohashPopup(geohash, isActive, roomData); 
    });
    currentGeohashLayers.push(label);
}

function getActivityColors(activityType, userCount) {
    const heatMultiplier = Math.min(userCount / 10, 1); // Scale heat based on user count
    
    switch (activityType) {
        case 'trending':
            return {
                borderColor: 'rgba(251, 146, 60, 0.9)',
                fillColor: `rgba(251, 146, 60, ${0.2 + heatMultiplier * 0.4})`,
                opacity: 0.3 + heatMultiplier * 0.3
            };
        case 'new':
            return {
                borderColor: 'rgba(168, 85, 247, 0.9)',
                fillColor: `rgba(168, 85, 247, ${0.2 + heatMultiplier * 0.4})`,
                opacity: 0.3 + heatMultiplier * 0.3
            };
        case 'active':
            return {
                borderColor: 'rgba(16, 185, 129, 0.9)',
                fillColor: `rgba(16, 185, 129, ${0.2 + heatMultiplier * 0.4})`,
                opacity: 0.3 + heatMultiplier * 0.3
            };
        default: // inactive
            return {
                borderColor: 'rgba(99, 102, 241, 0.6)',
                fillColor: 'rgba(99, 102, 241, 0.12)',
                opacity: 0.2
            };
    }
}

function getActivityEmoji(activityType) {
    switch (activityType) {
        case 'trending': return '🔥';
        case 'new': return '✨';
        case 'active': return '🟢';
        default: return '';
    }
}

function getAriaLabel(activityType, geohash, userCount) {
    const userText = userCount > 0 ? ` with ${userCount} users` : '';
    switch (activityType) {
        case 'trending': return `Trending room ${geohash}${userText}`;
        case 'new': return `New room ${geohash}${userText}`;
        case 'active': return `Active room ${geohash}${userText}`;
        default: return `Create room ${geohash}`;
    }
}

// Cache for active room status
let activeRoomCache = new Map();
const ACTIVE_ROOM_CACHE_TTL = 30000; // 30 seconds

async function fetchActiveRoomsByGeohashCached(geohashes) {
    const roomData = new Map(); // geohash -> { isActive, activityType, userCount, lastActiveAt }
    const uncachedGeohashes = [];
    const now = Date.now();
    
    // Check cache first
    geohashes.forEach(gh => {
        const cached = activeRoomCache.get(gh);
        if (cached && (now - cached.timestamp) < ACTIVE_ROOM_CACHE_TTL) {
            roomData.set(gh, cached.data || { isActive: cached.isActive, activityType: 'inactive', userCount: 0 });
        } else {
            uncachedGeohashes.push(gh);
        }
    });
    
    // Fetch uncached geohashes with enhanced data
    if (uncachedGeohashes.length > 0) {
        const freshRoomData = await fetchEnhancedRoomData(uncachedGeohashes);
        
        // Update cache
        uncachedGeohashes.forEach(gh => {
            const data = freshRoomData.get(gh) || { isActive: false, activityType: 'inactive', userCount: 0 };
            activeRoomCache.set(gh, {
                isActive: data.isActive,
                data: data,
                timestamp: now
            });
            roomData.set(gh, data);
        });
        
        // Clean up old cache entries
        if (activeRoomCache.size > 500) {
            const cutoff = now - ACTIVE_ROOM_CACHE_TTL;
            for (const [key, value] of activeRoomCache.entries()) {
                if (value.timestamp < cutoff) {
                    activeRoomCache.delete(key);
                }
            }
        }
    }
    
    return roomData;
}

async function fetchEnhancedRoomData(geohashes) {
    const roomDataMap = new Map();
    
    try {
        if (!db || !db.collection) return roomDataMap;
        
        for (let i = 0; i < geohashes.length; i += 10) {
            const chunk = geohashes.slice(i, i + 10);
            const roomsSnap = await db.collection('chatRooms').where('geohash', 'in', chunk).get();
            
            // Process each room to determine activity type
            for (const roomDoc of roomsSnap.docs) {
                const roomData = roomDoc.data();
                const geohash = roomData.geohash || roomDoc.id;
                
                if (!geohash) continue;
                
                // Get user count for this room
                const userCount = await getRoomUserCount(geohash);
                
                // Determine activity type based on timestamps and user activity
                const activityType = determineActivityType(roomData, userCount);
                
                roomDataMap.set(geohash, {
                    isActive: true,
                    activityType: activityType,
                    userCount: userCount,
                    lastActiveAt: roomData.lastActiveAt,
                    createdAt: roomData.createdAt
                });
            }
        }
        
        // For geohashes not in the database, mark as inactive
        geohashes.forEach(gh => {
            if (!roomDataMap.has(gh)) {
                roomDataMap.set(gh, {
                    isActive: false,
                    activityType: 'inactive',
                    userCount: 0
                });
            }
        });
        
    } catch (e) {
        console.warn('fetchEnhancedRoomData error:', e);
    }
    
    return roomDataMap;
}

async function getRoomUserCount(geohash) {
    try {
        // Count active users (those with recent presence)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const usersSnap = await db.collection('chatRooms')
            .doc(geohash)
            .collection('users')
            .where('lastSeen', '>', fiveMinutesAgo)
            .get();
        
        return usersSnap.size;
    } catch (e) {
        console.warn('getRoomUserCount error:', e);
        return 0;
    }
}

function determineActivityType(roomData, userCount) {
    const now = Date.now();
    const timeWindowMs = currentFilters.timeWindow * 60 * 1000;
    
    // Get timestamps
    const lastActiveAt = roomData.lastActiveAt?.toDate?.() || roomData.lastActiveAt;
    const createdAt = roomData.createdAt?.toDate?.() || roomData.createdAt;
    
    if (!lastActiveAt && !createdAt) return 'inactive';
    
    const lastActiveTime = lastActiveAt ? lastActiveAt.getTime() : 0;
    const createdTime = createdAt ? createdAt.getTime() : 0;
    
    // Check if room is new (created within 10 minutes)
    if (createdTime && (now - createdTime) < 10 * 60 * 1000) {
        return 'new';
    }
    
    // Check if room is trending (high activity in last 60 minutes)
    if (lastActiveTime && (now - lastActiveTime) < 60 * 60 * 1000) {
        // Consider trending if it has multiple users or recent activity
        if (userCount >= 3 || (userCount >= 2 && (now - lastActiveTime) < 15 * 60 * 1000)) {
            return 'trending';
        }
    }
    
    // Check if room is active (within current time window)
    if (lastActiveTime && (now - lastActiveTime) < timeWindowMs) {
        return 'active';
    }
    
    return 'inactive';
}

async function fetchActiveRoomsByGeohash(geohashes) {
    const active = new Set();
    try {
        if (!db || !db.collection) return active;
        for (let i = 0; i < geohashes.length; i += 10) {
            const chunk = geohashes.slice(i, i + 10);
            const snap = await db.collection('chatRooms').where('geohash', 'in', chunk).get();
            snap.forEach(doc => {
                const data = doc.data();
                const gh = data.geohash || doc.id;
                if (gh) active.add(gh);
            });
        }
    } catch (e) {
        console.warn('fetchActiveRoomsByGeohash error:', e);
    }
    return active;
}

// Enhanced room existence check and creation with proper error handling
async function checkAndCreateRoom(geohash) {
    try {
        const roomRef = db.collection('chatRooms').doc(geohash);
        const roomDoc = await roomRef.get();

        if (roomDoc.exists) {
            // Room exists, update lastActiveAt to mark recent activity
            try {
                await roomRef.update({
                    lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (updateError) {
                console.warn('Could not update lastActiveAt:', updateError);
                // Non-critical error, continue anyway
            }
            
            return {
                exists: true,
                wasCreated: false,
                data: roomDoc.data()
            };
        } else {
            // Room doesn't exist, create it
            const roomData = {
                geohash: geohash,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
                messageCount: 0
            };

            await roomRef.set(roomData);
            console.log(`Created new chat room: ${geohash}`);
            
            // Invalidate cache for this geohash since we just created the room
            if (activeRoomCache.has(geohash)) {
                activeRoomCache.set(geohash, {
                    isActive: true,
                    timestamp: Date.now()
                });
            }
            
            return {
                exists: false,
                wasCreated: true,
                data: roomData
            };
        }
    } catch (error) {
        console.error('Error checking/creating room:', error);
        throw new Error(`Database error: ${error.message}`);
    }
}

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

// Handle URL parameters and paths for direct room joining
function handleUrlParameters() {
    let geohash = null;
    let shouldCleanUrl = false;
    
    // Check for path-based routing: /room/:geohash
    const path = window.location.pathname;
    const roomPathMatch = path.match(/^\/room\/([a-zA-Z0-9]{6})$/);
    if (roomPathMatch) {
        geohash = roomPathMatch[1];
        shouldCleanUrl = true;
    }
    
    // Check for query parameters: ?room=xxxxxx or ?g=xxxxxx
    if (!geohash) {
        const urlParams = new URLSearchParams(window.location.search);
        geohash = urlParams.get('room') || urlParams.get('g');
        shouldCleanUrl = !!geohash;
    }
    
    if (geohash) {
        // Validate geohash format (should be 6 characters)
        if (geohash.length === 6 && /^[a-zA-Z0-9]+$/.test(geohash)) {
            joinRoomFromDeepLink(geohash);
            
            // Clean up URL without refreshing page
            if (shouldCleanUrl) {
                const cleanUrl = window.location.origin + (window.location.pathname === '/room/' + geohash ? '/' : window.location.pathname.replace('/room/' + geohash, ''));
                window.history.replaceState({}, document.title, cleanUrl);
            }
        } else {
            showNotification('Invalid room ID in URL. Room IDs must be 6 characters.', 'error');
        }
    }
}

// Join room from deep link with proper error handling and user feedback
function joinRoomFromDeepLink(geohash) {
    const joinRoom = () => {
        if (auth && auth.currentUser) {
            selectChatRoom(geohash);
            showNotification(`Joining room from link: ${geohash}`, 'info');
        } else {
            // Try again after a short delay if auth is not ready
            setTimeout(() => {
                if (auth && auth.currentUser) {
                    selectChatRoom(geohash);
                    showNotification(`Joining room from link: ${geohash}`, 'info');
                } else {
                    showNotification('Authentication not ready. Please try again.', 'warning');
                }
            }, 1000);
        }
    };
    
    // Wait for authentication and then join the room
    setTimeout(joinRoom, 500);
}

// Generate deep link URLs for sharing
function generateRoomDeepLink(geohash, usePathFormat = true) {
    const baseUrl = window.location.origin;
    
    if (usePathFormat) {
        return `${baseUrl}/room/${geohash}`;
    } else {
        return `${baseUrl}/?g=${geohash}`;
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

        const roomUrl = generateRoomDeepLink(activeChatRoom);
        
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
        const radiusValue = radiusInput.value.trim();
        const validationResult = validateRadius(radiusValue);
        
        if (!validationResult.valid) {
            showNotification(validationResult.message, 'error');
            radiusInput.focus();
            return;
        }
        
        const radiusKm = parseFloat(radiusValue);
        if (!lastKnownPosition) {
            showNotification('Location not available. Please enable location services.', 'error');
            return;
        }
        
        showRoomSearchLoading();
        showNotification(`Searching for rooms within ${radiusKm}km...`, 'info', 2000);
        discoverRoomsByKmRadius(lastKnownPosition, radiusKm);
    });

    // Add real-time validation feedback
    radiusInput.addEventListener('input', () => {
        const radiusValue = radiusInput.value.trim();
        const validationResult = validateRadius(radiusValue);
        
        // Visual feedback
        radiusInput.classList.remove('valid', 'invalid');
        if (radiusValue.length > 0) {
            radiusInput.classList.add(validationResult.valid ? 'valid' : 'invalid');
        }
        
        // Update search button state
        searchBtn.disabled = !validationResult.valid || !lastKnownPosition;
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

// Map overlay controls: mirror existing join/radius with floating UI
function setupMapOverlayControls() {
    const joinBtn = document.getElementById('map-join-btn');
    const joinInput = document.getElementById('map-room-id-input');
    const radiusBtn = document.getElementById('map-search-btn');
    const radiusInput = document.getElementById('map-radius-input');
    const overlayNameEl = document.getElementById('map-user-name');
    const changeNameBtn = document.getElementById('map-change-name-btn');

    if (overlayNameEl) {
        const nameEl = document.getElementById('user-name');
        overlayNameEl.textContent = nameEl ? nameEl.textContent : 'User';
        // Keep overlay name in sync whenever profile updates
        db && auth && auth.currentUser && db.collection('users').doc(auth.currentUser.uid).onSnapshot(doc => {
            if (doc.exists && overlayNameEl) overlayNameEl.textContent = doc.data().name;
        });
    }

    if (changeNameBtn) {
        changeNameBtn.addEventListener('click', () => {
            const changeBtn = document.getElementById('change-name-btn');
            if (changeBtn) changeBtn.click();
        });
    }

    if (joinBtn && joinInput) {
        joinBtn.addEventListener('click', async () => {
            const roomId = joinInput.value.trim();
            const validationResult = validateRoomId(roomId);
            if (!validationResult.valid) {
                showNotification(validationResult.message, 'error');
                joinInput.focus();
                return;
            }
            await selectChatRoom(roomId);
            joinInput.value = '';
        });
        joinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinBtn.click();
        });
    }

    if (radiusBtn && radiusInput) {
        radiusBtn.addEventListener('click', () => {
            const radiusValue = radiusInput.value.trim();
            const validationResult = validateRadius(radiusValue);
            
            if (!validationResult.valid) {
                showNotification(validationResult.message, 'error');
                radiusInput.focus();
                return;
            }
            
            const radiusKm = parseFloat(radiusValue);
            if (!lastKnownPosition) {
                showNotification('Location not available. Please enable location services.', 'error');
                return;
            }
            
            discoverRoomsByKmRadius(lastKnownPosition, radiusKm);
        });
        
        // Add real-time validation feedback for map overlay radius input
        radiusInput.addEventListener('input', () => {
            const radiusValue = radiusInput.value.trim();
            const validationResult = validateRadius(radiusValue);
            
            // Visual feedback
            radiusInput.classList.remove('valid', 'invalid');
            if (radiusValue.length > 0) {
                radiusInput.classList.add(validationResult.valid ? 'valid' : 'invalid');
            }
            
            // Update search button state
            radiusBtn.disabled = !validationResult.valid || !lastKnownPosition;
        });
        
        radiusInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') radiusBtn.click(); });
    }
}

// Setup map recenter button functionality
function setupMapRecenterButton() {
    const recenterBtn = document.getElementById('map-recenter-btn');
    if (!recenterBtn) {
        console.warn('Map recenter button not found');
        return;
    }

    recenterBtn.addEventListener('click', () => {
        if (!globalMap) {
            showNotification('Map not initialized', 'error');
            return;
        }

        if (!lastKnownPosition) {
            showNotification('Location not available. Please enable location services.', 'warning');
            return;
        }

        // Animate to user's current location with smooth transition
        globalMap.setView(
            [lastKnownPosition.latitude, lastKnownPosition.longitude], 
            14, 
            { animate: true, duration: 1.0 }
        );
        
        showNotification('Centered on your location', 'success', 2000);
    });
}

// Map Filter System
let currentFilters = {
    active: true,
    trending: false,
    new: false,
    timeWindow: 60 // minutes
};

function setupMapFilters() {
    const activeFilter = document.getElementById('filter-active');
    const trendingFilter = document.getElementById('filter-trending');
    const newFilter = document.getElementById('filter-new');
    const timeWindow = document.getElementById('time-window');

    if (!activeFilter || !trendingFilter || !newFilter || !timeWindow) {
        console.warn('Filter elements not found');
        return;
    }

    // Set up filter change handlers
    activeFilter.addEventListener('change', () => {
        currentFilters.active = activeFilter.checked;
        refreshMapOverlays();
    });

    trendingFilter.addEventListener('change', () => {
        currentFilters.trending = trendingFilter.checked;
        refreshMapOverlays();
    });

    newFilter.addEventListener('change', () => {
        currentFilters.new = newFilter.checked;
        refreshMapOverlays();
    });

    timeWindow.addEventListener('change', () => {
        currentFilters.timeWindow = parseInt(timeWindow.value);
        refreshMapOverlays();
    });
}

function refreshMapOverlays() {
    if (globalMap) {
        renderVisibleGeohashOverlays(globalMap);
    }
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

// Validate radius input
function validateRadius(radius) {
    const radiusNum = parseFloat(radius);
    
    if (!radius || isNaN(radiusNum)) {
        return { valid: false, message: 'Please enter a valid radius.' };
    }
    
    if (radiusNum < 1) {
        return { valid: false, message: 'Radius must be at least 1 km.' };
    }
    
    if (radiusNum > 50) {
        return { valid: false, message: 'Radius cannot exceed 50 km.' };
    }
    
    return { valid: true, message: 'Valid radius' };
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

    // Use batch operation to send message and update room activity atomically
    const batch = db.batch();
    
    // Add message to collection
    const messagesRef = db.collection('chatRooms').doc(geohash).collection('messages');
    const messageRef = messagesRef.doc(); // Get a new document reference
    batch.set(messageRef, messageData);
    
    // Update room's lastActiveAt timestamp
    const roomRef = db.collection('chatRooms').doc(geohash);
    batch.update(roomRef, {
        lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Commit the batch
    batch.commit().catch(error => {
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

// Geohash popup functionality
function showGeohashPopup(geohash, isActive, roomData) {
    const popup = document.getElementById('geohash-popup');
    const geohashDisplay = document.getElementById('popup-geohash');
    const statusDisplay = document.getElementById('popup-status');
    const descriptionDisplay = document.getElementById('popup-description');
    const enterBtn = document.getElementById('popup-enter-btn');
    
    // Set geohash
    geohashDisplay.textContent = geohash;
    
    // Use room data if available, fallback to simple active/inactive
    const { activityType = (isActive ? 'active' : 'inactive'), userCount = 0 } = roomData || {};
    
    // Set status and content based on activity type
    const emoji = getActivityEmoji(activityType) || (isActive ? '🟢' : '🔵');
    const statusText = getPopupStatusText(activityType, isActive);
    const description = getPopupDescription(activityType, userCount, isActive);
    const buttonText = isActive ? 'Enter Room' : 'Create Room';
    
    statusDisplay.textContent = `${emoji} ${statusText}`;
    statusDisplay.className = `popup-status-text ${activityType}`;
    descriptionDisplay.textContent = description;
    enterBtn.textContent = buttonText;
    enterBtn.className = 'btn btn-primary';
    
    // Store geohash for button actions
    enterBtn.dataset.geohash = geohash;
    
    // Show popup
    popup.style.display = 'flex';
    
    // Focus on enter button for accessibility
    setTimeout(() => enterBtn.focus(), 100);
}

function getPopupStatusText(activityType, isActive) {
    switch (activityType) {
        case 'trending': return 'Trending Room';
        case 'new': return 'New Room';
        case 'active': return 'Active Room';
        default: return isActive ? 'Room Available' : 'Available Spot';
    }
}

function getPopupDescription(activityType, userCount, isActive) {
    const userText = userCount > 0 ? ` Currently ${userCount} user${userCount !== 1 ? 's' : ''} online.` : '';
    
    switch (activityType) {
        case 'trending':
            return `This room is trending with high activity in the last hour.${userText} Click Enter to join the conversation.`;
        case 'new':
            return `This room was recently created.${userText} Click Enter to join the conversation.`;
        case 'active':
            return `This chat room has recent activity.${userText} Click Enter to join the conversation.`;
        default:
            return isActive 
                ? `This room exists but has low activity.${userText} Click Enter to join.`
                : 'No active room exists here yet. Click Create to start a new chat room in this location.';
    }
}

function hideGeohashPopup() {
    const popup = document.getElementById('geohash-popup');
    popup.style.display = 'none';
}

// Initialize popup event listeners
function initializeGeohashPopup() {
    const popup = document.getElementById('geohash-popup');
    const closeBtn = document.getElementById('close-popup');
    const cancelBtn = document.getElementById('popup-cancel-btn');
    const enterBtn = document.getElementById('popup-enter-btn');
    
    // Close popup handlers
    closeBtn.addEventListener('click', hideGeohashPopup);
    cancelBtn.addEventListener('click', hideGeohashPopup);
    
    // Close on overlay click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            hideGeohashPopup();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.style.display === 'flex') {
            hideGeohashPopup();
        }
    });
    
    // Enter room button handler
    enterBtn.addEventListener('click', async () => {
        const geohash = enterBtn.dataset.geohash;
        if (geohash) {
            hideGeohashPopup();
            await selectChatRoom(geohash);
        }
    });
}

async function selectChatRoom(geohash) {
    try {
        // Clean up previous room connections
        if (messageUnsubscribe) {
            messageUnsubscribe(); // Stop listening to old room's messages
        }
        if (presenceUnsubscribe) {
            presenceUnsubscribe(); // Stop listening to old room's presence
        }
        if (presenceInterval) {
            clearInterval(presenceInterval); // Stop the old presence updates
        }

        // Check room existence and create if needed
        const roomData = await checkAndCreateRoom(geohash);
        
        if (!roomData) {
            showNotification(`Failed to join or create room ${geohash}`, 'error');
            return;
        }

        activeChatRoom = geohash;
        console.log(`Selected chat room: ${activeChatRoom}`);
        
        // Add to recently joined rooms
        addToRecentlyJoinedRooms(geohash);

        // Show appropriate feedback
        if (roomData.wasCreated) {
            showNotification(`Created new room: ${geohash}`, 'success', 3000);
        } else {
            showNotification(`Joined room: ${geohash}`, 'success', 2000);
        }
        
    } catch (error) {
        console.error('Error selecting chat room:', error);
        showNotification(`Failed to join room ${geohash}: ${error.message}`, 'error');
        return;
    }

    // Update header immediately to reflect target room
    updateChatTitle(geohash);
    
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
    if (messagesDiv) {
        messagesDiv.innerHTML = ''; // Clear old messages first
    }
    const spinner = document.querySelector('.spinner-container');
    if (spinner) spinner.style.display = 'block';

    // Set up a real-time listener for new messages (unsubscribe previous handled earlier)
    const messagesRef = db.collection('chatRooms').doc(geohash).collection('messages').orderBy('timestamp');
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
        
        // Before rendering, ensure we're still on the same room to avoid stale updates
        if (activeChatRoom !== geohash) return;
        displayMessages(messages, !isInitialLoad);
        isInitialLoad = false;
    });

    // Set up presence listener for typing indicators
    const presenceRef = db.collection('chatRooms').doc(geohash).collection('users');
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
    if (!messagesDiv) return;
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
