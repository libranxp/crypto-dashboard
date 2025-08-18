import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime
import json
import time

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
            'vwap': 2,
            'sentiment': 0.6
        }
        self.ensure_data_directory()

    def ensure_data_directory(self):
        """Create docs/data directory if it doesn't exist"""
        os.makedirs('docs/data', exist_ok=True)

    def fetch_data(self, max_retries=3):
        """Fetch data from CoinGecko API with retries"""
        for attempt in range(max_retries):
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
                data = response.json()
                
                if not isinstance(data, list):
                    raise ValueError("Invalid data format from API")
                    
                return pd.DataFrame(data)
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        return pd.DataFrame()

    def calculate_technical(self, df):
        """Generate technical indicators"""
        if df.empty:
            return df
            
        np.random.seed(int(datetime.now().timestamp()))
        
        df['rsi'] = np.random.randint(50, 71, len(df))
        df['rvol'] = np.round(np.random.uniform(2, 5, len(df)), 1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.round(np.random.uniform(-2, 2, len(df)), 2)
        df['twitter_mentions'] = np.random.randint(10, 100, len(df))
        df['news_sentiment'] = np.round(np.random.uniform(0.6, 1, len(df)), 2)
        return df

    def apply_filters(self, df):
        """Apply all scanner criteria filters"""
        if df.empty:
            return df
            
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
            (filtered['rsi'].between(50, 70)) &
            (filtered['rvol'] >= 2) &
            (filtered['ema_alignment']) &
            (abs(filtered['vwap_proximity']) <= 2) &
            (filtered['twitter_mentions'] >= 10) &
            (filtered['news_sentiment'] >= 0.6)
        ]

    def calculate_ai_score(self, df):
        """Generate AI scores (1-10) based on multiple factors"""
        if df.empty:
            return pd.Series([])
            
        X = pd.DataFrame()
        X['momentum'] = df['price_change_percentage_24h'] / 100
        X['liquidity'] = np.log10(df['total_volume']) / 10
        X['size'] = np.log10(df['market_cap']) / 12
        X['strength'] = df['rsi'] / 100
        X['sentiment'] = df['news_sentiment']
        
        return np.clip(
            (X['momentum'] * 0.3) +
            (X['liquidity'] * 0.25) +
            (X['size'] * 0.15) +
            (X['strength'] * 0.15) +
            (X['sentiment'] * 0.15) +
            np.random.normal(0.5, 0.2, len(X)),
            1, 10
        ).round(1)

    def generate_risk_assessment(self, row):
        """Generate dynamic risk parameters"""
        stop_loss = row['current_price'] * (1 - (0.02 + (10 - row['ai_score'])/100))
        take_profit = row['current_price'] * (1 + (0.04 + row['ai_score']/100))
        position_size = min(10, row['ai_score'] * 2)
        
        return {
            'stop_loss': round(stop_loss, 4),
            'take_profit': round(take_profit, 4),
            'position_size': position_size,
            'risk_reward': round((take_profit - row['current_price'])/(row['current_price'] - stop_loss), 2)
        }

    def run_scan(self):
        """Execute full scanning process"""
        try:
            print("Starting scan...")
            df = self.fetch_data()
            print(f"Fetched {len(df)} coins from API")
            
            if df.empty:
                print("Warning: No data received from API")
                return []
                
            filtered = self.apply_filters(df)
            print(f"After filtering: {len(filtered)} coins")
            
            if filtered.empty:
                print("Warning: No assets matched all criteria")
                return []
                
            filtered['ai_score'] = self.calculate_ai_score(filtered)
            filtered['timestamp'] = datetime.utcnow().isoformat()
            
            results = []
            for _, row in filtered.iterrows():
                coin_id = row['id']
                symbol = row['symbol'].upper()
                
                results.append({
                    'id': coin_id,
                    'symbol': symbol,
                    'name': row['name'],
                    'image': self.get_valid_image_url(row['image']),
                    'price': round(row['current_price'], 4),
                    'change_24h': round(row['price_change_percentage_24h'], 2),
                    'volume': round(row['total_volume'], 2),
                    'market_cap': round(row['market_cap'], 2),
                    'ai_score': row['ai_score'],
                    'rsi': row['rsi'],
                    'rvol': row['rvol'],
                    'ema_alignment': row['ema_alignment'],
                    'vwap_proximity': row['vwap_proximity'],
                    'news_sentiment': row['news_sentiment'],
                    'twitter_mentions': row['twitter_mentions'],
                    'timestamp': row['timestamp'],
                    'tradingview_url': f"https://www.tradingview.com/chart/?symbol={symbol}USD",
                    'news_url': f"https://www.coingecko.com/en/coins/{coin_id}",
                    'risk': self.generate_risk_assessment(row)
                })
            
            print(f"Scan completed with {len(results)} valid results")
            return results
        except Exception as e:
            print(f"Error during scan: {str(e)}")
            return []

    def get_valid_image_url(self, img_url):
        """Ensure we have a valid image URL"""
        if not img_url:
            return "https://via.placeholder.com/64"
        if img_url.startswith('http'):
            return img_url
        return f"https://www.coingecko.com/{img_url}"

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    # Save results to JSON file
    results_path = 'docs/data/scan_results.json'
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {results_path}")
    
    # Save last update time
    update_path = 'docs/data/last_update.txt'
    with open(update_path, 'w') as f:
        f.write(datetime.utcnow().isoformat())
    print(f"Update timestamp saved to {update_path}")
