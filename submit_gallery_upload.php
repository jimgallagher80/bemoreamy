<?php
header('Content-Type: application/json');

require_once __DIR__ . '/includes/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

function clean($v) {
    return trim((string)$v);
}

function ensureDir($path) {
    if (!is_dir($path)) {
        @mkdir($path, 0755, true);
    }
}

function getExtFromMime($mime) {
    $mime = strtolower((string)$mime);
    if ($mime === 'image/jpeg' || $mime === 'image/jpg') return 'jpg';
    if ($mime === 'image/png') return 'png';
    if ($mime === 'image/webp') return 'webp';
    return '';
}

function safeRandomName($ext) {
    return bin2hex(random_bytes(16)) . '.' . $ext;
}

function loadImageResource($path, $ext) {
    if ($ext === 'jpg' || $ext === 'jpeg') return @imagecreatefromjpeg($path);
    if ($ext === 'png') return @imagecreatefrompng($path);
    if ($ext === 'webp') return function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false;
    return false;
}

function saveImageResource($im, $path, $ext) {
    if ($ext === 'jpg' || $ext === 'jpeg') return @imagejpeg($im, $path, 90);
    if ($ext === 'png') return @imagepng($im, $path, 6);
    if ($ext === 'webp') return function_exists('imagewebp') ? @imagewebp($im, $path, 85) : false;
    return false;
}

function makeThumbnail($srcPath, $dstPath, $ext, $maxDim = 900) {
    $im = loadImageResource($srcPath, $ext);
    if (!$im) return false;

    $w = imagesx($im);
    $h = imagesy($im);
    if ($w <= 0 || $h <= 0) {
        imagedestroy($im);
        return false;
    }

    $scale = 1.0;
    $largest = max($w, $h);
    if ($largest > $maxDim) {
        $scale = $maxDim / $largest;
    }

    $newW = (int)round($w * $scale);
    $newH = (int)round($h * $scale);

    if ($newW < 1) $newW = 1;
    if ($newH < 1) $newH = 1;

    $thumb = imagecreatetruecolor($newW, $newH);

    // Preserve transparency for PNG/WebP
    if ($ext === 'png') {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
        $transparent = imagecolorallocatealpha($thumb, 0, 0, 0, 127);
        imagefilledrectangle($thumb, 0, 0, $newW, $newH, $transparent);
    }
    if ($ext === 'webp') {
        imagealphablending($thumb, true);
        imagesavealpha($thumb, true);
    }

    imagecopyresampled($thumb, $im, 0, 0, 0, 0, $newW, $newH, $w, $h);

    $ok = saveImageResource($thumb, $dstPath, $ext);

    imagedestroy($thumb);
    imagedestroy($im);

    return $ok;
}

/* ---- Inputs ---- */

$name = clean($_POST['uploader_name'] ?? '');
$email = clean($_POST['uploader_email'] ?? '');
$caption = clean($_POST['caption'] ?? '');

$consentWebsite = isset($_POST['consent_website']) ? 1 : 0;
$consentMedia = isset($_POST['consent_media']) ? 1 : 0;

if ($name === '' || $email === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide your name and email address.']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}
if ($consentWebsite !== 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'You must confirm you are happy for the photo to be posted on the website.']);
    exit;
}

if (!isset($_FILES['photo'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please choose a photo to upload.']);
    exit;
}

$f = $_FILES['photo'];

if (!is_array($f) || $f['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Upload failed. Please try again.']);
    exit;
}

// Max 10MB
if ((int)$f['size'] > 10 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File is too large. Maximum size is 10MB.']);
    exit;
}

$tmpPath = (string)$f['tmp_name'];

// Determine MIME safely
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = $finfo ? finfo_file($finfo, $tmpPath) : '';
if ($finfo) finfo_close($finfo);

$ext = getExtFromMime($mime);
if ($ext === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unsupported file type. Please upload a JPG, PNG, or WebP image.']);
    exit;
}

// Ensure directories exist
$fullDir = __DIR__ . '/gallery';
$thumbDir = __DIR__ . '/gallery/thumbs';
ensureDir($fullDir);
ensureDir($thumbDir);

$filename = safeRandomName($ext);
$thumbFilename = safeRandomName($ext);

$fullPath = $fullDir . '/' . $filename;
$thumbPath = $thumbDir . '/' . $thumbFilename;

// Move upload into place
if (!@move_uploaded_file($tmpPath, $fullPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not save the uploaded file.']);
    exit;
}

// Create thumbnail
if (!makeThumbnail($fullPath, $thumbPath, $ext, 900)) {
    @unlink($fullPath);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not create thumbnail.']);
    exit;
}

// Store in DB (pending)
try {
    $stmt = $pdo->prepare("
        INSERT INTO gallery_photos
        (filename, thumb_filename, caption, uploader_name, uploader_email, consent_website, consent_media, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([
        $filename,
        $thumbFilename,
        ($caption === '') ? null : $caption,
        $name,
        $email,
        $consentWebsite,
        $consentMedia
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Thanks — your photo has been submitted and is pending approval.'
    ]);
} catch (Exception $e) {
    // Rollback file save if DB fails
    @unlink($fullPath);
    @unlink($thumbPath);
    error_log('Gallery upload DB insert failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error. Please try again.']);
}
