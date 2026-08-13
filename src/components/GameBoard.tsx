import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSocket } from "./SocketContext";
import Controls from "./Controls";
import Leaderboard from "./Leaderboard";
import LoadingScreen from "./LoadingScreen";
import MobileControls from "./MobileControls";
import { CanvasRenderer } from "../game/CanvasRenderer";
import { GameSession } from "../game/GameSession";
import { InputManager } from "../game/InputManager";
import type { HudState } from "../global/types/gameTypes";

interface GameBoardProps {
  setIsCustomized: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialHud: HudState = {
  players: [],
  coins: 0,
  connection: "connecting",
};

const GameBoard: React.FC<GameBoardProps> = ({ setIsCustomized }) => {
  const { socket, status } = useSocket();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const [hud, setHud] = useState<HudState>(initialHud);
  const [assetProgress, setAssetProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !socket) return;

    const renderer = new CanvasRenderer(canvas);
    const session = new GameSession(socket, {
      onHudChange: (nextHud) => {
        setHud(nextHud);
        if (nextHud.players.length > 0) setIsReady(true);
      },
      onToast: (message, kind = "info") => {
        toast(message, {
          type:
            kind === "success"
              ? "success"
              : kind === "warning"
              ? "warning"
              : "info",
          position: "top-center",
          autoClose: 1800,
          theme: "dark",
        });
      },
      onSound: (sound) => {
        const audio = audioRef.current[sound];
        if (!audio) return;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      },
    });
    const input = new InputManager(session);
    sessionRef.current = session;
    inputRef.current = input;

    audioRef.current = {
      coin: new Audio("/coin.wav"),
      victory: new Audio("/victory.wav"),
      defeat: new Audio("/defeat.wav"),
    };
    Object.values(audioRef.current).forEach((audio) => {
      audio.preload = "auto";
      audio.volume = 0.12;
    });

    let frameId = 0;
    let disposed = false;
    const drawFrame = (time: number) => {
      if (disposed) return;
      renderer.draw({
        map: session.getMap(),
        coins: session.getCoins(),
        players: session.getInterpolatedPlayers(time),
        localId: socket.id,
        time,
      });
      frameId = window.requestAnimationFrame(drawFrame);
    };

    const handleResize = () =>
      renderer.resize(window.innerWidth, window.innerHeight);
    const handleConnect = () => {
      setHud((current) => ({ ...current, connection: "connected" }));
      setIsReady(true);
    };
    const handleDisconnect = () => {
      setHud((current) => ({ ...current, connection: "reconnecting" }));
      setIsReady(false);
    };

    window.addEventListener("resize", handleResize);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    input.mount();
    session.start();
    frameId = window.requestAnimationFrame(drawFrame);

    void renderer.loadAssets(setAssetProgress);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      input.unmount();
      session.destroy();
      sessionRef.current = null;
      inputRef.current = null;
      Object.values(audioRef.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, [socket]);

  const handleControl = useCallback(
    (key: Parameters<InputManager["setTouchControl"]>[0], value: boolean) => {
      inputRef.current?.setTouchControl(key, value);
    },
    []
  );

  const leaveGame = () => {
    socket?.disconnect();
    setIsCustomized(false);
  };

  const isLoading = !isReady || assetProgress < 1 || status === "connecting";

  return (
    <main className="game-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Neon Cube Arena game board"
      />
      <div className="game-gradient" aria-hidden="true" />
      <div className="game-ui">
        <Leaderboard
          players={hud.players}
          currentPlayer={hud.currentPlayer}
          coinCount={hud.coins}
          connection={status}
          onLeave={leaveGame}
        />
        <div className="match-pill" aria-live="polite">
          <span className={`status-dot status-${status}`} />
          <span>
            {status === "connected"
              ? "LIVE MATCH"
              : status === "reconnecting"
              ? "RECONNECTING"
              : "JOINING MATCH"}
          </span>
        </div>
        <Controls />
        <MobileControls onControl={handleControl} />
      </div>
      {isLoading ? (
        <LoadingScreen progress={assetProgress} connection={status} />
      ) : null}
      <ToastContainer newestOnTop limit={4} hideProgressBar theme="dark" />
    </main>
  );
};

export default GameBoard;
