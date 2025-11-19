
export async function fetchExchangeRates(base: string = 'TWD') {
  try {
    // using a free open API for rates
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Failed to fetch rates", error);
    return null;
  }
}

export async function fetchCryptoPrice(symbol: string) {
  try {
    // CoinGecko ID Mapping
    const idMap: Record<string, string> = {
      'BTC': 'bitcoin', 
      'ETH': 'ethereum', 
      'SOL': 'solana', 
      'USDT': 'tether',
      'DOGE': 'dogecoin',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'AVAX': 'avalanche-2',
      'DOT': 'polkadot'
    };
    const id = idMap[symbol.toUpperCase()];
    if (!id) return null;

    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const data = await response.json();
    return data[id]?.usd;
  } catch (error) {
    console.error("Failed to fetch crypto price", error);
    return null;
  }
}

export async function fetchStockPrice(symbol: string, apiKey?: string) {
  try {
    // Using Finnhub API for stock prices.
    // Note: Public keys are often rate-limited.
    const token = apiKey || 'd4etl81r01ql649g382gd4etl81r01ql649g3830'; 
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${token}`);
    const data = await response.json();
    
    // Finnhub returns 0 for 'c' if symbol is invalid
    if (data.c === 0 && data.d === null) return null;
    
    return data.c; // 'c' is Current price
  } catch (error) {
    console.error("Failed to fetch stock price", error);
    return null;
  }
}
