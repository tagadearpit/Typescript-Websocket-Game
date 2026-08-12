import type { NextApiRequest } from "next";
import { Server as ServerIO, Socket } from "socket.io";
import { Server as NetServer } from "http";
import { NextApiResponseServerIO } from "../../global/types/next";
import type {
  Coin,
  ControlsInterface,
  Player,
  Rect,
} from "../../global/types/gameTypes";
import { randomMap } from "../../maps/maps";
import {
  COIN_SIZE,
  END_GAME_SCORE,
  MAX_PLAYER_JUMPS,
  PLAYER_SIZE,
  SNAPSHOT_RATE,
  TICK_RATE,
  TILE_SIZE,
} from "../../global/constants";

const random = require("random-name");

const DEFAULT_CONTROLS: ControlsInterface = {
  up: false,
  down: false,
  left: false,
  right: false,
  jump: false,
  respawn: false,
  sprint: false,
};

const SocketHandler = (_req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io: ServerIO = new ServerIO(res.socket.server as unknown as NetServer, {
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 8000,
    maxHttpBufferSize: 10000,
  });
  res.socket.server.io = io;

  const GRAVITY = 0.0218;
  const PLAYER_SPEED = 8;
  const SPRINT_MULTIPLIER = 1.3;
  const COIN_SPAWN_RATE = 700;
  const MAX_COINS = 18;
  const JUMP_SPEED = -11;
  const MAX_SIMULATION_DELTA = 50;
  const MIN_SIMULATION_DELTA = 8;

  let map: number[][] = [];
  let block = 1;
  let coins: Coin[] = [];
  let players: Player[] = [];
  let freeCells: Coin[] = [];
  let collisionGrid: boolean[][] = [];
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let coinTimer: ReturnType<typeof setInterval> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let roundResetting = false;
  let lastUpdate = Date.now();
  let snapshotAccumulator = 0;

  const socketMap = new Map<string, Socket>();
  const controlsMap = new Map<string, ControlsInterface>();
  const playerSocketMap = new Map<string, Player>();

  const getPlayerBoundingBox = (player: Player): Rect => ({
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    x: player.x,
    y: player.y,
  });

  const getCoinBoundingBox = (coin: Coin): Rect => ({
    width: COIN_SIZE,
    height: COIN_SIZE,
    x: coin.x,
    y: coin.y,
  });

  const isOverlap = (rect1: Rect, rect2: Rect) =>
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y;

  const rebuildWorldCache = () => {
    collisionGrid = map.map((row) => row.map((cell) => cell !== 0));
    freeCells = [];
    for (let row = 0; row < map.length; row += 1) {
      for (let column = 0; column < map[row].length; column += 1) {
        if (!collisionGrid[row][column])
          freeCells.push({ x: column * TILE_SIZE, y: row * TILE_SIZE });
      }
    }
  };

  const isCollidingWithMap = (player: Player) => {
    if (!collisionGrid.length) return false;
    const left = Math.max(0, Math.floor(player.x / TILE_SIZE));
    const right = Math.min(
      collisionGrid[0].length - 1,
      Math.floor((player.x + PLAYER_SIZE - 0.001) / TILE_SIZE)
    );
    const top = Math.max(0, Math.floor(player.y / TILE_SIZE));
    const bottom = Math.min(
      collisionGrid.length - 1,
      Math.floor((player.y + PLAYER_SIZE - 0.001) / TILE_SIZE)
    );
    for (let row = top; row <= bottom; row += 1) {
      for (let column = left; column <= right; column += 1) {
        if (collisionGrid[row]?.[column]) return true;
      }
    }
    return false;
  };

  const emitWorld = (socket: Socket) => {
    socket.emit("block", block);
    socket.emit("map", map);
    socket.emit("players", players);
    socket.emit("coins", coins);
  };

  const emitSnapshot = () => {
    if (!players.length) return;
    io.emit("players", players);
    io.emit("coins", coins);
  };

  const ping = () => {
    socketMap.forEach((socket, id) => {
      const startedAt = Date.now();
      socket.emit("ping", () => {
        const player = playerSocketMap.get(id);
        if (player) player.ping = Date.now() - startedAt;
      });
    });
  };

  const spawnCoin = () => {
    if (coins.length >= MAX_COINS || !freeCells.length) return;
    const existing = new Set(coins.map((coin) => `${coin.x}:${coin.y}`));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const cell = freeCells[Math.floor(Math.random() * freeCells.length)];
      const key = `${cell.x}:${cell.y}`;
      if (!existing.has(key)) {
        coins.push({ ...cell });
        return;
      }
    }
  };

  const resetPlayer = (player: Player) => {
    player.score = 0;
    player.x = 384;
    player.y = 96;
    player.vx = 0;
    player.vy = 0;
    player.jumps = 0;
    player.isJumping = false;
  };

  const resetGame = () => {
    map = randomMap();
    block = Math.floor(Math.random() * 4) + 1;
    rebuildWorldCache();
    coins = [];
    players.forEach(resetPlayer);
    socketMap.forEach(emitWorld);
  };

  const stopLoops = () => {
    if (tickTimer) clearInterval(tickTimer);
    if (coinTimer) clearInterval(coinTimer);
    if (pingTimer) clearInterval(pingTimer);
    tickTimer = null;
    coinTimer = null;
    pingTimer = null;
  };

  const startNewGame = () => {
    stopLoops();
    roundResetting = false;
    resetGame();
    lastUpdate = Date.now();
    snapshotAccumulator = 0;
    tickTimer = setInterval(() => {
      const now = Date.now();
      const delta = Math.min(
        MAX_SIMULATION_DELTA,
        Math.max(MIN_SIMULATION_DELTA, now - lastUpdate)
      );
      lastUpdate = now;
      tick(delta);
    }, 1000 / TICK_RATE);
    coinTimer = setInterval(spawnCoin, COIN_SPAWN_RATE);
    pingTimer = setInterval(ping, 5000);
  };

  const endRound = (winner: Player) => {
    if (roundResetting) return;
    roundResetting = true;
    socketMap.forEach((socket, id) => {
      socket.emit(
        id === winner.id ? "playVictorySound" : "playDefeatSound",
        id === winner.id ? "You are" : `${winner.name} is`
      );
    });
    startNewGame();
  };

  const tick = (delta: number) => {
    for (const player of players) {
      const playerControls = controlsMap.get(player.id) ?? DEFAULT_CONTROLS;
      for (let index = coins.length - 1; index >= 0; index -= 1) {
        const coin = coins[index];
        if (!isOverlap(getCoinBoundingBox(coin), getPlayerBoundingBox(player)))
          continue;
        player.score += 1;
        coins.splice(index, 1);
        socketMap.get(player.id)?.emit("playCoinSound");
        if (player.score >= END_GAME_SCORE) {
          endRound(player);
          return;
        }
      }

      if (playerControls.respawn) {
        player.x = 100;
        player.y = 100;
        player.vy = 0;
      }

      const horizontalSpeed = playerControls.sprint
        ? PLAYER_SPEED * SPRINT_MULTIPLIER
        : PLAYER_SPEED;
      if (playerControls.right) {
        player.x += horizontalSpeed;
        if (isCollidingWithMap(player)) player.x -= horizontalSpeed;
      } else if (playerControls.left) {
        player.x -= horizontalSpeed;
        if (isCollidingWithMap(player)) player.x += horizontalSpeed;
      }

      player.vy += playerControls.down ? GRAVITY * delta * 4 : GRAVITY * delta;
      player.y += player.vy;
      if (isCollidingWithMap(player)) {
        if (player.vy > 0) player.jumps = 0;
        player.y -= player.vy;
        player.vy = 0;
      }

      if (
        playerControls.jump &&
        player.jumps < MAX_PLAYER_JUMPS &&
        !player.isJumping
      ) {
        player.isJumping = true;
        player.jumps += 1;
        player.vy = JUMP_SPEED;
      } else if (!playerControls.jump && player.isJumping) {
        player.isJumping = false;
      }

      if (player.y > map.length * TILE_SIZE * 2) resetPlayer(player);
    }

    snapshotAccumulator += delta;
    if (snapshotAccumulator >= 1000 / SNAPSHOT_RATE) {
      snapshotAccumulator = 0;
      emitSnapshot();
    }
  };

  io.on("connection", (socket: Socket) => {
    if (!players.length) startNewGame();

    const playerName =
      socket.handshake.query.name?.toString().slice(0, 18) || random.first();
    const playerColour = socket.handshake.query.colour
      ?.toString()
      .match(/^#[0-9a-f]{6}$/i)
      ? socket.handshake.query.colour.toString()
      : `#${Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0")}`;
    const player: Player = {
      x: 384,
      y: 96,
      vx: 0,
      vy: 0,
      score: 0,
      name: playerName,
      id: socket.id,
      colour: playerColour,
      jumps: 0,
      isJumping: false,
      ping: 0,
    };

    playerSocketMap.set(socket.id, player);
    socketMap.set(socket.id, socket);
    controlsMap.set(socket.id, { ...DEFAULT_CONTROLS });
    players.push(player);

    socketMap.forEach((otherSocket, otherId) => {
      if (otherId !== socket.id) otherSocket.emit("playerJoin", player.name);
    });

    socket.on("disconnect", () => {
      socketMap.forEach((otherSocket, otherId) => {
        if (otherId !== socket.id) otherSocket.emit("playerLeave", player.name);
      });
      playerSocketMap.delete(socket.id);
      socketMap.delete(socket.id);
      controlsMap.delete(socket.id);
      players = players.filter((item) => item.id !== socket.id);
      if (!players.length) stopLoops();
      else emitSnapshot();
    });

    socket.on("controls", (incoming: ControlsInterface) => {
      const safeControls: ControlsInterface = { ...DEFAULT_CONTROLS };
      (Object.keys(DEFAULT_CONTROLS) as Array<keyof ControlsInterface>).forEach(
        (key) => {
          safeControls[key] = Boolean(incoming?.[key]);
        }
      );
      controlsMap.set(socket.id, safeControls);
    });

    socket.on("ready", (callback?: () => void) => {
      emitWorld(socket);
      callback?.();
    });
  });

  res.end();
};

export default SocketHandler;
