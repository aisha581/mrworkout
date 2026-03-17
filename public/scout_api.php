<?php
/**
 * Mr. Workout | Scout API (PHP)
 * Serves aggregated campaign metrics and vector status to the dashboard.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$campaignLog = __DIR__ . '/campaign_log.csv';
$opensLog = __DIR__ . '/data/opens_log.csv';
$uploadsDir = __DIR__ . '/data/uploads/';

$data = [
    "metrics" => [
        "sent" => 0,
        "opened" => 0,
        "uploads" => 0
    ],
    "activity" => [],
    "vectors" => []
];

// 1. Process Campaign Log (Sent)
if (file_exists($campaignLog)) {
    if (($handle = fopen($campaignLog, "r")) !== FALSE) {
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== FALSE) {
            if ($row[4] === "SENT") {
                $data["metrics"]["sent"]++;
            }
            // Add to activity
            $data["activity"][] = [
                "time" => $row[0],
                "username" => $row[2],
                "status" => $row[4],
                "email" => $row[3]
            ];
        }
        fclose($handle);
    }
}

// 2. Process Opens Log
if (file_exists($opensLog)) {
    $uniqueOpens = [];
    if (($handle = fopen($opensLog, "r")) !== FALSE) {
        while (($row = fgetcsv($handle)) !== FALSE) {
            $uniqueOpens[$row[1]] = true; // trackingId
            $data["activity"][] = [
                "time" => $row[0],
                "username" => "VECTOR_OPEN",
                "status" => "OPENED",
                "email" => $row[1]
            ];
        }
        fclose($handle);
    }
    $data["metrics"]["opened"] = count($uniqueOpens);
}

// 3. Process Uploads
if (is_dir($uploadsDir)) {
    $files = array_diff(scandir($uploadsDir), ['.', '..']);
    $data["metrics"]["uploads"] = count($files);
    foreach ($files as $file) {
        $data["vectors"][] = [
            "name" => $file,
            "time" => date("Y-m-d H:i:s", filemtime($uploadsDir . $file))
        ];
    }
}

// Sort activity by time desc
usort($data["activity"], function($a, $b) {
    return strtotime($b["time"]) - strtotime($a["time"]);
});

echo json_encode($data);
?>
