(() => {
  "use strict";

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";
  const STATE_URL = "get_baton_state.php";
  const REFRESH_MS = 60000;
  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";

  let map;
  let geojson;
  let routeLayer;
  let batonMarkersLayer;
  let eventMarkersLayer;
  const legLayers = new Map();
  const highlightedLegs = new Set();

  const trackerTitle = document.getElementById("trackerTitle");
  const trackerStatus = document.getElementById("trackerStatus");
  const trackerSubStatus = document.getElementById("trackerSubStatus");
  const historyList = document.getElementById("historyList");

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(s) {
    if (!s) return "—";
    const d = new Date(String(s).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(",", "");
  }

  function minutesAgo(s) {
    if (!s) return "";
    const d = new Date(String(s).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "";
    const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hrs = Math.round(mins / 60);
    return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  }

  function styleFeature() {
    return { color: GREY, weight: 4, opacity: 0.55 };
  }

  function batonIcon(size = 34) {
    return L.icon({
      iconUrl: "baton.PNG",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  }

  function resetLegStyles() {
    legLayers.forEach(layer => layer.setStyle({ color: GREY, weight: 4, opacity: 0.55 }));
    highlightedLegs.clear();
  }

  function highlightLegs(legs, fit = false) {
    resetLegStyles();
    const bounds = [];

    (legs || []).forEach(legNum => {
      const layer = legLayers.get(String(legNum));
      if (!layer) return;
      highlightedLegs.add(String(legNum));
      layer.setStyle({ color: ORANGE, weight: 6, opacity: 0.95 });
      layer.bringToFront();
      bounds.push(layer.getBounds());
    });

    if (fit && bounds.length) {
      const combined = bounds.reduce((acc, b) => acc ? acc.extend(b) : b, null);
      if (combined) map.fitBounds(combined, { padding: [24, 24] });
    }
  }

  function setSelectedLeg(legNum) {
    highlightLegs([legNum], true);
  }

  async function init() {
    map = L.map("map", { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const res = await fetch(GEOJSON_URL, { cache: "no-store" });
    geojson = await res.json();
    eventMarkersLayer = L.layerGroup().addTo(map);
    batonMarkersLayer = L.layerGroup().addTo(map);

    routeLayer = L.geoJSON(geojson, {
      style: styleFeature,
      onEachFeature: (feature, layer) => {
        const leg = String(feature.properties?.leg ?? "");
        if (leg) legLayers.set(leg, layer);
        layer.on("click", () => setSelectedLeg(leg));
      }
    }).addTo(map);
    map.fitBounds(routeLayer.getBounds(), { padding: [12, 12] });

    await loadState();
    window.setInterval(loadState, REFRESH_MS);
  }

  async function loadState() {
    try {
      const res = await fetch(STATE_URL, { cache: "no-store" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to load tracker");
      renderState(data);
    } catch (e) {
      trackerTitle.textContent = "Baton tracker";
      trackerStatus.innerHTML = "Unable to load the baton tracker right now.";
      trackerSubStatus.textContent = "Please try refreshing the page.";
    }
  }

  function renderState(data) {
    const batons = Array.isArray(data.batons) ? data.batons : (data.baton ? [data.baton] : []);

    if (!batons.length) {
      trackerTitle.textContent = "Baton tracker";
      trackerStatus.innerHTML = "The relay has not recorded a baton update yet.";
      trackerSubStatus.textContent = "Once a team starts a leg, the baton will appear here.";
      renderHistory(data.history || []);
      renderEventMarkers(data.history || [], []);
      renderBatonMarkers([]);
      resetLegStyles();
      return;
    }

    renderBatonMarkers(batons);
    renderEventMarkers(data.history || [], batons);
    renderHistory(data.history || []);

    const legNums = batons.map(b => b.leg_number);
    highlightLegs(legNums, true);

    if (batons.length === 1) {
      const b = batons[0];
      trackerTitle.textContent = `Virtual baton — Leg ${b.leg_number}`;
      trackerStatus.innerHTML = `<strong>${esc(b.team_name)}</strong> — ${esc(labelForEvent(b.event_type))} at ${esc(formatTime(b.event_time))}.`;
      trackerSubStatus.textContent = `Last position update: ${minutesAgo(b.event_time)}.`;
    } else {
      trackerTitle.textContent = `Virtual batons — ${batons.length} teams underway`;
      trackerStatus.innerHTML = batons.map(b => `
        <div><strong>${esc(b.team_name)}</strong> — Leg ${esc(b.leg_number)}, ${esc(labelForEvent(b.event_type).toLowerCase())} at ${esc(formatTime(b.event_time))}</div>
      `).join("");
      const latest = batons.slice().sort((a, b) => String(b.event_time).localeCompare(String(a.event_time)) || Number(b.id) - Number(a.id))[0];
      trackerSubStatus.textContent = `Most recent position update: ${minutesAgo(latest.event_time)}.`;
    }
  }

  function renderBatonMarkers(batons) {
    if (!batonMarkersLayer) return;
    batonMarkersLayer.clearLayers();

    batons.forEach(b => {
      if (b.display_lat === null || b.display_lng === null || b.display_lat === undefined || b.display_lng === undefined) return;
      L.marker([Number(b.display_lat), Number(b.display_lng)], {
        icon: batonIcon(40),
        zIndexOffset: 1200
      })
        .bindPopup(`
          <strong>${esc(b.team_name)}</strong><br>
          Leg ${esc(b.leg_number)}<br>
          ${esc(labelForEvent(b.event_type))}: ${esc(formatTime(b.event_time))}
        `)
        .addTo(batonMarkersLayer);
    });
  }

  function renderEventMarkers(history, batons) {
    if (!eventMarkersLayer) return;
    eventMarkersLayer.clearLayers();

    const activeIds = new Set((batons || []).map(b => Number(b.id)));
    const allEvents = [];
    (history || []).forEach(h => {
      (h.events || []).forEach(e => allEvents.push(e));
    });

    allEvents.forEach(e => {
      if (e.display_lat === null || e.display_lng === null || e.display_lat === undefined || e.display_lng === undefined) return;
      if (activeIds.has(Number(e.id))) return;

      L.marker([Number(e.display_lat), Number(e.display_lng)], {
        icon: batonIcon(22),
        zIndexOffset: 500
      })
        .bindPopup(`
          <strong>${esc(labelForEvent(e.event_type))}</strong><br>
          Leg ${esc(e.leg_number)}<br>
          ${esc(e.team_name)}<br>
          ${esc(formatTime(e.event_time))}
        `)
        .addTo(eventMarkersLayer);
    });
  }

  function labelForEvent(type) {
    if (type === "start") return "Started";
    if (type === "finish") return "Finished";
    return "Updated";
  }

  function renderHistory(history) {
    if (!history || history.length === 0) {
      historyList.innerHTML = `<p>No updates yet.</p>`;
      return;
    }
    historyList.innerHTML = history.map(h => {
      const start = h.started_at ? `Started ${formatTime(h.started_at)}` : "Not started";
      const finish = h.finished_at ? `Finished ${formatTime(h.finished_at)}` : h.status;
      const updates = h.updates_count === 1 ? "1 update" : `${h.updates_count || 0} updates`;
      return `
        <button class="history-row" type="button" data-leg="${esc(h.leg_number)}">
          <strong>Leg ${esc(h.leg_number)}: ${esc(h.start)} → ${esc(h.end)}</strong>
          <small>${esc(h.team_name)} · ${esc(start)} · ${esc(finish)} · ${esc(updates)}</small>
        </button>
      `;
    }).join("");
    historyList.querySelectorAll(".history-row").forEach(btn => {
      btn.addEventListener("click", () => setSelectedLeg(btn.dataset.leg));
    });
  }

  init();
})();
