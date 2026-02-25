<?php
echo "SETUP VERSION: HOST DIAG 2<br>";

$db   = "signup";
$user = "bma_api";
$pass = "YOUR_PASSWORD_HERE"; // replace

$hostsToTry = [
  "localhost",
  "127.0.0.1",
  "mysql",                 // common internal alias
  "mysql8",                // sometimes used
  "mysql.prositehosting.net",
  "mysql-200-l48.mysql.prositehosting.net",
  "213.171.200.13"
];

foreach ($hostsToTry as $host) {
  echo "<br>Trying host: <strong>" . htmlspecialchars($host) . "</strong><br>";
  try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_TIMEOUT => 6,
    ]);
    echo "✅ Connected OK on " . htmlspecialchars($host) . "<br>";
    exit;
  } catch (PDOException $e) {
    echo "❌ Failed on " . htmlspecialchars($host) . ": " . htmlspecialchars($e->getMessage()) . "<br>";
  }
}

echo "<br>Done.";
