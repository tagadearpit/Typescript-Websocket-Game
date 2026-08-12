import SocketIOClient, { Socket } from "socket.io-client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

interface SocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  status: "connecting",
});

export const useSocket = () => useContext(SocketContext);

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    const connect = async () => {
      setStatus("connecting");
      try {
        await fetch("/api/socket", { cache: "no-store" });
        if (cancelled) return;

        activeSocket = SocketIOClient(window.location.origin, {
          query: { name, colour },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 500,
          reconnectionDelayMax: 5000,
          timeout: 8000,
        });

        const handleConnect = () => setStatus("connected");
        const handleDisconnect = () => setStatus("reconnecting");
        const handleReconnectAttempt = () => setStatus("reconnecting");
        const handleConnectError = () => setStatus("error");

        activeSocket.on("connect", handleConnect);
        activeSocket.on("disconnect", handleDisconnect);
        activeSocket.io.on("reconnect_attempt", handleReconnectAttempt);
        activeSocket.on("connect_error", handleConnectError);
        setSocket(activeSocket);
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.removeAllListeners();
        activeSocket.io.removeAllListeners();
        activeSocket.close();
      }
      setSocket(null);
    };
  }, [name, colour]);

  const value = useMemo(() => ({ socket, status }), [socket, status]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
