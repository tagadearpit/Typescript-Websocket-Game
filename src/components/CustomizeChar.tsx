import Image from "next/image";
import { useState } from "react";

const random = require("random-name");
const Filter = require("bad-words");

interface CustomizeCharProps {
  setIsCustomized: React.Dispatch<React.SetStateAction<boolean>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setColour: React.Dispatch<React.SetStateAction<string>>;
}

const makeColour = () =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;

const CustomizeChar: React.FC<CustomizeCharProps> = ({
  setIsCustomized,
  setName,
  setColour,
}) => {
  const [nickname, setNickname] = useState("");
  const [colour, setLocalColour] = useState(makeColour);
  const [error, setError] = useState("");
  const filter = new Filter();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = nickname.trim() || random.first();
    if (filter.isProfane(nextName)) {
      setError("Choose a different nickname before entering the arena.");
      return;
    }
    setName(nextName.slice(0, 18));
    setColour(colour);
    setIsCustomized(true);
  };

  return (
    <main className="customize-shell">
      <div className="customize-stars" aria-hidden="true" />
      <section className="customize-card">
        <div className="brand-mark">
          <Image
            src="/img/ryanlogo.png"
            alt="Neon Cube Arena logo"
            width={56}
            height={56}
          />
        </div>
        <span className="eyebrow">MULTIPLAYER ARCADE // 01</span>
        <h1>
          Neon Cube
          <br />
          <span>Arena</span>
        </h1>
        <p className="customize-subtitle">
          A fast, shared arena where every coin changes the leaderboard.
        </p>
        <div className="customize-rule" />
        <form onSubmit={handleSubmit} className="customize-form">
          <label htmlFor="nickname">
            Callsign <span>OPTIONAL</span>
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={18}
            placeholder="Enter your nickname"
            autoComplete="nickname"
          />
          <label htmlFor="color">Avatar signal</label>
          <div className="color-picker-row">
            <input
              id="color"
              type="color"
              value={colour}
              onChange={(event) => setLocalColour(event.target.value)}
            />
            <div>
              <strong style={{ color: colour }}>{colour.toUpperCase()}</strong>
              <span>Your cube’s accent color</span>
            </div>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="launch-button" type="submit">
            <span>Enter the arena</span>
            <strong>↗</strong>
          </button>
        </form>
        <div className="customize-footer">
          <span>WASD / ARROWS TO MOVE</span>
          <span>SPACE TO JUMP</span>
          <span>10 COINS TO WIN</span>
        </div>
      </section>
    </main>
  );
};

export default CustomizeChar;
