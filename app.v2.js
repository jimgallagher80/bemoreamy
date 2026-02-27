(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";
  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";

  const LEG_SIGNUPS_URL = "get_leg_signups.php";
  let signupsByLeg = null; // loaded once, approved-only names

  // Estimated set off and finish times per leg (displayed as "Sat 16 May 2026 08:00")
  const LEG_TIMES = {"1":{"setoff":"Sat 16 May 2026 08:00","finish":"Sat 16 May 2026 10:27"},"2":{"setoff":"Sat 16 May 2026 10:27","finish":"Sat 16 May 2026 13:44"},"3":{"setoff":"Sat 16 May 2026 13:44","finish":"Sat 16 May 2026 16:22"},"4":{"setoff":"Sat 16 May 2026 16:22","finish":"Sat 16 May 2026 18:33"},"5":{"setoff":"Sat 16 May 2026 18:33","finish":"Sat 16 May 2026 20:01"},"6":{"setoff":"Sat 16 May 2026 20:01","finish":"Sat 16 May 2026 21:51"},"7":{"setoff":"Sat 16 May 2026 21:51","finish":"Sat 16 May 2026 23:41"},"8":{"setoff":"Sat 16 May 2026 23:41","finish":"Sun 17 May 2026 02:14"},"9":{"setoff":"Sun 17 May 2026 02:14","finish":"Sun 17 May 2026 04:48"},"10":{"setoff":"Sun 17 May 2026 04:48","finish":"Sun 17 May 2026 07:00"},"11":{"setoff":"Sun 17 May 2026 07:00","finish":"Sun 17 May 2026 09:19"},"12":{"setoff":"Sun 17 May 2026 09:19","finish":"Sun 17 May 2026 11:53"},"13":{"setoff":"Sun 17 May 2026 11:53","finish":"Sun 17 May 2026 15:03"},"14":{"setoff":"Sun 17 May 2026 15:03","finish":"Sun 17 May 2026 16:45"},"15":{"setoff":"Sun 17 May 2026 16:45","finish":"Sun 17 May 2026 19:26"},"16":{"setoff":"Sun 17 May 2026 19:26","finish":"Sun 17 May 2026 21:31"},"17":{"setoff":"Sun 17 May 2026 21:31","finish":"Sun 17 May 2026 23:06"},"18":{"setoff":"Sun 17 May 2026 23:06","finish":"Mon 18 May 2026 01:39"},"19":{"setoff":"Mon 18 May 2026 01:39","finish":"Mon 18 May 2026 04:35"},"20":{"setoff":"Mon 18 May 2026 04:35","finish":"Mon 18 May 2026 07:42"},"21":{"setoff":"Mon 18 May 2026 07:42","finish":"Mon 18 May 2026 10:48"},"22":{"setoff":"Mon 18 May 2026 10:48","finish":"Mon 18 May 2026 12:31"},"23":{"setoff":"Mon 18 May 2026 12:31","finish":"Mon 18 May 2026 14:50"},"24":{"setoff":"Mon 18 May 2026 14:50","finish":"Mon 18 May 2026 17:45"},"25":{"setoff":"Mon 18 May 2026 17:45","finish":"Mon 18 May 2026 19:02"},"26":{"setoff":"Mon 18 May 2026 19:02","finish":"Mon 18 May 2026 21:47"},"27":{"setoff":"Mon 18 May 2026 21:47","finish":"Tue 19 May 2026 00:35"},"28":{"setoff":"Tue 19 May 2026 00:35","finish":"Tue 19 May 2026 04:15"},"29":{"setoff":"Tue 19 May 2026 04:15","finish":"Tue 19 May 2026 06:37"},"30":{"setoff":"Tue 19 May 2026 06:37","finish":"Tue 19 May 2026 09:13"},"31":{"setoff":"Tue 19 May 2026 09:13","finish":"Tue 19 May 2026 12:41"},"32":{"setoff":"Tue 19 May 2026 12:41","finish":"Tue 19 May 2026 14:53"},"33":{"setoff":"Tue 19 May 2026 14:53","finish":"Tue 19 May 2026 16:28"},"34":{"setoff":"Tue 19 May 2026 16:28","finish":"Tue 19 May 2026 19:02"},"35":{"setoff":"Tue 19 May 2026 19:02","finish":"Tue 19 May 2026 21:28"},"36":{"setoff":"Tue 19 May 2026 21:28","finish":"Wed 20 May 2026 00:24"},"37":{"setoff":"Wed 20 May 2026 00:24","finish":"Wed 20 May 2026 03:12"},"38":{"setoff":"Wed 20 May 2026 03:12","finish":"Wed 20 May 2026 06:15"},"39":{"setoff":"Wed 20 May 2026 06:15","finish":"Wed 20 May 2026 08:56"},"40":{"setoff":"Wed 20 May 2026 08:56","finish":"Wed 20 May 2026 11:51"},"41":{"setoff":"Wed 20 May 2026 11:51","finish":"Wed 20 May 2026 14:25"},"42":{"setoff":"Wed 20 May 2026 14:25","finish":"Wed 20 May 2026 16:51"},"43":{"setoff":"Wed 20 May 2026 16:51","finish":"Wed 20 May 2026 20:31"},"44":{"setoff":"Wed 20 May 2026 20:31","finish":"Wed 20 May 2026 22:57"},"45":{"setoff":"Wed 20 May 2026 22:57","finish":"Thu 21 May 2026 01:31"},"46":{"setoff":"Thu 21 May 2026 01:31","finish":"Thu 21 May 2026 04:05"},"47":{"setoff":"Thu 21 May 2026 04:05","finish":"Thu 21 May 2026 07:00"},"48":{"setoff":"Thu 21 May 2026 07:00","finish":"Thu 21 May 2026 09:34"},"49":{"setoff":"Thu 21 May 2026 09:34","finish":"Thu 21 May 2026 12:30"},"50":{"setoff":"Thu 21 May 2026 12:30","finish":"Thu 21 May 2026 14:56"},"51":{"setoff":"Thu 21 May 2026 14:56","finish":"Thu 21 May 2026 17:19"},"52":{"setoff":"Thu 21 May 2026 17:19","finish":"Thu 21 May 2026 20:36"},"53":{"setoff":"Thu 21 May 2026 20:36","finish":"Thu 21 May 2026 22:33"},"54":{"setoff":"Thu 21 May 2026 22:33","finish":"Fri 22 May 2026 00:52"},"55":{"setoff":"Fri 22 May 2026 00:52","finish":"Fri 22 May 2026 03:55"},"56":{"setoff":"Fri 22 May 2026 03:55","finish":"Fri 22 May 2026 07:13"},"57":{"setoff":"Fri 22 May 2026 07:13","finish":"Fri 22 May 2026 09:39"},"58":{"setoff":"Fri 22 May 2026 09:39","finish":"Fri 22 May 2026 12:57"},"59":{"setoff":"Fri 22 May 2026 12:57","finish":"Fri 22 May 2026 15:38"},"60":{"setoff":"Fri 22 May 2026 15:38","finish":"Fri 22 May 2026 17:49"},"61":{"setoff":"Fri 22 May 2026 17:49","finish":"Fri 22 May 2026 20:08"},"62":{"setoff":"Fri 22 May 2026 20:08","finish":"Fri 22 May 2026 22:35"},"63":{"setoff":"Fri 22 May 2026 22:35","finish":"Sat 23 May 2026 01:16"},"64":{"setoff":"Sat 23 May 2026 01:16","finish":"Sat 23 May 2026 04:19"},"65":{"setoff":"Sat 23 May 2026 04:19","finish":"Sat 23 May 2026 07:36"},"66":{"setoff":"Sat 23 May 2026 07:36","finish":"Sat 23 May 2026 10:10"},"67":{"setoff":"Sat 23 May 2026 10:10","finish":"Sat 23 May 2026 12:11"},"68":{"setoff":"Sat 23 May 2026 12:11","finish":"Sat 23 May 2026 14:00"}};

  // For dropdown labels on route + signup pages
  function ordinal(n) {
    const s = ["th","st","nd","rd"];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

  function formatTimeForOption(dateTimeStr) {
    // "Sat 16 May 2026 08:00" -> "8:00am, 16th May"
    if (!dateTimeStr) return "—";
    const parts = String(dateTimeStr).trim().split(/\s+/);
    if (parts.length < 5) return String(dateTimeStr);

    const dayNum = parseInt(parts[1], 10);
    const mon = parts[2];
    const time = parts[4];

    const hm = time.split(":");
    let hh = parseInt(hm[0], 10);
    const mm = String(hm[1] || "00").padStart(2, "0");
    if (Number.isNaN(hh) || Number.isNaN(dayNum)) return String(dateTimeStr);

    const ampm = hh >= 12 ? "pm" : "am";
    hh = hh % 12;
    if (hh === 0) hh = 12;

    return `${hh}:${mm}${ampm}, ${ordinal(dayNum)} ${mon}`;
  }

  let TAKEN_LEGS = new Set();

  async function loadTakenLegsForDropdown() {
    try {
      const res = await fetch("get_taken_legs.php", { cache: "no-store" });
      if (!res.ok) {
        TAKEN_LEGS = new Set();
        return;
      }
      const data = await res.json();
      if (data && data.success && Array.isArray(data.taken_legs)) {
        TAKEN_LEGS = new Set(data.taken_legs.map(n => String(n)));
      } else {
        TAKEN_LEGS = new Set();
      }
    } catch (e) {
      TAKEN_LEGS = new Set();
    }
  }

  function applyAvailabilityToSelect(selectEl) {
    if (!selectEl) return;
    Array.from(selectEl.options).forEach(opt => {
      if (!opt.value) return;
      if (!opt.dataset.baseText) opt.dataset.baseText = opt.textContent;
      const taken = TAKEN_LEGS.has(String(opt.value));
      opt.textContent = opt.dataset.baseText + (taken ? " - TAKEN" : " - AVAILABLE");
    });
  }

  const mapEl = $("map");
  const panel = $("legPanel");
  const panelTitle = $("panelTitle");
  const detailsGrid = $("detailsGrid");
  const panelTip = $("panelTip");
  const closeBtn = $("closePanelBtn");
  const legSelect = $("legSelect");

  let map;
  let routeLayer;
  let finishMarker;
  let startMarkersLayer;
  let selectedLegKey = null;
  let lastSelectedCenter = null;
  let lastSelectedZoom = null;

  const layerByLeg = new Map();
  const markerByLeg = new Map();
  const propsByLeg = new Map();
  const endpointsByLeg = new Map();

  function safe(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[ch]));
  }

  async function loadLegSignups() {
    try {
      const res = await fetch(LEG_SIGNUPS_URL, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function getLegSignupInfo(legKey) {
    if (!signupsByLeg) return null;
    const k = String(legKey);
    const v = signupsByLeg[k];
    const count = (v && typeof v.count === "number") ? v.count : 0;
    const names = (v && Array.isArray(v.names)) ? v.names : [];
    return { count: Number(count) || 0, names };
  }

  function ensureSignupsModal() {
    if (document.getElementById("signupsModalBackdrop")) return;

    const style = document.createElement("style");
    style.textContent = `
      .signups-link { text-decoration: underline; cursor: pointer; }
      .signups-modal-backdrop{
        position:fixed; inset:0; background:rgba(0,0,0,.55);
        display:none; align-items:center; justify-content:center; padding:18px; z-index:9999;
      }
      .signups-modal{
        background:#fff; border:2px solid #000; border-radius:18px; padding:14px;
        max-width:520px; width:100%; max-height:calc(100vh - 80px); overflow:auto;
        -webkit-overflow-scrolling:touch;
      }
      .signups-modal h3{ margin:4px 0 10px; }
      .signups-modal .muted{ color:#444; font-size:14px; }
      .signups-modal ul{ margin:0; padding-left:18px; }
      .signups-modal button.btn { width:100%; max-width:100%; }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.id = "signupsModalBackdrop";
    backdrop.className = "signups-modal-backdrop";
    backdrop.innerHTML = `
      <div class="signups-modal" role="dialog" aria-modal="true" aria-labelledby="signupsModalTitle">
        <h3 id="signupsModalTitle">Team</h3>
        <div id="signupsModalBody"></div>
        <button type="button" class="btn" id="signupsModalClose">Close</button>
      </div>
    `;
    document.body.appendChild(backdrop);

    const close = () => { backdrop.style.display = "none"; };

    document.getElementById("signupsModalClose").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function openSignupsModal(legKey) {
    ensureSignupsModal();
    const info = getLegSignupInfo(legKey);
    const body = document.getElementById("signupsModalBody");
    const title = document.getElementById("signupsModalTitle");
    const k = String(legKey);

    title.textContent = `Leg ${k} — Team`;

    if (!info) {
      body.innerHTML = `<p class="muted">Unable to load signups right now.</p>`;
    } else if (!info.names || info.names.length === 0) {
      body.innerHTML = `<p class="muted">No confirmed team names found for this leg.</p>`;
    } else {
      const lis = info.names.map((n) => `<li>${safe(n)}</li>`).join("");
      body.innerHTML = `<ul>${lis}</ul>`;
    }

    const backdrop = document.getElementById("signupsModalBackdrop");
    backdrop.style.display = "flex";
  }

  function getTakenLegTeamName(legKey) {
    if (!window.TAKEN_BY_LEG) return null;
    const k = String(legKey);
    const v = window.TAKEN_BY_LEG[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    return null;
  }

  function renderSignupsValue(legKey) {
    const teamName = getTakenLegTeamName(legKey);
    if (!teamName) return "Available for signup";
    return `<a href="#" class="signups-link" data-leg="${String(legKey)}">Taken - ${safe(teamName)}</a>`;
  }

  function initMap() {
    map = L.map(mapEl, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    startMarkersLayer = L.layerGroup().addTo(map);
  }

  function lineStyle(mode) {
    return (feature) => {
      const p = feature.properties || {};
      const legKey = String(p.leg);

      if (selectedLegKey && legKey === String(selectedLegKey)) {
        return { color: ORANGE, weight: 5, opacity: 1 };
      }
      return { color: GREY, weight: 4, opacity: 0.9 };
    };
  }

  function diamondIcon(legNumber, mode) {
    const html = `
      <div class="diamond-wrap">
        <div class="diamond">
          <span class="diamond-text">${safe(legNumber)}</span>
        </div>
      </div>
    `;
    return L.divIcon({
      className: "diamond-marker",
      html,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  function setFinishMarkerForLeg(legKey) {
    if (finishMarker) {
      map.removeLayer(finishMarker);
      finishMarker = null;
    }

    const endpoints = endpointsByLeg.get(String(legKey));
    if (!endpoints) return;

    const latlng = endpoints.end;

    const icon = L.divIcon({
      className: "finish-flag",
      html: "🏁",
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    finishMarker = L.marker(latlng, { icon }).addTo(map);
  }

  function clearSelection(restoreView) {
    selectedLegKey = null;
    panel.classList.remove("open");
    panelTitle.textContent = "";
    detailsGrid.innerHTML = "";
    panelTip.textContent = "";

    if (restoreView && lastSelectedCenter && typeof lastSelectedZoom === "number") {
      map.setView(lastSelectedCenter, lastSelectedZoom);
    }

    routeLayer.setStyle(lineStyle("normal"));
    markerByLeg.forEach((m, k) => m.setIcon(diamondIcon(k, "normal")));

    if (finishMarker) {
      map.removeLayer(finishMarker);
      finishMarker = null;
    }

    legSelect.value = "";
  }

  function openPanelForLeg(legKey, centerAndZoom) {
    selectedLegKey = String(legKey);

    routeLayer.setStyle(lineStyle("normal"));
    markerByLeg.forEach((m, k) => m.setIcon(diamondIcon(k, "normal")));

    const marker = markerByLeg.get(selectedLegKey);
    if (marker) marker.setIcon(diamondIcon(selectedLegKey, "selected"));

    panel.classList.add("open");

    const p = propsByLeg.get(selectedLegKey) || {};
    const t = LEG_TIMES[selectedLegKey] || { setoff: "—", finish: "—" };

    panelTitle.textContent = `Leg ${safe(selectedLegKey)}`;
    panelTip.textContent = "Tap another leg or use the dropdown.";

    const start = p.start || "—";
    const end = p.end || "—";
    const dist = typeof p.distance_km === "number" ? `${p.distance_km.toFixed(1)} km` : "—";
    const elev = typeof p.elevation_gain_m === "number" ? `${Math.round(p.elevation_gain_m)} m` : "—";
    const diff = p.difficulty || "—";

    detailsGrid.innerHTML = `
      <div class="row"><div class="label">Start</div><div class="value">${safe(start)}</div></div>
      <div class="row"><div class="label">Finish</div><div class="value">${safe(end)}</div></div>
      <div class="row"><div class="label">Distance</div><div class="value">${safe(dist)}</div></div>
      <div class="row"><div class="label">Elevation gain</div><div class="value">${safe(elev)}</div></div>
      <div class="row"><div class="label">Difficulty</div><div class="value">${safe(diff)}</div></div>
      <div class="row"><div class="label">Team</div><div class="value" id="signupsValue">${renderSignupsValue(selectedLegKey)}</div></div>
      <div class="row"><div class="label">Estimated set off time</div><div class="value">${safe(t.setoff)}</div></div>
      <div class="row"><div class="label">Estimated finish time</div><div class="value">${safe(t.finish)}</div></div>
    `;

    setFinishMarkerForLeg(selectedLegKey);

    if (centerAndZoom) {
      const layer = layerByLeg.get(selectedLegKey);
      if (layer) {
        map.fitBounds(layer.getBounds(), { padding: [35, 35] });
      }
    }
  }

  function getFeatureEndpoints(feature) {
    try {
      const g = feature && feature.geometry;
      if (!g) return null;

      // GeoJSON uses [lng, lat]
      const toLatLng = (c) => [c[1], c[0]];

      if (g.type === "LineString" && Array.isArray(g.coordinates) && g.coordinates.length) {
        const coords = g.coordinates;
        return { start: toLatLng(coords[0]), end: toLatLng(coords[coords.length - 1]) };
      }

      if (g.type === "MultiLineString" && Array.isArray(g.coordinates) && g.coordinates.length) {
        const firstLine = g.coordinates[0];
        const lastLine = g.coordinates[g.coordinates.length - 1];
        if (!firstLine || !firstLine.length || !lastLine || !lastLine.length) return null;
        return { start: toLatLng(firstLine[0]), end: toLatLng(lastLine[lastLine.length - 1]) };
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  async function loadGeojson() {
    const res = await fetch(GEOJSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("GeoJSON fetch failed");
    const geo = await res.json();

    routeLayer = L.geoJSON(geo, {
      style: lineStyle("normal"),
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const legKey = String(p.leg);

        layerByLeg.set(legKey, layer);
        propsByLeg.set(legKey, p);

        layer.on("click", () => {
          lastSelectedCenter = map.getCenter();
          lastSelectedZoom = map.getZoom();
          openPanelForLeg(legKey, true);
        });

        const endpoints = getFeatureEndpoints(feature);
        if (endpoints) endpointsByLeg.set(legKey, endpoints);

        const startLatLng = endpoints
          ? endpoints.start
          : [layer.getBounds().getCenter().lat, layer.getBounds().getCenter().lng];

        const marker = L.marker(startLatLng, { icon: diamondIcon(legKey, "normal") });

        marker.on("click", () => {
          lastSelectedCenter = map.getCenter();
          lastSelectedZoom = map.getZoom();
          openPanelForLeg(legKey, true);
        });

        markerByLeg.set(legKey, marker);
        marker.addTo(startMarkersLayer);

        const opt = document.createElement("option");
        opt.value = legKey;
        const t = LEG_TIMES[legKey] || null;
        const setoff = t ? formatTimeForOption(t.setoff) : "—";
        const finish = t ? formatTimeForOption(t.finish) : "—";
        const startName = (p && p.start) ? p.start : "—";
        const endName = (p && p.end) ? p.end : "—";
        opt.textContent = `Leg ${legKey}: ${startName} (${setoff}) to ${endName} (${finish})`;
        legSelect.appendChild(opt);
      },
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [22, 22] });
  }

  function wireUI() {
    closeBtn.addEventListener("click", () => clearSelection(true));

    legSelect.addEventListener("change", () => {
      const v = legSelect.value;
      if (!v) {
        clearSelection(false);
        return;
      }
      lastSelectedCenter = map.getCenter();
      lastSelectedZoom = map.getZoom();
      openPanelForLeg(v, true);
    });

    detailsGrid.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a.signups-link") : null;
      if (!a) return;
      e.preventDefault();
      const legKey = a.getAttribute("data-leg");
      if (!legKey) return;
      openSignupsModal(legKey);
    });
  }

  initMap();

  Promise.all([
    loadTakenLegsForDropdown(),
    loadGeojson(),
    loadLegSignups().then((d) => {
      signupsByLeg = d;
      if (selectedLegKey) {
        const sv = document.getElementById("signupsValue");
        const p = propsByLeg.get(String(selectedLegKey));
        if (sv && p) sv.innerHTML = renderSignupsValue(p.leg);
      }
    })
  ])
    .then(() => {
      applyAvailabilityToSelect(legSelect);
      wireUI();
    })
    .catch((err) => {
      console.error(err);
      panelTip.textContent = "Couldn’t load the route. Please try again.";
    });
})();
