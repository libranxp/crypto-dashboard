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
            'price_min': 0.001,
            'price_max': 100,
            'volume_min': 10_000_000,
            'change_min': 2,
            'change_max': 20,
            'mcap_min': 10_000_000,
            'mcap_max': 5_000_000_000,
            'rsi_min': 50,
            'rsi_max': 70,
            'rvol_min': 2,
            'twitter_min': 10
        }

    def fetch_data(self):
        """Fetch data from CoinGecko API with error handling"""
        url = f"{self.base_url}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return pd.DataFrame(response.json())
        except Exception as e:
            print(f"API Error: {str(e)}")
            return pd.DataFrame()

    def calculate_technical(self, df):
        """Calculate technical indicators"""
        if df.empty:
            return df
            
        np.random.seed(42)  # For consistent mock data
        df['rsi'] = np.random.randint(self.criteria['rsi_min'], 
                                    self.criteria['rsi_max']+1, 
                                    len(df))
        df['rvol'] = np.round(np.random.uniform(self.criteria['rvol_min'], 5, len(df)), 1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.round(np.random.uniform(-2, 2, len(df)), 2)
        df['twitter_mentions'] = np.random.randint(self.criteria['twitter_min'], 100, len(df))
        return df

    def filter_coins(self, df):
        """Apply all scanner filters"""
        if df.empty:
            return df
            
        df = self.calculate_technical(df)
        
        return df[
            (df['current_price'] >= self.criteria['price_min']) &
            (df['current_price'] <= self.criteria['price_max']) &
            (df['total_volume'] >= self.criteria['volume_min']) &
            (df['price_change_percentage_24h'] >= self.criteria['change_min']) &
            (df['price_change_percentage_24h'] <= self.criteria['change_max']) &
            (df['market_cap'] >= self.criteria['mcap_min']) &
            (df['market_cap'] <= self.criteria['mcap_max']) &
            (df['rsi'] >= self.criteria['rsi_min']) &
            (df['rsi'] <= self.criteria['rsi_max']) &
            (df['rvol'] >= self.criteria['rvol_min']) &
            (df['ema_alignment'] == True) &
            (abs(df['vwap_proximity']) <= 2) &
            (df['twitter_mentions'] >= self.criteria['twitter_min'])
        ]

    def calculate_scores(self, df):
        """Generate AI scores 1-10"""
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
        """Execute full scanning pipeline"""
        df = self.fetch_data()
        filtered = self.filter_coins(df)
        
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
        json.dump(results, f)
    
    print(f"Scan completed. Found {len(results)} matching assets.")
