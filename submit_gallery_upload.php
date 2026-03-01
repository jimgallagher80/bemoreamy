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

// Accept either the old single input name (photo) or the new multiple input name (photos[])
$files = null;

if (isset($_FILES['photos']) && is_array($_FILES['photos']['name'])) {
    // Multiple upload
    $files = $_FILES['photos'];
} elseif (isset($_FILES['photo'])) {
    // Single upload (backwards compatible)
    $files = [
        'name' => [$_FILES['photo']['name'] ?? ''],
        'type' => [$_FILES['photo']['type'] ?? ''],
        'tmp_name' => [$_FILES['photo']['tmp_name'] ?? ''],
        'error' => [$_FILES['photo']['error'] ?? UPLOAD_ERR_NO_FILE],
        'size' => [$_FILES['photo']['size'] ?? 0],
    ];
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please choose a photo to upload.']);
    exit;
}

$count = count($files['name']);
if ($count < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please choose a photo to upload.']);
    exit;
}
if ($count > 5) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'You can upload up to 5 photos per submission.']);
    exit;
}

// Ensure directories exist
$fullDir = __DIR__ . '/gallery';
$thumbDir = __DIR__ . '/gallery/thumbs';
ensureDir($fullDir);
ensureDir($thumbDir);

$inserted = 0;
$savedFiles = []; // for rollback if DB fails
$captionForDb = ($caption === '') ? null : $caption;

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO gallery_photos
        (filename, thumb_filename, caption, uploader_name, uploader_email, consent_website, consent_media, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    ");

    for ($i = 0; $i < $count; $i++) {
        $err = (int)$files['error'][$i];
        if ($err !== UPLOAD_ERR_OK) {
            throw new Exception('Upload failed. Please try again.');
        }

        $size = (int)$files['size'][$i];

        // Max 10MB per photo
        if ($size > 10 * 1024 * 1024) {
            throw new Exception('One of the files is too large. Maximum size is 10MB per photo.');
        }

        $tmpPath = (string)$files['tmp_name'][$i];
        if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
            throw new Exception('Upload failed. Please try again.');
        }

        // Determine MIME safely
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? finfo_file($finfo, $tmpPath) : '';
        if ($finfo) finfo_close($finfo);

        $ext = getExtFromMime($mime);
        if ($ext === '') {
            throw new Exception('Unsupported file type. Please upload JPG, PNG, or WebP images only.');
        }

        $filename = safeRandomName($ext);
        $thumbFilename = safeRandomName($ext);

        $fullPath = $fullDir . '/' . $filename;
        $thumbPath = $thumbDir . '/' . $thumbFilename;

        // Move upload into place
        if (!@move_uploaded_file($tmpPath, $fullPath)) {
            throw new Exception('Could not save the uploaded file.');
        }

        // Create thumbnail
        if (!makeThumbnail($fullPath, $thumbPath, $ext, 900)) {
            @unlink($fullPath);
            throw new Exception('Could not create thumbnail.');
        }

        // Store in DB (pending)
        $stmt->execute([
            $filename,
            $thumbFilename,
            $captionForDb,
            $name,
            $email,
            $consentWebsite,
            $consentMedia
        ]);

        $savedFiles[] = [$fullPath, $thumbPath];
        $inserted++;
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => ($inserted === 1)
            ? 'Thanks — your photo has been submitted and is pending approval.'
            : "Thanks — your {$inserted} photos have been submitted and are pending approval."
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();

    // Cleanup any files saved before failure
    foreach ($savedFiles as $pair) {
        @unlink($pair[0]);
        @unlink($pair[1]);
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
