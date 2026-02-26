<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    // Public status page: confirmed legs only
    $stmt = $pdo->query("
        SELECT s.id, s.team_leader_first_name, s.team_leader_surname, sl.leg_number
        FROM signups s
        JOIN signup_legs sl ON s.id = sl.signup_id
        WHERE sl.status = 'confirmed'
        ORDER BY sl.leg_number ASC, s.team_leader_surname ASC, s.team_leader_first_name ASC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];

    foreach ($rows as $row) {
        $id = (int)$row['id'];

        if (!isset($result[$id])) {
            $result[$id] = [
                'first_name' => $row['team_leader_first_name'],
                'last_name'  => $row['team_leader_surname'],
                'legs'       => []
            ];
        }

        $result[$id]['legs'][] = (int)$row['leg_number'];
    }

    echo json_encode(array_values($result));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load signups']);
}
