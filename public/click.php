<?php
/**
 * Mr. Workout | Click Tracker Engine (PHP)
 * Logs link clicks and redirects to the target destination.
 */

// Define logging path
$logFile = __DIR__ . '/data/clicks_log.csv';

// Capture Metadata
$trackingId = $_GET['id'] ?? 'unknown';
$targetUrl = $_GET['url'] ?? 'https://mrworkout.pro';
$timestamp = date('Y-m-d H:i:s');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'hidden';

// Log the event
if ($trackingId !== 'unknown') {
    $dataDir = __DIR__ . '/data/';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }
    
    $fileHandle = fopen($logFile, 'a');
    if ($fileHandle) {
        fputcsv($fileHandle, [$timestamp, $trackingId, $targetUrl, $ip]);
        fclose($fileHandle);
    }
}

// Redirect to target
header("Location: " . $targetUrl);
exit;
?>
