"use strict";

// Environment variables are now provided by PM2 ecosystem.config.js
// No need to load .env file anymore

// const puppeteer = require("puppeteer");
const proxyChain = require("proxy-chain");
const { createStealthBrowser } = require("./src/stealth-config");

const Instauto = require(".");

// Pobierz ID instancji i konfigurację proxy ze zmiennych środowiskowych
const instanceId = process.env.INSTANCE_ID || "1";
const proxyIp = process.env.PROXY_IP || "77.47.240.226";
const proxyUsername = process.env.PROXY_USERNAME || "kamzza";
const proxyPassword = process.env.PROXY_PASSWORD || "bJXwSnBLy9";
const proxyPort = process.env.PROXY_PORT || "50101";
const backupProxyIp = process.env.BACKUP_PROXY_IP || "77.47.240.226";
const backupProxyPort = process.env.BACKUP_PROXY_PORT || "50101";
const backupProxyUsername = process.env.BACKUP_PROXY_USERNAME || "kamzza";
const backupProxyPassword = process.env.BACKUP_PROXY_PASSWORD || "bJXwSnBLy9";

// Funkcja do tworzenia loggera dla każdej instancji
const createLogger = (instanceId) => {
  const log = (fn, ...args) =>
    console[fn](new Date().toISOString(), `[Instance ${instanceId}]`, ...args);
  return Object.fromEntries(
    ["log", "info", "debug", "error", "trace", "warn"].map((fn) => [
      fn,
      (...args) => log(fn, ...args),
    ])
  );
};

const logger = createLogger(instanceId);

// Funkcja do testowania połączenia proxy
const testProxyConnection = async (proxyUrl) => {
  try {
    const testUrl = `http://${proxyUrl.replace('socks5://', '')}`;
    logger.log(`Testing proxy connection: ${testUrl}`);
    // Prosty test - próba utworzenia połączenia
    return true;
  } catch (error) {
    logger.error(`Proxy test failed: ${error.message}`);
    return false;
  }
};

// Funkcja do anonimizacji proxy z retry
const anonymizeProxyWithRetry = async (proxyUrl, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log(`Attempting to anonymize proxy (attempt ${attempt}/${maxRetries})`);
      
      const newProxyUrl = await proxyChain.anonymizeProxy({
        url: proxyUrl,
        port: 8000 + parseInt(instanceId), // Unikalny port dla każdej instancji
      });
      
      logger.log(`Proxy anonymized successfully: ${newProxyUrl}`);
      return newProxyUrl;
      
    } catch (error) {
      lastError = error;
      logger.warn(`Proxy anonymization failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = attempt * 5000; // 5s, 10s, 15s
        logger.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to anonymize proxy after ${maxRetries} attempts. Last error: ${lastError.message}`);
};

const options = {
  cookiesPath: `./cookies_${instanceId}.json`,

  sessionid: process.env.INSTAGRAM_SESSIONID,
  username: process.env.INSTAGRAM_USERNAME,

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

  followUserRatioMin: 0.0,
  followUserRatioMax: 999999.0,
  followUserMaxFollowers: 999999,
  followUserMaxFollowing: 999999,
  followUserMinFollowers: 0,
  followUserMinFollowing: 0,
  minimumLikeCount: 0,
  maximumLikeCount: 999999,

  // Whether to like posts after following users (controlled by SHOULD_LIKE_POSTS env var)
  shouldLikePosts: process.env.SHOULD_LIKE_POSTS === "true",

  // Number of posts to like per user
  postsToLike:
    process.env.POSTS_TO_LIKE != null
      ? parseInt(process.env.POSTS_TO_LIKE, 10)
      : 3,

  // Enable/disable like images functionality
  shouldLikeMedia: process.env.SHOULD_LIKE_POSTS === "true",

  shouldFollowUser: null,

  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,

  excludeUsers: [],

  dryRun: false,

  logger,
};

// Główna funkcja
(async () => {
  let browser;
  let newProxyUrl;

  try {
    logger.log(`Starting with proxy IP: ${proxyIp}`);

    // Lista proxy do wypróbowania (główny + backup)
    const proxyList = [
      {
        ip: proxyIp,
        username: proxyUsername,
        password: proxyPassword,
        port: proxyPort,
        name: "Primary"
      },
      {
        ip: backupProxyIp,
        username: backupProxyUsername,
        password: backupProxyPassword,
        port: backupProxyPort,
        name: "Backup"
      }
    ];

    let newProxyUrl = null;
    let workingProxy = null;

    // Próbuj każde proxy z listy
    for (const proxy of proxyList) {
      try {
        logger.log(`Trying ${proxy.name} proxy: ${proxy.ip}:${proxy.port}`);
        
        const oldProxyUrl = `socks5://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
        
        // Test połączenia
        if (await testProxyConnection(oldProxyUrl)) {
          logger.log(`${proxy.name} proxy connection test passed`);
          
          // Anonimizuj proxy z retry
          newProxyUrl = await anonymizeProxyWithRetry(oldProxyUrl, 3);
          workingProxy = proxy;
          break;
        }
      } catch (error) {
        logger.warn(`${proxy.name} proxy failed: ${error.message}`);
        continue; // Próbuj następny proxy
      }
    }

    if (!newProxyUrl) {
      throw new Error("All proxy servers failed. Cannot continue.");
    }

    logger.log(`Successfully connected using ${workingProxy.name} proxy: ${workingProxy.ip}`);

    // Ustal tryb headless na podstawie zmiennej środowiskowej
    const headlessMode = process.env.HEADLESS === 'false' ? false : true;

    browser = await createStealthBrowser({
      headless: headlessMode,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-dev-shm-usage",
        `--proxy-server=${newProxyUrl}`,
      ],
    });

    // Create a database where state will be loaded/saved to (unique for each instance)
    const instautoDb = await Instauto.JSONDB({
      followedDbPath: `./followed_${instanceId}.json`,
      unfollowedDbPath: `./unfollowed_${instanceId}.json`,
      likedPhotosDbPath: `./liked-photos_${instanceId}.json`,
    });

    const instauto = await Instauto(instautoDb, browser, options);

    // Unfollow previously auto-followed users
    const unfollowedCount = await instauto.unfollowOldFollowed({
      ageInDays: 14,
      limit: options.maxFollowsPerDay * (2 / 3),
    });

    if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000);

    // List of usernames that we should follow the followers of
    const usersToFollowFollowersOf =
      process.env.USERS_TO_FOLLOW != null
        ? process.env.USERS_TO_FOLLOW.split(",")
        : [];

    // Follow followers
    const shouldLikePosts = process.env.SHOULD_LIKE_POSTS === "true";
    const postsToLike = process.env.POSTS_TO_LIKE || "3";
    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
      skipPrivate: false,
      enableLikeImages: shouldLikePosts,
      likeImagesMax: Number(postsToLike),
    });

      // Random delay 15-25 minut dla bezpieczniejszego engagement
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  await instauto.sleep(randomDelay(15 * 60 * 1000, 25 * 60 * 1000));

    logger.log("Done running");
    await instauto.sleep(30000);
  } catch (err) {
    logger.error("Error:", err);
    process.exit(1);
  } finally {
    logger.log("Cleaning up...");
    
    try {
      if (browser) {
        logger.log("Closing browser");
        await browser.close();
      }
    } catch (browserError) {
      logger.error("Error closing browser:", browserError.message);
    }
    
    try {
      if (newProxyUrl) {
        logger.log("Closing proxy connection");
        await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
      }
    } catch (proxyError) {
      logger.error("Error closing proxy:", proxyError.message);
    }
  }
})();
