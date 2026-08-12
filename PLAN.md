# Game Plan: Neon Cube Arena Rebuild

## Goal

Rebuild the existing multiplayer cube-collection game without changing its Railway-friendly Next.js and Socket.IO deployment model. The finished game should load quickly, feel responsive, keep the authoritative multiplayer rules reliable, reduce unnecessary CPU and network work, and present a more cohesive neon arcade visual system.

## Risk Tasks

### 1. Authoritative server tick and collision lookup
- **Why isolated:** The server currently reconstructs every solid tile list for each collision check and broadcasts full state at the same rate as the physics loop. These costs multiply with player count and can create jitter when Railway CPU is busy.
- **Approach:** Keep the server authoritative, precompute a collision grid and solid-tile list whenever the map changes, use a bounded fixed-step simulation, guard against oversized deltas, and emit snapshots at a deliberate network rate separate from the render loop. Keep the existing Socket.IO event contract where practical so the client and deployment remain compatible.
- **Verify:** A player can walk, sprint, jump, fall, respawn, and collect coins without passing through platforms. A new round resets every player and changes the map. Server logs remain free of repeated errors while the game is active, and state updates stay stable with multiple connections.

### 2. Client render loop and network smoothing
- **Why isolated:** The client currently emits controls every animation frame, redraws the complete map every frame, and performs synchronous lookup work from mutable arrays. That can feel laggy on low-power devices even when the network is healthy.
- **Approach:** Render only visible tiles, cap the canvas backing-store pixel ratio, send controls only when the action state changes or at a low heartbeat rate, cache loaded images, and keep a single lifecycle-safe animation loop. Interpolate remote player positions between snapshots while keeping the local player visually responsive.
- **Verify:** The canvas renders continuously without duplicate loops after hot reload or reconnect, keyboard and touch input respond immediately, remote players move smoothly between snapshots, and resizing does not stretch or blur the game unexpectedly.

### 3. Responsive HUD and loading state
- **Why isolated:** The current leaderboard polls a ref with a timer that is recreated on every render, includes a large unused dashboard placeholder, and the loading screen adds an artificial two-second delay.
- **Approach:** Replace polling with a snapshot-driven HUD subscription, remove the placeholder dashboard, use compact glass-style panels over the canvas, keep the mobile control layer separate from the canvas, and make loading depend on actual assets plus socket readiness with a timeout/error path rather than an artificial delay.
- **Verify:** The initial screen is usable on desktop and mobile widths, the game becomes playable as soon as assets and socket data are ready, the leaderboard updates when authoritative snapshots arrive, and no HUD element overlaps the playfield controls.

## Main Build

The implementation will preserve Next.js pages routing and the existing `/api/socket` and `/api/health` endpoints. Gameplay data and network handling will move into focused TypeScript modules, while React will own only the presentation shell and HUD. The canvas renderer will draw a tiled neon arena with a dark starfield, cyan-edged platforms, glowing coins, colorized square avatars, camera-follow behavior, and lightweight pickup feedback.

- **Assets needed:** One generated art-direction reference, one optimized platform tile, one optimized coin sprite, one optimized player sprite, and the existing audio files. The renderer will use procedural primitives for simple glows, text, bars, stars, and UI because those are cheaper and sharper than image assets.
- **Verify:**
  - Movement direction, jump state, sprint, respawn, and touch controls match the existing game contract.
  - Coin score increments once per pickup, round victory/defeat feedback still fires, and reconnects do not create duplicate listeners.
  - No full-map work is performed for tiles outside the camera viewport.
  - No visual fallback caused by missing assets; the renderer has a safe procedural fallback if an optional sprite fails to load.
  - Loading, customization, gameplay, end-of-round, and responsive controls are all reachable.
  - No browser console errors during local production verification.
  - The visual result is consistent with `art/reference.png`: dark navy arena, indigo platforms, cyan accents, amber coins, compact glass HUD, and readable player labels.
  - The latest verification screenshots and test logs are recorded in the repository’s `verification/` directory.
