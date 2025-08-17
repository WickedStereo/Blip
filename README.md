# 🗺️ Blipz - Location-Based Chat App

A privacy-focused, location-based chat application where users can discover and join conversations in their area using geohash-based room system.

## 🌐 **Live Demo**
**Visit: https://blip-d93fe.web.app**

## ✨ **Key Features**

### 🔑 **Geohash-Based Room System**
- **One room per geohash** - Each geographic area has exactly one conversation
- **Click to join/create** - Click any region on the map to join existing or start new rooms
- **Visual discovery** - Interactive map with geohash grid overlays
- **Smart room detection** - Automatically shows nearby active conversations

### 🗺️ **Interactive Leaflet Map**
- **Professional map tiles** - Real OpenStreetMap integration with smooth interactions
- **Geohash regions** - Visual boundaries with 6-character location codes
- **Room markers** - Custom icons showing user counts and activity
- **Location controls** - "My Location" button and overlay toggles

### 💬 **Real-time Chat**
- **Anonymous authentication** - No signup required, instant access
- **Ephemeral messages** - 24-hour auto-deletion for privacy
- **Live synchronization** - Real-time updates via Firebase
- **Typing indicators** - See when others are composing messages

### 🛡️ **Privacy-First Design**
- **Approximate location** - Only geohash precision (~150m accuracy)
- **No exact GPS storage** - Location data stays on device
- **Anonymous users** - No personal information required
- **Local conversations** - Community-based geographic boundaries

## 🛠 **Tech Stack**

### **Frontend**
- **React 18** + TypeScript for type-safe UI components
- **Vite** for fast development and optimized builds
- **Leaflet** for professional interactive mapping
- **CSS Modules** for scoped styling with design tokens

### **Backend**
- **Firebase Authentication** (anonymous users)
- **Cloud Firestore** for real-time data synchronization
- **Firebase Hosting** for fast global CDN delivery
- **Firebase Functions** for server-side logic

### **Geospatial**
- **Custom geohash implementation** for location encoding
- **Viewport-based loading** for performance optimization
- **Debounced queries** to prevent excessive database calls
- **Distance calculations** for nearby room discovery

## 📁 **Project Structure**

```
src/
├── components/
│   ├── Chat/                    # Chat room UI components
│   │   ├── ChatRoom.tsx        # Main chat interface
│   │   ├── ChatHeader.tsx      # Room header with back button
│   │   ├── Message.tsx         # Individual message display
│   │   ├── MessageList.tsx     # Scrollable message container
│   │   ├── MessageComposer.tsx # Input area with emoji picker
│   │   ├── EmojiPicker.tsx     # Emoji selection modal
│   │   └── TypingIndicator.tsx # Shows when others are typing
│   └── Landing/                # Landing page with map
│       ├── LandingPage.tsx     # Main landing page layout
│       ├── LeafletMap.tsx      # Interactive map with geohash grid
│       ├── RoomCard.tsx        # Room list item display
│       ├── UserControls.tsx    # Username editor and profile
│       └── EnhancedGeohashInput.tsx # Join room by code input
├── firebase/                   # Firebase integration
│   ├── config.ts              # Firebase app initialization
│   ├── auth.ts                # Authentication utilities
│   ├── firestore.ts           # Database operations
│   └── index.ts               # Exported Firebase functions
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts             # Authentication state management
│   ├── useLocation.ts         # GPS location handling
│   ├── useRooms.ts            # Room discovery and joining
│   ├── useMessages.ts         # Real-time message synchronization
│   └── useMap.ts              # Map state and viewport management
├── types/                     # TypeScript definitions
│   ├── chat.ts                # Core app interfaces
│   └── css-modules.d.ts       # CSS module type definitions
├── utils/                     # Utility functions
│   ├── geohash.ts             # Core geohash encoding/decoding
│   ├── geohashGrid.ts         # Viewport grid calculations
│   └── mockData.ts            # Demo room codes for quick join
├── App.tsx                    # Main app routing and state
└── main.tsx                   # React app entry point

docs/                          # Project documentation
├── GEOHASH_ROOM_SYSTEM.md    # Room system architecture
├── LEAFLET_INTEGRATION.md    # Map integration details
├── INTEGRATION_NOTES.md      # Development notes
└── roadmap.md                # Future development plans
```

## 🚀 **Development**

### **Prerequisites**
- Node.js 18+ and npm
- Firebase CLI for deployment

### **Getting Started**
```bash
# Clone and install dependencies
git clone <repository>
cd Blipz
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

### **Available Scripts**
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to Firebase Hosting
- `npm run deploy:all` - Deploy hosting + functions

## 🔧 **Configuration**

### **Firebase Setup**
The app uses Firebase for backend services. Configuration is in `src/firebase/config.ts`:

```typescript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "blip-d93fe.firebaseapp.com",
  projectId: "blip-d93fe",
  // ... other config
};
```

### **Environment Variables**
- Development builds connect to production Firebase
- Location services work in browser with HTTPS
- Map tiles served from OpenStreetMap CDN

## 🎯 **How It Works**

### **Room Discovery Flow**
1. **User opens app** → Automatic anonymous authentication
2. **Location requested** → Browser GPS permission (optional)
3. **Map loads** → Shows geohash grid with nearby rooms
4. **Room selection** → Click map regions or browse room list
5. **Join/Create** → Existing rooms join instantly, empty regions create new

### **Geohash System**
- **6-character precision** → ~150m square regions
- **One room per geohash** → No duplicate conversations per area
- **Visual boundaries** → Map overlays show exact region borders
- **Efficient queries** → Database indexed by geohash for fast lookups

### **Real-time Messaging**
- **Firebase listeners** → Instant message delivery
- **Ephemeral storage** → 24-hour auto-deletion
- **Anonymous users** → No personal data required
- **Typing indicators** → Live interaction feedback

## 🌍 **Deployment**

The app is deployed on Firebase Hosting with:
- **Global CDN** → Fast loading worldwide
- **SPA routing** → Client-side navigation
- **Automatic builds** → Vite optimization pipeline
- **Cache headers** → Efficient asset delivery

## 📊 **Performance**

- **Bundle size**: 841 kB (222 kB gzipped)
- **Load time**: Sub-second on modern connections
- **Map rendering**: 60fps smooth interactions
- **Database queries**: Debounced and geographically bounded

## 🔒 **Privacy & Security**

- **Location privacy** → Only approximate geohash regions
- **Anonymous authentication** → No personal data collection
- **Ephemeral messages** → Automatic deletion after 24 hours
- **Firestore security rules** → Server-side access control
- **Client-side validation** → Input sanitization and rate limiting

## 🤝 **Contributing**

1. **Architecture** → Follow geohash-based room system
2. **Components** → Use TypeScript and CSS Modules
3. **Firebase** → Maintain real-time synchronization patterns
4. **Privacy** → Keep location data approximate and ephemeral

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Blipz** - Connecting communities through location-based conversations while respecting privacy and promoting local engagement. 🌍✨