(() => {
  "use strict";

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";

  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";

  const LEG_SIGNUPS_URL = "get_leg_signups.php";

  let signupsByLeg = null; // { [legNumber]: { count: number, names: string[] } }

  // Estimated set off and finish times per leg
  // These are displayed in the panel (formatted to "0800 Sat 16 May")
  const LEG_TIMES = {"1":{"setoff":"Sat 16 May 2026 08:00","finish":"Sat 16 May 2026 10:27"},"2":{"setoff":"Sat 16 May 2026 10:27","finish":"Sat 16 May 2026 13:44"},"3":{"setoff":"Sat 16 May 2026 13:44","finish":"Sat 16 May 2026 16:22"},"4":{"setoff":"Sat 16 May 2026 16:22","finish":"Sat 16 May 2026 18:33"},"5":{"setoff":"Sat 16 May 2026 18:33","finish":"Sat 16 May 2026 20:01"},"6":{"setoff":"Sat 16 May 2026 20:01","finish":"Sat 16 May 2026 21:51"},"7":{"setoff":"Sat 16 May 2026 21:51","finish":"Sat 16 May 2026 23:41"},"8":{"setoff":"Sat 16 May 2026 23:41","finish":"Sun 17 May 2026 02:14"},"9":{"setoff":"Sun 17 May 2026 02:14","finish":"Sun 17 May 2026 04:48"},"10":{"setoff":"Sun 17 May 2026 04:48","finish":"Sun 17 May 2026 07:00"},"11":{"setoff":"Sun 17 May 2026 07:00","finish":"Sun 17 May 2026 09:19"},"12":{"setoff":"Sun 17 May 2026 09:19","finish":"Sun 17 May 2026 11:53"},"13":{"setoff":"Sun 17 May 2026 11:53","finish":"Sun 17 May 2026 15:03"},"14":{"setoff":"Sun 17 May 2026 15:03","finish":"Sun 17 May 2026 16:45"},"15":{"setoff":"Sun 17 May 2026 16:45","finish":"Sun 17 May 2026 19:26"},"16":{"setoff":"Sun 17 May 2026 19:26","finish":"Sun 17 May 2026 21:31"},"17":{"setoff":"Sun 17 May 2026 21:31","finish":"Sun 17 May 2026 23:06"},"18":{"setoff":"Sun 17 May 2026 23:06","finish":"Mon 18 May 2026 01:39"},"19":{"setoff":"Mon 18 May 2026 01:39","finish":"Mon 18 May 2026 04:35"},"20":{"setoff":"Mon 18 May 2026 04:35","finish":"Mon 18 May 2026 07:42"},"21":{"setoff":"Mon 18 May 2026 07:42","finish":"Mon 18 May 2026 10:48"},"22":{"setoff":"Mon 18 May 2026 10:48","finish":"Mon 18 May 2026 12:31"},"23":{"setoff":"Mon 18 May 2026 12:31","finish":"Mon 18 May 2026 14:50"},"24":{"setoff":"Mon 18 May 2026 14:50","finish":"Mon 18 May 2026 17:45"},"25":{"setoff":"Mon 18 May 2026 17:45","finish":"Mon 18 May 2026 19:02"},"26":{"setoff":"Mon 18 May 2026 19:02","finish":"Mon 18 May 2026 21:47"},"27":{"setoff":"Mon 18 May 2026 21:47","finish":"Tue 19 May 2026 00:35"},"28":{"setoff":"Tue 19 May 2026 00:35","finish":"Tue 19 May 2026 04:15"},"29":{"setoff":"Tue 19 May 2026 04:15","finish":"Tue 19 May 2026 06:37"},"30":{"setoff":"Tue 19 May 2026 06:37","finish":"Tue 19 May 2026 09:13"},"31":{"setoff":"Tue 19 May 2026 09:13","finish":"Tue 19 May 2026 12:41"},"32":{"setoff":"Tue 19 May 2026 12:41","finish":"Tue 19 May 2026 14:53"},"33":{"setoff":"Tue 19 May 2026 14:53","finish":"Tue 19 May 2026 16:28"},"34":{"setoff":"Tue 19 May 2026 16:28","finish":"Tue 19 May 2026 19:02"},"35":{"setoff":"Tue 19 May 2026 19:02","finish":"Tue 19 May 2026 21:28"},"36":{"setoff":"Tue 19 May 2026 21:28","finish":"Wed 20 May 2026 00:24"},"37":{"setoff":"Wed 20 May 2026 00:24","finish":"Wed 20 May 2026 03:12"},"38":{"setoff":"Wed 20 May 2026 03:12","finish":"Wed 20 May 2026 06:15"},"39":{"setoff":"Wed 20 May 2026 06:15","finish":"Wed 20 May 2026 08:56"},"40":{"setoff":"Wed 20 May 2026 08:56","finish":"Wed 20 May 2026 11:51"},"41":{"setoff":"Wed 20 May 2026 11:51","finish":"Wed 20 May 2026 14:25"},"42":{"setoff":"Wed 20 May 2026 14:25","finish":"Wed 20 May 2026 16:51"},"43":{"setoff":"Wed 20 May 2026 16:51","finish":"Wed 20 May 2026 20:31"},"44":{"setoff":"Wed 20 May 2026 20:31","finish":"Wed 20 May 2026 22:57"},"45":{"setoff":"Wed 20 May 2026 22:57","finish":"Thu 21 May 2026 01:31"},"46":{"setoff":"Thu 21 May 2026 01:31","finish":"Thu 21 May 2026 04:05"},"47":{"setoff":"Thu 21 May 2026 04:05","finish":"Thu 21 May 2026 07:00"},"48":{"setoff":"Thu 21 May 2026 07:00","finish":"Thu 21 May 2026 09:34"},"49":{"setoff":"Thu 21 May 2026 09:34","finish":"Thu 21 May 2026 12:30"},"50":{"setoff":"Thu 21 May 2026 12:30","finish":"Thu 21 May 2026 14:56"},"51":{"setoff":"Thu 21 May 2026 14:56","finish":"Thu 21 May 2026 17:19"},"52":{"setoff":"Thu 21 May 2026 17:19","finish":"Thu 21 May 2026 20:36"},"53":{"setoff":"Thu 21 May 2026 20:36","finish":"Thu 21 May 2026 22:33"},"54":{"setoff":"Thu 21 May 2026 22:33","finish":"Fri 22 May 2026 00:52"},"55":{"setoff":"Fri 22 May 2026 00:52","finish":"Fri 22 May 2026 03:55"},"56":{"setoff":"Fri 22 May 2026 03:55","finish":"Fri 22 May 2026 07:13"},"57":{"setoff":"Fri 22 May 2026 07:13","finish":"Fri 22 May 2026 09:39"},"58":{"setoff":"Fri 22 May 2026 09:39","finish":"Fri 22 May 2026 12:57"},"59":{"setoff":"Fri 22 May 2026 12:57","finish":"Fri 22 May 2026 15:38"},"60":{"setoff":"Fri 22 May 2026 15:38","finish":"Fri 22 May 2026 17:49"},"61":{"setoff":"Fri 22 May 2026 17:49","finish":"Fri 22 May 2026 20:08"},"62":{"setoff":"Fri 22 May 2026 20:08","finish":"Fri 22 May 2026 22:35"},"63":{"setoff":"Fri 22 May 2026 22:35","finish":"Sat 23 May 2026 01:16"},"64":{"setoff":"Sat 23 May 2026 01:16","finish":"Sat 23 May 2026 04:19"},"65":{"setoff":"Sat 23 May 2026 04:19","finish":"Sat 23 May 2026 07:36"},"66":{"setoff":"Sat 23 May 2026 07:36","finish":"Sat 23 May 2026 10:10"},"67":{"setoff":"Sat 23 May 2026 10:10","finish":"Sat 23 May 2026 12:11"},"68":{"setoff":"Sat 23 May 2026 12:11","finish":"Sat 23 May 2026 14:00"}};

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

  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  let routeLayer = null;
  const startMarkersLayer = L.layerGroup().addTo(map);

  let selectedLegKey = null;
  let finishMarker = null;
  let lastSelectedCenter = null;
  let lastSelectedZoom = null;

  const layerByLeg = new Map();
  const markerByLeg = new Map();
  const propsByLeg = new Map();

  function safe(v) {
    const s = String(v ?? "");
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatKm(km) {
    const n = Number(km);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)} km`;
  }

  function formatM(m) {
    const n = Number(m);
    if (!Number.isFinite(n)) return "—";
    return `${Math.round(n)} m`;
  }

  function asLink(url, text) {
    const u = safe(url);
    if (!u || u === "—") return "—";
    return `<a href="${u}" target="_blank" rel="noopener">${safe(text)}</a>`;
  }

  function getLegTiming(legKey) {
    const k = String(legKey);
    return LEG_TIMES[k] || { setoff: "—", finish: "—" };
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
    if (!v || typeof v.count !== "number") return { count: 0, names: [] };
    return {
      count: Number(v.count) || 0,
      names: Array.isArray(v.names) ? v.names : [],
    };
  }

  function ensureSignupsModal() {
    if (document.getElementById("signupsModalBackdrop")) return;

    const style = document.createElement("style");
    style.textContent = `
      .signups-link { text-decoration: underline; cursor: pointer; }
      .signups-modal-backdrop{
        position:fixed; inset:0; background:rgba(0,0,0,.6);
        display:none; align-items:center; justify-content:center;
        padding:20px; z-index:9999;
      }
      .signups-modal{
        background:#fff; border:2px solid #000; border-radius:18px;
        padding:16px; max-width:520px; width:100%; box-sizing:border-box;
        color:#111;
      }
      .signups-modal h3{ margin:0 0 10px 0; font-size:18px; }
      .signups-modal ul{ margin:0; padding-left:18px; }
      .signups-modal li{ margin:6px 0; }
      .signups-modal .btn{
        margin-top:12px; padding:10px 14px; border-radius:14px;
        border:2px solid #000; background:#FAEBC8; font-weight:800;
        width:100%; cursor:pointer;
      }
      .signups-modal .muted{ color:rgba(0,0,0,.7); font-size:14px; }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.id = "signupsModalBackdrop";
    backdrop.className = "signups-modal-backdrop";
    backdrop.innerHTML = `
      <div class="signups-modal" role="dialog" aria-modal="true" aria-labelledby="signupsModalTitle">
        <h3 id="signupsModalTitle">Signed up</h3>
        <div id="signupsModalBody"></div>
        <button type="button" class="btn" id="signupsModalClose">Close</button>
      </div>
    `;
    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.style.display = "none";
    };

    document.getElementById("signupsModalClose").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop.style.display === "flex") close();
    });
  }

  function openSignupsModal(legKey) {
    ensureSignupsModal();
    const info = getLegSignupInfo(legKey);
    const body = document.getElementById("signupsModalBody");
    const title = document.getElementById("signupsModalTitle");
    const k = String(legKey);

    title.textContent = `Leg ${k} — signed up`;

    if (!info) {
      body.innerHTML = `<p class="muted">Unable to load signups right now.</p>`;
    } else if (!info.names || info.names.length === 0) {
      body.innerHTML = `<p class="muted">No confirmed signups yet.</p>`;
    } else {
      const items = info.names.map((n) => `<li>${safe(n)}</li>`).join("");
      body.innerHTML = `<ul>${items}</ul>`;
    }

    const backdrop = document.getElementById("signupsModalBackdrop");
    backdrop.style.display = "flex";
  }

  function renderSignupsValue(legKey) {
    const info = getLegSignupInfo(legKey);
    if (!info) return `<span data-leg="${safe(legKey)}">—</span>`;
    const c = info.count || 0;
    if (c <= 0) return `<span data-leg="${safe(legKey)}">0 signed up</span>`;
    return `<a href="#" class="signups-link" data-leg="${safe(legKey)}">${c} signed up</a>`;
  }

  function updateSignupsValueIfVisible() {
    const rowValue = document.getElementById("signupsValue");
    if (!rowValue) return;
    const legKey = selectedLegKey || rowValue.getAttribute("data-leg") || "";
    if (!legKey) return;
    rowValue.innerHTML = renderSignupsValue(legKey);
  }

  function setCollapsed() {
    panel.classList.add("collapsed");
    panelTip.style.display = "block";
    panelExpanded.style.display = "none";
  }

  function setExpanded() {
    panel.classList.remove("collapsed");
    panelTip.style.display = "none";
    panelExpanded.style.display = "block";
  }

  function lineStyle(mode) {
    const isSelected = mode === "selected";
    return {
      color: isSelected ? ORANGE : GREY,
      weight: isSelected ? 6 : 4,
      opacity: 0.95,
    };
  }

  function diamondSvg(color, stroke) {
    return `
      <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="4" width="14" height="14" transform="rotate(45 11 11)" fill="${color}" stroke="${stroke}" stroke-width="2" />
      </svg>
    `.trim();
  }

  function diamondIcon(legKey, mode) {
    const isSelected = mode === "selected";
    const color = isSelected ? ORANGE : "#e8e8e8";
    const stroke = isSelected ? "#000" : "#000";
    return L.divIcon({
      className: "",
      html: diamondSvg(color, stroke),
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  function finishIcon() {
    return L.divIcon({
      className: "",
      html: `
        <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="${ORANGE}" stroke="#000" stroke-width="2"/>
        </svg>
      `.trim(),
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  function clearFinishFlag() {
    if (finishMarker) {
      finishMarker.remove();
      finishMarker = null;
    }
  }

  function applySelectionStyles(selectedKey) {
    for (const [k, layer] of layerByLeg.entries()) {
      layer.setStyle(lineStyle(k === selectedKey ? "selected" : "normal"));
    }
    for (const [k, marker] of markerByLeg.entries()) {
      marker.setIcon(diamondIcon(k, k === selectedKey ? "selected" : "normal"));
    }
  }

  function clearSelection(restoreView) {
    selectedLegKey = null;
    legSelect.value = "";
    setCollapsed();
    clearFinishFlag();

    for (const layer of layerByLeg.values()) layer.setStyle(lineStyle("normal"));
    for (const [k, marker] of markerByLeg.entries()) marker.setIcon(diamondIcon(k, "normal"));

    if (restoreView && lastSelectedCenter && Number.isFinite(lastSelectedZoom)) {
      map.setView(lastSelectedCenter, lastSelectedZoom);
    }
  }

  function renderDetails(props) {
    const leg = safe(props.leg);
    const start = safe(props.start);
    const end = safe(props.end);

    panelLegTitle.textContent = `Leg ${leg}`;
    panelSubtitle.textContent = (start !== "—" && end !== "—") ? `${start} to ${end}` : "";

    const t = getLegTiming(props.leg);

    detailsGrid.innerHTML = `
      <div class="row"><div class="label">Distance</div><div class="value">${formatKm(props.distance_km)}</div></div>
      <div class="row"><div class="label">Elevation gain</div><div class="value">${formatM(props.elevation_gain_m)}</div></div>
      <div class="row"><div class="label">Difficulty</div><div class="value">${safe(props.difficulty)}</div></div>
      <div class="row"><div class="label">Signed up</div><div class="value" id="signupsValue" data-leg="${safe(props.leg)}">${renderSignupsValue(props.leg)}</div></div>
      <div class="row"><div class="label">Estimated set off time</div><div class="value">${t.setoff}</div></div>
      <div class="row"><div class="label">Estimated finish time</div><div class="value">${t.finish}</div></div>
      <div class="row"><div class="label">Strava route</div><div class="value">${asLink(props.strava_url, "Open")}</div></div>
      <div class="row"><div class="label">Strava GPX</div><div class="value">${asLink(props.strava_gpx_url, "Download")}</div></div>
    `;
  }

  function openPanelForLeg(legKey, centerAndZoom) {
    selectedLegKey = String(legKey);

    const props = propsByLeg.get(selectedLegKey);
    if (!props) return;

    setExpanded();
    applySelectionStyles(selectedLegKey);
    renderDetails(props);
    updateSignupsValueIfVisible();

    clearFinishFlag();
    const finishLat = props.finish_lat;
    const finishLng = props.finish_lng;
    if (finishLat && finishLng) {
      finishMarker = L.marker([finishLat, finishLng], { icon: finishIcon() }).addTo(map);
    }

    legSelect.value = selectedLegKey;

    if (centerAndZoom) {
      const layer = layerByLeg.get(selectedLegKey);
      if (layer) {
        map.fitBounds(layer.getBounds(), { padding: [35, 35] });
      }
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

        // DIAMONDS: always place at the polyline bounds centre (reliable)
        const center = layer.getBounds().getCenter();
        const marker = L.marker(center, { icon: diamondIcon(legKey, "normal") });

        marker.on("click", () => {
          lastSelectedCenter = map.getCenter();
          lastSelectedZoom = map.getZoom();
          openPanelForLeg(legKey, true);
        });

        markerByLeg.set(legKey, marker);
        marker.addTo(startMarkersLayer);

        // Dropdown option (kept as original: "Leg X")
        const opt = document.createElement("option");
        opt.value = legKey;
        opt.textContent = `Leg ${legKey}`;
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

  Promise.all([
    loadGeojson(),
    loadLegSignups().then((d) => {
      signupsByLeg = d;
      updateSignupsValueIfVisible();
    }),
  ])
    .then(() => wireUI())
    .catch((err) => {
      console.error(err);
      panelTip.textContent = "Couldn’t load the route. Please try again.";
    });
})();
