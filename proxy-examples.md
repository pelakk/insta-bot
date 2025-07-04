# Proxy Configuration Examples

This document shows how to configure different types of proxies with the Instagram bot.

## Basic Proxy Setup

### 1. HTTP/HTTPS Proxy

```bash
# .env file
PROXY_SERVER=127.0.0.1:8080
```

### 2. HTTP/HTTPS Proxy with Authentication

```bash
# .env file
PROXY_SERVER=proxy.example.com:8080
PROXY_AUTH=username:password
```

### 3. SOCKS5 Proxy

```bash
# .env file
PROXY_SERVER=socks5://127.0.0.1:1080
```

### 4. SOCKS5 Proxy with Authentication

```bash
# .env file
PROXY_SERVER=socks5://proxy.example.com:1080
PROXY_AUTH=username:password
```

## Advanced Proxy Setup

### Multiple Proxy Rotation

Use the `proxy-advanced.js` file for advanced proxy management with rotation.

```bash
# .env file
PROXY_LIST=proxy1.com:8080@user1:pass1,proxy2.com:8080@user2:pass2,proxy3.com:8080
```

### Docker with Proxy

```yaml
# docker-compose.yml
version: '3.8'
services:
  instabot:
    build: .
    environment:
      - INSTAGRAM_USERNAME=your_username
      - INSTAGRAM_PASSWORD=your_password
      - PROXY_SERVER=proxy.example.com:8080
      - PROXY_AUTH=username:password
      - MAX_FOLLOWS_PER_HOUR=20
      - MAX_FOLLOWS_PER_DAY=150
    volumes:
      - ./data:/app/data
```

## Popular Proxy Services

### 1. Bright Data (formerly Luminati)
```bash
PROXY_SERVER=brd.superproxy.io:22225
PROXY_AUTH=username:password
```

### 2. Oxylabs
```bash
PROXY_SERVER=pr.oxylabs.io:7777
PROXY_AUTH=username:password
```

### 3. SmartProxy
```bash
PROXY_SERVER=gate.smartproxy.com:7000
PROXY_AUTH=username:password
```

### 4. ProxyMesh
```bash
PROXY_SERVER=proxy.proxymesh.com:31280
PROXY_AUTH=username:password
```

## Testing Proxy Connection

Create a test file to verify your proxy works:

```javascript
// test-proxy.js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${process.env.PROXY_SERVER}`,
    ],
  });

  const page = await browser.newPage();
  
  if (process.env.PROXY_AUTH) {
    const [username, password] = process.env.PROXY_AUTH.split(':');
    await page.authenticate({ username, password });
  }

  try {
    await page.goto('https://httpbin.org/ip');
    const content = await page.content();
    console.log('Current IP:', content);
  } catch (error) {
    console.error('Proxy test failed:', error);
  }

  await browser.close();
})();
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Check if proxy server is running and accessible
2. **Authentication failed**: Verify username/password
3. **Timeout**: Proxy might be slow or overloaded
4. **Instagram blocking**: Try rotating proxies more frequently

### Best Practices

1. **Use residential proxies** for better success rates
2. **Rotate proxies** every few hours or when errors occur
3. **Test proxies** before using them with the bot
4. **Monitor proxy performance** and replace slow ones
5. **Use proxies from different countries** to avoid detection

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PROXY_SERVER` | Proxy server address and port | `127.0.0.1:8080` |
| `PROXY_AUTH` | Proxy authentication (username:password) | `user:pass` |
| `PROXY_LIST` | Multiple proxies for rotation | `proxy1:8080,proxy2:8080` |
| `FOLLOW_USER_MIN_FOLLOWERS` | Minimum followers required | `50` |
| `FOLLOW_USER_MAX_FOLLOWERS` | Maximum followers allowed | `5000` |
| `FOLLOW_USER_MIN_FOLLOWING` | Minimum following required | `50` |
| `FOLLOW_USER_MAX_FOLLOWING` | Maximum following allowed | `2000` | 