// ONLY KEY CHANGES ARE MARKED WITH: // ⭐ FIX

(() => {

// ===== EXISTING CODE ABOVE REMAINS UNCHANGED =====

// --- FIND THIS FUNCTION AND REPLACE IT ---

function getNearestLandingAssistPlatform() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const p of world.platforms) {
    if (p.used) continue;

    // ⭐ FIX: true 2D proximity dome
    const domeCenterX = p.deckX + p.refuelZoneW * 0.5;
    const domeCenterY = p.deckY + 10;

    const playerCenterX = player.x + player.w * 0.5;
    const playerCenterY = player.y + player.h * 0.5;

    const dx = domeCenterX - playerCenterX;
    const dy = domeCenterY - playerCenterY;

    const distance = Math.hypot(dx, dy);

    const domeRadius = isTabletMode ? 240 : 200;

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


// --- FIND THIS BLOCK INSIDE update(dt) AND REPLACE ONLY THIS PART ---

// ⭐ FIX: correct slowdown logic
if (assist) {
  const t = Math.max(0, Math.min(1, assist.distance / assist.domeRadius));

  // closer = slower
  const minSpeed = 70;
  desiredSpeed = minSpeed + (cruiseWorldSpeed - minSpeed) * t;
}


// --- FIND checkPlatformLanding() AND REPLACE FUNCTION ---

function checkPlatformLanding() {
  if (player.landed) return;

  const pb = getPlayerBox();

  for (const p of world.platforms) {

    const centreX = pb.x + pb.w * 0.5;
    const bottomY = pb.y + pb.h;

    const landingLeft = p.deckX;
    const landingRight = p.deckX + p.refuelZoneW;

    const onDeckX = centreX > landingLeft && centreX < landingRight;

    const deckY = p.deckY;

    // ⭐ FIX: much more forgiving vertical window
    const touchingDeck = bottomY >= deckY - 6 && bottomY <= deckY + 18;

    // ⭐ FIX: safer speed threshold
    const safeSpeed = Math.abs(player.vy) < 220;

    if (onDeckX && touchingDeck && player.vy >= 0) {

      if (!safeSpeed) {
        gameOver();
        return;
      }

      // ⭐ FIX: proper landing (snap + settle)
      player.y = deckY - player.h + 2;
      player.vy = 0;
      player.landed = true;
      player.landedPlatform = p;

      // ⭐ FIX: keep platform aligned under heli
      p.used = true;

      // ⭐ FIX: restore fuel
      player.fuel = player.maxFuel;
      player.engineOut = false;

      // ⭐ FIX: landing scoring unchanged logic
      const speed = Math.abs(player.vy);
      let quality = "Safe";

      if (speed < 80) quality = "Perfect";
      else if (speed < 140) quality = "Good";

      world.bestLandingQuality = rankLandingQuality(world.bestLandingQuality, quality);

      if (!p.startPad) {
        world.successfulLandings += 1;
      }

      return;
    }
  }
}


// --- FIND updatePlatforms(dt) AND ADD THIS INSIDE LOOP ---

// ⭐ FIX: keep landed platform under helicopter
if (player.landed && p === player.landedPlatform) {
  p.x = player.x + player.w * 0.5 - p.w * 0.5;
}


// ===== EVERYTHING ELSE REMAINS EXACTLY AS YOUR ORIGINAL FILE =====

})();
