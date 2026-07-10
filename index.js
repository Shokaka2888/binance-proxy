const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.all('*', async (req, res) => {
  const targetUrl = `https://api.binance.com${req.originalUrl}`;
  console.log(`[Proxy] ${req.method} -> ${targetUrl}`);
  
  try {
    // Форвардимо тільки необхідні заголовки
    const headers = {};
    if (req.headers['x-mbx-apikey']) {
      headers['X-MBX-APIKEY'] = req.headers['x-mbx-apikey'];
    }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true
    };

    // Надсилаємо body тільки для методів, які його підтримують
    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
      axiosConfig.data = req.body;
    }

    const response = await axios(axiosConfig);
    console.log(`[Proxy] Response: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Proxy] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
