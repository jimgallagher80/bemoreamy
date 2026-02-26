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
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

function h($v) {
  return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

$current_qs = http_build_query(['status' => $filter_status, 'leg' => $filter_leg]);
?>
<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — Full Table</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .topbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
    .btnlink { display:inline-block; padding:8px 10px; border:1px solid #000; text-decoration:none; background:#fff; color:#000; }
    .meta { color: rgba(0,0,0,0.7); font-size: 14px; }
    .tablewrap { overflow:auto; border:1px solid #ddd; }
    table { border-collapse: collapse; width: 100%; min-width: 1200px; }
    th, td { border:1px solid #ddd; padding:8px; text-align:left; vertical-align:top; }
    th { background:#f4f4f4; position: sticky; top: 0; z-index: 1; }
    .nowrap { white-space: nowrap; }
  </style>
</head>
<body>

  <div class="topbar">
    <a class="btnlink" href="admin.php?<?= h($current_qs) ?>">Back to admin</a>
    <a class="btnlink" href="export_signups.php?<?= h($current_qs) ?>">Export CSV</a>
    <span class="meta">
      Showing: status=<?= h($filter_status) ?>, leg=<?= h($filter_leg) ?>, rows=<?= count($rows) ?>
    </span>
  </div>

  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th class="nowrap">ID</th>
          <th class="nowrap">Submitted At</th>
          <th>First</th>
          <th>Last</th>
          <th>Email</th>
          <th>Telephone</th>
          <th>Emergency Contact</th>
          <th>Emergency Number</th>
          <th class="nowrap">Safety Accepted</th>
          <th>Legs</th>
          <th>Status</th>
          <th class="nowrap">Approved At</th>
          <th class="nowrap">Rejected At</th>
          <th>Rejection Reason</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td class="nowrap"><?= h($r['id'] ?? '') ?></td>
            <td class="nowrap"><?= h($r['created_at'] ?? '') ?></td>
            <td><?= h($r['first_name'] ?? '') ?></td>
            <td><?= h($r['last_name'] ?? '') ?></td>
            <td><?= h($r['email'] ?? '') ?></td>
            <td><?= h($r['mobile'] ?? '') ?></td>
            <td><?= h($r['emergency_name'] ?? '') ?></td>
            <td><?= h($r['emergency_phone'] ?? '') ?></td>
            <td class="nowrap"><?= isset($r['safety_accepted']) ? h($r['safety_accepted']) : '' ?></td>
            <td><?= h($r['legs'] ?? '') ?></td>
            <td><?= h($r['status'] ?? '') ?></td>
            <td class="nowrap"><?= h($r['approved_at'] ?? '') ?></td>
            <td class="nowrap"><?= h($r['rejected_at'] ?? '') ?></td>
            <td><?= h($r['rejection_reason'] ?? '') ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

</body>
</html>
