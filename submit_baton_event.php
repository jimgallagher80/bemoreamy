<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/baton_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') baton_json(['success' => false, 'error' => 'Method not allowed.'], 405);

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) baton_json(['success' => false, 'error' => 'Invalid request.'], 400);

$token = baton_clean($data['token'] ?? '');
$legNumber = (int)($data['leg_number'] ?? 0);
$eventType = baton_clean($data['event_type'] ?? '');
$lat = isset($data['latitude']) && $data['latitude'] !== '' ? (float)$data['latitude'] : null;
$lng = isset($data['longitude']) && $data['longitude'] !== '' ? (float)$data['longitude'] : null;
$accuracy = isset($data['accuracy_m']) && $data['accuracy_m'] !== '' ? (float)$data['accuracy_m'] : null;
$note = baton_clean($data['note'] ?? '');
if ($note === '') $note = null;
if ($note !== null && strlen($note) > 255) $note = substr($note, 0, 255);

if ($token === '' || $legNumber < 1 || !in_array($eventType, ['start', 'update', 'finish'], true)) {
    baton_json(['success' => false, 'error' => 'Missing or invalid baton update details.'], 400);
}

try {
    $stmt = $pdo->prepare("SELECT * FROM signups WHERE team_details_token = ? LIMIT 1");
    $stmt->execute([$token]);
    $signup = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$signup) baton_json(['success' => false, 'error' => 'Invalid link.'], 404);
    $signupId = (int)$signup['id'];

    $legStmt = $pdo->prepare("SELECT COUNT(*) FROM signup_legs WHERE signup_id = ? AND leg_number = ? AND status = 'confirmed'");
    $legStmt->execute([$signupId, $legNumber]);
    if ((int)$legStmt->fetchColumn() < 1) {
        baton_json(['success' => false, 'error' => 'This leg is not attached to this team link.'], 403);
    }

    $displayLat = null;
    $displayLng = null;
    $fraction = null;
    $positionSource = 'none';

    if ($eventType === 'start') {
        $p = baton_point_at_leg_fraction($legNumber, 0);
        if (!$p) baton_json(['success' => false, 'error' => 'Unable to find planned start point for this leg.'], 500);
        $displayLat = $p['lat']; $displayLng = $p['lng']; $fraction = 0.0; $positionSource = 'planned_start';
    } elseif ($eventType === 'finish') {
        $p = baton_point_at_leg_fraction($legNumber, 1);
        if (!$p) baton_json(['success' => false, 'error' => 'Unable to find planned finish point for this leg.'], 500);
        $displayLat = $p['lat']; $displayLng = $p['lng']; $fraction = 1.0; $positionSource = 'planned_finish';
    } elseif ($lat !== null && $lng !== null) {
        $snap = baton_snap_to_leg($legNumber, $lat, $lng);
        if ($snap) {
            $displayLat = $snap['lat'];
            $displayLng = $snap['lng'];
            $fraction = max(0, min(1, (float)$snap['fraction']));
            $positionSource = 'gps_snapped';
        }
    }

    $ins = $pdo->prepare("
        INSERT INTO baton_events
          (signup_id, leg_number, event_type, event_time, gps_lat, gps_lng, display_lat, display_lng, route_fraction, accuracy_m, note)
        VALUES
          (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
    ");
    $ins->execute([
        $signupId,
        $legNumber,
        $eventType,
        $lat,
        $lng,
        $displayLat,
        $displayLng,
        $fraction,
        $accuracy,
        $note
    ]);

    baton_json([
        'success' => true,
        'event_id' => (int)$pdo->lastInsertId(),
        'event_type' => $eventType,
        'leg_number' => $legNumber,
        'position_source' => $positionSource,
        'has_display_position' => $displayLat !== null && $displayLng !== null,
        'display_lat' => $displayLat,
        'display_lng' => $displayLng,
        'route_fraction' => $fraction
    ]);
} catch (Throwable $e) {
    error_log('submit_baton_event.php error: ' . $e->getMessage());
    baton_json(['success' => false, 'error' => 'Unable to record baton update.'], 500);
}
