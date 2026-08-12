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

export interface Coin {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface GameSnapshot {
  players: Player[];
  coins: Coin[];
  serverTime: number;
}

export interface HudState {
  players: Player[];
  currentPlayer?: Player;
  coins: number;
  connection: "connecting" | "connected" | "reconnecting" | "error";
}

export type ControlsKey = keyof ControlsInterface;
