"use strict";

const fs = require("fs");
const path = require("path");

// Admin IDs - tylko ci użytkownicy mają dostęp do komend administracyjnych
// Zastąp swoim ID Telegram (możesz sprawdzić swoje ID przez @userinfobot na Telegram)
const ADMIN_IDS = [7647790288]; // ID użytkownika

class TelegramAdmin {
  constructor(bot) {
    this.bot = bot;
    this.dataPath = path.join(__dirname, "../data.json");
    this.setupAdminCommands();
  }

  setupAdminCommands() {
    // User management commands
    this.bot.onText(/\/add_user (.+)/, (msg, match) => {
      this.handleAddUser(msg, match[1]);
    });

    this.bot.onText(/\/remove_user (.+)/, (msg, match) => {
      this.handleRemoveUser(msg, match[1]);
    });

    this.bot.onText(/\/list_users/, (msg) => {
      this.handleListUsers(msg);
    });

    // Proxy management commands
    this.bot.onText(/\/add_proxy (.+)/, (msg, match) => {
      this.handleAddProxy(msg, match[1]);
    });

    this.bot.onText(/\/remove_proxy (.+)/, (msg, match) => {
      this.handleRemoveProxy(msg, match[1]);
    });

    this.bot.onText(/\/list_proxies/, (msg) => {
      this.handleListProxies(msg);
    });

    // Cookie management commands
    this.bot.onText(/\/add_cookie (.+)/, (msg, match) => {
      this.handleAddCookie(msg, match[1]);
    });

    this.bot.onText(/\/remove_cookie (.+)/, (msg, match) => {
      this.handleRemoveCookie(msg, match[1]);
    });

    this.bot.onText(/\/list_cookies/, (msg) => {
      this.handleListCookies(msg);
    });

    // Help command for admin functions
    this.bot.onText(/\/admin_help/, (msg) => {
      this.handleAdminHelp(msg);
    });

    console.log("🔧 Telegram Admin module initialized");
  }

  // Check if user is admin
  isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
  }

  // Load data from file
  loadData() {
    try {
      const data = fs.readFileSync(this.dataPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return default structure
      return {
        users: [],
        proxies: [],
        cookies: []
      };
    }
  }

  // Save data to file
  saveData(data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      return false;
    }
  }

  // User management handlers
  handleAddUser(msg, userId) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!userId) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /add_user <user_id>");
      return;
    }

    const data = this.loadData();
    
    if (data.users.includes(userId)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Użytkownik ${userId} już istnieje na liście.`);
      return;
    }

    data.users.push(userId);
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Użytkownik ${userId} został dodany.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleRemoveUser(msg, userId) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!userId) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /remove_user <user_id>");
      return;
    }

    const data = this.loadData();
    
    if (!data.users.includes(userId)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Użytkownik ${userId} nie istnieje na liście.`);
      return;
    }

    data.users = data.users.filter(id => id !== userId);
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Użytkownik ${userId} został usunięty.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleListUsers(msg) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const data = this.loadData();
    
    if (data.users.length === 0) {
      this.bot.sendMessage(msg.chat.id, "📋 Lista użytkowników jest pusta.");
      return;
    }

    const userList = data.users.map(id => `• ${id}`).join('\n');
    this.bot.sendMessage(msg.chat.id, `📋 Lista użytkowników:\n\n${userList}\n\nŁącznie: ${data.users.length} użytkowników`);
  }

  // Proxy management handlers
  handleAddProxy(msg, proxy) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!proxy) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /add_proxy <proxy_url>");
      return;
    }

    const data = this.loadData();
    
    if (data.proxies.includes(proxy)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Proxy ${proxy} już istnieje na liście.`);
      return;
    }

    data.proxies.push(proxy);
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Proxy ${proxy} zostało dodane.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleRemoveProxy(msg, proxy) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!proxy) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /remove_proxy <proxy_url>");
      return;
    }

    const data = this.loadData();
    
    if (!data.proxies.includes(proxy)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Proxy ${proxy} nie istnieje na liście.`);
      return;
    }

    data.proxies = data.proxies.filter(p => p !== proxy);
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Proxy ${proxy} zostało usunięte.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleListProxies(msg) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const data = this.loadData();
    
    if (data.proxies.length === 0) {
      this.bot.sendMessage(msg.chat.id, "🌐 Lista proxy jest pusta.");
      return;
    }

    const proxyList = data.proxies.map(proxy => `• ${proxy}`).join('\n');
    this.bot.sendMessage(msg.chat.id, `🌐 Lista proxy:\n\n${proxyList}\n\nŁącznie: ${data.proxies.length} proxy`);
  }

  // Cookie management handlers
  handleAddCookie(msg, cookie) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!cookie) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /add_cookie <cookie_data>");
      return;
    }

    const data = this.loadData();
    
    if (data.cookies.includes(cookie)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Cookie ${cookie} już istnieje na liście.`);
      return;
    }

    data.cookies.push(cookie);
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Cookie ${cookie} zostało dodane.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleRemoveCookie(msg, cookie) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!cookie) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /remove_cookie <cookie_data>");
      return;
    }

    const data = this.loadData();
    
    if (!data.cookies.includes(cookie)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Cookie ${cookie} nie istnieje na liście.`);
      return;
    }

    data.cookies = data.cookies.filter(c => c !== cookie);
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Cookie ${cookie} zostało usunięte.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleListCookies(msg) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const data = this.loadData();
    
    if (data.cookies.length === 0) {
      this.bot.sendMessage(msg.chat.id, "🍪 Lista cookies jest pusta.");
      return;
    }

    const cookieList = data.cookies.map(cookie => `• ${cookie}`).join('\n');
    this.bot.sendMessage(msg.chat.id, `🍪 Lista cookies:\n\n${cookieList}\n\nŁącznie: ${data.cookies.length} cookies`);
  }

  // Admin help command
  handleAdminHelp(msg) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const helpMessage = `
🔧 *Komendy Administracyjne*

👥 *Zarządzanie Użytkownikami:*
/add_user <user_id> - Dodaj użytkownika
/remove_user <user_id> - Usuń użytkownika
/list_users - Lista wszystkich użytkowników

🌐 *Zarządzanie Proxy:*
/add_proxy <proxy_url> - Dodaj proxy
/remove_proxy <proxy_url> - Usuń proxy
/list_proxies - Lista wszystkich proxy

🍪 *Zarządzanie Cookies:*
/add_cookie <cookie_data> - Dodaj cookie
/remove_cookie <cookie_data> - Usuń cookie
/list_cookies - Lista wszystkich cookies

👤 *Zarządzanie Kontami:*
/account_help - Pomoc dla zarządzania kontami
/add_account <user_id> <cookie> <proxy> - Dodaj konto
/update_account <user_id> <cookie> <proxy> - Aktualizuj konto
/remove_account <user_id> - Usuń konto
/list_accounts - Lista wszystkich kont

📖 *Pomoc:*
/admin_help - Ta pomoc

*Przykłady:*
/add_user 123456789
/add_proxy socks5://user:pass@host:port
/add_cookie sessionid=abc123
/add_account 123456789 "sessionid=abc123" "socks5://user:pass@host:port"
    `;

    this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
  }

  // Public method to check if user is allowed (for integration with existing bot)
  isUserAllowed(userId) {
    const data = this.loadData();
    return data.users.includes(userId.toString()) || this.isAdmin(userId);
  }

  // Public method to get all data
  getAllData() {
    return this.loadData();
  }

  // Public method to get specific data
  getUsers() {
    return this.loadData().users;
  }

  getProxies() {
    return this.loadData().proxies;
  }

  getCookies() {
    return this.loadData().cookies;
  }
}

module.exports = TelegramAdmin; 