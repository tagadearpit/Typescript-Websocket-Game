(() => {
  "use strict";

  // VS Code Live Server is static-only, so this mode uses the deployed Socket.IO server.
  const SOCKET_URL = "https://typescript-websocket-game.up.railway.app";
  const TILE_SIZE = 32;
  const COIN_SIZE = 14;
  const PLAYER_SIZE = 16;
  const NETWORK_UPDATE_MS = 50;

  const setup = document.getElementById("setup");
  const form = document.getElementById("setup-form");
  const nickname = document.getElementById("nickname");
  const colour = document.getElementById("colour");
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const leaderboard = document.getElementById("leaderboard");
  const playerList = document.getElementById("players");
  const status = document.getElementById("status");
  const mobileControls = document.getElementById("mobile-controls");

  const controls = { up: false, down: false, left: false, right: false, jump: false, respawn: false, sprint: false };
  const state = { players: [], coins: [], map: [], block: 2, socket: null, current: null, worldCanvas: document.createElement("canvas"), worldDirty: true };
  const audio = {
    coin: new Audio("../public/coin.wav"),
    music: new Audio("../public/SonicIceCapRemixLoopable.mp3"),
    victory: new Audio("../public/victory.wav"),
    defeat: new Audio("../public/defeat.wav"),
  };
  audio.coin.volume = 0.05;
  audio.music.volume = 0.1;
  audio.music.loop = true;
  audio.victory.volume = 0.1;
  audio.defeat.volume = 0.1;

  const imageCache = new Map();
  const loadImage = (src) => {
    if (imageCache.has(src)) return imageCache.get(src);
    const image = new Image();
    image.src = src;
    imageCache.set(src, image);
    return image;
  };

  const blockImages = {
    2: loadImage("../public/img/block.png"),
    3: loadImage("../public/img/block2.png"),
    4: loadImage("../public/img/block3.png"),
    5: loadImage("../public/img/block4.png"),
  };
  const coinImage = loadImage("../public/img/coin2.png");

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  function setControl(key, active) {
    if (key === "a") controls.left = active;
    else if (key === "d") controls.right = active;
    else if (key === "s") controls.down = active;
    else if (key === " ") controls.jump = active;
    else if (key === "r") controls.respawn = active;
    else if (key === "shift") controls.sprint = active;
  }

  function setupInput() {
    const valid = new Set(["w", "a", "s", "d", " ", "r", "shift"]);
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (!valid.has(key)) return;
      event.preventDefault();
      setControl(key, true);
      audio.music.play().catch(() => {});
    }, { passive: false });
    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      if (!valid.has(key)) return;
      event.preventDefault();
      setControl(key, false);
    }, { passive: false });

    mobileControls.querySelectorAll("button").forEach((button) => {
      const key = button.dataset.key;
      const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        setControl(key, true);
        audio.music.play().catch(() => {});
      };
      const release = (event) => {
        event.preventDefault();
        setControl(key, false);
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", () => setControl(key, false));
    });
  }

  function rebuildWorld() {
    if (!state.map.length) return;
    const image = blockImages[state.block];
    if (!image || !image.complete) return;

    const rows = state.map.length;
    const cols = Math.max(...state.map.map((row) => row.length));
    state.worldCanvas.width = cols * TILE_SIZE;
    state.worldCanvas.height = rows * TILE_SIZE;
    const world = state.worldCanvas.getContext("2d");
    world.fillStyle = "#7ca6e4";
    world.fillRect(0, 0, state.worldCanvas.width, state.worldCanvas.height);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < state.map[row].length; col++) {
        if (state.map[row][col] !== 0) world.drawImage(image, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    state.worldDirty = false;
  }

  function updateLeaderboard() {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    playerList.replaceChildren(...sorted.map((player) => {
      const row = document.createElement("div");
      row.className = "player";
      row.innerHTML = `<strong>${escapeHtml(player.name)}</strong>: ${player.score}/10 <span class="ping">${player.ping || 0}ms</span>`;
      return row;
    }));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function render() {
    requestAnimationFrame(render);
    if (state.worldDirty) rebuildWorld();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const current = state.current;
    const cx = current ? current.x - width / 2 + 140 : 0;
    const cy = current ? current.y - height / 2 : 0;

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(state.worldCanvas, -cx, -cy);

    for (const coin of state.coins) {
      if (coinImage.complete) ctx.drawImage(coinImage, coin.x - cx, coin.y - cy, COIN_SIZE, COIN_SIZE);
    }

    ctx.font = "12px sans-serif";
    for (const player of state.players) {
      if (player.id === state.socket.id) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x - 1 - cx, player.y - 1 - cy, PLAYER_SIZE + 2, PLAYER_SIZE + 2);
      }
      ctx.fillStyle = player.colour || "#fff";
      ctx.fillRect(player.x - cx, player.y - cy, PLAYER_SIZE, PLAYER_SIZE);
      ctx.fillStyle = "#eee";
      ctx.fillText(player.name, player.x - 10 - cx, player.y - 10 - cy);
    }
  }

  function connect(name, playerColour) {
    setStatus("Connecting…");
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      query: { name, colour: playerColour },
    });
    state.socket = socket;

    socket.on("connect", () => {
      setStatus("");
      canvas.hidden = false;
      leaderboard.hidden = false;
      mobileControls.hidden = false;
      socket.emit("ready");
    });
    socket.on("disconnect", () => setStatus("Disconnected — reconnecting…"));
    socket.on("block", (block) => { state.block = block; state.worldDirty = true; });
    socket.on("map", (map) => { state.map = map; state.worldDirty = true; });
    socket.on("players", (players) => {
      state.players = players;
      state.current = players.find((player) => player.id === socket.id) || null;
      updateLeaderboard();
    });
    socket.on("coins", (coins) => { state.coins = coins; });
    socket.on("playerJoin", (player) => setStatus(`${player} joined`));
    socket.on("playerLeave", (player) => setStatus(`${player} left`));
    socket.on("playCoinSound", () => { audio.coin.currentTime = 0; audio.coin.play().catch(() => {}); });
    socket.on("playVictorySound", (name) => { setStatus(`${name} the winner!`); audio.victory.play().catch(() => {}); });
    socket.on("playDefeatSound", (name) => { setStatus(`${name} the winner!`); audio.defeat.play().catch(() => {}); });
    socket.on("ping", (callback) => { if (typeof callback === "function") callback(); });

    setInterval(() => {
      if (socket.connected) socket.emit("controls", controls);
    }, NETWORK_UPDATE_MS);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nickname.value.trim() || `Player-${Math.floor(1000 + Math.random() * 9000)}`;
    if (name.length > 20 || /(?:fuck|shit|bitch|asshole|bastard|cunt|dick|piss|slut|whore)/i.test(name)) {
      setStatus("Choose a different nickname.");
      return;
    }
    setup.hidden = true;
    connect(name, colour.value);
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();
  setupInput();
  render();
})();
