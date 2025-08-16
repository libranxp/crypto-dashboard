from flask import Flask, jsonify
import pandas as pd
import requests
from datetime import datetime, timedelta
import yfinance as yf
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()  # Load API keys from .env

app = Flask(__name__)

# ===== COINGECKO API =====
class CoinGeckoAPI:
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        
    def get_market_data(self):
        url = f"{self.base_url}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250"
        response = requests.get(url)
        return pd.DataFrame(response.json())

# ===== YAHOO FINANCE (NEWS) =====
def get_crypto_news(ticker="BTC-USD"):
    stock = yf.Ticker(ticker)
    news = stock.news
    return news

# ===== SCANNER ENGINE =====
class Scanner:
    def __init__(self, df):
        self.df = df
        
    def apply_filters(self):
        # Price filter ($0.001–$100)
        filtered = self.df[(self.df['current_price'] >= 0.001) & (self.df['current_price'] <= 100)]
        
        # Volume (> $10M 24h)
        filtered = filtered[filtered['total_volume'] > 10_000_000]
        
        # Price Change (+2% to +20%)
        filtered = filtered[(filtered['price_change_percentage_24h'] >= 2) & 
                           (filtered['price_change_percentage_24h'] <= 20)]
        
        # Market Cap ($10M–$5B)
        filtered = filtered[(filtered['market_cap'] >= 10_000_000) & (filtered['market_cap'] <= 5_000_000_000)]
        
        return filtered

# ===== AI SCORING MODEL =====
class AIScorer:
    def __init__(self):
        self.model = RandomForestRegressor()
        self.scaler = StandardScaler()
        
    def train(self, X, y):
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        
    def predict(self, X):
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

# ===== FLASK API ENDPOINTS =====
@app.route('/api/scan', methods=['GET'])
def scan_crypto():
    cg = CoinGeckoAPI()
    df = cg.get_market_data()
    
    scanner = Scanner(df)
    filtered = scanner.apply_filters()
    
    # AI Scoring (Mock for now)
    scorer = AIScorer()
    X = filtered[['current_price', 'total_volume', 'price_change_percentage_24h', 'market_cap']]
    scores = scorer.predict(X) if hasattr(scorer, 'model') else np.random.uniform(5, 9, len(filtered))
    
    results = filtered.to_dict('records')
    for i, record in enumerate(results):
        record['ai_score'] = float(scores[i])
        record['news'] = get_crypto_news(f"{record['symbol'].upper()}-USD")[:3]  # Top 3 news
        
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
