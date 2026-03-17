<?php
/**
 * Mr. Workout | Command Hub Gateway
 * Secure entry point for project management and intelligence.
 */

$secret_key = "savage_scout_2026";
$provided_key = $_GET['key'] ?? '';

if ($provided_key !== $secret_key) {
    header('HTTP/1.0 403 Forbidden');
    echo "<h1>MISSION DENIED | ACCESS RESTRICTED</h1>";
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Command Hub | Mr. Workout</title>
    <style>
        :root {
            --neon-green: #39ff14;
            --neon-cyan: #00ffff;
            --dark-bg: #050505;
        }
        body {
            background-color: var(--dark-bg);
            color: #fff;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }
        .hub-container {
            text-align: center;
            max-width: 800px;
            width: 90%;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 10px;
            text-transform: uppercase;
            margin-bottom: 50px;
            background: linear-gradient(135deg, #fff, #444);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .nav-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .nav-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 40px;
            border-radius: 24px;
            text-decoration: none;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .nav-card:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--neon-cyan);
            transform: translateY(-5px);
        }
        .nav-card h3 {
            margin: 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #888;
        }
        .nav-card p {
            margin: 10px 0 0 0;
            font-size: 10px;
            color: #444;
            letter-spacing: 1px;
        }
        .nav-card.active h3 { color: var(--neon-cyan); }
        .nav-card.active:hover { border-color: var(--neon-green); }
        .nav-card.active:hover h3 { color: var(--neon-green); }
        
        .footer {
            margin-top: 60px;
            font-size: 10px;
            color: #333;
            letter-spacing: 5px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="hub-container">
        <div class="header">
            <h1>Command Hub</h1>
        </div>
        
        <div class="nav-grid">
            <a href="/admin_dash.html" class="nav-card active">
                <h3>Live Analytics</h3>
                <p>Mission Metrics & Engagement</p>
            </a>
            <a href="/admin/archive.php?key=<?php echo $secret_key; ?>" class="nav-card">
                <h3>Email Archive</h3>
                <p>Sent Vector Replicas</p>
            </a>
            <a href="/admin/changelog.html" class="nav-card">
                <h3>Project Changelog</h3>
                <p>Institutional Evolution</p>
            </a>
            <a href="/scout_api.php" class="nav-card" target="_blank">
                <h3>Vector Vault</h3>
                <p>Direct Athlete Ingest Files</p>
            </a>
        </div>

        <div class="footer">
            Savage Scout Unit | Level Alpha Clearance
        </div>
    </div>
</body>
</html>
