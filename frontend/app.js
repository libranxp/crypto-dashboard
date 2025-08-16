<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Crypto Scanner</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="styles.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://kit.fontawesome.com/YOUR_KIT_CODE.js" crossorigin="anonymous"></script>
</head>
<body>
    <div class="container mt-4" id="app">
        <div class="text-center mb-4">
            <h1><i class="fas fa-chart-line"></i> AI Crypto Scanner</h1>
            <button id="refresh-btn" class="btn btn-primary">
                <i class="fas fa-sync-alt"></i> Refresh Data
            </button>
            <p class="text-muted mt-2">Last updated: <span id="last-updated">Never</span></p>
        </div>
        
        <div class="table-responsive">
            <table class="table table-hover" id="results-table">
                <thead class="table-dark">
                    <tr>
                        <th>Coin</th>
                        <th>Price</th>
                        <th>24h Change</th>
                        <th>Volume</th>
                        <th>AI Score</th>
                    </tr>
                </thead>
                <tbody id="results-body">
                    <!-- Data will be loaded here -->
                </tbody>
            </table>
        </div>
    </div>
    
    <script src="app.js"></script>
</body>
</html>
