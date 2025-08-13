# 🎯 Blipz Roadmap: Map‑First Chat to Final Vision

### Current status (today)
- Core chat works (real-time, 24h TTL). Recently joined rooms exist. Anonymous auth in place.
- Map scaffold integrated (Leaflet + OSM), 6-char geohash overlays with labels, active-room highlighting, click-to-enter/create from labels.

### Final vision (what we’re building)
- Map-first landing page (Uber-like). Geohash regions shown; pop-up at each region centroid with its 6-char geohash.
- Click pop-up to open chat. Only active rooms show pop-ups; otherwise offer “Create room”.
- Overlays: change username/display; join any room by entering a geohash ID.
- Chat screen: standard chat UI; messages visible to everyone; sending requires a registered account.
- Secondary menu: “Chats” lists previous rooms with cached messages (Snapchat-like tabs).
- Ephemerality: messages auto-delete after 24h. Inactive rooms auto-delete after 24h.

---

## Milestone 1 — Map Landing Page (Leaflet/MapLibre)
Goal: Replace plain landing with an interactive map divided by geohash regions.

- [x] Integrate map library (Leaflet)
- [x] Compute visible geohash cells for current viewport and zoom
- [x] Draw region overlays/centroids; label with 6-char geohash
- [ ] Show pop-ups only for active rooms; non-active shows “Create room” CTA (partial: active highlighting + click-to-enter/create from label)
- [ ] Smooth panning/zooming; lazy-load visible regions; debounce queries
- [x] Overlay controls: change username/display; “Join by geohash” input (already existed)
- [ ] Deep links: `/room/:geohash` and `?g=xxxxxx`
- [ ] Fullscreen map landing layout: map is the primary view by default (desktop + mobile); controls appear as overlays; chat opens as a route/screen
  - Implemented: fullscreen default + floating overlay controls (radius, join-by-ID, name)

Acceptance
- Default landing shows fullscreen map (no side list). Panning updates within 150ms.
- Clicking a labeled region opens a popup; Enter navigates to chat. Inactive shows “Create room”.

### Milestone 1.5 — Advanced Map Filters (Activity + Safety)
Goal: Help users discover the right rooms quickly while keeping things kid‑safe.

- [ ] Filter toggles: Active now, Trending (last 60 min), New rooms (last 10 min)
- [ ] Heat coloring by active user count per geohash cell
- [ ] “Kid‑safe only” toggle: hide rooms with recent reports or policy violations
- [ ] Time window selector (15m / 1h / 24h) to compute activity
- [ ] Map legend + accessibility labels for colors and counts

Acceptance
- Filters update visible overlays within 200ms and remain responsive during pan/zoom.

## Milestone 2 — Room Create/Join from Map
Goal: Seamless flow to create a room when none exists, or join when it does.

- [ ] Room existence check by geohash
- [ ] Create room doc with defaults (geohash, createdAt, lastActiveAt)
- [ ] Ensure indexes and security rules for `chatRooms` and `messages`
- [ ] Update `lastActiveAt` on message activity (server time)
- [ ] Show toast/feedback on create/join failures

Acceptance
- Creating a room from a region with no room succeeds <500ms and navigates to chat.
- Joining existing room from map is instant and idempotent.

## Milestone 3 — Map Popups & Deep Links
Goal: Complete map-first flow with actionable popups and sharable links.

- [ ] Popups on geohash labels showing room meta and Enter/Create button
- [ ] Open popup only for active rooms by default; inactive offers Create
- [ ] Deep links: `/room/:geohash` and `?g=xxxxxx` (open room directly)
- [ ] Accessible popups (keyboard/focus management, ARIA labels)

Acceptance
- Clicking a labeled region opens a popup; Enter navigates to chat. Inactive shows Create.
- Visiting a deep link loads directly into the specified room.

## Milestone 4 — Chat UI Fit‑and‑Finish
Goal: Production-quality chat aligned with expectations.

- [ ] Message list virtualization + pagination (50/message batches)
- [ ] Composer: enter to send, Shift+Enter newline; emoji; reactions; reply
- [ ] Typing indicator and online count remain stable
- [ ] Error states: offline, retry, permission prompts
- [ ] New room banner; ephemeral notice (24h)
 - [ ] Kid‑safe visual cues (safe mode badge; link warnings if enabled)

Acceptance
- List is smooth on low-end phones; no frame drops while receiving.

## Milestone 4 — “Chats” Menu (Cached History)
Goal: Second tab that lists prior rooms with cached messages.

- [ ] New navigation tabs: Map | Chats
- [ ] Local cache (IndexedDB) of last 24h messages per joined room
- [ ] List shows last message preview, timestamp, unread badge
- [ ] Tap to re-enter; purge cache beyond 24h

Acceptance
- Cache survives refresh; respects 24h TTL; can clear from settings.

## Milestone 5 — Backend Maintenance & Ephemerality
Goal: Keep data fast, lean, and compliant with TTL behavior.

- [ ] Verify/implement scheduled deletion of inactive rooms (>24h inactivity)
- [ ] Keep message cleanup (24h) and ensure composite indexes
- [ ] Update presence and `lastActiveAt` consistency

Acceptance
- No rooms without activity for >24h remain; message TTL respected.

## Milestone 10 — Safety, Abuse, and Rate Limits (Post‑MVP)
Goal: Baseline protection for public rooms, tuned for a kid‑friendly app.

- [ ] Strong profanity filter; child‑safe dictionary; emoji variants
- [ ] Client hint rate limiting + server rules validation
- [ ] Report message + block user (MVP UI; store in Firestore)
- [ ] Link stripping in kid‑safe mode; optional allowlist for domains (off by default)
- [ ] Grooming/harassment pattern heuristics (client hints; server‑side review later)

## Milestone 11 — Family‑Friendly Compliance (Post‑MVP)
Goal: Ship-ready basics for a kid‑safe, everyone app. (Non‑legal guidance; consult counsel.)

- [ ] Terms of Service, Privacy Policy, and data retention policy (24h)
- [ ] Clear location privacy explainer (geohash-only)
- [ ] Account deletion and data export (self-serve or support path)
- [ ] Age‑appropriate UX: no profiling; data minimization; analytics disabled in kid‑safe mode
- [ ] Parental consent pathway if collecting PII from under‑13 users (jurisdiction dependent)

## Milestone 8 — Production Polish
Goal: Make it feel like an app users can trust and keep.

- [ ] PWA: install prompt, service worker (read-only offline), update flow
- [ ] Notifications: per-room opt-in with sensible rate limits
- [ ] Performance monitoring and error tracking

---

## Milestone 12 — Auth: Require Account to Send (Post‑MVP)
Goal: Reading is open; sending messages requires registration.

- [ ] Add Sign in with Email Link and Google (progressive auth)
- [ ] Gate composer: show sign-in CTA if unauthenticated; allow read-only
- [ ] Link existing anonymous sessions to new accounts when possible
- [ ] Update Firestore rules: only authenticated can write to `messages`
- [ ] Privacy: keep geohash-only location usage; no raw GPS stored

Constraints (text‑only, kid‑safe)
- [ ] Text‑only composer (no images/files). Enforce 300 chars, no HTML.
- [ ] Strip or neutralize links by default in kid‑safe mode.

Acceptance
- Unauthed users can browse rooms, cannot send.
- After sign-in, sending works without page reload; rules enforce it.

### Technical notes
- Use existing `ngeohash.bboxes(...)` to derive viewport geohash cells; bind to map move/zoom.
- Firestore: index `chatRooms` by geohash and `lastActiveAt`; `messages` by `roomId` + `createdAt`.
- Keep location private: convert GPS to geohash client-side; never send raw coords.
 - Text‑only: block uploads entirely; sanitize message text; store plain text only.

### What might be missing (recommendations)
- Moderation staffing/triage: reports need a review plan (even if manual initially).
- Room creation throttling: prevent spam via per-account limits and Cloud Function checks.
- Map provider choice/licensing: Leaflet + OpenStreetMap tiles vs MapLibre GL; add attribution and tile caching strategy.
- Family policy: community guidelines for kids; abuse/DMCA contact.
- Deep links/sharing: copy link to room (`/room/GEHASH`), and QR share.

### Immediate next steps
1) Milestone 1: integrate map + geohash overlays and active-room pop-ups.
2) Milestone 2: create/join flow from map. 
3) Milestone 3: require sign-in to send; update rules.
