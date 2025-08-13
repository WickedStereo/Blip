# 🌍 Blipz - Location-Based Anonymous Chat

**Blipz** is a privacy-focused, location-based group chat application that allows users to discover and join chat rooms based on their approximate geographical location without requiring sign-up or personal information.

![Blipz Screenshot](https://via.placeholder.com/800x400/2563eb/ffffff?text=Blipz+Chat+Interface)

## ✨ Features

### 🔐 Privacy-First Design
- **Anonymous Browsing**: Browse rooms without signing in; account required to send (see roadmap)
- **Geohash Location Privacy**: GPS coordinates never leave your device — only geohash approximations are used
- **Minimal Data**: No raw GPS or unnecessary personal data

### 💬 Modern Chat Experience
- **Real-time Messaging**: Instant message delivery with Firebase Firestore
- **Message Reactions**: React to messages with 👍, ❤️, 😂 and more
- **Emoji Picker**: Full emoji support with categorized picker
- **Typing Indicators**: See when others are typing
- **User Count**: Live participant count in each room

### 🌍 Location-Based Discovery
- **Radius Search (current)**: Find chat rooms within a specified kilometer radius
- **Map‑First Discovery (in progress)**: Interactive map with geohash grid overlays, labels, and active-room highlighting
- **Smart Room Logic**: "Enter" existing rooms or "Create" new ones (from map labels or list)
- **Recently Joined**: Quick access to your recently visited rooms

### 🎨 Modern UI/UX
- **Dark/Light Themes**: Toggle between themes with persistent preferences
- **Responsive Design**: Works seamlessly on mobile and desktop
- **Sound Notifications**: Optional audio alerts for new messages
- **Loading States**: Smooth skeleton loading for better UX
- **Animations**: Subtle animations and transitions throughout

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Firebase CLI installed globally: `npm install -g firebase-tools`
- A Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/blipz.git
   cd blipz
   ```

2. **Configure Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Anonymous sign-in method)
   - Enable Cloud Firestore
   - Copy your Firebase config

3. **Update Firebase Configuration**
   Edit `public/script.js` and replace the placeholder config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

4. **Set up Firestore Security Rules**
   Deploy the included security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start the development server**
   ```bash
   firebase serve --only hosting
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🏗️ Project Structure

```
blipz/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── script.js          # Core application logic
│   ├── style.css          # Modern CSS with theming
│   └── libs/              # Custom libraries
│       ├── ngeohash.js    # Geohash encoding/decoding
│       └── emoji-picker-simple.js  # Custom emoji picker
├── functions/             # Firebase Cloud Functions
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json # Database indexes
├── firebase.json         # Firebase configuration
└── docs/                  # Project documentation
    ├── CONTEXT.md         # Development context and history
    ├── design-tokens.md   # Design tokens
    └── roadmap.md         # Product roadmap (map-first, kid-safe, text-only)
```

## 🔧 Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Location**: Geohash for privacy-preserving location approximation
- **Real-time**: Firebase Firestore real-time listeners
- **UI**: Custom CSS with CSS Grid, Flexbox, and CSS Custom Properties

## 🛡️ Privacy, Safety & Security

### Location Privacy
- **No GPS Storage**: Exact coordinates never leave your device
- **Geohash Approximation**: Only approximate location areas are used
- **User Control**: Location updates can be disabled with privacy toggle

### Data Security
- **Anonymous Browsing + Account to Send (roadmap)**: Read rooms anonymously; sign in to post
- **Firestore Rules**: Strict rules prevent unauthorized access and enforce write permissions
- **Local Storage**: Minimal data stored locally (theme preferences, recent rooms)

### Message Privacy
- **Ephemeral Messages**: Messages auto-delete after 24h (via Cloud Functions)
- **Text‑Only**: No media uploads; messages are sanitized plain text
- **Room-Based**: Messages are scoped to specific geographic chat rooms

### Family Safety (roadmap)
- Stronger profanity filtering and link stripping/neutralization in kid‑safe mode

## 🎯 How It Works

1. **Location Detection**: App requests approximate location via browser geolocation API
2. **Geohash Conversion**: GPS coordinates are converted to geohash strings locally
3. **Room Discovery**: Radius‑based search (today); map‑first geohash discovery (roadmap)
4. **Join/Create**: Enter existing rooms or create new ones based on your geohash
5. **Real-time Chat**: Exchange messages with others in the same approximate area
6. **Ephemerality**: Messages auto‑delete after 24h; inactive rooms are deleted after 24h

## 🚧 Development Roadmap

See `docs/roadmap.md` for the full, up‑to‑date plan and ordering (map‑first; auth/kid‑safe post‑MVP).

Near‑term highlights:
- Map‑first landing page with geohash overlays and active‑room pop‑ups
- Create/join rooms directly from the map
- Text‑only chat with 24h TTL; Chats tab with cached recent rooms (24h)
- Backend maintenance: inactive room deletion, indexes, presence consistency
- Post‑MVP: account required to send; kid‑safe filters and compliance

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and request features via [GitHub Issues](https://github.com/your-username/blipz/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/your-username/blipz/discussions)
- **Documentation**: Check the [docs/](docs/) directory for detailed documentation

## 🙏 Acknowledgments

- Firebase for providing excellent real-time database and hosting services
- The geohash algorithm for privacy-preserving location approximation
- Inter and JetBrains Mono fonts for typography
- The open-source community for inspiration and best practices

---

**Built with ❤️ for privacy-conscious communication**
