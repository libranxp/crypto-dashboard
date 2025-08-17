class CryptoDashboard {
    constructor() {
        this.dataUrl = 'data/scan_results.json';
        this.lastUpdateUrl = 'data/last_update.txt';
        this.scanData = null;
        
        this.initElements();
        this.initEventListeners();
        this.loadData();
    }

    initElements() {
        this.elements = {
            lastUpdate: document.getElementById('last-update'),
            resultsContainer: document.getElementById('results-container'),
            filterSelect: document.getElementById('filter-select'),
            refreshBtn: document.getElementById('refresh-btn'),
            loadingIndicator: document.getElementById('loading-indicator'),
            toast: document.getElementById('refresh-toast')
        };
    }

    initEventListeners() {
        this.elements.refreshBtn.addEventListener('click', () => this.refreshData());
        this.elements.filterSelect.addEventListener('change', () => this.displayResults());
    }

    async fetchData(url) {
        try {
            const response = await fetch(`${url}?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to fetch ${url}:`, error);
            throw error;
        }
    }

    async loadData() {
        try {
            this.showLoading();
            
            const [data, update] = await Promise.all([
                this.fetchData(this.dataUrl),
                this.fetchData(this.lastUpdateUrl)
            ]);
            
            this.scanData = data;
            this.updateLastUpdated(update);
            this.displayResults();
        } catch (error) {
            console.error('Data loading failed:', error);
            this.showError('Failed to load data. Please try again later.');
        } finally {
            this.hideLoading();
        }
    }

    async refreshData() {
        try {
            this.showLoading();
            this.elements.refreshBtn.disabled = true;
            
            // Force fresh reload
            const [data, update] = await Promise.all([
                this.fetchData(`${this.dataUrl}?force_refresh=${Date.now()}`),
                this.fetchData(`${this.lastUpdateUrl}?force_refresh=${Date.now()}`)
            ]);
            
            this.scanData = data;
            this.updateLastUpdated(update);
            this.displayResults();
            
            // Show success toast
            const toast = new bootstrap.Toast(this.elements.toast);
            toast.show();
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showError('Refresh failed. Please try again.');
        } finally {
            this.elements.refreshBtn.disabled = false;
            this.hideLoading();
        }
    }

    displayResults() {
        if (!this.scanData || this.scanData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    No cryptocurrencies match the current criteria. The market may be quiet now.
                </div>
            `;
            return;
        }

        const filterValue = this.elements.filterSelect.value;
        let filteredData = [...this.scanData];
        
        if (filterValue === 'high') {
            filteredData = filteredData.filter(item => item.ai_score >= 7);
        } else if (filterValue === 'medium') {
            filteredData = filteredData.filter(item => item.ai_score >= 4 && item.ai_score < 7);
        }

        if (filteredData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-info">
                    No results match the selected filter. Try adjusting filters or check back later.
                </div>
            `;
            return;
        }

        this.elements.resultsContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Coin</th>
                            <th>Price</th>
                            <th>24h</th>
                            <th>Volume</th>
                            <th>AI Score</th>
                            <th>Risk/Reward</th>
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
        const changeClass = item.change_24h >= 0 ? 'positive' : 'negative';
        const scoreClass = item.ai_score >= 7 ? 'high' : item.ai_score >= 4 ? 'medium' : 'low';
        
        return `
            <tr>
                <td class="coin-cell">
                    <img src="${item.image}" width="24" height="24" 
                         onerror="this.src='https://via.placeholder.com/24'" 
                         alt="${item.name}">
                    <span>${item.symbol}</span>
                </td>
                <td>$${item.price}</td>
                <td class="${changeClass}">${item.change_24h}%</td>
                <td>$${(item.volume / 1000000).toFixed(2)}M</td>
                <td><span class="score-badge ${scoreClass}">${item.ai_score}</span></td>
                <td>1:${item.risk.risk_reward}</td>
                <td class="action-cell">
                    <a href="${item.tradingview_url}" target="_blank" class="btn btn-sm btn-outline-primary" title="TradingView">
                        <i class="fas fa-chart-line"></i>
                    </a>
                    <a href="${item.news_url}" target="_blank" class="btn btn-sm btn-outline-info" title="News">
                        <i class="fas fa-newspaper"></i>
                    </a>
                    <button class="btn btn-sm btn-outline-success" 
                            onclick="dashboard.showDetails('${item.id}')"
                            title="Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    updateLastUpdated(timestamp) {
        try {
            const date = new Date(timestamp);
            this.elements.lastUpdate.textContent = date.toLocaleString();
        } catch (e) {
            console.error('Error parsing timestamp:', e);
            this.elements.lastUpdate.textContent = 'Unknown';
        }
    }

    showLoading() {
        this.elements.loadingIndicator.style.display = 'block';
        this.elements.resultsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading market data...</p>
            </div>
        `;
    }

    hideLoading() {
        this.elements.loadingIndicator.style.display = 'none';
    }

    showError(message) {
        this.elements.resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="dashboard.refreshData()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CryptoDashboard();
});
