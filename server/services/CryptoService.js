const axios = require("axios");

class CryptoService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10000; // 10 seconds
    this.baseURL = "https://api.coingecko.com/api/v3";
  }

  async getPrice(currency) {
    const cacheKey = currency.toLowerCase();
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const coinId = currency.toLowerCase() === "btc" ? "bitcoin" : "ethereum";
      const response = await axios.get(
        `${this.baseURL}/simple/price?ids=${coinId}&vs_currencies=usd`,
        {
          timeout: 5000,
        }
      );

      const price = response.data[coinId].usd;

      // Cache the price
      this.cache.set(cacheKey, {
        price,
        timestamp: Date.now(),
      });

      return price;
    } catch (error) {
      console.error("Error fetching crypto price:", error.message);

      // Return cached price if available, otherwise default prices
      if (cached) {
        return cached.price;
      }

      // Fallback prices
      return currency.toLowerCase() === "btc" ? 45000 : 3000;
    }
  }

  async getPrices(currencies) {
    const prices = {};
    for (const currency of currencies) {
      prices[currency] = await this.getPrice(currency);
    }
    return prices;
  }
}

module.exports = new CryptoService();
