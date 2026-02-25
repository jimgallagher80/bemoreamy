<?php
$host = "mysql-200-148.mysql.prositehosting.net";
$db   = "signup";
$user = "bma_api";
$pass = "YOUR_PASSWORD_HERE";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]
    );
} catch (PDOException $e) {
    die("Database connection failed.");
}
