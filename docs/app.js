class CryptoDashboard {
    constructor() {
        this.dataUrls = {
            results: 'data/scan_results.json',
            update: 'data/last_update.txt'
        };
        this.scanData = null;
        this.isLoading = false;
        
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
        
        // Add periodic auto-refresh every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.checkForUpdates();
            }
        }, 30000);
    }

    async loadInitialData() {
        try {
            this.showLoading();
            console.log("Loading initial data...");
            
            // Load data immediately with cache busting
            const timestamp = Date.now();
            const [data, update] = await Promise.all([
                this.fetchWithRetry(`${this.dataUrls.results}?t=${timestamp}`),
                this.fetchWithRetry(`${this.dataUrls.update}?t=${timestamp}`)
            ]);
            
            this.scanData = data;
            this.updateLastUpdated(update);
            this.displayResults();
            console.log("Initial data loaded successfully");
            
        } catch (error) {
            console.error('Initial data loading failed:', error);
            this.showError('Failed to load initial data. Please refresh the page.');
        } finally {
            this.hideLoading();
        }
    }

    async fetchWithRetry(url, options = {}, retries = 5) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Fetching ${url} (attempt ${i + 1})`);
                const response = await fetch(url, {
                    ...options,
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`Successfully fetched ${url}`);
                return data;
                
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    }

    async refreshData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading();
            this.elements.refreshBtn.disabled = true;
            this.elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            console.log("Manual refresh initiated...");
            
            // Force fresh data with aggressive cache busting
            const timestamp = Date.now();
            const [data, update] = await Promise.all([
                this.fetchWithRetry(`${this.dataUrls.results}?force_refresh=${timestamp}`),
                this.fetchWithRetry(`${this.dataUrls.update}?force_refresh=${timestamp}`)
            ]);
            
            this.scanData = data;
            this.updateLastUpdated(update);
            this.displayResults();
            
            // Show success feedback
            this.showToast('Data refreshed successfully!', 'success');
            console.log("Manual refresh completed successfully");
            
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showError('Refresh failed. Please try again.');
            this.showToast('Refresh failed!', 'error');
        } finally {
            this.isLoading = false;
            this.elements.refreshBtn.disabled = false;
            this.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            this.hideLoading();
        }
    }

    async checkForUpdates() {
        try {
            const response = await fetch(`${this.dataUrls.update}?t=${Date.now()}`, {
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const lastUpdate = await response.text();
                const currentUpdate = this.elements.lastUpdate.textContent;
                
                if (lastUpdate !== currentUpdate) {
                    console.log("New data available, auto-refreshing...");
                    this.refreshData();
                }
            }
        } catch (error) {
            console.log("Auto-update check failed:", error);
        }
    }

    displayResults() {
        if (!this.scanData || this.scanData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No cryptocurrencies match the current criteria. 
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="dashboard.refreshData()">
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
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No results match the selected filter. 
                    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="dashboard.elements.filterSelect.value='all'; dashboard.displayResults()">
                        Show All Results
                    </button>
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
                    <a href="${item.news_url}" target="_blank" class="btn btn-sm btn-outline-info" title="CoinGecko Page">
                        <i class="fas fa-coins"></i>
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

    showDetails(coinId) {
        const coin = this.scanData.find(item => item.id === coinId);
        if (!coin) return;
        
        const modalHtml = `
            <div class="modal fade" id="coinModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <img src="${coin.image}" width="32" height="32" 
                                     onerror="this.src='https://via.placeholder.com/32'">
                                ${coin.name} (${coin.symbol})
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card mb-3">
                                        <div class="card-header">Technical Indicators</div>
                                        <div class="card-body">
                                            <ul class="list-group list-group-flush">
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>RSI:</span>
                                                    <span class="${coin.rsi > 70 ? 'text-danger' : coin.rsi < 30 ? 'text-success' : ''}">
                                                        ${coin.rsi}
                                                    </span>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>Relative Volume:</span>
                                                    <span>${coin.rvol}x</span>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>EMA Alignment:</span>
                                                    <span class="${coin.ema_alignment ? 'text-success' : 'text-warning'}">
                                                        ${coin.ema_alignment ? 'Aligned' : 'Not Aligned'}
                                                    </span>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>VWAP Proximity:</span>
                                                    <span>${coin.vwap_proximity}%</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card mb-3">
                                        <div class="card-header">Risk Management</div>
                                        <div class="card-body">
                                            <ul class="list-group list-group-flush">
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>Stop Loss:</span>
                                                    <span>$${coin.risk.stop_loss}</span>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>Take Profit:</span>
                                                    <span>$${coin.risk.take_profit}</span>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>Position Size:</span>
                                                    <span>${coin.risk.position_size}%</span>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between">
                                                    <span>Risk/Reward:</span>
                                                    <span>1:${coin.risk.risk_reward}</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="card">
                                        <div class="card-header">Market Sentiment</div>
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <span class="me-3">News Sentiment: ${coin.news_sentiment}/1.0</span>
                                                    <div class="progress" style="width: 200px; height: 20px;">
                                                        <div class="progress-bar bg-success" 
                                                             style="width: ${coin.news_sentiment * 100}%"></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span class="me-3">Twitter Mentions: ${coin.twitter_mentions}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <a href="${coin.tradingview_url}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-chart-line"></i> TradingView
                            </a>
                            <a href="${coin.news_url}" target="_blank" class="btn btn-info">
                                <i class="fas fa-coins"></i> CoinGecko Page
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
        
        document.getElementById('coinModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
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
        this.isLoading = true;
        this.elements.loadingIndicator.style.display = 'block';
        this.elements.resultsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading live market data...</p>
            </div>
        `;
    }

    hideLoading() {
        this.isLoading = false;
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

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        toast.innerHTML = `
            <div class="toast-body">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                ${message}
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize dashboard immediately
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CryptoDashboard();
});
