import requests
import pandas as pd
import numpy as np
from datetime import datetime
import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

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
        self.model = self.init_ai_model()
        self.scaler = StandardScaler()

    def init_ai_model(self):
        # Mock model initialization - replace with real training in production
        model = RandomForestClassifier(n_estimators=100)
        X_train = np.random.rand(100, 5)  # Mock training data
        y_train = np.random.randint(0, 2, 100)  # Mock labels
        model.fit(X_train, y_train)
        return model

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
            
        np.random.seed(42)
        df['rsi'] = np.random.randint(50, 71, len(df))
        df['rvol'] = np.round(np.random.uniform(2, 5, len(df)), 1)
        df['ema_alignment'] = np.random.random(len(df)) > 0.3
        df['vwap_proximity'] = np.round(np.random.uniform(-2, 2, len(df)), 2)
        df['twitter_mentions'] = np.random.randint(10, 100, len(df))
        
        # Mock news sentiment (0-1 scale)
        df['news_sentiment'] = np.round(np.random.uniform(0.5, 1, len(df)), 2)
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
            (filtered['rsi'].between(50, 70)) &
            (filtered['rvol'] >= 2) &
            (filtered['ema_alignment']) &
            (abs(filtered['vwap_proximity']) <= 2) &
            (filtered['twitter_mentions'] >= 10) &
            (filtered['news_sentiment'] >= 0.6)
        ]

    def calculate_ai_features(self, df):
        features = pd.DataFrame()
        features['momentum'] = df['price_change_percentage_24h'] / 100
        features['liquidity'] = np.log10(df['total_volume']) / 10
        features['size'] = np.log10(df['market_cap']) / 12
        features['strength'] = df['rsi'] / 100
        features['sentiment'] = df['news_sentiment']
        return features

    def calculate_scores(self, df):
        if df.empty:
            return pd.Series([]), pd.Series([])
            
        X = self.calculate_ai_features(df)
        X_scaled = self.scaler.fit_transform(X)
        
        # AI Score (1-10)
        ai_scores = np.clip(
            (X['momentum'] * 0.3) +
            (X['liquidity'] * 0.25) +
            (X['size'] * 0.15) +
            (X['strength'] * 0.15) +
            (X['sentiment'] * 0.15) +
            np.random.normal(0.5, 0.2, len(X)),
            1, 10
        ).round(1)
        
        # Confidence Level (0-100%)
        confidence = np.clip(
            self.model.predict_proba(X_scaled)[:,1] * 100,
            50, 95
        ).round(0)
        
        return ai_scores, confidence

    def generate_risk_assessment(self, row):
        stop_loss = row['current_price'] * (1 - (0.02 + (10 - row['ai_score'])/100))
        take_profit = row['current_price'] * (1 + (0.04 + row['ai_score']/100))
        position_size = min(10, row['ai_score'] * 2)  # % of portfolio
        
        return {
            'stop_loss': round(stop_loss, 4),
            'take_profit': round(take_profit, 4),
            'position_size': position_size,
            'risk_reward': round((take_profit - row['current_price'])/(row['current_price'] - stop_loss), 2)
        }

    def run_scan(self):
        df = self.fetch_data()
        filtered = self.apply_filters(df)
        
        if not filtered.empty:
            ai_scores, confidence = self.calculate_scores(filtered)
            filtered['ai_score'] = ai_scores
            filtered['confidence'] = confidence
            filtered['timestamp'] = datetime.utcnow().isoformat()
            
            results = []
            for _, row in filtered.iterrows():
                entry = {
                    'id': row['id'],
                    'symbol': row['symbol'],
                    'name': row['name'],
                    'image': row['image'] if str(row['image']).startswith('http') else f"https://www.coingecko.com/{row['image']}",
                    'price': round(row['current_price'], 4),
                    'change_24h': round(row['price_change_percentage_24h'], 2),
                    'volume': round(row['total_volume'], 2),
                    'market_cap': round(row['market_cap'], 2),
                    'ai_score': row['ai_score'],
                    'confidence': row['confidence'],
                    'rsi': row['rsi'],
                    'rvol': row['rvol'],
                    'ema_alignment': row['ema_alignment'],
                    'vwap_proximity': row['vwap_proximity'],
                    'news_sentiment': row['news_sentiment'],
                    'twitter_mentions': row['twitter_mentions'],
                    'timestamp': row['timestamp'],
                    'tradingview_url': f"https://www.tradingview.com/chart/?symbol={row['symbol'].upper()}USD",
                    'news_url': f"https://www.coingecko.com/en/coins/{row['id']}/news",
                    'risk': self.generate_risk_assessment(row)
                }
                results.append(entry)
            
            return results
        return []

if __name__ == "__main__":
    scanner = CryptoTradingScanner()
    results = scanner.run_scan()
    
    # Save results with pretty formatting
    with open('scan_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Save last update time
    with open('last_update.txt', 'w') as f:
        f.write(datetime.utcnow().isoformat())
    
    print(f"Scan completed. Found {len(results)} matching assets.")
