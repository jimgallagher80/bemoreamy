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

$allowed_status = ['all','pending','approved','rejected'];
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
  $where[] = "s.status = ?";
  $params[] = $filter_status;
}

if ($filter_leg !== 'all') {
  $where[] = "EXISTS (SELECT 1 FROM signup_legs sl2 WHERE sl2.signup_id = s.id AND sl2.leg_number = ?)";
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
    s.first_name,
    s.last_name,
    s.email,
    s.mobile,
    s.emergency_name,
    s.emergency_phone,
    s.safety_accepted,
    s.status,
    s.approved_at,
    s.rejected_at,
    s.rejection_reason,
    GROUP_CONCAT(sl.leg_number ORDER BY sl.leg_number) AS legs
  FROM signups s
  LEFT JOIN signup_legs sl ON s.id = sl.signup_id
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
  'First Name',
  'Last Name',
  'Email',
  'Telephone',
  'Emergency Contact Name',
  'Emergency Contact Number',
  'Safety Accepted',
  'Legs',
  'Status',
  'Approved At',
  'Rejected At',
  'Rejection Reason'
]);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  fputcsv($out, [
    $row['id'] ?? '',
    $row['created_at'] ?? '',
    $row['first_name'] ?? '',
    $row['last_name'] ?? '',
    $row['email'] ?? '',
    $row['mobile'] ?? '',
    $row['emergency_name'] ?? '',
    $row['emergency_phone'] ?? '',
    isset($row['safety_accepted']) ? (string)$row['safety_accepted'] : '',
    $row['legs'] ?? '',
    $row['status'] ?? '',
    $row['approved_at'] ?? '',
    $row['rejected_at'] ?? '',
    $row['rejection_reason'] ?? ''
  ]);
}

fclose($out);
exit;
