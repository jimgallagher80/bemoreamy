(() => {
  "use strict";

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";
  const STATE_URL = "get_baton_state.php";
  const REFRESH_MS = 60000;
  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";
  const GREEN = "#2fbf71";

  let map;
  let geojson;
  let routeLayer;
  let batonMarker;
  let eventMarkersLayer;
  let selectedLayer;
  const legLayers = new Map();

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

  function styleFeature(feature) {
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

  function setSelectedLeg(legNum) {
    if (selectedLayer) selectedLayer.setStyle({ color: GREY, weight: 4, opacity: 0.55 });
    selectedLayer = legLayers.get(String(legNum)) || null;
    if (selectedLayer) {
      selectedLayer.setStyle({ color: ORANGE, weight: 6, opacity: 0.95 });
      selectedLayer.bringToFront();
      map.fitBounds(selectedLayer.getBounds(), { padding: [24, 24] });
    }
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
    const baton = data.baton;
    const latest = data.latest_event;

    if (!baton) {
      trackerTitle.textContent = "Baton tracker";
      trackerStatus.innerHTML = "The relay has not recorded a baton update yet.";
      trackerSubStatus.textContent = "Once a team starts a leg, the baton will appear here.";
      renderHistory(data.history || []);
      renderEventMarkers([], null);
      return;
    }

    const latlng = [baton.display_lat, baton.display_lng];
    if (!batonMarker) {
      batonMarker = L.marker(latlng, { icon: batonIcon(), zIndexOffset: 1000 }).addTo(map);
    } else {
      batonMarker.setLatLng(latlng);
    }

    const heldText = latest && latest.id !== baton.id ? " Position held at the latest valid point to avoid moving backwards." : "";
    batonMarker.bindPopup(`
      <strong>Virtual baton</strong><br>
      Leg ${esc(baton.leg_number)}<br>
      ${esc(baton.team_name)}<br>
      ${esc(labelForEvent(baton.event_type))}: ${esc(formatTime(baton.event_time))}
    `);

    trackerTitle.textContent = `Virtual baton — Leg ${baton.leg_number}`;
    trackerStatus.innerHTML = `<strong>${esc(baton.team_name)}</strong> — ${esc(labelForEvent(baton.event_type))} at ${esc(formatTime(baton.event_time))}.`;
    trackerSubStatus.textContent = `Last position update: ${minutesAgo(baton.event_time)}.${heldText}`;

    setSelectedLeg(baton.leg_number);
    renderHistory(data.history || []);
    renderEventMarkers(data.history || [], baton);
  }

  function renderEventMarkers(history, baton) {
    if (!eventMarkersLayer) return;
    eventMarkersLayer.clearLayers();

    const latestId = baton ? Number(baton.id) : null;
    const allEvents = [];
    (history || []).forEach(h => {
      (h.events || []).forEach(e => allEvents.push(e));
    });

    allEvents.forEach(e => {
      if (e.display_lat === null || e.display_lng === null || e.display_lat === undefined || e.display_lng === undefined) return;
      if (latestId !== null && Number(e.id) === latestId) return;

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
