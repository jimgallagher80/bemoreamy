<?php
// setup_database.php
// TEMPORARY DIAGNOSTIC FILE — delete it once we've confirmed the correct DB host.

echo "SETUP VERSION: HOST DIAG<br>";

$db   = "signup";
$user = "bma_api";
$pass = "Shibboleth2025!"; // <-- replace with your real password

$hostsToTry = [
  "localhost",
  "127.0.0.1",
  "mysql-200-l48.mysql.prositehosting.net",
  "213.171.200.13"
];

foreach ($hostsToTry as $host) {
  echo "<br>Trying host: <strong>" . htmlspecialchars($host) . "</strong><br>";
  try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_TIMEOUT => 5,
    ]);
    echo "✅ Connected OK on " . htmlspecialchars($host) . "<br>";
    exit;
  } catch (PDOException $e) {
    echo "❌ Failed on " . htmlspecialchars($host) . ": " . htmlspecialchars($e->getMessage()) . "<br>";
  }
}

echo "<br>Done.";
