<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/includes/db.php';

    $stmt = $pdo->query("
        SELECT id, filename, thumb_filename, caption, uploaded_at
        FROM gallery_photos
        WHERE status = 'approved'
        ORDER BY uploaded_at DESC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'id' => (int)$r['id'],
            'image_url' => '/gallery/' . $r['filename'],
            'thumb_url' => '/gallery/thumbs/' . $r['thumb_filename'],
            'caption' => ($r['caption'] === null) ? '' : (string)$r['caption'],
            'uploaded_at' => (string)$r['uploaded_at'],
        ];
    }

    echo json_encode(['success' => true, 'photos' => $out]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to load gallery photos']);
}
