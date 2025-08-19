class CryptoDashboard {
    constructor() {
        this.dataUrls = {
            results: 'data/scan_results.json',
            update: 'data/last_update.txt',
            meta: 'data/scan_meta.json'
        };
        this.scanData = null;
        this.lastUpdate = null;
        
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
            toast: document.getElementById('refresh-toast'),
            statusIndicator: document.getElementById('status-indicator')
        };
    }

    initEventListeners() {
        this.elements.refreshBtn.addEventListener('click', () => this.refreshData());
        this.elements.filterSelect.addEventListener('change', () => this.displayResults());
        
        // Auto-refresh every 30 seconds
        setInterval(() => this.checkForUpdates(), 30000);
    }

    async loadInitialData() {
        console.log("Loading initial data...");
        this.showLoading();
        
        try {
            await this.loadData();
            this.hideLoading();
        } catch (error) {
            console.error('Initial load failed:', error);
            this.showError('Failed to load initial data. Click refresh to try again.');
        }
    }

    async loadData() {
        try {
            const cacheBuster = `t=${Date.now()}`;
            
            const [data, update, meta] = await Promise.allSettled([
                this.fetchWithRetry(`${this.dataUrls.results}?${cacheBuster}`),
                this.fetchWithRetry(`${this.dataUrls.update}?${cacheBuster}`),
                this.fetchWithRetry(`${this.dataUrls.meta}?${cacheBuster}`)
            ]);

            // Handle results
            if (data.status === 'fulfilled') {
                this.scanData = data.value;
                console.log(`Loaded ${this.scanData?.length || 0} assets`);
            }

            if (update.status === 'fulfilled') {
                this.lastUpdate = update.value;
                this.updateLastUpdated(this.lastUpdate);
            }

            if (meta.status === 'fulfilled') {
                this.updateStatus(meta.value);
            }

            this.displayResults();

        } catch (error) {
            console.error('Data loading failed:', error);
            throw error;
        }
    }

    async fetchWithRetry(url, retries = 5) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Fetching: ${url} (attempt ${i + 1})`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                return data;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    async refreshData() {
        console.log("Manual refresh requested");
        this.showLoading();
        this.elements.refreshBtn.disabled = true;
        
        try {
            // Force complete reload
            await this.loadData();
            
            // Show success notification
            this.showToast('Data refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showError('Refresh failed. Please try again.');
        } finally {
            this.elements.refreshBtn.disabled = false;
            this.hideLoading();
        }
    }

    async checkForUpdates() {
        try {
            const response = await fetch(`${this.dataUrls.meta}?t=${Date.now()}`);
            if (response.ok) {
                const meta = await response.json();
                if (meta.last_scan !== this.lastUpdate) {
                    console.log('New data available, refreshing...');
                    this.loadData();
                }
            }
        } catch (error) {
            console.log('Update check failed:', error);
        }
    }

    displayResults() {
        const container = this.elements.resultsContainer;
        
        if (!this.scanData || this.scanData.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No cryptocurrencies currently match the scanning criteria. 
                    This could be due to market conditions or the scanner not having run yet.
                    <br><br>
                    <button class="btn btn-sm btn-primary mt-2" onclick="dashboard.refreshData()">
                        <i class="fas fa-sync-alt"></i> Check Again
                    </button>
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
            container.innerHTML = `
                <div class="alert alert-warning">
                    No results match the selected filter. Try changing filters or check back later.
                </div>
            `;
            return;
        }

        // Sort by AI score descending
        filteredData.sort((a, b) => b.ai_score - a.ai_score);

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead class="table-dark">
                        <tr>
                            <th>Coin</th>
                            <th>Price</th>
                            <th>24h Change</th>
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
            <div class="mt-3 text-center text-muted">
                Showing ${filteredData.length} of ${this.scanData.length} matching assets
            </div>
        `;
    }

    createTableRow(item) {
        const changeClass = item.change_24h >= 0 ? 'positive' : 'negative';
        const scoreClass = item.ai_score >= 7 ? 'high' : item.ai_score >= 4 ? 'medium' : 'low';
        const priceFormatted = item.price < 1 ? item.price.toFixed(6) : item.price.toFixed(4);
        
        return `
            <tr class="asset-row" data-id="${item.id}">
                <td class="coin-cell">
                    <img src="${item.image}" width="28" height="28" 
                         onerror="this.src='https://via.placeholder.com/28?text=🪙'" 
                         alt="${item.name}"
                         class="rounded-circle">
                    <div class="coin-info">
                        <strong>${item.symbol}</strong>
                        <small class="text-muted d-block">${item.name}</small>
                    </div>
                </td>
                <td class="price-cell">$${priceFormatted}</td>
                <td class="${changeClass}">
                    <i class="fas ${item.change_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} me-1"></i>
                    ${Math.abs(item.change_24h)}%
                </td>
                <td>$${(item.volume / 1000000).toFixed(1)}M</td>
                <td>
                    <span class="score-badge ${scoreClass}">
                        ${item.ai_score}
                    </span>
                </td>
                <td>1:${item.risk.risk_reward}</td>
                <td class="action-cell">
                    <a href="${item.tradingview_url}" target="_blank" class="btn btn-sm btn-outline-primary" 
                       title="Open in TradingView" data-bs-toggle="tooltip">
                        <i class="fas fa-chart-line"></i>
                    </a>
                    <a href="${item.coingecko_url}" target="_blank" class="btn btn-sm btn-outline-info"
                       title="View on CoinGecko" data-bs-toggle="tooltip">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <a href="${item.news_url}" target="_blank" class="btn btn-sm btn-outline-warning"
                       title="View News" data-bs-toggle="tooltip">
                        <i class="fas fa-newspaper"></i>
                    </a>
                    <button class="btn btn-sm btn-outline-success" 
                            onclick="dashboard.showDetails('${item.id}')"
                            title="View Details" data-bs-toggle="tooltip">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    showDetails(coinId) {
        const coin = this.scanData.find(item => item.id === coinId);
        if (!coin) return;

        const modalHtml = `
            <div class="modal fade" id="coinModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-dark text-white">
                            <h5 class="modal-title">
                                <img src="${coin.image}" width="36" height="36" 
                                     onerror="this.src='https://via.placeholder.com/36?text=🪙'" 
                                     class="rounded-circle me-2">
                                ${coin.name} (${coin.symbol})
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Detailed view content here -->
                        </div>
                        <div class="modal-footer">
                            <a href="${coin.tradingview_url}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-chart-line"></i> TradingView
                            </a>
                            <a href="${coin.coingecko_url}" target="_blank" class="btn btn-info">
                                <i class="fas fa-external-link-alt"></i> CoinGecko
                            </a>
                            <a href="${coin.news_url}" target="_blank" class="btn btn-warning">
                                <i class="fas fa-newspaper"></i> News
                            </a>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('coinModal'));
        modal.show();
        
        modalContainer.querySelector('.modal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    updateLastUpdated(timestamp) {
        try {
            const date = new Date(timestamp);
            this.elements.lastUpdate.textContent = date.toLocaleString();
            this.elements.lastUpdate.title = `Scan ID: ${date.getTime()}`;
        } catch (e) {
            this.elements.lastUpdate.textContent = 'Just now';
        }
    }

    updateStatus(meta) {
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.textContent = 
                `${meta.assets_found} assets • ${new Date(meta.last_scan).toLocaleTimeString()}`;
        }
    }

    showLoading() {
        this.elements.loadingIndicator.style.display = 'block';
        this.elements.resultsContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
                <p class="mt-3">Loading live market data...</p>
                <p class="text-muted">Fetching the latest cryptocurrency information</p>
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
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary me-2" onclick="dashboard.refreshData()">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Reload Page
                    </button>
                </div>
            </div>
        `;
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    window.dashboard = new CryptoDashboard();
    
    // Enable service worker for better caching (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
});
