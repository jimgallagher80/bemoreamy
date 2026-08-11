CREATE TABLE registrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL,
    age TINYINT UNSIGNED NOT NULL,
    postcode_area VARCHAR(8) NOT NULL,
    institution VARCHAR(160) NOT NULL,
    marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
    consent_text_version VARCHAR(30) DEFAULT NULL,
    consent_timestamp DATETIME DEFAULT NULL,
    privacy_notice_version VARCHAR(30) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'landing_page',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_registrations_email (email),
    KEY idx_registrations_institution (institution),
    KEY idx_registrations_postcode_area (postcode_area),
    KEY idx_registrations_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
