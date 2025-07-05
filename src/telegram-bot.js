"use strict";

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs-extra");
const path = require("path");
const TelegramAdmin = require("./telegram-admin");
const TelegramAccounts = require("./telegram-accounts");
const Instauto = require("./index");
const JSONDB = require("./db");
const puppeteer = require("puppeteer");

const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

class TelegramBotManager {
  constructor() {
    // Add error handling for Telegram API conflicts
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10
        }
      }
    });
    
    // Handle polling errors
    this.bot.on('polling_error', (error) => {
      if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
        console.log('⚠️ Telegram API 409 Conflict detected. This usually means another bot instance is running.');
        console.log('🔄 Retrying in 30 seconds...');
        setTimeout(() => {
          this.bot.stopPolling();
          setTimeout(() => {
            this.bot.startPolling();
          }, 5000);
        }, 30000);
      } else {
        console.error('Telegram polling error:', error);
      }
    });
    
    this.admin = new TelegramAdmin(this.bot);
    this.accounts = new TelegramAccounts(this.bot);
    this.instances = new Map();
    this.setupCommands();
    console.log("🤖 Telegram Bot initialized");
  }

  setupCommands() {
    // Basic commands
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));
    this.bot.onText(/\/stats/, (msg) => this.handleStats(msg));
    this.bot.onText(/\/myid/, (msg) => this.handleMyId(msg));

    // Bot control commands
    this.bot.onText(/\/start_bot (.+)/, (msg, match) => this.handleStartBot(msg, match[1]));
    this.bot.onText(/\/stop_bot (.+)/, (msg, match) => this.handleStopBot(msg, match[1]));
    this.bot.onText(/\/stop_all/, (msg) => this.handleStopAll(msg));
    this.bot.onText(/\/kill_all/, (msg) => this.handleKillAll(msg));

    // Account-specific commands
    this.bot.onText(/\/start_my_bot/, (msg) => this.handleStartMyBot(msg));
    this.bot.onText(/\/stop_my_bot/, (msg) => this.handleStopMyBot(msg));
    this.bot.onText(/\/my_status/, (msg) => this.handleMyStatus(msg));
    this.bot.onText(/\/clear_progress/, (msg) => this.handleClearProgress(msg));

    // Help commands
    this.bot.onText(/\/admin_help/, (msg) => this.admin.handleAdminHelp(msg));
    this.bot.onText(/\/account_help/, (msg) => this.accounts.handleAccountHelp(msg));

    // Unfollow testing commands
    this.bot.onText(/\/test_unfollow_non_mutual (.+)/, (msg, match) => this.handleTestUnfollowNonMutual(msg, match[1]));
    this.bot.onText(/\/test_unfollow_all_unknown (.+)/, (msg, match) => this.handleTestUnfollowAllUnknown(msg, match[1]));
    this.bot.onText(/\/test_unfollow_old (.+)/, (msg, match) => this.handleTestUnfollowOld(msg, match[1]));
    this.bot.onText(/\/test_unfollow_single (.+)/, (msg, match) => this.handleTestUnfollowSingle(msg, match[1]));

    console.log("📋 Commands registered");
  }

  handleStart(msg) {
    const welcomeMessage = `
🤖 Witaj w Instagram Bot Manager!

Podstawowe komendy:
/start_my_bot - Uruchom bot dla swojego konta
/stop_my_bot - Zatrzymaj swój bot
/my_status - Status Twojego bota
/my_targets - Twoje targety (USERS_TO_FOLLOW)
/myid - Pokaż swoje Telegram ID
/clear_progress - Wyczyść postęp (zacznij od początku)

Pomoc:
/help - Pomoc ogólna
/account_help - Pomoc dla kont
/admin_help - Pomoc administracyjna

Status:
/status - Status wszystkich botów
/stats - Statystyki

Uwagi:
• Bot używa Twoich targetów jako USERS_TO_FOLLOW
• Dodaj targety używając /add_target @username
• Bot automatycznie używa Twoich ustawień cookie i proxy
• Użyj /myid aby sprawdzić swoje ID
    `;

    this.bot.sendMessage(msg.chat.id, welcomeMessage);
  }

  handleHelp(msg) {
    const helpMessage = `
🤖 Instagram Bot Manager - Pomoc

Komendy użytkownika:
/start_my_bot - Uruchom bot dla swojego konta
/stop_my_bot - Zatrzymaj swój bot
/my_status - Status Twojego bota
/my_targets - Twoje targety (USERS_TO_FOLLOW)

Zarządzanie targetami:
/add_target @username - Dodaj target do USERS_TO_FOLLOW
/remove_target @username - Usuń target z USERS_TO_FOLLOW

Zarządzanie konfiguracją:
/set_config <klucz> <wartość> - Ustaw wartość konfiguracji
/get_config - Pokaż swoją konfigurację

Status i statystyki:
/status - Status wszystkich botów
/stats - Statystyki systemu

Pomoc:
/account_help - Szczegółowa pomoc dla kont
/admin_help - Pomoc administracyjna (tylko admini)

Jak to działa:
1. Admin dodaje Twoje konto: /add_account <user_id> <cookie> <proxy>
2. Dodajesz targety: /add_target @username
3. Ustawiasz konfigurację: /set_config MAX_FOLLOWS_PER_HOUR 20
4. Uruchamiasz bot: /start_my_bot
5. Bot używa Twoich targetów i konfiguracji

Uwaga: Jeśli masz problemy z 409 Conflict, użyj /kill_all (admin)
    `;

    this.bot.sendMessage(msg.chat.id, helpMessage);
  }

  handleStatus(msg) {
    if (this.instances.size === 0) {
      this.bot.sendMessage(msg.chat.id, "📊 Brak aktywnych botów");
      return;
    }

    const statusList = Array.from(this.instances.entries()).map(([userId, instance]) => {
      const account = this.accounts.getAccountByUserId(userId);
      const usersToFollow = account ? this.accounts.getUsersToFollowForUser(userId) : 'Brak';
      const userConfig = this.accounts.getUserConfig(userId);
      return `🟢 User ${userId}: online\n  USERS_TO_FOLLOW: ${usersToFollow}\n  Config: ${userConfig.MAX_FOLLOWS_PER_HOUR}/h, ${userConfig.MAX_FOLLOWS_PER_DAY}/d`;
    }).join('\n');

    this.bot.sendMessage(msg.chat.id, `📊 Status botów:\n\n${statusList}\n\nŁącznie: ${this.instances.size} aktywnych botów`);
  }

  handleStats(msg) {
    const data = this.accounts.loadData();
    const stats = `
📈 *Statystyki systemu*

👥 *Konta:* ${data.accounts.length}
🌐 *Proxies:* ${data.proxies.length}
🍪 *Cookies:* ${data.cookies.length}
🤖 *Aktywne boty:* ${this.instances.size}

*Konta z targetami:*
${data.accounts.filter(acc => acc.targets.length > 0).length} / ${data.accounts.length}
    `;

    this.bot.sendMessage(msg.chat.id, stats, { parse_mode: "Markdown" });
  }

  async handleStartBot(msg, userIdStr) {
    if (!this.admin.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Nieprawidłowy user_id. Musi być liczbą.");
      return;
    }

    if (this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Bot dla użytkownika ${userId} już działa.`);
      return;
    }

    const account = this.accounts.getAccountByUserId(userId);
    if (!account) {
      this.bot.sendMessage(msg.chat.id, `❌ Konto dla użytkownika ${userId} nie istnieje. Użyj /add_account najpierw.`);
      return;
    }

    if (!account.cookie) {
      this.bot.sendMessage(msg.chat.id, `❌ Konto dla użytkownika ${userId} nie ma ustawionego cookie.`);
      return;
    }

    const usersToFollow = this.accounts.getUsersToFollowForUser(userId);
    if (!usersToFollow) {
      this.bot.sendMessage(msg.chat.id, `❌ Konto dla użytkownika ${userId} nie ma żadnych targetów. Użyj /add_target @username.`);
      return;
    }

    try {
      await this.startBotInstance(userId, account, usersToFollow);
      this.bot.sendMessage(msg.chat.id, `✅ Bot dla użytkownika ${userId} został uruchomiony.\n\nUSERS_TO_FOLLOW: ${usersToFollow}`);
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas uruchamiania bota dla użytkownika ${userId}: ${error.message}`);
    }
  }

  async handleStopBot(msg, userIdStr) {
    if (!this.admin.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Nieprawidłowy user_id. Musi być liczbą.");
      return;
    }

    if (!this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, `⚠️ Bot dla użytkownika ${userId} nie działa.`);
      return;
    }

    await this.stopBotInstance(userId);
    this.bot.sendMessage(msg.chat.id, `✅ Bot dla użytkownika ${userId} został zatrzymany.`);
  }

  async handleStopAll(msg) {
    if (!this.admin.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    const userIds = Array.from(this.instances.keys());
    if (userIds.length === 0) {
      this.bot.sendMessage(msg.chat.id, "⚠️ Brak aktywnych botów do zatrzymania.");
      return;
    }

    for (const userId of userIds) {
      await this.stopBotInstance(userId);
    }

    this.bot.sendMessage(msg.chat.id, `✅ Wszystkie boty (${userIds.length}) zostały zatrzymane.`);
  }

  async handleKillAll(msg) {
    if (!this.admin.isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, "❌ Brak uprawnień administracyjnych.");
      return;
    }

    // Force stop all instances and restart the bot
    const userIds = Array.from(this.instances.keys());
    
    for (const userId of userIds) {
      try {
        await this.stopBotInstance(userId);
      } catch (error) {
        console.error(`Error stopping instance ${userId}:`, error);
      }
    }

    // Stop polling and restart
    try {
      this.bot.stopPolling();
      setTimeout(() => {
        this.bot.startPolling();
      }, 5000);
    } catch (error) {
      console.error('Error restarting bot polling:', error);
    }

    this.bot.sendMessage(msg.chat.id, `🔄 Zatrzymano wszystkie boty (${userIds.length} instancji) i zrestartowano polling.`);
  }

  async handleStartMyBot(msg) {
    const userId = msg.from.id;
    
    if (this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, "⚠️ Twój bot już działa.");
      return;
    }

    const account = this.accounts.getAccountByUserId(userId);
    if (!account) {
      this.bot.sendMessage(msg.chat.id, "❌ Nie masz jeszcze skonfigurowanego konta. Skontaktuj się z administratorem.");
      return;
    }

    if (!account.cookie) {
      this.bot.sendMessage(msg.chat.id, "❌ Twoje konto nie ma ustawionego cookie. Skontaktuj się z administratorem.");
      return;
    }

    const usersToFollow = this.accounts.getUsersToFollowForUser(userId);
    if (!usersToFollow) {
      this.bot.sendMessage(msg.chat.id, "❌ Nie masz żadnych targetów. Użyj /add_target @username aby dodać targety do USERS_TO_FOLLOW.");
      return;
    }

    try {
      // Clear previous progress when starting fresh
      await this.clearProgress(userId);
      
      await this.startBotInstance(userId, account, usersToFollow);
      this.bot.sendMessage(msg.chat.id, `✅ Twój bot został uruchomiony!\n\n📝 USERS_TO_FOLLOW: ${usersToFollow}\n\nUżyj /my_status aby sprawdzić status`);
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas uruchamiania bota: ${error.message}`);
    }
  }

  async handleStopMyBot(msg) {
    const userId = msg.from.id;
    
    if (!this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, "⚠️ Twój bot nie działa.");
      return;
    }

    await this.stopBotInstance(userId);
    this.bot.sendMessage(msg.chat.id, "✅ Twój bot został zatrzymany.");
  }

  handleMyStatus(msg) {
    const userId = msg.from.id;
    const account = this.accounts.getAccountByUserId(userId);
    
    if (!account) {
      this.bot.sendMessage(msg.chat.id, "❌ Nie masz jeszcze skonfigurowanego konta.");
      return;
    }

    const isRunning = this.instances.has(userId);
    const usersToFollow = this.accounts.getUsersToFollowForUser(userId);
    const userConfig = this.accounts.getUserConfig(userId);
    
    const statusMessage = `
📊 Status Twojego konta

🆔 User ID: ${userId}
🤖 Bot status: ${isRunning ? '🟢 Działa' : '🔴 Zatrzymany'}
🍪 Cookie: ${account.cookie ? '✅ Ustawiony' : '❌ Brak'}
🌐 Proxy: ${account.proxy ? '✅ Ustawiony' : '❌ Brak'}
🎯 Targets: ${account.targets.length}
📝 USERS_TO_FOLLOW: ${usersToFollow || 'Brak'}

📊 Konfiguracja:
🕐 Follows/hour: ${userConfig.MAX_FOLLOWS_PER_HOUR}
📅 Follows/day: ${userConfig.MAX_FOLLOWS_PER_DAY}
❤️ Likes/day: ${userConfig.MAX_LIKES_PER_DAY}
🔧 Enable likes: ${userConfig.ENABLE_LIKES}
👥 Follow filters: ${userConfig.FOLLOW_USER_MIN_FOLLOWERS}-${userConfig.FOLLOW_USER_MAX_FOLLOWERS} followers, ${userConfig.FOLLOW_USER_MIN_FOLLOWING}-${userConfig.FOLLOW_USER_MAX_FOLLOWING} following

${account.targets.length > 0 ? `Twoje targety:\n${account.targets.map(target => `• ${target}`).join('\n')}` : ''}

Użyj /get_config aby zobaczyć szczegóły konfiguracji.
    `;

    this.bot.sendMessage(msg.chat.id, statusMessage);
  }

  handleMyId(msg) {
    const userId = msg.from.id;
    const username = msg.from.username || 'Brak username';
    const firstName = msg.from.first_name || '';
    const lastName = msg.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    const userInfo = `
🆔 Twoje informacje Telegram:

ID: ${userId}
Username: @${username}
Imię: ${fullName}

📝 Użyj tego ID w konfiguracji adminów:
ADMIN_IDS = [${userId}]
    `;
    
    this.bot.sendMessage(msg.chat.id, userInfo);
  }

  async startBotInstance(userId, account, usersToFollow) {
    console.log(`🚀 Starting bot for user ${userId} with USERS_TO_FOLLOW: ${usersToFollow}`);

    // Create database instance
    const db = await JSONDB({
      followedDbPath: `./followed_${userId}.json`,
      unfollowedDbPath: `./unfollowed_${userId}.json`,
      likedPhotosDbPath: `./liked-photos_${userId}.json`,
    });

    // Launch browser
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Parse cookie from account
    let sessionid = null;
    try {
      const cookieMatch = account.cookie.match(/sessionid=([^;]+)/);
      if (cookieMatch) {
        sessionid = cookieMatch[1];
      }
    } catch (error) {
      console.error("Error parsing cookie:", error);
    }

    // Get user config
    const userConfig = this.accounts.getUserConfig(userId);
    
    // Create Instauto instance with account data - prioritize cookie login
    const instauto = await Instauto(db, browser, {
      username: account.username || `user_${userId}`, // Use account username
      password: account.password, // Use account password as fallback
      sessionid: sessionid, // Primary login method
      cookiesPath: `./cookies_${userId}.json`,
      maxFollowsPerHour: parseInt(userConfig.MAX_FOLLOWS_PER_HOUR) || 20,
      maxFollowsPerDay: parseInt(userConfig.MAX_FOLLOWS_PER_DAY) || 150,
      maxLikesPerDay: parseInt(userConfig.MAX_LIKES_PER_DAY) || 30,
      followUserMinFollowers: parseInt(userConfig.FOLLOW_USER_MIN_FOLLOWERS) || 0,
      followUserMaxFollowers: parseInt(userConfig.FOLLOW_USER_MAX_FOLLOWERS) || 10000,
      followUserMinFollowing: parseInt(userConfig.FOLLOW_USER_MIN_FOLLOWING) || 0,
      followUserMaxFollowing: parseInt(userConfig.FOLLOW_USER_MAX_FOLLOWING) || 5000,
      dryRun: process.env.DRY_RUN === 'true',
      logger: {
        log: (msg) => console.log(`[User ${userId}] ${msg}`),
        error: (msg) => console.error(`[User ${userId}] ERROR: ${msg}`),
        warn: (msg) => console.warn(`[User ${userId}] WARN: ${msg}`),
        info: (msg) => console.info(`[User ${userId}] INFO: ${msg}`)
      }
    });

    // Store instance
    this.instances.set(userId, {
      instauto,
      browser,
      db,
      account,
      usersToFollow,
      startTime: new Date()
    });

    // Start the bot process
    this.runBotProcess(userId, usersToFollow);
  }

  async stopBotInstance(userId) {
    const instance = this.instances.get(userId);
    if (!instance) return;

    console.log(`🛑 Stopping bot for user ${userId}`);

    try {
      await instance.browser.close();
    } catch (error) {
      console.error(`Error closing browser for user ${userId}:`, error);
    }

    this.instances.delete(userId);
  }

  async runBotProcess(userId, usersToFollow) {
    try {
      console.log(`🎯 Starting process for user ${userId} with targets: ${usersToFollow}`);
      
      // Parse targets
      const usersToFollowArray = usersToFollow.split(',').map(t => t.trim()).filter(t => t);
      
      if (usersToFollowArray.length === 0) {
        console.log(`❌ No valid targets found in: ${usersToFollow}`);
        return;
      }

      // Get user configuration
      const userConfig = this.accounts.getUserConfig(userId);
      const maxFollowsPerTarget = parseInt(userConfig.MAX_FOLLOWS_PER_TARGET || '30');
      const maxFollowersToCollectPerTarget = parseInt(userConfig.MAX_FOLLOWERS_TO_COLLECT_PER_TARGET || '100');
      
      console.log(`⚙️ Configuration: ${maxFollowsPerTarget} follows per target, ${maxFollowersToCollectPerTarget} followers to collect per target`);

      // Get existing bot instance
      const instance = this.instances.get(userId);
      if (!instance) {
        console.log(`❌ No bot instance found for user ${userId}`);
        return;
      }

      // Randomize targets to avoid always starting with the same one
      const shuffledTargets = this.shuffleArray([...usersToFollowArray]);
      console.log(`🎲 Randomized target order: ${shuffledTargets.join(', ')}`);
      
      // Load progress from file to continue where we left off
      const progressFile = `./progress_${userId}.json`;
      let currentTargetIndex = 0;
      
      try {
        const progressData = await fs.readFile(progressFile, 'utf8');
        const progress = JSON.parse(progressData);
        currentTargetIndex = progress.lastTargetIndex || 0;
        console.log(`📋 Resuming from target index ${currentTargetIndex} (${shuffledTargets[currentTargetIndex]})`);
      } catch (error) {
        console.log(`📋 Starting fresh - no progress file found`);
      }

      let totalSuccessCount = 0;
      let totalErrorCount = 0;
      let lastTarget = null;
      
      // Check login status before processing targets
      const isLoggedIn = await instance.instauto.checkLoginStatus();
      if (!isLoggedIn) {
        console.error(`❌ Not logged in to Instagram. Cannot process targets.`);
        return;
      }
      
      console.log(`✅ Login status verified, starting to process ${shuffledTargets.length} targets...`);

      // Process each target to get their followers
      for (let i = currentTargetIndex; i < shuffledTargets.length; i++) {
        const targetUsername = shuffledTargets[i];
        
        try {
          // Save progress after each target
          await this.saveProgress(userId, i, shuffledTargets);
          
          // Prevent duplicate target logging
          if (lastTarget !== targetUsername) {
            console.log(`🎯 Processing target ${i + 1}/${shuffledTargets.length}: ${targetUsername}`);
            lastTarget = targetUsername;
          }
          
          // Get user data for the target
          const targetUserData = await instance.instauto.navigateToUserAndGetData(targetUsername);
          
          if (!targetUserData || targetUserData.id === "unknown") {
            console.log(`❌ Could not get user data for ${targetUsername}, skipping...`);
            continue;
          }

          // Check if user is private
          if (targetUserData.is_private) {
            console.log(`⏩ Skipped ${targetUsername} – private account`);
            continue;
          }

          // Get followers using the available instauto function with limit
          console.log(`📥 Collecting followers from ${targetUsername} (max: ${maxFollowersToCollectPerTarget})`);
          
          const allFollowers = [];
          let pageCount = 0;
          
          try {
            // Use the existing generator to get followers (returns usernames only)
            for await (const followersBatch of instance.instauto.getFollowersOrFollowingGenerator({
              userId: targetUserData.id,
              getFollowers: true,
            })) {
              pageCount++;
              
              // Add followers from this batch
              for (const followerUsername of followersBatch) {
                if (allFollowers.length >= maxFollowersToCollectPerTarget) {
                  console.log(`📊 Reached max followers limit (${maxFollowersToCollectPerTarget}) for ${targetUsername}`);
                  break;
                }
                allFollowers.push(followerUsername);
              }
              
              // Check if we've reached the limit
              if (allFollowers.length >= maxFollowersToCollectPerTarget) {
                console.log(`📊 Stopping collection at ${allFollowers.length} followers for ${targetUsername}`);
                break;
              }
            }
          } catch (error) {
            console.log(`⚠️ Error collecting followers from ${targetUsername}: ${error.message}`);
            // Continue with whatever followers we have
          }

          if (allFollowers.length === 0) {
            console.log(`❌ No followers found for ${targetUsername}, skipping...`);
            continue;
          }
          
          console.log(`✅ Collected ${allFollowers.length} followers from ${targetUsername} (${pageCount} pages)`);
          
          // Follow each follower with respect to limits and filters
          let followedCount = 0;
          const maxFollowsForThisTarget = Math.min(maxFollowsPerTarget, allFollowers.length);
          let lastFollower = null;
          
          console.log(`🎯 Starting to follow ${maxFollowsForThisTarget} followers from ${targetUsername}`);
          
          for (const followerUsername of allFollowers) {
            try {
              // Prevent duplicate follower logging
              if (lastFollower === followerUsername) {
                continue;
              }
              lastFollower = followerUsername;

              // Check if we already followed this user recently
              const prevFollowed = instance.db.getPrevFollowedUser(followerUsername);
              if (prevFollowed) {
                console.log(`⏩ Skipped @${followerUsername} – already followed recently`);
                continue;
              }

              // Check hourly limit
              const hourlyFollows = instance.instauto.getNumFollowedUsersThisTimeUnit(60 * 60 * 1000);
              if (hourlyFollows >= parseInt(userConfig.MAX_FOLLOWS_PER_HOUR)) {
                console.log(`⏸️ Hourly limit reached (${hourlyFollows}/${userConfig.MAX_FOLLOWS_PER_HOUR}), waiting 10 minutes...`);
                await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000)); // Wait 10 minutes
              }
              
              // Check daily limit
              const dailyFollows = instance.instauto.getNumFollowedUsersThisTimeUnit(24 * 60 * 60 * 1000);
              if (dailyFollows >= parseInt(userConfig.MAX_FOLLOWS_PER_DAY)) {
                console.log(`⏸️ Daily limit reached (${dailyFollows}/${userConfig.MAX_FOLLOWS_PER_DAY}), stopping...`);
                break;
              }

              // Get follower data to apply filters
              const followerData = await instance.instauto.navigateToUserAndGetData(followerUsername);
              
              if (!followerData || followerData.id === "unknown") {
                console.log(`⏩ Skipped @${followerUsername} (id: unknown) – could not get user data`);
                continue;
              }

              // Apply pre-filtering to remove unwanted users
              const enablePrefilter = userConfig.ENABLE_PREFILTER === 'true' || true;
              if (enablePrefilter) {
                const suspiciousKeywords = ['free', 'bot', 'promo', 'spam', 'fake', 'buy', 'sell', 'follow', 'like'];
                
                // Skip private accounts
                if (followerData.is_private) {
                  console.log(`⏩ Skipped @${followerUsername} – private account`);
                  continue;
                }
                
                // Skip accounts without profile picture
                if (!followerData.profile_pic_url) {
                  console.log(`⏩ Skipped @${followerUsername} – no profile picture`);
                  continue;
                }
                
                // Skip accounts with suspicious usernames
                const username = followerData.username.toLowerCase();
                for (const keyword of suspiciousKeywords) {
                  if (username.includes(keyword)) {
                    console.log(`⏩ Skipped @${followerUsername} – suspicious username (${keyword})`);
                    continue;
                  }
                }
                
                // Skip accounts with very short or very long usernames (potential spam)
                if (username.length < 3 || username.length > 30) {
                  console.log(`⏩ Skipped @${followerUsername} – username length (${username.length})`);
                  continue;
                }
                
                // Skip accounts with numbers only or special characters
                if (/^[0-9]+$/.test(username) || /[^a-zA-Z0-9._]/.test(username)) {
                  console.log(`⏩ Skipped @${followerUsername} – invalid username format`);
                  continue;
                }
              }

              // Apply filters
              const followerCount = followerData.edge_followed_by?.count || 0;
              const followingCount = followerData.edge_follow?.count || 0;
              const isPrivate = followerData.is_private || false;

              // Check minimum followers
              if (followerCount < parseInt(userConfig.FOLLOW_USER_MIN_FOLLOWERS || 50)) {
                console.log(`⏩ Skipped @${followerUsername} (followers: ${followerCount}, following: ${followingCount}) – doesn't match filters (min followers: ${userConfig.FOLLOW_USER_MIN_FOLLOWERS || 50})`);
                continue;
              }

              // Check maximum followers
              if (followerCount > parseInt(userConfig.FOLLOW_USER_MAX_FOLLOWERS || 5000)) {
                console.log(`⏩ Skipped @${followerUsername} (followers: ${followerCount}, following: ${followingCount}) – doesn't match filters (max followers: ${userConfig.FOLLOW_USER_MAX_FOLLOWERS || 5000})`);
                continue;
              }

              // Check minimum following
              if (followingCount < parseInt(userConfig.FOLLOW_USER_MIN_FOLLOWING || 50)) {
                console.log(`⏩ Skipped @${followerUsername} (followers: ${followerCount}, following: ${followingCount}) – doesn't match filters (min following: ${userConfig.FOLLOW_USER_MIN_FOLLOWING || 50})`);
                continue;
              }

              // Check maximum following
              if (followingCount > parseInt(userConfig.FOLLOW_USER_MAX_FOLLOWING || 5000)) {
                console.log(`⏩ Skipped @${followerUsername} (followers: ${followerCount}, following: ${followingCount}) – doesn't match filters (max following: ${userConfig.FOLLOW_USER_MAX_FOLLOWING || 5000})`);
                continue;
              }

              // Skip private accounts
              if (isPrivate) {
                console.log(`⏩ Skipped @${followerUsername} (followers: ${followerCount}, following: ${followingCount}) – private account`);
                continue;
              }

              // Follow the user using the available instauto function with verification
              try {
                const followResult = await instance.instauto.followUserRespectingRestrictions({
                  username: followerUsername,
                  skipPrivate: true // Skip private accounts
                });
                
                if (followResult.success) {
                  // Check if this was a dry run
                  if (followResult.dryRun) {
                    // Log dry run simulation
                    const username = followerData.username || 'unknown user';
                    console.log(`🔍 DRY RUN: Would follow @${username} (id: ${followerData.id}) from target: ${targetUsername}`);
                  } else {
                    // Log actual successful follow
                    followedCount++;
                    totalSuccessCount++;
                    const username = followerData.username || 'unknown user';
                    console.log(`✅ Followed @${username} (id: ${followerData.id}) from target: ${targetUsername}`);
                  }
                } else {
                  // Log skip reason
                  const username = followerData.username || 'unknown user';
                  console.log(`⏩ Skipped @${username} (id: ${followerData.id}): ${followResult.reason || 'unknown reason'}`);
                }
                
              } catch (followError) {
                console.log(`❌ Failed to follow @${followerUsername} (id: ${followerData.id}): ${followError.message}`);
                totalErrorCount++;
                // Continue with next follower
              }
              
            } catch (error) {
              console.error(`❌ Failed to process follower ${followerUsername}: ${error.message}`);
              totalErrorCount++;
              // Continue with next follower
            }
          }
          
          console.log(`✅ Successfully processed target: ${targetUsername} (followed ${followedCount} users)`);
          
          // Wait between targets to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
          
        } catch (error) {
          console.error(`❌ Failed to process target ${targetUsername}: ${error.message}`);
          totalErrorCount++;
          
          // Continue with next target instead of stopping completely
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
        }
      }

      const resultMessage = `✅ Proces zakończony dla user ${userId}\n\n` +
        `🎯 Targety: ${usersToFollow}\n` +
        `📊 Max follows per target: ${maxFollowsPerTarget}\n` +
        `⚙️ Konfiguracja: ${userConfig.MAX_FOLLOWS_PER_HOUR}/h, ${userConfig.MAX_FOLLOWS_PER_DAY}/d\n` +
        `✅ Sukces: ${totalSuccessCount}, ❌ Błędy: ${totalErrorCount}`;

      console.log(`🎉 Process completed for user ${userId} - Success: ${totalSuccessCount}, Errors: ${totalErrorCount}`);
      
      // Send notification
      this.bot.sendMessage(userId, resultMessage);

    } catch (error) {
      console.error(`💥 Error in bot process for user ${userId}: ${error.message}`);
      
      // Send error notification
      this.bot.sendMessage(userId, `❌ Błąd w procesie bota: ${error.message}`);
    } finally {
      // Stop the instance after completion
      await this.stopBotInstance(userId);
    }
  }

  // Unfollow testing methods
  async handleTestUnfollowNonMutual(msg, limitStr) {
    const userId = msg.from.id;
    const limit = parseInt(limitStr) || 5;

    if (!this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Bot nie jest uruchomiony. Użyj /start_my_bot najpierw.");
      return;
    }

    const instance = this.instances.get(userId);
    
    try {
      this.bot.sendMessage(msg.chat.id, `🔄 Rozpoczynam unfollow non-mutual followers (limit: ${limit})...`);
      
      const result = await instance.instauto.unfollowNonMutualFollowers({ limit });
      
      this.bot.sendMessage(msg.chat.id, `✅ Unfollow non-mutual zakończony! Unfollowed: ${result} users`);
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas unfollow non-mutual: ${error.message}`);
    }
  }

  async handleTestUnfollowAllUnknown(msg, limitStr) {
    const userId = msg.from.id;
    const limit = parseInt(limitStr) || 5;

    if (!this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Bot nie jest uruchomiony. Użyj /start_my_bot najpierw.");
      return;
    }

    const instance = this.instances.get(userId);
    
    try {
      this.bot.sendMessage(msg.chat.id, `🔄 Rozpoczynam unfollow all unknown (limit: ${limit})...`);
      
      const result = await instance.instauto.unfollowAllUnknown({ limit });
      
      this.bot.sendMessage(msg.chat.id, `✅ Unfollow all unknown zakończony! Unfollowed: ${result} users`);
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas unfollow all unknown: ${error.message}`);
    }
  }

  async handleTestUnfollowOld(msg, params) {
    const userId = msg.from.id;
    const [ageInDays, limit] = params.split(' ').map(p => parseInt(p));
    
    if (!ageInDays) {
      this.bot.sendMessage(msg.chat.id, "❌ Użycie: /test_unfollow_old <dni> [limit]\nPrzykład: /test_unfollow_old 7 10");
      return;
    }

    if (!this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Bot nie jest uruchomiony. Użyj /start_my_bot najpierw.");
      return;
    }

    const instance = this.instances.get(userId);
    
    try {
      this.bot.sendMessage(msg.chat.id, `🔄 Rozpoczynam unfollow old followed (${ageInDays} dni, limit: ${limit || 'bez limitu'})...`);
      
      const result = await instance.instauto.unfollowOldFollowed({ ageInDays, limit });
      
      this.bot.sendMessage(msg.chat.id, `✅ Unfollow old followed zakończony! Unfollowed: ${result} users`);
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas unfollow old followed: ${error.message}`);
    }
  }

  async handleTestUnfollowSingle(msg, username) {
    const userId = msg.from.id;

    if (!this.instances.has(userId)) {
      this.bot.sendMessage(msg.chat.id, "❌ Bot nie jest uruchomiony. Użyj /start_my_bot najpierw.");
      return;
    }

    const instance = this.instances.get(userId);
    
    try {
      this.bot.sendMessage(msg.chat.id, `🔄 Rozpoczynam unfollow pojedynczego użytkownika: @${username}...`);
      
      const result = await instance.instauto.unfollowUser(username);
      
      if (result.noActionTaken) {
        this.bot.sendMessage(msg.chat.id, `ℹ️ Użytkownik @${username} już nie jest followowany lub nie znaleziono przycisku unfollow`);
      } else {
        this.bot.sendMessage(msg.chat.id, `✅ Pomyślnie unfollowed @${username}`);
      }
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas unfollow @${username}: ${error.message}`);
    }
  }

  // Helper function to shuffle array (Fisher-Yates algorithm)
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Helper function to save progress
  async saveProgress(userId, targetIndex, targets) {
    try {
      const progressFile = `./progress_${userId}.json`;
      const progress = {
        userId,
        lastTargetIndex: targetIndex,
        targets,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(progressFile, JSON.stringify(progress, null, 2));
    } catch (error) {
      console.log(`⚠️ Failed to save progress: ${error.message}`);
    }
  }

  // Helper function to clear progress
  async clearProgress(userId) {
    try {
      const progressFile = `./progress_${userId}.json`;
      await fs.unlink(progressFile);
      console.log(`🗑️ Cleared progress for user ${userId}`);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  async handleClearProgress(msg) {
    const userId = msg.from.id;
    
    try {
      await this.clearProgress(userId);
      this.bot.sendMessage(msg.chat.id, "🗑️ Postęp został wyczyszczony. Następne uruchomienie bota zacznie od początku.");
    } catch (error) {
      this.bot.sendMessage(msg.chat.id, `❌ Błąd podczas czyszczenia postępu: ${error.message}`);
    }
  }
}

// Create and start the bot manager
const botManager = new TelegramBotManager();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down bot manager...');
  
  // Stop all instances
  const userIds = Array.from(botManager.instances.keys());
  for (const userId of userIds) {
    await botManager.stopBotInstance(userId);
  }
  
  process.exit(0);
});

// Handle 409 Conflict errors more gracefully
let conflictRetryCount = 0;
const maxConflictRetries = 5;

botManager.bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
    conflictRetryCount++;
    console.log(`⚠️ Telegram API 409 Conflict detected (attempt ${conflictRetryCount}/${maxConflictRetries})`);
    
    if (conflictRetryCount >= maxConflictRetries) {
      console.log('🛑 Too many 409 conflicts, shutting down...');
      process.exit(1);
    }
    
    console.log('🔄 Retrying in 30 seconds...');
    setTimeout(() => {
      botManager.bot.stopPolling();
      setTimeout(() => {
        botManager.bot.startPolling();
      }, 5000);
    }, 30000);
  } else {
    console.error('Telegram polling error:', error);
  }
});

module.exports = TelegramBotManager;