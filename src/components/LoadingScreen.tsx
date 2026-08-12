interface LoadingScreenProps {
  progress: number;
  connection: "connecting" | "connected" | "reconnecting" | "error";
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  connection,
}) => {
  const connectionCopy =
    connection === "error"
      ? "Connection needs another attempt"
      : connection === "reconnecting"
      ? "Reconnecting to the arena"
      : connection === "connected"
      ? "Connected — syncing the arena"
      : "Connecting to the arena";

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-orbit">
          <span />
          <span />
          <span />
        </div>
        <span className="eyebrow">NEON CUBE ARENA</span>
        <h2>Preparing the match</h2>
        <p>{connectionCopy}</p>
        <div className="loading-progress">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <small>{Math.round(progress * 100)}% assets ready</small>
      </div>
    </div>
  );
};

export default LoadingScreen;
