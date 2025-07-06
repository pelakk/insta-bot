"use strict";

// Load environment variables from .env file
require("dotenv").config();

const proxyChain = require("proxy-chain");
const { createStealthBrowser } = require("./src/stealth-config");

const Instauto = require(".");
// or:
// const Instauto = require('instauto'); // eslint-disable-line import/no-unresolved

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

// Domyślny logger (używany w options, ale będzie zastąpiony)
const defaultLogger = createLogger("?");

const options = {
  cookiesPath: "./cookies.json",

  sessionid: process.env.INSTAGRAM_SESSIONID,

  // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one hour:
  maxFollowsPerHour:
    process.env.MAX_FOLLOWS_PER_HOUR != null
      ? parseInt(process.env.MAX_FOLLOWS_PER_HOUR, 10)
      : 20,
  // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one day:
  maxFollowsPerDay:
    process.env.MAX_FOLLOWS_PER_DAY != null
      ? parseInt(process.env.MAX_FOLLOWS_PER_DAY, 10)
      : 150,
  // (NOTE setting the above parameters too high will cause temp ban/throttle)

  maxLikesPerDay:
    process.env.MAX_LIKES_PER_DAY != null
      ? parseInt(process.env.MAX_LIKES_PER_DAY, 10)
      : 30,

  // Don't follow users that have a followers / following ratio less than this:
  followUserRatioMin: 0.0,
  // Don't follow users that have a followers / following ratio higher than this:
  followUserRatioMax: 999999.0,
  // Don't follow users who have more followers than this:
  followUserMaxFollowers: 999999,
  // Don't follow users who have more people following them than this:
  followUserMaxFollowing: 999999,
  // Don't follow users who have less followers than this:
  followUserMinFollowers: 0,
  // Don't follow users who have more people following them than this:
  followUserMinFollowing: 0,

  // Don't follow users who have less than this number of posts:
  minimumLikeCount: 0,
  // Don't follow users who have more than this number of posts:
  maximumLikeCount: 999999,

  // Whether to like posts after following users (controlled by SHOULD_LIKE_POSTS env var)
  shouldLikePosts: process.env.SHOULD_LIKE_POSTS === "true",

  // Number of posts to like per user
  postsToLike:
    process.env.POSTS_TO_LIKE != null
      ? parseInt(process.env.POSTS_TO_LIKE, 10)
      : 3,

  // Custom logic filter for user follow
  shouldFollowUser: null,
  /* Example to skip bussiness accounts
  shouldFollowUser: function (data) {
    console.log('isBusinessAccount:', data.isBusinessAccount);
    return !data.isBusinessAccount;
  }, */
  /* Example to skip accounts with 'crypto' & 'bitcoin' in their bio or username
  shouldFollowUser: function (data) {
    console.log('username:', data.username, 'biography:', data.biography);
    var keywords = ['crypto', 'bitcoin'];
    if (keywords.find(v => data.username.includes(v)) !== undefined || keywords.find(v => data.biography.includes(v)) !== undefined) {
      return false;
    }
    return true;
  }, */

  // Custom logic filter for liking media
  shouldLikeMedia: null,

  // NOTE: The dontUnfollowUntilTimeElapsed option is ONLY for the unfollowNonMutualFollowers function
  // This specifies the time during which the bot should not touch users that it has previously followed (in milliseconds)
  // After this time has passed, it will be able to unfollow them again.
  // TODO should remove this option from here
  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,

  // Usernames that we should not touch, e.g. your friends and actual followings
  excludeUsers: [],

  // If true, will not do any actions (defaults to true)
  dryRun: false,

  logger: defaultLogger,
};

// Funkcja do uruchomienia jednej instancji z określonym proxy
async function runInstance(instanceId, proxyIp) {
  let browser;
  let newProxyUrl;

  try {
    console.log(`[Instance ${instanceId}] Starting with proxy IP: ${proxyIp}`);

    const oldProxyUrl = `socks5://kamzza:bJXwSnBLy9@${proxyIp}:50101`;
    newProxyUrl = await proxyChain.anonymizeProxy({
      url: oldProxyUrl,
      port: 8000 + instanceId, // Unikalny port dla każdej instancji
    });

    browser = await createStealthBrowser({
      headless: true,
      args: [
        `--proxy-server=${newProxyUrl}`,
      ],
    });

    // Create a database where state will be loaded/saved to (unique for each instance)
    const instautoDb = await Instauto.JSONDB({
      followedDbPath: `./followed_${instanceId}.json`,
      unfollowedDbPath: `./unfollowed_${instanceId}.json`,
      likedPhotosDbPath: `./liked-photos_${instanceId}.json`,
    });

    // Stwórz logger specyficzny dla tej instancji
    const instanceLogger = createLogger(instanceId);
    const instanceOptions = { ...options, logger: instanceLogger };

    const instauto = await Instauto(instautoDb, browser, instanceOptions);

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
    const postsToLike = process.env.POSTS_TO_LIKE;
    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
      skipPrivate: true,
      enableLikeImages: shouldLikePosts,
      likeImagesMax: Number(postsToLike),
    });

    await instauto.sleep(10 * 60 * 1000);

    console.log(`[Instance ${instanceId}] Done running`);
    await instauto.sleep(30000);
  } catch (err) {
    console.error(`[Instance ${instanceId}] Error:`, err);
  } finally {
    console.log(`[Instance ${instanceId}] Closing browser`);
    if (browser) await browser.close();
    if (newProxyUrl) await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
  }
}

// Uruchomienie 3 instancji równolegle
(async () => {
  console.log("Starting 3 instances with different proxies...");

  const proxyIps = ["77.47.240.226", "82.163.175.153", "161.77.68.134"];

  // Uruchom wszystkie 3 instancje jednocześnie
  const promises = proxyIps.map((proxyIp, index) =>
    runInstance(index + 1, proxyIp)
  );

  try {
    await Promise.all(promises);
    console.log("All instances completed successfully!");
  } catch (err) {
    console.error("One or more instances failed:", err);
  }
})();
