import { createContext, useContext, useEffect, useState } from "react";
import SocketIOClient, { Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = (): Socket => {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error("useSocket must be used inside SocketProvider");
  return socket;
};

interface SocketProviderProps {
  name: string;
  colour: string;
  children: React.ReactNode;
}

const SocketProvider: React.FC<SocketProviderProps> = ({ name, colour, children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let client: Socket | null = null;

    const connect = async () => {
      try {
        await fetch("/api/socket", { method: "GET", cache: "no-store" });
        if (cancelled) return;

        client = SocketIOClient(window.location.origin, {
          query: { name, colour },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        });

        client.on("ping", (callback) => {
          if (typeof callback === "function") callback();
        });

        setSocket(client);
      } catch (error) {
        console.error("Unable to initialize game socket", error);
      }
    };

    connect();

    return () => {
      cancelled = true;
      client?.removeAllListeners();
      client?.disconnect();
      setSocket(null);
    };
  }, [name, colour]);

  if (!socket) return null;
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export default SocketProvider;
