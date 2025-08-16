class CryptoScannerDashboard {
    constructor() {
        this.apiUrl = 'https://raw.githubusercontent.com/your-username/ai-crypto-scanner/main/backend/scan_results.json';
        this.watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        
        this.initElements();
        this.initEventListeners();
        this.initMarketGauge();
        this.loadWatchlist();
        this.runScan();
    }
    
    initElements() {
        this.elements = {
            scanBtn: document.getElementById('scan-btn'),
            scanResults: document.getElementById('scan-results'),
            watchlistItems: document.getElementById('watchlist-items'),
            filterSelect: document.getElementById('filter-select'),
            lastScanTime: document.getElementById('last-scan-time'),
            marketGauge: document.getElementById('market-gauge')
        };
    }
    
    async runScan() {
        this.elements.scanBtn.disabled = true;
        this.elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        
        try {
            const response = await fetch(this.apiUrl + '?t=' + Date.now());
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            this.lastScanData = data;
            this.elements.lastScanTime.textContent = new Date().toLocaleTimeString();
            this.displayResults();
            this.updateMarketGauge(data);
            
            // Update watchlist items with current data
            this.loadWatchlist();
        } catch (error) {
            console.error('Scan failed:', error);
            this.showToast('Scan failed: ' + error.message, 'error');
        } finally {
            this.elements.scanBtn.disabled = false;
            this.elements.scanBtn.innerHTML = '<i class="fas fa-search"></i> Run Scan';
        }
    }
    
    displayResults() {
        if (!this.lastScanData || this.lastScanData.length === 0) {
            this.elements.scanResults.innerHTML = '<div class="alert alert-info">No cryptocurrencies match the current criteria</div>';
            return;
        }
        
        const filter = this.elements.filterSelect.value;
        let filteredData = [...this.lastScanData];
        
        if (filter === 'high') {
            filteredData = filteredData.filter(item => item.ai_score >= 7);
        } else if (filter === 'medium') {
            filteredData = filteredData.filter(item => item.ai_score >= 4 && item.ai_score < 7);
        }
        
        if (filteredData.length === 0) {
            this.elements.scanResults.innerHTML = '<div class="alert alert-info">No results match the selected filter</div>';
            return;
        }
        
        this.elements.scanResults.innerHTML = `
            <div class="table-responsive">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Coin</th>
                            <th>Price</th>
                            <th>24h Change</th>
                            <th>Volume</th>
                            <th>AI Score</th>
                            <th>RSI</th>
                            <th>RVOL</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.map(item => this.createTableRow(item)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    createTableRow(item) {
        const changeClass = item.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative';
        const scoreClass = item.ai_score >= 7 ? 'high' : item.ai_score >= 4 ? 'medium' : 'low';
        const inWatchlist = this.watchlist.includes(item.id);
        
        return `
            <tr class="crypto-row">
                <td class="ticker-cell">
                    <img src="${item.image}" width="20" height="20" alt="${item.name}" 
                         onerror="this.src='https://via.placeholder.com/20'">
                    <span>${item.symbol.toUpperCase()}</span>
                </td>
                <td>$${item.current_price.toFixed(4)}</td>
                <td class="${changeClass}">${item.price_change_percentage_24h.toFixed(2)}%</td>
                <td>$${(item.total_volume / 1000000).toFixed(2)}M</td>
                <td><span class="ai-score ${scoreClass}">${item.ai_score}</span></td>
                <td>${item.rsi}</td>
                <td>${item.rvol}x</td>
                <td>
                    <button class="btn btn-sm ${inWatchlist ? 'btn-danger' : 'btn-success'}" 
                            onclick="dashboard.toggleWatchlist('${item.id}')">
                        ${inWatchlist ? 'Remove' : 'Add'}
                    </button>
                </td>
            </tr>
        `;
    }
    
    toggleWatchlist(id) {
        const index = this.watchlist.indexOf(id);
        if (index === -1) {
            this.watchlist.push(id);
            this.showToast('Added to watchlist', 'success');
        } else {
            this.watchlist.splice(index, 1);
            this.showToast('Removed from watchlist', 'warning');
        }
        
        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        this.loadWatchlist();
        this.displayResults();
    }
    
    loadWatchlist() {
        if (!this.lastScanData) return;
        
        const watchlistItems = this.watchlist
            .map(id => this.lastScanData.find(item => item.id === id))
            .filter(item => item);
            
        this.elements.watchlistItems.innerHTML = watchlistItems.length
            ? watchlistItems.map(item => this.createWatchlistItem(item)).join('')
            : '<div class="alert alert-secondary">No assets in watchlist</div>';
    }
    
    createWatchlistItem(item) {
        const changeClass = item.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative';
        
        return `
            <div class="watchlist-item">
                <div class="d-flex align-items-center gap-2">
                    <img src="${item.image}" width="20" height="20" alt="${item.name}"
                         onerror="this.src='https://via.placeholder.com/20'">
                    <strong>${item.symbol.toUpperCase()}</strong>
                    <span class="ms-auto ${changeClass}">${item.price_change_percentage_24h.toFixed(2)}%</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <small>$${item.current_price.toFixed(4)}</small>
                    <small class="ai-score ${item.ai_score >= 7 ? 'high' : 'medium'}">
                        AI: ${item.ai_score}
                    </small>
                </div>
            </div>
        `;
    }
    
    initMarketGauge() {
        this.marketGaugeChart = new Chart(this.elements.marketGauge, {
            type: 'doughnut',
            data: {
                labels: ['Bullish', 'Neutral', 'Bearish'],
                datasets: [{
                    data: [40, 40, 20],
                    backgroundColor: ['#00ff7f', '#ffc107', '#ff4757'],
                    borderWidth: 0
                }]
            },
            options: {
                circumference: 180,
                rotation: -90,
                cutout: '80%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    updateMarketGauge(data) {
        if (!data || data.length === 0) return;
        
        const avgScore = data.reduce((sum, item) => sum + item.ai_score, 0) / data.length;
        const bullish = Math.min(80, Math.max(20, (avgScore - 4) * 15));
        const bearish = Math.min(30, Math.max(5, (10 - avgScore) * 5));
        const neutral = 100 - bullish - bearish;
        
        this.marketGaugeChart.data.datasets[0].data = [bullish, neutral, bearish];
        this.marketGaugeChart.update();
        
        // Update gauge label
        const gaugeLabel = avgScore >= 7 ? '🚀 Strong Bullish' :
                          avgScore >= 5 ? '📈 Mild Bullish' :
                          avgScore >= 3 ? '↔️ Neutral' : '📉 Bearish';
        
        if (this.elements.marketGauge.previousSibling) {
            this.elements.marketGauge.previousSibling.textContent = gaugeLabel;
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CryptoScannerDashboard();
});
