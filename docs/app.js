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
            
            // First try to load cached data immediately
            const cachedData = await this.fetchData(this.dataUrls.results);
            if (cachedData && cachedData.length > 0) {
                this.scanData = cachedData;
                this.displayResults();
            }
            
            // Then load fresh data in background
            this.refreshData(true);
        } catch (error) {
            console.error('Initial load failed:', error);
            this.showError('Failed to load initial data. Trying to refresh...');
            await this.refreshData();
        } finally {
            this.hideLoading();
        }
    }

    async fetchData(url, isRefresh = false) {
        try {
            const response = await fetch(`${url}?${isRefresh ? 'force_refresh=' : ''}${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Fetch failed for ${url}:`, error);
            throw error;
        }
    }

    async refreshData(silent = false) {
        try {
            if (!silent) {
                this.showLoading();
                this.elements.refreshBtn.disabled = true;
            }
            
            const [data, update] = await Promise.all([
                this.fetchData(this.dataUrls.results, true),
                this.fetchData(this.dataUrls.update, true)
            ]);
            
            this.scanData = data;
            this.updateLastUpdated(update);
            this.displayResults();
            
            if (!silent) {
                const toast = new bootstrap.Toast(this.elements.toast);
                toast.show();
            }
        } catch (error) {
            console.error('Refresh failed:', error);
            if (!silent) {
                this.showError('Refresh failed. Please try again.');
            }
        } finally {
            if (!silent) {
                this.elements.refreshBtn.disabled = false;
                this.hideLoading();
            }
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
                                <i class="fas fa-newspaper"></i> View on CoinGecko
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
