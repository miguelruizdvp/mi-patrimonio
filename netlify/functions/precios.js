const AV_KEY = 'WIEAH86G93CDC6DD';

const fetchWithTimeout = (url, ms = 5000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { tickers, type } = JSON.parse(event.body || '{}');

    // ── TIPO DE CAMBIO EUR/USD ──
    if (type === 'eurusd') {
      const res = await fetchWithTimeout(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${AV_KEY}`
      );
      const data = await res.json();
      const rate = parseFloat(data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ rate: rate > 0 ? rate : 1.08 })
      };
    }

    // ── PRECIOS DE ACCIONES ──
    // Use batch endpoint to get all prices in ONE call
    if (type === 'stocks' && tickers?.length) {
      const prices = {};

      // Process sequentially, 2 at a time, with short delay
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        try {
          const res = await fetchWithTimeout(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`,
            4000
          );
          const data = await res.json();
          const price = parseFloat(data?.['Global Quote']?.['05. price']);
          if (price > 0) prices[ticker] = price;
        } catch(e) {
          console.warn('Failed for', ticker);
        }
        // Small delay between requests
        if (i < tickers.length - 1) await delay(500);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ prices })
      };
    }

    // ── PRECIO CRYPTO ──
    if (type === 'crypto') {
      const res = await fetchWithTimeout(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=eur'
      );
      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          BTC: data?.bitcoin?.eur,
          ETH: data?.ethereum?.eur,
          SOL: data?.solana?.eur,
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };

  } catch(e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};
