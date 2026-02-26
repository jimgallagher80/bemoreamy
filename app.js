(() => {
  "use strict";

  const GEOJSON_URL = "ALL_COASTAL_LEGS_ENRICHED.geojson";

  const ORANGE = "#ff7a00";
  const GREY = "#6a6a6a";

  // Estimated set off and finish times per leg
  // Source: your timing sheet (used on signup dropdown)
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

  // Marker layer group
  const startMarkersLayer = L.layerGroup().addTo(map);

  // State
  let selectedLineLayer = null;
  let selectedLegKey = null;
  let finishMarker = null;

  let lastSelectedCenter = null;
  let lastSelectedZoom = null;

  // Index
  const layerByLeg = new Map();     // leg -> polyline layer
  const propsByLeg = new Map();     // leg -> properties
  const markerByLeg = new Map();    // leg -> marker

  function safe(v) {
    return (v === undefined || v === null || v === "") ? "—" : v;
  }

  function formatLegTimeShort(dateTimeStr) {
    // "Sat 16 May 2026 08:00" -> "0800 Sat 16 May"
    if (!dateTimeStr) return "—";
    const parts = String(dateTimeStr).trim().split(/\s+/);
    if (parts.length < 5) return safe(dateTimeStr);
    const day = parts[0];
    const dd = parts[1];
    const mon = parts[2];
    const time = parts[4];
    const hhmm = String(time).replace(":", "");
    return `${hhmm} ${day} ${dd} ${mon}`;
  }

  function getLegTiming(legNumber) {
    const key = String(legNumber);
    const t = (LEG_TIMES && LEG_TIMES[key]) ? LEG_TIMES[key] : null;
    return {
      setoff: t ? formatLegTimeShort(t.setoff) : "—",
      finish: t ? formatLegTimeShort(t.finish) : "—",
    };
  }

  function formatKm(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2)} km`;
  }

  function formatM(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${Math.round(n)} m`;
  }

  function asLink(url, label) {
    if (!url) return "—";
    const u = String(url);
    return `<a href="${u}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  function lineStyle(state) {
    // "normal" | "dim" | "selected"
    if (state === "selected") {
      return {
        color: ORANGE,
        weight: 10,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      };
    }
    if (state === "dim") {
      return {
        color: GREY,
        weight: 5,
        opacity: 0.65,
        lineCap: "round",
        lineJoin: "round",
      };
    }
    return {
      color: ORANGE,
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    };
  }

  function diamondIcon(leg, state) {
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

  function finishIcon() {
    return L.divIcon({
      className: "finish-flag",
      html: "🏁",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12],
    });
  }

  function setCollapsed() {
    document.body.classList.remove("compact-header");
    panel.classList.remove("expanded");
    panel.classList.add("collapsed");
    panelExpanded.style.display = "none";
    panelTip.style.display = "block";
  }

  function setExpanded() {
    document.body.classList.add("compact-header");
    panel.classList.remove("collapsed");
    panel.classList.add("expanded");
    panelTip.style.display = "none";
    panelExpanded.style.display = "block";
  }

  function clearFinishFlag() {
    if (finishMarker) {
      map.removeLayer(finishMarker);
      finishMarker = null;
    }
  }

  function setAllLines(state) {
    if (!routeLayer) return;
    routeLayer.eachLayer((l) => l.setStyle(lineStyle(state)));
  }

  function setAllDiamonds(state) {
    for (const [legKey, marker] of markerByLeg.entries()) {
      if (!marker) continue;
      marker.setIcon(diamondIcon(legKey, state));
    }
  }

  function applySelectionStyles(legKey) {
    // Dim everything
    setAllLines("dim");
    setAllDiamonds("dim");

    // Highlight selected
    const selLine = layerByLeg.get(String(legKey));
    if (selLine) selLine.setStyle(lineStyle("selected"));

    const selMarker = markerByLeg.get(String(legKey));
    if (selMarker) selMarker.setIcon(diamondIcon(legKey, "selected"));
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
      <div class="row"><div class="label">Estimated set off time</div><div class="value">${getLegTiming(props.leg).setoff}</div></div>
      <div class="row"><div class="label">Estimated finish time</div><div class="value">${getLegTiming(props.leg).finish}</div></div>
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

    // Finish flag
    clearFinishFlag();
    const finishLat = props.finish_lat;
    const finish_lng = props.finish_lng;
    if (finishLat && finish_lng) {
      finishMarker = L.marker([finishLat, finish_lng], { icon: finishIcon() }).addTo(map);
    }

    // Dropdown sync
    legSelect.value = selectedLegKey;

    if (centerAndZoom) {
      // keep what original did
      const layer = layerByLeg.get(selectedLegKey);
      if (layer) {
        const bounds = layer.getBounds();
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }

  function clearSelection(restoreView) {
    selectedLegKey = null;
    selectedLineLayer = null;

    setCollapsed();

    // Restore all normal
    setAllLines("normal");
    setAllDiamonds("normal");

    clearFinishFlag();

    legSelect.value = "";

    if (restoreView && lastSelectedCenter && lastSelectedZoom) {
      map.setView(lastSelectedCenter, lastSelectedZoom);
    } else if (routeLayer) {
      map.fitBounds(routeLayer.getBounds(), { padding: [22, 22] });
    }
  }

  async function loadGeojson() {
    const res = await fetch(GEOJSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${GEOJSON_URL}`);

    const geojson = await res.json();

    routeLayer = L.geoJSON(geojson, {
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

        // Create diamond marker at start
        const startLat = p.start_lat;
        const startLng = p.start_lng;

        if (startLat && startLng) {
          const marker = L.marker([startLat, startLng], {
            icon: diamondIcon(legKey, "normal"),
          });

          marker.on("click", () => {
            lastSelectedCenter = map.getCenter();
            lastSelectedZoom = map.getZoom();
            openPanelForLeg(legKey, true);
          });

          markerByLeg.set(legKey, marker);
          marker.addTo(startMarkersLayer);
        }

        // Dropdown option
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
  }

  loadGeojson()
    .then(() => wireUI())
    .catch((err) => {
      console.error(err);
      panelTip.textContent = "Couldn’t load the route. Please try again.";
    });
})();
