<?php
/**
 * Mr. Workout | Master Command Hub
 * Unified Analytics, Archives, and Intelligence.
 */

$secret_key = "savage_scout_2026";
$provided_key = $_GET['key'] ?? '';

// Check for key. If missing, show "Access Denied" instead of file download.
if ($provided_key !== $secret_key) {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html><head><title>MISSION DENIED</title><style>body{background:#000;color:#f00;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}h1{border:1px solid #f00;padding:20px;letter-spacing:5px;}</style></head><body><h1>MISSION DENIED | ACCESS RESTRICTED</h1></body></html>";
    exit;
}

// If key is valid, serve the Dashboard
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scouting Dashboard | Mr. Workout</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --neon-cyan: #00ffff;
            --neon-green: #39ff14;
            --dark-bg: #050505;
            --glass-bg: rgba(255, 255, 255, 0.02);
            --glass-border: rgba(255, 255, 255, 0.05);
        }

        body {
            background-color: var(--dark-bg);
            color: #fff;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            overflow-x: hidden;
        }

        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 60px;
            border-bottom: 1px solid var(--glass-border);
            padding-bottom: 20px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 5px;
            background: linear-gradient(135deg, #fff, #444);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .nav-gate {
            display: flex;
            gap: 15px;
        }

        .nav-btn {
            font-size: 10px;
            font-weight: 900;
            color: #888;
            border: 1px solid var(--glass-border);
            padding: 5px 15px;
            border-radius: 20px;
            text-decoration: none;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        }

        .nav-btn:hover {
            color: var(--neon-cyan);
            border-color: var(--neon-cyan);
        }

        .status-badge {
            font-size: 10px;
            font-weight: 900;
            color: var(--neon-cyan);
            border: 1px solid var(--neon-cyan);
            padding: 5px 15px;
            border-radius: 20px;
            letter-spacing: 2px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 30px;
            text-align: center;
        }

        .stat-card h3 {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
        }

        .stat-card p {
            font-size: 40px;
            font-weight: 900;
            margin: 0;
            color: #fff;
        }

        .grid-main {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }

        .panel {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            padding: 40px;
        }

        .panel h2 {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: var(--neon-green);
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            text-align: left;
            font-size: 10px;
            color: #444;
            text-transform: uppercase;
            padding-bottom: 15px;
        }

        td {
            padding: 12px 0;
            font-size: 12px;
            border-top: 1px solid var(--glass-border);
        }

        .status-sent { color: #888; }
        .status-open { color: var(--neon-cyan); font-weight: bold; }
        .status-vector { color: var(--neon-green); font-weight: bold; }

        #chart-container {
            height: 300px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <div>
                <h1>Command Hub</h1>
                <div class="nav-gate">
                    <a href="/admin/archive.php?key=<?php echo $secret_key; ?>" class="nav-btn">ARCHIVES</a>
                    <a href="/admin/changelog.html" class="nav-btn">CHANGELOG</a>
                    <a href="/scout_api.php" class="nav-btn" target="_blank">API</a>
                </div>
            </div>
            <div class="status-badge">PHASE 1 ACTIVE</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>Vectors Dispatched</h3>
                <p id="stat-sent">0</p>
            </div>
            <div class="stat-card">
                <h3>Engagement (Opens)</h3>
                <p id="stat-opened">0</p>
            </div>
            <div class="stat-card">
                <h3>Athlete Ingests</h3>
                <p id="stat-uploads">0</p>
            </div>
        </div>

        <div class="grid-main">
            <div class="panel">
                <h2>Engagement Metrics</h2>
                <div id="chart-container">
                    <canvas id="conversionChart"></canvas>
                </div>
            </div>

            <div class="panel">
                <h2>Real-Time Activity</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Entity</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="activity-feed">
                        <!-- Activity injected here -->
                    </tbody>
                </table>
            </div>
        </div>

        <div class="panel">
            <h2>Athlete Vector Vault</h2>
            <table id="vector-vault">
                <thead>
                    <tr>
                        <th>Capture Timestamp</th>
                        <th>Filename</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="vector-feed">
                    <!-- Vectors injected here -->
                </tbody>
            </table>
        </div>
    </div>

    <script>
        async function refreshDashboard() {
            try {
                const response = await fetch('/scout_api.php');
                const data = await response.json();

                updateStats(data.metrics);
                updateActivity(data.activity);
                updateVectors(data.vectors);
                updateChart(data.metrics);
            } catch (err) {
                console.error("Scouting Error:", err);
            }
        }

        function updateStats(metrics) {
            document.getElementById('stat-sent').innerText = metrics.sent;
            document.getElementById('stat-opened').innerText = metrics.opened;
            document.getElementById('stat-uploads').innerText = metrics.uploads;
        }

        function updateActivity(activity) {
            const feed = document.getElementById('activity-feed');
            feed.innerHTML = activity.slice(0, 10).map(item => `
                <tr>
                    <td>${item.time.split(' ')[1]}</td>
                    <td>${item.username}</td>
                    <td class="${item.status === 'OPENED' ? 'status-open' : 'status-sent'}">${item.status}</td>
                </tr>
            `).join('');
        }

        function updateVectors(vectors) {
            const feed = document.getElementById('vector-feed');
            feed.innerHTML = vectors.map(v => `
                <tr>
                    <td>${v.time}</td>
                    <td class="status-vector">${v.name}</td>
                    <td><a href="/data/uploads/${v.name}" style="color:var(--neon-green); text-decoration:none; font-size:10px; font-weight:bold;">DOWNLOAD VECTOR</a></td>
                </tr>
            `).join('');
        }

        let myChart;
        function updateChart(metrics) {
            const ctx = document.getElementById('conversionChart').getContext('2d');
            
            if (myChart) myChart.destroy();

            myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Sent', 'Opened', 'Uploaded'],
                    datasets: [{
                        label: 'Mission Metrics',
                        data: [metrics.sent, metrics.opened, metrics.uploads],
                        backgroundColor: [
                            'rgba(255, 255, 255, 0.1)',
                            'rgba(0, 255, 255, 0.5)',
                            'rgba(57, 255, 20, 0.5)'
                        ],
                        borderColor: [
                            'rgba(255, 255, 255, 0.2)',
                            '#00ffff',
                            '#39ff14'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // Initial and Interval Refresh
        refreshDashboard();
        setInterval(refreshDashboard, 30000);
    </script>
</body>
</html>
