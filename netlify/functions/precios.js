const AV_KEY = 'XZDN7HQTY0NWBCOM';

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
      const res = await fetch(
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
    if (type === 'stocks' && tickers?.length) {
      const prices = {};

      await Promise.all(tickers.map(async ticker => {
        try {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`
          );
          const data = await res.json();
          const price = parseFloat(data?.['Global Quote']?.['05. price']);
          if (price > 0) prices[ticker] = price;
        } catch(e) {
          console.warn('Failed for', ticker, e.message);
        }
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ prices })
      };
    }

    // ── PRECIO CRYPTO (CoinGecko — sin API key) ──
    if (type === 'crypto') {
      const res = await fetch(
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
