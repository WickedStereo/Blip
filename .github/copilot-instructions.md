# Blipz - Location-Based Anonymous Chat

Blipz is a privacy-focused, location-based group chat web application built with **React 18 + TypeScript + Vite** frontend and Firebase backend (Firestore, Authentication, Cloud Functions, Hosting). The app uses geohash-based location privacy and real-time messaging with an interactive Leaflet map interface.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Quick Commands Reference

### Essential Commands (Copy-Paste Ready)
```bash
# Install Dependencies (1-2 minutes)
npm install

# Start Development Server (instant)
npm run dev

# Build for Production (30 seconds)
npm run build

# Preview Production Build (instant)
npm run preview

# Deploy to Firebase Hosting (1-2 minutes)
npm run deploy

# Deploy Functions Only (30 seconds)
npm run deploy:functions

# Deploy Everything (2-3 minutes)
npm run deploy:all

# Install Firebase CLI (15-20 minutes - NEVER CANCEL)
npm install -g firebase-tools

# Setup Functions Dependencies (30 seconds)
cd functions && npm install

# Start Full Emulators (3-5 minutes - NEVER CANCEL)
firebase emulators:start
```

## Working Effectively

### Prerequisites and Setup
- **Node.js**: Version 18+ required (check with `node --version`)
- **npm**: Package manager for dependencies
- **Firebase CLI**: For deployment and emulators (optional for development)

### Bootstrap and Dependencies
- **Main Dependencies** (1-2 minutes):
  ```bash
  npm install
  ```
  - Installs React 18, TypeScript, Vite, Leaflet, and Firebase SDKs
  - Creates `node_modules/` and `package-lock.json`

- **Functions Dependencies** (30 seconds):
  ```bash
  cd functions && npm install
  ```
  - Installs Firebase Functions dependencies
  - Functions use Node.js v22 (Node.js v18+ works for development)

### Development Workflow
- **Start Development Server**:
  ```bash
  npm run dev
  ```
  - Starts Vite dev server on http://localhost:5173
  - **Instant startup** with hot module replacement
  - Auto-reloads on file changes
  - **NEVER CANCEL** - this is the primary development command

- **Build for Production**:
  ```bash
  npm run build
  ```
  - Compiles TypeScript and bundles with Vite
  - Creates `dist/` folder for deployment
  - Takes ~30 seconds

- **Preview Production Build**:
  ```bash
  npm run preview
  ```
  - Serves the built `dist/` folder locally
  - Tests production build before deployment

- **Run Firebase Emulators** (for full local development):
  ```bash
  firebase emulators:start
  ```
  - Takes 3-5 minutes to start all services. NEVER CANCEL.
  - Includes Firestore, Authentication, Functions, and Hosting emulators

### Code Quality and Linting
- **Main App Linting** (<1 second):
  ```bash
  npm run lint
  ```
  - Uses ESLint with React and TypeScript rules
  - Auto-fixes available with `npm run lint -- --fix`

- **Functions Linting** (<1 second):
  ```bash
  cd functions && npm run lint
  ```
  - Uses Google style guide
  - Auto-fix available with `npm run lint -- --fix`

### Deployment
- **Deploy Hosting Only**:
  ```bash
  npm run deploy
  ```
  - Builds app and deploys to Firebase Hosting
  - Takes 1-2 minutes total

- **Deploy Functions Only**:
  ```bash
  npm run deploy:functions
  ```
  - Deploys only Cloud Functions
  - Takes ~30 seconds

- **Deploy Everything**:
  ```bash
  npm run deploy:all
  ```
  - Builds app and deploys hosting + functions
  - Takes 2-3 minutes total

## Project Structure and Key Files

### Frontend (React + TypeScript + Vite)
```
src/
├── components/                 # React components
│   ├── Chat/                  # Chat room UI components
│   │   ├── ChatRoom.tsx      # Main chat interface
│   │   ├── ChatHeader.tsx    # Room header with back button
│   │   ├── Message.tsx       # Individual message display
│   │   ├── MessageList.tsx   # Scrollable message container
│   │   ├── MessageComposer.tsx # Input area with emoji picker
│   │   ├── EmojiPicker.tsx   # Emoji selection modal
│   │   └── TypingIndicator.tsx # Shows when others are typing
│   └── Landing/              # Landing page with map
│       ├── LandingPage.tsx   # Main landing page layout
│       ├── LeafletMap.tsx    # Interactive map with geohash grid
│       ├── RoomCard.tsx      # Room list item display
│       ├── UserControls.tsx  # Username editor and profile
│       └── EnhancedGeohashInput.tsx # Join room by code input
├── firebase/                  # Firebase integration
│   ├── config.ts             # Firebase app initialization
│   ├── auth.ts               # Authentication utilities
│   ├── firestore.ts          # Database operations
│   └── index.ts              # Exported Firebase functions
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts            # Authentication state management
│   ├── useLocation.ts        # GPS location handling
│   ├── useRooms.ts           # Room discovery and joining
│   ├── useMessages.ts        # Real-time message synchronization
│   └── useMap.ts             # Map state and viewport management
├── types/                     # TypeScript definitions
│   ├── chat.ts               # Core app interfaces
│   └── css-modules.d.ts      # CSS module type definitions
├── utils/                     # Utility functions
│   ├── geohash.ts            # Core geohash encoding/decoding
│   ├── geohashGrid.ts        # Viewport grid calculations
│   └── mockData.ts           # Demo room codes for quick join
├── App.tsx                    # Main app routing and state
├── App.css                    # Global styles
└── main.tsx                   # React app entry point

# Build and Configuration
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
└── dist/                      # Production build output (created by npm run build)
```

### Backend (Firebase)
```
functions/
├── package.json               # Node.js v22, Firebase Functions v6.0.1
├── index.js                  # Cloud Functions (message cleanup, room deletion)
├── src/                      # TypeScript sources
└── .eslintrc.js             # Google style guide configuration

firestore.rules               # Security rules for chat rooms and messages
firestore.indexes.json        # Database indexes
firebase.json                 # Firebase configuration (hosting points to dist/)
```

## Validation and Testing

### Manual Testing Scenarios
**ALWAYS run through these scenarios after making changes:**

1. **Development Server**:
   - Run `npm run dev` and verify http://localhost:5173 loads
   - Check that hot reload works when editing files
   - Verify no build errors in terminal

2. **Basic App Flow**:
   - Load http://localhost:5173 in browser
   - Accept location permissions when prompted
   - Verify map loads with geohash grid overlays
   - Test room creation/joining from map clicks
   - Send test messages and verify real-time delivery
   - Test with multiple browser tabs for multi-user simulation

3. **Map Interface**:
   - Test map panning and zooming
   - Verify geohash regions display correctly
   - Test room popups and activity indicators
   - Verify "My Location" button works
   - Test geohash input for joining specific rooms

4. **Chat Features**:
   - Test message sending and real-time updates
   - Verify typing indicators appear/disappear
   - Test emoji picker functionality
   - Verify user count updates in real-time
   - Test back button to return to map

5. **UI Features**:
   - Test responsive design on different screen sizes
   - Verify smooth transitions between map and chat
   - Test loading states and error handling
   - Verify recently joined rooms list updates

6. **Location Privacy**:
   - Verify GPS coordinates never leave device (check Network tab)
   - Confirm only geohash approximations are sent to Firebase
   - Test without location permissions (should show error)

7. **Real-time Features**:
   - Open multiple browser tabs to test multi-user chat
   - Verify typing indicators sync across users
   - Test user presence and activity tracking
   - Verify room activity updates in real-time

### Build Validation
- **Development**: `npm run dev` for instant development with hot reload
- **Production Build**: `npm run build` creates optimized `dist/` folder
- **Preview**: `npm run preview` tests production build locally
- **Always Test**: Run manual scenarios above before committing changes

## Common Tasks and Troubleshooting

### Development Issues
- **Port Conflicts**: If 5173 is busy, Vite will suggest alternative ports
- **TypeScript Errors**: Check terminal for compilation errors
- **Hot Reload Issues**: Refresh browser if hot reload stops working
- **Dependency Issues**: Delete `node_modules/` and `package-lock.json`, then `npm install`

### Firebase CLI Issues
- **Installation Timeout**: Firebase CLI takes 15-20 minutes to install globally
- **Emulator Startup**: Allow 3-5 minutes for full emulator suite to start
- **Version Check**: After installation, verify with `firebase --version`

### Functions Development
- **Node Version**: Functions specify Node.js v22 but v18+ works for development
- **Linting**: Use `npm run lint -- --fix` to auto-fix style issues
- **Testing Functions**: Use `firebase functions:shell` for local function testing

### Frontend Development
- **Build System**: Uses Vite for fast development and optimized builds
- **TypeScript**: Full type safety with React components
- **CSS Modules**: Scoped styling with design tokens
- **Hot Reload**: Instant updates during development

## Key Features and Architecture

### Privacy-First Design
- **Anonymous Authentication**: Automatic Firebase anonymous auth
- **Geohash Location**: GPS coordinates converted to geohash locally, never transmitted
- **No Personal Data**: No email, phone, or sign-up required

### Map-First Interface
- **Leaflet Integration**: Professional OpenStreetMap tiles
- **Geohash Grid**: Visual boundaries with 6-character location codes
- **Room Discovery**: Click regions to join/create rooms
- **Activity Indicators**: Heat coloring by user count and activity

### Real-time Chat Features
- **Message Delivery**: Firestore real-time listeners
- **Typing Indicators**: Real-time presence using Firestore
- **User Count**: Live participant tracking
- **Ephemeral Messages**: 24-hour auto-deletion

### Cloud Functions (Backend Maintenance)
- **Message Cleanup**: Scheduled deletion of old messages
- **Room Deletion**: Cleanup of inactive rooms
- **Scheduled Jobs**: Uses Firebase Functions v2 scheduler

## Important Notes

### Development Workflow
- **Primary Command**: `npm run dev` for development (instant startup)
- **Build Command**: `npm run build` for production builds
- **Deploy Command**: `npm run deploy` for hosting deployment
- **Functions**: Use `npm run deploy:functions` for backend updates

### Firebase Project Requirements
- Firestore Database enabled
- Authentication with Anonymous provider
- Cloud Functions for cleanup tasks
- Hosting for static file serving (points to `dist/` folder)

### Development Best Practices
- **Use Development Server**: Always use `npm run dev` for development
- **TypeScript**: Leverage type safety for better code quality
- **Component Testing**: Test individual components in isolation
- **Map Testing**: Always test with location permissions enabled
- **Multi-tab Testing**: Essential for real-time features validation
- **Privacy Validation**: Verify geohash-only transmission in Network tab
- **Build Testing**: Test production build with `npm run preview` before deployment