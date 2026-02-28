<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
  exit;
}

function clean($value) {
  return trim(str_replace(["\r", "\n"], " ", (string)$value));
}

$name    = clean($_POST['name'] ?? '');
$email   = clean($_POST['email'] ?? '');
$subject = clean($_POST['subject'] ?? '');
$message = trim((string)($_POST['message'] ?? ''));
$consent = isset($_POST['consent']);

if ($name === '' || $email === '' || $subject === '' || $message === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Please complete all fields.']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Please enter a valid email address.']);
  exit;
}

if (!$consent) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Please tick the confirmation box before submitting.']);
  exit;
}

// Recipient (kept server-side so it is not visible in public page source)
$to = "hello@bemoreamy.com";

$fullSubject = "[Be More Amy] " . $subject;

$bodyLines = [
  "New message from the Be More Amy website contact form",
  "",
  "Name: " . $name,
  "Email: " . $email,
  "IP: " . ($_SERVER['REMOTE_ADDR'] ?? ''),
  "",
  "Message:",
  $message
];

$body = implode("\n", $bodyLines);

$headers  = "From: Be More Amy <noreply@bemoreamy.com>\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = mail($to, $fullSubject, $body, $headers);

if (!$sent) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Unable to send message right now. Please try again later.']);
  exit;
}

echo json_encode(['ok' => true]);
