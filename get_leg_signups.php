<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    // Only expose approved sign-ups publicly
    $stmt = $pdo->query("
        SELECT sl.leg_number, s.first_name, s.last_name
        FROM signup_legs sl
        JOIN signups s ON s.id = sl.signup_id
        WHERE s.status = 'approved'
        ORDER BY sl.leg_number ASC, s.last_name ASC, s.first_name ASC
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
