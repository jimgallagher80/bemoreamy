<?php
session_start();
require_once __DIR__ . '/includes/db.php';

$ADMIN_PASSWORD = "SugarTits2026!";

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
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Login</title>
<style>
body { font-family: sans-serif; padding:40px; }
input { padding:10px; width:100%; margin-bottom:10px; }
button { padding:10px; width:100%; }
</style>
</head>
<body>
<h2>Admin Login</h2>
<?php if (!empty($error)) echo "<p style='color:red'>$error</p>"; ?>
<form method="post">
    <input type="password" name="login_password" placeholder="Password">
    <button type="submit">Login</button>
</form>
</body>
</html>
<?php
exit;
endif;

/* ---- APPROVAL ACTIONS ---- */

if (isset($_POST['approve'])) {
    $id = (int)$_POST['approve'];
    $stmt = $pdo->prepare("UPDATE signups SET status='approved', approved_at=NOW() WHERE id=?");
    $stmt->execute([$id]);
}

if (isset($_POST['reject'])) {
    $id = (int)$_POST['reject'];
    $stmt = $pdo->prepare("UPDATE signups SET status='rejected', rejected_at=NOW() WHERE id=?");
    $stmt->execute([$id]);
}

/* ---- LOAD PENDING ---- */

$stmt = $pdo->query("
    SELECT s.id, s.first_name, s.last_name, s.email, s.status,
           GROUP_CONCAT(sl.leg_number ORDER BY sl.leg_number) as legs
    FROM signups s
    LEFT JOIN signup_legs sl ON s.id = sl.signup_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
");
$signups = $stmt->fetchAll();
?>

<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Panel</title>
<style>
body { font-family:sans-serif; padding:30px; }
.signup { border:1px solid #ccc; padding:12px; margin-bottom:10px; }
button { margin-right:8px; padding:6px 10px; }
.status-approved { color:green; font-weight:700; }
.status-pending { color:orange; font-weight:700; }
.status-rejected { color:red; font-weight:700; }
</style>
</head>
<body>

<h1>Admin Panel</h1>
<p><a href="admin.php?logout=1">Logout</a></p>

<?php foreach ($signups as $s): ?>
<div class="signup">
    <strong><?= htmlspecialchars($s['first_name']) ?> <?= htmlspecialchars($s['last_name']) ?></strong><br>
    Email: <?= htmlspecialchars($s['email']) ?><br>
    Legs: <?= htmlspecialchars($s['legs']) ?><br>
    Status:
    <span class="status-<?= $s['status'] ?>">
        <?= ucfirst($s['status']) ?>
    </span>

    <?php if ($s['status'] === 'pending'): ?>
    <form method="post" style="margin-top:8px;">
        <button name="approve" value="<?= $s['id'] ?>">Approve</button>
        <button name="reject" value="<?= $s['id'] ?>">Reject</button>
    </form>
    <?php endif; ?>
</div>
<?php endforeach; ?>

</body>
</html>
