# 🤖 Instauto - Instagram Automation Bot

**Multi-instance Instagram automation with proxy support and sessionid authentication**

## 🚀 Quick Start with Sessionid (Recommended)

**Avoid login blocks by using sessionid instead of username/password:**

1. **Get sessionid from browser** (while logged into Instagram):

```javascript
// Run in browser console (F12 > Console):
document.cookie
  .split(";")
  .find((row) => row.startsWith("sessionid"))
  .split("=")[1];
```

2. **Update ecosystem.config.js**:

```javascript
INSTAGRAM_SESSIONID: "your_sessionid_here";
INSTAGRAM_USERNAME: ""; // Leave empty when using sessionid
INSTAGRAM_PASSWORD: ""; // Leave empty when using sessionid
```

3. **Start instances**:

```bash
pm2 start ecosystem.config.js
pm2 logs --lines 50
```

📖 **Full sessionid guide**: See [README_SESSIONID.md](README_SESSIONID.md)

---

## Original Documentation

najpierw zobacz README_PM2.md

potem zobacz README_LINUX.md
