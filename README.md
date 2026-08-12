# Neon Cube Arena

**Neon Cube Arena** is a real-time multiplayer coin-collection game built with Next.js, TypeScript, Tailwind CSS, and Socket.IO. Players enter a shared, authoritative arena, navigate platform layouts using keyboard or touch controls, and race to collect ten coins.

The rebuild focuses on responsive input, a lightweight canvas renderer, deliberate network cadence, and an efficient Railway deployment path. The game keeps the original repository’s serverless-style Next.js API structure while replacing the legacy dashboard and polling UI with a compact, responsive game HUD.

## Highlights

| Area | Rebuilt behavior |
|---|---|
| **Rendering** | Canvas resolution is capped by device pixel ratio, assets are cached once, and only tiles inside the camera viewport are drawn. |
| **Multiplayer** | The server remains authoritative, uses a fixed simulation loop, caches map collision data, and broadcasts snapshots separately at 20 Hz. |
| **Input** | Keyboard and touch controls share one action layer. Control changes are sent immediately, with a low-frequency heartbeat for reliable synchronization. |
| **Loading** | The game starts after Socket.IO readiness and decoded runtime assets rather than an artificial timeout. |
| **HUD** | The leaderboard updates from server snapshots instead of polling refs. The old unused dashboard has been removed. |
| **Visuals** | A generated neon-arena art direction is implemented with compact platform, coin, and player assets plus procedural glow and background effects. |

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a callsign, choose an avatar color, and select **Enter the arena**.

| Control | Action |
|---|---|
| `A` / `D` or arrow keys | Move left or right |
| `Space` | Jump |
| `Shift` | Sprint |
| `S` or down arrow | Fast fall |
| `R` | Respawn |

## Validate before deployment

```bash
npm run lint
npm run build
npm run test:smoke
```

The smoke test checks the health endpoint, initializes the Socket.IO API route from a cold state, connects via WebSocket, verifies all world snapshot events, and confirms that player coordinates remain valid after a control update.

## Deploy on Railway

Railway can use the standard scripts already declared in `package.json`:

```bash
npm run build
npm start
```

Set the Railway health-check path to `/api/health`. The endpoint returns HTTP 200 and an application health payload. Set `NODE_ENV=production` in the Railway environment.

## Project layout

```text
src/components/    React flow, HUD, loading, and input presentation
src/game/          Canvas renderer, client session, and input manager
src/pages/api/     Railway-compatible health and Socket.IO endpoints
src/maps/          Procedural arena generation
public/img/        Optimized runtime platform, coin, and player assets
scripts/           Repeatable production smoke test
```

The generated visual direction is recorded in `ASSETS.md`, while `PLAN.md`, `STRUCTURE.md`, and `MEMORY.md` document the rebuild decisions and verification criteria.
