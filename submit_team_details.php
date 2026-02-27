<?php
// Always return JSON, even if PHP emits warnings/notices.
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/includes/db.php';

function respond($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr);
    exit;
}

function fail($msg, $code = 400) {
    respond(['success' => false, 'error' => $msg], $code);
}

function sendEmail($to, $subject, $message) {
    $headers = "From: Be More Amy <noreply@bemoreamy.com>\r\n";
    $headers .= "Reply-To: hello@bemoreamy.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    @mail($to, $subject, $message, $headers);
}

function must($arr, $key) {
    return isset($arr[$key]) ? trim((string)$arr[$key]) : '';
}

try {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        fail('Empty request payload.');
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('Invalid JSON payload.');
    }

    $token = isset($data['token']) ? trim((string)$data['token']) : '';
    $groupSize = isset($data['group_size']) ? (int)$data['group_size'] : 0;
    $teamName = isset($data['team_name']) ? trim((string)$data['team_name']) : '';
    $members = (isset($data['members']) && is_array($data['members'])) ? $data['members'] : [];

    if ($token === '') fail('Invalid link.');
    if ($groupSize < 2) fail('Group size must be 2 or more.');

    // Ensure we have exactly groupSize member records submitted
    if (count($members) !== $groupSize) {
        fail('Please provide details for the correct number of team members.');
    }

    // Validate each member has the required fields
    $seenIdx = [];
    foreach ($members as $m) {
        if (!is_array($m)) fail('Invalid team member payload.');

        $idx = isset($m['member_index']) ? (int)$m['member_index'] : 0;
        if ($idx < 1) fail('Invalid team member index.');

        if (isset($seenIdx[$idx])) fail('Duplicate team member index submitted.');
        $seenIdx[$idx] = true;

        $fn  = must($m, 'first_name');
        $ln  = must($m, 'last_name');
        $em  = must($m, 'email');
        $ph  = must($m, 'phone');
        $ecn = must($m, 'emergency_contact_name');
        $ecp = must($m, 'emergency_contact_phone');

        if ($fn === '' || $ln === '' || $em === '' || $ph === '' || $ecn === '' || $ecp === '') {
            fail('Please complete all required fields before submitting.');
        }
    }

    // Fetch signup by token
    $stmt = $pdo->prepare("SELECT * FROM signups WHERE team_details_token = ?");
    $stmt->execute([$token]);
    $signup = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$signup) fail('Invalid link.');

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

    // Find leader record (member_index = 1)
    $leader = null;
    foreach ($members as $m) {
        if ((int)$m['member_index'] === 1) { $leader = $m; break; }
    }
    if (!$leader) fail('Team leader details are required.');

    $leaderFirst = must($leader, 'first_name');
    $leaderLast  = must($leader, 'last_name');
    $leaderEmail = must($leader, 'email');
    $leaderPhone = must($leader, 'phone');

    // Default team name if blank
    if ($teamName === '') {
        $teamName = $leaderFirst . ' ' . $leaderLast . "'s Team";
    }

    // Write data
    $pdo->beginTransaction();

    // Update signups record
    $u = $pdo->prepare("
        UPDATE signups
        SET team_leader_first_name = ?,
            team_leader_surname = ?,
            email = ?,
            phone = ?,
            group_size = ?,
            team_name = ?
        WHERE id = ?
    ");
    $u->execute([
        $leaderFirst,
        $leaderLast,
        $leaderEmail,
        $leaderPhone,
        $groupSize,
        $teamName,
        $signupId
    ]);

    // Upsert team_members rows
    $up = $pdo->prepare("
        INSERT INTO team_members
          (signup_id, member_index, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          email = VALUES(email),
          phone = VALUES(phone),
          emergency_contact_name = VALUES(emergency_contact_name),
          emergency_contact_phone = VALUES(emergency_contact_phone)
    ");

    foreach ($members as $m) {
        $idx = (int)$m['member_index'];
        $up->execute([
            $signupId,
            $idx,
            must($m, 'first_name'),
            must($m, 'last_name'),
            must($m, 'email'),
            must($m, 'phone'),
            must($m, 'emergency_contact_name'),
            must($m, 'emergency_contact_phone'),
        ]);
    }

    // Delete any members above the submitted group size
    $del = $pdo->prepare("DELETE FROM team_members WHERE signup_id = ? AND member_index > ?");
    $del->execute([$signupId, $groupSize]);

    $pdo->commit();

    // Confirmation email (plain text for now)
    $link = "https://bemoreamy.com/team-details.html?token=" . urlencode($token);

    $body = "Hello {$leaderFirst},\n\n";
    $body .= "Thank you. We have received your team details for Be More Amy.\n\n";
    $body .= "Team name: {$teamName}\n";
    $body .= "Confirmed legs: " . implode(', ', array_map(function($n){ return 'Leg ' . (int)$n; }, $legs)) . "\n";
    $body .= "Group size: {$groupSize}\n\n";
    $body .= "Team members:\n";

    usort($members, function($a, $b) {
        return (int)$a['member_index'] <=> (int)$b['member_index'];
    });

    foreach ($members as $m) {
        $idx = (int)$m['member_index'];
        $role = ($idx === 1) ? "Team Leader — Team Member 1" : "Team Member {$idx}";
        $body .= "\n{$role}\n";
        $body .= must($m,'first_name') . " " . must($m,'last_name') . "\n";
        $body .= "Email: " . must($m,'email') . "\n";
        $body .= "Phone: " . must($m,'phone') . "\n";
        $body .= "Emergency contact: " . must($m,'emergency_contact_name') . " — " . must($m,'emergency_contact_phone') . "\n";
    }

    $body .= "\nIf you need to update these details, you can use your unique link:\n{$link}\n\n";
    $body .= "If you need to change legs, please email hello@bemoreamy.com.\n\n";
    $body .= "Be More Amy Team";

    sendEmail($leaderEmail, "BE MORE AMY: Team details received", $body);

    respond(['success' => true]);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("submit_team_details.php fatal: " . $e->getMessage());
    respond(['success' => false, 'error' => 'Server error saving team details.'], 500);
}
