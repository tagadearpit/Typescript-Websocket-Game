import { useMemo, useState } from "react";
import { END_GAME_SCORE } from "../global/constants";
import type { Player } from "../global/types/gameTypes";

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

interface LeaderboardProps {
  players: Player[];
  currentPlayer?: Player;
  coinCount: number;
  connection: ConnectionStatus;
  onLeave: () => void;
}

const pingClass = (ping: number) => {
  if (ping < 70) return "ping-good";
  if (ping < 150) return "ping-ok";
  if (ping < 240) return "ping-warn";
  return "ping-bad";
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  currentPlayer,
  coinCount,
  connection,
  onLeave,
}) => {
  const [open, setOpen] = useState(false);
  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => b.score - a.score || a.name.localeCompare(b.name)
      ),
    [players]
  );

  return (
    <>
      <button
        className="mobile-menu-button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open scoreboard"
      >
        <span className="menu-icon">☰</span>
        <span>
          {currentPlayer?.score ?? 0}/{END_GAME_SCORE}
        </span>
      </button>

      <aside className={`scoreboard ${open ? "scoreboard-open" : ""}`}>
        <div className="scoreboard-header">
          <div>
            <span className="eyebrow">NEON CUBE ARENA</span>
            <h1>Scoreboard</h1>
          </div>
          <button
            className="close-scoreboard"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close scoreboard"
          >
            ×
          </button>
        </div>
        <div className="score-summary">
          <div>
            <span className="summary-label">PLAYERS</span>
            <strong>{players.length}</strong>
          </div>
          <div>
            <span className="summary-label">ARENA COINS</span>
            <strong>{coinCount}</strong>
          </div>
        </div>
        <div className="leaderboard-list">
          {sortedPlayers.length === 0 ? (
            <p className="empty-state">Waiting for players…</p>
          ) : (
            sortedPlayers.map((player, index) => (
              <div
                className={`leaderboard-row ${
                  player.id === currentPlayer?.id ? "leaderboard-row-local" : ""
                }`}
                key={player.id}
              >
                <span className="rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className="player-swatch"
                  style={{ backgroundColor: player.colour }}
                />
                <span className="leaderboard-name">{player.name}</span>
                <span className="leaderboard-score">
                  {player.score}
                  <small>/{END_GAME_SCORE}</small>
                </span>
                <span className={`leaderboard-ping ${pingClass(player.ping)}`}>
                  {player.ping}ms
                </span>
              </div>
            ))
          )}
        </div>
        <div className="local-player-card">
          <div
            className="local-player-mark"
            style={{ backgroundColor: currentPlayer?.colour ?? "#20d8f7" }}
          />
          <div>
            <span className="summary-label">YOU ARE PLAYING AS</span>
            <strong>{currentPlayer?.name ?? "Joining…"}</strong>
          </div>
          <span className={`connection-label connection-${connection}`}>
            {connection}
          </span>
        </div>
        <button className="leave-button" type="button" onClick={onLeave}>
          Leave match
        </button>
      </aside>
      {open ? (
        <button
          className="scoreboard-backdrop"
          aria-label="Close scoreboard"
          type="button"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};

export default Leaderboard;
