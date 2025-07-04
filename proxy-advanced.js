'use strict';

// Load environment variables from .env file
require('dotenv').config();

const puppeteer = require('puppeteer');

const Instauto = require('.');

// Advanced proxy configuration with rotation
class ProxyManager {
  constructor() {
    this.proxyList = this.parseProxyList();
    this.currentProxyIndex = 0;
  }

  parseProxyList() {
    const proxyList = [];
    
    // Parse single proxy
    if (process.env.PROXY_SERVER) {
      proxyList.push({
        server: process.env.PROXY_SERVER,
        auth: process.env.PROXY_AUTH ? process.env.PROXY_AUTH.split(':') : null
      });
    }
    
    // Parse multiple proxies (comma-separated)
    if (process.env.PROXY_LIST) {
      const proxies = process.env.PROXY_LIST.split(',');
      proxies.forEach(proxy => {
        const [server, auth] = proxy.split('@');
        if (server) {
          proxyList.push({
            server: server.trim(),
            auth: auth ? auth.split(':') : null
          });
        }
      });
    }
    
    return proxyList;
  }

  getCurrentProxy() {
    if (this.proxyList.length === 0) return null;
    return this.proxyList[this.currentProxyIndex];
  }

  rotateProxy() {
    if (this.proxyList.length > 1) {
      this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
      console.log(`Rotated to proxy: ${this.proxyList[this.currentProxyIndex].server}`);
    }
  }

  getPuppeteerArgs() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ];

    const proxy = this.getCurrentProxy();
    if (proxy) {
      args.push(`--proxy-server=${proxy.server}`);
      console.log(`Using proxy: ${proxy.server}`);
    }

    return args;
  }

  async authenticateProxy(browser) {
    const proxy = this.getCurrentProxy();
    if (proxy && proxy.auth) {
      const page = await browser.newPage();
      await page.authenticate({ 
        username: proxy.auth[0], 
        password: proxy.auth[1] 
      });
      await page.close();
      console.log(`Authenticated proxy with user: ${proxy.auth[0]}`);
    }
  }
}

// Custom logger with timestamps
const log = (fn, ...args) => console[fn](new Date().toISOString(), ...args);
const logger = Object.fromEntries(
  ['log', 'info', 'debug', 'error', 'trace', 'warn'].map((fn) => [
    fn,
    (...args) => log(fn, ...args),
  ]),
);

const options = {
  cookiesPath: './cookies.json',
  username: process.env.INSTAGRAM_USERNAME,
  password: process.env.INSTAGRAM_PASSWORD,
  maxFollowsPerHour: process.env.MAX_FOLLOWS_PER_HOUR != null
    ? parseInt(process.env.MAX_FOLLOWS_PER_HOUR, 10)
    : 20,
  maxFollowsPerDay: process.env.MAX_FOLLOWS_PER_DAY != null
    ? parseInt(process.env.MAX_FOLLOWS_PER_DAY, 10)
    : 150,
  maxLikesPerDay: process.env.MAX_LIKES_PER_DAY != null
    ? parseInt(process.env.MAX_LIKES_PER_DAY, 10)
    : 30,
  // Enable/disable likes functionality
  enableLikes: process.env.ENABLE_LIKES !== 'false',
  followUserRatioMin: process.env.FOLLOW_USER_RATIO_MIN != null
    ? parseFloat(process.env.FOLLOW_USER_RATIO_MIN)
    : 0.2,
  followUserRatioMax: process.env.FOLLOW_USER_RATIO_MAX != null
    ? parseFloat(process.env.FOLLOW_USER_RATIO_MAX)
    : 4.0,
  followUserMaxFollowers: process.env.FOLLOW_USER_MAX_FOLLOWERS != null
    ? parseInt(process.env.FOLLOW_USER_MAX_FOLLOWERS, 10)
    : null,
  followUserMaxFollowing: process.env.FOLLOW_USER_MAX_FOLLOWING != null
    ? parseInt(process.env.FOLLOW_USER_MAX_FOLLOWING, 10)
    : null,
  followUserMinFollowers: process.env.FOLLOW_USER_MIN_FOLLOWERS != null
    ? parseInt(process.env.FOLLOW_USER_MIN_FOLLOWERS, 10)
    : null,
  followUserMinFollowing: process.env.FOLLOW_USER_MIN_FOLLOWING != null
    ? parseInt(process.env.FOLLOW_USER_MIN_FOLLOWING, 10)
    : null,
  shouldFollowUser: null,
  shouldLikeMedia: null,
  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,
  excludeUsers: [],
  dryRun: false,
  logger,
};

(async () => {
  let browser;
  const proxyManager = new ProxyManager();

  try {
    console.log(`Available proxies: ${proxyManager.proxyList.length}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: proxyManager.getPuppeteerArgs(),
    });

    // Authenticate proxy if needed
    await proxyManager.authenticateProxy(browser);

    // Create database
    const instautoDb = await Instauto.JSONDB({
      followedDbPath: './followed.json',
      unfollowedDbPath: './unfollowed.json',
      likedPhotosDbPath: './liked-photos.json',
    });

    const instauto = await Instauto(instautoDb, browser, options);

    // Log likes configuration
    console.log(`Likes functionality: ${options.enableLikes ? 'ENABLED' : 'DISABLED'}`);

    // Example: Rotate proxy every hour
    const rotateProxyInterval = setInterval(() => {
      proxyManager.rotateProxy();
    }, 60 * 60 * 1000); // 1 hour

    // Your bot logic here
    const usersToFollowFollowersOf = process.env.USERS_TO_FOLLOW != null
      ? process.env.USERS_TO_FOLLOW.split(',')
      : [];

    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: options.maxFollowsPerDay,
      skipPrivate: true,
      enableLikeImages: options.enableLikes,
      likeImagesMax: options.enableLikes ? 3 : 0,
    });

    clearInterval(rotateProxyInterval);
    console.log('Done running');

  } catch (err) {
    console.error('Error:', err);
    
    // Rotate proxy on error
    if (proxyManager.proxyList.length > 1) {
      console.log('Rotating proxy due to error...');
      proxyManager.rotateProxy();
    }
  } finally {
    console.log('Closing browser');
    if (browser) await browser.close();
  }
})(); 