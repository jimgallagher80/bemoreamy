(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const rotateOverlay = document.getElementById("rotateOverlay");
  const startScreen = document.getElementById("startScreen");
  const gameUi = document.getElementById("gameUi");
  const gameOverScreen = document.getElementById("gameOverScreen");

  const playBtn = document.getElementById("playBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const backToMenuBtn = document.getElementById("backToMenuBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  const distanceValue = document.getElementById("distanceValue");
  const scoreValue = document.getElementById("scoreValue");
  const fuelFill = document.getElementById("fuelFill");
  const statusValue = document.getElementById("statusValue");

  const finalScore = document.getElementById("finalScore");
  const finalDistance = document.getElementById("finalDistance");
  const finalLandings = document.getElementById("finalLandings");
  const finalLandingQuality = document.getElementById("finalLandingQuality");
  const newPersonalBest = document.getElementById("newPersonalBest");
  const personalBestEl = document.getElementById("personalBest");
  const localLeaderboardEl = document.getElementById("localLeaderboard");

  const STORAGE_KEYS = {
    personalBest: "heliPassage:personalBest",
    localTop10: "heliPassage:localTop10"
  };

  const BASE_WIDTH = 1600;
  const BASE_HEIGHT = 900;

  let gameState = "menu";
  let lastTime = 0;
  let inputHeld = false;
  let worldSpeed = 360;
  let targetWorldSpeed = 360;
  let effectiveWorldSpeed = 360;
  let isTabletMode = false;
  let isDesktopMode = false;
  let groundY = 760;

  const player = {
    x: 280,
    y: 320,
    w: 110,
    h: 44,
    vy: 0,
    gravity: 1100,
    thrust: -1400,
    maxFall: 900,
    fuel: 100,
    maxFuel: 100,
    fuelBurnRate: 9,
    refuelRate: 36,
    landed: false,
    crashed: false
  };

  const world = {
    distance: 0,
    score: 0,
    successfulLandings: 0,
    bestLandingQuality: "None",
    obstaclesCleared: 0,
    nextObstacleSpawn: 0,
    nextPlatformSpawn: 1400,
    skyObjects: [],
    obstacles: [],
    platforms: [],
    stars: [],
    seaPhase: 0,
    fuelOutFalling: false
  };

  function getDeviceMode() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const landscape = width > height;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    isDesktopMode = !coarse;
    isTabletMode = coarse && Math.max(width, height) >= 1000;

    return { width, height, landscape, coarse };
  }

  function shouldRequireLandscape() {
    const { coarse } = getDeviceMode();
    return coarse;
  }

  function updateOrientationOverlay() {
    const { landscape } = getDeviceMode();
    if (shouldRequireLandscape() && !landscape) {
      rotateOverlay.classList.remove("hidden");
    } else {
      rotateOverlay.classList.add("hidden");
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    groundY = rect.height * 0.84;
  }

  function resetPlayer() {
    player.x = isTabletMode ? 340 : 280;
    player.y = isTabletMode ? 300 : 320;
    player.w = isTabletMode ? 130 : 110;
    player.h = isTabletMode ? 52 : 44;
    player.vy = 0;
    player.fuel = player.maxFuel;
    player.landed = false;
    player.crashed = false;
  }

  function resetWorld() {
    world.distance = 0;
    world.score = 0;
    world.successfulLandings = 0;
    world.bestLandingQuality = "None";
    world.obstaclesCleared = 0;
    world.nextObstacleSpawn = 420;
    world.nextPlatformSpawn = 1500;
    world.skyObjects = [];
    world.obstacles = [];
    world.platforms = [];
    world.stars = [];
    world.seaPhase = 0;
    world.fuelOutFalling = false;
    targetWorldSpeed = 360;
    effectiveWorldSpeed = 360;
    worldSpeed = 360;
    seedBackgroundStars();
    seedInitialPlatforms();
  }

  function seedBackgroundStars() {
    world.stars.length = 0;
    const rect = canvas.getBoundingClientRect();
    const count = isTabletMode ? 16 : 10;
    for (let i = 0; i < count; i++) {
      world.stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height * 0.45,
        r: Math.random() * 2 + 1,
        speed: Math.random() * 10 + 6
      });
    }
  }

  function seedInitialPlatforms() {
    const rect = canvas.getBoundingClientRect();
    world.platforms.push(createPlatform(rect.width + 500, "ship"));
    world.platforms.push(createPlatform(rect.width + 1700, "island"));
  }

  function startGame() {
    if (shouldRequireLandscape() && window.innerWidth <= window.innerHeight) {
      updateOrientationOverlay();
      return;
    }

    resizeCanvas();
    resetPlayer();
    resetWorld();

    gameState = "playing";
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    gameUi.classList.remove("hidden");
    statusValue.textContent = "Flying";
    pauseBtn.textContent = "Pause";
  }

  function showMenu() {
    gameState = "menu";
    gameUi.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    renderStoredScores();
  }

  function pauseGame() {
    if (gameState === "playing") {
      gameState = "paused";
      pauseBtn.textContent = "Resume";
      statusValue.textContent = "Paused";
    } else if (gameState === "paused") {
      gameState = "playing";
      pauseBtn.textContent = "Pause";
      statusValue.textContent = "Flying";
    }
  }

  function gameOver() {
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

    gameUi.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
    renderStoredScores();
  }

  function saveLocalLeaderboard(score, distance, landings) {
    const entries = getLocalLeaderboard();
    entries.push({
      name: "You",
      score,
      distance,
      landings
    });
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.localTop10, JSON.stringify(trimmed));
  }

  function getLocalLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.localTop10) || "[]");
    } catch {
      return [];
    }
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

  function createObstacle(type, x) {
    const rect = canvas.getBoundingClientRect();

    if (type === "cloud") {
      return {
        type,
        x,
        y: rect.height * (0.14 + Math.random() * 0.25),
        w: isTabletMode ? 180 : 150,
        h: isTabletMode ? 90 : 72,
        speedMul: 1,
        passed: false
      };
    }

    if (type === "balloon") {
      return {
        type,
        x,
        y: rect.height * (0.15 + Math.random() * 0.38),
        w: isTabletMode ? 90 : 72,
        h: isTabletMode ? 120 : 96,
        speedMul: 1,
        bob: Math.random() * Math.PI * 2,
        passed: false
      };
    }

    if (type === "heli") {
      return {
        type,
        x,
        y: rect.height * (0.18 + Math.random() * 0.38),
        w: isTabletMode ? 120 : 96,
        h: isTabletMode ? 48 : 40,
        speedMul: 1.55,
        passed: false
      };
    }

    if (type === "jet") {
      return {
        type,
        x,
        y: rect.height * (0.12 + Math.random() * 0.32),
        w: isTabletMode ? 120 : 100,
        h: isTabletMode ? 42 : 34,
        speedMul: 2.2,
        passed: false
      };
    }

    if (type === "tree") {
      return {
        type,
        x,
        w: isTabletMode ? 80 : 62,
        h: isTabletMode ? 200 : 150,
        y: groundY - (isTabletMode ? 200 : 150),
        speedMul: 1,
        passed: false
      };
    }

    return {
      type: "building",
      x,
      w: isTabletMode ? 120 : 95,
      h: isTabletMode ? 280 : 220,
      y: groundY - (isTabletMode ? 280 : 220),
      speedMul: 1,
      passed: false
    };
  }

  function createPlatform(x, type) {
    const rect = canvas.getBoundingClientRect();
    const baseY = groundY - 24;
    const moving = type === "ship";

    return {
      type,
      x,
      y: moving ? baseY + Math.random() * 16 : baseY,
      w: type === "ship" ? (isTabletMode ? 260 : 220) : (isTabletMode ? 300 : 250),
      h: type === "ship" ? (isTabletMode ? 78 : 64) : (isTabletMode ? 105 : 88),
      deckX: 0,
      deckY: 0,
      refuelZoneW: type === "ship" ? (isTabletMode ? 140 : 120) : (isTabletMode ? 160 : 140),
      motionPhase: Math.random() * Math.PI * 2,
      motionAmp: moving ? 8 : 0,
      passed: false,
      used: false
    };
  }

  function spawnObstacle() {
    const rect = canvas.getBoundingClientRect();
    const types = ["cloud", "balloon", "heli", "jet", "tree", "building"];
    const weighted = ["cloud", "cloud", "balloon", "heli", "jet", "tree", "tree", "building", "building"];
    const type = weighted[Math.floor(Math.random() * weighted.length)];
    world.obstacles.push(createObstacle(type, rect.width + 200));
  }

  function spawnPlatform() {
    const rect = canvas.getBoundingClientRect();
    const type = Math.random() < 0.5 ? "ship" : "island";
    world.platforms.push(createPlatform(rect.width + 300, type));
  }

  function update(dt) {
    if (gameState !== "playing") return;

    const rect = canvas.getBoundingClientRect();

    effectiveWorldSpeed += (targetWorldSpeed - effectiveWorldSpeed) * Math.min(1, dt * 2.5);
    world.distance += effectiveWorldSpeed * dt * 0.1;
    world.seaPhase += dt * 1.8;

    if (!player.landed) {
      if (inputHeld && player.fuel > 0) {
        player.vy += player.thrust * dt;
      }

      player.vy += player.gravity * dt;
      player.vy = Math.min(player.vy, player.maxFall);
      player.y += player.vy * dt;

      player.fuel -= player.fuelBurnRate * dt;
      if (player.fuel <= 0) {
        player.fuel = 0;
        world.fuelOutFalling = true;
      }

      if (world.fuelOutFalling) {
        statusValue.textContent = "Out of fuel";
      } else {
        statusValue.textContent = "Flying";
      }
    } else {
      player.vy = 0;
      player.fuel += player.refuelRate * dt;
      player.fuel = Math.min(player.fuel, player.maxFuel);

      statusValue.textContent = "Refuelling";

      if (player.fuel >= player.maxFuel - 0.01) {
        player.landed = false;
        targetWorldSpeed = worldSpeed;
        statusValue.textContent = "Flying";
      }
    }

    if (!player.landed) {
      world.nextObstacleSpawn -= effectiveWorldSpeed * dt;
      world.nextPlatformSpawn -= effectiveWorldSpeed * dt;

      if (world.nextObstacleSpawn <= 0) {
        spawnObstacle();
        world.nextObstacleSpawn = 300 + Math.random() * 350;
      }

      if (world.nextPlatformSpawn <= 0) {
        spawnPlatform();
        world.nextPlatformSpawn = 1200 + Math.random() * 900;
      }
    }

    updateBackground(dt, rect);
    updatePlatforms(dt);
    updateObstacles(dt);

    if (player.y < 20) {
      player.y = 20;
      player.vy = 80;
    }

    if (player.y + player.h >= groundY + 40) {
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
      s.x -= s.speed * dt;
      if (s.x < -5) {
        s.x = rect.width + 5;
        s.y = Math.random() * rect.height * 0.45;
      }
    });
  }

  function updatePlatforms(dt) {
    for (let i = world.platforms.length - 1; i >= 0; i--) {
      const p = world.platforms[i];

      if (!player.landed) {
        p.x -= effectiveWorldSpeed * dt;
      }

      if (p.type === "ship") {
        p.motionPhase += dt * 1.5;
        p.y = groundY - 24 + Math.sin(p.motionPhase) * p.motionAmp;
      }

      p.deckX = p.x + p.w * 0.5 - p.refuelZoneW * 0.5;
      p.deckY = p.y - 12;

      if (!p.passed && p.x + p.w < player.x) {
        p.passed = true;
      }

      if (p.x + p.w < -100) {
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
        o.y += Math.sin(o.bob) * 18 * dt;
      }

      if (!o.passed && o.x + o.w < player.x) {
        o.passed = true;
        world.obstaclesCleared += 1;
      }

      if (o.x + o.w < -150) {
        world.obstacles.splice(i, 1);
      }
    }
  }

  function getPlayerBox() {
    return {
      x: player.x + 6,
      y: player.y + 4,
      w: player.w - 12,
      h: player.h - 8
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
      const ob = {
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h
      };

      if (rectsOverlap(pb, ob)) {
        gameOver();
        return;
      }
    }
  }

  function checkPlatformLanding() {
    if (player.landed) return;

    const pb = getPlayerBox();

    for (const p of world.platforms) {
      const landingZone = {
        x: p.deckX,
        y: p.deckY,
        w: p.refuelZoneW,
        h: 16
      };

      const overLandingZone =
        pb.x + pb.w * 0.5 > landingZone.x &&
        pb.x + pb.w * 0.5 < landingZone.x + landingZone.w;

      const descendingOntoDeck =
        pb.y + pb.h >= landingZone.y - 4 &&
        pb.y + pb.h <= landingZone.y + 18;

      if (overLandingZone && descendingOntoDeck && player.vy >= 0) {
        const speed = Math.abs(player.vy);

        if (speed > 380) {
          gameOver();
          return;
        }

        player.y = landingZone.y - player.h + 2;
        player.vy = 0;
        player.landed = true;
        p.used = true;
        targetWorldSpeed = 28;

        let quality = "Safe";
        if (speed < 120) quality = "Perfect";
        else if (speed < 220) quality = "Good";

        world.bestLandingQuality = rankLandingQuality(world.bestLandingQuality, quality);
        world.successfulLandings += 1;
        return;
      }

      const bodyHitsSide =
        rectsOverlap(pb, { x: p.x, y: p.y - p.h, w: p.w, h: p.h + 24 }) &&
        !overLandingZone &&
        pb.y + pb.h > p.deckY - 10;

      if (bodyHitsSide) {
        gameOver();
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
    fuelFill.style.transform = `scaleX(${Math.max(0, player.fuel / player.maxFuel)})`;

    if (player.fuel < 20) {
      fuelFill.style.filter = "saturate(1.2) brightness(1.05)";
    } else {
      fuelFill.style.filter = "none";
    }
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    drawSky(rect);
    drawCloudBands(rect);
    drawSea(rect);
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

    if (isTabletMode) {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const y = 90 + i * 38;
        ctx.ellipse(220 + i * 180, y, 170, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCloudBands(rect) {
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(
        rect.width * (0.18 + i * 0.24),
        rect.height * (0.18 + (i % 2) * 0.05),
        rect.width * 0.15,
        rect.height * 0.04,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  function drawSea(rect) {
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
      const yBase = seaTop + 22 + row * 18;
      for (let i = 0; i <= waveCount; i++) {
        const x = (rect.width / waveCount) * i;
        const y = yBase + Math.sin((i * 0.9) + world.seaPhase * (1.5 + row * 0.4)) * (6 + row * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawPlatforms() {
    for (const p of world.platforms) {
      if (p.type === "ship") drawShip(p);
      else drawIsland(p);
    }
  }

  function drawShip(p) {
    ctx.save();

    ctx.fillStyle = "#6f7f8f";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.w * 0.9, p.y);
    ctx.lineTo(p.x + p.w, p.y + 24);
    ctx.lineTo(p.x + p.w * 0.18, p.y + 24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8c9aaa";
    ctx.fillRect(p.x + p.w * 0.16, p.y - 20, p.w * 0.28, 20);

    ctx.fillStyle = "#36424f";
    ctx.fillRect(p.deckX, p.deckY, p.refuelZoneW, 12);

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 6);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 26);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 6);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 26);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 16);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 16);
    ctx.stroke();

    ctx.restore();
  }

  function drawIsland(p) {
    ctx.save();

    ctx.fillStyle = "#9f845c";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y + 16, p.w * 0.52, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#609653";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y + 2, p.w * 0.46, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d4f57";
    ctx.beginPath();
    ctx.roundRect(p.deckX - 8, p.deckY - 2, p.refuelZoneW + 16, 18, 8);
    ctx.fill();

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 6);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 26);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 6);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 26);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 16);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 16);
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
      else if (o.type === "building") drawBuilding(o);
    }
  }

  function drawStormCloud(o) {
    ctx.save();
    ctx.fillStyle = "#2e3640";
    ctx.beginPath();
    ctx.ellipse(o.x + o.w * 0.25, o.y + o.h * 0.55, o.w * 0.22, o.h * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(o.x + o.w * 0.5, o.y + o.h * 0.42, o.w * 0.25, o.h * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(o.x + o.w * 0.73, o.y + o.h * 0.55, o.w * 0.22, o.h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1f242b";
    ctx.fillRect(o.x + o.w * 0.14, o.y + o.h * 0.55, o.w * 0.72, o.h * 0.22);

    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.45, o.y + o.h * 0.75);
    ctx.lineTo(o.x + o.w * 0.38, o.y + o.h * 0.95);
    ctx.lineTo(o.x + o.w * 0.52, o.y + o.h * 0.95);
    ctx.lineTo(o.x + o.w * 0.44, o.y + o.h * 1.15);
    ctx.stroke();
    ctx.restore();
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
    ctx.lineTo(o.x + o.w * 0.46, o.y + o.h * 0.8);
    ctx.moveTo(o.x + o.w * 0.6, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.54, o.y + o.h * 0.8);
    ctx.stroke();

    ctx.fillStyle = "#60422f";
    ctx.fillRect(o.x + o.w * 0.4, o.y + o.h * 0.8, o.w * 0.2, o.h * 0.12);
    ctx.restore();
  }

  function drawEnemyHeli(o) {
    ctx.save();
    ctx.fillStyle = "#d9e2ea";
    ctx.fillRect(o.x + o.w * 0.18, o.y + o.h * 0.3, o.w * 0.52, o.h * 0.4);
    ctx.fillRect(o.x + o.w * 0.66, o.y + o.h * 0.4, o.w * 0.22, o.h * 0.12);
    ctx.fillRect(o.x + o.w * 0.1, o.y + o.h * 0.18, o.w * 0.72, o.h * 0.06);
    ctx.fillRect(o.x + o.w * 0.76, o.y + o.h * 0.12, o.w * 0.08, o.h * 0.28);
    ctx.restore();
  }

  function drawJet(o) {
    ctx.save();
    ctx.fillStyle = "#c6ccd4";
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.62, o.y + o.h * 0.35);
    ctx.lineTo(o.x + o.w, o.y + o.h * 0.5);
    ctx.lineTo(o.x + o.w * 0.62, o.y + o.h * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(o.x + o.w * 0.35, o.y + o.h * 0.15, o.w * 0.12, o.h * 0.7);
    ctx.restore();
  }

  function drawTree(o) {
    ctx.save();
    ctx.fillStyle = "#6f4a2d";
    ctx.fillRect(o.x + o.w * 0.42, o.y + o.h * 0.6, o.w * 0.16, o.h * 0.4);

    ctx.fillStyle = "#2f7b44";
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.5, o.y);
    ctx.lineTo(o.x + o.w * 0.1, o.y + o.h * 0.58);
    ctx.lineTo(o.x + o.w * 0.9, o.y + o.h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBuilding(o) {
    ctx.save();
    ctx.fillStyle = "#6c7784";
    ctx.fillRect(o.x, o.y, o.w, o.h);

    ctx.fillStyle = "#9fb4c6";
    const cols = 3;
    const rows = 6;
    const winW = o.w / 6;
    const winH = o.h / 12;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillRect(
          o.x + 12 + c * (winW + 10),
          o.y + 12 + r * (winH + 12),
          winW,
          winH
        );
      }
    }

    ctx.restore();
  }

  function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const w = player.w;
    const h = player.h;

    ctx.save();

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.42, groundY + 20, w * 0.5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#e7eef5";
    ctx.fillRect(x + w * 0.14, y + h * 0.24, w * 0.54, h * 0.48);
    ctx.fillRect(x + w * 0.64, y + h * 0.36, w * 0.24, h * 0.12);

    ctx.fillStyle = "#9fd1ff";
    ctx.fillRect(x + w * 0.22, y + h * 0.3, w * 0.18, h * 0.16);

    ctx.fillStyle = "#333";
    ctx.fillRect(x + w * 0.08, y + h * 0.12, w * 0.72, h * 0.06);
    ctx.fillRect(x + w * 0.74, y + h * 0.08, w * 0.07, h * 0.28);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, y + h * 0.78);
    ctx.lineTo(x + w * 0.7, y + h * 0.78);
    ctx.moveTo(x + w * 0.25, y + h * 0.78);
    ctx.lineTo(x + w * 0.18, y + h * 0.94);
    ctx.moveTo(x + w * 0.67, y + h * 0.78);
    ctx.lineTo(x + w * 0.74, y + h * 0.94);
    ctx.stroke();

    if (!player.landed) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.02, y + h * 0.15);
      ctx.lineTo(x + w * 0.92, y + h * 0.15);
      ctx.stroke();
    }

    ctx.restore();
  }

  function loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
    lastTime = timestamp;

    updateOrientationOverlay();
    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  function setInput(value) {
    if (gameState === "playing") {
      inputHeld = value;
    }
  }

  function onPointerDown(e) {
    if (e.target.closest("button")) return;
    if (gameState === "playing") {
      setInput(true);
    }
  }

  function onPointerUp() {
    setInput(false);
  }

  function onKeyDown(e) {
    if (e.code === "Space") {
      e.preventDefault();
      if (gameState === "playing") setInput(true);
    }

    if (e.code === "KeyP" && (gameState === "playing" || gameState === "paused")) {
      e.preventDefault();
      pauseGame();
    }
  }

  function onKeyUp(e) {
    if (e.code === "Space") {
      e.preventDefault();
      setInput(false);
    }
  }

  function init() {
    renderStoredScores();
    updateOrientationOverlay();

    playBtn.addEventListener("click", startGame);
    playAgainBtn.addEventListener("click", startGame);
    backToMenuBtn.addEventListener("click", showMenu);
    pauseBtn.addEventListener("click", pauseGame);

    window.addEventListener("resize", () => {
      updateOrientationOverlay();
      resizeCanvas();
    });

    window.addEventListener("orientationchange", () => {
      updateOrientationOverlay();
      resizeCanvas();
    });

    document.addEventListener("pointerdown", onPointerDown, { passive: false });
    document.addEventListener("pointerup", onPointerUp, { passive: false });
    document.addEventListener("pointercancel", onPointerUp, { passive: false });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    resizeCanvas();
    requestAnimationFrame(loop);
  }

  init();
})();
