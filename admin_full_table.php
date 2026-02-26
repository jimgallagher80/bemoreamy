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
    s.id AS signup_id,
    s.created_at,
    s.team_leader_first_name,
    s.team_leader_surname,
    s.group_size,
    s.email,
    s.phone,
    s.safety_accepted,
    sl.leg_number,
    sl.status AS leg_status,
    sl.was_taken,
    sl.approved_at,
    sl.rejected_at,
    sl.rejection_reason
  FROM signups s
  JOIN signup_legs sl ON s.id = sl.signup_id
  $where_sql
  ORDER BY s.created_at DESC, sl.leg_number ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Admin — Full Table</title>
<style>
body { font-family:sans-serif; padding:20px; }
table { border-collapse: collapse; width: 100%; }
th, td { border:1px solid #ddd; padding:8px; vertical-align: top; }
th { background:#f5f5f5; position: sticky; top: 0; }
.small { font-size:12px; color:#444; }
</style>
</head>
<body>

<h2>Full Table</h2>
<p><a href="admin.php">Back to Admin</a></p>

<table>
  <thead>
    <tr>
      <th>Signup ID</th>
      <th>Submitted</th>
      <th>Team Leader</th>
      <th>Group Size</th>
      <th>Email</th>
      <th>Phone</th>
      <th>Safety</th>
      <th>Leg</th>
      <th>Leg Status</th>
      <th>Was Taken at Submission</th>
      <th>Approved At</th>
      <th>Rejected At</th>
      <th>Rejection Reason</th>
    </tr>
  </thead>
  <tbody>
    <?php if (empty($rows)): ?>
      <tr><td colspan="13">No rows found.</td></tr>
    <?php endif; ?>

    <?php foreach ($rows as $r): ?>
      <tr>
        <td><?php echo (int)$r['signup_id']; ?></td>
        <td class="small"><?php echo htmlspecialchars($r['created_at'] ?? ''); ?></td>
        <td><?php echo htmlspecialchars(($r['team_leader_first_name'] ?? '') . ' ' . ($r['team_leader_surname'] ?? '')); ?></td>
        <td><?php echo (int)($r['group_size'] ?? 0); ?></td>
        <td><?php echo htmlspecialchars($r['email'] ?? ''); ?></td>
        <td><?php echo htmlspecialchars($r['phone'] ?? ''); ?></td>
        <td><?php echo ((int)($r['safety_accepted'] ?? 0) === 1) ? 'Yes' : 'No'; ?></td>
        <td><?php echo (int)$r['leg_number']; ?></td>
        <td><?php echo htmlspecialchars($r['leg_status'] ?? ''); ?></td>
        <td><?php echo ((int)($r['was_taken'] ?? 0) === 1) ? 'Yes' : 'No'; ?></td>
        <td class="small"><?php echo htmlspecialchars($r['approved_at'] ?? ''); ?></td>
        <td class="small"><?php echo htmlspecialchars($r['rejected_at'] ?? ''); ?></td>
        <td><?php echo htmlspecialchars($r['rejection_reason'] ?? ''); ?></td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>

</body>
</html>
