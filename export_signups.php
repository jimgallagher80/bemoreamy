<?php
session_start();
require_once __DIR__ . '/includes/db.php';

if (!isset($_SESSION['admin_logged_in'])) {
  http_response_code(403);
  echo "Forbidden";
  exit;
}

$filter_status = $_GET['status'] ?? 'all';
$filter_leg = $_GET['leg'] ?? 'all';

$allowed_status = ['all','pending','confirmed','waitlist','rejected'];
if (!in_array($filter_status, $allowed_status, true)) {
  $filter_status = 'all';
}

if ($filter_leg !== 'all') {
  $filter_leg = (string)(int)$filter_leg;
  if ($filter_leg === '0') {
    $filter_leg = 'all';
  }
}

$where = [];
$params = [];

if ($filter_status !== 'all') {
  $where[] = "sl.status = ?";
  $params[] = $filter_status;
}

if ($filter_leg !== 'all') {
  $where[] = "sl.leg_number = ?";
  $params[] = (int)$filter_leg;
}

$where_sql = '';
if (count($where) > 0) {
  $where_sql = 'WHERE ' . implode(' AND ', $where);
}

$sql = "
  SELECT
    s.id,
    s.created_at,
    s.team_leader_first_name,
    s.team_leader_surname,
    s.group_size,
    s.email,
    s.phone,
    s.safety_accepted,
    GROUP_CONCAT(CONCAT(sl.leg_number, ':', sl.status) ORDER BY sl.leg_number SEPARATOR ', ') AS legs_with_status
  FROM signups s
  JOIN signup_legs sl ON s.id = sl.signup_id
  $where_sql
  GROUP BY s.id
  ORDER BY s.created_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$filename = "be-more-amy-signups-" . date("Y-m-d_His") . ".csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// UTF-8 BOM for Excel compatibility
echo "\xEF\xBB\xBF";

$out = fopen('php://output', 'w');

fputcsv($out, [
  'ID',
  'Submitted At',
  'Team Leader First Name',
  'Team Leader Surname',
  'Group Size',
  'Email',
  'Phone Number',
  'Safety Accepted',
  'Legs (leg:status)'
]);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  fputcsv($out, [
    $row['id'] ?? '',
    $row['created_at'] ?? '',
    $row['team_leader_first_name'] ?? '',
    $row['team_leader_surname'] ?? '',
    $row['group_size'] ?? '',
    $row['email'] ?? '',
    $row['phone'] ?? '',
    ((int)($row['safety_accepted'] ?? 0) === 1) ? 'Yes' : 'No',
    $row['legs_with_status'] ?? ''
  ]);
}

fclose($out);
exit;
