
import { getAuth } from "firebase/auth";
import { ADMIN_EMAILS, fetchPriceWithAI } from "./gemini";

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
  let price: number | null = null;

  // 1. Try Finnhub First
  try {
    // Determine API Key to use
    let token = apiKey;

    if (!token) {
        // If no user key provided, check if user is admin
        const auth = getAuth();
        const user = auth.currentUser;
        const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

        if (isAdmin) {
            // Using System Finnhub API Key for admins
            token = 'd4etl81r01ql649g382gd4etl81r01ql649g3830'; 
        }
    }

    if (token) {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${token}`);
        const data = await response.json();
        
        // Finnhub returns 0 for 'c' if symbol is invalid or not found
        if (data.c && data.c > 0) {
            price = data.c;
        }
    }
  } catch (error) {
    console.error("Failed to fetch stock price from Finnhub", error);
  }

  // 2. Fallback to Gemini AI with Grounding
  if (!price) {
      console.log(`Finnhub failed for ${symbol}, attempting AI fetch...`);
      price = await fetchPriceWithAI(symbol);
  }

  return price;
}
