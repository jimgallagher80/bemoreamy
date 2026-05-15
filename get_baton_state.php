<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/baton_lib.php';

try {
    $stmt = $pdo->query("
        SELECT
          be.id, be.signup_id, be.leg_number, be.event_type, be.event_time,
          be.gps_lat, be.gps_lng, be.display_lat, be.display_lng, be.route_fraction,
          be.accuracy_m, be.note,
          s.team_name, s.team_leader_first_name, s.team_leader_surname
        FROM baton_events be
        JOIN signups s ON s.id = be.signup_id
        WHERE be.is_hidden = 0
        ORDER BY be.event_time ASC, be.id ASC
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $latestRaw = null;
    $history = [];
    $latestByLeg = [];
    $latestPositionByLeg = [];

    foreach ($rows as $row) {
        $leg = (int)$row['leg_number'];
        $team = baton_team_name($row);
        $event = [
            'id' => (int)$row['id'],
            'signup_id' => (int)$row['signup_id'],
            'leg_number' => $leg,
            'event_type' => $row['event_type'],
            'event_time' => $row['event_time'],
            'team_name' => $team,
            'display_lat' => $row['display_lat'] !== null ? (float)$row['display_lat'] : null,
            'display_lng' => $row['display_lng'] !== null ? (float)$row['display_lng'] : null,
            'route_fraction' => $row['route_fraction'] !== null ? (float)$row['route_fraction'] : null,
            'accuracy_m' => $row['accuracy_m'] !== null ? (float)$row['accuracy_m'] : null,
            'note' => $row['note']
        ];
        $latestRaw = $event;

        $key = (string)$leg;
        if (!isset($history[$key])) {
            $meta = baton_leg_meta($leg) ?: [];
            $history[$key] = [
                'leg_number' => $leg,
                'start' => $meta['start'] ?? '',
                'end' => $meta['end'] ?? '',
                'team_name' => $team,
                'started_at' => null,
                'finished_at' => null,
                'latest_update_at' => null,
                'updates_count' => 0,
                'events' => []
            ];
        }

        if ($row['event_type'] === 'start' && $history[$key]['started_at'] === null) {
            $history[$key]['started_at'] = $row['event_time'];
        }
        if ($row['event_type'] === 'finish') {
            $history[$key]['finished_at'] = $row['event_time'];
        }
        if ($row['event_type'] === 'update') {
            $history[$key]['updates_count']++;
            $history[$key]['latest_update_at'] = $row['event_time'];
        }
        $history[$key]['events'][] = $event;

        // The live baton for each leg follows the most recent recorded position for that leg.
        // This allows two teams to be shown at once when overlapping scheduled legs are underway.
        $latestByLeg[$key] = $event;
        if ($event['display_lat'] !== null && $event['display_lng'] !== null) {
            $latestPositionByLeg[$key] = $event;
        }
    }

    foreach ($history as &$h) {
        $latest = $latestByLeg[(string)$h['leg_number']] ?? null;
        if ($latest && $latest['event_type'] === 'finish') {
            $h['status'] = 'Completed';
        } elseif ($h['started_at']) {
            $h['status'] = 'Underway';
        } else {
            $h['status'] = 'Update recorded';
        }
    }
    unset($h);

    usort($history, function($a, $b) { return $a['leg_number'] <=> $b['leg_number']; });

    $activeBatons = [];
    foreach ($latestByLeg as $key => $latest) {
        if (($latest['event_type'] ?? '') === 'finish') {
            continue;
        }
        if (!isset($latestPositionByLeg[$key])) {
            continue;
        }
        $activeBatons[] = $latestPositionByLeg[$key];
    }

    usort($activeBatons, function($a, $b) {
        if ((int)$a['leg_number'] === (int)$b['leg_number']) {
            return (int)$a['id'] <=> (int)$b['id'];
        }
        return (int)$a['leg_number'] <=> (int)$b['leg_number'];
    });


    baton_json([
        'success' => true,
        'batons' => $activeBatons,
        'baton' => count($activeBatons) ? $activeBatons[count($activeBatons) - 1] : null,
        'latest_event' => $latestRaw,
        'history' => $history,
        'generated_at' => gmdate('Y-m-d H:i:s')
    ]);
} catch (Throwable $e) {
    error_log('get_baton_state.php error: ' . $e->getMessage());
    baton_json(['success' => false, 'error' => 'Unable to load baton state.'], 500);
}
