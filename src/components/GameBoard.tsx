import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ControlsInterface, Player } from "../global/types/gameTypes";
import { KeyMap } from "../global/types/gameEnums";
import { TILE_SIZE, COIN_SIZE, PLAYER_SIZE } from "../global/constants";
import Controls from "./Controls";
import Leaderboard from "./Leaderboard";
import LoadingScreen from "./LoadingScreen";
import MobileControls from "./MobileControls";
import resourceJson from "../resources/gameresources.json";
import { useSocket } from "./SocketContext";

interface GameBoardProps {
  setIsCustomized: Dispatch<SetStateAction<boolean>>;
}

const CONTROL_KEYS = new Set(["w", "a", "s", "d", " ", "r", "shift"]);
const NETWORK_UPDATE_MS = 50;

const GameBoard: React.FC<GameBoardProps> = ({ setIsCustomized }) => {
  const socket = useSocket();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const networkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const controlsRef = useRef<ControlsInterface>({
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    respawn: false,
    sprint: false,
  });
  const playersRef = useRef<Player[]>([]);
  const currentPlayerRef = useRef<Player>();
  const mapRef = useRef<number[][]>([]);
  const coinsRef = useRef<{ x: number; y: number }[]>([]);
  const blockRef = useRef<HTMLImageElement | null>(null);
  const coinImageRef = useRef<HTMLImageElement | null>(null);
  const worldDirtyRef = useRef(true);
  const roundTransitionRef = useRef(false);
  const viewportRef = useRef({ width: 0, height: 0, dpr: 1 });
  const lastFrameRef = useRef(0);

  const [connected, setConnected] = useState(socket.connected);
  const [loadScreenState, setLoadScreenState] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const audioRef = useRef({
    coin: typeof Audio !== "undefined" ? new Audio("/coin.wav") : null,
    music: typeof Audio !== "undefined" ? new Audio("/SonicIceCapRemixLoopable.mp3") : null,
    victory: typeof Audio !== "undefined" ? new Audio("/victory.wav") : null,
    defeat: typeof Audio !== "undefined" ? new Audio("/defeat.wav") : null,
  });

  const setControl = (key: string, active: boolean) => {
    const normalized = key.toLowerCase();
    switch (normalized) {
      case KeyMap.Down:
        controlsRef.current.down = active;
        break;
      case KeyMap.Left:
        controlsRef.current.left = active;
        break;
      case KeyMap.Right:
        controlsRef.current.right = active;
        break;
      case KeyMap.Jump:
        controlsRef.current.jump = active;
        break;
      case KeyMap.Respawn:
        controlsRef.current.respawn = active;
        break;
      case KeyMap.Sprint:
        controlsRef.current.sprint = active;
        break;
      default:
        break;
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1200);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    contextRef.current = context;

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewportRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!CONTROL_KEYS.has(key)) return;
      event.preventDefault();
      setControl(key, true);
      audioRef.current.music?.play().catch(() => undefined);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!CONTROL_KEYS.has(key)) return;
      event.preventDefault();
      setControl(key, false);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const images = [
      { src: resourceJson.blocks[0], target: coinImageRef },
      { src: resourceJson.blocks[1], target: blockRef },
    ];

    images.forEach(({ src, target }) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      image.onload = () => {
        target.current = image;
        worldDirtyRef.current = true;
      };
    });

    const audio = audioRef.current;
    if (audio.coin) audio.coin.volume = 0.05;
    if (audio.victory) audio.victory.volume = 0.1;
    if (audio.defeat) audio.defeat.volume = 0.1;
    if (audio.music) {
      audio.music.volume = 0.1;
      audio.music.loop = true;
    }
  }, []);

  useEffect(() => {
    const socketReady = () => {
      setConnected(true);
      socket.emit("ready", () => setLoadScreenState(false));
    };
    const socketDisconnected = () => setConnected(false);

    const onBlock = (block: number) => {
      const image = new Image();
      image.decoding = "async";
      image.src = resourceJson.blocks[Math.max(0, Math.min(block - 1, resourceJson.blocks.length - 1))];
      image.onload = () => {
        blockRef.current = image;
        worldDirtyRef.current = true;
      };
    };
    const onMap = (serverMap: number[][]) => {
      mapRef.current = serverMap;
      worldDirtyRef.current = true;
    };
    const onPlayers = (players: Player[]) => {
      playersRef.current = players;
      currentPlayerRef.current = players.find((player) => player.id === socket.id);
    };
    const onCoins = (coins: { x: number; y: number }[]) => {
      coinsRef.current = coins;
    };
    const onJoin = (name: string) => showToast(`Player ${name} joined`);
    const onLeave = (name: string) => showToast(`Player ${name} left`);
    const onCoinSound = () => {
      const audio = audioRef.current.coin;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
      }
    };
    const onVictory = (name: string) => {
      showToast(`${name} the winner!`);
      roundTransitionRef.current = true;
      setLoadScreenState(true);
      audioRef.current.victory?.play().catch(() => undefined);
      window.setTimeout(() => {
        roundTransitionRef.current = false;
        setLoadScreenState(false);
      }, 1200);
    };
    const onDefeat = (name: string) => {
      showToast(`${name} the winner!`);
      roundTransitionRef.current = true;
      setLoadScreenState(true);
      audioRef.current.defeat?.play().catch(() => undefined);
      window.setTimeout(() => {
        roundTransitionRef.current = false;
        setLoadScreenState(false);
      }, 1200);
    };

    socket.on("connect", socketReady);
    socket.on("disconnect", socketDisconnected);
    socket.on("block", onBlock);
    socket.on("map", onMap);
    socket.on("players", onPlayers);
    socket.on("coins", onCoins);
    socket.on("playerJoin", onJoin);
    socket.on("playerLeave", onLeave);
    socket.on("playCoinSound", onCoinSound);
    socket.on("playVictorySound", onVictory);
    socket.on("playDefeatSound", onDefeat);

    if (socket.connected) socketReady();

    networkTimerRef.current = setInterval(() => {
      if (socket.connected && !roundTransitionRef.current) {
        socket.emit("controls", controlsRef.current);
      }
    }, NETWORK_UPDATE_MS);

    return () => {
      socket.off("connect", socketReady);
      socket.off("disconnect", socketDisconnected);
      socket.off("block", onBlock);
      socket.off("map", onMap);
      socket.off("players", onPlayers);
      socket.off("coins", onCoins);
      socket.off("playerJoin", onJoin);
      socket.off("playerLeave", onLeave);
      socket.off("playCoinSound", onCoinSound);
      socket.off("playVictorySound", onVictory);
      socket.off("playDefeatSound", onDefeat);
      if (networkTimerRef.current) clearInterval(networkTimerRef.current);
    };
  }, [socket]);

  useEffect(() => {
    const worldCanvas = document.createElement("canvas");
    worldCanvasRef.current = worldCanvas;
    worldContextRef.current = worldCanvas.getContext("2d");
  }, []);

  const rebuildWorld = () => {
    const map = mapRef.current;
    const image = blockRef.current;
    const worldCanvas = worldCanvasRef.current;
    const worldContext = worldContextRef.current;
    if (!map.length || !image || !worldCanvas || !worldContext) return;

    const rows = map.length;
    const cols = Math.max(...map.map((row) => row.length));
    worldCanvas.width = cols * TILE_SIZE;
    worldCanvas.height = rows * TILE_SIZE;
    worldContext.fillStyle = "#7ca6e4";
    worldContext.fillRect(0, 0, worldCanvas.width, worldCanvas.height);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < map[row].length; col++) {
        if (map[row][col] !== 0) {
          worldContext.drawImage(image, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    worldDirtyRef.current = false;
  };

  useEffect(() => {
    let running = true;

    const render = (timestamp: number) => {
      if (!running) return;
      animationFrameRef.current = requestAnimationFrame(render);

      const context = contextRef.current;
      const canvas = canvasRef.current;
      if (!context || !canvas) return;

      if (worldDirtyRef.current) rebuildWorld();

      const { width, height } = viewportRef.current;
      if (!width || !height) return;

      const player = currentPlayerRef.current;
      const cx = player ? player.x - width / 2 + 140 : 0;
      const cy = player ? player.y - height / 2 : 0;

      context.fillStyle = "#18181b";
      context.fillRect(0, 0, width, height);

      if (worldCanvasRef.current) {
        context.drawImage(worldCanvasRef.current, -cx, -cy);
      }

      const coinImage = coinImageRef.current;
      if (coinImage) {
        for (const coin of coinsRef.current) {
          context.drawImage(coinImage, coin.x - cx, coin.y - cy, COIN_SIZE, COIN_SIZE);
        }
      }

      context.font = "12px sans-serif";
      context.textAlign = "left";
      for (const otherPlayer of playersRef.current) {
        const isCurrent = otherPlayer.id === socket.id;
        if (isCurrent) {
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.strokeRect(
            otherPlayer.x - 1 - cx,
            otherPlayer.y - 1 - cy,
            PLAYER_SIZE + 2,
            PLAYER_SIZE + 2
          );
        }
        context.fillStyle = otherPlayer.colour || "#ffffff";
        context.fillRect(otherPlayer.x - cx, otherPlayer.y - cy, PLAYER_SIZE, PLAYER_SIZE);
        context.fillStyle = "#eeeeee";
        context.fillText(otherPlayer.name, otherPlayer.x - 10 - cx, otherPlayer.y - 10 - cy);
      }

      lastFrameRef.current = timestamp;
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [socket]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoadScreenState(false), 3000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-zinc-900">
      <canvas ref={canvasRef} className="absolute inset-0 bg-zinc-900" aria-label="Multiplayer game board" />
      {loadScreenState || !connected ? (
        <LoadingScreen />
      ) : (
        <>
          <Leaderboard players={playersRef} currentPlayer={currentPlayerRef} />
          <Controls />
          <MobileControls controlsRef={controlsRef} />
        </>
      )}
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default GameBoard;
