<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    $stmt = $pdo->query("
        SELECT
            sl.leg_number,
            s.team_leader_first_name AS first_name,
            s.team_leader_surname AS last_name,
            s.group_size
        FROM signup_legs sl
        JOIN signups s ON s.id = sl.signup_id
        WHERE sl.status = 'confirmed'
        ORDER BY sl.leg_number ASC, s.team_leader_surname ASC, s.team_leader_first_name ASC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'confirmed' => array_map(function($r) {
            return [
                'leg_number' => (int)$r['leg_number'],
                'first_name' => $r['first_name'],
                'last_name'  => $r['last_name'],
                'group_size' => (int)$r['group_size']
            ];
        }, $rows)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to load signups']);
}
