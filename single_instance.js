"use strict";

// Environment variables are now provided by PM2 ecosystem.config.js
// No need to load .env file anymore

const puppeteer = require("puppeteer");
const proxyChain = require("proxy-chain");

const Instauto = require(".");

// Pobierz ID instancji i IP proxy ze zmiennych środowiskowych
const instanceId = process.env.INSTANCE_ID || "1";
const proxyIp = process.env.PROXY_IP || "77.47.240.226";

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

const options = {
  cookiesPath: `./cookies_${instanceId}.json`,

  username: process.env.INSTAGRAM_USERNAME,
  password: process.env.INSTAGRAM_PASSWORD,
  sessionid: process.env.INSTAGRAM_SESSIONID,

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
  followUserMaxFollowers: null,
  followUserMaxFollowing: null,
  followUserMinFollowers: null,
  followUserMinFollowing: null,

  shouldFollowUser: null,
  shouldLikeMedia: null,

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

    const oldProxyUrl = `socks5://kamzza:bJXwSnBLy9@${proxyIp}:50101`;
    newProxyUrl = await proxyChain.anonymizeProxy({
      url: oldProxyUrl,
      port: 8000 + parseInt(instanceId), // Unikalny port dla każdej instancji
    });

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
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
    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
      skipPrivate: true,
      enableLikeImages: true,
      likeImagesMax: 3,
    });

    await instauto.sleep(10 * 60 * 1000);

    logger.log("Done running");
    await instauto.sleep(30000);
  } catch (err) {
    logger.error("Error:", err);
    process.exit(1);
  } finally {
    logger.log("Closing browser");
    if (browser) await browser.close();
    if (newProxyUrl) await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
  }
})();
