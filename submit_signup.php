<?php
header('Content-Type: application/json');
require_once __DIR__ . '/includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['ok' => false, 'error' => 'Invalid request']);
    exit;
}

$required = [
    'first_name',
    'last_name',
    'email',
    'mobile',
    'emergency_name',
    'emergency_phone',
    'legs'
];

foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['ok' => false, 'error' => "Missing field: $field"]);
        exit;
    }
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO signups
        (first_name, last_name, email, mobile, emergency_name, emergency_phone, safety_accepted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['mobile'],
        $data['emergency_name'],
        $data['emergency_phone'],
        isset($data['safety_accepted']) ? 1 : 0
    ]);

    $signupId = $pdo->lastInsertId();

    $legStmt = $pdo->prepare("
        INSERT INTO signup_legs (signup_id, leg_number)
        VALUES (?, ?)
    ");

    foreach ($data['legs'] as $leg) {
        $legStmt->execute([$signupId, (int)$leg]);
    }

    $pdo->commit();

    echo json_encode([
        'ok' => true,
        'message' => 'Signup received. Pending admin approval.'
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode([
        'ok' => false,
        'error' => 'Server error'
    ]);
}
