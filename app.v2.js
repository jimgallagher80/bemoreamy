(() => {
  "use strict";

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";

  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";

  const LEG_SIGNUPS_URL = "get_leg_signups.php";
  const TAKEN_LEGS_URL = "get_taken_legs.php";
  let signupsByLeg = null; // loaded once, approved-only names
  let takenByLeg = null;   // loaded once, confirmed-only team names

  // Estimated set off and finish times per leg
  // These are displayed in the panel (formatted to "0800 Sat 16 May")
  const LEG_TIMES = {
    1: { setoff: "0700 Sat 16 May", finish: "0945 Sat 16 May" },
    2: { setoff: "0945 Sat 16 May", finish: "1215 Sat 16 May" },
    3: { setoff: "1215 Sat 16 May", finish: "1530 Sat 16 May" },
    4: { setoff: "1530 Sat 16 May", finish: "1845 Sat 16 May" },
    5: { setoff: "1845 Sat 16 May", finish: "2130 Sat 16 May" },
    6: { setoff: "2130 Sat 16 May", finish: "0015 Sun 17 May" },
    7: { setoff: "0015 Sun 17 May", finish: "0300 Sun 17 May" },
    8: { setoff: "0300 Sun 17 May", finish: "0545 Sun 17 May" },
    9: { setoff: "0545 Sun 17 May", finish: "0830 Sun 17 May" },
    10: { setoff: "0830 Sun 17 May", finish: "1115 Sun 17 May" },
    11: { setoff: "1115 Sun 17 May", finish: "1400 Sun 17 May" },
    12: { setoff: "1400 Sun 17 May", finish: "1645 Sun 17 May" },
    13: { setoff: "1645 Sun 17 May", finish: "1930 Sun 17 May" },
    14: { setoff: "1930 Sun 17 May", finish: "2215 Sun 17 May" },
    15: { setoff: "2215 Sun 17 May", finish: "0100 Mon 18 May" },
    16: { setoff: "0100 Mon 18 May", finish: "0345 Mon 18 May" },
    17: { setoff: "0345 Mon 18 May", finish: "0630 Mon 18 May" },
    18: { setoff: "0630 Mon 18 May", finish: "0915 Mon 18 May" },
    19: { setoff: "0915 Mon 18 May", finish: "1200 Mon 18 May" },
    20: { setoff: "1200 Mon 18 May", finish: "1445 Mon 18 May" },
    21: { setoff: "1445 Mon 18 May", finish: "1730 Mon 18 May" },
    22: { setoff: "1730 Mon 18 May", finish: "2015 Mon 18 May" },
    23: { setoff: "2015 Mon 18 May", finish: "2300 Mon 18 May" },
    24: { setoff: "2300 Mon 18 May", finish: "0145 Tue 19 May" },
    25: { setoff: "0145 Tue 19 May", finish: "0430 Tue 19 May" },
    26: { setoff: "0430 Tue 19 May", finish: "0715 Tue 19 May" },
    27: { setoff: "0715 Tue 19 May", finish: "1000 Tue 19 May" },
    28: { setoff: "1000 Tue 19 May", finish: "1245 Tue 19 May" },
    29: { setoff: "1245 Tue 19 May", finish: "1530 Tue 19 May" },
    30: { setoff: "1530 Tue 19 May", finish: "1815 Tue 19 May" },
    31: { setoff: "1815 Tue 19 May", finish: "2100 Tue 19 May" },
    32: { setoff: "2100 Tue 19 May", finish: "2345 Tue 19 May" },
    33: { setoff: "2345 Tue 19 May", finish: "0230 Wed 20 May" },
    34: { setoff: "0230 Wed 20 May", finish: "0515 Wed 20 May" },
    35: { setoff: "0515 Wed 20 May", finish: "0800 Wed 20 May" },
    36: { setoff: "0800 Wed 20 May", finish: "1045 Wed 20 May" },
    37: { setoff: "1045 Wed 20 May", finish: "1330 Wed 20 May" },
    38: { setoff: "1330 Wed 20 May", finish: "1615 Wed 20 May" },
    39: { setoff: "1615 Wed 20 May", finish: "1900 Wed 20 May" },
    40: { setoff: "1900 Wed 20 May", finish: "2145 Wed 20 May" },
    41: { setoff: "2145 Wed 20 May", finish: "0030 Thu 21 May" },
    42: { setoff: "0030 Thu 21 May", finish: "0315 Thu 21 May" },
    43: { setoff: "0315 Thu 21 May", finish: "0600 Thu 21 May" },
    44: { setoff: "0600 Thu 21 May", finish: "0845 Thu 21 May" },
    45: { setoff: "0845 Thu 21 May", finish: "1130 Thu 21 May" },
    46: { setoff: "1130 Thu 21 May", finish: "1415 Thu 21 May" },
    47: { setoff: "1415 Thu 21 May", finish: "1700 Thu 21 May" },
    48: { setoff: "1700 Thu 21 May", finish: "1945 Thu 21 May" },
    49: { setoff: "1945 Thu 21 May", finish: "2230 Thu 21 May" },
    50: { setoff: "2230 Thu 21 May", finish: "0115 Fri 22 May" },
    51: { setoff: "0115 Fri 22 May", finish: "0400 Fri 22 May" },
    52: { setoff: "0400 Fri 22 May", finish: "0645 Fri 22 May" },
    53: { setoff: "0645 Fri 22 May", finish: "0930 Fri 22 May" },
    54: { setoff: "0930 Fri 22 May", finish: "1215 Fri 22 May" },
    55: { setoff: "1215 Fri 22 May", finish: "1500 Fri 22 May" },
    56: { setoff: "1500 Fri 22 May", finish: "1745 Fri 22 May" },
    57: { setoff: "1745 Fri 22 May", finish: "2030 Fri 22 May" },
    58: { setoff: "2030 Fri 22 May", finish: "2315 Fri 22 May" },
    59: { setoff: "2315 Fri 22 May", finish: "0200 Sat 23 May" },
    60: { setoff: "0200 Sat 23 May", finish: "0445 Sat 23 May" },
    61: { setoff: "0445 Sat 23 May", finish: "0730 Sat 23 May" },
    62: { setoff: "0730 Sat 23 May", finish: "1015 Sat 23 May" },
    63: { setoff: "1015 Sat 23 May", finish: "1300 Sat 23 May" },
    64: { setoff: "1300 Sat 23 May", finish: "1545 Sat 23 May" },
    65: { setoff: "1545 Sat 23 May", finish: "1830 Sat 23 May" },
    66: { setoff: "1830 Sat 23 May", finish: "2115 Sat 23 May" },
    67: { setoff: "2115 Sat 23 May", finish: "0000 Sun 24 May" },
    68: { setoff: "0000 Sun 24 May", finish: "0300 Sun 24 May" }
  };

  const mapEl = document.getElementById("map");
  const panel = document.getElementById("legPanel");
  const panelTitle = document.getElementById("panelTitle");
  const panelBody = document.getElementById("panelBody");
  const panelTip = document.getElementById("panelTip");
  const selectEl = document.getElementById("legSelect");

  let map, geoLayer, finishMarker;
  let selectedLegKey = null;
  let propsByLeg = new Map();

  function safe(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }

  function formatKm(m) {
    if (!Number.isFinite(m)) return "—";
    return `${(m / 1000).toFixed(1)} km`;
  }

  function formatM(m) {
    if (!Number.isFinite(m)) return "—";
    return `${Math.round(m)} m`;
  }

  async function loadGeojson() {
    const res = await fetch(GEOJSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load GeoJSON");
    return res.json();
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

  async function loadTakenLegs() {
    try {
      const res = await fetch(TAKEN_LEGS_URL, { cache: "no-store" });
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

  function getTakenLegTeamName(legKey) {
    if (!takenByLeg) return null;
    const k = String(legKey);
    const v = takenByLeg[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    return null;
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

  function renderSignupsValue(legKey) {
    const teamName = getTakenLegTeamName(legKey);
    if (!teamName) return "Available for signup";
    return `<a href="#" class="signups-link" data-leg="${String(legKey)}">Taken - ${safe(teamName)}</a>`;
  }

  function initMap() {
    map = L.map(mapEl, { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }

  function legStyle(feature) {
    const legKey = String(feature.properties.leg);
    if (selectedLegKey && legKey === String(selectedLegKey)) {
      return { color: ORANGE, weight: 5, opacity: 1 };
    }
    return { color: GREY, weight: 4, opacity: 0.9 };
  }

  function setFinishMarker(feature) {
    if (finishMarker) {
      map.removeLayer(finishMarker);
      finishMarker = null;
    }
    const coords = feature.geometry.coordinates;
    const last = coords[coords.length - 1];
    if (!last) return;

    const latlng = [last[1], last[0]];

    const icon = L.divIcon({
      className: "finish-flag",
      html: "🏁",
      iconSize: [26, 26],
      iconAnchor: [13, 26]
    });

    finishMarker = L.marker(latlng, { icon }).addTo(map);
  }

  function makeDiamondMarker(latlng, legNumber) {
    const html = `
      <div class="diamond-wrap">
        <div class="diamond">
          <span class="diamond-text">${safe(legNumber)}</span>
        </div>
      </div>
    `;
    const icon = L.divIcon({
      className: "diamond-marker",
      html,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    return L.marker(latlng, { icon });
  }

  function addDiamondMarkers(geojson) {
    const group = L.layerGroup();
    geojson.features.forEach((f) => {
      const coords = f.geometry.coordinates;
      const first = coords && coords[0];
      if (!first) return;
      const latlng = [first[1], first[0]];
      const m = makeDiamondMarker(latlng, f.properties.leg);
      group.addLayer(m);
    });
    group.addTo(map);
  }

  function populateSelectOptions(geojson) {
    const legs = geojson.features
      .map((f) => f.properties.leg)
      .filter((v) => Number.isFinite(Number(v)))
      .map((v) => Number(v))
      .sort((a, b) => a - b);

    selectEl.innerHTML = `<option value="">Select leg</option>` +
      legs.map((n) => `<option value="${n}">Leg ${n}</option>`).join("");
  }

  function renderPanel(feature) {
    const props = feature.properties;
    const t = LEG_TIMES[Number(props.leg)] || { setoff: "—", finish: "—" };

    panelTitle.textContent = `Leg ${props.leg}`;
    panelTip.textContent = "Tap another leg or use the dropdown.";

    panelBody.innerHTML = `
      <div class="rows">
        <div class="row"><div class="label">Start</div><div class="value">${safe(props.start)}</div></div>
        <div class="row"><div class="label">Finish</div><div class="value">${safe(props.finish)}</div></div>
        <div class="row"><div class="label">Distance</div><div class="value">${formatKm(props.length_m)}</div></div>
        <div class="row"><div class="label">Elevation gain</div><div class="value">${formatM(props.elevation_gain_m)}</div></div>
        <div class="row"><div class="label">Difficulty</div><div class="value">${safe(props.difficulty)}</div></div>
        <div class="row"><div class="label">Team</div><div class="value" id="signupsValue">${renderSignupsValue(props.leg)}</div></div>
        <div class="row"><div class="label">Estimated set off time</div><div class="value">${t.setoff}</div></div>
        <div class="row"><div class="label">Estimated finish time</div><div class="value">${t.finish}</div></div>
      </div>
    `;
  }

  function selectLegByKey(legKey) {
    selectedLegKey = String(legKey);

    const feature = propsByLeg.get(String(legKey));
    if (!feature) return;

    geoLayer.setStyle(legStyle);
    renderPanel(feature);
    setFinishMarker(feature);

    const bounds = geoLayer.getBounds();
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  function wireLayer(geojson) {
    propsByLeg = new Map();

    geoLayer = L.geoJSON(geojson, {
      style: legStyle,
      onEachFeature: (feature, layer) => {
        const k = String(feature.properties.leg);
        propsByLeg.set(k, feature);
        layer.on("click", () => {
          selectEl.value = k;
          selectLegByKey(k);
        });
      }
    }).addTo(map);

    addDiamondMarkers(geojson);
    populateSelectOptions(geojson);

    const firstLeg = geojson.features && geojson.features[0];
    if (firstLeg) {
      const firstKey = String(firstLeg.properties.leg);
      selectEl.value = firstKey;
      selectLegByKey(firstKey);
    }
  }

  function wireUI() {
    selectEl.addEventListener("change", () => {
      const v = selectEl.value;
      if (!v) return;
      selectLegByKey(v);
    });

    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest(".signups-link") : null;
      if (!a) return;
      e.preventDefault();
      const legKey = a.getAttribute("data-leg");
      openSignupsModal(legKey);
    });
  }

  initMap();

  Promise.all([
    loadGeojson(),
    loadLegSignups().then((d) => {
      signupsByLeg = d;
    }),
    loadTakenLegs().then((d) => {
      takenByLeg = d;
    })
  ])
    .then((vals) => {
      const geojson = vals[0];
      wireLayer(geojson);
    })
    .then(() => {
      wireUI();
      if (selectedLegKey) {
        const sv = document.getElementById("signupsValue");
        const p = propsByLeg.get(String(selectedLegKey));
        if (sv && p) sv.innerHTML = renderSignupsValue(p.leg);
      }
    })
    .catch((err) => {
      console.error(err);
      panelTip.textContent = "Couldn’t load the route. Please try again.";
    });
})();
