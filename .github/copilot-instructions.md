# Blipz - Location-Based Anonymous Chat

Blipz is a privacy-focused, location-based group chat web application built with vanilla JavaScript frontend and Firebase backend (Firestore, Authentication, Cloud Functions, Hosting). The app uses geohash-based location privacy and real-time messaging.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Quick Commands Reference

### Essential Commands (Copy-Paste Ready)
```bash
# Install Firebase CLI (15-20 minutes - NEVER CANCEL)
npm install -g firebase-tools

# Setup Functions Dependencies (51 seconds)
cd functions && npm install

# Serve App Locally (1-2 minutes startup)
firebase serve --only hosting

# Alternative Static Server (instant)
cd public && python3 -m http.server 8000

# Fix Function Linting (auto-fixes 89/94 errors)
cd functions && npm run lint -- --fix

# Start Full Emulators (3-5 minutes - NEVER CANCEL)
firebase emulators:start
```

## Working Effectively

### Prerequisites and Setup
- **CRITICAL**: Firebase CLI installation takes 15+ minutes. NEVER CANCEL. Set timeout to 30+ minutes.
  ```bash
  npm install -g firebase-tools
  ```
  - **TIMING**: Installation consistently takes 15-20 minutes due to large dependency tree
  - **NETWORK**: May fail in restricted environments - use fallback below
  - Alternative if npm install fails: Use Python HTTP server for static file serving
  ```bash
  cd public && python3 -m http.server 8000
  ```

### Bootstrap and Dependencies
- **Functions Dependencies** (51 seconds):
  ```bash
  cd functions && npm install
  ```
  - **WARNING**: Functions require Node.js v22 but system may have v20. Expect warnings but installation works.

### Development Workflow
- **Serve Frontend Locally**:
  ```bash
  firebase serve --only hosting
  ```
  - Starts on http://localhost:5000
  - Takes 1-2 minutes to start. NEVER CANCEL. Set timeout to 3+ minutes.

- **Run Firebase Emulators** (for full local development):
  ```bash
  firebase emulators:start
  ```
  - Takes 3-5 minutes to start all services. NEVER CANCEL. Set timeout to 8+ minutes.
  - Includes Firestore, Authentication, Functions, and Hosting emulators

### Code Quality and Linting
- **Functions Linting** (<1 second):
  ```bash
  cd functions && npm run lint
  ```
  - **EXPECTED**: Currently fails with 94 style errors (Google style guide violations)
  - Functions use 4-space indentation but Google style requires 2-space
  - Issues: object-curly-spacing, indent, max-len, arrow-parens, quotes, require-jsdoc
  - Run `npm run lint -- --fix` to auto-fix most issues (89 of 94 errors)

- **Fix Linting Issues**:
  ```bash
  cd functions && npm run lint -- --fix
  ```

### Deployment
- **Deploy Functions**:
  ```bash
  cd functions && npm run deploy
  ```
- **Deploy Full Project**:
  ```bash
  firebase deploy
  ```

## Project Structure and Key Files

### Frontend (Vanilla JavaScript)
```
public/
├── index.html          # Main application (modern responsive UI)
├── script.js           # Core logic (1000+ lines, real-time chat)
├── style.css           # Modern CSS with dark/light themes
└── libs/               # Custom libraries (replace broken dependencies)
    ├── ngeohash.js     # Privacy-preserving location (geohash)
    └── emoji-picker-simple.js  # Custom emoji picker Web Component
```

### Backend (Firebase)
```
functions/
├── package.json        # Node.js v22, Firebase Functions v6.0.1
├── index.js           # Cloud Functions (message cleanup, room deletion)
├── src/               # TypeScript sources
└── .eslintrc.js       # Google style guide (currently failing)

firestore.rules         # Security rules for chat rooms and messages
firestore.indexes.json  # Database indexes
firebase.json          # Firebase configuration
```

## Validation and Testing

### Manual Testing Scenarios
**ALWAYS run through these scenarios after making changes:**

1. **Basic App Flow**:
   - Load http://localhost:5000 in browser
   - Accept location permissions when prompted
   - Verify geohash room creation/joining works
   - Send test messages and verify real-time delivery
   - Test with multiple browser tabs for multi-user simulation

2. **UI Features**:
   - Test dark/light theme toggle (top-right moon/sun icon)
   - Test sound notification toggle (speaker icon)
   - Test emoji picker (click emoji button in message input)
   - Test message reactions (hover over messages, click reaction buttons)
   - Verify recently joined rooms list updates correctly

3. **Location Privacy**:
   - Verify GPS coordinates never leave device (check Network tab in DevTools)
   - Confirm only geohash approximations are sent to Firebase
   - Test radius-based room discovery (enter km value, click search)
   - Verify "Join by ID" functionality with manual geohash entry

4. **Real-time Features**:
   - Open multiple browser tabs to test multi-user chat
   - Verify typing indicators appear/disappear correctly
   - Test user count updates in real-time
   - Verify message reactions sync across users
   - Test notification sounds (ensure browser allows audio)

5. **Error Handling**:
   - Test without location permissions (should show error)
   - Test with network disconnection (should handle gracefully)
   - Test invalid geohash inputs in "Join by ID"

### Build Validation
- **No Traditional Build System**: Frontend uses vanilla HTML/CSS/JS - no compilation needed
- **Functions Build**: Handled automatically by Firebase CLI during deployment
- **Always Test**: Run manual scenarios above before committing changes

## Common Tasks and Troubleshooting

### Firebase CLI Issues
- **Installation Timeout**: Firebase CLI takes 15-20 minutes to install globally
- **Large Dependencies**: 500+ packages including native modules (re2, node-gyp)
- **Network Issues**: If npm install fails, try `python3 -m http.server 8000` in public/ as fallback
- **Emulator Startup**: Allow 3-5 minutes for full emulator suite to start
- **Version Check**: After installation, verify with `firebase --version`

### Functions Development
- **Node Version**: Functions specify Node.js v22 but v20 works with warnings
- **Linting Errors**: Currently 94 style errors due to Google style guide violations:
  - 4-space indentation vs required 2-space
  - Missing JSDoc comments
  - Object curly spacing issues
  - Arrow function parentheses requirements
  - String quote style (single vs double quotes)
- **Testing Functions**: Use `firebase functions:shell` for local function testing
- **Auto-fix Linting**: `npm run lint -- --fix` resolves 89 of 94 errors automatically

### Frontend Development
- **No Build Step**: Direct file editing, refresh browser to test
- **Custom Libraries**: Uses local ngeohash.js and emoji-picker-simple.js (not npm packages)
- **Firebase Config**: Update firebaseConfig object in script.js for new projects

## Key Features and Architecture

### Privacy-First Design
- **Anonymous Authentication**: Automatic Firebase anonymous auth
- **Geohash Location**: GPS coordinates converted to geohash locally, never transmitted
- **No Personal Data**: No email, phone, or sign-up required

### Real-time Chat Features
- **Message Delivery**: Firestore real-time listeners
- **Reactions**: React with 👍, ❤️, 😂 using Firebase subcollections
- **Typing Indicators**: Real-time presence using Firestore
- **User Count**: Live participant tracking with 5-minute activity window

### Cloud Functions (Backend Maintenance)
- **Message Cleanup**: `deleteOldMessages` runs every 6 hours, removes messages >24 hours
- **Room Deletion**: `deleteInactiveRooms` runs daily, removes empty/inactive rooms
- **Scheduled Jobs**: Uses Firebase Functions v2 scheduler

## Important Notes

### Timing Expectations
- **NEVER CANCEL**: Firebase CLI installation (15-20 minutes)
- **NEVER CANCEL**: Emulator startup (3-5 minutes)  
- **NEVER CANCEL**: Firebase serve startup (1-2 minutes)
- Functions npm install: ~51 seconds (with Node.js version warnings)
- Functions linting: <1 second (94 errors expected)
- Python HTTP server startup: <1 second (instant fallback)

### Firebase Project Requirements
- Firestore Database enabled
- Authentication with Anonymous provider
- Cloud Functions for cleanup tasks
- Hosting for static file serving

### Development Best Practices
- **Test Location Features**: Always test with location permissions enabled
- **Multi-tab Testing**: Essential for real-time features validation
- **Privacy Validation**: Verify geohash-only transmission in Network tab
- **Theme Testing**: Test both dark and light modes for UI changes
- **Sound Testing**: Verify notification sounds work across browsers