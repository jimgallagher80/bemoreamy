<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    // A leg is considered taken if it has at least one CONFIRMED record
    $stmt = $pdo->query("
        SELECT DISTINCT leg_number
        FROM signup_legs
        WHERE status = 'confirmed'
        ORDER BY leg_number ASC
    ");

    $legs = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'taken_legs' => array_map('intval', $legs)
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to load taken legs'
    ]);
}
