"use strict";

const fs = require("fs");
const path = require("path");

// Admin IDs - tylko ci użytkownicy mają dostęp do komend administracyjnych
// Zastąp swoim ID Telegram (możesz sprawdzić swoje ID przez @userinfobot na Telegram)
const ADMIN_IDS = [7647790288]; // ID użytkownika

// Allowed config keys with their descriptions
const ALLOWED_CONFIG_KEYS = {
  "MAX_FOLLOWS_PER_HOUR": "Maksymalna liczba followów na godzinę (1-50)",
  "MAX_FOLLOWS_PER_DAY": "Maksymalna liczba followów na dzień (1-200)",
  "MAX_LIKES_PER_DAY": "Maksymalna liczba likeów na dzień (0-100)",
  "ENABLE_LIKES": "Włącz/wyłącz likeowanie (true/false)",
  "FOLLOW_USER_MIN_FOLLOWERS": "Minimalna liczba followers użytkownika (0-10000)",
  "FOLLOW_USER_MAX_FOLLOWERS": "Maksymalna liczba followers użytkownika (0-10000)",
  "FOLLOW_USER_MIN_FOLLOWING": "Minimalna liczba following użytkownika (0-10000)",
  "FOLLOW_USER_MAX_FOLLOWING": "Maksymalna liczba following użytkownika (0-10000)"
};

class TelegramAccounts {
  constructor(bot) {
    this.bot = bot;
    this.dataPath = path.join(__dirname, "../data.json");
    this.setupAccountCommands();
  }

  setupAccountCommands() {
    // Account management commands (admin only)
    this.bot.onText(/\/add_account (.+)/, (msg, match) => {
      this.handleAddAccount(msg, match[1]);
    });

    this.bot.onText(/\/update_account (.+)/, (msg, match) => {
      this.handleUpdateAccount(msg, match[1]);
    });

    this.bot.onText(/\/remove_account (.+)/, (msg, match) => {
      this.handleRemoveAccount(msg, match[1]);
    });

    this.bot.onText(/\/list_accounts/, (msg) => {
      this.handleListAccounts(msg);
    });

    this.bot.onText(/\/get_account (.+)/, (msg, match) => {
      this.handleGetAccount(msg, match[1]);
    });

    // Target management commands (account owners only)
    this.bot.onText(/\/add_target (.+)/, (msg, match) => {
      this.handleAddTarget(msg, match[1]);
    });

    this.bot.onText(/\/remove_target (.+)/, (msg, match) => {
      this.handleRemoveTarget(msg, match[1]);
    });

    this.bot.onText(/\/my_targets/, (msg) => {
      this.handleMyTargets(msg);
    });

    // Config management commands
    this.bot.onText(/\/set_config (.+)/, (msg, match) => {
      this.handleSetConfig(msg, match[1]);
    });

    this.bot.onText(/\/get_config/, (msg) => {
      this.handleGetConfig(msg);
    });

    // Help command for account functions
    this.bot.onText(/\/account_help/, (msg) => {
      this.handleAccountHelp(msg);
    });

    console.log("👤 Telegram Accounts module initialized");
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
        cookies: [],
        accounts: []
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

  // Get or create account for user
  getOrCreateAccount(userId) {
    const data = this.loadData();
    let account = data.accounts.find(acc => acc.user_id === parseInt(userId));
    
    if (!account) {
      // Create new account with default values
      account = {
        user_id: parseInt(userId),
        cookie: "",
        proxy: "",
        targets: [],
        config: {
          "MAX_FOLLOWS_PER_HOUR": "20",
          "MAX_FOLLOWS_PER_DAY": "150",
          "MAX_LIKES_PER_DAY": "30",
          "ENABLE_LIKES": "false",
          "FOLLOW_USER_MIN_FOLLOWERS": "50",
          "FOLLOW_USER_MAX_FOLLOWERS": "5000",
          "FOLLOW_USER_MIN_FOLLOWING": "50",
          "FOLLOW_USER_MAX_FOLLOWING": "2000"
        }
      };
      data.accounts.push(account);
      this.saveData(data);
    } else if (!account.config) {
      // Migrate old account to new config structure
      account.config = {
        "MAX_FOLLOWS_PER_HOUR": "20",
        "MAX_FOLLOWS_PER_DAY": "150",
        "MAX_LIKES_PER_DAY": "30",
        "ENABLE_LIKES": "false",
        "FOLLOW_USER_MIN_FOLLOWERS": "50",
        "FOLLOW_USER_MAX_FOLLOWERS": "5000",
        "FOLLOW_USER_MIN_FOLLOWING": "50",
        "FOLLOW_USER_MAX_FOLLOWING": "2000"
      };
      this.saveData(data);
    }
    
    return account;
  }

  // Get USERS_TO_FOLLOW string for account
  getUsersToFollow(userId) {
    const account = this.getOrCreateAccount(userId);
    return account.targets.map(target => target.replace('@', '')).join(',');
  }

  // Account management handlers (admin only)
  handleAddAccount(msg, args) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const parts = args.split(' ');
    if (parts.length < 5) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /add_account <user_id> <instagram_username> <instagram_password> <cookie> <proxy>");
      return;
    }

    const userId = parseInt(parts[0]);
    const instagramUsername = parts[1];
    const instagramPassword = parts[2];
    const cookie = parts[3];
    const proxy = parts.slice(4).join(' '); // Proxy może zawierać spacje

    if (isNaN(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Nieprawidłowy user_id. Musi być liczbą.");
      return;
    }

    const data = this.loadData();
    
    // Check if account already exists
    if (data.accounts.find(acc => acc.user_id === userId)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Konto dla użytkownika ${userId} już istnieje.`);
      return;
    }

    // Add new account
    data.accounts.push({
      user_id: userId,
      username: instagramUsername,
      password: instagramPassword,
      cookie: cookie,
      proxy: proxy,
      targets: []
    });
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Konto dla użytkownika ${userId} zostało dodane.\n\nUsername: ${instagramUsername}\nPassword: ${'*'.repeat(instagramPassword.length)}\nCookie: ${cookie}\nProxy: ${proxy}\n\nUżyj /add_target @username aby dodać targety do USERS_TO_FOLLOW`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleUpdateAccount(msg, args) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const parts = args.split(' ');
    if (parts.length < 5) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /update_account <user_id> <instagram_username> <instagram_password> <cookie> <proxy>");
      return;
    }

    const userId = parseInt(parts[0]);
    const instagramUsername = parts[1];
    const instagramPassword = parts[2];
    const cookie = parts[3];
    const proxy = parts.slice(4).join(' '); // Proxy może zawierać spacje

    if (isNaN(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Nieprawidłowy user_id. Musi być liczbą.");
      return;
    }

    const data = this.loadData();
    
    // Check if account exists
    const accountIndex = data.accounts.findIndex(acc => acc.user_id === userId);
    if (accountIndex === -1) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Konto dla użytkownika ${userId} nie istnieje. Użyj /add_account aby dodać nowe konto.`);
      return;
    }

    // Update existing account
    const oldAccount = data.accounts[accountIndex];
    data.accounts[accountIndex] = {
      user_id: userId,
      username: instagramUsername,
      password: instagramPassword,
      cookie: cookie,
      proxy: proxy,
      targets: oldAccount.targets // Preserve existing targets
    };
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Konto dla użytkownika ${userId} zostało zaktualizowane.\n\nUsername: ${instagramUsername}\nPassword: ${'*'.repeat(instagramPassword.length)}\nCookie: ${cookie}\nProxy: ${proxy}\n\nZachowane targety: ${oldAccount.targets.length}`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleRemoveAccount(msg, userIdStr) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!userIdStr) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /remove_account <user_id>");
      return;
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Nieprawidłowy user_id. Musi być liczbą.");
      return;
    }

    const data = this.loadData();
    
    const accountIndex = data.accounts.findIndex(acc => acc.user_id === userId);
    if (accountIndex === -1) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Konto dla użytkownika ${userId} nie istnieje.`);
      return;
    }

    const removedAccount = data.accounts.splice(accountIndex, 1)[0];
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Konto dla użytkownika ${userId} zostało usunięte.\n\nUsunięte dane:\nCookie: ${removedAccount.cookie}\nProxy: ${removedAccount.proxy}\nTargets: ${removedAccount.targets.length}`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleListAccounts(msg) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const data = this.loadData();
    
    if (data.accounts.length === 0) {
      this.bot.sendMessage(msg.chat.id, "📋 Lista kont jest pusta.");
      return;
    }

    const accountList = data.accounts.map(acc => {
      const usersToFollow = acc.targets.map(target => target.replace('@', '')).join(',');
      return `• User ID: ${acc.user_id}\n  Proxy: ${acc.proxy || 'Brak'}\n  Targets: ${acc.targets.length}\n  USERS_TO_FOLLOW: ${usersToFollow || 'Brak'}`;
    }).join('\n\n');

    this.bot.sendMessage(msg.chat.id, `📋 Lista kont:\n\n${accountList}\n\nŁącznie: ${data.accounts.length} kont`);
  }

  handleGetAccount(msg, userIdStr) {
    if (!this.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    if (!userIdStr) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /get_account <user_id>");
      return;
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Nieprawidłowy user_id. Musi być liczbą.");
      return;
    }

    const data = this.loadData();
    const account = data.accounts.find(acc => acc.user_id === userId);
    
    if (!account) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Konto dla użytkownika ${userId} nie istnieje.`);
      return;
    }

    const usersToFollow = this.getUsersToFollow(userId);
    const accountInfo = `
📋 Konto użytkownika ${userId}

🍪 Cookie: ${account.cookie || 'Brak'}
🌐 Proxy: ${account.proxy || 'Brak'}
🎯 Targets (${account.targets.length}):
${account.targets.length > 0 ? account.targets.map(target => `• ${target}`).join('\n') : 'Brak targetów'}
📝 USERS_TO_FOLLOW: ${usersToFollow || 'Brak'}
    `;

    this.bot.sendMessage(msg.chat.id, accountInfo);
  }

  // Target management handlers (account owners only)
  handleAddTarget(msg, target) {
    if (!target) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /add_target @target");
      return;
    }

    // Ensure target starts with @
    if (!target.startsWith('@')) {
      target = '@' + target;
    }

    const userId = msg.from.id;
    const account = this.getOrCreateAccount(userId);
    
    if (account.targets.includes(target)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Target ${target} już istnieje na Twojej liście.`);
      return;
    }

    // Update account
    const data = this.loadData();
    const accountIndex = data.accounts.findIndex(acc => acc.user_id === userId);
    
    if (accountIndex === -1) {
      // Create new account
      data.accounts.push({
        user_id: userId,
        cookie: "",
        proxy: "",
        targets: [target]
      });
    } else {
      // Update existing account
      data.accounts[accountIndex].targets.push(target);
    }
    
    if (this.saveData(data)) {
      const usersToFollow = this.getUsersToFollow(userId);
      this.bot.sendMessage(msg.chat.id, `✅ Target ${target} został dodany do Twojej listy.\n\n📝 USERS_TO_FOLLOW: ${usersToFollow || 'Brak'}`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleRemoveTarget(msg, target) {
    if (!target) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /remove_target @target");
      return;
    }

    // Ensure target starts with @
    if (!target.startsWith('@')) {
      target = '@' + target;
    }

    const userId = msg.from.id;
    const data = this.loadData();
    const accountIndex = data.accounts.findIndex(acc => acc.user_id === userId);
    
    if (accountIndex === -1) {
      this.bot.sendMessage(msg.chat.id, "⚠️ Nie masz jeszcze żadnych targetów.");
      return;
    }

    const account = data.accounts[accountIndex];
    
    if (!account.targets.includes(target)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Target ${target} nie istnieje na Twojej liście.`);
      return;
    }

    account.targets = account.targets.filter(t => t !== target);
    
    if (this.saveData(data)) {
      const usersToFollow = this.getUsersToFollow(userId);
      this.bot.sendMessage(msg.chat.id, `✅ Target ${target} został usunięty z Twojej listy.\n\n📝 USERS_TO_FOLLOW: ${usersToFollow || 'Brak'}`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleMyTargets(msg) {
    const userId = msg.from.id;
    const account = this.getOrCreateAccount(userId);
    
    if (account.targets.length === 0) {
      this.bot.sendMessage(msg.chat.id, "🎯 Nie masz jeszcze żadnych targetów.\n\nUżyj /add_target @target aby dodać target do USERS_TO_FOLLOW");
      return;
    }

    const usersToFollow = this.getUsersToFollow(userId);
    const targetsList = account.targets.map(target => `• ${target}`).join('\n');
    this.bot.sendMessage(msg.chat.id, `🎯 Twoje targety:\n\n${targetsList}\n\n📝 USERS_TO_FOLLOW: ${usersToFollow}\n\nŁącznie: ${account.targets.length} targetów`);
  }

  // Account help command
  handleAccountHelp(msg) {
    const helpMessage = `
👤 *Zarządzanie Kontami*

*Komendy Administracyjne (tylko admini):*
/add_account <user_id> <instagram_username> <instagram_password> <cookie> <proxy> - Dodaj konto
/update_account <user_id> <instagram_username> <instagram_password> <cookie> <proxy> - Aktualizuj konto
/remove_account <user_id> - Usuń konto
/list_accounts - Lista wszystkich kont
/get_account <user_id> - Szczegóły konta

*Komendy Użytkownika:*
/add_target @target - Dodaj target do USERS_TO_FOLLOW
/remove_target @target - Usuń target z USERS_TO_FOLLOW
/my_targets - Pokaż swoje targety

*Przykłady:*
/add_account 123456789 my_instagram_username "sessionid=abc123" "socks5://user:pass@host:port"
/update_account 123456789 my_instagram_username "sessionid=abc123" "socks5://user:pass@host:port"
/add_target @instagram
/remove_target @target_user

*Uwagi:*
• Tylko admini mogą zarządzać kontami
• Każdy użytkownik może zarządzać swoimi targetami
• Targety automatycznie otrzymują prefix @
• Targety są używane jako USERS_TO_FOLLOW w kodzie
• Instagram username to nazwa użytkownika na Instagramie (np. selenagomez, nike)
• /update_account zachowuje istniejące targety
    `;

    this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
  }

  // Public method to check if user has account
  hasAccount(userId) {
    const data = this.loadData();
    return data.accounts.some(acc => acc.user_id === userId);
  }

  // Public method to get user account
  getUserAccount(userId) {
    return this.getOrCreateAccount(userId);
  }

  // Public method to get all accounts
  getAllAccounts() {
    return this.loadData().accounts;
  }

  // Public method to get account by user ID
  getAccountByUserId(userId) {
    const data = this.loadData();
    return data.accounts.find(acc => acc.user_id === userId);
  }

  // Public method to get USERS_TO_FOLLOW for user
  getUsersToFollowForUser(userId) {
    return this.getUsersToFollow(userId);
  }

  // Config management handlers
  handleSetConfig(msg, args) {
    const userId = msg.from.id;
    const account = this.getOrCreateAccount(userId);
    
    // Parse config from args
    const parts = args.split(' ');
    if (parts.length < 2) {
      const allowedKeys = Object.keys(ALLOWED_CONFIG_KEYS).join(', ');
      this.bot.sendMessage(msg.chat.id, `❌ Użycie: /set_config <klucz> <wartość>\n\nDozwolone klucze: ${allowedKeys}\n\nPrzykłady:\n/set_config MAX_FOLLOWS_PER_HOUR 20\n/set_config ENABLE_LIKES true`);
      return;
    }

    const key = parts[0].toUpperCase();
    const value = parts.slice(1).join(' ');

    // Check if key is allowed
    if (!ALLOWED_CONFIG_KEYS[key]) {
      const allowedKeys = Object.keys(ALLOWED_CONFIG_KEYS).join(', ');
      this.bot.sendMessage(msg.chat.id, `❌ Nieprawidłowy klucz: ${key}\n\nDozwolone klucze: ${allowedKeys}`);
      return;
    }

    // Validate value based on key
    const validationError = this.validateConfigValue(key, value);
    if (validationError) {
      this.bot.sendMessage(msg.chat.id, `❌ ${validationError}`);
      return;
    }

    // Update account config
    const data = this.loadData();
    const accountIndex = data.accounts.findIndex(acc => acc.user_id === userId);
    
    if (accountIndex === -1) {
      this.bot.sendMessage(msg.chat.id, "❌ Nie masz jeszcze skonfigurowanego konta. Skontaktuj się z administratorem.");
      return;
    }

    // Update config
    data.accounts[accountIndex].config[key] = value;
    
    if (this.saveData(data)) {
      this.bot.sendMessage(msg.chat.id, `✅ Konfiguracja zaktualizowana!\n\n${key} = ${value}\n\nUżyj /get_config aby zobaczyć pełną konfigurację.`);
    } else {
      this.bot.sendMessage(msg.chat.id, "❌ Błąd podczas zapisywania danych.");
    }
  }

  handleGetConfig(msg) {
    const userId = msg.from.id;
    const account = this.getOrCreateAccount(userId);
    
    if (!account.config) {
      this.bot.sendMessage(msg.chat.id, "⚠️ Nie masz jeszcze skonfigurowanego konta.");
      return;
    }

    const configInfo = `
📋 Konfiguracja Twojego konta:

🕐 Rate Limits:
• MAX_FOLLOWS_PER_HOUR: ${account.config.MAX_FOLLOWS_PER_HOUR || "20"}
• MAX_FOLLOWS_PER_DAY: ${account.config.MAX_FOLLOWS_PER_DAY || "150"}
• MAX_LIKES_PER_DAY: ${account.config.MAX_LIKES_PER_DAY || "30"}

❤️ Likes:
• ENABLE_LIKES: ${account.config.ENABLE_LIKES || "false"}

👥 Follow Filters:
• FOLLOW_USER_MIN_FOLLOWERS: ${account.config.FOLLOW_USER_MIN_FOLLOWERS || "50"}
• FOLLOW_USER_MAX_FOLLOWERS: ${account.config.FOLLOW_USER_MAX_FOLLOWERS || "5000"}
• FOLLOW_USER_MIN_FOLLOWING: ${account.config.FOLLOW_USER_MIN_FOLLOWING || "50"}
• FOLLOW_USER_MAX_FOLLOWING: ${account.config.FOLLOW_USER_MAX_FOLLOWING || "2000"}

Użyj /set_config <klucz> <wartość> aby zmienić konfigurację.
    `;

    this.bot.sendMessage(msg.chat.id, configInfo);
  }

  // Validate config value based on key
  validateConfigValue(key, value) {
    switch (key) {
      case "MAX_FOLLOWS_PER_HOUR":
        const hourVal = parseInt(value);
        if (isNaN(hourVal) || hourVal < 1 || hourVal > 50) {
          return "MAX_FOLLOWS_PER_HOUR musi być liczbą między 1 a 50";
        }
        break;
      
      case "MAX_FOLLOWS_PER_DAY":
        const dayVal = parseInt(value);
        if (isNaN(dayVal) || dayVal < 1 || dayVal > 200) {
          return "MAX_FOLLOWS_PER_DAY musi być liczbą między 1 a 200";
        }
        break;
      
      case "MAX_LIKES_PER_DAY":
        const likesVal = parseInt(value);
        if (isNaN(likesVal) || likesVal < 0 || likesVal > 100) {
          return "MAX_LIKES_PER_DAY musi być liczbą między 0 a 100";
        }
        break;
      
      case "ENABLE_LIKES":
        if (value.toLowerCase() !== "true" && value.toLowerCase() !== "false") {
          return "ENABLE_LIKES musi być 'true' lub 'false'";
        }
        break;
      
      case "FOLLOW_USER_MIN_FOLLOWERS":
      case "FOLLOW_USER_MAX_FOLLOWERS":
      case "FOLLOW_USER_MIN_FOLLOWING":
      case "FOLLOW_USER_MAX_FOLLOWING":
        const numVal = parseInt(value);
        if (isNaN(numVal) || numVal < 0 || numVal > 10000) {
          return `${key} musi być liczbą między 0 a 10000`;
        }
        break;
      
      default:
        return `Nieznany klucz: ${key}`;
    }
    
    return null; // No error
  }

  // Public method to get user config
  getUserConfig(userId) {
    const account = this.getOrCreateAccount(userId);
    return account.config || {
      "MAX_FOLLOWS_PER_HOUR": "20",
      "MAX_FOLLOWS_PER_DAY": "150",
      "MAX_LIKES_PER_DAY": "30",
      "ENABLE_LIKES": "false",
      "FOLLOW_USER_MIN_FOLLOWERS": "50",
      "FOLLOW_USER_MAX_FOLLOWERS": "5000",
      "FOLLOW_USER_MIN_FOLLOWING": "50",
      "FOLLOW_USER_MAX_FOLLOWING": "2000"
    };
  }
}

module.exports = TelegramAccounts; 