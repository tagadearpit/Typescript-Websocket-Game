import { MutableRefObject, useEffect, useState } from "react";
import Image from "next/image";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { END_GAME_SCORE } from "../global/constants";
import { Player } from "../global/types/gameTypes";

interface LeaderboardProps {
  players: MutableRefObject<Player[]>;
  currentPlayer: MutableRefObject<Player | undefined>;
}

const REFRESH_MS = 500;

const pingColour = (ping: number) => {
  if (ping < 70) return "text-green-800";
  if (ping < 110) return "text-green-500";
  if (ping < 160) return "text-lime-300";
  if (ping < 210) return "text-amber-400";
  if (ping < 260) return "text-orange-400";
  return "text-orange-800";
};

const Leaderboard: React.FC<LeaderboardProps> = ({ players, currentPlayer }) => {
  const [scores, setScores] = useState<Player[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setScores([...players.current].sort((a, b) => b.score - a.score));
    };

    refresh();
    const interval = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [players]);

  const content = (
    <>
      <div className="flex flex-shrink-0 items-center px-4">
        <Image src="/img/ryanlogo.png" alt="Ryanc268 logo" width={40} height={40} priority />
        <p className="ml-4 text-xl">Leaderboard</p>
      </div>
      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-2">
        {scores.map((player) => (
          <div key={player.id} className="flex flex-col py-1">
            <div className="flex items-center">
              <span
                className="mr-2 h-5 w-5 shrink-0 rounded-full"
                style={{ background: player.colour }}
                aria-hidden="true"
              />
              <h3 className="truncate text-lg">
                {player.name}: {player.score}/{END_GAME_SCORE}
              </h3>
            </div>
            <span className={`text-xs ${pingColour(player.ping)}`}>{player.ping}ms</span>
          </div>
        ))}
      </nav>
      <div className="flex flex-shrink-0 bg-gray-700 p-4">
        <div
          className="mr-3 h-9 w-9 shrink-0 rounded-full"
          style={{ background: currentPlayer.current?.colour || "#ffffff" }}
        />
        <h3 className="truncate text-base font-medium text-white">
          {currentPlayer.current?.name ?? "Loading..."} - {currentPlayer.current?.score ?? 0}/{END_GAME_SCORE}
        </h3>
      </div>
    </>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-gray-800 md:flex">
        {content}
      </div>

      <div className="fixed left-0 top-0 z-40 md:hidden">
        <button
          type="button"
          aria-label={mobileOpen ? "Close leaderboard" : "Open leaderboard"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="m-2 rounded-md bg-gray-800 p-3 text-white shadow"
        >
          {mobileOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 flex max-w-xs flex-col bg-gray-800 md:hidden">
          <div className="pt-16">{content}</div>
        </div>
      )}
    </>
  );
};

export default Leaderboard;
