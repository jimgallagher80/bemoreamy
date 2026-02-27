<?php
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=signups_export.csv');

$filter_status = $_GET['status'] ?? 'all';
$filter_leg = $_GET['leg'] ?? 'all';

$allowed_status = ['all','pending','confirmed','waitlist','rejected'];
if (!in_array($filter_status, $allowed_status, true)) $filter_status = 'all';

if ($filter_leg !== 'all') {
    $filter_leg = (string)(int)$filter_leg;
    if ($filter_leg === '0') $filter_leg = 'all';
}

$where = [];
$params = [];

if ($filter_status !== 'all') { $where[] = "sl.status = ?"; $params[] = $filter_status; }
if ($filter_leg !== 'all') { $where[] = "sl.leg_number = ?"; $params[] = (int)$filter_leg; }

$where_sql = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "
    SELECT
      s.id AS signup_id,
      s.created_at,
      s.team_leader_first_name,
      s.team_leader_surname,
      s.team_name,
      s.group_size,
      s.email,
      s.phone,
      s.team_details_token
    FROM signups s
    JOIN signup_legs sl ON sl.signup_id = s.id
    $where_sql
    GROUP BY s.id
    ORDER BY s.created_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$signups = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Preload legs + members for each signup
$legsStmt = $pdo->prepare("SELECT leg_number, status FROM signup_legs WHERE signup_id = ? ORDER BY leg_number ASC");
$memStmt = $pdo->prepare("
  SELECT member_index, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone
  FROM team_members
  WHERE signup_id = ?
  ORDER BY member_index ASC
");

$out = fopen('php://output', 'w');

// Headers (fixed columns)
fputcsv($out, [
  'Signup ID',
  'Created At',
  'Team Leader First Name',
  'Team Leader Surname',
  'Team Name',
  'Group Size',
  'Email',
  'Phone',
  'Legs (with status)',
  'Team Details Link',
  'Team Members (includes emergency contacts)'
]);

foreach ($signups as $s) {
    $sid = (int)$s['signup_id'];

    $legsStmt->execute([$sid]);
    $legs = $legsStmt->fetchAll(PDO::FETCH_ASSOC);
    $legsText = implode(' | ', array_map(function($r){
        return 'Leg ' . (int)$r['leg_number'] . ': ' . $r['status'];
    }, $legs));

    $memStmt->execute([$sid]);
    $members = $memStmt->fetchAll(PDO::FETCH_ASSOC);
    $membersText = implode(' | ', array_map(function($m){
        $idx = (int)$m['member_index'];
        $label = ($idx === 1) ? 'Team Leader — Team Member 1' : 'Team Member ' . $idx;
        return $label . ': '
          . $m['first_name'] . ' ' . $m['last_name']
          . ', ' . $m['email']
          . ', ' . $m['phone']
          . ', EC: ' . $m['emergency_contact_name'] . ' ' . $m['emergency_contact_phone'];
    }, $members));

    $teamLink = '';
    if (!empty($s['team_details_token'])) {
        $teamLink = 'https://bemoreamy.com/team-details.html?token=' . $s['team_details_token'];
    }

    fputcsv($out, [
      $sid,
      $s['created_at'],
      $s['team_leader_first_name'],
      $s['team_leader_surname'],
      $s['team_name'],
      $s['group_size'],
      $s['email'],
      $s['phone'],
      $legsText,
      $teamLink,
      $membersText
    ]);
}

fclose($out);
