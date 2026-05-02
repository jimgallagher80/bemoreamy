<?php
function baton_json($arr, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($arr);
    exit;
}

function baton_clean($v) {
    return trim((string)$v);
}

function baton_load_geojson() {
    static $geo = null;
    if ($geo !== null) return $geo;
    $path = __DIR__ . '/ALL_COASTAL_LEGS_ENRICHED.geojson';
    if (!is_readable($path)) return null;
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    if (!is_array($data) || empty($data['features']) || !is_array($data['features'])) return null;
    $geo = $data;
    return $geo;
}

function baton_leg_coords($legNumber) {
    $geo = baton_load_geojson();
    if (!$geo) return null;
    foreach ($geo['features'] as $feature) {
        $props = isset($feature['properties']) && is_array($feature['properties']) ? $feature['properties'] : [];
        if ((int)($props['leg'] ?? 0) !== (int)$legNumber) continue;
        $geom = $feature['geometry'] ?? null;
        if (!$geom || empty($geom['coordinates'])) return null;
        $type = $geom['type'] ?? '';
        if ($type === 'LineString') return $geom['coordinates'];
        if ($type === 'MultiLineString') {
            $flat = [];
            foreach ($geom['coordinates'] as $line) {
                foreach ($line as $pt) $flat[] = $pt;
            }
            return $flat;
        }
        return null;
    }
    return null;
}

function baton_leg_meta($legNumber) {
    $geo = baton_load_geojson();
    if (!$geo) return null;
    foreach ($geo['features'] as $feature) {
        $props = isset($feature['properties']) && is_array($feature['properties']) ? $feature['properties'] : [];
        if ((int)($props['leg'] ?? 0) === (int)$legNumber) return $props;
    }
    return null;
}

function baton_point_at_leg_fraction($legNumber, $fraction) {
    $coords = baton_leg_coords($legNumber);
    if (!$coords || count($coords) < 1) return null;
    $fraction = max(0, min(1, (float)$fraction));
    if ($fraction <= 0) return ['lat' => (float)$coords[0][1], 'lng' => (float)$coords[0][0], 'fraction' => 0.0];
    if ($fraction >= 1) {
        $last = $coords[count($coords) - 1];
        return ['lat' => (float)$last[1], 'lng' => (float)$last[0], 'fraction' => 1.0];
    }

    $segments = [];
    $total = 0.0;
    for ($i = 0; $i < count($coords) - 1; $i++) {
        $a = $coords[$i]; $b = $coords[$i + 1];
        $d = baton_distance_m((float)$a[1], (float)$a[0], (float)$b[1], (float)$b[0]);
        $segments[] = $d;
        $total += $d;
    }
    if ($total <= 0) return ['lat' => (float)$coords[0][1], 'lng' => (float)$coords[0][0], 'fraction' => 0.0];
    $target = $total * $fraction;
    $walked = 0.0;
    for ($i = 0; $i < count($segments); $i++) {
        $seg = $segments[$i];
        if ($walked + $seg >= $target) {
            $a = $coords[$i]; $b = $coords[$i + 1];
            $local = $seg > 0 ? (($target - $walked) / $seg) : 0;
            return [
                'lat' => (float)$a[1] + (((float)$b[1] - (float)$a[1]) * $local),
                'lng' => (float)$a[0] + (((float)$b[0] - (float)$a[0]) * $local),
                'fraction' => $fraction
            ];
        }
        $walked += $seg;
    }
    $last = $coords[count($coords) - 1];
    return ['lat' => (float)$last[1], 'lng' => (float)$last[0], 'fraction' => 1.0];
}

function baton_distance_m($lat1, $lng1, $lat2, $lng2) {
    $r = 6371000.0;
    $p1 = deg2rad($lat1); $p2 = deg2rad($lat2);
    $dp = deg2rad($lat2 - $lat1);
    $dl = deg2rad($lng2 - $lng1);
    $a = sin($dp/2) * sin($dp/2) + cos($p1) * cos($p2) * sin($dl/2) * sin($dl/2);
    return $r * 2 * atan2(sqrt($a), sqrt(1-$a));
}

function baton_snap_to_leg($legNumber, $lat, $lng) {
    $coords = baton_leg_coords($legNumber);
    if (!$coords || count($coords) < 2) return null;

    $lat = (float)$lat; $lng = (float)$lng;
    $originLatRad = deg2rad($lat);
    $mPerDegLat = 111320.0;
    $mPerDegLng = max(1.0, 111320.0 * cos($originLatRad));

    $segmentLengths = [];
    $total = 0.0;
    for ($i = 0; $i < count($coords) - 1; $i++) {
        $a = $coords[$i]; $b = $coords[$i + 1];
        $d = baton_distance_m((float)$a[1], (float)$a[0], (float)$b[1], (float)$b[0]);
        $segmentLengths[] = $d;
        $total += $d;
    }

    $best = null;
    $distanceBefore = 0.0;
    $walkedBeforeBest = 0.0;

    for ($i = 0; $i < count($coords) - 1; $i++) {
        $a = $coords[$i]; $b = $coords[$i + 1];
        $ax = ((float)$a[0] - $lng) * $mPerDegLng;
        $ay = ((float)$a[1] - $lat) * $mPerDegLat;
        $bx = ((float)$b[0] - $lng) * $mPerDegLng;
        $by = ((float)$b[1] - $lat) * $mPerDegLat;
        $vx = $bx - $ax; $vy = $by - $ay;
        $len2 = $vx*$vx + $vy*$vy;
        $t = $len2 > 0 ? max(0, min(1, (0 - $ax) * $vx / $len2 + (0 - $ay) * $vy / $len2)) : 0;
        $px = $ax + $t * $vx;
        $py = $ay + $t * $vy;
        $dist = sqrt($px*$px + $py*$py);
        if ($best === null || $dist < $best['distance_m']) {
            $snapLng = (float)$a[0] + (((float)$b[0] - (float)$a[0]) * $t);
            $snapLat = (float)$a[1] + (((float)$b[1] - (float)$a[1]) * $t);
            $best = [
                'lat' => $snapLat,
                'lng' => $snapLng,
                'distance_m' => $dist,
                'fraction' => $total > 0 ? (($distanceBefore + (($segmentLengths[$i] ?? 0) * $t)) / $total) : 0.0
            ];
            $walkedBeforeBest = $distanceBefore;
        }
        $distanceBefore += $segmentLengths[$i] ?? 0;
    }

    return $best;
}

function baton_team_name($signup) {
    $teamName = baton_clean($signup['team_name'] ?? '');
    if ($teamName !== '') return $teamName;
    $first = baton_clean($signup['team_leader_first_name'] ?? '');
    $last = baton_clean($signup['team_leader_surname'] ?? '');
    $name = trim($first . ' ' . $last);
    return $name !== '' ? $name . "'s Team" : 'Unnamed team';
}
