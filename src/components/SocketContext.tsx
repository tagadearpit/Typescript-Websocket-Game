import { createContext, useContext, useEffect, useState } from "react";
import SocketIOClient, { Socket } from "socket.io-client";

const SocketContext = createContext<Socket>({} as Socket);

export const useSocket = () => {
  return useContext(SocketContext);
};

interface SocketProviderProps {
  name: string;
  colour: string;
  children: React.ReactNode;
}

const SocketProvider: React.FC<SocketProviderProps> = ({
  name,
  colour,
  children,
}) => {
  const [socket, setSocket] = useState<Socket>({} as Socket);

  useEffect(() => {
    console.log("Context Mounted");
    // Trigger the API route that initializes the Socket.IO server
    fetch("/api/socket");

    const newSocket = SocketIOClient(window.location.origin, {
      query: { name, colour },
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      console.log("Context Dismounted");
    };
  }, [name, colour]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
