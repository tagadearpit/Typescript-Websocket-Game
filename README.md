# Typescript-Websocket-Game

A real-time multiplayer cube collection game built with **Next.js**, **TypeScript**, **TailwindCSS**, and **Socket.io**.

Players join a shared world, customize their character, and compete to collect coins. The game uses WebSockets for live multiplayer synchronization.

**Live Demo**:  
[https://typescript-websocket-game.up.railway.app](https://typescript-websocket-game.up.railway.app)

## Features
- Real-time multiplayer synchronization via Socket.IO
- Player customization and color selection
- Dynamic board and obstacle rendering
- Responsive controls (WASD and Arrow keys)
- Automatic socket reconnection with backoff

## Deployment on Railway

1. Connect your GitHub repository to Railway.
2. Ensure environment variables are set:
   - `NODE_ENV=production`
3. Railway automatically detects `npm run build` and `npm start`.
4. Set health check path to `/api/health`.

## Getting Started Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
