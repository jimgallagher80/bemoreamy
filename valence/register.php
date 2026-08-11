<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(500, ['ok' => false, 'message' => 'The registration service is not configured yet.']);
}

$config = require $configFile;

// Simple same-session rate limiting. This complements, but does not replace,
// any server-level/WAF rate limiting you may add later.
$now = time();
$lastSubmit = (int)($_SESSION['last_registration_attempt'] ?? 0);
if ($lastSubmit && ($now - $lastSubmit) < 4) {
    respond(429, ['ok' => false, 'message' => 'Please wait a moment and try again.']);
}
$_SESSION['last_registration_attempt'] = $now;

$csrf = (string)($_POST['csrf_token'] ?? '');
if (!$csrf || !hash_equals((string)($_SESSION['csrf_token'] ?? ''), $csrf)) {
    respond(400, ['ok' => false, 'message' => 'Your session has expired. Please refresh the page and try again.']);
}

// Honeypot: genuine users never fill this field.
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(200, ['ok' => true, 'message' => 'You’re in. We’ll let you know when Valence is ready.']);
}

$firstName = trim((string)($_POST['first_name'] ?? ''));
$email = strtolower(trim((string)($_POST['email'] ?? '')));
$ageRaw = trim((string)($_POST['age'] ?? ''));
$postcodeArea = strtoupper(trim((string)($_POST['postcode_area'] ?? '')));
$institution = trim((string)($_POST['institution'] ?? ''));
$otherInstitution = trim((string)($_POST['other_institution'] ?? ''));
$marketingConsent = isset($_POST['marketing_consent']) && $_POST['marketing_consent'] === '1';

if ($firstName === '' || mb_strlen($firstName) > 80) {
    respond(422, ['ok' => false, 'field' => 'first_name', 'message' => 'Please enter your first name.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254) {
    respond(422, ['ok' => false, 'field' => 'email', 'message' => 'Please enter a valid email address.']);
}

if ($ageRaw === '' || !ctype_digit($ageRaw)) {
    respond(422, ['ok' => false, 'field' => 'age', 'message' => 'Please enter your age.']);
}
$age = (int)$ageRaw;
if ($age < 18) {
    respond(422, ['ok' => false, 'field' => 'age', 'message' => 'You must be 18 or over to register your interest in Valence.']);
}
if ($age > 120) {
    respond(422, ['ok' => false, 'field' => 'age', 'message' => 'Please check the age you entered.']);
}

// UK outward postcode only, e.g. EH3, G12, KY11, SW1A.
$postcodeArea = preg_replace('/\s+/', '', $postcodeArea) ?? '';
if (!preg_match('/^[A-Z]{1,2}[0-9][0-9A-Z]?$/', $postcodeArea)) {
    respond(422, ['ok' => false, 'field' => 'postcode_area', 'message' => 'Please enter the first part of your postcode, for example EH3 or G12.']);
}

if ($institution === '') {
    respond(422, ['ok' => false, 'field' => 'institution', 'message' => 'Please select your university or college.']);
}
if ($institution === 'Other') {
    if ($otherInstitution === '' || mb_strlen($otherInstitution) > 160) {
        respond(422, ['ok' => false, 'field' => 'other_institution', 'message' => 'Please tell us the name of your institution.']);
    }
    $institution = $otherInstitution;
}
if (mb_strlen($institution) > 160) {
    respond(422, ['ok' => false, 'field' => 'institution', 'message' => 'Please check the institution name.']);
}

try {
    $db = $config['db'];
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $db['host'], $db['name'], $db['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $stmt = $pdo->prepare(
        'INSERT INTO registrations
        (first_name, email, age, postcode_area, institution, marketing_consent, consent_text_version, consent_timestamp, privacy_notice_version, source)
        VALUES
        (:first_name, :email, :age, :postcode_area, :institution, :marketing_consent, :consent_text_version, :consent_timestamp, :privacy_notice_version, :source)'
    );

    $stmt->execute([
        ':first_name' => $firstName,
        ':email' => $email,
        ':age' => $age,
        ':postcode_area' => $postcodeArea,
        ':institution' => $institution,
        ':marketing_consent' => $marketingConsent ? 1 : 0,
        ':consent_text_version' => $marketingConsent ? 'marketing-v1-2026-08' : null,
        ':consent_timestamp' => $marketingConsent ? date('Y-m-d H:i:s') : null,
        ':privacy_notice_version' => 'privacy-v1-2026-08',
        ':source' => 'landing_page',
    ]);

    respond(201, ['ok' => true, 'message' => 'You’re in. We’ll let you know when Valence is ready.']);
} catch (PDOException $e) {
    // MySQL duplicate entry error. Do not reveal database details to the browser.
    if ((string)$e->getCode() === '23000') {
        respond(200, ['ok' => true, 'message' => 'You’re already registered — no need to do it again.']);
    }
    error_log('Valence registration error: ' . $e->getMessage());
    respond(500, ['ok' => false, 'message' => 'Something went wrong. Please try again shortly.']);
}
