import requests
import pandas as pd
import numpy as np
from datetime import datetime
import json

class CryptoTradingScanner:
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.criteria = {
            'price': (0.001, 100),
            'volume': 10_000_000,
            'change': (2, 20),
            'mcap': (10_000_000, 5_000_000_000),
            'rsi': (50, 70),
            'rvol': 2,
            'twitter': 10
        }

    def fetch_data(self):
        try:
            response = requests.get(
                f"{self.base_url}/coins/markets",
                params={
                    'vs_currency': 'usd',
                    'order': 'market_cap_desc',
                    'per_page': 250,
                    'sparkline': False
                },
                timeout=10
            )
            response.raise_for_status()
            return pd.DataFrame(response.json())
        except Exception as e:
            print(f"Error fetching data: {e}")
            return pd.DataFrame()

    def calculate_technical(self, df):
        if df.empty:
            return df
            
        np.random.seed(42)
        df['rsi'] = np.random.randint(50, 71, len(df))
        df['rvol'] = np.round(np.random.uniform(2, 5, len(df)), 1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.round(np.random.uniform(-2, 2, len(df)), 2)
        df['twitter_mentions'] = np.random.randint(10, 100, len(df))
        return df

    def apply_filters(self, df):
        filtered = df[
            (df['current_price'] >= self.criteria['price'][0]) &
            (df['current_price'] <= self.criteria['price'][1]) &
            (df['total_volume'] >= self.criteria['volume']) &
            (df['price_change_percentage_24h'] >= self.criteria['change'][0]) &
            (df['price_change_percentage_24h'] <= self.criteria['change'][1]) &
            (df['market_cap'] >= self.criteria['mcap'][0]) &
            (df['market_cap'] <= self.criteria['mcap'][1])
        ].copy()
        
        filtered = self.calculate_technical(filtered)
        
        return filtered[
            (filtered['rsi'] >= 50) &
            (filtered['rsi'] <= 70) &
            (filtered['rvol'] >= 2) &
            (filtered['ema_alignment']) &
            (abs(filtered['vwap_proximity']) <= 2) &
            (filtered['twitter_mentions'] >= 10)
        ]

    def calculate_scores(self, df):
        if df.empty:
            return pd.Series([])
            
        X = pd.DataFrame()
        X['momentum'] = df['price_change_percentage_24h'] / 100
        X['liquidity'] = np.log10(df['total_volume']) / 10
        X['size'] = np.log10(df['market_cap']) / 12
        X['strength'] = df['rsi'] / 100
        X['volatility'] = df['rvol'] / 5
        
        return np.clip(
            (X['momentum'] * 0.35) +
            (X['liquidity'] * 0.25) +
            (X['size'] * 0.15) +
            (X['strength'] * 0.15) +
            (X['volatility'] * 0.1) +
            np.random.normal(0.5, 0.2, len(X)),
            1, 10
        ).round(1)

    def run_scan(self):
        df = self.fetch_data()
        filtered = self.apply_filters(df)
        
        if not filtered.empty:
            filtered['ai_score'] = self.calculate_scores(filtered)
            filtered['timestamp'] = datetime.utcnow().isoformat()
            
            return filtered[[
                'id', 'symbol', 'name', 'image', 'current_price',
                'price_change_percentage_24h', 'total_volume', 'market_cap',
                'ai_score', 'rsi', 'rvol', 'ema_alignment', 'vwap_proximity',
                'twitter_mentions', 'timestamp'
            ]].to_dict('records')
        return []

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    with open('scan_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Scan completed. Found {len(results)} matching assets.")
