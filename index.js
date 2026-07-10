const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Парсер проксі-рядків, що підтримує 4 популярні формати
function parseProxyString(proxyStr) {
  if (!proxyStr) return null;
  proxyStr = proxyStr.trim();

  // Видаляємо протоколи, якщо вони вказані
  proxyStr = proxyStr.replace(/^(http|https|socks|socks5):\/\//i, '');

  // Формат 3: USER:PASS@IP:PORT
  if (proxyStr.indexOf('@') !== -1) {
    const parts = proxyStr.split('@');
    const auth = parts[0].split(':');
    const hostPort = parts[1].split(':');
    if (hostPort.length === 2) {
      return {
        host: hostPort[0],
        port: parseInt(hostPort[1], 10),
        user: auth[0] || null,
        pass: auth[1] || null
      };
    }
  }

  const parts = proxyStr.split(':');

  // Формат 1: IP:PORT
  if (parts.length === 2) {
    return {
      host: parts[0],
      port: parseInt(parts[1], 10),
      user: null,
      pass: null
    };
  }

  // Формати 2 та 4: IP:PORT:USER:PASS або USER:PASS:IP:PORT
  if (parts.length === 4) {
    const portCandidate = parseInt(parts[1], 10);
    if (!isNaN(portCandidate) && portCandidate > 0 && portCandidate < 65536) {
      // Формат 2: IP:PORT:USER:PASS
      return {
        host: parts[0],
        port: portCandidate,
        user: parts[2],
        pass: parts[3]
      };
    } else {
      // Формат 4: USER:PASS:IP:PORT
      const portCandidate4 = parseInt(parts[3], 10);
      return {
        host: parts[2],
        port: portCandidate4,
        user: parts[0],
        pass: parts[1]
      };
    }
  }

  return null;
}

app.use(async (req, res) => {
  const targetUrl = `https://api.binance.com${req.originalUrl}`;
  console.log(`[Proxy] ${req.method} -> ${targetUrl}`);
  
  try {
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

    // Обробка проксі-заголовка x-proxy
    const proxyHeader = req.headers['x-proxy'];
    if (proxyHeader) {
      const p = parseProxyString(proxyHeader);
      if (p) {
        let proxyUrl = '';
        if (p.user && p.pass) {
          proxyUrl = `http://${p.user}:${p.pass}@${p.host}:${p.port}`;
        } else {
          proxyUrl = `http://${p.host}:${p.port}`;
        }
        console.log(`[Proxy] Routing request via custom proxy: http://${p.host}:${p.port}`);
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
      } else {
        console.warn(`[Proxy] Failed to parse custom proxy string: "${proxyHeader}"`);
      }
    }

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
