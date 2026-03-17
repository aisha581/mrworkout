<?php
/**
 * Mr. Workout | Scout Pixel Engine (PHP)
 * Transparent 1x1 tracking pixel to log email open events.
 */

// Define logging path
$logFile = __DIR__ . '/data/opens_log.csv';

// Capture Metadata
$trackingId = $_GET['id'] ?? 'unknown';
$timestamp = date('Y-m-d H:i:s');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'hidden';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'none';

// Log the event
if ($trackingId !== 'unknown') {
    $dataDir = __DIR__ . '/data/';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }
    
    $fileHandle = fopen($logFile, 'a');
    if ($fileHandle) {
        fputcsv($fileHandle, [$timestamp, $trackingId, $ip, $userAgent]);
        fclose($fileHandle);
    }
}

// Serve a transparent 1x1 GIF
header('Content-Type: image/gif');
header('Cache-Control: private, no-store, no-cache, must-revalidate');
echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
exit;
?>
