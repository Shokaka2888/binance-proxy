const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.all('*', async (req, res) => {
  const targetUrl = `https://api.binance.com${req.originalUrl}`;
  try {
    const headers = { ...req.headers };
    // Видаляємо заголовки, які можуть заважати проксіюванню
    delete headers.host;
    delete headers['content-length'];
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: headers,
      data: req.body,
      validateStatus: () => true
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
