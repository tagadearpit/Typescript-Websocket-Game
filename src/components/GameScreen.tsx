import GameBoard from "./GameBoard";
import LoadingScreen from "./LoadingScreen";
import { useSocket } from "./SocketContext";

interface GameScreenProps {
  isCustomized: boolean;
  setIsCustomized: React.Dispatch<React.SetStateAction<boolean>>;
}

const GameScreen: React.FC<GameScreenProps> = ({ setIsCustomized }) => {
  const { socket, status } = useSocket();

  if (!socket) {
    return <LoadingScreen progress={0} connection={status} />;
  }

  return <GameBoard setIsCustomized={setIsCustomized} />;
};

export default GameScreen;
