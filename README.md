# Typescript-Websocket-Game

Real-time multiplayer cube collection game built with **Next.js**, **TypeScript**, **TailwindCSS**, and **Socket.IO**.

Live demo: https://typescript-websocket-game.up.railway.app

## Architecture

- The Next.js application serves the UI and the authoritative Socket.IO game server.
- The server owns player movement, collisions, coins, scoring, round resets, and latency measurement.
- The browser renders with Canvas and sends control state at 20 Hz instead of sending movement every animation frame.
- The server simulation runs at a stable 30 Hz and uses volatile state snapshots so stale multiplayer frames can be discarded.
- Static world geometry is rendered into an off-screen canvas and copied to the visible canvas, avoiding hundreds of tile draw calls every frame.

## Performance and reliability changes

- Restored the complete authoritative multiplayer game loop.
- Cached map collision tiles instead of rebuilding collision data during every player collision test.
- Reduced browser-to-server control traffic to 20 updates/second.
- Reduced simulation frequency to a stable 30 Hz.
- Used `requestAnimationFrame` only for rendering.
- Cached world tiles in an off-screen canvas.
- Capped canvas device-pixel-ratio rendering at 2.
- Fixed repeated leaderboard interval creation.
- Added reliable mobile pointer controls with pointer capture.
- Added safe socket initialization and automatic reconnection.
- Added input validation for player names, colours, and control payloads.
- Fixed procedural-map state leaking between rounds.
- Fixed coin spawn limit handling.
- Removed undeclared `random-name` and `bad-words` runtime dependencies.
- Added production build CI configuration.

## Run with Next.js locally

This is the recommended development mode because the Socket.IO server is a Next.js API route.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Run through VS Code Live Server

VS Code Live Server is a static HTTP server and cannot host the Next.js Socket.IO backend. Therefore the repository includes a separate static client under `live-server/`.

1. Open the repository in VS Code.
2. Start **Live Server** on `live-server/index.html`.
3. The static client connects to the deployed Railway Socket.IO server configured in `live-server/game.js`.
4. The local static client therefore provides multiplayer gameplay without requiring Node.js for the frontend.

For a completely local backend, use `npm run dev` instead of Live Server.

## Production build

```bash
npm install
npm run build
npm start
```

## Railway

Railway should run:

- Build: `npm run build`
- Start: `npm start`
- Health check: `/api/health`

No database is required for the current game. Game state is kept in the server process and is intentionally ephemeral.

## Important deployment constraint

The game server is stateful. A multi-instance Railway deployment would require shared game state or a dedicated realtime server; otherwise players connected to different instances would not share the same world. Keep the realtime service on a single instance until horizontal synchronization is implemented.
