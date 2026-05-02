<?php
session_start();
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/baton_lib.php';

if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: admin.php');
    exit;
}

function h($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function randomBatonToken($len = 48) {
    return bin2hex(random_bytes((int)($len / 2)));
}

function ensureTeamDetailsTokenForBaton(PDO $pdo, int $signupId): string {
    $q = $pdo->prepare("SELECT team_details_token FROM signups WHERE id = ?");
    $q->execute([$signupId]);
    $existing = $q->fetchColumn();
    if ($existing) return (string)$existing;

    for ($i = 0; $i < 5; $i++) {
        $token = randomBatonToken(48);
        try {
            $u = $pdo->prepare("
                UPDATE signups
                SET team_details_token = ?, team_details_token_created_at = NOW()
                WHERE id = ? AND (team_details_token IS NULL OR team_details_token = '')
            ");
            $u->execute([$token, $signupId]);

            $q->execute([$signupId]);
            $final = $q->fetchColumn();
            if ($final) return (string)$final;
        } catch (Throwable $e) {
            // Very unlikely token collision. Try again.
        }
    }

    $q->execute([$signupId]);
    $final = $q->fetchColumn();
    return $final ? (string)$final : '';
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'www.bemoreamy.com';
$baseUrl = $scheme . '://' . $host;

$notice = '';
$error = '';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['generate_missing_tokens'])) {
        $idsStmt = $pdo->query("
            SELECT DISTINCT s.id
            FROM signups s
            JOIN signup_legs sl ON sl.signup_id = s.id
            WHERE sl.status = 'confirmed'
              AND (s.team_details_token IS NULL OR s.team_details_token = '')
            ORDER BY s.id ASC
        ");
        $ids = array_map('intval', $idsStmt->fetchAll(PDO::FETCH_COLUMN));
        $created = 0;
        foreach ($ids as $signupId) {
            $token = ensureTeamDetailsTokenForBaton($pdo, $signupId);
            if ($token !== '') $created++;
        }
        $notice = "Generated missing tokens for {$created} confirmed team link(s).";
    }

    $stmt = $pdo->query("
        SELECT
            s.id,
            s.team_name,
            s.team_leader_first_name,
            s.team_leader_surname,
            s.email,
            s.team_details_token,
            GROUP_CONCAT(sl.leg_number ORDER BY sl.leg_number ASC SEPARATOR ',') AS legs
        FROM signups s
        JOIN signup_legs sl ON sl.signup_id = s.id
        WHERE sl.status = 'confirmed'
        GROUP BY
            s.id,
            s.team_name,
            s.team_leader_first_name,
            s.team_leader_surname,
            s.email,
            s.team_details_token
        ORDER BY MIN(sl.leg_number) ASC, s.team_leader_surname ASC, s.team_leader_first_name ASC
    ");
    $teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    error_log('admin_baton_links.php error: ' . $e->getMessage());
    $teams = [];
    $error = 'Unable to load baton links.';
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Be More Amy - Baton Links</title>
  <style>
    :root{--bg:#f6f2e8;--panel:#fff;--ink:#111;--muted:#666;--border:#ddd;--gold:#f7d37a;--orange:#f4a261;--green:#e4f6e8;--red:#ffe2e2}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4}
    header{background:var(--gold);border-bottom:1px solid rgba(0,0,0,.12);padding:18px 16px;text-align:center}
    header img{width:76px;height:76px;object-fit:contain;display:block;margin:0 auto 6px}
    h1{margin:0;font-size:24px;line-height:1.1}
    main{max-width:1100px;margin:0 auto;padding:18px 14px 36px}
    .top-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:14px}
    .btn{appearance:none;border:2px solid #111;border-radius:12px;background:var(--gold);color:#111;text-decoration:none;padding:10px 12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
    .btn.secondary{background:#fff}
    .btn.small{font-size:13px;padding:7px 9px;border-radius:10px}
    .notice,.error{border-radius:14px;padding:10px 12px;margin-bottom:12px;font-weight:700}
    .notice{background:var(--green);border:1px solid #a6d8ae}.error{background:var(--red);border:1px solid #e5a5a5}
    .card{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:14px;box-shadow:0 10px 28px rgba(0,0,0,.08)}
    .summary{color:var(--muted);font-size:14px;margin:0 0 12px}
    table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}
    th,td{border-bottom:1px solid var(--border);padding:10px;text-align:left;vertical-align:top;font-size:14px}
    th{background:#fbf6e6;font-size:13px;text-transform:uppercase;letter-spacing:.02em}
    tr:last-child td{border-bottom:none}
    .team-name{font-weight:850}.muted{color:var(--muted);font-size:13px}.link-cell{word-break:break-all;min-width:280px}.missing{color:#9a3600;font-weight:800}
    .copy-status{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 14px;border-radius:999px;font-weight:800;display:none;z-index:10}.copy-status.show{display:block}
    @media(max-width:760px){table,thead,tbody,tr,th,td{display:block}thead{display:none}tr{border:1px solid var(--border);border-radius:14px;margin-bottom:10px;overflow:hidden}td{border-bottom:1px solid var(--border)}td::before{content:attr(data-label);display:block;font-size:12px;text-transform:uppercase;letter-spacing:.02em;color:var(--muted);font-weight:800;margin-bottom:3px}.link-cell{min-width:0}}
  </style>
</head>
<body>
<header>
  <img src="BMAlogo.svg" alt="Be More Amy logo" />
  <h1>Baton Links</h1>
</header>
<main>
  <div class="top-actions">
    <div>
      <a class="btn secondary" href="admin.php">Back to Admin</a>
      <a class="btn secondary" href="tracker.html" target="_blank" rel="noopener">Open Tracker</a>
    </div>
    <form method="post">
      <button class="btn" type="submit" name="generate_missing_tokens" value="1">Generate Missing Tokens</button>
    </form>
  </div>

  <?php if ($notice): ?><div class="notice"><?php echo h($notice); ?></div><?php endif; ?>
  <?php if ($error): ?><div class="error"><?php echo h($error); ?></div><?php endif; ?>

  <section class="card">
    <p class="summary">
      This page lists the baton update link for every confirmed team. If a team has not provided a team name, it displays as the team leader’s name followed by “’s Team”, matching the confirmed teams page.
    </p>

    <table>
      <thead>
        <tr>
          <th>Legs</th>
          <th>Team</th>
          <th>Team Leader Email</th>
          <th>Baton Link</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
      <?php if (!$teams): ?>
        <tr><td colspan="5">No confirmed teams found.</td></tr>
      <?php else: ?>
        <?php foreach ($teams as $team): ?>
          <?php
            $displayName = baton_team_name($team);
            $token = trim((string)($team['team_details_token'] ?? ''));
            $link = $token !== '' ? $baseUrl . '/baton.php?token=' . rawurlencode($token) : '';
            $legs = array_filter(array_map('trim', explode(',', (string)($team['legs'] ?? ''))));
            $legText = '';
            if (count($legs) === 1) {
                $legText = 'Leg ' . $legs[0];
            } elseif (count($legs) > 1) {
                $legText = 'Legs ' . implode(', ', $legs);
            }
          ?>
          <tr>
            <td data-label="Legs"><?php echo h($legText); ?></td>
            <td data-label="Team"><div class="team-name"><?php echo h($displayName); ?></div></td>
            <td data-label="Team Leader Email"><span class="muted"><?php echo h($team['email'] ?? ''); ?></span></td>
            <td data-label="Baton Link" class="link-cell">
              <?php if ($link): ?>
                <a href="<?php echo h($link); ?>" target="_blank" rel="noopener"><?php echo h($link); ?></a>
              <?php else: ?>
                <span class="missing">No token yet. Use “Generate Missing Tokens”.</span>
              <?php endif; ?>
            </td>
            <td data-label="Action">
              <?php if ($link): ?>
                <button class="btn small copy-link" type="button" data-link="<?php echo h($link); ?>">Copy</button>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
      <?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<div id="copyStatus" class="copy-status">Copied</div>
<script>
(function(){
  const status = document.getElementById('copyStatus');
  function showCopied(){
    status.classList.add('show');
    window.clearTimeout(showCopied._t);
    showCopied._t = window.setTimeout(() => status.classList.remove('show'), 1200);
  }
  document.querySelectorAll('.copy-link').forEach(btn => {
    btn.addEventListener('click', async () => {
      const link = btn.getAttribute('data-link') || '';
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(link);
        } else {
          const ta = document.createElement('textarea');
          ta.value = link;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        showCopied();
      } catch (e) {
        window.prompt('Copy this baton link:', link);
      }
    });
  });
})();
</script>
</body>
</html>
