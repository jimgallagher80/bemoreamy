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

/* -------- UTIL -------- */

function sendEmail($to, $subject, $message) {
    $headers = "From: Be More Amy <noreply@bemoreamy.com>\r\n";
    $headers .= "Reply-To: hello@bemoreamy.com\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    @mail($to, $subject, $message, $headers);
}

function randomToken($len = 48) {
    return bin2hex(random_bytes((int)($len/2)));
}

function ensureTeamDetailsToken(PDO $pdo, int $signupId): string {
    // If token exists, return it
    $q = $pdo->prepare("SELECT team_details_token FROM signups WHERE id = ?");
    $q->execute([$signupId]);
    $existing = $q->fetchColumn();
    if ($existing) return (string)$existing;

    // Create token (retry on rare collision)
    for ($i=0; $i<5; $i++) {
        $token = randomToken(48);
        try {
            $u = $pdo->prepare("
                UPDATE signups
                SET team_details_token = ?, team_details_token_created_at = NOW()
                WHERE id = ? AND (team_details_token IS NULL OR team_details_token = '')
            ");
            $u->execute([$token, $signupId]);

            // confirm
            $q->execute([$signupId]);
            $final = $q->fetchColumn();
            if ($final) return (string)$final;

        } catch (Exception $e) {
            // collision -> loop
        }
    }

    // last attempt to read whatever is there
    $q->execute([$signupId]);
    $final = $q->fetchColumn();
    return $final ? (string)$final : '';
}

function buildStatusEmailBody(PDO $pdo, array $signup, array $legs) {
    $lines = [];
    $hasWaitlist = false;

    $hasConfirmed = false;
    foreach ($legs as $row) {
        if ($row['status'] === 'confirmed') { $hasConfirmed = true; break; }
    }

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

    // Only include team-details link if at least one confirmed leg
    if ($hasConfirmed) {
        $token = ensureTeamDetailsToken($pdo, (int)$signup['id']);
        if ($token) {
            $body .= "Next step: please provide your full team details using your unique link:\n";
            $body .= "https://bemoreamy.com/team-details.html?token=" . urlencode($token) . "\n\n";
            $body .= "This link is unique to you. Please do not share it.\n\n";
        }
    }

    $body .= "You can view the confirmed signups here: https://bemoreamy.com/signup-status.html\n\n";
    $body .= "Be More Amy Team";

    return $body;
}

/* -------- BATCH UPDATE ACTION (PER SIGNUP) -------- */

$flash = '';

if (isset($_POST['batch_update']) && isset($_POST['signup_id'])) {
    $signupId = (int)$_POST['signup_id'];

    $decisions = $_POST['decision'] ?? [];
    $reasons = $_POST['reason'] ?? [];

    if ($signupId > 0 && is_array($decisions)) {

        $s = $pdo->prepare("SELECT * FROM signups WHERE id = ?");
        $s->execute([$signupId]);
        $signup = $s->fetch(PDO::FETCH_ASSOC);

        if ($signup) {
            $pdo->beginTransaction();

            try {
                foreach ($decisions as $legKey => $decision) {

                    $legNum = (int)$legKey;
                    $decision = trim((string)$decision);

                    if ($legNum <= 0) continue;
                    if ($decision === 'skip' || $decision === '') continue;

                    if ($decision === 'approve') {
                        $t = $pdo->prepare("
                            SELECT COUNT(*)
                            FROM signup_legs
                            WHERE leg_number = ?
                              AND status = 'confirmed'
                              AND signup_id <> ?
                        ");
                        $t->execute([$legNum, $signupId]);
                        $takenByOther = ((int)$t->fetchColumn() > 0);

                        $newStatus = $takenByOther ? 'waitlist' : 'confirmed';

                        $u = $pdo->prepare("
                            UPDATE signup_legs
                            SET status = ?, approved_at = NOW(), rejected_at = NULL, rejection_reason = NULL
                            WHERE signup_id = ? AND leg_number = ?
                        ");
                        $u->execute([$newStatus, $signupId, $legNum]);
                    }

                    if ($decision === 'reject') {
                        $reason = trim((string)($reasons[$legKey] ?? ''));
                        if ($reason === '') $reason = 'Rejected by admin';

                        $u = $pdo->prepare("
                            UPDATE signup_legs
                            SET status = 'rejected', rejected_at = NOW(), approved_at = NULL, rejection_reason = ?
                            WHERE signup_id = ? AND leg_number = ?
                        ");
                        $u->execute([$reason, $signupId, $legNum]);
                    }
                }

                $pdo->prepare("UPDATE signups SET status = 'pending' WHERE id = ?")->execute([$signupId]);

                $pdo->commit();

                $legsStmt = $pdo->prepare("
                    SELECT leg_number, status, rejection_reason
                    FROM signup_legs
                    WHERE signup_id = ?
                    ORDER BY leg_number ASC
                ");
                $legsStmt->execute([$signupId]);
                $legs = $legsStmt->fetchAll(PDO::FETCH_ASSOC);

                $subject = "BE MORE AMY: Update on your leg selection(s)";
                $message = buildStatusEmailBody($pdo, $signup, $legs);
                sendEmail($signup['email'], $subject, $message);

                $nameForSent = trim((string)$signup['team_leader_first_name'] . ' ' . (string)$signup['team_leader_surname']);
                $emailForSent = (string)$signup['email'];
                header('Location: admin.php?sent=1&name=' . rawurlencode($nameForSent) . '&email=' . rawurlencode($emailForSent));
                exit;
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $flash = "Error updating signup #{$signupId}.";
                error_log("Batch update failed: " . $e->getMessage());
            }
        }
    }
}

/* -------- DATA (NO FILTERS ON MAIN ADMIN VIEW) -------- */

$filter_status = 'all';
$filter_leg = 'all';
$where_sql = '';
$params = [];

$current_qs = '';

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

$legs_stmt = $pdo->query("SELECT DISTINCT leg_number FROM signup_legs ORDER BY leg_number ASC");
$leg_numbers = $legs_stmt->fetchAll(PDO::FETCH_COLUMN);

$current_qs = http_build_query(['status' => $filter_status, 'leg' => $filter_leg]);

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
.signup { border:1px solid #ccc; padding:12px; margin-bottom:12px; }
button { margin-right:8px; padding:6px 10px; }
input[type="text"] { width:100%; margin-top:6px; padding:8px; }
.status-confirmed { color:green; font-weight:700; }
.status-pending { color:orange; font-weight:700; }
.status-waitlist { color:#6b4e00; font-weight:700; }
.status-rejected { color:red; font-weight:700; }
.filters { border:1px solid #ddd; padding:10px; margin:12px 0 18px; background:#f9f9f9; }
.small { font-size:12px; color:#444; }
.leg-row { border-top:1px solid #eee; padding-top:10px; margin-top:10px; }
.pill { display:inline-block; padding:2px 8px; border:1px solid #ccc; border-radius:999px; font-size:12px; margin-left:6px; }
.pill-taken { border-color:#c00; color:#c00; }
.grid { display:grid; grid-template-columns: 1fr 220px; gap:10px; align-items:start; }
.decision select { padding:6px; width:100%; }
.reason-input { display:none; }
.processed { border:1px solid #ddd; padding:10px; background:#f9f9f9; }
.processed summary { cursor:pointer; font-weight:700; }
.processed[open] { background:#fff; }
@media (max-width: 640px) {
  body { padding:18px; }
  .grid { grid-template-columns: 1fr; }
  .decision { margin-top:8px; }
}
</style>
</head>
<body>

<h2>Admin Panel</h2>
<p><a href="admin.php?logout=1">Logout</a></p>

<?php if (!empty($flash)): ?>
  <p style="background:#e8f5e9;border:1px solid #c8e6c9;padding:10px;"><?php echo htmlspecialchars($flash); ?></p>
<?php endif; ?>

<?php
if (isset($_GET['sent']) && $_GET['sent'] === '1') {
    $n = $_GET['name'] ?? '';
    $e = $_GET['email'] ?? '';
    $msg = "Email has been sent to {$n} at {$e}";
    echo "<script>window.addEventListener('load', function(){ alert(" . json_encode($msg) . "); });</script>";
}
?>

<div class="filters">
  <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
    <div style="margin-left:auto;">
      <a href="admin_full_table.php">Display full table</a> |
      <a href="export_signups.php">Export CSV</a>
    </div>
  </div>
</div>

<?php if (empty($pending_grouped)): ?>
  <p>No pending submissions.</p>
<?php endif; ?>

<?php foreach ($pending_grouped as $sid => $items):
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

  <form method="post" style="margin-top:10px;">
    <input type="hidden" name="signup_id" value="<?php echo (int)$sid; ?>">

    <?php foreach ($items as $r):
      $legNum = (int)$r['leg_number'];
      $st = (string)$r['leg_status'];
      $statusClass = ($st === 'confirmed') ? 'status-confirmed' : (($st === 'rejected') ? 'status-rejected' : (($st === 'waitlist') ? 'status-waitlist' : 'status-pending'));
    ?>
      <div class="leg-row">
        <div class="grid">
          <div>
            <strong>Leg <?php echo $legNum; ?></strong>
            <?php if ((int)$r['was_taken'] === 1): ?>
              <span class="pill pill-taken">Waitlist</span>
            <?php endif; ?>
            <div class="<?php echo $statusClass; ?>">Current status: <?php echo htmlspecialchars($st); ?></div>
            <?php if (!empty($r['rejection_reason'])): ?>
              <div class="small">Rejection reason: <?php echo htmlspecialchars($r['rejection_reason']); ?></div>
            <?php endif; ?>
          </div>

          <div class="decision">
            <select name="decision[<?php echo $legNum; ?>]" data-leg="<?php echo $legNum; ?>">
              <option value="skip">No change</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
            <input class="reason-input" type="text" name="reason[<?php echo $legNum; ?>]" placeholder="Rejection reason" data-reason-for="<?php echo $legNum; ?>">
          </div>
        </div>
      </div>
    <?php endforeach; ?>

    <div style="margin-top:12px;">
      <button type="submit" name="batch_update" value="1" style="padding:10px 14px;">Confirm</button>
    </div>
  </form>
</div>
<?php endforeach; ?>

<details class="processed">
  <summary>Processed submissions (<?php echo (int)$processed_count; ?>)</summary>
  <div style="margin-top:12px;">
    <?php if (empty($processed_grouped)): ?>
      <p class="small">No processed submissions yet.</p>
    <?php endif; ?>

    <?php foreach ($processed_grouped as $sid => $items):
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

      <form method="post" style="margin-top:10px;">
        <input type="hidden" name="signup_id" value="<?php echo (int)$sid; ?>">

        <?php foreach ($items as $r):
          $legNum = (int)$r['leg_number'];
          $st = (string)$r['leg_status'];
          $statusClass = ($st === 'confirmed') ? 'status-confirmed' : (($st === 'rejected') ? 'status-rejected' : (($st === 'waitlist') ? 'status-waitlist' : 'status-pending'));
        ?>
          <div class="leg-row">
            <div class="grid">
              <div>
                <strong>Leg <?php echo $legNum; ?></strong>
                <?php if ((int)$r['was_taken'] === 1): ?>
                  <span class="pill pill-taken">Waitlist</span>
                <?php endif; ?>
                <div class="<?php echo $statusClass; ?>">Current status: <?php echo htmlspecialchars($st); ?></div>
                <?php if (!empty($r['rejection_reason'])): ?>
                  <div class="small">Rejection reason: <?php echo htmlspecialchars($r['rejection_reason']); ?></div>
                <?php endif; ?>
              </div>

              <div class="decision">
                <select name="decision[<?php echo $legNum; ?>]" data-leg="<?php echo $legNum; ?>">
                  <option value="skip">No change</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                </select>
                <input class="reason-input" type="text" name="reason[<?php echo $legNum; ?>]" placeholder="Rejection reason" data-reason-for="<?php echo $legNum; ?>">
              </div>
            </div>
          </div>
        <?php endforeach; ?>

        <div style="margin-top:12px;">
          <button type="submit" name="batch_update" value="1" style="padding:10px 14px;">Confirm</button>
        </div>
      </form>
    </div>
    <?php endforeach; ?>
  </div>
</details>


<script>
(function(){
  function syncReason(selectEl) {
    var leg = selectEl.getAttribute('data-leg');
    var input = document.querySelector('input[data-reason-for="' + leg + '"]');
    if (!input) return;
    if (selectEl.value === 'reject') {
      input.style.display = 'block';
    } else {
      input.style.display = 'none';
    }
  }

  document.addEventListener('change', function(e){
    var t = e.target;
    if (t && t.matches('select[data-leg]')) syncReason(t);
  });

  window.addEventListener('load', function(){
    var selects = document.querySelectorAll('select[data-leg]');
    selects.forEach(function(s){ syncReason(s); });
  });
})();
</script>

</body>
</html>
