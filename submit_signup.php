<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database unavailable']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

function clean($v) {
    return trim((string)$v);
}

$first = clean($data['first_name'] ?? '');
$last  = clean($data['last_name'] ?? '');
$email = clean($data['email'] ?? '');
$mobile = clean($data['mobile'] ?? '');
$emName = clean($data['emergency_name'] ?? '');
$emPhone = clean($data['emergency_phone'] ?? '');
$legs = $data['legs'] ?? [];
$safety = !empty($data['safety_accepted']) ? 1 : 0;

if ($first === '' || $last === '' || $email === '' || $mobile === '' || $emName === '' || $emPhone === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please complete all fields']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please enter a valid email address']);
    exit;
}
if ($safety !== 1) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Safety information must be accepted']);
    exit;
}
if (!is_array($legs) || count($legs) < 1) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please select at least one leg']);
    exit;
}

$legs = array_values(array_unique(array_map('intval', $legs)));

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO signups
        (status, first_name, last_name, email, mobile, emergency_name, emergency_phone, safety_accepted)
        VALUES ('pending', ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$first, $last, $email, $mobile, $emName, $emPhone, $safety]);

    $signupId = (int)$pdo->lastInsertId();

    $legStmt = $pdo->prepare("INSERT INTO signup_legs (signup_id, leg_number) VALUES (?, ?)");
    foreach ($legs as $legNum) {
        if ($legNum > 0) {
            $legStmt->execute([$signupId, $legNum]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'ok' => true,
        'message' => 'Signup received. Pending admin approval.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Signup insert failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
}
