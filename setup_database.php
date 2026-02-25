<?php

echo "SETUP VERSION: IP HOST TEST<br>";

$host = "213.171.200.13";
$db   = "signup";
$user = "bma_api";
$pass = "Shibboleth2025!"; // put your real password here

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS signups (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            approved_at DATETIME NULL,
            rejected_at DATETIME NULL,
            first_name VARCHAR(80) NOT NULL,
            last_name VARCHAR(80) NOT NULL,
            email VARCHAR(190) NOT NULL,
            mobile VARCHAR(40) NOT NULL,
            emergency_name VARCHAR(120) NOT NULL,
            emergency_phone VARCHAR(40) NOT NULL,
            safety_accepted TINYINT(1) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS signup_legs (
            signup_id BIGINT UNSIGNED NOT NULL,
            leg_number INT NOT NULL,
            PRIMARY KEY (signup_id, leg_number),
            FOREIGN KEY (signup_id) REFERENCES signups(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    echo "Database tables created successfully.";

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage();
}
