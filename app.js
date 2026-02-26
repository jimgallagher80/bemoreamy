(() => {
  "use strict";

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";

  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";

  // Set-off and estimated finish times per leg (source: route timing sheet)
  const LEG_TIMES = {"1":{"setoff":"Sat 16 May 2026 08:00","finish":"Sat 16 May 2026 10:27"},"2":{"setoff":"Sat 16 May 2026 10:27","finish":"Sat 16 May 2026 13:44"},"3":{"setoff":"Sat 16 May 2026 13:44","finish":"Sat 16 May 2026 16:22"},"4":{"setoff":"Sat 16 May 2026 16:22","finish":"Sat 16 May 2026 18:33"},"5":{"setoff":"Sat 16 May 2026 18:33","finish":"Sat 16 May 2026 20:01"},"6":{"setoff":"Sat 16 May 2026 20:01","finish":"Sat 16 May 2026 21:51"},"7":{"setoff":"Sat 16 May 2026 21:51","finish":"Sat 16 May 2026 23:41"},"8":{"setoff":"Sat 16 May 2026 23:41","finish":"Sun 17 May 2026 02:14"},"9":{"setoff":"Sun 17 May 2026 02:14","finish":"Sun 17 May 2026 04:48"},"10":{"setoff":"Sun 17 May 2026 04:48","finish":"Sun 17 May 2026 07:00"},"11":{"setoff":"Sun 17 May 2026 07:00","finish":"Sun 17 May 2026 09:19"},"12":{"setoff":"Sun 17 May 2026 09:19","finish":"Sun 17 May 2026 11:53"},"13":{"setoff":"Sun 17 May 2026 11:53","finish":"Sun 17 May 2026 15:03"},"14":{"setoff":"Sun 17 May 2026 15:03","finish":"Sun 17 May 2026 16:45"},"15":{"setoff":"Sun 17 May 2026 16:45","finish":"Sun 17 May 2026 19:26"},"16":{"setoff":"Sun 17 May 2026 19:26","finish":"Sun 17 May 2026 21:31"},"17":{"setoff":"Sun 17 May 2026 21:31","finish":"Sun 17 May 2026 23:06"},"18":{"setoff":"Sun 17 May 2026 23:06","finish":"Mon 18 May 2026 01:39"},"19":{"setoff":"Mon 18 May 2026 01:39","finish":"Mon 18 May 2026 04:35"},"20":{"setoff":"Mon 18 May 2026 04:35","finish":"Mon 18 May 2026 07:42"},"21":{"setoff":"Mon 18 May 2026 07:42","finish":"Mon 18 May 2026 10:48"},"22":{"setoff":"Mon 18 May 2026 10:48","finish":"Mon 18 May 2026 12:31"},"23":{"setoff":"Mon 18 May 2026 12:31","finish":"Mon 18 May 2026 14:50"},"24":{"setoff":"Mon 18 May 2026 14:50","finish":"Mon 18 May 2026 17:45"},"25":{"setoff":"Mon 18 May 2026 17:45","finish":"Mon 18 May 2026 19:02"},"26":{"setoff":"Mon 18 May 2026 19:02","finish":"Mon 18 May 2026 21:47"},"27":{"setoff":"Mon 18 May 2026 21:47","finish":"Tue 19 May 2026 00:35"},"28":{"setoff":"Tue 19 May 2026 00:35","finish":"Tue 19 May 2026 04:15"},"29":{"setoff":"Tue 19 May 2026 04:15","finish":"Tue 19 May 2026 06:37"},"30":{"setoff":"Tue 19 May 2026 06:37","finish":"Tue 19 May 2026 09:13"},"31":{"setoff":"Tue 19 May 2026 09:13","finish":"Tue 19 May 2026 12:41"},"32":{"setoff":"Tue 19 May 2026 12:41","finish":"Tue 19 May 2026 14:53"},"33":{"setoff":"Tue 19 May 2026 14:53","finish":"Tue 19 May 2026 16:28"},"34":{"setoff":"Tue 19 May 2026 16:28","finish":"Tue 19 May 2026 19:02"},"35":{"setoff":"Tue 19 May 2026 19:02","finish":"Tue 19 May 2026 21:28"},"36":{"setoff":"Tue 19 May 2026 21:28","finish":"Wed 20 May 2026 00:24"},"37":{"setoff":"Wed 20 May 2026 00:24","finish":"Wed 20 May 2026 03:12"},"38":{"setoff":"Wed 20 May 2026 03:12","finish":"Wed 20 May 2026 06:15"},"39":{"setoff":"Wed 20 May 2026 06:15","finish":"Wed 20 May 2026 08:56"},"40":{"setoff":"Wed 20 May 2026 08:56","finish":"Wed 20 May 2026 11:51"},"41":{"setoff":"Wed 20 May 2026 11:51","finish":"Wed 20 May 2026 14:25"},"42":{"setoff":"Wed 20 May 2026 14:25","finish":"Wed 20 May 2026 16:51"},"43":{"setoff":"Wed 20 May 2026 16:51","finish":"Wed 20 May 2026 20:31"},"44":{"setoff":"Wed 20 May 2026 20:31","finish":"Wed 20 May 2026 22:57"},"45":{"setoff":"Wed 20 May 2026 22:57","finish":"Thu 21 May 2026 01:31"},"46":{"setoff":"Thu 21 May 2026 01:31","finish":"Thu 21 May 2026 04:05"},"47":{"setoff":"Thu 21 May 2026 04:05","finish":"Thu 21 May 2026 07:00"},"48":{"setoff":"Thu 21 May 2026 07:00","finish":"Thu 21 May 2026 09:34"},"49":{"setoff":"Thu 21 May 2026 09:34","finish":"Thu 21 May 2026 12:30"},"50":{"setoff":"Thu 21 May 2026 12:30","finish":"Thu 21 May 2026 14:56"},"51":{"setoff":"Thu 21 May 2026 14:56","finish":"Thu 21 May 2026 17:19"},"52":{"setoff":"Thu 21 May 2026 17:19","finish":"Thu 21 May 2026 20:36"},"53":{"setoff":"Thu 21 May 2026 20:36","finish":"Thu 21 May 2026 22:33"},"54":{"setoff":"Thu 21 May 2026 22:33","finish":"Fri 22 May 2026 00:52"},"55":{"setoff":"Fri 22 May 2026 00:52","finish":"Fri 22 May 2026 03:55"},"56":{"setoff":"Fri 22 May 2026 03:55","finish":"Fri 22 May 2026 07:13"},"57":{"setoff":"Fri 22 May 2026 07:13","finish":"Fri 22 May 2026 09:39"},"58":{"setoff":"Fri 22 May 2026 09:39","finish":"Fri 22 May 2026 12:57"},"59":{"setoff":"Fri 22 May 2026 12:57","finish":"Fri 22 May 2026 15:38"},"60":{"setoff":"Fri 22 May 2026 15:38","finish":"Fri 22 May 2026 17:49"},"61":{"setoff":"Fri 22 May 2026 17:49","finish":"Fri 22 May 2026 20:08"},"62":{"setoff":"Fri 22 May 2026 20:08","finish":"Fri 22 May 2026 22:35"},"63":{"setoff":"Fri 22 May 2026 22:35","finish":"Sat 23 May 2026 01:16"},"64":{"setoff":"Sat 23 May 2026 01:16","finish":"Sat 23 May 2026 04:19"},"65":{"setoff":"Sat 23 May 2026 04:19","finish":"Sat 23 May 2026 07:36"},"66":{"setoff":"Sat 23 May 2026 07:36","finish":"Sat 23 May 2026 10:10"},"67":{"setoff":"Sat 23 May 2026 10:10","finish":"Sat 23 May 2026 12:11"},"68":{"setoff":"Sat 23 May 2026 12:11","finish":"Sat 23 May 2026 14:00"}};

  // Approved sign-ups per leg (loaded from the server)
  let LEG_SIGNUPS = {};

  async function loadLegSignups() {
    try {
      const res = await fetch("get_leg_signups.php", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && data.legs) {
        LEG_SIGNUPS = data.legs;
      }
    } catch (e) {
      // ignore
    }
  }

  function getLegTiming(leg) {
    const key = String(leg);
    if (LEG_TIMES && LEG_TIMES[key]) return LEG_TIMES[key];
    return { setoff: "—", finish: "—" };
  }

  function renderSignupLink(leg) {
    const key = String(leg);
    const entry = (LEG_SIGNUPS && LEG_SIGNUPS[key]) ? LEG_SIGNUPS[key] : { count: 0, names: [] };
    const count = Number(entry.count || 0);
    return `<a href="#" class="signupsLink" data-leg="${key}">${count} signed up</a>`;
  }

  function openSignupsModal(legKey) {
    const modal = document.getElementById("signupsModal");
    const title = document.getElementById("signupsModalTitle");
    const body = document.getElementById("signupsModalBody");
    const close = document.getElementById("signupsModalClose");
    if (!modal || !title || !body || !close) return;

    const entry = (LEG_SIGNUPS && LEG_SIGNUPS[String(legKey)]) ? LEG_SIGNUPS[String(legKey)] : { count: 0, names: [] };
    const names = Array.isArray(entry.names) ? entry.names : [];

    title.textContent = `Leg ${legKey} sign-ups`;

    if (names.length === 0) {
      body.innerHTML = `<p class="modal-muted">No approved sign-ups yet.</p>`;
    } else {
      const items = names
        .map(n => `${safe(n.first_name)} ${safe(n.last_name)}`.trim())
        .map(t => `<li>${t}</li>`)
        .join("");
      body.innerHTML = `<ul class="modal-list">${items}</ul>`;
    }

    modal.classList.add("open");

    const onClose = (ev) => {
      if (ev) ev.preventDefault?.();
      modal.classList.remove("open");
      document.removeEventListener("keydown", onEsc);
      modal.removeEventListener("click", onBackdrop);
      close.removeEventListener("click", onClose);
    };

    const onEsc = (ev) => {
      if (ev.key === "Escape") onClose(ev);
    };

    const onBackdrop = (ev) => {
      if (ev.target === modal) onClose(ev);
    };

    document.addEventListener("keydown", onEsc);
    modal.addEventListener("click", onBackdrop);
    close.addEventListener("click", onClose);
  }

  const $ = (id) => document.getElementById(id);

  const panel = $("panel");
  const panelTip = $("panelTip");
  const panelExpanded = $("panelExpanded");
  const panelLegTitle = $("panelLegTitle");
  const panelSubtitle = $("panelSubtitle");
  const detailsGrid = $("detailsGrid");
  const closeBtn = $("closeBtn");
  const legSelect = $("legSelect");
  const topbar = $("topbar");

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const safe = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    return String(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const formatKm = (km) => {
    const n = Number(km);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)} km`;
  };

  const formatM = (m) => {
    const n = Number(m);
    if (!Number.isFinite(n)) return "—";
    return `${Math.round(n)} m`;
  };

  const asLink = (url, label) => {
    if (!url) return "—";
    const u = safe(url);
    const l = safe(label || "Open");
    return `<a href="${u}" target="_blank" rel="noopener noreferrer">${l}</a>`;
  };

  const map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([50.6, -3.5], 7);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    detectRetina: true,
  }).addTo(map);

  const layerByLeg = new Map();
  const propsByLeg = new Map();
  const markerByLeg = new Map();

  let selectedLegKey = null;
  let lastSelectedCenter = null;
  let lastSelectedZoom = null;

  function createDiamondMarker(leg, state) {
    const isSelected = state === "selected";
    const isDim = state === "dim";

    const bg = isSelected ? ORANGE : (isDim ? GREY : ORANGE);
    const text = isSelected ? "#111" : (isDim ? "#f2f2f2" : "#111");

    return L.divIcon({
      className: "",
      html: `
        <div class="diamond-wrap" style="background:${bg}">
          <div class="diamond-num" style="color:${text}">${leg}</div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14],
    });
  }

  function applySelectionStyles(selectedKey) {
    for (const [legKey, layer] of layerByLeg.entries()) {
      const isSelected = String(legKey) === String(selectedKey);
      layer.setStyle({
        color: isSelected ? ORANGE : GREY,
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 1 : 0.55,
      });
      if (layer._path) {
        layer._path.style.filter = isSelected ? "drop-shadow(0 0 6px rgba(255,122,0,.35))" : "none";
      }
    }

    for (const [legKey, marker] of markerByLeg.entries()) {
      const isSelected = String(legKey) === String(selectedKey);
      const state = isSelected ? "selected" : (selectedKey ? "dim" : "normal");
      marker.setIcon(createDiamondMarker(legKey, state));
    }
  }

  function setExpanded() {
    panel.classList.add("expanded");
    panelExpanded.hidden = false;
    panelTip.hidden = true;
  }

  function setCollapsed() {
    panel.classList.remove("expanded");
    panelExpanded.hidden = true;
    panelTip.hidden = false;
  }

  function renderDetails(props) {
    const leg = safe(props.leg);
    const start = safe(props.start);
    const end = safe(props.end);

    panelLegTitle.textContent = `Leg ${leg}`;
    panelSubtitle.textContent = (start !== "—" && end !== "—") ? `${start} to ${end}` : "";

    detailsGrid.innerHTML = `
      <div class="row"><div class="label">Distance</div><div class="value">${formatKm(props.distance_km)}</div></div>
      <div class="row"><div class="label">Elevation gain</div><div class="value">${formatM(props.elevation_gain_m)}</div></div>
      <div class="row"><div class="label">Difficulty</div><div class="value">${safe(props.difficulty)}</div></div>
      <div class="row"><div class="label">Estimated set off</div><div class="value">${safe(getLegTiming(props.leg).setoff)}</div></div>
      <div class="row"><div class="label">Estimated finish</div><div class="value">${safe(getLegTiming(props.leg).finish)}</div></div>
      <div class="row"><div class="label">Sign-ups</div><div class="value">${renderSignupLink(props.leg)}</div></div>
      <div class="row"><div class="label">Strava route</div><div class="value">${asLink(props.strava_url, "Open")}</div></div>
      <div class="row"><div class="label">Strava GPX</div><div class="value">${asLink(props.strava_gpx_url, "Download")}</div></div>
    `;

    const link = detailsGrid.querySelector('.signupsLink');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const legKey = link.getAttribute('data-leg');
        if (legKey) openSignupsModal(legKey);
      });
    }
  }

  function clearFinishFlag() {
    if (window.__finishMarker) {
      map.removeLayer(window.__finishMarker);
      window.__finishMarker = null;
    }
  }

  function addFinishFlagForFeature(feature) {
    clearFinishFlag();

    const coords = feature?.geometry?.coordinates;
    if (!coords || !coords.length) return;

    const last = coords[coords.length - 1];
    if (!last || last.length < 2) return;

    const latlng = L.latLng(last[1], last[0]);

    const icon = L.divIcon({
      className: "finishFlag",
      html: "🏁",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    window.__finishMarker = L.marker(latlng, { icon }).addTo(map);
  }

  function fitAll() {
    const layers = Array.from(layerByLeg.values());
    if (!layers.length) return;

    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds(), { padding: [20, 20] });
  }

  function fitToLayerBetweenHeaderAndPanel(layer) {
    if (!layer) return;

    const bounds = layer.getBounds();
    const topH = topbar ? topbar.getBoundingClientRect().height : 0;
    const panelH = panel ? panel.getBoundingClientRect().height : 0;

    const padTop = Math.max(18, topH + 12);
    const padBottom = Math.max(18, panelH + 12);

    map.fitBounds(bounds, {
      paddingTopLeft: [14, padTop],
      paddingBottomRight: [14, padBottom],
      animate: true,
    });
  }

  function selectLeg(legKey) {
    const layer = layerByLeg.get(String(legKey));
    const props = propsByLeg.get(String(legKey));
    const marker = markerByLeg.get(String(legKey));
    if (!layer || !props) return;

    selectedLegKey = String(legKey);

    setExpanded();
    legSelect.value = String(legKey);

    renderDetails(props);
    applySelectionStyles(legKey);

    requestAnimationFrame(() => {
      fitToLayerBetweenHeaderAndPanel(layer);
      addFinishFlagForFeature(layer.feature);

      if (marker) {
        marker.bringToFront?.();
      }

      setTimeout(() => {
        lastSelectedCenter = map.getCenter();
        lastSelectedZoom = map.getZoom();
      }, 250);
    });
  }

  function clearSelection(animate) {
    selectedLegKey = null;
    applySelectionStyles(null);

    panelLegTitle.textContent = "Route map";
    panelSubtitle.textContent = "Tap a leg on the map, or use the dropdown.";
    detailsGrid.innerHTML = "";
    setCollapsed();

    legSelect.value = "";

    clearFinishFlag();

    if (animate && lastSelectedCenter && lastSelectedZoom) {
      map.setView(lastSelectedCenter, lastSelectedZoom, { animate: true });
    } else {
      fitAll();
    }
  }

  function populateDropdown(legs) {
    const frag = document.createDocumentFragment();
    for (const leg of legs) {
      const opt = document.createElement("option");
      opt.value = String(leg.properties.leg);
      opt.textContent = `Leg ${leg.properties.leg}: ${leg.properties.start} to ${leg.properties.end}`;
      frag.appendChild(opt);
    }
    legSelect.appendChild(frag);
  }

  async function load() {
    await loadLegSignups();

    const res = await fetch(GEOJSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch GeoJSON (${res.status})`);

    const geojson = await res.json();
    const features = Array.isArray(geojson.features) ? geojson.features : [];

    const legs = [];

    for (const f of features) {
      if (!f || !f.properties || !f.geometry) continue;

      const props = f.properties;
      const leg = String(props.leg);

      const layer = L.geoJSON(f, {
        style: {
          color: GREY,
          weight: 3,
          opacity: 0.55,
        },
      }).addTo(map);

      layer.on("click", () => selectLeg(leg));

      layerByLeg.set(leg, layer);
      propsByLeg.set(leg, props);
      legs.push(f);

      const center = layer.getBounds().getCenter();
      const marker = L.marker(center, { icon: createDiamondMarker(leg, "normal"), interactive: true }).addTo(map);
      marker.on("click", () => selectLeg(leg));
      markerByLeg.set(leg, marker);
    }

    legs.sort((a, b) => Number(a.properties.leg) - Number(b.properties.leg));
    populateDropdown(legs);

    fitAll();

    legSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) {
        clearSelection(false);
        return;
      }
      selectLeg(val);
    });

    closeBtn.addEventListener("click", () => {
      clearSelection(true);
    });
  }

  load().catch((err) => {
    console.error(err);
    panelTip.textContent = "Couldn’t load the route. Please check the GeoJSON file is available.";
  });
})();
