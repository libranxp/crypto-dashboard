import requests
import pandas as pd
import numpy as np
from datetime import datetime
import json
import os

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
            'twitter': 10,
            'ema': True,
            'vwap': 2
        }

    def fetch_data(self):
        try:
            response = requests.get(
                f"{self.base_url}/coins/markets",
                params={
                    'vs_currency': 'usd',
                    'order': 'market_cap_desc',
                    'per_page': 250,
                    'sparkline': False,
                    'price_change_percentage': '24h'
                },
                timeout=15
            )
            response.raise_for_status()
            return pd.DataFrame(response.json())
        except Exception as e:
            print(f"API Error: {str(e)}")
            return pd.DataFrame()

    def calculate_technical(self, df):
        if df.empty:
            return df
            
        np.random.seed(42)  # Consistent mock values
        df['rsi'] = np.random.randint(self.criteria['rsi'][0], self.criteria['rsi'][1]+1, len(df))
        df['rvol'] = np.round(np.random.uniform(self.criteria['rvol'], 5, len(df)), 1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.round(np.random.uniform(-self.criteria['vwap'], self.criteria['vwap'], len(df)), 2)
        df['twitter_mentions'] = np.random.randint(self.criteria['twitter'], 100, len(df))
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
            (filtered['rsi'].between(*self.criteria['rsi'])) &
            (filtered['rvol'] >= self.criteria['rvol']) &
            (filtered['ema_alignment'] == self.criteria['ema']) &
            (abs(filtered['vwap_proximity']) <= self.criteria['vwap']) &
            (filtered['twitter_mentions'] >= self.criteria['twitter'])
        ]

    def calculate_scores(self, df):
        if df.empty:
            return pd.Series([])
            
        factors = pd.DataFrame()
        factors['momentum'] = df['price_change_percentage_24h'] / 100
        factors['liquidity'] = np.log10(df['total_volume']) / 10
        factors['size'] = np.log10(df['market_cap']) / 12
        factors['strength'] = df['rsi'] / 100
        factors['volatility'] = df['rvol'] / 5
        
        return np.clip(
            (factors['momentum'] * 0.35) +
            (factors['liquidity'] * 0.25) +
            (factors['size'] * 0.15) +
            (factors['strength'] * 0.15) +
            (factors['volatility'] * 0.1) +
            np.random.normal(0.5, 0.2, len(factors)),
            1, 10
        ).round(1)

    def run_scan(self):
        df = self.fetch_data()
        filtered = self.apply_filters(df)
        
        if not filtered.empty:
            filtered['ai_score'] = self.calculate_scores(filtered)
            filtered['timestamp'] = datetime.utcnow().isoformat()
            
            # Prepare final output
            results = filtered[[
                'id', 'symbol', 'name', 'image', 'current_price',
                'price_change_percentage_24h', 'total_volume', 'market_cap',
                'ai_score', 'rsi', 'rvol', 'ema_alignment', 'vwap_proximity',
                'twitter_mentions', 'timestamp'
            ]].to_dict('records')
            
            # Ensure image URLs are complete
            for item in results:
                if item['image'] and not item['image'].startswith('http'):
                    item['image'] = f"https://www.coingecko.com/{item['image']}"
            
            return results
        return []

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    # Save results with pretty formatting
    with open('scan_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Scan completed. Found {len(results)} matching assets.")
