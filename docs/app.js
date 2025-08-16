class CryptoDashboard {
    constructor() {
        this.dataUrl = 'data/scan_results.json';
        this.lastUpdateElement = document.getElementById('last-update');
        this.resultsContainer = document.getElementById('results-container');
        this.filterSelect = document.getElementById('filter-select');
        this.refreshBtn = document.getElementById('refresh-btn');
        
        this.initEventListeners();
        this.loadData();
    }

    initEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.loadData(true));
        this.filterSelect.addEventListener('change', () => this.displayResults());
    }

    async loadData(forceRefresh = false) {
        try {
            this.showLoading();
            
            const url = forceRefresh 
                ? `${this.dataUrl}?t=${Date.now()}` 
                : this.dataUrl;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            this.scanData = await response.json();
            this.displayResults();
            this.updateLastUpdated();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError();
        }
    }

    displayResults() {
        if (!this.scanData || this.scanData.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    No cryptocurrencies match the current criteria
                </div>
            `;
            return;
        }

        const filter = this.filterSelect.value;
        let filteredData = [...this.scanData];
        
        if (filter === 'high') {
            filteredData = filteredData.filter(item => item.ai_score >= 7);
        } else if (filter === 'medium') {
            filteredData = filteredData.filter(item => item.ai_score >= 4 && item.ai_score < 7);
        }

        if (filteredData.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="alert alert-info">
                    No results match the selected filter
                </div>
            `;
            return;
        }

        this.resultsContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Coin</th>
                            <th>Price</th>
                            <th>24h Change</th>
                            <th>Volume</th>
                            <th>AI Score</th>
                            <th>RSI</th>
                            <th>RVOL</th>
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
        const changeClass = item.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
        const scoreClass = item.ai_score >= 7 ? 'high' : item.ai_score >= 4 ? 'medium' : 'low';
        const imageUrl = item.image || 'https://via.placeholder.com/20';

        return `
            <tr>
                <td class="ticker-cell">
                    <img src="${imageUrl}" width="20" height="20" alt="${item.name}" 
                         onerror="this.src='https://via.placeholder.com/20'">
                    ${item.symbol.toUpperCase()}
                </td>
                <td>$${item.current_price.toFixed(4)}</td>
                <td class="${changeClass}">${item.price_change_percentage_24h.toFixed(2)}%</td>
                <td>$${(item.total_volume / 1000000).toFixed(2)}M</td>
                <td><span class="ai-score ${scoreClass}">${item.ai_score}</span></td>
                <td>${item.rsi}</td>
                <td>${item.rvol}x</td>
            </tr>
        `;
    }

    updateLastUpdated() {
        if (this.scanData && this.scanData.length > 0) {
            const lastUpdated = new Date(this.scanData[0].timestamp);
            this.lastUpdateElement.textContent = lastUpdated.toLocaleString();
        }
    }

    showLoading() {
        this.resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading scan data...</p>
            </div>
        `;
    }

    showError() {
        this.resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load data. Please try again later.
            </div>
        `;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CryptoDashboard();
});
