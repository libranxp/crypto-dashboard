class CryptoDashboard {
    constructor() {
        this.dataUrls = {
            results: 'data/scan_results.json',
            update: 'data/last_update.txt'
        };
        this.cacheBuster = `t=${Date.now()}`;
        this.scanData = null;
        
        this.initElements();
        this.initEventListeners();
        this.loadInitialData();
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

    async loadInitialData() {
        try {
            this.showLoading();
            
            // First try loading with cache busting
            try {
                await this.loadData(true);
            } catch (initialError) {
                console.log("Initial load with cache busting failed, trying without...");
                await this.loadData(false);
            }
        } catch (error) {
            console.error('Initial data loading failed:', error);
            this.showError('Failed to load initial data. Please try refreshing.');
        } finally {
            this.hideLoading();
        }
    }

    async loadData(useCacheBusting = true) {
        try {
            this.showLoading();
            
            const cacheParam = useCacheBusting ? `?${this.cacheBuster}` : '';
            const [dataResponse, updateResponse] = await Promise.all([
                fetch(`${this.dataUrls.results}${cacheParam}`),
                fetch(`${this.dataUrls.update}${cacheParam}`)
            ]);
            
            if (!dataResponse.ok || !updateResponse.ok) {
                throw new Error('Failed to fetch data');
            }
            
            this.scanData = await dataResponse.json();
            const lastUpdate = await updateResponse.text();
            
            this.displayResults();
            this.updateLastUpdated(lastUpdate);
        } catch (error) {
            console.error('Data loading failed:', error);
            throw error;
        }
    }

    async refreshData() {
        try {
            this.showLoading();
            this.elements.refreshBtn.disabled = true;
            
            this.cacheBuster = `force_refresh=${Date.now()}`;
            await this.loadData(true);
            
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
        if (!this.scanData) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    No data available. Please try refreshing.
                </div>
            `;
            return;
        }

        if (this.scanData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-info">
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
