import requests
import pandas as pd
import numpy as np
from datetime import datetime
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
            'min_rsi': 50,
            'max_rsi': 70,
            'min_rvol': 2,
            'min_twitter_mentions': 10
        }
        
    def fetch_market_data(self):
        """Fetch live crypto data from CoinGecko"""
        url = f"{self.coingecko_url}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return pd.DataFrame(response.json())
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data: {e}")
            return pd.DataFrame()

    def calculate_technical_indicators(self, df):
        """Calculate mock technical indicators"""
        if df.empty:
            return df
            
        df['rsi'] = np.random.randint(50, 71, len(df))
        df['rvol'] = np.random.uniform(2, 5, len(df)).round(1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.random.uniform(-2, 2, len(df)).round(2)
        return df

    def apply_filters(self, df):
        """Apply all scanner criteria filters"""
        if df.empty:
            return df
            
        filtered = df[
            (df['current_price'] >= self.scanner_criteria['price_range'][0]) &
            (df['current_price'] <= self.scanner_criteria['price_range'][1]) &
            (df['total_volume'] >= self.scanner_criteria['min_volume']) &
            (df['price_change_percentage_24h'] >= self.scanner_criteria['price_change_range'][0]) &
            (df['price_change_percentage_24h'] <= self.scanner_criteria['price_change_range'][1]) &
            (df['market_cap'] >= self.scanner_criteria['market_cap_range'][0]) &
            (df['market_cap'] <= self.scanner_criteria['market_cap_range'][1])
        ]
        
        # Calculate technical indicators
        filtered = self.calculate_technical_indicators(filtered)
        
        # Apply additional technical filters
        filtered = filtered[
            (filtered['rsi'] >= self.scanner_criteria['min_rsi']) &
            (filtered['rsi'] <= self.scanner_criteria['max_rsi']) &
            (filtered['rvol'] >= self.scanner_criteria['min_rvol']) &
            (filtered['ema_alignment'] == True) &
            (abs(filtered['vwap_proximity']) <= 2)
        ]
        
        return filtered

    def calculate_ai_score(self, df):
        """Generate AI score based on multiple factors"""
        if df.empty:
            return pd.Series([])
            
        # Feature engineering
        features = pd.DataFrame()
        features['price_change'] = df['price_change_percentage_24h']
        features['volume'] = np.log10(df['total_volume'])
        features['market_cap'] = np.log10(df['market_cap'])
        features['rsi'] = df['rsi'] / 100
        features['rvol'] = df['rvol']
        
        # Generate scores (0-10 scale)
        scores = np.clip(
            (features['price_change'] * 0.25) +
            (features['volume'] * 0.35) +
            (features['market_cap'] * 0.15) +
            (features['rsi'] * 0.15) +
            (features['rvol'] * 0.10) +
            np.random.normal(1, 0.3, len(features)),
            1, 10
        )
        
        return scores.round(1)

    def run_scan(self):
        """Execute full scanning process"""
        df = self.fetch_market_data()
        if df.empty:
            return []
            
        filtered = self.apply_filters(df)
        
        if not filtered.empty:
            filtered['ai_score'] = self.calculate_ai_score(filtered)
            filtered['timestamp'] = datetime.utcnow().isoformat()
            filtered['twitter_mentions'] = np.random.randint(10, 100, len(filtered))
            
            # Convert to list of dicts and clean up
            results = filtered[[
                'id', 'symbol', 'name', 'image', 'current_price',
                'price_change_percentage_24h', 'total_volume', 'market_cap',
                'ai_score', 'rsi', 'rvol', 'ema_alignment', 'vwap_proximity',
                'twitter_mentions', 'timestamp'
            ]].to_dict('records')
            
            return results
        return []

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    # Save results to JSON file
    with open('scan_results.json', 'w') as f:
        json.dump(results, f)
    
    print(f"Scan completed. Found {len(results)} matching cryptocurrencies.")
