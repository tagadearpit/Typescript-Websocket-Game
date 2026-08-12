import {
  COIN_PULSE_SPEED,
  COIN_SIZE,
  MAX_RENDER_PIXEL_RATIO,
  PLAYER_SIZE,
  TILE_SIZE,
} from "../global/constants";
import type { Coin, Player } from "../global/types/gameTypes";

interface LoadedAssets {
  platform: HTMLImageElement | null;
  coin: HTMLImageElement | null;
  player: HTMLImageElement | null;
}

export interface RenderFrame {
  map: number[][];
  coins: Coin[];
  players: Player[];
  localId?: string;
  time: number;
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private assets: LoadedAssets = { platform: null, coin: null, player: null };
  private viewportWidth = 1;
  private viewportHeight = 1;
  private cameraX = 0;
  private cameraY = 0;
  private readonly stars = Array.from({ length: 52 }, (_, index) => ({
    x: (index * 197) % 1600,
    y: (index * 83) % 1000,
    radius: 0.7 + ((index * 13) % 8) / 10,
    alpha: 0.2 + ((index * 17) % 7) / 10,
  }));

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    this.context = context;
    this.context.imageSmoothingEnabled = false;
    this.resize(window.innerWidth, window.innerHeight);
  }

  public async loadAssets(onProgress?: (progress: number) => void) {
    const assetEntries: Array<[keyof LoadedAssets, string]> = [
      ["platform", "/img/neon-platform.png"],
      ["coin", "/img/neon-coin.png"],
      ["player", "/img/neon-player.png"],
    ];
    let completed = 0;

    await Promise.all(
      assetEntries.map(async ([key, source]) => {
        const image = new Image();
        image.decoding = "async";
        image.src = source;
        try {
          await image.decode();
          this.assets[key] = image;
        } catch {
          this.assets[key] = null;
        } finally {
          completed += 1;
          onProgress?.(completed / assetEntries.length);
        }
      })
    );
  }

  public resize(width: number, height: number) {
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      MAX_RENDER_PIXEL_RATIO
    );
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.canvas.width = Math.floor(this.viewportWidth * ratio);
    this.canvas.height = Math.floor(this.viewportHeight * ratio);
    this.canvas.style.width = `${this.viewportWidth}px`;
    this.canvas.style.height = `${this.viewportHeight}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.context.imageSmoothingEnabled = false;
  }

  public draw(frame: RenderFrame) {
    const context = this.context;
    const { map, players, coins, localId, time } = frame;
    context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.drawBackground(time);

    const localPlayer = players.find((player) => player.id === localId);
    const mapWidth = (map[0]?.length ?? 24) * TILE_SIZE;
    const mapHeight = map.length * TILE_SIZE;
    const focusX = localPlayer ? localPlayer.x + PLAYER_SIZE / 2 : mapWidth / 2;
    const focusY = localPlayer
      ? localPlayer.y + PLAYER_SIZE / 2
      : mapHeight / 2;
    this.cameraX = this.clamp(
      focusX - this.viewportWidth / 2,
      0,
      Math.max(0, mapWidth - this.viewportWidth)
    );
    this.cameraY = this.clamp(
      focusY - this.viewportHeight / 2 + 48,
      0,
      Math.max(0, mapHeight - this.viewportHeight)
    );

    this.drawArena(map, time);
    this.drawCoins(coins, time);
    for (const player of players)
      this.drawPlayer(player, player.id === localId, time);
    this.drawVignette();
  }

  private drawBackground(time: number) {
    const context = this.context;
    const gradient = context.createLinearGradient(0, 0, 0, this.viewportHeight);
    gradient.addColorStop(0, "#070b2d");
    gradient.addColorStop(0.52, "#11134a");
    gradient.addColorStop(1, "#03051c");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    context.save();
    for (const star of this.stars) {
      const x =
        (star.x - this.cameraX * 0.08) % Math.max(this.viewportWidth, 1600);
      const y =
        (star.y - this.cameraY * 0.03) % Math.max(this.viewportHeight, 1000);
      const pulse = 0.7 + Math.sin(time * 0.002 + star.x) * 0.25;
      context.globalAlpha = Math.max(0.1, star.alpha * pulse);
      context.fillStyle = star.x % 3 === 0 ? "#50e8ff" : "#a58bff";
      context.beginPath();
      context.arc(
        x < 0 ? x + this.viewportWidth : x,
        y < 0 ? y + this.viewportHeight : y,
        star.radius,
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.restore();
  }

  private drawArena(map: number[][], time: number) {
    const context = this.context;
    const startRow = Math.max(0, Math.floor(this.cameraY / TILE_SIZE) - 1);
    const endRow = Math.min(
      map.length,
      Math.ceil((this.cameraY + this.viewportHeight) / TILE_SIZE) + 1
    );
    const startColumn = Math.max(0, Math.floor(this.cameraX / TILE_SIZE) - 1);
    const endColumn = Math.min(
      map[0]?.length ?? 0,
      Math.ceil((this.cameraX + this.viewportWidth) / TILE_SIZE) + 1
    );
    const shimmer = 0.65 + Math.sin(time * 0.002) * 0.1;

    for (let row = startRow; row < endRow; row += 1) {
      const rowData = map[row];
      for (let column = startColumn; column < endColumn; column += 1) {
        if (rowData[column] === 0) continue;
        const x = column * TILE_SIZE - this.cameraX;
        const y = row * TILE_SIZE - this.cameraY;
        if (this.assets.platform) {
          context.drawImage(this.assets.platform, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          context.fillStyle = "#171b58";
          context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          context.fillStyle = `rgba(72, 220, 255, ${shimmer})`;
          context.fillRect(x, y, TILE_SIZE, 3);
          context.strokeStyle = "#4c43a8";
          context.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
      }
    }
  }

  private drawCoins(coins: Coin[], time: number) {
    const context = this.context;
    const pulse = 1 + Math.sin(time * COIN_PULSE_SPEED) * 0.08;
    for (const coin of coins) {
      const centerX = coin.x + TILE_SIZE / 2 - this.cameraX;
      const centerY = coin.y + TILE_SIZE / 2 - this.cameraY;
      if (
        centerX < -COIN_SIZE ||
        centerX > this.viewportWidth + COIN_SIZE ||
        centerY < -COIN_SIZE ||
        centerY > this.viewportHeight + COIN_SIZE
      )
        continue;
      context.save();
      context.globalAlpha = 0.26;
      context.fillStyle = "#ffc531";
      context.beginPath();
      context.arc(centerX, centerY, COIN_SIZE * 0.9 * pulse, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      if (this.assets.coin) {
        const size = COIN_SIZE * 2 * pulse;
        context.drawImage(
          this.assets.coin,
          centerX - size / 2,
          centerY - size / 2,
          size,
          size
        );
      } else {
        context.strokeStyle = "#ffd35c";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(centerX, centerY, COIN_SIZE * 0.58 * pulse, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    }
  }

  private drawPlayer(player: Player, isLocal: boolean, time: number) {
    const context = this.context;
    const x = player.x - this.cameraX;
    const y = player.y - this.cameraY;
    const size = 30;
    if (
      x < -size ||
      x > this.viewportWidth + size ||
      y < -size ||
      y > this.viewportHeight + size
    )
      return;

    context.save();
    context.globalAlpha = isLocal ? 0.2 : 0.12;
    context.fillStyle = player.colour;
    context.beginPath();
    context.arc(
      x + PLAYER_SIZE / 2,
      y + PLAYER_SIZE / 2,
      size * 0.78 + Math.sin(time * 0.004 + player.x) * 2,
      0,
      Math.PI * 2
    );
    context.fill();
    context.globalAlpha = 1;

    const spriteX = x + PLAYER_SIZE / 2 - size / 2;
    const spriteY = y + PLAYER_SIZE / 2 - size / 2;
    if (this.assets.player) {
      context.drawImage(this.assets.player, spriteX, spriteY, size, size);
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = player.colour;
      context.globalAlpha = 0.82;
      context.fillRect(spriteX, spriteY, size, size);
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
    } else {
      context.fillStyle = player.colour;
      context.fillRect(x, y, PLAYER_SIZE, PLAYER_SIZE);
      context.strokeStyle = "#ffffff";
      context.lineWidth = isLocal ? 2 : 1;
      context.strokeRect(x, y, PLAYER_SIZE, PLAYER_SIZE);
    }

    if (isLocal) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.strokeRect(spriteX - 2, spriteY - 2, size + 4, size + 4);
    }

    context.font = "600 11px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    const label =
      player.name.length > 16 ? `${player.name.slice(0, 15)}…` : player.name;
    const labelWidth = context.measureText(label).width + 12;
    context.fillStyle = "rgba(4, 8, 36, 0.78)";
    context.fillRect(
      x + PLAYER_SIZE / 2 - labelWidth / 2,
      y - 24,
      labelWidth,
      16
    );
    context.fillStyle = "#f3f6ff";
    context.fillText(label, x + PLAYER_SIZE / 2, y - 11);
    context.restore();
  }

  private drawVignette() {
    const context = this.context;
    const gradient = context.createRadialGradient(
      this.viewportWidth / 2,
      this.viewportHeight / 2,
      Math.min(this.viewportWidth, this.viewportHeight) * 0.18,
      this.viewportWidth / 2,
      this.viewportHeight / 2,
      Math.max(this.viewportWidth, this.viewportHeight) * 0.78
    );
    gradient.addColorStop(0, "rgba(5, 8, 32, 0)");
    gradient.addColorStop(1, "rgba(1, 2, 16, 0.48)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }
}
