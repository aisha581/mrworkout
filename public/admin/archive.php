<?php
/**
 * Mr. Workout | Email Archive Browser
 * High-fidelity review of dispatched outreach vectors.
 */

$secret_key = "savage_scout_2026";
if (($_GET['key'] ?? '') !== $secret_key) {
    die("ACCESS DENIED");
}

$archiveDir = __DIR__ . '/../logs/sent_emails/';
$files = is_dir($archiveDir) ? array_diff(scandir($archiveDir), ['.', '..']) : [];

// Sort by date desc
usort($files, function($a, $b) use ($archiveDir) {
    return filemtime($archiveDir . $b) - filemtime($archiveDir . $a);
});
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Email Archive | Mr. Workout</title>
    <style>
        body { background: #050505; color: #fff; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; }
        h1 { font-size: 20px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; }
        .file-list { margin-top: 40px; }
        .file-link { 
            display: block; 
            padding: 15px; 
            background: rgba(255,255,255,0.02); 
            border: 1px solid rgba(255,255,255,0.05);
            margin-bottom: 10px;
            color: #888;
            text-decoration: none;
            font-size: 13px;
            border-radius: 10px;
        }
        .file-link:hover { border-color: #00ffff; color: #fff; }
        .file-link span { color: #444; float: right; font-size: 10px; }
    </style>
</head>
<body>
    <h1>Sent Email Archive</h1>
    <div class="file-list">
        <?php foreach ($files as $file): ?>
            <a href="/logs/sent_emails/<?php echo $file; ?>" target="_blank" class="file-link">
                <?php echo $file; ?>
                <span><?php echo date("Y-m-d H:i", filemtime($archiveDir . $file)); ?></span>
            </a>
        <?php endforeach; ?>
        <?php if (empty($files)): ?>
            <p style="color: #333;">NO VECTORS ARCHIVED.</p>
        <?php endif; ?>
    </div>
</body>
</html>
