import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";
import Image from "next/image";

interface CustomizeCharProps {
  setIsCustomized: Dispatch<SetStateAction<boolean>>;
  setName: Dispatch<SetStateAction<string>>;
  setColour: Dispatch<SetStateAction<string>>;
}

const PROFANITY = /(?:fuck|shit|bitch|asshole|bastard|cunt|dick|piss|slut|whore)/i;

const randomName = () => `Player-${Math.floor(1000 + Math.random() * 9000)}`;
const randomColour = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;

const CustomizeChar: React.FC<CustomizeCharProps> = ({
  setIsCustomized,
  setName,
  setColour,
}) => {
  const username = useRef<HTMLInputElement | null>(null);
  const colour = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (colour.current) colour.current.value = randomColour();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const name = username.current?.value.trim() || randomName();
    if (name.length > 20 || PROFANITY.test(name)) {
      window.alert("Please choose a nickname up to 20 characters without profanity.");
      return;
    }

    setName(name);
    setColour(colour.current?.value || randomColour());
    setIsCustomized(true);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Image
          className="mx-auto h-12 w-auto"
          src="/img/ryanlogo.png"
          alt="Ryanc268 logo"
          width={100}
          height={100}
          priority
        />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-300">
          Ryans Cube Game
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Choose your nickname and colour
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-lg bg-zinc-800 px-4 py-8 shadow sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-300">
                Nickname
              </label>
              <input
                id="nickname"
                type="text"
                placeholder="Enter Your Nickname"
                ref={username}
                maxLength={20}
                autoComplete="nickname"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-300">
                Colour
              </label>
              <input id="color" type="color" ref={colour} className="mt-1 h-10 w-full" />
            </div>

            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Load Game
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomizeChar;
