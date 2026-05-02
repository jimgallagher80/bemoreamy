<?php
$token = isset($_GET['token']) ? htmlspecialchars($_GET['token'], ENT_QUOTES, 'UTF-8') : '';
?>
<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Be More Amy — Baton Update</title>
  <style>
    :root{--bg:#0b0b0b;--text:#f2f2f2;--muted:#b7b7b7;--panel:#151515;--border:rgba(255,255,255,.12);--orange:#ff7a00;--bmaHeader:#FAEBC8;--safeTop:env(safe-area-inset-top);--safeBottom:env(safe-area-inset-bottom)}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;-webkit-font-smoothing:antialiased}.topbar{padding:calc(14px + var(--safeTop)) 16px 14px;background:var(--bmaHeader);color:#000;text-align:center;border-bottom:1px solid rgba(0,0,0,.10)}.topbar img{width:82px;height:82px;object-fit:contain;display:block;margin:0 auto 4px}.topbar h1{font-size:20px;line-height:1.1;margin:0;font-weight:850}.topbar p{margin:4px 0 0;font-size:14px;color:#000}.wrap{max-width:760px;margin:0 auto;padding:16px 14px calc(28px + var(--safeBottom))}.card{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:0 12px 30px rgba(0,0,0,.25)}h2{font-size:18px;margin:0 0 6px}p{color:var(--muted);font-size:14px;line-height:1.35;margin:6px 0}.leg-card{display:grid;gap:10px}.leg-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.leg-title{font-size:16px;font-weight:850}.leg-route{font-size:14px;color:var(--muted);margin-top:2px}.buttons{display:grid;grid-template-columns:1fr;gap:8px}.btn{appearance:none;border:2px solid #000;background:var(--bmaHeader);color:#000;border-radius:16px;padding:14px 12px;font-size:16px;font-weight:850;cursor:pointer}.btn.secondary{background:#fff}.btn.finish{background:var(--orange)}.btn:disabled{opacity:.55;cursor:not-allowed}.events{border-top:1px solid var(--border);padding-top:8px}.event-row{font-size:13px;color:var(--muted);padding:4px 0}.status{position:sticky;bottom:calc(8px + var(--safeBottom));z-index:20;background:#fff;color:#111;border:2px solid #000;border-radius:16px;padding:10px 12px;font-weight:750;display:none}.status.show{display:block}.error{background:#ffe0e0}.small{font-size:12px}.note{width:100%;min-height:44px;border-radius:14px;border:1px solid var(--border);padding:10px;background:#0d0d0d;color:var(--text);font:inherit;resize:vertical}@media(min-width:680px){.buttons{grid-template-columns:1fr 1fr 1fr}.topbar img{width:92px;height:92px}}
  </style>
</head>
<body>
  <header class="topbar">
    <img src="BMAlogo.svg" alt="Be More Amy logo" />
    <h1>Virtual Baton Update</h1>
    <p>SWCP Relay Challenge · 16th to 23rd May 2026</p>
  </header>

  <main class="wrap">
    <section class="card">
      <h2 id="teamTitle">Loading team link…</h2>
      <p id="teamIntro">This page is for recording start, progress and finish updates for your confirmed relay leg or legs.</p>
      <p class="small">GPS will be used if your phone allows it. Start and Finish always use the planned leg start and finish points on the map.</p>
    </section>

    <section id="legs"></section>
    <div id="status" class="status" role="status" aria-live="polite"></div>
  </main>

  <script>
    window.BATON_TOKEN = <?php echo json_encode($token); ?>;
  </script>
  <script src="baton_update.js"></script>
</body>
</html>
