import { Dispatch, SetStateAction, useEffect, useState } from "react";
import GameBoard from "./GameBoard";
import LoadingScreen from "./LoadingScreen";
import resourceJson from "../resources/gameresources.json";
import { useSocket } from "./SocketContext";

interface GameScreenProps {
  isCustomized: boolean;
  setIsCustomized: Dispatch<SetStateAction<boolean>>;
}

const GameScreen: React.FC<GameScreenProps> = ({
  isCustomized,
  setIsCustomized,
}) => {
  const socket = useSocket();

  const [isPreLoading, setIsPreLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);

  // Pre-cache game images (blocks + character sprites)
  useEffect(() => {
    let characterResources: string[] = [];
    Object.values(resourceJson.characters).forEach((val) => {
      characterResources = [...characterResources, ...val];
    });

    cacheImages([...resourceJson.blocks, ...characterResources]);
  }, []);

  // Listen for successful socket connection
  useEffect(() => {
    if (Object.keys(socket).length > 0) {
      socket.on("connect", () => {
        console.log("Connected to the server.");
        setIsConnecting(false);
      });
    }
  }, [socket]);

  // Cache images so they are ready before the game starts
  const cacheImages = async (srcArray: string[]) => {
    const promises = srcArray.map((src) => {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
      });
    });

    await Promise.all(promises);

    // Small artificial delay so the loading screen is visible
    setTimeout(() => {
      setIsPreLoading(false);
    }, 2000);
  };

  return (
    <>
      {!isPreLoading && !isConnecting ? (
        <GameBoard setIsCustomized={setIsCustomized} />
      ) : (
        <LoadingScreen />
      )}
    </>
  );
};

export default GameScreen;
