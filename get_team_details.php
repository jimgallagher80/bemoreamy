<?php
header('Content-Type: application/json');
require_once __DIR__ . '/includes/db.php';

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

$token = isset($_GET['token']) ? trim($_GET['token']) : '';
if ($token === '') {
    fail('Invalid link.');
}

try {
    // Find signup by token
    $stmt = $pdo->prepare("SELECT * FROM signups WHERE team_details_token = ?");
    $stmt->execute([$token]);
    $signup = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$signup) {
        fail('Invalid link.');
    }

    $signupId = (int)$signup['id'];

    // Must have at least one confirmed leg
    $legsStmt = $pdo->prepare("
        SELECT leg_number
        FROM signup_legs
        WHERE signup_id = ?
          AND status = 'confirmed'
        ORDER BY leg_number ASC
    ");
    $legsStmt->execute([$signupId]);
    $legs = $legsStmt->fetchAll(PDO::FETCH_COLUMN);

    if (!$legs || count($legs) === 0) {
        fail('This link is only available once at least one leg has been confirmed.', 403);
    }

    // Load existing team members (if any)
    $mStmt = $pdo->prepare("
        SELECT member_index, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone
        FROM team_members
        WHERE signup_id = ?
        ORDER BY member_index ASC
    ");
    $mStmt->execute([$signupId]);
    $members = $mStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'signup_id' => $signupId,
        'team_leader_first_name' => $signup['team_leader_first_name'],
        'team_leader_surname' => $signup['team_leader_surname'],
        'email' => $signup['email'],
        'phone' => $signup['phone'],
        'group_size' => (int)$signup['group_size'],
        'team_name' => $signup['team_name'],
        'confirmed_legs' => array_map('intval', $legs),
        'members' => array_map(function($m) {
            return [
                'member_index' => (int)$m['member_index'],
                'first_name' => $m['first_name'],
                'last_name' => $m['last_name'],
                'email' => $m['email'],
                'phone' => $m['phone'],
                'emergency_contact_name' => $m['emergency_contact_name'],
                'emergency_contact_phone' => $m['emergency_contact_phone'],
            ];
        }, $members)
    ]);

} catch (Exception $e) {
    error_log("get_team_details.php error: " . $e->getMessage());
    fail('Unable to load team details.', 500);
}
