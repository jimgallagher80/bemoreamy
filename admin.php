<?php
session_start();
require_once __DIR__ . '/includes/db.php';

$ADMIN_PASSWORD = "SugarTits2026!";

/* -------- LOGIN -------- */

if (isset($_POST['login_password'])) {
    if ($_POST['login_password'] === $ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
    } else {
        $error = "Incorrect password.";
    }
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: admin.php");
    exit;
}

if (!isset($_SESSION['admin_logged_in'])):
?>
<!doctype html>
<html><body style="font-family:sans-serif;padding:40px;">
<h2>Admin Login</h2>
<?php if (!empty($error)) echo "<p style='color:red'>$error</p>"; ?>
<form method="post">
<input type="password" name="login_password" placeholder="Password" style="padding:10px;width:100%;margin-bottom:10px;">
<button style="padding:10px;width:100%;">Login</button>
</form>
</body></html>
<?php
exit;
endif;

/* -------- EMAIL FUNCTION -------- */

function sendEmail($to, $subject, $message) {
    $headers = "From: noreply@bemoreamy.com\r\n";
    $headers .= "Reply-To: noreply@bemoreamy.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    mail($to, $subject, $message, $headers);
}

/* -------- APPROVE -------- */

if (isset($_POST['approve'])) {
    $id = (int)$_POST['approve'];

    $stmt = $pdo->prepare("SELECT * FROM signups WHERE id=?");
    $stmt->execute([$id]);
    $signup = $stmt->fetch();

    if ($signup) {
        $pdo->prepare("UPDATE signups SET status='approved', approved_at=NOW(), rejection_reason=NULL WHERE id=?")
            ->execute([$id]);

        $subject = "Your BE MORE AMY signup has been confirmed";
        $message = "Hello {$signup['first_name']},\n\n"
                 . "Your signup for the BE MORE AMY South West Coastal Path Relay Challenge has been confirmed.\n\n"
                 . "We look forward to your participation.\n\n"
                 . "Kind regards,\nBE MORE AMY Team";

        sendEmail($signup['email'], $subject, $message);
    }
}

/* -------- REJECT -------- */

if (isset($_POST['reject'])) {
    $id = (int)$_POST['reject'];
    $reason = trim($_POST['reason'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM signups WHERE id=?");
    $stmt->execute([$id]);
    $signup = $stmt->fetch();

    if ($signup) {
        $pdo->prepare("UPDATE signups SET status='rejected', rejected_at=NOW(), rejection_reason=? WHERE id=?")
            ->execute([$reason, $id]);

        $subject = "Your BE MORE AMY signup update";
        $message = "Hello {$signup['first_name']},\n\n"
                 . "Thank you for signing up for BE MORE AMY.\n\n"
                 . "Unfortunately your signup has not been approved at this time.\n\n";

        if ($reason !== '') {
            $message .= "Reason provided:\n$reason\n\n";
        }

        $message .= "If you would like to discuss this further, please contact the organisers.\n\n"
                  . "Kind regards,\nBE MORE AMY Team";

        sendEmail($signup['email'], $subject, $message);
    }
}

/* -------- LOAD ALL (WITH FILTERS) -------- */

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
    SELECT s.*, GROUP_CONCAT(sl.leg_number ORDER BY sl.leg_number) as legs
    FROM signups s
    LEFT JOIN signup_legs sl ON s.id = sl.signup_id
    $where_sql
    GROUP BY s.id
    ORDER BY s.created_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$signups = $stmt->fetchAll();

/* -------- LOAD LEG OPTIONS -------- */

$legs_stmt = $pdo->query("SELECT DISTINCT leg_number FROM signup_legs ORDER BY leg_number ASC");
$leg_numbers = $legs_stmt->fetchAll(PDO::FETCH_COLUMN);
?>

<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Admin Panel</title>
<style>
body { font-family:sans-serif; padding:30px; }
.signup { border:1px solid #ccc; padding:12px; margin-bottom:10px; }
button { margin-right:8px; padding:6px 10px; }
textarea { width:100%; margin-top:6px; }
.status-approved { color:green; font-weight:700; }
.status-pending { color:orange; font-weight:700; }
.status-rejected { color:red; font-weight:700; }

.filters { border:1px solid #ddd; padding:10px; margin:12px 0 18px; background:#f7f7f7; }
.filters label { margin-right:10px; font-weight:700; }
.filters select { padding:6px 8px; margin-right:10px; }
.filters button { padding:6px 10px; }
</style>
</head>
<body>

<h1>Admin Panel</h1>
<p><a href="admin.php?logout=1">Logout</a></p>

<?php $current_qs = http_build_query(['status' => $filter_status, 'leg' => $filter_leg]); ?>

<form method="get" class="filters">
  <label for="status">Status</label>
  <select id="status" name="status">
    <option value="all" <?= $filter_status === 'all' ? 'selected' : '' ?>>All</option>
    <option value="pending" <?= $filter_status === 'pending' ? 'selected' : '' ?>>Pending</option>
    <option value="approved" <?= $filter_status === 'approved' ? 'selected' : '' ?>>Approved</option>
    <option value="rejected" <?= $filter_status === 'rejected' ? 'selected' : '' ?>>Rejected</option>
  </select>

  <label for="leg">Leg</label>
  <select id="leg" name="leg">
    <option value="all" <?= $filter_leg === 'all' ? 'selected' : '' ?>>All</option>
    <?php foreach ($leg_numbers as $ln): ?>
      <option value="<?= (int)$ln ?>" <?= $filter_leg !== 'all' && (int)$filter_leg === (int)$ln ? 'selected' : '' ?>>
        <?= (int)$ln ?>
      </option>
    <?php endforeach; ?>
  </select>

  <button type="submit">Apply</button>
   
    <a href="export_signups.php?<?= htmlspecialchars($current_qs) ?>" style="display:inline-block; margin-left:10px; padding:6px 10px; border:1px solid #000; text-decoration:none; background:#fff; color:#000;">
  Export CSV
</a>

    <a href="admin_full_table.php?<?= htmlspecialchars($current_qs) ?>" style="display:inline-block; margin-left:10px; padding:6px 10px; border:1px solid #000; text-decoration:none; background:#fff; color:#000;">
  Display full table
</a>
    
</form>

<?php foreach ($signups as $s): ?>
<div class="signup">
<strong><?= htmlspecialchars($s['first_name']) ?> <?= htmlspecialchars($s['last_name']) ?></strong><br>
Email: <?= htmlspecialchars($s['email']) ?><br>
Legs: <?= htmlspecialchars($s['legs']) ?><br>
Status: <span class="status-<?= $s['status'] ?>"><?= ucfirst($s['status']) ?></span>

<?php if ($s['status'] === 'pending'): ?>
<form method="post" action="admin.php?<?= htmlspecialchars($current_qs) ?>" style="margin-top:8px;">
<button name="approve" value="<?= $s['id'] ?>">Approve</button>
<br><br>
<textarea name="reason" placeholder="Reason for rejection (optional)"></textarea>
<button name="reject" value="<?= $s['id'] ?>">Reject</button>
</form>
<?php endif; ?>

</div>
<?php endforeach; ?>

</body>
</html>
