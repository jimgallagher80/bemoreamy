<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database unavailable']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

function clean($v) {
    return trim((string)$v);
}

$leaderFirst = clean($data['team_leader_first_name'] ?? '');
$leaderLast  = clean($data['team_leader_surname'] ?? '');
$groupSizeRaw = $data['group_size'] ?? '';
$groupSize = (int)$groupSizeRaw;

$email = clean($data['email'] ?? '');
$phone = clean($data['phone'] ?? '');
$legs = $data['legs'] ?? [];
$safety = !empty($data['safety_accepted']) ? 1 : 0;

if ($leaderFirst === '' || $leaderLast === '' || $email === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please complete all fields']);
    exit;
}
if ($groupSize < 1 || $groupSize > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid group size']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid email address']);
    exit;
}
if ($safety !== 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Safety information must be accepted']);
    exit;
}
if (!is_array($legs) || count($legs) < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please select at least one leg']);
    exit;
}

$legs = array_values(array_unique(array_map('intval', $legs)));

try {
    $pdo->beginTransaction();

    // Create signup record (overall status kept for legacy/admin grouping)
    $stmt = $pdo->prepare("
        INSERT INTO signups
        (status, team_leader_first_name, team_leader_surname, group_size, email, phone, safety_accepted)
        VALUES ('pending', ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$leaderFirst, $leaderLast, $groupSize, $email, $phone, $safety]);

    $signupId = (int)$pdo->lastInsertId();

    // Prepare statement to check if a leg is currently taken (confirmed)
    $takenStmt = $pdo->prepare("
        SELECT COUNT(*) AS c
        FROM signup_legs
        WHERE leg_number = ?
          AND status = 'confirmed'
        LIMIT 1
    ");

    // Insert requested legs as pending (and store whether it was taken at submission time)
    $legStmt = $pdo->prepare("
        INSERT INTO signup_legs (signup_id, leg_number, status, was_taken)
        VALUES (?, ?, 'pending', ?)
    ");

    foreach ($legs as $legNum) {
        if ($legNum > 0) {
            $takenStmt->execute([$legNum]);
            $isTaken = ((int)$takenStmt->fetchColumn() > 0) ? 1 : 0;

            $legStmt->execute([$signupId, $legNum, $isTaken]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Signup received. Pending admin approval.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Signup insert failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
