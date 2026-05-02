<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/baton_lib.php';

$token = isset($_GET['token']) ? baton_clean($_GET['token']) : '';
if ($token === '') baton_json(['success' => false, 'error' => 'Invalid link.'], 400);

try {
    $stmt = $pdo->prepare("SELECT * FROM signups WHERE team_details_token = ? LIMIT 1");
    $stmt->execute([$token]);
    $signup = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$signup) baton_json(['success' => false, 'error' => 'Invalid link.'], 404);

    $signupId = (int)$signup['id'];
    $legsStmt = $pdo->prepare("
        SELECT leg_number
        FROM signup_legs
        WHERE signup_id = ? AND status = 'confirmed'
        ORDER BY leg_number ASC
    ");
    $legsStmt->execute([$signupId]);
    $legNums = array_map('intval', $legsStmt->fetchAll(PDO::FETCH_COLUMN));
    if (!$legNums) baton_json(['success' => false, 'error' => 'No confirmed legs are attached to this link yet.'], 403);

    $eventsStmt = $pdo->prepare("
        SELECT leg_number, event_type, event_time, display_lat, display_lng, route_fraction, accuracy_m
        FROM baton_events
        WHERE signup_id = ? AND is_hidden = 0
        ORDER BY event_time ASC, id ASC
    ");
    $eventsStmt->execute([$signupId]);
    $events = $eventsStmt->fetchAll(PDO::FETCH_ASSOC);

    $eventsByLeg = [];
    foreach ($events as $e) {
        $leg = (string)(int)$e['leg_number'];
        if (!isset($eventsByLeg[$leg])) $eventsByLeg[$leg] = [];
        $eventsByLeg[$leg][] = [
            'event_type' => $e['event_type'],
            'event_time' => $e['event_time'],
            'has_position' => $e['display_lat'] !== null && $e['display_lng'] !== null,
            'route_fraction' => $e['route_fraction'] !== null ? (float)$e['route_fraction'] : null,
            'accuracy_m' => $e['accuracy_m'] !== null ? (float)$e['accuracy_m'] : null
        ];
    }

    $legs = [];
    foreach ($legNums as $legNum) {
        $meta = baton_leg_meta($legNum) ?: [];
        $legs[] = [
            'leg_number' => $legNum,
            'start' => $meta['start'] ?? '',
            'end' => $meta['end'] ?? '',
            'distance_km' => isset($meta['distance_km']) ? (float)$meta['distance_km'] : null,
            'events' => $eventsByLeg[(string)$legNum] ?? []
        ];
    }

    baton_json([
        'success' => true,
        'team_name' => baton_team_name($signup),
        'team_leader_first_name' => $signup['team_leader_first_name'] ?? '',
        'team_leader_surname' => $signup['team_leader_surname'] ?? '',
        'legs' => $legs
    ]);
} catch (Throwable $e) {
    error_log('get_baton_team.php error: ' . $e->getMessage());
    baton_json(['success' => false, 'error' => 'Unable to load baton link.'], 500);
}
