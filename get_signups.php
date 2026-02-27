<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    // Public status page: confirmed legs only (returned as one row per leg)
    $stmt = $pdo->query("
        SELECT
            s.id AS signup_id,
            s.team_leader_first_name,
            s.team_leader_surname,
            s.group_size,
            s.team_name,
            sl.leg_number
        FROM signups s
        JOIN signup_legs sl ON s.id = sl.signup_id
        WHERE sl.status = 'confirmed'
        ORDER BY sl.leg_number ASC, s.team_leader_surname ASC, s.team_leader_first_name ASC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        echo json_encode([]);
        exit;
    }

    // Load any submitted team member details for these signups
    $signupIds = [];
    foreach ($rows as $r) {
        $signupIds[(int)$r['signup_id']] = true;
    }
    $signupIds = array_keys($signupIds);

    $membersBySignup = [];
    if (count($signupIds) > 0) {
        $placeholders = implode(',', array_fill(0, count($signupIds), '?'));
        $mStmt = $pdo->prepare("
            SELECT signup_id, member_index, first_name, last_name
            FROM team_members
            WHERE signup_id IN ($placeholders)
            ORDER BY signup_id ASC, member_index ASC
        ");
        $mStmt->execute($signupIds);
        $mRows = $mStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($mRows as $m) {
            $sid = (int)$m['signup_id'];
            if (!isset($membersBySignup[$sid])) $membersBySignup[$sid] = [];
            $membersBySignup[$sid][] = [
                'member_index' => (int)$m['member_index'],
                'first_name' => $m['first_name'],
                'last_name' => $m['last_name']
            ];
        }
    }

    $out = [];
    foreach ($rows as $row) {
        $sid = (int)$row['signup_id'];
        $first = $row['team_leader_first_name'];
        $last  = $row['team_leader_surname'];
        $teamName = isset($row['team_name']) ? trim((string)$row['team_name']) : '';

        $members = $membersBySignup[$sid] ?? [];
        $hasTeamDetails = count($members) > 0;

        $displayTeamName = $teamName !== '' ? $teamName : ($first . ' ' . $last . "'s Team");

        $out[] = [
            'leg_number' => (int)$row['leg_number'],
            'signup_id' => $sid,
            'team_leader_first_name' => $first,
            'team_leader_surname' => $last,
            'group_size' => isset($row['group_size']) ? (int)$row['group_size'] : null,
            'team_name' => $teamName,
            'display_team_name' => $displayTeamName,
            'has_team_details' => $hasTeamDetails,
            'members' => $members
        ];
    }

    echo json_encode($out);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load signups']);
}
