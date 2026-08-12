const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(
    healthResponse.status,
    200,
    "health endpoint must return HTTP 200"
  );
  const health = await healthResponse.json();
  assert.ok(
    ["ok", "healthy"].includes(health.status),
    "health endpoint must report a healthy status"
  );

  const socketBootstrap = await fetch(`${baseUrl}/api/socket`, {
    cache: "no-store",
  });
  assert.equal(
    socketBootstrap.status,
    200,
    "socket bootstrap endpoint must return HTTP 200"
  );

  const socket = io(baseUrl, {
    query: { name: "SmokeTest", colour: "#42e8ff" },
    transports: ["websocket"],
    timeout: 5000,
    reconnection: false,
  });

  const events = { map: false, block: false, players: false, coins: false };
  let localPlayer;
  let initialX;
  let receivedReady = false;

  const connected = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Socket connection timed out")),
      7000
    );
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("connect_error", reject);
  });

  socket.on("map", (map) => {
    assert.ok(
      Array.isArray(map) && map.length >= 20,
      "map must contain a playable grid"
    );
    events.map = true;
  });
  socket.on("block", (block) => {
    assert.ok(
      Number.isInteger(block) && block >= 1,
      "block theme must be a positive integer"
    );
    events.block = true;
  });
  socket.on("players", (players) => {
    assert.ok(Array.isArray(players), "players snapshot must be an array");
    const current = players.find((player) => player.id === socket.id);
    if (current) {
      localPlayer = current;
      if (initialX === undefined) initialX = current.x;
    }
    events.players = true;
  });
  socket.on("coins", (coins) => {
    assert.ok(
      Array.isArray(coins) && coins.length <= 18,
      "coin snapshot must stay bounded"
    );
    events.coins = true;
  });

  await connected;
  socket.emit("ready", () => {
    receivedReady = true;
  });
  await wait(750);
  socket.emit("controls", {
    up: false,
    down: false,
    left: false,
    right: true,
    jump: false,
    respawn: false,
    sprint: false,
  });
  await wait(500);
  socket.emit("controls", {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    respawn: false,
    sprint: false,
  });
  await wait(400);

  assert.ok(receivedReady, "ready callback must be called");
  assert.ok(
    events.map && events.block && events.players && events.coins,
    "all world snapshot events must arrive"
  );
  assert.ok(
    localPlayer,
    "the connecting client must appear in player snapshots"
  );
  assert.ok(
    Number.isFinite(localPlayer.x) && Number.isFinite(localPlayer.y),
    "player coordinates must remain finite"
  );
  assert.notEqual(initialX, undefined, "player position must be observed");

  socket.close();
  console.log(
    JSON.stringify(
      {
        ok: true,
        health,
        events,
        player: {
          x: localPlayer.x,
          y: localPlayer.y,
          score: localPlayer.score,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
