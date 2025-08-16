document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const resultsTable = document.getElementById('results-table');
    const lastScan = document.getElementById('last-scan');
    
    scanBtn.addEventListener('click', fetchScanResults);
    
    async function fetchScanResults() {
        try {
            scanBtn.disabled = true;
            scanBtn.textContent = "Scanning...";
            
            const response = await fetch('http://localhost:5000/api/scan');
            const data = await response.json();
            
            updateResultsTable(data);
            lastScan.textContent = `Last scan: ${new Date().toLocaleTimeString()}`;
        } catch (error) {
            console.error("Error fetching scan results:", error);
        } finally {
            scanBtn.disabled = false;
            scanBtn.textContent = "Run Scan";
        }
    }
    
    function updateResultsTable(data) {
        resultsTable.innerHTML = '';
        
        data.forEach(asset => {
            const row = document.createElement('tr');
            row.className = "asset-card";
            
            row.innerHTML = `
                <td>${asset.symbol.toUpperCase()}</td>
                <td>$${asset.current_price.toFixed(4)}</td>
                <td class="${asset.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                    ${asset.price_change_percentage_24h.toFixed(2)}%
                </td>
                <td>$${(asset.total_volume / 1_000_000).toFixed(2)}M</td>
                <td class="ai-score">${asset.ai_score.toFixed(1)}/10</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="showAssetDetails('${asset.id}')">
                        Details
                    </button>
                </td>
            `;
            
            resultsTable.appendChild(row);
        });
    }
    
    window.showAssetDetails = async (coinId) => {
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        modalTitle.textContent = `${coinId.toUpperCase()} Details`;
        modalBody.innerHTML = `<p>Loading...</p>`;
        
        const modal = new bootstrap.Modal(document.getElementById('assetModal'));
        modal.show();
        
        // Fetch details (mock for now)
        setTimeout(() => {
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div id="price-chart" style="height: 300px;"></div>
                    </div>
                    <div class="col-md-6">
                        <h5>📰 Latest News</h5>
                        <ul id="news-list"></ul>
                    </div>
                </div>
            `;
            
            // Mock chart
            Plotly.newPlot('price-chart', [{
                y: [100, 110, 105, 120, 115],
                type: 'line'
            }]);
            
            // Mock news
            const newsList = document.getElementById('news-list');
            for (let i = 0; i < 3; i++) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#" target="_blank">News headline ${i + 1}</a>`;
                newsList.appendChild(li);
            }
        }, 500);
    };
    
    // Initial scan on page load
    fetchScanResults();
});
