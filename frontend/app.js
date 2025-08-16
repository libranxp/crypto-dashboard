class CryptoScannerDashboard {
    constructor() {
        this.apiUrl = 'https://your-github-username.github.io/ai-crypto-scanner/scan_results.json';
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
    
    initEventListeners() {
        this.elements.scanBtn.addEventListener('click', () => this.runScan());
        this.elements.filterSelect.addEventListener('change', () => this.displayResults());
    }
    
    async runScan() {
        this.elements.scanBtn.disabled = true;
        this.elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        
        try {
            const response = await fetch(this.apiUrl + '?t=' + Date.now());
            const data = await response.json();
            
            this.lastScanData = data;
            this.elements.lastScanTime.textContent = new Date().toLocaleTimeString();
            this.displayResults();
            this.updateMarketGauge(data);
        } catch (error) {
            console.error('Scan failed:', error);
        } finally {
            this.elements.scanBtn.disabled = false;
            this.elements.scanBtn.innerHTML = '<i class="fas fa-search"></i> Run Scan';
        }
    }
    
    displayResults() {
        if (!this.lastScanData) return;
        
        const filter = this.elements.filterSelect.value;
        let filteredData = [...this.lastScanData];
        
        if (filter === 'high') {
            filteredData = filteredData.filter(item => item.ai_score >= 7);
        } else if (filter === 'medium') {
            filteredData = filteredData.filter(item => item.ai_score >= 4 && item.ai_score < 7);
        }
        
        this.elements.scanResults.innerHTML = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Coin</th>
                        <th>Price</th>
                        <th>24h Change</th>
                        <th>Volume</th>
                        <th>AI Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => this.createTableRow(item)).join('')}
                </tbody>
            </table>
        `;
    }
    
    createTableRow(item) {
        const changeClass = item.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative';
        const scoreClass = item.ai_score >= 7 ? 'high' : item.ai_score >= 4 ? 'medium' : 'low';
        
        return `
            <tr class="crypto-row">
                <td class="ticker-cell">
                    <img src="${item.image}" width="20" height="20" alt="${item.name}">
                    ${item.symbol.toUpperCase()}
                </td>
                <td>$${item.current_price.toFixed(4)}</td>
                <td class="${changeClass}">${item.price_change_percentage_24h.toFixed(2)}%</td>
                <td>$${(item.total_volume / 1000000).toFixed(2)}M</td>
                <td><span class="ai-score ${scoreClass}">${item.ai_score}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" 
                            onclick="dashboard.toggleWatchlist('${item.id}', '${item.symbol}')">
                        ${this.watchlist.includes(item.id) ? 'Remove' : 'Add'}
                    </button>
                </td>
            </tr>
        `;
    }
    
    loadWatchlist() {
        this.elements.watchlistItems.innerHTML = this.watchlist.length 
            ? this.watchlist.map(id => {
                const item = this.lastScanData?.find(i => i.id === id);
                return item ? this.createWatchlistItem(item) : '';
            }).join('')
            : '<p>No assets in watchlist</p>';
    }
    
    toggleWatchlist(id, symbol) {
        const index = this.watchlist.indexOf(id);
        if (index === -1) {
            this.watchlist.push(id);
        } else {
            this.watchlist.splice(index, 1);
        }
        
        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        this.loadWatchlist();
        this.displayResults();
    }
    
    initMarketGauge() {
        this.marketGaugeChart = new Chart(this.elements.marketGauge, {
            type: 'doughnut',
            data: {
                labels: ['Bullish', 'Neutral', 'Bearish'],
                datasets: [{
                    data: [30, 50, 20],
                    backgroundColor: ['#00ff7f', '#ffc107', '#ff4757']
                }]
            },
            options: {
                circumference: 180,
                rotation: -90,
                cutout: '80%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    updateMarketGauge(data) {
        if (!data) return;
        
        const avgScore = data.reduce((sum, item) => sum + item.ai_score, 0) / data.length;
        const bullish = Math.min(100, Math.max(0, (avgScore - 4) * 20));
        const bearish = Math.min(100, Math.max(0, (10 - avgScore) * 15));
        const neutral = 100 - bullish - bearish;
        
        this.marketGaugeChart.data.datasets[0].data = [bullish, neutral, bearish];
        this.marketGaugeChart.update();
    }
}

// Initialize dashboard
const dashboard = new CryptoScannerDashboard();
