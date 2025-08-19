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
        this.loadData(true); // Initial load
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
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.loadData(false);
            }
        }, 30000);
    }

    async fetchData(url) {
        try {
            const response = await fetch(`${url}?t=${Date.now()}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Fetch failed for ${url}:`, error);
            throw error;
        }
    }

    async loadData(isInitialLoad = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const [data, update] = await Promise.all([
                this.fetchData(this.dataUrls.results),
                this.fetchData(this.dataUrls.update)
            ]);
            
            this.scanData = data;
            this.updateLastUpdated(update);
            this.displayResults();
            
            if (isInitialLoad) {
                console.log("Initial data loaded successfully");
            }
            
        } catch (error) {
            console.error('Data loading failed:', error);
            this.showError('Failed to load live data. Showing cached results...');
            
            // Try to load from local storage as fallback
            this.loadFromCache();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    loadFromCache() {
        try {
            const cachedData = localStorage.getItem('cryptoScannerData');
            if (cachedData) {
                this.scanData = JSON.parse(cachedData);
                this.displayResults();
                this.elements.lastUpdate.textContent = 'Cached data - Last update: Unknown';
            }
        } catch (e) {
            this.showError('No data available. Please try refreshing.');
        }
    }

    async refreshData() {
        if (this.isLoading) return;
        
        this.elements.refreshBtn.disabled = true;
        this.elements.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        
        try {
            // Force complete reload
            await this.loadData(false);
            
            // Save to cache
            if (this.scanData) {
                localStorage.setItem('cryptoScannerData', JSON.stringify(this.scanData));
            }
            
            // Show success toast
            const toast = new bootstrap.Toast(this.elements.toast);
            toast.show();
            
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showError('Refresh failed. Please try again.');
        } finally {
            this.elements.refreshBtn.disabled = false;
            this.elements.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }

    displayResults() {
        if (!this.scanData || this.scanData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No cryptocurrencies match the current criteria. The scanner will automatically retry.
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
                    No results match the selected filter. Try adjusting filters.
                </div>
            `;
            return;
        }

        this.elements.resultsContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead class="table-dark">
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
            <div class="mt-3 text-center">
                <small class="text-muted">Data updates every 10 minutes. Last refresh: ${new Date().toLocaleTimeString()}</small>
            </div>
        `;
    }

    createTableRow(item) {
        const changeClass = item.change_24h >= 0 ? 'positive' : 'negative';
        const scoreClass = item.ai_score >= 7 ? 'high' : item.ai_score >= 4 ? 'medium' : 'low';
        
        return `
            <tr class="crypto-row">
                <td class="coin-cell">
                    <img src="${item.image}" width="32" height="32" 
                         onerror="this.src='https://via.placeholder.com/32?text=Coin'" 
                         alt="${item.name}"
                         class="rounded-circle me-2">
                    <div>
                        <strong>${item.symbol}</strong>
                        <br>
                        <small class="text-muted">${item.name}</small>
                    </div>
                </td>
                <td class="price-cell">$${item.price.toLocaleString()}</td>
                <td class="${changeClass}">
                    <i class="fas ${item.change_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} me-1"></i>
                    ${item.change_24h}%
                </td>
                <td>$${(item.volume / 1000000).toFixed(1)}M</td>
                <td>
                    <span class="score-badge ${scoreClass}">
                        ${item.ai_score}
                    </span>
                </td>
                <td>
                    <span class="risk-badge">1:${item.risk.risk_reward}</span>
                </td>
                <td class="action-cell">
                    <a href="${item.tradingview_url}" target="_blank" class="btn btn-sm btn-outline-primary me-1" title="TradingView Chart">
                        <i class="fas fa-chart-line"></i>
                    </a>
                    <a href="${item.news_url}" target="_blank" class="btn btn-sm btn-outline-info me-1" title="CoinGecko Page">
                        <i class="fas fa-coins"></i>
                    </a>
                    <button class="btn btn-sm btn-outline-success" 
                            onclick="dashboard.showDetails('${item.id}')"
                            title="Detailed Analysis">
                        <i class="fas fa-analytics"></i>
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
                                <img src="${coin.image}" width="40" height="40" 
                                     onerror="this.src='https://via.placeholder.com/40'"
                                     class="rounded-circle me-2">
                                ${coin.name} (${coin.symbol})
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card mb-3">
                                        <div class="card-header bg-primary text-white">
                                            <i class="fas fa-chart-line me-2"></i>Technical Analysis
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-6">
                                                    <strong>RSI:</strong><br>
                                                    <span class="${coin.rsi > 70 ? 'text-danger' : coin.rsi < 30 ? 'text-success' : 'text-warning'}">
                                                        ${coin.rsi}
                                                    </span>
                                                </div>
                                                <div class="col-6">
                                                    <strong>Volume Ratio:</strong><br>
                                                    ${coin.rvol}x
                                                </div>
                                            </div>
                                            <hr>
                                            <div class="row">
                                                <div class="col-6">
                                                    <strong>EMA Alignment:</strong><br>
                                                    <span class="${coin.ema_alignment ? 'text-success' : 'text-danger'}">
                                                        ${coin.ema_alignment ? '✓ Bullish' : '✗ Bearish'}
                                                    </span>
                                                </div>
                                                <div class="col-6">
                                                    <strong>VWAP:</strong><br>
                                                    ${coin.vwap_proximity}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card mb-3">
                                        <div class="card-header bg-success text-white">
                                            <i class="fas fa-shield-alt me-2"></i>Risk Management
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-6">
                                                    <strong>Stop Loss:</strong><br>
                                                    $${coin.risk.stop_loss}
                                                </div>
                                                <div class="col-6">
                                                    <strong>Take Profit:</strong><br>
                                                    $${coin.risk.take_profit}
                                                </div>
                                            </div>
                                            <hr>
                                            <div class="row">
                                                <div class="col-6">
                                                    <strong>Position Size:</strong><br>
                                                    ${coin.risk.position_size}%
                                                </div>
                                                <div class="col-6">
                                                    <strong>Risk/Reward:</strong><br>
                                                    1:${coin.risk.risk_reward}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-12">
                                    <div class="card">
                                        <div class="card-header bg-info text-white">
                                            <i class="fas fa-comments me-2"></i>Market Sentiment
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <strong>News Sentiment:</strong><br>
                                                    <div class="progress mt-1" style="height: 20px;">
                                                        <div class="progress-bar bg-success" 
                                                             style="width: ${coin.news_sentiment * 100}%">
                                                            ${coin.news_sentiment}/1.0
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <strong>Social Activity:</strong><br>
                                                    <i class="fab fa-twitter text-primary me-1"></i>
                                                    ${coin.twitter_mentions} mentions
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <a href="${coin.tradingview_url}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-chart-line me-1"></i>TradingView
                            </a>
                            <a href="${coin.news_url}" target="_blank" class="btn btn-info">
                                <i class="fas fa-coins me-1"></i>CoinGecko
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
            this.elements.lastUpdate.textContent = 'Just now';
        }
    }

    showLoading() {
        this.elements.loadingIndicator.style.display = 'block';
        this.elements.resultsContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading live market data...</p>
                <small class="text-muted">Fetching real-time prices from CoinGecko</small>
            </div>
        `;
    }

    hideLoading() {
        this.elements.loadingIndicator.style.display = 'none';
    }

    showError(message) {
        this.elements.resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
                    <div>
                        <h5 class="alert-heading">Connection Issue</h5>
                        <p class="mb-2">${message}</p>
                        <button class="btn btn-sm btn-outline-primary" onclick="dashboard.refreshData()">
                            <i class="fas fa-sync-alt me-1"></i>Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Crypto Dashboard...");
    window.dashboard = new CryptoDashboard();
});

// Add global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});
