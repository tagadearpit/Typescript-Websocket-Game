import type { Socket } from "socket.io-client";
import {
  PLAYER_INTERPOLATION,
  SNAPSHOT_HEARTBEAT_MS,
} from "../global/constants";
import type {
  Coin,
  ControlsInterface,
  GameSnapshot,
  HudState,
  Player,
} from "../global/types/gameTypes";

const emptyControls = (): ControlsInterface => ({
  up: false,
  down: false,
  left: false,
  right: false,
  jump: false,
  respawn: false,
  sprint: false,
});

const clonePlayers = (players: Player[]) =>
  players.map((player) => ({ ...player }));
const cloneCoins = (coins: Coin[]) => coins.map((coin) => ({ ...coin }));

export interface GameSessionOptions {
  onHudChange: (state: HudState) => void;
  onToast: (message: string, kind?: "info" | "success" | "warning") => void;
  onSound: (sound: "coin" | "victory" | "defeat") => void;
}

export class GameSession {
  private readonly socket: Socket;
  private readonly options: GameSessionOptions;
  private readonly controls: ControlsInterface = emptyControls();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private previousPlayers: Player[] = [];
  private targetPlayers: Player[] = [];
  private coins: Coin[] = [];
  private map: number[][] = [];
  private block = 1;
  private lastSnapshotAt = performance.now();
  private snapshotInterval = 50;
  private lastHudAt = 0;
  private destroyed = false;

  public constructor(socket: Socket, options: GameSessionOptions) {
    this.socket = socket;
    this.options = options;
  }

  public start() {
    this.socket.on("map", this.handleMap);
    this.socket.on("block", this.handleBlock);
    this.socket.on("players", this.handlePlayers);
    this.socket.on("coins", this.handleCoins);
    this.socket.on("playerJoin", this.handlePlayerJoin);
    this.socket.on("playerLeave", this.handlePlayerLeave);
    this.socket.on("playCoinSound", this.handleCoinSound);
    this.socket.on("playVictorySound", this.handleVictory);
    this.socket.on("playDefeatSound", this.handleDefeat);

    this.heartbeat = setInterval(() => {
      if (!this.destroyed && this.socket.connected) {
        this.socket.emit("controls", { ...this.controls });
      }
    }, SNAPSHOT_HEARTBEAT_MS);

    this.socket.emit("ready", () => undefined);
  }

  public destroy() {
    this.destroyed = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.socket.off("map", this.handleMap);
    this.socket.off("block", this.handleBlock);
    this.socket.off("players", this.handlePlayers);
    this.socket.off("coins", this.handleCoins);
    this.socket.off("playerJoin", this.handlePlayerJoin);
    this.socket.off("playerLeave", this.handlePlayerLeave);
    this.socket.off("playCoinSound", this.handleCoinSound);
    this.socket.off("playVictorySound", this.handleVictory);
    this.socket.off("playDefeatSound", this.handleDefeat);
  }

  public setControl(key: keyof ControlsInterface, value: boolean) {
    if (this.controls[key] === value) return;
    this.controls[key] = value;
    if (this.socket.connected)
      this.socket.emit("controls", { ...this.controls });
  }

  public getControls() {
    return { ...this.controls };
  }

  public getMap() {
    return this.map;
  }

  public getCoins() {
    return this.coins;
  }

  public getBlock() {
    return this.block;
  }

  public getSnapshot(): GameSnapshot {
    return {
      players: this.targetPlayers,
      coins: this.coins,
      serverTime: this.lastSnapshotAt,
    };
  }

  public getInterpolatedPlayers(now = performance.now()) {
    const elapsed = Math.max(0, now - this.lastSnapshotAt);
    const alpha = Math.min(1, elapsed / Math.max(1, this.snapshotInterval));
    const previousById = new Map(
      this.previousPlayers.map((player) => [player.id, player])
    );

    return this.targetPlayers.map((target) => {
      const previous = previousById.get(target.id);
      if (!previous) return { ...target };
      return {
        ...target,
        x: previous.x + (target.x - previous.x) * alpha,
        y: previous.y + (target.y - previous.y) * alpha,
      };
    });
  }

  private emitHud(now = performance.now()) {
    if (now - this.lastHudAt < 90) return;
    this.lastHudAt = now;
    const localPlayer = this.targetPlayers.find(
      (player) => player.id === this.socket.id
    );
    this.options.onHudChange({
      players: clonePlayers(this.targetPlayers),
      currentPlayer: localPlayer ? { ...localPlayer } : undefined,
      coins: this.coins.length,
      connection: this.socket.connected ? "connected" : "reconnecting",
    });
  }

  private handleMap = (serverMap: number[][]) => {
    this.map = serverMap;
  };

  private handleBlock = (serverBlock: number) => {
    this.block = serverBlock;
  };

  private handlePlayers = (serverPlayers: Player[]) => {
    const now = performance.now();
    this.previousPlayers = this.targetPlayers;
    this.targetPlayers = clonePlayers(serverPlayers);
    this.snapshotInterval = Math.min(
      100,
      Math.max(35, now - this.lastSnapshotAt)
    );
    this.lastSnapshotAt = now;
    this.emitHud(now);
  };

  private handleCoins = (serverCoins: Coin[]) => {
    this.coins = cloneCoins(serverCoins);
    this.emitHud();
  };

  private handlePlayerJoin = (player: string) => {
    this.options.onToast(`${player} joined the match`, "info");
  };

  private handlePlayerLeave = (player: string) => {
    this.options.onToast(`${player} left the match`, "warning");
  };

  private handleCoinSound = () => {
    this.options.onSound("coin");
  };

  private handleVictory = (name: string) => {
    this.options.onToast(`${name} won the round`, "success");
    this.options.onSound("victory");
  };

  private handleDefeat = (name: string) => {
    this.options.onToast(`${name} won the round`, "warning");
    this.options.onSound("defeat");
  };
}

export { emptyControls };
