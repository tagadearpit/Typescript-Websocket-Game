import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ControlsInterface, Player } from "../global/types/gameTypes";
import { KeyMap } from "../global/types/gameEnums";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TILE_SIZE, COIN_SIZE, PLAYER_SIZE } from "../global/constants";
import Controls from "./Controls";
import Leaderboard from "./Leaderboard";
import LoadingScreen from "./LoadingScreen";
import MobileControls from "./MobileControls";
import resourceJson from "../resources/gameresources.json";
import { useSocket } from "../components/SocketContext";

interface GameBoardProps {
  setIsCustomized: Dispatch<SetStateAction<boolean>>;
}

const GameBoard: React.FC<GameBoardProps> = ({ setIsCustomized }) => {
  const socket = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const mobileControls = useRef<Map<KeyMap, boolean>>(new Map());
  const controlsRef = useRef<ControlsInterface>({
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    respawn: false,
    sprint: false,
  });
  const players = useRef<Player[]>([]);
  const currentPlayer = useRef<Player>();
  const roundTransition = useRef(false);
  const [loadScreenState, setLoadScreenState] = useState(false);

  const coinImg = useRef<HTMLImageElement | null>(null);
  const currentBlock = useRef<HTMLImageElement | null>(null);
  const coinAudio = useRef<HTMLAudioElement>();
  const bgMusic = useRef<HTMLAudioElement>();
  const victoryAudio = useRef<HTMLAudioElement>();
  const defeatAudio = useRef<HTMLAudioElement>();
  const mapRef = useRef<number[][]>([]);
  const coinsRef = useRef<any[]>([]);

  useEffect(() => {
    coinImg.current = new Image();
    coinImg.current.src = resourceJson.blocks[0];

    coinAudio.current = new Audio("/coin.wav");
    bgMusic.current = new Audio("/SonicIceCapRemixLoopable.mp3");
    victoryAudio.current = new Audio("/victory.wav");
    defeatAudio.current = new Audio("/defeat.wav");

    coinAudio.current.volume = 0.05;
    victoryAudio.current.volume = 0.1;
    defeatAudio.current.volume = 0.1;
    bgMusic.current.volume = 0.1;
    bgMusic.current.loop = true;

    const setKey = (event: KeyboardEvent, active: boolean) => {
      setControls(event.key.toLowerCase() as KeyMap, active);
    };

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("keydown", (event) => setKey(event, true));
    window.addEventListener("keyup", (event) => setKey(event, false));
    window.addEventListener("resize", resize);
    resize();

    socketInitializer();

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    contextRef.current = context;

    const readyHandler = () => startCanvas();
    socket.emit("ready", readyHandler);

    return () => {
      window.removeEventListener("keydown", (event) => setKey(event, true));
      window.removeEventListener("keyup", (event) => setKey(event, false));
      window.removeEventListener("resize", resize);
      socket.off("block");
      socket.off("map");
      socket.off("players");
      socket.off("coins");
      socket.off("playerJoin");
      socket.off("playerLeave");
      socket.off("playCoinSound");
      socket.off("playVictorySound");
      socket.off("playDefeatSound");
      socket.off("ping");
      bgMusic.current?.pause();
    };
  }, [socket]);

  const startCanvas = () => {
    if (!contextRef.current) return;
    window.requestAnimationFrame(loop);
  };

  const setControls = (key: KeyMap, active: boolean) => {
    if (key === KeyMap.Down) controlsRef.current.down = active;
    if (key === KeyMap.Left) controlsRef.current.left = active;
    if (key === KeyMap.Right) controlsRef.current.right = active;
    if (key === KeyMap.Jump) controlsRef.current.jump = active;
    if (key === KeyMap.Respawn) controlsRef.current.respawn = active;
    if (key === KeyMap.Sprint) controlsRef.current.sprint = active;
  };

  const isMobile = () => window.innerWidth < 768;

  const socketInitializer = () => {
    socket.off("block").on("block", (serverBlock: number) => {
      currentBlock.current = blockChange(serverBlock);
    });
    socket.off("map").on("map", (serverMap: number[][]) => {
      mapRef.current = serverMap;
    });
    socket.off("players").on("players", (serverPlayers: Player[]) => {
      players.current = serverPlayers;
    });
    socket.off("coins").on("coins", (serverCoins: any[]) => {
      coinsRef.current = serverCoins;
    });
    socket.off("playerJoin").on("playerJoin", (player: string) => {
      toast(`Player ${player} joined`, {
        position: isMobile() ? "top-center" : "bottom-left",
        autoClose: 1000,
        theme: "dark",
      });
    });
    socket.off("playerLeave").on("playerLeave", (player: string) => {
      toast(`Player ${player} left`, {
        position: isMobile() ? "top-center" : "bottom-left",
        autoClose: 1000,
        theme: "dark",
      });
    });
    socket.off("playCoinSound").on("playCoinSound", () => {
      if (coinAudio.current) {
        coinAudio.current.currentTime = 0;
        void coinAudio.current.play().catch(() => undefined);
      }
    });
    socket.off("playVictorySound").on("playVictorySound", (name: string) => {
      endGame(name);
      if (victoryAudio.current) {
        victoryAudio.current.currentTime = 0;
        void victoryAudio.current.play().catch(() => undefined);
      }
    });
    socket.off("playDefeatSound").on("playDefeatSound", (name: string) => {
      endGame(name);
      if (defeatAudio.current) {
        defeatAudio.current.currentTime = 0;
        void defeatAudio.current.play().catch(() => undefined);
      }
    });
    socket.off("ping").on("ping", (callback: () => void) => callback());
  };

  const endGame = (name: string) => {
    toast(`${name} the winner!!`, {
      position: "top-center",
      autoClose: 1000,
      theme: "dark",
    });
    roundTransition.current = true;
    setLoadScreenState(true);
    contextRef.current?.clearRect(0, 0, window.innerWidth, window.innerHeight);
    Object.keys(controlsRef.current).forEach((key) => {
      controlsRef.current[key as keyof ControlsInterface] = false;
    });
    socket.emit("controls", controlsRef.current);
    window.setTimeout(() => {
      setLoadScreenState(false);
      roundTransition.current = false;
    }, 2000);
  };

  const blockChange = (blockChoice: number) => {
    const block = new Image();
    block.src = resourceJson.blocks[blockChoice];
    return block;
  };

  const getPlayer = () => {
    const player = players.current.find((item) => item.id === socket.id);
    currentPlayer.current = player;
    return player;
  };

  const update = () => {
    if (!roundTransition.current) socket.emit("controls", controlsRef.current);
  };

  const draw = () => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    let cx = 0;
    let cy = 0;
    const playerToFocus = getPlayer();
    if (playerToFocus) {
      cx = playerToFocus.x - canvas.width / 2 + 140;
      cy = playerToFocus.y - canvas.height / 2;
    }

    const block = currentBlock.current;
    if (block) {
      for (let row = 0; row < mapRef.current.length; row++) {
        for (let col = 0; col < mapRef.current[row].length; col++) {
          if (mapRef.current[row][col] === 1) {
            context.drawImage(
              block,
              col * TILE_SIZE - cx,
              row * TILE_SIZE - cy,
              TILE_SIZE,
              TILE_SIZE
            );
          }
        }
      }
    }

    const coin = coinImg.current;
    if (coin) {
      for (const item of coinsRef.current) {
        context.drawImage(
          coin,
          item.x - cx,
          item.y - cy,
          COIN_SIZE,
          COIN_SIZE
        );
      }
    }

    for (const player of players.current) {
      if (player.id === socket.id) {
        context.fillStyle = "#ff0000";
        context.fillRect(
          player.x - 1 - cx,
          player.y - 1 - cy,
          PLAYER_SIZE + 2,
          PLAYER_SIZE + 2
        );
      }
      context.fillStyle = player.colour;
      context.fillRect(
        player.x - cx,
        player.y - cy,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
      context.fillStyle = "#eeeeee";
      context.fillText(player.name, player.x - 10 - cx, player.y - 10 - cy);
    }
  };

  const loop = () => {
    if (!roundTransition.current) {
      update();
      draw();
    }
    window.requestAnimationFrame(loop);
  };

  return (
    <div>
      <canvas className="absolute bg-zinc-900" id="canvas" ref={canvasRef} />
      {loadScreenState ? (
        <LoadingScreen />
      ) : (
        <>
          <Leaderboard players={players} currentPlayer={currentPlayer} />
          {isMobile() ? (
            <MobileControls controlsRef={controlsRef} />
          ) : (
            <Controls />
          )}
        </>
      )}
      <ToastContainer
        position="bottom-left"
        autoClose={2000}
        limit={5}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default GameBoard;
