<?php
echo "SETUP VERSION: FINAL CONNECT TEST<br>";

$host = "mysql-200-148.mysql.prositehosting.net";
$db   = "signup";
$user = "bma_api";
$pass = "WestCoast2025!"; // replace

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 8,
        ]
    );

    echo "✅ Connected successfully to $host<br>";
    echo "All good.";

} catch (PDOException $e) {
    echo "❌ Database error: " . htmlspecialchars($e->getMessage());
}
