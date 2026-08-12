import type { NextApiRequest, NextApiResponse } from "next";
import { Server as ServerIO, Socket } from "socket.io";
import { Server as NetServer } from "http";
import type { Coin, ControlsInterface, Player } from "../../global/types/gameTypes";
import { randomMap } from "../../maps/maps";
import {
  TILE_SIZE,
  PLAYER_SIZE,
  COIN_SIZE,
  END_GAME_SCORE,
  TICK_RATE,
  MAX_PLAYER_JUMPS,
} from "../../global/constants";
import { GameMode } from "../../global/types/gameEnums";

const GRAVITY = 0.0218;
const PLAYER_SPEED = 8;
const SPRINT_MULTIPLIER = 1.3;
const COIN_SPAWN_RATE = 700;
const MAX_COINS = 25;
const JUMP_SPEED = -11;
const MAX_DELTA_MS = 100;

type NextApiResponseWithIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & { io?: ServerIO };
  };
};

const sanitizeName = (value: unknown) => {
  const name = Array.isArray(value) ? value[0] : value;
  if (typeof name !== "string") return "Player";
  const trimmed = name.trim().slice(0, 20);
  return trimmed || "Player";
};

const sanitizeColour = (value: unknown) => {
  const colour = Array.isArray(value) ? value[0] : value;
  return typeof colour === "string" && /^#[0-9a-fA-F]{6}$/.test(colour)
    ? colour
    : `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithIO) => {
  if (res.socket.server.io) {
    res.status(200).end();
    return;
  }

  const io = new ServerIO(res.socket.server, {
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e5,
  });
  res.socket.server.io = io;

  let map: number[][] = [];
  let block = 1;
  let coins: Coin[] = [];
  let players: Player[] = [];
  let collidables: Array<{ x: number; y: number }> = [];
  let intervals: ReturnType<typeof setInterval>[] = [];
  let lastUpdate = Date.now();

  const playerSocketMap = new Map<string, Socket>();
  const controlsMap = new Map<string, ControlsInterface>();

  const stopIntervals = () => {
    intervals.forEach(clearInterval);
    intervals = [];
  };

  const sendGameData = (socket: Socket) => {
    socket.emit("block", block);
    socket.emit("map", map);
    socket.emit("players", players);
    socket.emit("coins", coins);
  };

  const rebuildCollidables = () => {
    collidables = [];
    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        if (map[row][col] !== 0) {
          collidables.push({ x: col * TILE_SIZE, y: row * TILE_SIZE });
        }
      }
    }
  };

  const overlaps = (x1: number, y1: number, size1: number, x2: number, y2: number, size2: number) =>
    x1 < x2 + size2 && x1 + size1 > x2 && y1 < y2 + size2 && y1 + size1 > y2;

  const collidesWithMap = (player: Player) => {
    for (const tile of collidables) {
      if (overlaps(player.x, player.y, PLAYER_SIZE, tile.x, tile.y, TILE_SIZE)) return true;
    }
    return false;
  };

  const resetGame = () => {
    players.forEach((player) => {
      player.score = 0;
      player.x = 100;
      player.y = 100;
      player.vx = 0;
      player.vy = 0;
      player.jumps = 0;
      player.isJumping = false;
    });

    coins = [];
    map = randomMap();
    block = Math.floor(Math.random() * 4) + 1;
    rebuildCollidables();

    playerSocketMap.forEach(sendGameData);
  };

  const spawnCoin = () => {
    if (coins.length >= MAX_COINS || !map.length) return;

    for (let attempt = 0; attempt < 8; attempt++) {
      const row = Math.floor(Math.random() * map.length);
      const col = Math.floor(Math.random() * map[row].length);
      if (map[row][col] !== 0) continue;

      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      if (coins.some((coin) => coin.x === x && coin.y === y)) continue;
      coins.push({ x, y });
      return;
    }
  };

  const finishRound = (winner: Player) => {
    playerSocketMap.forEach((socket, id) => {
      if (id === winner.id) socket.emit("playVictorySound", "You are");
      else socket.emit("playDefeatSound", `${winner.name} is`);
    });
    startNewGame();
  };

  const tick = (deltaMs: number) => {
    if (!players.length) return;
    const delta = Math.min(deltaMs, MAX_DELTA_MS);

    for (const player of players) {
      const controls = controlsMap.get(player.id);
      if (!controls) continue;

      if (controls.respawn) {
        player.x = 100;
        player.y = 100;
        player.vy = 0;
        player.jumps = 0;
        player.isJumping = false;
      }

      const horizontalSpeed = controls.sprint
        ? PLAYER_SPEED * SPRINT_MULTIPLIER
        : PLAYER_SPEED;

      if (controls.right) {
        player.x += horizontalSpeed;
        if (collidesWithMap(player)) player.x -= horizontalSpeed;
      } else if (controls.left) {
        player.x -= horizontalSpeed;
        if (collidesWithMap(player)) player.x += horizontalSpeed;
      }

      player.vy += (controls.down ? GRAVITY * 4 : GRAVITY) * delta;
      player.y += player.vy;

      if (collidesWithMap(player)) {
        if (player.vy > 0) player.jumps = 0;
        player.y -= player.vy;
        player.vy = 0;
      }

      if (controls.jump && player.jumps < MAX_PLAYER_JUMPS && !player.isJumping) {
        player.isJumping = true;
        player.jumps += 1;
        player.vy = JUMP_SPEED;
      } else if (!controls.jump) {
        player.isJumping = false;
      }

      if (player.y > map.length * TILE_SIZE * 2) {
        player.x = 100;
        player.y = 100;
        player.vy = 0;
        player.jumps = 0;
      }

      for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (!overlaps(coin.x, coin.y, COIN_SIZE, player.x, player.y, PLAYER_SIZE)) continue;

        coins.splice(i, 1);
        player.score += 1;
        playerSocketMap.get(player.id)?.emit("playCoinSound");

        if (player.score >= END_GAME_SCORE) {
          finishRound(player);
          return;
        }
      }
    }

    io.volatile.emit("players", players);
    io.volatile.emit("coins", coins);
  };

  const startNewGame = () => {
    stopIntervals();
    if (!players.length) return;

    const game = GameMode.CollectTheCoins;
    console.log("Starting New Game:", GameMode[game]);
    resetGame();

    lastUpdate = Date.now();
    intervals.push(
      setInterval(() => {
        const now = Date.now();
        tick(now - lastUpdate);
        lastUpdate = now;
      }, 1000 / TICK_RATE)
    );
    intervals.push(setInterval(spawnCoin, COIN_SPAWN_RATE));
  };

  const pingPlayers = () => {
    const startedAt = Date.now();
    playerSocketMap.forEach((socket, id) => {
      socket.emit("ping", () => {
        const player = players.find((item) => item.id === id);
        if (player) player.ping = Date.now() - startedAt;
      });
    });
  };

  const pingInterval = setInterval(pingPlayers, 5000);

  io.on("connection", (socket) => {
    const player: Player = {
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      score: 0,
      name: sanitizeName(socket.handshake.query.name),
      id: socket.id,
      colour: sanitizeColour(socket.handshake.query.colour),
      jumps: 0,
      isJumping: false,
      ping: 0,
    };

    playerSocketMap.set(socket.id, socket);
    players.push(player);
    controlsMap.set(socket.id, {
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      respawn: false,
      sprint: false,
    });

    playerSocketMap.forEach((otherSocket, id) => {
      if (id !== player.id) otherSocket.emit("playerJoin", player.name);
    });

    socket.on("controls", (input: Partial<ControlsInterface>) => {
      if (!input || typeof input !== "object") return;
      controlsMap.set(socket.id, {
        up: Boolean(input.up),
        down: Boolean(input.down),
        left: Boolean(input.left),
        right: Boolean(input.right),
        jump: Boolean(input.jump),
        respawn: Boolean(input.respawn),
        sprint: Boolean(input.sprint),
      });
    });

    socket.on("ready", (callback: unknown) => {
      sendGameData(socket);
      if (typeof callback === "function") callback();
    });

    socket.on("disconnect", () => {
      const index = players.findIndex((item) => item.id === socket.id);
      const name = index >= 0 ? players[index].name : "Player";

      players = players.filter((item) => item.id !== socket.id);
      playerSocketMap.delete(socket.id);
      controlsMap.delete(socket.id);

      playerSocketMap.forEach((otherSocket) => otherSocket.emit("playerLeave", name));

      if (!players.length) stopIntervals();
    });

    if (players.length === 1) startNewGame();
    else sendGameData(socket);
  });

  req;
  clearInterval(pingInterval);
  res.status(200).end();
};

export default SocketHandler;
