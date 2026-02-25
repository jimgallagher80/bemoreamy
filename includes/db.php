<?php
// /includes/db.php

$DB_HOST = "mysql-200-148.mysql.prositehosting.net";
$DB_NAME = "signup";
$DB_USER = "bma_api";
$DB_PASS = "WestCoast2025!"; // <-- replace with your real password

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    // Log the real error server-side
    error_log("DB connection failed: " . $e->getMessage());

    // Throw a generic exception so callers can respond appropriately
    throw new Exception("DB connection failed");
}
