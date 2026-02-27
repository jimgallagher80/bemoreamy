<?php
header('Content-Type: application/json');

require_once __DIR__ . '/includes/db.php';

try {

    $stmt = $pdo->query("
        SELECT 
            sl.leg_number,
            s.team_name,
            s.team_leader_first_name,
            s.team_leader_surname
        FROM signup_legs sl
        JOIN signups s ON s.id = sl.signup_id
        WHERE sl.status = 'confirmed'
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $taken = [];

    foreach ($rows as $row) {

        $teamName = trim((string)$row['team_name']);

        if ($teamName === '') {
            $teamName = $row['team_leader_first_name'] . ' ' .
                        $row['team_leader_surname'] . "'s Team";
        }

        $taken[(int)$row['leg_number']] = $teamName;
    }

    echo json_encode($taken);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([]);
}
