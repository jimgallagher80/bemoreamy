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
    landedPlatform: null
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
    stars: [],
    seaPhase: 0
  };

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
    const el = document.documentElement;
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

  function resizeCanvas() {
    const rect = getRect();
    if (!rect.width || !rect.height) return false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    groundY = rect.height * 0.9;
    return true;
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
  }

  function resetWorld() {
    world.distance = 0;
    world.score = 0;
    world.successfulLandings = 0;
    world.bestLandingQuality = "None";
    world.obstaclesCleared = 0;
    world.nextObstacleSpawn = 1000;
    world.nextPlatformSpawn = 2200;
    world.obstacles = [];
    world.platforms = [];
    world.stars = [];
    world.seaPhase = 0;

    targetWorldSpeed = 0;
    effectiveWorldSpeed = 0;

    seedStars();
    seedStartPlatform();
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

  function createPlatform(x, type) {
    const moving = type === "ship";
    const p = {
      type,
      x,
      y: groundY - 20,
      w: type === "ship" ? (isTabletMode ? 230 : 195) : (isTabletMode ? 260 : 220),
      h: type === "ship" ? (isTabletMode ? 70 : 58) : (isTabletMode ? 90 : 74),
      deckX: 0,
      deckY: 0,
      refuelZoneW: type === "ship" ? (isTabletMode ? 120 : 102) : (isTabletMode ? 130 : 112),
      motionPhase: Math.random() * Math.PI * 2,
      motionAmp: moving ? 5 : 0,
      passed: false,
      startPad: false,
      used: false
    };
    updatePlatformDeck(p);
    return p;
  }

  function updatePlatformDeck(p) {
    p.deckX = p.x + p.w * 0.5 - p.refuelZoneW * 0.5;
    p.deckY = p.y - 10;
  }

  function seedStartPlatform() {
    const start = createPlatform(player.x - 45, "ship");
    start.startPad = true;
    start.motionAmp = 0;
    updatePlatformDeck(start);
    world.platforms.push(start);
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
      const h = isTabletMode ? 120 : 95;
      const w = isTabletMode ? 48 : 38;
      return {
        type,
        x,
        y: groundY - h,
        w,
        h,
        speedMul: 1,
        passed: false
      };
    }

    const h = isTabletMode ? 160 : 128;
    const w = isTabletMode ? 74 : 60;
    return {
      type: "building",
      x,
      y: groundY - h,
      w,
      h,
      speedMul: 1,
      passed: false
    };
  }

  function spawnObstacle() {
    const rect = getRect();
    const airborneWeights = ["cloud", "cloud", "balloon", "balloon", "heli", "jet"];
    const groundWeights = ["tree", "tree", "tree", "building"];

    const chooseGround = Math.random() < 0.35;
    const pool = chooseGround ? groundWeights : airborneWeights;
    const type = pool[Math.floor(Math.random() * pool.length)];

    const obstacle = createObstacle(type, rect.width + 180);

    if (type === "building") {
      obstacle.h *= 0.9;
      obstacle.y = groundY - obstacle.h;
    }

    if (type === "tree") {
      obstacle.h *= 0.95;
      obstacle.y = groundY - obstacle.h;
    }

    world.obstacles.push(obstacle);
  }

  function spawnPlatform() {
    const rect = getRect();
    const type = Math.random() < 0.55 ? "ship" : "island";
    world.platforms.push(createPlatform(rect.width + 340, type));
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

    await tryFullscreen();

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

    gameState = "playing";
    updateHud();
    draw();
  }

  function showMenu() {
    gameState = "menu";
    gameUi.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    renderStoredScores();
  }

  function flap() {
    if (gameState !== "playing") return;
    if (player.engineOut) return;

    if (player.landed) {
      player.landed = false;
      player.airborneStarted = true;
      player.landedPlatform = null;
      player.vy = player.flapImpulse;
      targetWorldSpeed = cruiseWorldSpeed;
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

    gameUi.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
    renderStoredScores();
  }

  function getNearestLandingAssistPlatform() {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const p of world.platforms) {
      if (p.used) continue;

      const domeCenterX = p.deckX + p.refuelZoneW * 0.5;
      const domeCenterY = p.deckY + 8;
      const playerCenterX = player.x + player.w * 0.5;
      const playerCenterY = player.y + player.h * 0.5;

      const dx = domeCenterX - playerCenterX;
      const dy = domeCenterY - playerCenterY;
      const distance = Math.hypot(dx, dy);
      const domeRadius = isTabletMode ? 250 : 210;

      if (distance < domeRadius && distance < nearestDistance) {
        nearest = {
          platform: p,
          distance,
          domeRadius
        };
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  function update(dt) {
    if (gameState !== "playing") return;

    const rect = getRect();
    if (!rect.width || !rect.height || !groundY) return;

    const assist = getNearestLandingAssistPlatform();

    let desiredSpeed = 0;
    if (player.landed && !player.airborneStarted) {
      desiredSpeed = 0;
    } else if (player.landed) {
      desiredSpeed = 18;
    } else {
      desiredSpeed = cruiseWorldSpeed;

      if (assist) {
        const t = Math.max(0, Math.min(1, assist.distance / assist.domeRadius));
        desiredSpeed = 85 + (cruiseWorldSpeed - 85) * t;
      }
    }

    targetWorldSpeed = desiredSpeed;
    effectiveWorldSpeed += (targetWorldSpeed - effectiveWorldSpeed) * Math.min(1, dt * 2.8);
    world.seaPhase += dt * 1.6;

    if (!player.landed) {
      player.vy += player.gravity * dt;
      player.vy = Math.min(player.vy, player.maxFall);
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
        world.nextObstacleSpawn = 430 + Math.random() * 260;
      }

      if (world.nextPlatformSpawn <= 0) {
        spawnPlatform();
        world.nextPlatformSpawn = 1600 + Math.random() * 900;
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
    updatePlatforms(dt);
    updateObstacles(dt);
    updatePlayerAngle(dt);

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

  function updatePlatforms(dt) {
    for (let i = world.platforms.length - 1; i >= 0; i--) {
      const p = world.platforms[i];

      if (player.landed && p === player.landedPlatform) {
        p.x = player.x + player.w * 0.5 - p.w * 0.5;
      } else if (!(player.landed && p.startPad && !player.airborneStarted)) {
        p.x -= effectiveWorldSpeed * dt;
      }

      if (p.type === "ship" && p.motionAmp > 0) {
        p.motionPhase += dt * 1.4;
        p.y = groundY - 20 + Math.sin(p.motionPhase) * p.motionAmp;
      } else {
        p.y = groundY - 20;
      }

      updatePlatformDeck(p);

      if (!p.passed && p.x + p.w < player.x) {
        p.passed = true;
      }

      if (p.x + p.w < -140) {
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

      if (o.x + o.w < -160) {
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

    const pb = getPlayerBox();

    for (const p of world.platforms) {
      const landingZone = {
        x: p.deckX - 12,
        y: p.deckY - 8,
        w: p.refuelZoneW + 24,
        h: 26
      };

      const centreX = pb.x + pb.w * 0.5;
      const bottomY = pb.y + pb.h;
      const overLandingZone = centreX > landingZone.x && centreX < landingZone.x + landingZone.w;
      const descendingIntoDeck = bottomY >= landingZone.y && bottomY <= landingZone.y + landingZone.h;

      if (overLandingZone && descendingIntoDeck && player.vy >= 0) {
        const landingSpeed = Math.abs(player.vy);

        if (landingSpeed > 250) {
          gameOver();
          return;
        }

        player.y = p.deckY - player.h + 2;
        player.vy = 0;
        player.landed = true;
        player.landedPlatform = p;
        p.used = true;

        let quality = "Safe";
        if (landingSpeed < 80) quality = "Perfect";
        else if (landingSpeed < 150) quality = "Good";

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
    ctx.lineTo(p.x + p.w, p.y + 20);
    ctx.lineTo(p.x + p.w * 0.18, p.y + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8c9aaa";
    ctx.fillRect(p.x + p.w * 0.16, p.y - 16, p.w * 0.24, 16);

    ctx.fillStyle = "#36424f";
    ctx.fillRect(p.deckX, p.deckY, p.refuelZoneW, 10);

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 5);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 21);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 5);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 21);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 13);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 13);
    ctx.stroke();

    ctx.restore();
  }

  function drawIsland(p) {
    ctx.save();

    ctx.fillStyle = "#9f845c";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y + 12, p.w * 0.52, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#609653";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y, p.w * 0.46, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d4f57";
    roundRect(ctx, p.deckX - 6, p.deckY - 2, p.refuelZoneW + 12, 16, 7);
    ctx.fill();

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 5);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 21);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 5);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 21);
    ctx.moveTo(p.deckX + p.refuelZoneW * 0.35, p.deckY + 13);
    ctx.lineTo(p.deckX + p.refuelZoneW * 0.65, p.deckY + 13);
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

    ctx.fillRect(o.x + o.w * 0.35, o.y + o.h * 0.18, o.w * 0.12, o.h * 0.64);
    ctx.restore();
  }

  function drawTree(o) {
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
  }

  function drawBuilding(o) {
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
    renderStoredScores();
    updateOrientationOverlay();

    playBtn.addEventListener("click", startGame);
    playAgainBtn.addEventListener("click", startGame);
    backToMenuBtn.addEventListener("click", showMenu);

    window.addEventListener("resize", () => {
      updateOrientationOverlay();
      resizeCanvas();
    });

    window.addEventListener("orientationchange", () => {
      updateOrientationOverlay();
      resizeCanvas();
    });

    document.addEventListener("pointerdown", onPointerDown, { passive: false });
    document.addEventListener("keydown", onKeyDown);

    resizeCanvas();
    requestAnimationFrame(loop);
  }

  init();
})();
