<?php
/**
 * Mr. Workout | Vector Intake Protocol (PHP)
 * Backend storage for biomechanical athlete footage.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Define storage directory
$dataDir = __DIR__ . '/data/pending_audits/';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $coachName = $_POST['coachName'] ?? 'unknown';
    $athleteId = $_POST['athleteId'] ?? 'unknown';
    
    if (isset($_FILES['video'])) {
        $file = $_FILES['video'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        
        // Allowed formats
        $allowed = ['mp4', 'mov', 'webm'];
        if (!in_array(strtolower($ext), $allowed)) {
            http_response_code(400);
            echo json_encode(["error" => "Unsupported file format"]);
            exit;
        }

        // Sanitize and generate unique filename
        $sanitizedCoach = preg_replace('/[^a-z0-9]/i', '_', strtolower($coachName));
        $sanitizedAthlete = preg_replace('/[^a-z0-9]/i', '_', strtolower($athleteId));
        $timestamp = time();
        $fileName = "{$sanitizedCoach}_{$sanitizedAthlete}_{$timestamp}.{$ext}";
        $targetPath = $dataDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Movement Captured. Mr. Workout is analyzing the vectors.",
                "file" => $fileName
            ]);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Intake System Failure: Upload blocked."]);
            exit;
        }
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Missing payload: video vector required."]);
        exit;
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Protocol Error: POST required."]);
}
?>
