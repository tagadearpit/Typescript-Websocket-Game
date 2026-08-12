// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest } from "next";
import { Server as ServerIO, Socket } from "socket.io";
import { Server as NetServer } from "http";
import { NextApiResponseServerIO } from "../../global/types/next";
import {
  Coin,
  Collidable,
  ControlsInterface,
  Player,
  Rect,
} from "../../global/types/gameTypes";
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
const random = require("random-name");

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("New Socket Server initializing...");

    const GRAVITY = 0.0218;
    const PLAYER_SPEED = 8.0;
    const SPRINT_MULTIPLIER = 1.3;
    const COIN_SPAWN_RATE = 700;
    const MAX_COINS = 25;
    const JUMP_SPEED = -11;

    let map: number[][] = [];
    let block = 1;
    let coins: Coin[] = [];
    let players: Player[] = [];
    const playerSocketMap: Map<string, Player> = new Map();
    const socketMap: Map<string, Socket> = new Map();
    const controlsMap: Map<string, ControlsInterface> = new Map();

    const httpServer: NetServer = res.socket.server as unknown as NetServer;
    const io: ServerIO = new ServerIO(httpServer);
    res.socket.server.io = io;

    const sendGameData = (socket: Socket) => {
      socket.emit("block", block);
      socket.emit("map", map);
    };

    const ping = () => {
      socketMap.forEach((value, key) => {
        const start = Date.now();
        value.emit("ping", () => {
          const player = playerSocketMap.get(key);
          if (player) player.ping = Date.now() - start;
        });
      });
    };

    const getPlayerBoundingBox = (entity: Player): Rect => ({
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      x: entity.x,
      y: entity.y,
    });

    const getTileBoundingBox = (entity: Collidable): Rect => ({
      width: TILE_SIZE,
      height: TILE_SIZE,
      x: entity.x,
      y: entity.y,
    });

    const getCoinBoundingBox = (entity: Coin): Rect => ({
      width: COIN_SIZE,
      height: COIN_SIZE,
      x: entity.x,
      y: entity.y,
    });

    const isOverlap = (rect1: Rect, rect2: Rect) =>
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y;

    const collidables = (): Collidable[] => {
      const collisions: Collidable[] = [];
      for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
          if (map[row][col] !== 0) {
            collisions.push({ y: row * TILE_SIZE, x: col * TILE_SIZE });
          }
        }
      }
      return collisions;
    };

    const isCollidingWithMap = (player: Player) =>
      collidables().some((collidable) =>
        isOverlap(getPlayerBoundingBox(player), getTileBoundingBox(collidable))
      );

    const resetGame = () => {
      for (const player of players) {
        player.score = 0;
        player.x = 100;
        player.y = 100;
        player.vx = 0;
        player.vy = 0;
        player.jumps = 0;
        player.isJumping = false;
      }
      coins = [];
      map = randomMap();
      block = Math.floor(Math.random() * 4) + 1;
      socketMap.forEach(sendGameData);
    };

    const spawnCoin = () => {
      if (coins.length >= MAX_COINS || !map.length || !map[0]?.length) return;
      const randomRow = Math.floor(Math.random() * map.length);
      const randomCol = Math.floor(Math.random() * map[0].length);
      if (map[randomRow][randomCol] !== 0) return;
      coins.push({ x: randomCol * TILE_SIZE, y: randomRow * TILE_SIZE });
    };

    let intervals: ReturnType<typeof setInterval>[] = [];
    let lastUpdate = Date.now();

    const endGameLobby = () => {
      console.log("No Players left, ending game lobby");
      intervals.forEach(clearInterval);
      intervals = [];
    };

    const startNewGame = () => {
      intervals.forEach(clearInterval);
      intervals = [];

      const game: GameMode = GameMode.CollectTheCoins;
      console.log("Starting New Game:", GameMode[game]);
      resetGame();

      intervals.push(
        setInterval(() => {
          const now = Date.now();
          tick(now - lastUpdate);
          lastUpdate = now;
        }, 1000 / TICK_RATE)
      );
      intervals.push(setInterval(spawnCoin, COIN_SPAWN_RATE));
    };

    const tick = (delta: number) => {
      for (const player of players) {
        const playerControls = controlsMap.get(player.id);

        for (let i = coins.length - 1; i >= 0; i--) {
          const coin = coins[i];
          if (
            isOverlap(getCoinBoundingBox(coin), getPlayerBoundingBox(player))
          ) {
            player.score++;
            coins.splice(i, 1);
            if (player.score >= END_GAME_SCORE) {
              socketMap.forEach((value, key) => {
                value.emit(
                  key === player.id ? "playVictorySound" : "playDefeatSound",
                  key === player.id ? "You are" : `${player.name} is`
                );
              });
              startNewGame();
              return;
            }
            socketMap.get(player.id)?.emit("playCoinSound");
          }
        }

        if (!playerControls) continue;

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

        player.vy += playerControls.down
          ? GRAVITY * delta * 4
          : GRAVITY * delta;
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
          player.jumps++;
          player.vy = JUMP_SPEED;
        } else if (!playerControls.jump && player.isJumping) {
          player.isJumping = false;
        }

        if (player.y > map.length * TILE_SIZE * 2) {
          player.x = 100;
          player.y = 100;
          player.vy = 0;
        }
      }

      io.emit("players", players);
      io.emit("coins", coins);
    };

    io.on("connection", (socket: Socket) => {
      if (!players.length) startNewGame();

      const playerName = socket.handshake.query.name?.toString() || random.first();
      const playerColour =
        socket.handshake.query.colour?.toString() ||
        `#${Math.floor(Math.random() * 0xffffff + 1).toString(16)}`;

      const player: Player = {
        x: 100,
        y: 100,
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

      socketMap.forEach((value, key) => {
        if (key !== player.id) value.emit("playerJoin", player.name);
      });

      playerSocketMap.set(socket.id, player);
      socketMap.set(socket.id, socket);
      players.push(player);

      socket.on("disconnect", () => {
        console.log(`${player.name} disconnected`);
        playerSocketMap.delete(socket.id);
        socketMap.delete(socket.id);
        controlsMap.delete(socket.id);
        socketMap.forEach((value, key) => {
          if (key !== player.id) value.emit("playerLeave", player.name);
        });
        players = players.filter((item) => item.id !== socket.id);
        if (!players.length) endGameLobby();
      });

      socket.on("controls", (controls: ControlsInterface) => {
        controlsMap.set(socket.id, controls);
      });

      socket.on("ready", (callback: () => void) => {
        sendGameData(socket);
        callback();
      });
    });

    const pingInterval = setInterval(ping, 5000);
    intervals.push(pingInterval);
  }

  res.end();
};

export default SocketHandler;
