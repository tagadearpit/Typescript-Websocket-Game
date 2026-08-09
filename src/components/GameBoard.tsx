import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { throttle } from 'lodash';

const socket = io({
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

export const emitPositionUpdate = throttle((x: number, y: number) => {
  socket.emit('playerMove', { x, y });
}, 1000 / 30); // 30 updates per second

interface GameBoardProps {
  movePlayer: (direction: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ movePlayer }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        ArrowUp: 'w',
        ArrowDown: 's',
        ArrowLeft: 'a',
        ArrowRight: 'd',
        w: 'w',
        s: 's',
        a: 'a',
        d: 'd',
      };

      const action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        movePlayer(action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer]);

  return <div className="game-board">Game Board</div>;
};

export default GameBoard;
