(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const rotateOverlay = document.getElementById("rotateOverlay");
  const startScreen = document.getElementById("startScreen");
  const gameUi = document.getElementById("gameUi");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const app = document.getElementById("app");

  const playBtn = document.getElementById("playBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const backToMenuBtn = document.getElementById("backToMenuBtn");

  const distanceValue = document.getElementById("distanceValue");
  const scoreValue = document.getElementById("scoreValue");
  const fuelFill = document.getElementById("fuelFill");

  const finalScore = document.getElementById("finalScore");
  const finalDistance = document.getElementById("finalDistance");
  const finalLandings = document.getElementById("finalLandings");
  const finalLandingQuality = document.getElementById("finalLandingQuality");
  const newPersonalBest = document.getElementById("newPersonalBest");
  const personalBestEl = document.getElementById("personalBest");
  const localLeaderboardEl = document.getElementById("localLeaderboard");

  const STORAGE_KEYS = {
    personalBest: "wildcatHop:personalBest",
    localTop10: "wildcatHop:localTop10"
  };

  const ASSET_BASE = "gamegraphics";
  const ASSET_CANDIDATES = {
    wildcat: ["wildcat-heli.svg", "wildcat-heli.png"],
    ship: ["ship.svg", "ship.png"],
    tree: ["tree.svg"],
    building: ["building.svg"],
    cloud: ["cloud.svg"],
    enemyHeli: ["enemy-heli.png"],
    jet: ["jet.png"]
  };

  let gameState = "menu";
  let lastTime = 0;
  let groundY = 0;
  let cruiseWorldSpeed = 290;
  let targetWorldSpeed = 0;
  let effectiveWorldSpeed = 0;
  let isTabletMode = false;

  const player = {
    x: 0,
    y: 0,
    w: 78,
    h: 30,
    vy: 0,
    gravity: 930,
    flapImpulse: -300,
    maxFall: 720,
    fuel: 100,
    maxFuel: 100,
    fuelBurnRate: 2.3,
    refuelRate: 26,
    landed: true,
    crashed: false,
    airborneStarted: false,
    angle: 0,
    engineOut: false,
    landedPlatform: null,
    landingCountdown: 0,
    landingCountdownLimit: 6
  };

  const world = {
    distance: 0,
    score: 0,
    successfulLandings: 0,
    bestLandingQuality: "None",
    obstaclesCleared: 0,
    nextObstacleSpawn: 900,
    nextPlatformSpawn: 1800,
    obstacles: [],
    platforms: [],
    terrain: [],
    stars: [],
    seaPhase: 0
  };

  const assets = {};
  let takeoffTimerEl = null;

  function getRect() {
    return canvas.getBoundingClientRect();
  }

  function getDeviceMode() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const landscape = width > height;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    isTabletMode = coarse && Math.max(width, height) >= 1000;
    return { width, height, landscape, coarse };
  }

  function shouldRequireLandscape() {
    return getDeviceMode().coarse;
  }

  function updateOrientationOverlay() {
    const { landscape } = getDeviceMode();
    if (shouldRequireLandscape() && !landscape) {
      rotateOverlay.classList.remove("hidden");
    } else {
      rotateOverlay.classList.add("hidden");
    }
  }

  async function tryFullscreen() {
    const el = app || document.documentElement;
    try {
      if (document.fullscreenElement) return;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch {
      // Ignore browser refusal.
    }
  }

  function syncAppHeight() {
    const vv = window.visualViewport;
    const h = Math.round(vv ? vv.height : window.innerHeight);
    document.documentElement.style.setProperty("--app-height", `${h}px`);
    if (app) {
      app.style.height = `${h}px`;
    }
    window.scrollTo(0, 0);
  }

  function resizeCanvas() {
    const rect = getRect();
    if (!rect.width || !rect.height) return false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    groundY = rect.height * 0.88;
    return true;
  }

  function ensureTakeoffTimer() {
    if (takeoffTimerEl) return;
    takeoffTimerEl = document.createElement("div");
    takeoffTimerEl.id = "takeoffTimer";
    takeoffTimerEl.className = "hidden";
    gameUi.appendChild(takeoffTimerEl);
  }

  function tryLoadCandidate(key, fileNames, index = 0) {
    if (!fileNames || index >= fileNames.length) {
      assets[key] = { loaded: false, failed: true, img: null };
      return;
    }

    const img = new Image();
    const entry = { img, loaded: false, failed: false };
    assets[key] = entry;

    img.onload = () => {
      entry.loaded = true;
    };

    img.onerror = () => {
      tryLoadCandidate(key, fileNames, index + 1);
    };

    img.src = `${ASSET_BASE}/${fileNames[index]}`;
  }

  function initAssets() {
    Object.entries(ASSET_CANDIDATES).forEach(([key, fileNames]) => {
      tryLoadCandidate(key, fileNames);
    });
  }

  function drawImageOrFallback(assetKey, drawFallback, x, y, w, h, opts = {}) {
    const entry = assets[assetKey];
    if (entry && entry.loaded && entry.img) {
      ctx.save();
      if (opts.center) {
        ctx.translate(x + w * 0.5, y + h * 0.5);
        if (opts.rotation) ctx.rotate(opts.rotation);
        ctx.drawImage(entry.img, -w * 0.5, -h * 0.5, w, h);
      } else {
        ctx.drawImage(entry.img, x, y, w, h);
      }
      ctx.restore();
      return;
    }

    drawFallback();
  }

  function resetPlayer() {
    player.x = isTabletMode ? 240 : 150;
    player.w = isTabletMode ? 88 : 78;
    player.h = isTabletMode ? 34 : 30;
    player.vy = 0;
    player.fuel = player.maxFuel;
    player.landed = true;
    player.crashed = false;
    player.airborneStarted = false;
    player.angle = 0;
    player.engineOut = false;
    player.landedPlatform = null;
    player.landingCountdown = 0;
  }

  function resetWorld() {
    world.distance = 0;
    world.score = 0;
    world.successfulLandings = 0;
    world.bestLandingQuality = "None";
    world.obstaclesCleared = 0;
    world.nextObstacleSpawn = 900;
    world.nextPlatformSpawn = 1300;
    world.obstacles = [];
    world.platforms = [];
    world.terrain = [];
    world.stars = [];
    world.seaPhase = 0;

    targetWorldSpeed = 0;
    effectiveWorldSpeed = 0;

    seedStars();
    seedTerrain();
    seedStartPlatform();
    seedStartingScenery();
  }

  function seedStars() {
    const rect = getRect();
    world.stars = [];
    const count = isTabletMode ? 16 : 10;
    for (let i = 0; i < count; i++) {
      world.stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height * 0.42,
        r: Math.random() * 2 + 1,
        speed: Math.random() * 10 + 6
      });
    }
  }

  function nextTerrainWidth(type) {
    if (type === "water") {
      return (isTabletMode ? 760 : 620) + Math.random() * (isTabletMode ? 260 : 180);
    }
    return (isTabletMode ? 640 : 520) + Math.random() * (isTabletMode ? 220 : 170);
  }

  function createTerrainSegment(x, type, width) {
    return {
      x,
      w: width,
      type
    };
  }

  function seedTerrain() {
    const rect = getRect();
    world.terrain = [];
    let x = -200;
    let type = "water";

    while (x < rect.width + 2600) {
      const width = nextTerrainWidth(type);
      world.terrain.push(createTerrainSegment(x, type, width));
      x += width;
      type = type === "water" ? "land" : "water";
    }
  }

  function ensureTerrainCoverage() {
    const rect = getRect();
    while (
      world.terrain.length &&
      world.terrain[world.terrain.length - 1].x + world.terrain[world.terrain.length - 1].w < rect.width + 1800
    ) {
      const last = world.terrain[world.terrain.length - 1];
      const nextType = last.type === "water" ? "land" : "water";
      world.terrain.push(createTerrainSegment(last.x + last.w, nextType, nextTerrainWidth(nextType)));
    }
  }

  function getTerrainTypeAtX(x) {
    for (const seg of world.terrain) {
      if (x >= seg.x && x <= seg.x + seg.w) {
        return seg.type;
      }
    }
    return "water";
  }

  function getSpawnX() {
    const rect = getRect();
    return rect.width + 180;
  }

  function createPlatform(x, type) {
    const moving = type === "ship";
    const p = {
      type,
      x,
      y: 0,
      w: type === "ship" ? (isTabletMode ? 230 : 200) : (isTabletMode ? 260 : 220),
      h: type === "ship" ? (isTabletMode ? 70 : 70) : (isTabletMode ? 90 : 90),
      deckX: 0,
      deckY: 0,
      refuelZoneW: type === "ship" ? 102 : 112,
      motionPhase: Math.random() * Math.PI * 2,
      motionAmp: moving ? 5 : 0,
      passed: false,
      startPad: false,
      used: false,
      slowRadius: type === "ship" ? (isTabletMode ? 420 : 360) : (isTabletMode ? 440 : 380)
    };
    updatePlatformDeck(p);
    return p;
  }

  function updatePlatformDeck(p) {
    if (p.type === "ship") {
      p.y = groundY - 20;
      p.deckX = p.x + Math.round((p.w - p.refuelZoneW) * 0.5);
      p.deckY = p.y + 40;
    } else {
      p.y = groundY - 32;
      p.deckX = p.x + Math.round((p.w - p.refuelZoneW) * 0.5);
      p.deckY = p.y + 46;
    }
  }

  function seedStartPlatform() {
    const start = createPlatform(player.x - 45, "ship");
    start.startPad = true;
    start.motionAmp = 0;
    updatePlatformDeck(start);
    world.platforms.push(start);
  }

  function seedStartingScenery() {
    const rect = getRect();
    const firstLand = world.terrain.find((seg) => seg.type === "land" && seg.x + seg.w > rect.width * 0.5);
    if (!firstLand) return;

    const count = isTabletMode ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const type = i % 2 === 0 ? "tree" : "building";
      const baseX = Math.max(firstLand.x + 40, rect.width * 0.72 + i * 120);
      world.obstacles.push(createObstacle(type, baseX));
    }
  }

  function createObstacle(type, x) {
    const rect = getRect();

    if (type === "cloud") {
      const w = isTabletMode ? 150 : 124;
      const h = isTabletMode ? 74 : 60;
      return {
        type,
        x,
        y: rect.height * (0.12 + Math.random() * 0.22),
        w,
        h,
        speedMul: 1,
        passed: false
      };
    }

    if (type === "balloon") {
      const w = isTabletMode ? 72 : 58;
      const h = isTabletMode ? 98 : 82;
      return {
        type,
        x,
        y: rect.height * (0.16 + Math.random() * 0.34),
        w,
        h,
        speedMul: 1,
        bob: Math.random() * Math.PI * 2,
        passed: false
      };
    }

    if (type === "heli") {
      const w = isTabletMode ? 95 : 80;
      const h = isTabletMode ? 38 : 30;
      return {
        type,
        x,
        y: rect.height * (0.18 + Math.random() * 0.36),
        w,
        h,
        speedMul: 1.45,
        passed: false
      };
    }

    if (type === "jet") {
      const w = isTabletMode ? 98 : 82;
      const h = isTabletMode ? 30 : 24;
      return {
        type,
        x,
        y: rect.height * (0.1 + Math.random() * 0.28),
        w,
        h,
        speedMul: 1.9,
        passed: false
      };
    }

    if (type === "tree") {
      const h = isTabletMode ? 120 : 100;
      const w = isTabletMode ? 48 : 40;
      return {
        type,
        x,
        y: groundY - h - 2,
        w,
        h,
        speedMul: 1,
        passed: false
      };
    }

    const h = isTabletMode ? 160 : 130;
    const w = isTabletMode ? 74 : 60;
    return {
      type: "building",
      x,
      y: groundY - h - 2,
      w,
      h,
      speedMul: 1,
      passed: false
    };
  }

  function spawnObstacle() {
    const spawnX = getSpawnX();
    const terrainType = getTerrainTypeAtX(spawnX);
    const airborneWeights = ["cloud", "cloud", "balloon", "balloon", "heli", "jet"];
    const landWeights = ["tree", "tree", "tree", "building", "cloud", "balloon"];
    const pool = terrainType === "land" ? landWeights : airborneWeights;
    const type = pool[Math.floor(Math.random() * pool.length)];
    world.obstacles.push(createObstacle(type, spawnX));
  }

  function spawnPlatform() {
    const spawnX = getSpawnX() + 180;
    const terrainType = getTerrainTypeAtX(spawnX + 80);
    const type = terrainType === "land" ? "island" : "ship";
    world.platforms.push(createPlatform(spawnX, type));
  }

  function waitForPlayableArea(maxAttempts = 20) {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      function check() {
        attempts += 1;
        const ok = resizeCanvas();
        const rect = getRect();

        if (ok && rect.width > 50 && rect.height > 50) {
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error("Game area not ready"));
          return;
        }

        requestAnimationFrame(check);
      }

      requestAnimationFrame(check);
    });
  }

  async function startGame() {
    if (shouldRequireLandscape() && window.innerWidth <= window.innerHeight) {
      updateOrientationOverlay();
      return;
    }

    syncAppHeight();
    await tryFullscreen();
    syncAppHeight();

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    gameUi.classList.remove("hidden");

    try {
      await waitForPlayableArea();
    } catch {
      showMenu();
      return;
    }

    resetPlayer();
    resetWorld();

    const startPlatform = world.platforms[0];
    player.y = startPlatform.deckY - player.h + 2;
    player.landedPlatform = startPlatform;

    if (takeoffTimerEl) {
      takeoffTimerEl.classList.add("hidden");
    }

    gameState = "playing";
    updateHud();
    draw();
  }

  function showMenu() {
    gameState = "menu";
    gameUi.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    if (takeoffTimerEl) {
      takeoffTimerEl.classList.add("hidden");
    }
    renderStoredScores();
  }

  function flap() {
    if (gameState !== "playing") return;
    if (player.engineOut) return;

    if (player.landed) {
      player.landed = false;
      player.landedPlatform = null;
      player.airborneStarted = true;
      player.landingCountdown = 0;
      player.vy = player.flapImpulse;
      targetWorldSpeed = cruiseWorldSpeed;
      if (takeoffTimerEl) {
        takeoffTimerEl.classList.add("hidden");
      }
      return;
    }

    player.vy = player.flapImpulse;
  }

  function getLocalLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.localTop10) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocalLeaderboard(score, distance, landings) {
    const entries = getLocalLeaderboard();
    entries.push({ name: "You", score, distance, landings });
    entries.sort((a, b) => b.score - a.score);
    localStorage.setItem(STORAGE_KEYS.localTop10, JSON.stringify(entries.slice(0, 10)));
  }

  function renderStoredScores() {
    const pb = Number(localStorage.getItem(STORAGE_KEYS.personalBest) || 0);
    personalBestEl.textContent = pb.toLocaleString();

    const entries = getLocalLeaderboard();
    localLeaderboardEl.innerHTML = "";

    if (!entries.length) {
      const li = document.createElement("li");
      li.textContent = "No scores yet";
      localLeaderboardEl.appendChild(li);
      return;
    }

    entries.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.name} — ${entry.score.toLocaleString()}`;
      localLeaderboardEl.appendChild(li);
    });
  }

  function gameOver() {
    if (gameState === "gameover") return;

    gameState = "gameover";
    player.crashed = true;

    const score = Math.round(world.score);
    const distance = Math.round(world.distance);
    const personalBest = Number(localStorage.getItem(STORAGE_KEYS.personalBest) || 0);

    finalScore.textContent = score.toLocaleString();
    finalDistance.textContent = `${distance.toLocaleString()} m`;
    finalLandings.textContent = world.successfulLandings;
    finalLandingQuality.textContent = world.bestLandingQuality;

    if (score > personalBest) {
      localStorage.setItem(STORAGE_KEYS.personalBest, String(score));
      newPersonalBest.classList.remove("hidden");
    } else {
      newPersonalBest.classList.add("hidden");
    }

    saveLocalLeaderboard(score, distance, world.successfulLandings);

    if (takeoffTimerEl) {
      takeoffTimerEl.classList.add("hidden");
    }

    gameUi.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
    renderStoredScores();
  }

  function getLandingAssistData() {
    const playerCentreX = player.x + player.w * 0.5;
    const playerCentreY = player.y + player.h * 0.5;
    let best = null;
    let bestDistance = Infinity;

    for (const p of world.platforms) {
      if (p.used) continue;

      const padCentreX = p.deckX + p.refuelZoneW * 0.5;
      const padCentreY = p.deckY + 6;
      const dx = padCentreX - playerCentreX;
      const dy = padCentreY - playerCentreY;
      const distance = Math.hypot(dx, dy);

      if (dx >= -80 && distance < bestDistance) {
        bestDistance = distance;
        best = { platform: p, dx, dy, distance, radius: p.slowRadius };
      }
    }

    return best;
  }

  function updateTakeoffTimer(dt) {
    if (!takeoffTimerEl) return;

    if (player.landed && player.airborneStarted && player.landedPlatform && !player.landedPlatform.startPad) {
      if (player.landingCountdown <= 0) {
        player.landingCountdown = player.landingCountdownLimit;
      }
      player.landingCountdown -= dt;
      takeoffTimerEl.classList.remove("hidden");
      takeoffTimerEl.textContent = `Take off: ${Math.max(0, player.landingCountdown).toFixed(1)}s`;

      if (player.landingCountdown <= 0) {
        gameOver();
      }
      return;
    }

    player.landingCountdown = 0;
    takeoffTimerEl.classList.add("hidden");
  }

  function update(dt) {
    if (gameState !== "playing") return;

    const rect = getRect();
    if (!rect.width || !rect.height || !groundY) return;

    const assist = getLandingAssistData();

    let desiredSpeed = 0;
    if (player.landed && !player.airborneStarted) {
      desiredSpeed = 0;
    } else if (player.landed) {
      desiredSpeed = 12;
    } else {
      desiredSpeed = cruiseWorldSpeed;

      if (assist && assist.distance < assist.radius) {
        const t = Math.max(0, Math.min(1, assist.distance / assist.radius));
        desiredSpeed = 45 + (cruiseWorldSpeed - 45) * t;
      }
    }

    targetWorldSpeed = desiredSpeed;
    effectiveWorldSpeed += (targetWorldSpeed - effectiveWorldSpeed) * Math.min(1, dt * 3.2);
    world.seaPhase += dt * 1.6;

    if (!player.landed) {
      player.vy += player.gravity * dt;
      player.vy = Math.min(player.vy, player.maxFall);

      if (assist && assist.distance < assist.radius * 0.7 && player.vy > 260) {
        player.vy = 260;
      }

      player.y += player.vy * dt;

      world.distance += effectiveWorldSpeed * dt * 0.1;

      player.fuel -= player.fuelBurnRate * dt;
      if (player.fuel <= 0) {
        player.fuel = 0;
        player.engineOut = true;
      }

      world.nextObstacleSpawn -= effectiveWorldSpeed * dt;
      world.nextPlatformSpawn -= effectiveWorldSpeed * dt;

      if (world.nextObstacleSpawn <= 0) {
        spawnObstacle();
        world.nextObstacleSpawn = 360 + Math.random() * 240;
      }

      if (world.nextPlatformSpawn <= 0) {
        spawnPlatform();
        world.nextPlatformSpawn = 1200 + Math.random() * 700;
      }
    } else {
      player.vy = 0;

      if (player.landedPlatform) {
        player.y = player.landedPlatform.deckY - player.h + 2;
      }

      if (player.airborneStarted) {
        player.fuel += player.refuelRate * dt;
        player.fuel = Math.min(player.fuel, player.maxFuel);
        if (player.fuel > 8) {
          player.engineOut = false;
        }
      }
    }

    updateBackground(dt, rect);
    updateTerrain(dt);
    updatePlatforms(dt);
    updateObstacles(dt);
    updatePlayerAngle(dt);
    updateTakeoffTimer(dt);

    if (player.y < 18) {
      player.y = 18;
      player.vy = 50;
    }

    if (!player.landed && player.y + player.h >= groundY + 26) {
      gameOver();
      return;
    }

    checkPlatformLanding();
    checkCollisions();

    const landingBonus =
      world.bestLandingQuality === "Perfect" ? 500 :
      world.bestLandingQuality === "Good" ? 250 :
      world.bestLandingQuality === "Safe" ? 100 : 0;

    world.score =
      Math.round(world.distance) +
      world.successfulLandings * 250 +
      world.obstaclesCleared * 25 +
      landingBonus;

    updateHud();
  }

  function updateBackground(dt, rect) {
    world.stars.forEach((s) => {
      s.x -= (s.speed + effectiveWorldSpeed * 0.03) * dt;
      if (s.x < -5) {
        s.x = rect.width + 5;
        s.y = Math.random() * rect.height * 0.42;
      }
    });
  }

  function updateTerrain(dt) {
    for (let i = world.terrain.length - 1; i >= 0; i--) {
      const seg = world.terrain[i];
      seg.x -= effectiveWorldSpeed * dt;
      if (seg.x + seg.w < -240) {
        world.terrain.splice(i, 1);
      }
    }
    ensureTerrainCoverage();
  }

  function updatePlatforms(dt) {
    for (let i = world.platforms.length - 1; i >= 0; i--) {
      const p = world.platforms[i];
      const activeLandingPad = player.landed && player.landedPlatform === p;
      const anchoredStartPad = p.startPad && !player.airborneStarted;

      if (!activeLandingPad && !anchoredStartPad) {
        p.x -= effectiveWorldSpeed * dt;
      }

      if (p.type === "ship" && p.motionAmp > 0) {
        p.motionPhase += dt * 1.4;
      }

      updatePlatformDeck(p);

      if (p.type === "ship" && p.motionAmp > 0) {
        p.y = groundY - 20 + Math.sin(p.motionPhase) * p.motionAmp;
        p.deckY = p.y + 40;
      }

      if (activeLandingPad) {
        player.y = p.deckY - player.h + 2;
      }

      if (!p.passed && p.x + p.w < player.x) {
        p.passed = true;
      }

      if (p.x + p.w < -180) {
        if (player.landedPlatform === p) {
          player.landedPlatform = null;
        }
        world.platforms.splice(i, 1);
      }
    }
  }

  function updateObstacles(dt) {
    for (let i = world.obstacles.length - 1; i >= 0; i--) {
      const o = world.obstacles[i];
      o.x -= effectiveWorldSpeed * o.speedMul * dt;

      if (o.type === "balloon") {
        o.bob += dt * 2;
        o.y += Math.sin(o.bob) * 12 * dt;
      }

      if (!o.passed && o.x + o.w < player.x) {
        o.passed = true;
        world.obstaclesCleared += 1;
      }

      if (o.x + o.w < -180) {
        world.obstacles.splice(i, 1);
      }
    }
  }

  function updatePlayerAngle(dt) {
    let targetAngle = 0;

    if (player.landed) {
      targetAngle = 0;
    } else if (player.engineOut) {
      targetAngle = 0.24;
    } else if (player.vy < -80) {
      targetAngle = -0.2;
    } else if (player.vy > 130) {
      targetAngle = 0.16;
    } else {
      targetAngle = 0.08;
    }

    player.angle += (targetAngle - player.angle) * Math.min(1, dt * 8);
  }

  function getPlayerBox() {
    return {
      x: player.x + 10,
      y: player.y + 6,
      w: player.w - 20,
      h: player.h - 12
    };
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function checkCollisions() {
    if (player.landed) return;

    const pb = getPlayerBox();

    for (const o of world.obstacles) {
      const ob = { x: o.x, y: o.y, w: o.w, h: o.h };
      if (rectsOverlap(pb, ob)) {
        gameOver();
        return;
      }
    }
  }

  function checkPlatformLanding() {
    if (player.landed) return;

    const skidY = player.y + player.h;
    const centreX = player.x + player.w * 0.5;

    for (const p of world.platforms) {
      const landingZone = {
        x: p.deckX - 18,
        y: p.deckY - 10,
        w: p.refuelZoneW + 36,
        h: 34
      };

      const overLandingZone = centreX >= landingZone.x && centreX <= landingZone.x + landingZone.w;
      const nearDeck = skidY >= landingZone.y - 4 && skidY <= landingZone.y + landingZone.h;

      if (overLandingZone && nearDeck && player.vy >= 0) {
        const speed = Math.abs(player.vy);

        if (speed > 320) {
          gameOver();
          return;
        }

        player.y = p.deckY - player.h + 2;
        player.vy = 0;
        player.landed = true;
        player.landedPlatform = p;
        player.landingCountdown = p.startPad ? 0 : player.landingCountdownLimit;
        p.used = true;

        let quality = "Safe";
        if (speed < 60) quality = "Perfect";
        else if (speed < 130) quality = "Good";

        world.bestLandingQuality = rankLandingQuality(world.bestLandingQuality, quality);

        if (!p.startPad) {
          world.successfulLandings += 1;
        }

        return;
      }
    }
  }

  function rankLandingQuality(current, next) {
    const order = { None: 0, Safe: 1, Good: 2, Perfect: 3 };
    return order[next] > order[current] ? next : current;
  }

  function updateHud() {
    distanceValue.textContent = `${Math.round(world.distance).toLocaleString()} m`;
    scoreValue.textContent = `${Math.round(world.score).toLocaleString()}`;
    fuelFill.style.transform = `scaleY(${Math.max(0, player.fuel / player.maxFuel)})`;
  }

  function draw() {
    const rect = getRect();
    if (!rect.width || !rect.height) return;

    ctx.clearRect(0, 0, rect.width, rect.height);

    drawSky(rect);
    drawCloudBands(rect);
    drawWater(rect);
    drawTerrain();
    drawPlatforms();
    drawObstacles();
    drawPlayer();
  }

  function drawSky(rect) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, rect.height);
    skyGrad.addColorStop(0, isTabletMode ? "#0c2743" : "#0e2440");
    skyGrad.addColorStop(0.52, isTabletMode ? "#27628c" : "#21557a");
    skyGrad.addColorStop(1, "#1d4b6b");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    world.stars.forEach((s) => {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawCloudBands(rect) {
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(
        rect.width * (0.18 + i * 0.24),
        rect.height * (0.16 + (i % 2) * 0.05),
        rect.width * 0.15,
        rect.height * 0.035,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  function drawWater(rect) {
    const seaTop = groundY;
    const seaGrad = ctx.createLinearGradient(0, seaTop, 0, rect.height);
    seaGrad.addColorStop(0, "#1a6385");
    seaGrad.addColorStop(1, "#0b2e46");
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, seaTop, rect.width, rect.height - seaTop);

    const waveCount = isTabletMode ? 28 : 22;
    ctx.lineWidth = isTabletMode ? 3 : 2;

    for (let row = 0; row < 3; row++) {
      ctx.beginPath();
      ctx.strokeStyle = row === 0 ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.14)";
      const yBase = seaTop + 16 + row * 14;
      for (let i = 0; i <= waveCount; i++) {
        const x = (rect.width / waveCount) * i;
        const y = yBase + Math.sin((i * 0.9) + world.seaPhase * (1.4 + row * 0.35)) * (4 + row * 1.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawTerrain() {
    for (const seg of world.terrain) {
      if (seg.type !== "land") continue;

      ctx.save();
      ctx.fillStyle = "#8c7555";
      ctx.fillRect(seg.x, groundY - 4, seg.w, canvas.clientHeight - groundY + 12);
      ctx.fillStyle = "#5b8d48";
      ctx.fillRect(seg.x, groundY - 16, seg.w, 16);
      ctx.restore();
    }
  }

  function drawPlatforms() {
    for (const p of world.platforms) {
      if (p.type === "ship") drawShip(p);
      else drawIsland(p);
    }
  }

  function drawShip(p) {
    drawImageOrFallback(
      "ship",
      () => {
        ctx.save();
        ctx.fillStyle = "#6f7f8f";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 20);
        ctx.lineTo(p.x + p.w * 0.9, p.y + 20);
        ctx.lineTo(p.x + p.w, p.y + 40);
        ctx.lineTo(p.x + p.w * 0.18, p.y + 40);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#8c9aaa";
        ctx.fillRect(p.x + p.w * 0.16, p.y + 4, p.w * 0.24, 16);

        ctx.fillStyle = "#36424f";
        ctx.fillRect(p.deckX, p.deckY, p.refuelZoneW, 10);

        ctx.strokeStyle = "#f4f7fb";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 2);
        ctx.lineTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 18);
        ctx.moveTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 2);
        ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 18);
        ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 10);
        ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 10);
        ctx.stroke();
        ctx.restore();
      },
      p.x,
      p.y,
      p.w,
      p.h
    );
  }

  function drawIsland(p) {
    ctx.save();

    ctx.fillStyle = "#9f845c";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y + 56, p.w * 0.52, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#609653";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y + 44, p.w * 0.46, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d4f57";
    roundRect(ctx, p.deckX - 6, p.deckY, p.refuelZoneW + 12, 14, 7);
    ctx.fill();

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 2);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 18);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 2);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 18);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 10);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 10);
    ctx.stroke();

    ctx.restore();
  }

  function drawObstacles() {
    for (const o of world.obstacles) {
      if (o.type === "cloud") drawStormCloud(o);
      else if (o.type === "balloon") drawBalloon(o);
      else if (o.type === "heli") drawEnemyHeli(o);
      else if (o.type === "jet") drawJet(o);
      else if (o.type === "tree") drawTree(o);
      else drawBuilding(o);
    }
  }

  function drawStormCloud(o) {
    drawImageOrFallback(
      "cloud",
      () => {
        ctx.save();
        ctx.fillStyle = "#2e3640";
        ctx.beginPath();
        ctx.ellipse(o.x + o.w * 0.25, o.y + o.h * 0.55, o.w * 0.22, o.h * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(o.x + o.w * 0.5, o.y + o.h * 0.42, o.w * 0.25, o.h * 0.28, 0, 0, Math.PI * 2);
        ctx.ellipse(o.x + o.w * 0.73, o.y + o.h * 0.55, o.w * 0.22, o.h * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1f242b";
        ctx.fillRect(o.x + o.w * 0.14, o.y + o.h * 0.55, o.w * 0.72, o.h * 0.2);

        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.45, o.y + o.h * 0.72);
        ctx.lineTo(o.x + o.w * 0.4, o.y + o.h * 0.9);
        ctx.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.9);
        ctx.lineTo(o.x + o.w * 0.44, o.y + o.h * 1.06);
        ctx.stroke();
        ctx.restore();
      },
      o.x,
      o.y,
      o.w,
      o.h
    );
  }

  function drawBalloon(o) {
    ctx.save();
    ctx.fillStyle = "#f07d4c";
    ctx.beginPath();
    ctx.ellipse(o.x + o.w * 0.5, o.y + o.h * 0.35, o.w * 0.35, o.h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f3f7fb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.4, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.46, o.y + o.h * 0.78);
    ctx.moveTo(o.x + o.w * 0.6, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.54, o.y + o.h * 0.78);
    ctx.stroke();

    ctx.fillStyle = "#60422f";
    ctx.fillRect(o.x + o.w * 0.42, o.y + o.h * 0.78, o.w * 0.16, o.h * 0.1);
    ctx.restore();
  }

  function drawEnemyHeli(o) {
    drawImageOrFallback(
      "enemyHeli",
      () => {
        ctx.save();
        ctx.fillStyle = "#d9e2ea";
        ctx.fillRect(o.x + o.w * 0.18, o.y + o.h * 0.3, o.w * 0.52, o.h * 0.4);
        ctx.fillRect(o.x + o.w * 0.66, o.y + o.h * 0.4, o.w * 0.22, o.h * 0.12);
        ctx.fillRect(o.x + o.w * 0.1, o.y + o.h * 0.18, o.w * 0.72, o.h * 0.06);
        ctx.fillRect(o.x + o.w * 0.76, o.y + o.h * 0.12, o.w * 0.08, o.h * 0.28);
        ctx.restore();
      },
      o.x,
      o.y,
      o.w,
      o.h
    );
  }

  function drawJet(o) {
    drawImageOrFallback(
      "jet",
      () => {
        ctx.save();
        ctx.fillStyle = "#c6ccd4";
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + o.h * 0.55);
        ctx.lineTo(o.x + o.w * 0.62, o.y + o.h * 0.35);
        ctx.lineTo(o.x + o.w, o.y + o.h * 0.5);
        ctx.lineTo(o.x + o.w * 0.62, o.y + o.h * 0.65);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(o.x + o.w * 0.35, o.y + o.h * 0.18, o.w * 0.12, o.h * 0.64);
        ctx.restore();
      },
      o.x,
      o.y,
      o.w,
      o.h
    );
  }

  function drawTree(o) {
    drawImageOrFallback(
      "tree",
      () => {
        ctx.save();
        ctx.fillStyle = "#6f4a2d";
        ctx.fillRect(o.x + o.w * 0.42, o.y + o.h * 0.64, o.w * 0.16, o.h * 0.36);

        ctx.fillStyle = "#2f7b44";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.5, o.y);
        ctx.lineTo(o.x + o.w * 0.1, o.y + o.h * 0.62);
        ctx.lineTo(o.x + o.w * 0.9, o.y + o.h * 0.62);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },
      o.x,
      o.y,
      o.w,
      o.h
    );
  }

  function drawBuilding(o) {
    drawImageOrFallback(
      "building",
      () => {
        ctx.save();
        ctx.fillStyle = "#6c7784";
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.fillStyle = "#9fb4c6";
        const cols = 2;
        const rows = 5;
        const winW = o.w / 7;
        const winH = o.h / 14;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.fillRect(
              o.x + 10 + c * (winW + 10),
              o.y + 10 + r * (winH + 10),
              winW,
              winH
            );
          }
        }

        ctx.restore();
      },
      o.x,
      o.y,
      o.w,
      o.h
    );
  }

  function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const w = player.w;
    const h = player.h;

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.42, groundY + 14, w * 0.42, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    drawImageOrFallback(
      "wildcat",
      () => {
        ctx.save();
        ctx.translate(x + w * 0.5, y + h * 0.5);
        ctx.rotate(player.angle);

        ctx.fillStyle = "#e7eef5";
        ctx.fillRect(-w * 0.36, -h * 0.24, w * 0.54, h * 0.46);
        ctx.fillRect(w * 0.14, -h * 0.12, w * 0.22, h * 0.1);

        ctx.fillStyle = "#9fd1ff";
        ctx.fillRect(-w * 0.28, -h * 0.18, w * 0.18, h * 0.14);

        ctx.fillStyle = "#333";
        ctx.fillRect(-w * 0.42, -h * 0.36, w * 0.72, h * 0.06);
        ctx.fillRect(w * 0.24, -h * 0.4, w * 0.07, h * 0.26);

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.28, h * 0.26);
        ctx.lineTo(w * 0.18, h * 0.26);
        ctx.moveTo(-w * 0.24, h * 0.26);
        ctx.lineTo(-w * 0.3, h * 0.4);
        ctx.moveTo(w * 0.15, h * 0.26);
        ctx.lineTo(w * 0.22, h * 0.4);
        ctx.stroke();

        if (!player.landed) {
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-w * 0.48, -h * 0.34);
          ctx.lineTo(w * 0.42, -h * 0.34);
          ctx.stroke();
        }

        ctx.restore();
      },
      x,
      y,
      w,
      h,
      { center: true, rotation: player.angle }
    );
  }

  function roundRect(ctx2d, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.lineTo(x + width - r, y);
    ctx2d.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx2d.lineTo(x + width, y + height - r);
    ctx2d.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx2d.lineTo(x + r, y + height);
    ctx2d.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx2d.lineTo(x, y + r);
    ctx2d.quadraticCurveTo(x, y, x + r, y);
    ctx2d.closePath();
  }

  function loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
    lastTime = timestamp;

    updateOrientationOverlay();
    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  function onPointerDown(e) {
    if (e.target && typeof e.target.closest === "function" && e.target.closest("button")) return;
    flap();
  }

  function onKeyDown(e) {
    if (e.code === "Space") {
      e.preventDefault();
      flap();
    }
  }

  function init() {
    syncAppHeight();
    ensureTakeoffTimer();
    initAssets();
    renderStoredScores();
    updateOrientationOverlay();

    playBtn.addEventListener("click", startGame);
    playAgainBtn.addEventListener("click", startGame);
    backToMenuBtn.addEventListener("click", showMenu);

    window.addEventListener("resize", () => {
      syncAppHeight();
      updateOrientationOverlay();
      resizeCanvas();
    });

    window.addEventListener("orientationchange", () => {
      syncAppHeight();
      updateOrientationOverlay();
      resizeCanvas();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => {
        syncAppHeight();
        resizeCanvas();
      });
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: false });
    document.addEventListener("keydown", onKeyDown);

    resizeCanvas();
    requestAnimationFrame(loop);
  }

  init();
})();
