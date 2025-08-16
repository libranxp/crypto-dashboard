import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

class CryptoTradingScanner:
    def __init__(self):
        self.coingecko_url = "https://api.coingecko.com/api/v3"
        self.scanner_criteria = {
            'price_range': (0.001, 100),
            'min_volume': 10_000_000,
            'price_change_range': (2, 20),
            'market_cap_range': (10_000_000, 5_000_000_000),
            'min_twitter_mentions': 10
        }
        
    def fetch_market_data(self):
        """Fetch live crypto data from CoinGecko"""
        url = f"{self.coingecko_url}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250"
        response = requests.get(url)
        return pd.DataFrame(response.json())
    
    def apply_filters(self, df):
        """Apply trading criteria filters"""
        filtered = df[
            (df['current_price'] >= self.scanner_criteria['price_range'][0]) &
            (df['current_price'] <= self.scanner_criteria['price_range'][1]) &
            (df['total_volume'] >= self.scanner_criteria['min_volume']) &
            (df['price_change_percentage_24h'] >= self.scanner_criteria['price_change_range'][0]) &
            (df['price_change_percentage_24h'] <= self.scanner_criteria['price_change_range'][1]) &
            (df['market_cap'] >= self.scanner_criteria['market_cap_range'][0]) &
            (df['market_cap'] <= self.scanner_criteria['market_cap_range'][1])
        ]
        return filtered
    
    def calculate_ai_score(self, df):
        """Generate AI score based on multiple factors"""
        # Feature engineering
        X = df[[
            'price_change_percentage_24h',
            'market_cap',
            'total_volume',
            'current_price'
        ]].copy()
        
        # Normalize features
        X['log_volume'] = np.log10(X['total_volume'])
        X['log_mcap'] = np.log10(X['market_cap'])
        X = X[['price_change_percentage_24h', 'log_volume', 'log_mcap']]
        
        # Generate scores (0-10 scale)
        scores = np.clip(
            (X['price_change_percentage_24h'] * 0.3) +
            (X['log_volume'] * 0.4) +
            (X['log_mcap'] * 0.2) +
            np.random.normal(1, 0.5, len(X)),
            1, 10
        )
        
        return scores.round(1)
    
    def run_scan(self):
        """Execute full scanning process"""
        df = self.fetch_market_data()
        filtered = self.apply_filters(df)
        
        if not filtered.empty:
            filtered['ai_score'] = self.calculate_ai_score(filtered)
            filtered['timestamp'] = datetime.utcnow().isoformat()
            
            # Add technical indicators (mock values for demo)
            filtered['rsi'] = np.random.randint(50, 71, len(filtered))
            filtered['rvol'] = np.random.uniform(2, 5, len(filtered)).round(1)
            filtered['ema_alignment'] = np.random.choice([True, False], len(filtered), p=[0.7, 0.3])
            
            return filtered.to_dict('records')
        return []

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    # Save results to JSON file for frontend
    with open('scan_results.json', 'w') as f:
        json.dump(results, f)
