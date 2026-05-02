(() => {
  "use strict";

  const token = window.BATON_TOKEN || new URLSearchParams(location.search).get("token") || "";
  const TEAM_URL = "get_baton_team.php?token=" + encodeURIComponent(token);
  const SUBMIT_URL = "submit_baton_event.php";

  const teamTitle = document.getElementById("teamTitle");
  const teamIntro = document.getElementById("teamIntro");
  const legsEl = document.getElementById("legs");
  const statusEl = document.getElementById("status");

  let currentTeamData = null;

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function formatTime(s) {
    if (!s) return "—";
    const d = new Date(String(s).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("en-GB", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit", hour12:false }).replace(",", "");
  }

  function showStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("error", !!isError);
    statusEl.classList.add("show");
    window.clearTimeout(showStatus._t);
    showStatus._t = window.setTimeout(() => statusEl.classList.remove("show"), 6500);
  }

  async function loadTeam() {
    if (!token) {
      teamTitle.textContent = "Invalid baton link";
      teamIntro.textContent = "No team token was provided.";
      return;
    }
    try {
      const res = await fetch(TEAM_URL, { cache: "no-store" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to load team link.");
      renderTeam(data);
    } catch (e) {
      teamTitle.textContent = "Unable to load baton link";
      teamIntro.textContent = e.message || "Please check the link and try again.";
    }
  }

  function renderTeam(data) {
    currentTeamData = data;
    teamTitle.textContent = data.team_name || "Team baton link";
    teamIntro.textContent = "Use the buttons below to record your team’s progress. Anyone with this link can update the baton for this team.";
    legsEl.innerHTML = data.legs.map(renderLeg).join("");
    legsEl.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => submitEvent(btn.dataset.leg, btn.dataset.action, btn));
    });
  }

  function renderLeg(leg) {
    const events = Array.isArray(leg.events) ? leg.events : [];
    const eventHtml = events.length ? events.slice().reverse().map(e => `
      <div class="event-row">${esc(label(e.event_type))} · ${esc(formatTime(e.event_time))}${e.has_position ? " · position recorded" : " · no GPS position"}</div>
    `).join("") : `<div class="event-row">No baton updates recorded for this leg yet.</div>`;

    return `
      <article class="card leg-card">
        <div class="leg-head">
          <div>
            <div class="leg-title">Leg ${esc(leg.leg_number)}</div>
            <div class="leg-route">${esc(leg.start)} → ${esc(leg.end)}${leg.distance_km ? ` · ${esc(leg.distance_km)} km` : ""}</div>
          </div>
        </div>
        <textarea class="note" data-note-for="${esc(leg.leg_number)}" placeholder="Optional note, for example delayed start or poor signal"></textarea>
        <div class="buttons">
          <button class="btn secondary" type="button" data-leg="${esc(leg.leg_number)}" data-action="start">Start</button>
          <button class="btn" type="button" data-leg="${esc(leg.leg_number)}" data-action="update">Update position</button>
          <button class="btn finish" type="button" data-leg="${esc(leg.leg_number)}" data-action="finish">Finish</button>
        </div>
        <div class="events">${eventHtml}</div>
      </article>
    `;
  }

  function label(type) {
    if (type === "start") return "Started";
    if (type === "finish") return "Finished";
    return "Updated";
  }

  function findLeg(legNumber) {
    const legs = currentTeamData && Array.isArray(currentTeamData.legs) ? currentTeamData.legs : [];
    return legs.find(l => Number(l.leg_number) === Number(legNumber)) || null;
  }

  function getLocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
      );
    });
  }

  async function submitEvent(legNumber, eventType, btn) {
    const leg = findLeg(legNumber);

    if (eventType === "start" && leg && leg.previous_leg_finished === false) {
      const prev = leg.previous_leg_number || (Number(legNumber) - 1);
      const ok = window.confirm(
        `Leg ${prev} has not yet been marked as finished. Are you sure your team is ready to start Leg ${legNumber}?`
      );
      if (!ok) return;
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = eventType === "update" ? "Getting GPS…" : "Recording…";

    const noteEl = document.querySelector(`[data-note-for="${CSS.escape(String(legNumber))}"]`);
    const note = noteEl ? noteEl.value.trim() : "";

    let loc = null;
    if (eventType === "update") {
      loc = await getLocation();
    }

    btn.textContent = "Saving…";
    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          leg_number: Number(legNumber),
          event_type: eventType,
          note,
          latitude: loc ? loc.latitude : null,
          longitude: loc ? loc.longitude : null,
          accuracy_m: loc ? loc.accuracy_m : null
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed.");

      if (eventType === "update" && !data.has_display_position) {
        showStatus("Update recorded, but no GPS position was captured. The public tracker will use the last known baton position.");
      } else {
        showStatus(`${label(eventType)} recorded for Leg ${legNumber}.`);
      }
      await loadTeam();
    } catch (e) {
      showStatus(e.message || "Unable to record update.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  loadTeam();
})();
