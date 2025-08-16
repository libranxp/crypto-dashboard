class CryptoScanner {
    constructor() {
        this.dataUrl = 'scan_results.json';  // Now in same directory
        this.resultsBody = document.getElementById('results-body');
        this.lastUpdated = document.getElementById('last-updated');
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadData());
        this.loadData();
    }

    async loadData() {
        try {
            const response = await fetch(this.dataUrl + '?t=' + Date.now());
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            this.displayResults(data);
            
            // Update last updated time
            if (data.length > 0) {
                const timestamp = new Date(data[0].timestamp);
                this.lastUpdated.textContent = timestamp.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.resultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Failed to load data. Please try again later.
                    </td>
                </tr>
            `;
        }
    }

    displayResults(data) {
        if (!data || data.length === 0) {
            this.resultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No cryptocurrencies match the current criteria
                    </td>
                </tr>
            `;
            return;
        }

        this.resultsBody.innerHTML = data.map(item => `
            <tr>
                <td>
                    <img src="${item.image}" width="20" height="20" 
                         onerror="this.src='https://via.placeholder.com/20'" 
                         alt="${item.name}">
                    ${item.symbol.toUpperCase()}
                </td>
                <td>$${item.current_price.toFixed(4)}</td>
                <td class="${item.price_change_percentage_24h >= 0 ? 'text-success' : 'text-danger'}">
                    ${item.price_change_percentage_24h.toFixed(2)}%
                </td>
                <td>$${(item.total_volume / 1000000).toFixed(2)}M</td>
                <td>
                    <span class="badge ${item.ai_score >= 7 ? 'bg-success' : item.ai_score >= 4 ? 'bg-warning' : 'bg-danger'}">
                        ${item.ai_score}
                    </span>
                </td>
            </tr>
        `).join('');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CryptoScanner();
});
