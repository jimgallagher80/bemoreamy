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
<html>
<body style="font-family:sans-serif;padding:40px;">
<h2>Admin Login</h2>
<?php if (!empty($error)) echo "<p style='color:red'>$error</p>"; ?>
<form method="post">
<input type="password" name="login_password" placeholder="Password" style="padding:10px;width:100%;margin-bottom:10px;">
<button style="padding:10px;width:100%;">Login</button>
</form>
</body>
</html>
<?php
exit;
endif;

/* -------- EMAIL FUNCTION -------- */

function sendEmail($to, $subject, $message) {
    $headers = "From: Be More Amy <noreply@bemoreamy.com>\r\n";
    $headers .= "Reply-To: noreply@bemoreamy.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    mail($to, $subject, $message, $headers);
}

function buildStatusEmailBody($signup, $legs) {
    // $legs rows: leg_number, status, rejection_reason
    $lines = [];
    $hasWaitlist = false;

    foreach ($legs as $row) {
        $legNum = (int)$row['leg_number'];
        $st = $row['status'];

        if ($st === 'confirmed') {
            $label = "Confirmed";
        } elseif ($st === 'waitlist') {
            $label = "Interest recorded (leg currently taken)";
            $hasWaitlist = true;
        } elseif ($st === 'rejected') {
            $label = "Rejected";
        } else {
            $label = "Pending";
        }

        $extra = '';
        if ($st === 'rejected' && !empty($row['rejection_reason'])) {
            $extra = " — Reason: " . $row['rejection_reason'];
        }

        $lines[] = "Leg {$legNum}: {$label}{$extra}";
    }

    $body =
        "Hello {$signup['team_leader_first_name']},\n\n"
        . "Thank you for signing up to take part in the Be More Amy South West Coastal Path Relay Challenge.\n\n"
        . "Here is the current status of your selected leg(s):\n\n"
        . implode("\n", $lines)
        . "\n\n";

    if ($hasWaitlist) {
        $body .= "If we have recorded your interest for a leg that is currently taken, we will be in touch should that leg become available due to the other team pulling out.\n\n";
    }

    $body .= "You can view the confirmed signups here: https://bemoreamy.com/signup-status.html\n\n";
    $body .= "Be More Amy Team";

    return $body;
}

/* -------- ACTIONS (PER LEG) -------- */

$flash = '';

if (isset($_POST['approve_leg'])) {
    $signupId = (int)($_POST['signup_id'] ?? 0);
    $legNum = (int)($_POST['leg_number'] ?? 0);

    if ($signupId > 0 && $legNum > 0) {
        // Load signup
        $s = $pdo->prepare("SELECT * FROM signups WHERE id = ?");
        $s->execute([$signupId]);
        $signup = $s->fetch(PDO::FETCH_ASSOC);

        if ($signup) {
            // Is leg already taken by someone else?
            $t = $pdo->prepare("
                SELECT COUNT(*) 
                FROM signup_legs 
                WHERE leg_number = ? 
                  AND status = 'confirmed'
                  AND signup_id <> ?
            ");
            $t->execute([$legNum, $signupId]);
            $takenByOther = ((int)$t->fetchColumn() > 0);

            if ($takenByOther) {
                $newStatus = 'waitlist';
            } else {
                $newStatus = 'confirmed';
            }

            $u = $pdo->prepare("
                UPDATE signup_legs
                SET status = ?, approved_at = NOW(), rejected_at = NULL, rejection_reason = NULL
                WHERE signup_id = ? AND leg_number = ?
            ");
            $u->execute([$newStatus, $signupId, $legNum]);

            // Ensure parent signup stays pending for grouping (optional)
            $pdo->prepare("UPDATE signups SET status = 'pending' WHERE id = ?")->execute([$signupId]);

            // Email: include all legs and their statuses
            $legsStmt = $pdo->prepare("SELECT leg_number, status, rejection_reason FROM signup_legs WHERE signup_id = ? ORDER BY leg_number ASC");
            $legsStmt->execute([$signupId]);
            $legs = $legsStmt->fetchAll(PDO::FETCH_ASSOC);

            $subject = "BE MORE AMY: Update on your leg selection(s)";
            $message = buildStatusEmailBody($signup, $legs);
            sendEmail($signup['email'], $subject, $message);

            $flash = "Updated: signup #{$signupId}, leg {$legNum} set to {$newStatus}.";
        }
    }
}

if (isset($_POST['reject_leg'])) {
    $signupId = (int)($_POST['signup_id'] ?? 0);
    $legNum = (int)($_POST['leg_number'] ?? 0);
    $reason = trim((string)($_POST['rejection_reason'] ?? ''));

    if ($signupId > 0 && $legNum > 0) {
        $s = $pdo->prepare("SELECT * FROM signups WHERE id = ?");
        $s->execute([$signupId]);
        $signup = $s->fetch(PDO::FETCH_ASSOC);

        if ($signup) {
            $u = $pdo->prepare("
                UPDATE signup_legs
                SET status = 'rejected', rejected_at = NOW(), approved_at = NULL, rejection_reason = ?
                WHERE signup_id = ? AND leg_number = ?
            ");
            $u->execute([$reason, $signupId, $legNum]);

            $pdo->prepare("UPDATE signups SET status = 'pending' WHERE id = ?")->execute([$signupId]);

            $legsStmt = $pdo->prepare("SELECT leg_number, status, rejection_reason FROM signup_legs WHERE signup_id = ? ORDER BY leg_number ASC");
            $legsStmt->execute([$signupId]);
            $legs = $legsStmt->fetchAll(PDO::FETCH_ASSOC);

            $subject = "BE MORE AMY: Update on your leg selection(s)";
            $message = buildStatusEmailBody($signup, $legs);
            sendEmail($signup['email'], $subject, $message);

            $flash = "Updated: signup #{$signupId}, leg {$legNum} rejected.";
        }
    }
}

/* -------- FILTERS -------- */

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

$where_sql = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

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
        sl.rejection_reason,
        (
            SELECT COUNT(*)
            FROM signup_legs slx
            WHERE slx.leg_number = sl.leg_number
              AND slx.status = 'confirmed'
              AND slx.signup_id <> s.id
        ) AS taken_by_other
    FROM signups s
    JOIN signup_legs sl ON sl.signup_id = s.id
    $where_sql
    ORDER BY s.created_at DESC, sl.leg_number ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// legs list for dropdown filter (1..68 based on data present)
$legs_stmt = $pdo->query("SELECT DISTINCT leg_number FROM signup_legs ORDER BY leg_number ASC");
$leg_numbers = $legs_stmt->fetchAll(PDO::FETCH_COLUMN);

$current_qs = http_build_query(['status' => $filter_status, 'leg' => $filter_leg]);

// Group rows by signup_id for display
$grouped = [];
foreach ($rows as $r) {
    $sid = (int)$r['signup_id'];
    if (!isset($grouped[$sid])) $grouped[$sid] = [];
    $grouped[$sid][] = $r;
}
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
textarea, input[type="text"] { width:100%; margin-top:6px; padding:8px; }
.status-confirmed { color:green; font-weight:700; }
.status-pending { color:orange; font-weight:700; }
.status-waitlist { color:#6b4e00; font-weight:700; }
.status-rejected { color:red; font-weight:700; }
.filters { border:1px solid #ddd; padding:10px; margin:12px 0 18px; background:#f9f9f9; }
.small { font-size:12px; color:#444; }
.leg-row { border-top:1px solid #eee; padding-top:10px; margin-top:10px; }
.pill { display:inline-block; padding:2px 8px; border:1px solid #ccc; border-radius:999px; font-size:12px; margin-left:6px; }
.pill-taken { border-color:#c00; color:#c00; }
.pill-available { border-color:#090; color:#090; }
.actions { margin-top:8px; }
</style>
</head>
<body>

<h2>Admin Panel</h2>
<p><a href="admin.php?logout=1">Logout</a></p>

<?php if (!empty($flash)): ?>
  <p style="background:#e8f5e9;border:1px solid #c8e6c9;padding:10px;"><?php echo htmlspecialchars($flash); ?></p>
<?php endif; ?>

<div class="filters">
  <form method="get" style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
    <div>
      <label>Status</label><br>
      <select name="status" style="padding:8px;">
        <?php
        foreach ($allowed_status as $st) {
          $sel = ($filter_status === $st) ? 'selected' : '';
          echo "<option value='{$st}' {$sel}>{$st}</option>";
        }
        ?>
      </select>
    </div>

    <div>
      <label>Leg</label><br>
      <select name="leg" style="padding:8px;">
        <option value="all" <?php echo ($filter_leg === 'all') ? 'selected' : ''; ?>>All</option>
        <?php foreach ($leg_numbers as $ln):
          $ln = (int)$ln;
          $sel = ((string)$ln === (string)$filter_leg) ? 'selected' : '';
          ?>
          <option value="<?php echo $ln; ?>" <?php echo $sel; ?>><?php echo $ln; ?></option>
        <?php endforeach; ?>
      </select>
    </div>

    <div>
      <button type="submit" style="padding:10px 14px;">Apply</button>
      <a href="admin.php" style="margin-left:10px;">Reset</a>
    </div>

    <div style="margin-left:auto;">
      <a href="admin_full_table.php?<?php echo $current_qs; ?>">Display full table</a> |
      <a href="export_signups.php?<?php echo $current_qs; ?>">Export CSV</a>
    </div>
  </form>
</div>

<?php if (empty($grouped)): ?>
  <p>No signups found for the selected filters.</p>
<?php endif; ?>

<?php foreach ($grouped as $sid => $items):
  $head = $items[0];
?>
<div class="signup">
  <strong>#<?php echo (int)$sid; ?> — <?php echo htmlspecialchars($head['team_leader_first_name'] . ' ' . $head['team_leader_surname']); ?></strong>
  <div class="small">
    Submitted: <?php echo htmlspecialchars($head['created_at']); ?><br>
    Group size: <?php echo (int)$head['group_size']; ?><br>
    Email: <?php echo htmlspecialchars($head['email']); ?><br>
    Phone: <?php echo htmlspecialchars($head['phone']); ?><br>
    Safety accepted: <?php echo ((int)$head['safety_accepted'] === 1) ? 'Yes' : 'No'; ?>
  </div>

  <?php foreach ($items as $r):
    $legNum = (int)$r['leg_number'];
    $st = $r['leg_status'];
    $statusClass = 'status-pending';
    if ($st === 'confirmed') $statusClass = 'status-confirmed';
    if ($st === 'waitlist') $statusClass = 'status-waitlist';
    if ($st === 'rejected') $statusClass = 'status-rejected';

    $takenByOther = ((int)$r['taken_by_other'] > 0);
    $pillClass = $takenByOther ? 'pill pill-taken' : 'pill pill-available';
    $pillText = $takenByOther ? 'Taken' : 'Available';
  ?>
    <div class="leg-row">
      <div>
        <strong>Leg <?php echo $legNum; ?></strong>
        <span class="<?php echo $pillClass; ?>"><?php echo $pillText; ?></span>
        <?php if ((int)$r['was_taken'] === 1): ?>
          <span class="pill pill-taken">Was taken at submission</span>
        <?php endif; ?>
      </div>

      <div class="<?php echo $statusClass; ?>">
        Status: <?php echo htmlspecialchars($st); ?>
      </div>

      <?php if (!empty($r['rejection_reason'])): ?>
        <div class="small">Rejection reason: <?php echo htmlspecialchars($r['rejection_reason']); ?></div>
      <?php endif; ?>

      <div class="actions">
        <form method="post" style="margin:0;">
          <input type="hidden" name="signup_id" value="<?php echo (int)$sid; ?>">
          <input type="hidden" name="leg_number" value="<?php echo $legNum; ?>">

          <button type="submit" name="approve_leg" value="1">Approve</button>
        </form>

        <form method="post" style="margin:8px 0 0;">
          <input type="hidden" name="signup_id" value="<?php echo (int)$sid; ?>">
          <input type="hidden" name="leg_number" value="<?php echo $legNum; ?>">
          <input type="text" name="rejection_reason" placeholder="Rejection reason (required if rejecting)">
          <button type="submit" name="reject_leg" value="1" style="margin-top:6px;">Reject</button>
        </form>
      </div>
    </div>
  <?php endforeach; ?>
</div>
<?php endforeach; ?>

</body>
</html>
