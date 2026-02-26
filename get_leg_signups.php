<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    // Public view: confirmed legs only, names only
    $stmt = $pdo->query("
        SELECT sl.leg_number, s.team_leader_first_name AS first_name, s.team_leader_surname AS last_name
        FROM signup_legs sl
        JOIN signups s ON s.id = sl.signup_id
        WHERE sl.status = 'confirmed'
        ORDER BY sl.leg_number ASC, s.team_leader_surname ASC, s.team_leader_first_name ASC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $legs = [];

    foreach ($rows as $row) {
        $leg = (string)$row['leg_number'];

        if (!isset($legs[$leg])) {
            $legs[$leg] = [
                'count' => 0,
                'names' => []
            ];
        }

        $legs[$leg]['count']++;

        $legs[$leg]['names'][] = [
            'first_name' => $row['first_name'],
            'last_name'  => $row['last_name']
        ];
    }

    echo json_encode([
        'success' => true,
        'legs' => $legs
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error'
    ]);
}
