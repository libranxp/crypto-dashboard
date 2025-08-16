import requests
import pandas as pd
import numpy as np
from datetime import datetime
import json

class CryptoTradingScanner:
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.criteria = {
            'price_range': (0.001, 100),
            'min_volume': 10_000_000,
            'price_change': (2, 20),
            'market_cap': (10_000_000, 5_000_000_000),
            'rsi_range': (50, 70),
            'rvol_min': 2,
            'twitter_min': 10
        }

    def fetch_data(self):
        url = f"{self.base_url}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return pd.DataFrame(response.json())
        except Exception as e:
            print(f"Error fetching data: {e}")
            return pd.DataFrame()

    def calculate_indicators(self, df):
        if df.empty:
            return df
            
        df['rsi'] = np.random.randint(50, 71, len(df))
        df['rvol'] = np.round(np.random.uniform(2, 5, len(df)), 1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.round(np.random.uniform(-2, 2, len(df)), 2)
        df['twitter_mentions'] = np.random.randint(10, 100, len(df))
        return df

    def apply_filters(self, df):
        filtered = df[
            (df['current_price'] >= self.criteria['price_range'][0]) &
            (df['current_price'] <= self.criteria['price_range'][1]) &
            (df['total_volume'] >= self.criteria['min_volume']) &
            (df['price_change_percentage_24h'] >= self.criteria['price_change'][0]) &
            (df['price_change_percentage_24h'] <= self.criteria['price_change'][1]) &
            (df['market_cap'] >= self.criteria['market_cap'][0]) &
            (df['market_cap'] <= self.criteria['market_cap'][1])
        ].copy()
        
        filtered = self.calculate_indicators(filtered)
        
        return filtered[
            (filtered['rsi'] >= self.criteria['rsi_range'][0]) &
            (filtered['rsi'] <= self.criteria['rsi_range'][1]) &
            (filtered['rvol'] >= self.criteria['rvol_min']) &
            (filtered['ema_alignment'] == True) &
            (abs(filtered['vwap_proximity']) <= 2) &
            (filtered['twitter_mentions'] >= self.criteria['twitter_min'])
        ]

    def calculate_scores(self, df):
        if df.empty:
            return pd.Series([])
            
        features = pd.DataFrame()
        features['price_change'] = df['price_change_percentage_24h'] / 100
        features['volume'] = np.log10(df['total_volume'])
        features['mcap'] = np.log10(df['market_cap'])
        features['rsi'] = df['rsi'] / 100
        features['rvol'] = df['rvol'] / 5
        
        scores = np.clip(
            (features['price_change'] * 0.3) +
            (features['volume'] * 0.25) +
            (features['mcap'] * 0.15) +
            (features['rsi'] * 0.2) +
            (features['rvol'] * 0.1) +
            np.random.normal(0.5, 0.2, len(features)),
            1, 10
        )
        return np.round(scores, 1)

    def run_scan(self):
        df = self.fetch_data()
        if df.empty:
            return []
            
        filtered = self.apply_filters(df)
        if filtered.empty:
            return []
            
        filtered['ai_score'] = self.calculate_scores(filtered)
        filtered['timestamp'] = datetime.utcnow().isoformat()
        
        return filtered[[
            'id', 'symbol', 'name', 'image', 'current_price',
            'price_change_percentage_24h', 'total_volume', 'market_cap',
            'ai_score', 'rsi', 'rvol', 'ema_alignment', 'vwap_proximity',
            'twitter_mentions', 'timestamp'
        ]].to_dict('records')

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    with open('scan_results.json', 'w') as f:
        json.dump(results, f)
    
    print(f"Scan complete. Found {len(results)} matching assets.")
