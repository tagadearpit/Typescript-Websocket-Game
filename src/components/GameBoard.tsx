import React, { useEffect } from 'react';

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
