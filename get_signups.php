<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    $stmt = $pdo->query("
        SELECT s.id, s.first_name, s.last_name, s.status, sl.leg_number
        FROM signups s
        JOIN signup_legs sl ON s.id = sl.signup_id
        ORDER BY sl.leg_number ASC, s.last_name ASC
    ");

    $rows = $stmt->fetchAll();

    $result = [];

    foreach ($rows as $row) {
        $id = $row['id'];

        if (!isset($result[$id])) {
            $result[$id] = [
                'first_name' => $row['first_name'],
                'last_name'  => $row['last_name'],
                'status'     => $row['status'],
                'legs'       => []
            ];
        }

        $result[$id]['legs'][] = $row['leg_number'];
    }

    echo json_encode(array_values($result));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load signups']);
}
