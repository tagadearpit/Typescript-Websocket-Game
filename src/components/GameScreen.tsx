import { Dispatch, SetStateAction, useEffect, useState } from "react";
import GameBoard from "./GameBoard";
import LoadingScreen from "./LoadingScreen";
import resourceJson from "../resources/gameresources.json";
import { useSocket } from "./SocketContext";

interface GameScreenProps {
  isCustomized: boolean;
  setIsCustomized: Dispatch<SetStateAction<boolean>>;
}

const GameScreen: React.FC<GameScreenProps> = ({ setIsCustomized }) => {
  const socket = useSocket();
  const [assetsReady, setAssetsReady] = useState(false);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    let cancelled = false;

    const sources = [
      ...resourceJson.blocks,
      ...Object.values(resourceJson.characters).flat(),
    ];

    const preload = async () => {
      await Promise.allSettled(
        sources.map(
          (src) =>
            new Promise<void>((resolve) => {
              const image = new Image();
              image.decoding = "async";
              image.onload = () => resolve();
              image.onerror = () => resolve();
              image.src = src;
            })
        )
      );
      if (!cancelled) setAssetsReady(true);
    };

    preload();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  if (!assetsReady || !connected) return <LoadingScreen />;

  return <GameBoard setIsCustomized={setIsCustomized} />;
};

export default GameScreen;
