import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import SocketProvider from "../components/SocketContext";
import CustomizeChar from "../components/CustomizeChar";
import GameScreen from "../components/GameScreen";

const Home: NextPage = () => {
  const [isCustomized, setIsCustomized] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [colour, setColour] = useState<string>("");

  return (
    <>
      <Head>
        <title>Multiplayer Cube Game | TypeScript WebSocket</title>
        <meta
          name="description"
          content="Real-time multiplayer cube collection game built with Next.js, TypeScript and Socket.IO. Customize your character and play with friends!"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        {!isCustomized ? (
          <CustomizeChar
            setIsCustomized={setIsCustomized}
            setName={setName}
            setColour={setColour}
          />
        ) : (
          <SocketProvider name={name} colour={colour}>
            <GameScreen
              isCustomized={isCustomized}
              setIsCustomized={setIsCustomized}
            />
          </SocketProvider>
        )}
      </main>
    </>
  );
};

export default Home;
