class CryptoDashboard {
    constructor() {
        this.dataUrl = 'data/scan_results.json';
        this.lastUpdateUrl = 'data/last_update.txt';
        this.elements = {
            lastUpdate: document.getElementById('last-update'),
            resultsContainer: document.getElementById('results-container'),
            filterSelect: document.getElementById('filter-select'),
            refreshBtn: document.getElementById('refresh-btn'),
            loadingIndicator: document.getElementById('loading-indicator')
        };
        
        this.initEventListeners();
        this.loadData();
    }

    initEventListeners() {
        this.elements.refreshBtn.addEventListener('click', () => this.refreshData());
        this.elements.filterSelect.addEventListener('change', () => this.displayResults());
    }

    async loadData() {
        try {
            this.showLoading();
            
            const [resultsResponse, updateResponse] = await Promise.all([
                fetch(`${this.dataUrl}?t=${Date.now()}`),
                fetch(`${this.lastUpdateUrl}?t=${Date.now()}`)
            ]);
            
            if (!resultsResponse.ok || !updateResponse.ok) {
                throw new Error('Failed to load data');
            }
            
            this.scanData = await resultsResponse.json();
            const lastUpdate = await updateResponse.text();
            
            this.displayResults();
            this.updateLastUpdated(lastUpdate);
        } catch (error) {
            console.error('Error:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async refreshData() {
        try {
            this.showLoading();
            this.elements.refreshBtn.disabled = true;
            
            // Force fresh data by adding timestamp
            const response = await fetch(`${this.dataUrl}?force_refresh=${Date.now()}`);
            if (!response.ok) throw new Error('Refresh failed');
            
            this.scanData = await response.json();
            this.displayResults();
            
            // Update last updated time
            const updateResponse = await fetch(this.lastUpdateUrl);
            if (updateResponse.ok) {
                const lastUpdate = await updateResponse.text();
                this.updateLastUpdated(lastUpdate);
            }
        } catch (error) {
            console.error('Refresh error:', error);
            this.showError('Failed to refresh data');
        } finally {
            this.elements.refreshBtn.disabled = false;
            this.hideLoading();
        }
    }

    displayResults() {
        if (!this.scanData || this.scanData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-warning">
                    No cryptocurrencies match the current criteria
                </div>
            `;
            return;
        }

        const filter = this.elements.filterSelect.value;
        let filteredData = [...this.scanData];
        
        if (filter === 'high') {
            filteredData = filteredData.filter(item => item.ai_score >= 7);
        } else if (filter === 'medium') {
            filteredData = filteredData.filter(item => item.ai_score >= 4 && item.ai_score < 7);
        }

        if (filteredData.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="alert alert-info">
                    No results match the selected filter. Try adjusting your filters.
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
                            <th>Confidence</th>
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
        const confidenceClass = item.confidence >= 80 ? 'high' : item.confidence >= 60 ? 'medium' : 'low';
        
        return `
            <tr>
                <td class="coin-cell">
                    <img src="${item.image}" width="24" height="24" 
                         onerror="this.src='https://via.placeholder.com/24'" 
                         alt="${item.name}">
                    <span class="coin-name">${item.symbol.toUpperCase()}</span>
                </td>
                <td>$${item.price}</td>
                <td class="${changeClass}">${item.change_24h}%</td>
                <td>$${(item.volume / 1000000).toFixed(2)}M</td>
                <td><span class="score-badge ${scoreClass}">${item.ai_score}</span></td>
                <td><span class="confidence-badge ${confidenceClass}">${item.confidence}%</span></td>
                <td>1:${item.risk.risk_reward}</td>
                <td class="action-cell">
                    <a href="${item.tradingview_url}" target="_blank" class="btn btn-sm btn-outline-primary" title="Open in TradingView">
                        <i class="fas fa-chart-line"></i>
                    </a>
                    <a href="${item.news_url}" target="_blank" class="btn btn-sm btn-outline-info" title="View News">
                        <i class="fas fa-newspaper"></i>
                    </a>
                    <button class="btn btn-sm btn-outline-success" 
                            onclick="dashboard.showDetails('${item.id}')"
                            title="View Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    showDetails(coinId) {
        const coin = this.scanData.find(item => item.id === coinId);
        if (!coin) return;
        
        // Create and show modal with detailed information
        const modalHtml = `
            <div class="modal fade" id="coinModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <img src="${coin.image}" width="32" height="32" 
                                     onerror="this.src='https://via.placeholder.com/32'">
                                ${coin.name} (${coin.symbol.toUpperCase()})
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
                                        <div class="card-header">Risk Assessment</div>
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
                                <i class="fas fa-newspaper"></i> Latest News
                            </a>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM and show it
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('coinModal'));
        modal.show();
        
        // Remove modal after it's closed
        document.getElementById('coinModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    updateLastUpdated(timestamp) {
        if (!timestamp) return;
        const date = new Date(timestamp);
        this.elements.lastUpdate.textContent = date.toLocaleString();
    }

    showLoading() {
        this.elements.loadingIndicator.style.display = 'block';
    }

    hideLoading() {
        this.elements.loadingIndicator.style.display = 'none';
    }

    showError(message = 'Failed to load data') {
        this.elements.resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                ${message}
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CryptoDashboard();
});
