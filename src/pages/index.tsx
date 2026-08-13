import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import SocketProvider from "../components/SocketContext";
import CustomizeChar from "../components/CustomizeChar";
import GameScreen from "../components/GameScreen";

const Home: NextPage = () => {
  const [isCustomized, setIsCustomized] = useState(false);
  const [name, setName] = useState("");
  const [colour, setColour] = useState("");

  return (
    <>
      <Head>
        <title>Neon Cube Arena | Real-time multiplayer</title>
        <meta
          name="description"
          content="A fast, real-time multiplayer coin collection arena built with Next.js and Socket.IO."
        />
        <meta name="theme-color" content="#070b2d" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
    </>
  );
};

export default Home;
