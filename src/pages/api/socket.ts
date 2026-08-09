import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;

const gameState = {
  players: {} as Record<string, { x: number; y: number }>,
};

function updatePlayerState(id: string, x: number, y: number) {
  gameState.players[id] = { x, y };
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse & { socket: any }) {
  if (res.socket.server.io) {
    console.log(`Socket is already running on http://${HOST}:${PORT}`);
  } else {
    console.log(`Socket is initializing on http://${HOST}:${PORT}`);
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      // Store interval instance per socket
      const pingInterval = setInterval(() => {
        socket.emit('ping', Date.now());
      }, 5000);

      socket.on('playerMove', (data: { x: number; y: number }) => {
        if (typeof data?.x !== 'number' || typeof data?.y !== 'number') return;

        // Boundary check against board dimensions
        const clampedX = Math.max(0, Math.min(data.x, BOARD_WIDTH));
        const clampedY = Math.max(0, Math.min(data.y, BOARD_HEIGHT));

        updatePlayerState(socket.id, clampedX, clampedY);
      });

      socket.on('disconnect', () => {
        // Clear interval immediately on disconnect
        clearInterval(pingInterval);
        console.log(`Socket ${socket.id} disconnected and ping interval cleared.`);
      });
    });
  }
  res.end();
}
