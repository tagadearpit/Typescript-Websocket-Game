import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

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

      socket.on('disconnect', () => {
        // Clear interval immediately on disconnect
        clearInterval(pingInterval);
        console.log(`Socket ${socket.id} disconnected and ping interval cleared.`);
      });
    });
  }
  res.end();
}
