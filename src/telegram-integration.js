"use strict";

const puppeteer = require("puppeteer");
const proxyChain = require("proxy-chain");
const TelegramAutomation = require("./telegram-bot");
const Instauto = require("./index");

class TelegramIntegration {
  constructor(telegramToken, allowedUsers = []) {
    this.telegramBot = new TelegramAutomation(telegramToken, allowedUsers);
    this.instances = new Map(); // Store running instances
    this.setupIntegration();
  }

  setupIntegration() {
    // Override the startInstance method to actually start InstaBot instances
    this.telegramBot.startInstance = async (chatId, instanceId) => {
      await this.startInstaBotInstance(chatId, instanceId);
    };

    // Override the stopInstance method to actually stop InstaBot instances
    this.telegramBot.stopInstance = async (chatId, instanceId) => {
      await this.stopInstaBotInstance(chatId, instanceId);
    };

    // Override the getStatus method to show real status
    this.telegramBot.getStatus = async () => this.getRealStatus();

    // Override the getStats method to show real stats
    this.telegramBot.getStats = async () => this.getRealStats();

    // Override the unfollowOld method to actually perform unfollow
    this.telegramBot.unfollowOld = async (chatId) => {
      await this.performUnfollowOld(chatId);
    };
  }

  async startInstaBotInstance(chatId, instanceId) {
    try {
      const id = parseInt(instanceId);
      if (id < 1 || id > 3) {
        this.telegramBot.bot.sendMessage(
          chatId,
          "❌ Nieprawidłowy ID instancji. Użyj 1, 2 lub 3."
        );
        return;
      }

      if (this.instances.has(id)) {
        this.telegramBot.bot.sendMessage(
          chatId,
          `⚠️ Instancja ${id} jest już uruchomiona.`
        );
        return;
      }

      this.telegramBot.bot.sendMessage(
        chatId,
        `🚀 Uruchamianie InstaBot Instance ${id}...`
      );

      // Start the actual InstaBot instance
      const instance = await this.createInstaBotInstance(id);
      this.instances.set(id, instance);

      // Send status update
      await this.telegramBot.sendStatusUpdate(
        id,
        "✅ Uruchomiona pomyślnie",
        "Bot rozpoczął działanie"
      );

      this.telegramBot.bot.sendMessage(
        chatId,
        `✅ InstaBot Instance ${id} uruchomiona pomyślnie!`
      );
    } catch (error) {
      this.telegramBot.bot.sendMessage(
        chatId,
        `❌ Błąd podczas uruchamiania instancji ${instanceId}: ${error.message}`
      );
      await this.telegramBot.sendErrorNotification(instanceId, error);
    }
  }

  async stopInstaBotInstance(chatId, instanceId) {
    try {
      const id = parseInt(instanceId);
      if (id < 1 || id > 3) {
        this.telegramBot.bot.sendMessage(
          chatId,
          "❌ Nieprawidłowy ID instancji. Użyj 1, 2 lub 3."
        );
        return;
      }

      if (!this.instances.has(id)) {
        this.telegramBot.bot.sendMessage(
          chatId,
          `⚠️ Instancja ${id} nie jest uruchomiona.`
        );
        return;
      }

      this.telegramBot.bot.sendMessage(
        chatId,
        `🛑 Zatrzymywanie InstaBot Instance ${id}...`
      );

      // Stop the actual instance
      const instance = this.instances.get(id);
      if (instance && instance.browser) {
        await instance.browser.close();
      }
      if (instance && instance.newProxyUrl) {
        await proxyChain.closeAnonymizedProxy(instance.newProxyUrl, true);
      }

      this.instances.delete(id);

      // Send status update
      await this.telegramBot.sendStatusUpdate(
        id,
        "🛑 Zatrzymana",
        "Bot został zatrzymany"
      );

      this.telegramBot.bot.sendMessage(
        chatId,
        `✅ InstaBot Instance ${id} zatrzymana pomyślnie!`
      );
    } catch (error) {
      this.telegramBot.bot.sendMessage(
        chatId,
        `❌ Błąd podczas zatrzymywania instancji ${instanceId}: ${error.message}`
      );
      await this.telegramBot.sendErrorNotification(instanceId, error);
    }
  }

  async createInstaBotInstance(instanceId) {
    const proxyIps = ["77.47.240.226", "82.163.175.153", "161.77.68.134"];
    const proxyIp = proxyIps[instanceId - 1];

    console.log(`[Instance ${instanceId}] Starting with proxy IP: ${proxyIp}`);

    const oldProxyUrl = `socks5://kamzza:bJXwSnBLy9@${proxyIp}:50101`;
    const newProxyUrl = await proxyChain.anonymizeProxy({
      url: oldProxyUrl,
      port: 8000 + instanceId,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--proxy-server=${newProxyUrl}`,
      ],
    });

    // Create database for this instance
    const instautoDb = await Instauto.JSONDB({
      followedDbPath: `./followed_${instanceId}.json`,
      unfollowedDbPath: `./unfollowed_${instanceId}.json`,
      likedPhotosDbPath: `./liked-photos_${instanceId}.json`,
    });

    // Create logger for this instance
    const createLogger = (id) => {
      const log = (fn, ...args) =>
        console[fn](new Date().toISOString(), `[Instance ${id}]`, ...args);
      return Object.fromEntries(
        ["log", "info", "debug", "error", "trace", "warn"].map((fn) => [
          fn,
          (...args) => log(fn, ...args),
        ])
      );
    };

    const instanceLogger = createLogger(instanceId);

    // Load options from environment
    const options = {
      cookiesPath: `./cookies_${instanceId}.json`,
      username: process.env.INSTAGRAM_USERNAME,
      password: process.env.INSTAGRAM_PASSWORD,
      maxFollowsPerHour:
        process.env.MAX_FOLLOWS_PER_HOUR != null
          ? parseInt(process.env.MAX_FOLLOWS_PER_HOUR, 10)
          : 20,
      maxFollowsPerDay:
        process.env.MAX_FOLLOWS_PER_DAY != null
          ? parseInt(process.env.MAX_FOLLOWS_PER_DAY, 10)
          : 150,
      maxLikesPerDay:
        process.env.MAX_LIKES_PER_DAY != null
          ? parseInt(process.env.MAX_LIKES_PER_DAY, 10)
          : 30,
      followUserRatioMin:
        process.env.FOLLOW_USER_RATIO_MIN != null
          ? parseFloat(process.env.FOLLOW_USER_RATIO_MIN)
          : 0.2,
      followUserRatioMax:
        process.env.FOLLOW_USER_RATIO_MAX != null
          ? parseFloat(process.env.FOLLOW_USER_RATIO_MAX)
          : 4.0,
      followUserMaxFollowers:
        process.env.FOLLOW_USER_MAX_FOLLOWERS != null
          ? parseInt(process.env.FOLLOW_USER_MAX_FOLLOWERS, 10)
          : 5000,
      followUserMaxFollowing:
        process.env.FOLLOW_USER_MAX_FOLLOWING != null
          ? parseInt(process.env.FOLLOW_USER_MAX_FOLLOWING, 10)
          : 7500,
      followUserMinFollowers:
        process.env.FOLLOW_USER_MIN_FOLLOWERS != null
          ? parseInt(process.env.FOLLOW_USER_MIN_FOLLOWERS, 10)
          : 50,
      followUserMinFollowing:
        process.env.FOLLOW_USER_MIN_FOLLOWING != null
          ? parseInt(process.env.FOLLOW_USER_MIN_FOLLOWING, 10)
          : 0,
      shouldFollowUser: null,
      shouldLikeMedia: null,
      dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,
      excludeUsers: [],
      logger: instanceLogger,
    };

    const instauto = await Instauto(instautoDb, browser, options);

    // Start the bot workflow
    this.startBotWorkflow(instanceId, instauto, options);

    return {
      browser,
      newProxyUrl,
      instauto,
      startTime: new Date(),
      status: "running",
    };
  }

  async startBotWorkflow(instanceId, instauto, options) {
    try {
      // Send notification that bot started
      await this.telegramBot.sendStatusUpdate(
        instanceId,
        "🔄 Rozpoczynam pracę",
        "Bot rozpoczął proces follow/unfollow"
      );

      // Unfollow previously auto-followed users
      const unfollowedCount = await instauto.unfollowOldFollowed({
        ageInDays: 14,
        limit: options.maxFollowsPerDay * (2 / 3),
      });

      if (unfollowedCount > 0) {
        await this.telegramBot.sendStatusUpdate(
          instanceId,
          `👋 Unfollowed ${unfollowedCount} users`,
          "Unfollowed old users"
        );
        await instauto.sleep(10 * 60 * 1000);
      }

      // List of usernames that we should follow the followers of
      const usersToFollowFollowersOf =
        process.env.USERS_TO_FOLLOW != null
          ? process.env.USERS_TO_FOLLOW.split(",")
          : [];

      // Follow followers
      await instauto.followUsersFollowers({
        usersToFollowFollowersOf,
        maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
        skipPrivate: true,
        enableLikeImages: true,
        likeImagesMax: 3,
      });

      await this.telegramBot.sendStatusUpdate(
        instanceId,
        "✅ Praca zakończona",
        "Bot zakończył dzisiejszą sesję"
      );
      await instauto.sleep(10 * 60 * 1000);
    } catch (error) {
      console.error(`[Instance ${instanceId}] Error in workflow:`, error);
      await this.telegramBot.sendErrorNotification(instanceId, error);
    }
  }

  async getRealStatus() {
    const instances = [];

    for (let i = 1; i <= 3; i++) {
      const instance = this.instances.get(i);
      const isRunning = instance && instance.status === "running";
      const status = isRunning ? "🟢 Online" : "🔴 Offline";
      const uptime = instance ? this.formatUptime(instance.startTime) : "";
      instances.push(`${status} Instance ${i}${uptime ? ` (${uptime})` : ""}`);
    }

    const statusMessage = `
📊 *Status Instancji*

${instances.join("\n")}

*Aktywne:* ${Array.from(this.instances.keys()).length}/3
    `;

    return statusMessage;
  }

  async getRealStats() {
    try {
      const today = new Date();
      const todayMs = today.getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      let totalFollowed = 0;
      let totalUnfollowed = 0;
      let totalLiked = 0;

      // Read from all instance files
      for (let i = 1; i <= 3; i++) {
        try {
          const followedData = await require("fs-extra").readJson(
            `./followed_${i}.json`
          );
          const unfollowedData = await require("fs-extra").readJson(
            `./unfollowed_${i}.json`
          );
          const likedData = await require("fs-extra").readJson(
            `./liked-photos_${i}.json`
          );

          // Count today's actions
          const todayFollowed = followedData.filter(
            (item) => todayMs - item.time < dayMs
          ).length;

          const todayUnfollowed = unfollowedData.filter(
            (item) => todayMs - item.time < dayMs
          ).length;

          const todayLiked = likedData.filter(
            (item) => todayMs - item.time < dayMs
          ).length;

          totalFollowed += todayFollowed;
          totalUnfollowed += todayUnfollowed;
          totalLiked += todayLiked;
        } catch (err) {
          // File doesn't exist or is empty, skip
        }
      }

      const statsMessage = `
📈 *Dzisiejsze Statystyki*

👥 *Followed:* ${totalFollowed}
👋 *Unfollowed:* ${totalUnfollowed}
❤️ *Liked:* ${totalLiked}
📊 *Net:* ${totalFollowed - totalUnfollowed}

*Aktywne instancje:* ${this.instances.size}/3
      `;

      return statsMessage;
    } catch (error) {
      return `❌ Błąd podczas pobierania statystyk: ${error.message}`;
    }
  }

  async performUnfollowOld(chatId) {
    try {
      this.telegramBot.bot.sendMessage(
        chatId,
        "🔄 Rozpoczynam unfollow starych użytkowników..."
      );

      let totalUnfollowed = 0;

      // Perform unfollow on all running instances
      for (const [instanceId, instance] of this.instances) {
        if (instance.instauto) {
          try {
            const unfollowedCount = await instance.instauto.unfollowOldFollowed(
              {
                ageInDays: 14,
                limit: 50, // Limit per instance
              }
            );
            totalUnfollowed += unfollowedCount;

            await this.telegramBot.sendStatusUpdate(
              instanceId,
              `👋 Unfollowed ${unfollowedCount} users`,
              "Unfollowed old users"
            );
          } catch (error) {
            console.error(
              `Error unfollowing on instance ${instanceId}:`,
              error
            );
          }
        }
      }

      this.telegramBot.bot.sendMessage(
        chatId,
        `✅ Unfollow zakończony! Unfollowed ${totalUnfollowed} users total.`
      );
    } catch (error) {
      this.telegramBot.bot.sendMessage(
        chatId,
        `❌ Błąd podczas unfollow: ${error.message}`
      );
    }
  }

  formatUptime(startTime) {
    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  // Method to stop all instances
  async stopAllInstances() {
    for (const [instanceId, instance] of this.instances) {
      try {
        if (instance.browser) {
          await instance.browser.close();
        }
        if (instance.newProxyUrl) {
          await proxyChain.closeAnonymizedProxy(instance.newProxyUrl, true);
        }
      } catch (error) {
        console.error(`Error stopping instance ${instanceId}:`, error);
      }
    }
    this.instances.clear();
  }

  // Method to get the telegram bot instance
  getTelegramBot() {
    return this.telegramBot;
  }
}

module.exports = TelegramIntegration;
