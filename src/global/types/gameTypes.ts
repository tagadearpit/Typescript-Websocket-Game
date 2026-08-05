// Core game type definitions

export interface ControlsInterface {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  respawn: boolean;
  sprint: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  colour: string;
  jumps: number;
  isJumping: boolean;
  ping: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface PlayerSprite {
  forward: string[];
  left: string[];
  right: string[];
}

export interface Coin {
  x: number;
  y: number;
}

export interface Collidable {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  height: number;
  width: number;
}
