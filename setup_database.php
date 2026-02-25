<?php
// setup_database.php
// Temporary test file — delete after confirming connection

echo "SETUP VERSION: FINAL TEST<br>";

$host = "mysql-200-l48.mysql.prositehosting.net";
$db   = "signup";
$user = "bma_api";
$pass = "WestCoast2025!";  // <-- put your real password here

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]
    );

    echo "✅ Connection successful!";

} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage();
}
