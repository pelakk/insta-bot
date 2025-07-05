"use strict";

const assert = require("assert");
const fs = require("fs-extra");
const { join } = require("path");
const UserAgent = require("user-agents");
const JSONDB = require("./db");

// NOTE duplicated inside puppeteer page
function shuffleArray(arrayIn) {
  const array = [...arrayIn];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
  }
  return array;
}

// https://stackoverflow.com/questions/14822153/escape-single-quote-in-xpath-with-nokogiri
// example str: "That's mine", he said.
function escapeXpathStr(str) {
  const parts = str.split("'").map((token) => `'${token}'`);
  if (parts.length === 1) return `${parts[0]}`;
  const str2 = parts.join(', "\'", ');
  return `concat(${str2})`;
}

const botWorkShiftHours = 16;

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

const Instauto = async (db, browser, options) => {
  const {
    instagramBaseUrl = "https://www.instagram.com",
    cookiesPath,

    username: myUsernameIn,
    password,
    sessionid,
    enableCookies = true,

    randomizeUserAgent = true,
    userAgent,

    maxFollowsPerHour = 20,
    maxFollowsPerDay = 150,

    maxLikesPerDay = 50,

    followUserRatioMin = 0.2,
    followUserRatioMax = 4.0,
    followUserMaxFollowers = null,
    followUserMaxFollowing = null,
    followUserMinFollowers = null,
    followUserMinFollowing = null,

    shouldFollowUser = null,
    shouldLikeMedia = null,

    dontUnfollowUntilTimeElapsed = 3 * 24 * 60 * 60 * 1000,

    excludeUsers = [],

    dryRun = true,

    screenshotOnError = false,
    screenshotsPath = ".",

    logger = console,
  } = options;

  let myUsername = myUsernameIn;
  const userDataCache = {};

  assert(cookiesPath);
  assert(db);

  assert(
    maxFollowsPerHour * botWorkShiftHours >= maxFollowsPerDay,
    "Max follows per hour too low compared to max follows per day"
  );

  const {
    addPrevFollowedUser,
    getPrevFollowedUser,
    addPrevUnfollowedUser,
    getLikedPhotosLastTimeUnit,
    getPrevUnfollowedUsers,
    getPrevFollowedUsers,
    addLikedPhoto,
  } = db;

  const getNumLikesThisTimeUnit = (time) =>
    getLikedPhotosLastTimeUnit(time).length;

  // State
  let page;

  async function takeScreenshot() {
    if (!screenshotOnError) return;
    try {
      const fileName = `${new Date().getTime()}.jpg`;
      logger.log("Taking screenshot", fileName);
      await page.screenshot({
        path: join(screenshotsPath, fileName),
        type: "jpeg",
        quality: 30,
      });
    } catch (err) {
      logger.error("Failed to take screenshot", err);
    }
  }

  async function tryLoadCookies() {
    try {
      // Prioritet 1: Załaduj sessionid z env jeśli dostępny
      if (sessionid) {
        logger.log("Loading sessionid from environment variable");

        // Ustaw podstawowe cookies potrzebne do działania
        const basicCookies = [
          {
            name: "sessionid",
            value: sessionid,
            domain: ".instagram.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "None",
          },
          {
            name: "csrftoken",
            value: `generated_${Math.random().toString(36).substr(2, 9)}`,
            domain: ".instagram.com",
            path: "/",
            secure: true,
            httpOnly: false,
          },
          {
            name: "mid",
            value: `generated_${Math.random().toString(36).substr(2, 9)}`,
            domain: ".instagram.com",
            path: "/",
            secure: true,
            httpOnly: false,
          },
        ];

        for (const cookie of basicCookies) {
          await page.setCookie(cookie);
        }

        logger.log("Sessionid cookies set successfully");
        return true;
      }

      // Prioritet 2: Załaduj z pliku cookies
      const cookies = JSON.parse(await fs.readFile(cookiesPath));
      for (const cookie of cookies) {
        if (cookie.name !== "ig_lang") await page.setCookie(cookie);
      }
      logger.log("Cookies loaded from file");
      return true;
    } catch (err) {
      logger.error("No cookies found or failed to load:", err.message);
      return false;
    }
  }

  async function trySaveCookies() {
    try {
      logger.log("Saving cookies");
      const cookies = await page.cookies();

      await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    } catch (err) {
      logger.error("Failed to save cookies");
    }
  }

  async function tryDeleteCookies() {
    try {
      logger.log("Deleting cookies");
      await fs.unlink(cookiesPath);
    } catch (err) {
      logger.error("No cookies to delete");
    }
  }

  const sleepFixed = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const sleep = (ms, deviation = 1) => {
    let msWithDev = (Math.random() * deviation + 1) * ms;
    if (dryRun) msWithDev = Math.min(3000, msWithDev); // for dryRun, no need to wait so long
    logger.log("Waiting", (msWithDev / 1000).toFixed(2), "sec");
    return sleepFixed(msWithDev);
  };

  async function onImageLiked({ username, href }) {
    await addLikedPhoto({ username, href, time: new Date().getTime() });
  }

  function getNumFollowedUsersThisTimeUnit(timeUnit) {
    const now = new Date().getTime();

    return (
      getPrevFollowedUsers().filter((u) => now - u.time < timeUnit).length +
      getPrevUnfollowedUsers().filter(
        (u) => !u.noActionTaken && now - u.time < timeUnit
      ).length
    );
  }

  async function checkReachedFollowedUserDayLimit() {
    if (getNumFollowedUsersThisTimeUnit(dayMs) >= maxFollowsPerDay) {
      logger.log(`⏸️ Daily limit reached (${getNumFollowedUsersThisTimeUnit(dayMs)}/${maxFollowsPerDay}), waiting 10 minutes...`);
      await sleep(10 * 60 * 1000);
    }
  }

  async function checkReachedFollowedUserHourLimit() {
    if (getNumFollowedUsersThisTimeUnit(hourMs) >= maxFollowsPerHour) {
      logger.log(`⏸️ Hourly limit reached (${getNumFollowedUsersThisTimeUnit(hourMs)}/${maxFollowsPerHour}), waiting 10 minutes...`);
      await sleep(10 * 60 * 1000);
    }
  }

  async function checkReachedLikedUserDayLimit() {
    if (getNumLikesThisTimeUnit(dayMs) >= maxLikesPerDay) {
      logger.log(`⏸️ Daily like limit reached (${getNumLikesThisTimeUnit(dayMs)}/${maxLikesPerDay}), waiting 10 minutes...`);
      await sleep(10 * 60 * 1000);
    }
  }

  async function throttle() {
    await checkReachedFollowedUserDayLimit();
    await checkReachedFollowedUserHourLimit();
    await checkReachedLikedUserDayLimit();
  }

  function haveRecentlyFollowedUser(username) {
    const followedUserEntry = getPrevFollowedUser(username);
    if (!followedUserEntry) return false; // We did not previously follow this user, so don't know
    return (
      new Date().getTime() - followedUserEntry.time <
      dontUnfollowUntilTimeElapsed
    );
  }

  // See https://github.com/mifi/SimpleInstaBot/issues/140#issuecomment-1149105387
  const gotoUrl = async (url) =>
    page.goto(url, { waitUntil: ["load", "domcontentloaded", "networkidle0"] });

  async function gotoWithRetry(url) {
    const maxAttempts = 3;
    for (let attempt = 0; ; attempt += 1) {
      logger.log(`Goto ${url}`);
      const response = await gotoUrl(url);
      const status = response.status();
      logger.log("Page loaded");
      await sleep(2000);

      // https://www.reddit.com/r/Instagram/comments/kwrt0s/error_560/
      // https://github.com/mifi/instauto/issues/60
      if (![560, 429].includes(status)) return status;

      if (attempt > maxAttempts) {
        throw new Error(
          `Navigate to user failed after ${maxAttempts} attempts, last status: ${status}`
        );
      }

      logger.info(`Got ${status} - Retrying request later...`);
      if (status === 429) {
        logger.warn(
          "429 Too Many Requests could mean that Instagram suspects you're using a bot. You could try to use the Instagram Mobile app from the same IP for a few days first"
        );
      }
      await sleep((attempt + 1) * 30 * 60 * 1000);
    }
  }

  const getUserPageUrl = (username) =>
    `${instagramBaseUrl}/${encodeURIComponent(username)}`;

  function isAlreadyOnUserPage(username) {
    const url = getUserPageUrl(username);
    // optimization: already on URL? (ignore trailing slash)
    return page.url().replace(/\/$/, "") === url.replace(/\/$/, "");
  }

  async function navigateToUser(username) {
    try {
      if (isAlreadyOnUserPage(username)) return true;

      // logger.log('navigating from', page.url(), 'to', url);
      logger.log(`Navigating to user ${username}`);

      const url = getUserPageUrl(username);
      const status = await gotoWithRetry(url);
      if (status === 404) {
        logger.warn("User page returned 404");
        return false;
      }

      if (status === 200) {
        // logger.log('Page returned 200 ☑️');
        // some pages return 200 but nothing there (I think deleted accounts)
        // https://github.com/mifi/SimpleInstaBot/issues/48
        // example: https://www.instagram.com/victorialarson__/
        // so we check if the page has the user's name on it
        try {
          const elementHandles = await page.$$(
            `xpath/.//body//main//*[contains(text(),${escapeXpathStr(username)})]`
          );
          const foundUsernameOnPage = elementHandles.length > 0;
          if (!foundUsernameOnPage) {
            logger.warn(`Cannot find text "${username}" on page`);
          }
          return foundUsernameOnPage;
        } catch (error) {
          if (error.message.includes('detached') || error.message.includes('Frame')) {
            logger.warn(`Detached frame error checking username on page for ${username}`);
            return false;
          }
          throw error;
        }
      }

      throw new Error(`Navigate to user failed with status ${status}`);
    } catch (error) {
      if (error.message.includes('detached') || error.message.includes('Frame')) {
        logger.warn(`Detached frame error navigating to ${username}`);
        return false;
      }
      logger.error(`Error navigating to ${username}: ${error.message}`);
      return false;
    }
  }

  async function navigateToUserWithCheck(username) {
    if (!(await navigateToUser(username))) throw new Error("User not found");
  }

  async function navigateToUserAndGetData(username) {
    const cachedUserData = userDataCache[username];

    if (isAlreadyOnUserPage(username)) {
      // assume we have data
      return cachedUserData;
    }

    if (cachedUserData != null) {
      // if we already have userData, just navigate
      await navigateToUserWithCheck(username);
      return cachedUserData;
    }

    async function getUserDataFromPage() {
      // https://github.com/mifi/instauto/issues/115#issuecomment-1199335650
      // to test in browser: document.getElementsByTagName('html')[0].innerHTML.split('\n');
      try {
        const body = await page.content();
        for (let q of body.split(/\r?\n/)) {
          if (q.includes("edge_followed_by")) {
            // eslint-disable-next-line prefer-destructuring
            q = q.split(",[],[")[1];
            // eslint-disable-next-line prefer-destructuring
            q = q.split("]]]")[0];
            q = JSON.parse(q);
            // eslint-disable-next-line no-underscore-dangle
            q = q.data.__bbox.result.response;
            q = q.replace(/\\/g, "");
            q = JSON.parse(q);
            return q.data.user;
          }
        }
      } catch (err) {
        logger.warn(
          `Unable to get user data from page (${err.name}) - This is normal`
        );
      }
      return undefined;
    }

    async function getUserDataFromSharedData() {
      try {
        const sharedData = await page.evaluate(() => {
          if (window._sharedData && window._sharedData.entry_data && window._sharedData.entry_data.ProfilePage) {
            return window._sharedData.entry_data.ProfilePage[0].graphql.user;
          }
          return null;
        });
        
        if (sharedData) {
          logger.log(`Successfully got user data from _sharedData for ${username}`);
          return sharedData;
        }
      } catch (err) {
        logger.warn(`Failed to get user data from _sharedData for ${username}: ${err.message}`);
      }
      return undefined;
    }

    async function getUserDataFromGraphQL() {
      try {
        const graphqlData = await page.evaluate(() => {
          // Look for GraphQL data in the page
          const scripts = document.querySelectorAll('script[type="application/json"]');
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent);
              if (data && data.data && data.data.user) {
                return data.data.user;
              }
            } catch (e) {
              // Continue to next script
            }
          }
          return null;
        });
        
        if (graphqlData) {
          logger.log(`Successfully got user data from GraphQL for ${username}`);
          return graphqlData;
        }
      } catch (err) {
        logger.warn(`Failed to get user data from GraphQL for ${username}: ${err.message}`);
      }
      return undefined;
    }

    // intercept special XHR network request that fetches user's data and store it in a cache
    async function getUserDataFromInterceptedRequest() {
      const t = setTimeout(async () => {
        logger.log("Unable to intercept request, will send manually");
        try {
          await page.evaluate(async (username2) => {
            const response = await window.fetch(
              `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
                username2.toLowerCase()
              )}`,
              {
                mode: "cors",
                credentials: "include",
                headers: { "x-ig-app-id": "936619743392459" },
              }
            );
            await response.json(); // else it will not finish the request
          }, username);
        } catch (err) {
          logger.error("Failed to manually send request", err);
        }
      }, 5000);

      try {
        const [foundResponse] = await Promise.all([
          page.waitForResponse(
            (response) => {
              const request = response.request();
              return (
                request.method() === "GET" &&
                new RegExp(
                  `https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/users\\/web_profile_info\\/\\?username=${encodeURIComponent(
                    username.toLowerCase()
                  )}`
                ).test(request.url())
              );
            },
            { timeout: 30000 }
          ),
          navigateToUserWithCheck(username),
        ]);

        const json = JSON.parse(await foundResponse.text());
        return json.data.user;
      } catch (err) {
        logger.warn(`Failed to intercept network request for ${username}: ${err.message}`);
        return undefined;
      } finally {
        clearTimeout(t);
      }
    }

    logger.log(`Trying to get user data for ${username}`);

    try {
      await navigateToUserWithCheck(username);
      
      // Try multiple methods to get user data
      let userData = await getUserDataFromPage();
      if (userData) {
        logger.log(`✅ Got user data for ${username} from page method`);
        userDataCache[username] = normalizeUserData(userData);
        return userDataCache[username];
      }

      userData = await getUserDataFromSharedData();
      if (userData) {
        logger.log(`✅ Got user data for ${username} from _sharedData method`);
        userDataCache[username] = normalizeUserData(userData);
        return userDataCache[username];
      }

      userData = await getUserDataFromGraphQL();
      if (userData) {
        logger.log(`✅ Got user data for ${username} from GraphQL method`);
        userDataCache[username] = normalizeUserData(userData);
        return userDataCache[username];
      }

      userData = await getUserDataFromInterceptedRequest();
      if (userData) {
        logger.log(`✅ Got user data for ${username} from network interception method`);
        userDataCache[username] = normalizeUserData(userData);
        return userDataCache[username];
      }

      // If all methods fail, return fallback data
      logger.warn(`🔄 All methods failed for ${username}, using fallback data`);
      return normalizeUserData({
        id: "unknown",
        username: username,
        edge_followed_by: { count: 0 },
        edge_follow: { count: 0 },
        is_private: false,
        is_verified: false,
        is_business_account: false,
        is_professional_account: false,
        full_name: username,
        biography: "",
        profile_pic_url_hd: "",
        external_url: "",
        business_category_name: "",
        category_name: ""
      });

    } catch (error) {
      if (error.message.includes('detached') || error.message.includes('Frame')) {
        logger.warn(`Detached frame error accessing profile ${username}`);
        return normalizeUserData({
          id: "unknown",
          username: username,
          edge_followed_by: { count: 0 },
          edge_follow: { count: 0 },
          is_private: false,
          is_verified: false,
          is_business_account: false,
          is_professional_account: false,
          full_name: username,
          biography: "",
          profile_pic_url_hd: "",
          external_url: "",
          business_category_name: "",
          category_name: ""
        });
      }
      logger.warn(`Could not access profile ${username}: ${error.message}`);
      // Return a minimal user data object to allow following to continue
      return normalizeUserData({
        id: "unknown",
        username: username,
        edge_followed_by: { count: 0 },
        edge_follow: { count: 0 },
        is_private: false,
        is_verified: false,
        is_business_account: false,
        is_professional_account: false,
        full_name: username,
        biography: "",
        profile_pic_url_hd: "",
        external_url: "",
        business_category_name: "",
        category_name: ""
      });
    }
  }

  async function getPageJson() {
    return JSON.parse(
      await (await (await page.$("pre")).getProperty("textContent")).jsonValue()
    );
  }

  async function isActionBlocked() {
    if (
      (await page.$$('xpath/.//*[contains(text(), "Action Blocked")]')).length >
      0
    ) {
      return true;
    }
    if (
      (await page.$$('xpath/.//*[contains(text(), "Try Again Later")]'))
        .length > 0
    ) {
      return true;
    }
    return false;
  }

  async function checkActionBlocked() {
    if (await isActionBlocked()) {
      const hours = 3;
      logger.error(`Action Blocked, waiting ${hours} hours...`);
      await tryDeleteCookies();
      await sleep(hours * 60 * 60 * 1000);
      throw new Error("Aborted operation due to action blocked");
    }
  }

  // How to test xpaths in the browser:
  // document.evaluate("your xpath", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue
  async function findButtonWithText(text) {
    // Escape text for XPath
    const escapedText = text.replace(/'/g, "\\'");
    
    // Multiple selectors to handle different Instagram button structures
    const selectors = [
      // Modern Instagram button structure
      `xpath/.//header//button[contains(.,'${escapedText}')]`,
      // Old button structure
      `xpath/.//header//button[text()='${escapedText}']`,
      // Button with div inside
      `xpath/.//header//button//div[contains(text(),'${escapedText}')]/..`,
      // Button with span inside
      `xpath/.//header//button//span[contains(text(),'${escapedText}')]/..`,
      // Button with aria-label
      `xpath/.//header//button[@aria-label='${escapedText}']`,
      // Button with role="button"
      `xpath/.//header//*[@role='button'][contains(.,'${escapedText}')]`,
      // More generic selector
      `xpath/.//button[contains(.,'${escapedText}')]`,
      // CSS selector as fallback
      `button:has-text("${text}")`
    ];

    for (const selector of selectors) {
      try {
        const elementHandles = await page.$$(selector);
        if (elementHandles.length > 0) {
          // Verify the element is visible and clickable
          const element = elementHandles[0];
          const isVisible = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   el.offsetWidth > 0 && 
                   el.offsetHeight > 0;
          });
          
          if (isVisible) {
            logger.log(`🔍 Found button with text "${text}" using selector: ${selector}`);
            return element;
          }
        }
      } catch (error) {
        // Continue to next selector if this one fails
        continue;
      }
    }

    logger.warn(`⚠️ Button with text "${text}" not found with any selector`);
    return undefined;
  }

  async function findFollowButton() {
    let button = await findButtonWithText("Follow");
    if (button) return button;

    button = await findButtonWithText("Follow Back");
    if (button) return button;

    return undefined;
  }

  async function findUnfollowButton() {
    // Try multiple approaches to find the unfollow button
    const approaches = [
      // Method 1: Direct text search
      async () => {
        let button = await findButtonWithText("Following");
        if (button) return button;
        
        button = await findButtonWithText("Requested");
        if (button) return button;
        
        return null;
      },
      
      // Method 2: Aria-label search
      async () => {
        const selectors = [
          "xpath/.//header//button[*//span[@aria-label='Following']]",
          "xpath/.//header//button[*//span[@aria-label='Requested']]",
          "xpath/.//header//button[*//*[name()='svg'][@aria-label='Following']]",
          "xpath/.//header//button[*//*[name()='svg'][@aria-label='Requested']]",
          "xpath/.//button[*//span[@aria-label='Following']]",
          "xpath/.//button[*//span[@aria-label='Requested']]"
        ];
        
        for (const selector of selectors) {
          try {
            const elementHandles = await page.$$(selector);
            if (elementHandles.length > 0) {
              const element = elementHandles[0];
              // Verify element is visible
              const isVisible = await element.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       el.offsetWidth > 0 && 
                       el.offsetHeight > 0;
              });
              
              if (isVisible) {
                logger.log(`🔍 Found unfollow button using aria-label selector: ${selector}`);
                return element;
              }
            }
          } catch (error) {
            continue;
          }
        }
        return null;
      },
      
      // Method 3: Check for any button that's not "Follow"
      async () => {
        try {
          const allButtons = await page.$$("xpath/.//header//button");
          for (const button of allButtons) {
            const buttonText = await button.evaluate(el => el.textContent || el.innerText || '');
            if (buttonText && !buttonText.includes('Follow') && (buttonText.includes('Following') || buttonText.includes('Requested'))) {
              logger.log(`🔍 Found unfollow button with text: "${buttonText}"`);
              return button;
            }
          }
        } catch (error) {
          // Continue to next method
        }
        return null;
      }
    ];

    // Try each approach
    for (const approach of approaches) {
      try {
        const result = await approach();
        if (result) return result;
      } catch (error) {
        logger.warn(`⚠️ Approach failed: ${error.message}`);
        continue;
      }
    }

    logger.warn(`⚠️ Unfollow button not found with any method`);
    return undefined;
  }

  async function findUnfollowConfirmButton() {
    let elementHandles = await page.$$("xpath/.//button[text()='Unfollow']");
    if (elementHandles.length > 0) return elementHandles[0];

    // https://github.com/mifi/SimpleInstaBot/issues/191
    elementHandles = await page.$$(
      "xpath/.//*[@role='button'][contains(.,'Unfollow')]"
    );
    return elementHandles[0];
  }

  // Pre-filter function to filter out unwanted users before getting their data
  function preFilterUsers(users, targetUsername) {
    // Check if pre-filtering is enabled
    const enablePrefilter = process.env.ENABLE_PREFILTER === 'true' || true; // Default to true
    if (!enablePrefilter) {
      logger.log(`⚙️ Pre-filtering disabled, returning all ${users.length} users from @${targetUsername}`);
      return users;
    }
    
    const suspiciousKeywords = ['free', 'bot', 'promo', 'spam', 'fake', 'buy', 'sell', 'follow', 'like'];
    
    const passedPrefilter = users.filter(user => {
      // Skip private accounts
      if (user.is_private) {
        return false;
      }
      
      // Skip accounts without profile picture
      if (!user.profile_pic_url) {
        return false;
      }
      
      // Skip accounts with suspicious usernames
      const username = user.username.toLowerCase();
      for (const keyword of suspiciousKeywords) {
        if (username.includes(keyword)) {
          return false;
        }
      }
      
      // Skip accounts with very short or very long usernames (potential spam)
      if (username.length < 3 || username.length > 30) {
        return false;
      }
      
      // Skip accounts with numbers only or special characters
      if (/^[0-9]+$/.test(username) || /[^a-zA-Z0-9._]/.test(username)) {
        return false;
      }
      
      return true;
    });
    
    logger.log(`⚙️ Pre-filtered ${passedPrefilter.length} of ${users.length} users from @${targetUsername}`);
    
    return passedPrefilter;
  }

  async function followUser(username) {
    try {
      await navigateToUserAndGetData(username);
      
      // Wait for page to be fully loaded
      await sleep(2000);
      
      // Retry logic for finding the follow button
      let elementHandle = null;
      let retryCount = 0;
      const maxRetries = 5;
      while (!elementHandle && retryCount < maxRetries) {
        elementHandle = await findFollowButton();
        if (!elementHandle) {
          retryCount++;
          logger.log(`🔄 Retry ${retryCount}/${maxRetries} - Follow button not found for @${username}`);
          await sleep(1000);
        }
      }
      if (!elementHandle) {
        if (await findUnfollowButton()) {
          logger.log(`⏩ Skipped @${username} – already following this user`);
          await sleep(5000);
          return { success: false, reason: 'already_following' };
        }
        throw new Error("Follow button not found after retries");
      }
      // Check if button is visible and enabled
      const isVisible = await elementHandle.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled;
      });
      if (!isVisible) {
        logger.error(`❌ Follow button for @${username} is not visible or enabled`);
        throw new Error("Follow button not visible/enabled");
      }
      // Get button text before clicking
      const buttonTextBefore = await elementHandle.evaluate(el => el.textContent || el.innerText || '');
      logger.log(`🔍 Found follow button for @${username} with text: "${buttonTextBefore}"`);
      if (!dryRun) {
        logger.log(`🖱️ Attempting to click follow button for @${username}`);
        // Retry click if needed, try both .click() and JS click
        let clickSuccess = false;
        let clickErrorMsg = '';
        for (let i = 0; i < 3; i++) {
          try {
            await elementHandle.click();
            logger.log(`✅ Native click executed for @${username} (attempt ${i+1})`);
            clickSuccess = true;
            break;
          } catch (clickError) {
            logger.warn(`⚠️ Native click failed for @${username} (attempt ${i+1}): ${clickError.message}`);
            clickErrorMsg = clickError.message;
            // Try JS click as fallback
            try {
              await elementHandle.evaluate(el => el.click());
              logger.log(`✅ JS click executed for @${username} (attempt ${i+1})`);
              clickSuccess = true;
              break;
            } catch (jsClickError) {
              logger.warn(`⚠️ JS click failed for @${username} (attempt ${i+1}): ${jsClickError.message}`);
              clickErrorMsg = jsClickError.message;
            }
            await sleep(1000);
          }
        }
        if (!clickSuccess) {
          logger.error(`❌ Click failed for @${username} after retries. Last error: ${clickErrorMsg}`);
          await takeScreenshot();
          // Log overlay/popups if any
          const overlays = await page.$$('[role="dialog"], .modal, .overlay');
          if (overlays.length > 0) {
            logger.error(`❌ Overlay or popup detected after failed click for @${username}`);
          }
          throw new Error("Click failed after retries");
        }
        // Wait for potential state changes
        await sleep(2000);
        await checkActionBlocked();
        // Retry logic for verifying button state change
        let success = false;
        let buttonTextAfter = '';
        for (let i = 0; i < 8; i++) { // ~8s
          const unfollowBtn = await findUnfollowButton();
          if (unfollowBtn) {
            buttonTextAfter = await unfollowBtn.evaluate(el => el.textContent || el.innerText || '');
            logger.log(`🔄 After click, found unfollow button with text: "${buttonTextAfter}" (attempt ${i+1})`);
            if (/following|requested/i.test(buttonTextAfter)) {
              success = true;
              break;
            }
          } else {
            // Check if follow button still exists
            const stillFollowBtn = await findFollowButton();
            if (stillFollowBtn) {
              const stillText = await stillFollowBtn.evaluate(el => el.textContent || el.innerText || '');
              logger.log(`🔄 After click, still see follow button with text: "${stillText}" (attempt ${i+1})`);
            }
          }
          await sleep(1000);
        }
        const entry = { username, time: new Date().getTime() };
        if (!success) {
          entry.failed = true;
          logger.error(`❌ Failed to follow @${username} - button did not change to 'Following' or 'Requested' (last text: "${buttonTextAfter}")`);
          await takeScreenshot();
          throw new Error("Button did not change to 'Following' or 'Requested'");
        }
        await addPrevFollowedUser(entry);
        logger.log(`✅ Successfully followed @${username} - button changed from "${buttonTextBefore}" to "${buttonTextAfter}"`);
        return { success: true };
      } else {
        logger.log(`🔍 DRY RUN: Would follow @${username}`);
        return { success: true, dryRun: true };
      }
    } catch (error) {
      logger.error(`❌ Failed to follow @${username}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // See https://github.com/timgrossmann/InstaPy/pull/2345
  // https://github.com/timgrossmann/InstaPy/issues/2355
  async function unfollowUser(username) {
    try {
      await navigateToUserAndGetData(username);
      logger.log(`Unfollowing user ${username}`);

      const res = { username, time: new Date().getTime() };

      const elementHandle = await findUnfollowButton();
      if (!elementHandle) {
        const elementHandle2 = await findFollowButton();
        if (elementHandle2) {
          logger.log("User has been unfollowed already");
          res.noActionTaken = true;
        } else {
          logger.log("Failed to find unfollow button");
          res.noActionTaken = true;
        }
      }

      if (!dryRun) {
        if (elementHandle) {
          try {
            await elementHandle.click();
            await sleep(1000);
            const confirmHandle = await findUnfollowConfirmButton();
            if (confirmHandle) await confirmHandle.click();

            await sleep(5000);

            await checkActionBlocked();

            const elementHandle2 = await findFollowButton();
            if (!elementHandle2) {
              throw new Error("Unfollow button did not change state");
            }
          } catch (error) {
            if (error.message.includes('detached') || error.message.includes('Frame')) {
              logger.warn(`Detached frame error during unfollow for ${username}, marking as no action taken`);
              res.noActionTaken = true;
            } else {
              throw error;
            }
          }
        }

        await addPrevUnfollowedUser(res);
      }

      await sleep(1000);

      return res;
    } catch (error) {
      if (error.message.includes('detached') || error.message.includes('Frame')) {
        logger.warn(`Detached frame error for ${username}, returning no action taken`);
        return { username, time: new Date().getTime(), noActionTaken: true };
      }
      throw error;
    }
  }

  const isLoggedIn = async () => {
    try {
      // Check for Home button
      const homeButton = await page.$$('xpath/.//*[@aria-label="Home"]');
      if (homeButton.length === 0) return false;
      
      // Additional check - try to access a simple page that requires login
      await page.goto(`${instagramBaseUrl}/accounts/edit/`);
      await sleep(2000);
      
      // Check if we're redirected to login page
      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login') || currentUrl.includes('/challenge')) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.warn(`Error checking login status: ${error.message}`);
      return false;
    }
  };

  async function checkLoginStatus() {
    try {
      const isLoggedInStatus = await isLoggedIn();
      if (!isLoggedInStatus) {
        logger.error("Not logged in to Instagram. Please check your credentials or sessionid.");
        return false;
      }
      
      // Additional check - try to access our own profile
      try {
        const myUserData = await navigateToUserAndGetData(myUsername);
        if (myUserData && myUserData.id !== "unknown") {
          logger.log("Login status verified successfully");
          return true;
        } else {
          logger.warn("Login status uncertain - could not access own profile");
          return false;
        }
      } catch (err) {
        logger.warn(`Login verification failed: ${err.message}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error checking login status: ${error.message}`);
      return false;
    }
  }

  async function* graphqlQueryUsers({
    queryHash,
    getResponseProp,
    graphqlVariables: graphqlVariablesIn,
  }) {
    const graphqlUrl = `${instagramBaseUrl}/graphql/query/?query_hash=${queryHash}`;

    const graphqlVariables = {
      first: 50,
      ...graphqlVariablesIn,
    };

    const outUsers = [];

    let hasNextPage = true;
    let i = 0;
    const maxPages = 50; // Limit na liczbę stron

    while (hasNextPage && i < maxPages) {
      const url = `${graphqlUrl}&variables=${JSON.stringify(graphqlVariables)}`;
      // logger.log(url);
      await page.goto(url);
      const json = await getPageJson();

      const subProp = getResponseProp(json);
      const pageInfo = subProp.page_info;
      const { edges } = subProp;

      const ret = [];
      edges.forEach((e) => ret.push(e.node.username));

      graphqlVariables.after = pageInfo.end_cursor;
      hasNextPage = pageInfo.has_next_page;
      i += 1;

      if (hasNextPage) {
        await sleep(1000); // 1 second delay between requests
      }

      yield ret;
    }

    if (i >= maxPages) {
      logger.warn(`Reached maximum pages limit (${maxPages}), stopping pagination`);
    }

    return outUsers;
  }

  function getFollowersOrFollowingGenerator({ userId, getFollowers = false }) {
    return graphqlQueryUsers({
      getResponseProp: (json) =>
        json.data.user[getFollowers ? "edge_followed_by" : "edge_follow"],
      graphqlVariables: { id: userId },
      queryHash: getFollowers
        ? "37479f2b8209594dde7facb0d904896a"
        : "58712303d941c6855d4e888c5f0cd22f",
    });
  }

  async function getFollowersOrFollowing({ userId, getFollowers = false }) {
    let users = [];
    for await (const usersBatch of getFollowersOrFollowingGenerator({
      userId,
      getFollowers,
    })) {
      users = [...users, ...usersBatch];
    }
    return users;
  }

  async function safeGetUserFollowers(username) {
    try {
      logger.log(`Attempting to get followers for ${username}`);
      
      // First get user data
      const userData = await navigateToUserAndGetData(username);
      if (!userData || userData.id === "unknown") {
        logger.warn(`Could not get user data for ${username}, skipping followers fetch`);
        return [];
      }

      // Check if user is private
      if (userData.is_private) {
        logger.warn(`User ${username} is private, cannot get followers`);
        return [];
      }

      // Get followers using the existing generator (returns usernames only)
      const allFollowers = [];
      let followerCount = 0;
      const maxFollowersToCollect = parseInt(process.env.MAX_FOLLOWERS_TO_COLLECT_PER_TARGET || '50');
      const timeoutMs = 30000; // 30 second timeout

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout getting followers')), timeoutMs)
        );

        const followersPromise = (async () => {
          for await (const followersBatch of getFollowersOrFollowingGenerator({
            userId: userData.id,
            getFollowers: true,
          })) {
            for (const followerUsername of followersBatch) {
              allFollowers.push(followerUsername);
              followerCount++;
              
              if (followerCount >= maxFollowersToCollect) {
                logger.log(`Reached max followers limit (${maxFollowersToCollect}) for ${username}`);
                break;
              }
            }
            
            if (followerCount >= maxFollowersToCollect) break;
          }
        })();

        await Promise.race([followersPromise, timeoutPromise]);
      } catch (err) {
        if (err.message === 'Timeout getting followers') {
          logger.warn(`Timeout getting followers for ${username}, returning ${allFollowers.length} collected`);
        } else {
          logger.warn(`Failed to get followers for ${username}: ${err.message}`);
        }
        // Continue with whatever we collected
      }

      logger.log(`Successfully collected ${allFollowers.length} followers for ${username}`);
      return allFollowers;
      
    } catch (error) {
      logger.error(`Error in safeGetUserFollowers for ${username}: ${error.message}`);
      return [];
    }
  }

  function getUsersWhoLikedContent({ contentId }) {
    return graphqlQueryUsers({
      getResponseProp: (json) => json.data.shortcode_media.edge_liked_by,
      graphqlVariables: {
        shortcode: contentId,
        include_reel: true,
      },
      queryHash: "d5d763b1e2acf209d62d22d184488e57",
    });
  }

  /* eslint-disable no-undef */
  async function likeCurrentUserImagesPageCode({
    dryRun: dryRunIn,
    likeImagesMin,
    likeImagesMax,
    shouldLikeMedia: shouldLikeMediaIn,
  }) {
    const allImages = Array.from(document.getElementsByTagName("a")).filter(
      (el) => /instagram.com\/p\//.test(el.href)
    );

    // eslint-disable-next-line no-shadow
    function shuffleArray(arrayIn) {
      const array = [...arrayIn];
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
      }
      return array;
    }

    const imagesShuffled = shuffleArray(allImages);

    const numImagesToLike = Math.floor(
      Math.random() * (likeImagesMax + 1 - likeImagesMin) + likeImagesMin
    );

    instautoLog(`Liking ${numImagesToLike} image(s)`);

    const images = imagesShuffled.slice(0, numImagesToLike);

    if (images.length < 1) {
      instautoLog("No images to like");
      return;
    }

    for (const image of images) {
      image.click();

      await window.instautoSleep(3000);

      const dialog = document.querySelector("*[role=dialog]");

      if (!dialog) throw new Error("Dialog not found");

      const section = Array.from(dialog.querySelectorAll("section")).find(
        (s) =>
          s.querySelectorAll('*[aria-label="Like"]')[0] &&
          s.querySelectorAll('*[aria-label="Comment"]')[0]
      );

      if (!section) throw new Error("Like button section not found");

      const likeButtonChild = section.querySelectorAll(
        '*[aria-label="Like"]'
      )[0];

      if (!likeButtonChild) {
        throw new Error("Like button not found (aria-label)");
      }

      // eslint-disable-next-line no-inner-declarations
      function findClickableParent(el) {
        let elAt = el;
        while (elAt) {
          if (elAt.click) {
            return elAt;
          }
          elAt = elAt.parentElement;
        }
        return undefined;
      }

      const foundClickable = findClickableParent(likeButtonChild);

      if (!foundClickable) throw new Error("Like button not found");

      const instautoLog2 = instautoLog;

      // eslint-disable-next-line no-inner-declarations
      function likeImage() {
        if (
          shouldLikeMediaIn !== null &&
          typeof shouldLikeMediaIn === "function"
        ) {
          const presentation = dialog.querySelector(
            "article[role=presentation]"
          );
          const img = presentation.querySelector('img[alt^="Photo by "]');
          const video = presentation.querySelector('video[type="video/mp4"]');
          const mediaDesc = presentation.querySelector(
            "[role=menuitem] h2 ~ div"
          ).textContent;
          let mediaType;
          let src;
          let alt;
          let poster;
          if (img) {
            mediaType = "image";
            ({ src } = img);
            ({ alt } = img);
          } else if (video) {
            mediaType = "video";
            ({ poster } = video);
            ({ src } = video);
          } else {
            instautoLog2("Could not determin mediaType");
          }

          if (!shouldLikeMediaIn({ mediaType, mediaDesc, src, alt, poster })) {
            instautoLog2(
              `shouldLikeMedia returned false for ${image.href}, skipping`
            );
            return;
          }
        }

        foundClickable.click();
        window.instautoOnImageLiked(image.href);
      }

      if (!dryRunIn) {
        likeImage();
      }

      await window.instautoSleep(3000);

      const closeButtonChild = document.querySelector(
        'svg[aria-label="Close"]'
      );

      if (!closeButtonChild) {
        throw new Error("Close button not found (aria-label)");
      }

      const closeButton = findClickableParent(closeButtonChild);

      if (!closeButton) throw new Error("Close button not found");

      closeButton.click();

      await window.instautoSleep(5000);
    }

    instautoLog("Done liking images");
  }
  /* eslint-enable no-undef */

  async function likeUserImages({
    username,
    likeImagesMin,
    likeImagesMax,
  } = {}) {
    if (
      !likeImagesMin ||
      !likeImagesMax ||
      likeImagesMax < likeImagesMin ||
      likeImagesMin < 1
    ) {
      throw new Error("Invalid arguments");
    }

    await navigateToUserAndGetData(username);

    logger.log(`Liking ${likeImagesMin}-${likeImagesMax} user images`);
    try {
      await page.exposeFunction("instautoSleep", sleep);
      await page.exposeFunction("instautoLog", (...args) =>
        console.log(...args)
      );
      await page.exposeFunction("instautoOnImageLiked", (href) =>
        onImageLiked({ username, href })
      );
    } catch (err) {
      // Ignore already exists error
    }

    await page.evaluate(likeCurrentUserImagesPageCode, {
      dryRun,
      likeImagesMin,
      likeImagesMax,
      shouldLikeMedia,
    });
  }

  // Helper function to normalize user data structure
  function normalizeUserData(userData) {
    if (!userData) return null;
    
    // Map Instagram API structure to consistent format
    const normalized = {
      ...userData,
      // Map edge_followed_by.count to follower_count
      follower_count: userData.follower_count || userData.edge_followed_by?.count || 0,
      // Map edge_follow.count to following_count  
      following_count: userData.following_count || userData.edge_follow?.count || 0,
      // Ensure edge_followed_by and edge_follow exist for compatibility
      edge_followed_by: userData.edge_followed_by || { count: userData.follower_count || 0 },
      edge_follow: userData.edge_follow || { count: userData.following_count || 0 }
    };
    
    return normalized;
  }

  // Helper function to get user data with retry logic for zero followers
  async function getUserDataWithRetry(username, maxRetries = 2) {
    let lastFollowerCount = 0;
    let retryCount = 0;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const userData = await navigateToUserAndGetData(username);
        if (!userData) {
          logger.warn(`Could not get user data for @${username} on attempt ${attempt + 1}`);
          continue;
        }
        
        const normalizedData = normalizeUserData(userData);
        const followerCount = normalizedData.follower_count;
        
        logger.log(`📊 @${username} - Attempt ${attempt + 1}: ${followerCount} followers`);
        
        // If followers count is 0 and this is not the last attempt, retry
        if (followerCount === 0 && attempt < maxRetries) {
          retryCount++;
          const delayMs = 1000 + Math.random() * 1000; // 1000-2000ms random delay
          logger.log(`🔄 @${username} has 0 followers, retrying in ${Math.round(delayMs)}ms (attempt ${retryCount}/${maxRetries})`);
          await sleep(delayMs);
          continue;
        }
        
        // If we got a non-zero count or this is the last attempt, return the data
        if (followerCount > 0 || attempt === maxRetries) {
          if (followerCount === 0 && attempt === maxRetries) {
            logger.warn(`⚠️ @${username} - Final attempt: ${followerCount} followers - marking as pending for manual review`);
            // Mark as pending for manual review instead of skipping
            return { ...normalizedData, _pending_review: true, _retry_attempts: retryCount };
          }
          
          if (retryCount > 0) {
            logger.log(`✅ @${username} - Success after ${retryCount} retries: ${followerCount} followers`);
          }
          
          return { ...normalizedData, _retry_attempts: retryCount };
        }
        
      } catch (error) {
        logger.error(`❌ Error getting user data for @${username} on attempt ${attempt + 1}: ${error.message}`);
        if (attempt === maxRetries) {
          throw error;
        }
        await sleep(1000);
      }
    }
    
    // This should not be reached, but just in case
    return null;
  }

  async function followUserRespectingRestrictions({
    username,
    skipPrivate = false,
  }) {
    try {
      // Check if we've already followed this user recently
      if (haveRecentlyFollowedUser(username)) {
        logger.log(`⏩ Skipped @${username} – recently followed`);
        return { success: false, reason: 'recently_followed' };
      }

      // Check if we've reached our limits
      if (await checkReachedFollowedUserDayLimit()) {
        logger.log(`⏸️ Daily follow limit reached, skipping @${username}`);
        return { success: false, reason: 'daily_limit_reached' };
      }

      if (await checkReachedFollowedUserHourLimit()) {
        logger.log(`⏸️ Hourly follow limit reached, skipping @${username}`);
        return { success: false, reason: 'hourly_limit_reached' };
      }

      // Get user data to check filters
      const userData = await getUserDataWithRetry(username);
      if (!userData) {
        logger.log(`❌ Could not get user data for @${username}`);
        return { success: false, reason: 'no_user_data' };
      }

      // Check if user is private and we should skip private users
      if (skipPrivate && userData.is_private) {
        logger.log(`⏩ Skipped @${username} – private account`);
        return { success: false, reason: 'private_account' };
      }

      // Check if user is marked for pending review (zero followers after retries)
      if (userData._pending_review) {
        logger.log(`⏸️ @${username} marked for pending review (${userData.follower_count} followers after ${userData._retry_attempts} retries)`);
        return { success: false, reason: 'pending_review', retry_attempts: userData._retry_attempts };
      }

      // Check follower/following ratio filters
      const followerCount = userData.follower_count || 0;
      const followingCount = userData.following_count || 0;
      
      const minFollowers = parseInt(process.env.FOLLOW_USER_MIN_FOLLOWERS || '50');
      const maxFollowers = parseInt(process.env.FOLLOW_USER_MAX_FOLLOWERS || '5000');
      const minFollowing = parseInt(process.env.FOLLOW_USER_MIN_FOLLOWING || '0');
      const maxFollowing = parseInt(process.env.FOLLOW_USER_MAX_FOLLOWING || '7500');

      // Only apply minimum followers filter if the count is reliable (not 0 after retries)
      if (followerCount > 0 && followerCount < minFollowers) {
        logger.log(`⏩ Skipped @${username} – too few followers (${followerCount} < ${minFollowers})`);
        return { success: false, reason: 'too_few_followers' };
      }

      if (followerCount > maxFollowers) {
        logger.log(`⏩ Skipped @${username} – too many followers (${followerCount} > ${maxFollowers})`);
        return { success: false, reason: 'too_many_followers' };
      }

      if (followingCount < minFollowing) {
        logger.log(`⏩ Skipped @${username} – too few following (${followingCount} < ${minFollowing})`);
        return { success: false, reason: 'too_few_following' };
      }

      if (followingCount > maxFollowing) {
        logger.log(`⏩ Skipped @${username} – too many following (${followingCount} > ${maxFollowing})`);
        return { success: false, reason: 'too_many_following' };
      }

      // Attempt to follow the user
      const followResult = await followUser(username);
      
      if (followResult.success) {
        await sleep(30000);
        await throttle();
        return { success: true };
      } else {
        return followResult;
      }
    } catch (error) {
      logger.error(`❌ Error in followUserRespectingRestrictions for @${username}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async function processUserFollowers(
    username,
    {
      maxFollowsPerUser = 5,
      skipPrivate = false,
      enableLikeImages,
      likeImagesMin,
      likeImagesMax,
    } = {}
  ) {
    const enableFollow = maxFollowsPerUser > 0;

    if (enableFollow) {
      logger.log(
        `Following up to ${maxFollowsPerUser} followers of ${username}`
      );
    }
    if (enableLikeImages) {
      logger.log(
        `Liking images of up to ${likeImagesMax} followers of ${username}`
      );
    }

    await throttle();

    let numFollowedForThisUser = 0;

    const { id: userId } = await navigateToUserAndGetData(username);

    for await (const followersBatch of getFollowersOrFollowingGenerator({
      userId,
      getFollowers: true,
    })) {
      logger.log("User followers batch", followersBatch);

      for (const follower of followersBatch) {
        await throttle();

        try {
          if (enableFollow && numFollowedForThisUser >= maxFollowsPerUser) {
            logger.log("Have reached followed limit for this user, stopping");
            return;
          }

          let didActuallyFollow = false;
          if (enableFollow) {
            didActuallyFollow = await followUserRespectingRestrictions({
              username: follower,
              skipPrivate,
            });
          }
          if (didActuallyFollow) numFollowedForThisUser += 1;

          const didFailToFollow = enableFollow && !didActuallyFollow;

          if (enableLikeImages && !didFailToFollow) {
            // Note: throws error if user isPrivate
            await likeUserImages({
              username: follower,
              likeImagesMin,
              likeImagesMax,
            });
          }
        } catch (err) {
          if (err.message.includes('detached') || err.message.includes('Frame')) {
            logger.warn(`Detached frame error processing follower ${follower}, skipping`);
            continue;
          }
          logger.error(`Failed to process follower ${follower}`, err);
          await takeScreenshot();
          await sleep(20000);
        }
      }
    }
  }

  async function processUsersFollowers({
    usersToFollowFollowersOf,
    maxFollowsTotal = 150,
    skipPrivate,
    enableFollow = true,
    enableLikeImages = false,
    likeImagesMin = 1,
    likeImagesMax = 2,
  }) {
    // If maxFollowsTotal turns out to be lower than the user list size, slice off the user list
    const usersToFollowFollowersOfSliced = shuffleArray(
      usersToFollowFollowersOf
    ).slice(0, maxFollowsTotal);

    const maxFollowsPerUser =
      enableFollow && usersToFollowFollowersOfSliced.length > 0
        ? Math.floor(maxFollowsTotal / usersToFollowFollowersOfSliced.length)
        : 0;

    if (
      maxFollowsPerUser === 0 &&
      (!enableLikeImages || likeImagesMin < 1 || likeImagesMax < 1)
    ) {
      logger.warn("Nothing to follow or like");
      return;
    }

    for (const username of usersToFollowFollowersOfSliced) {
      try {
        await processUserFollowers(username, {
          maxFollowsPerUser,
          skipPrivate,
          enableLikeImages,
          likeImagesMin,
          likeImagesMax,
        });

        await sleep(10 * 60 * 1000);
        await throttle();
      } catch (err) {
        logger.error(
          "Failed to process user followers, continuing",
          username,
          err
        );
        await takeScreenshot();
        await sleep(60 * 1000);
      }
    }
  }

  async function safelyUnfollowUserList(
    usersToUnfollow,
    limit,
    condition = () => true
  ) {
    logger.log("Unfollowing users, up to limit", limit);

    let i = 0; // Number of people processed
    let j = 0; // Number of people actually unfollowed (button pressed)

    for await (const listOrUsername of usersToUnfollow) {
      // backward compatible:
      const list = Array.isArray(listOrUsername)
        ? listOrUsername
        : [listOrUsername];

      for (const username of list) {
        if (await condition(username)) {
          try {
            const userFound = await navigateToUser(username);

            if (!userFound) {
              // to avoid repeatedly unfollowing failed users, flag them as already unfollowed
              logger.log("User not found for unfollow");
              await addPrevUnfollowedUser({
                username,
                time: new Date().getTime(),
                noActionTaken: true,
              });
              await sleep(3000);
            } else {
              const { noActionTaken } = await unfollowUser(username);

              if (noActionTaken) {
                await sleep(3000);
              } else {
                await sleep(15000);
                j += 1;

                if (j % 10 === 0) {
                  logger.log(
                    "Have unfollowed 10 users since last break. Taking a break"
                  );
                  await sleep(10 * 60 * 1000, 0.1);
                }
              }
            }

            i += 1;
            logger.log(`Have now unfollowed (or tried to unfollow) ${i} users`);

            if (limit && j >= limit) {
              logger.log(`Have unfollowed limit of ${limit}, stopping`);
              return j;
            }

            await throttle();
                      } catch (err) {
              if (err.message.includes('detached') || err.message.includes('Frame')) {
                logger.warn(`Detached frame error for ${username}, skipping and continuing`);
              } else {
                logger.error("Failed to unfollow, continuing with next", err);
              }
            }
        }
      }
    }

    logger.log("Done with unfollowing", i, j);

    return j;
  }

  async function safelyFollowUserList({ users, skipPrivate, limit }) {
    let followedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const username of users) {
      try {
        const result = await followUserRespectingRestrictions({ username, skipPrivate });
        
        if (result.success) {
          followedCount++;
          logger.log(`✅ Successfully followed @${username} from list`);
        } else {
          skippedCount++;
          logger.log(`⏩ Skipped @${username}: ${result.reason || 'unknown reason'}`);
        }
        
        // Check if we've reached the limit
        if (limit && followedCount >= limit) {
          logger.log(`⏸️ Reached follow limit (${limit}), stopping`);
          break;
        }
      } catch (err) {
        errorCount++;
        logger.error(`Failed to follow user ${username}, continuing`, err);
        await takeScreenshot();
        await sleep(20000);
      }
    }

    return { followedCount, skippedCount, errorCount };
  }

  function getPage() {
    return page;
  }

  page = await browser.newPage();

  // Otwórz okienko przeglądarki dla debugowania
  if (process.env.SHOW_BROWSER === "true") {
    await page.setViewport({ width: 1280, height: 720 });
  }

  // https://github.com/mifi/SimpleInstaBot/issues/118#issuecomment-1067883091
  await page.setExtraHTTPHeaders({ "Accept-Language": "en" });

  if (randomizeUserAgent) {
    const userAgentGenerated = new UserAgent({ deviceCategory: "desktop" });
    await page.setUserAgent(userAgentGenerated.toString());
  }
  if (userAgent) await page.setUserAgent(userAgent);

  if (enableCookies) await tryLoadCookies();

  const goHome = async () => gotoUrl(`${instagramBaseUrl}/?hl=en`);

  // https://github.com/mifi/SimpleInstaBot/issues/28
  async function setLang(short, long, assumeLoggedIn = false) {
    logger.log(`Setting language to ${long} (${short})`);

    try {
      await sleep(1000);

      // when logged in, we need to go to account in order to be able to check/set language
      // (need to see the footer)
      if (assumeLoggedIn) {
        await gotoUrl(`${instagramBaseUrl}/accounts/edit/`);
      } else {
        await goHome();
      }
      await sleep(3000);
      const elementHandles = await page.$$(
        `xpath/.//select[//option[@value='${short}' and text()='${long}']]`
      );
      if (elementHandles.length < 1) {
        throw new Error("Language selector not found");
      }
      logger.log("Found language selector");

      // https://stackoverflow.com/questions/45864516/how-to-select-an-option-from-dropdown-select
      const alreadyEnglish = await page.evaluate(
        (selectElem, short2) => {
          const optionElem = selectElem.querySelector(
            `option[value='${short2}']`
          );
          if (optionElem.selected) return true; // already selected?
          optionElem.selected = true;
          // eslint-disable-next-line no-undef
          const event = new Event("change", { bubbles: true });
          selectElem.dispatchEvent(event);
          return false;
        },
        elementHandles[0],
        short
      );

      if (alreadyEnglish) {
        logger.log("Already English language");
        if (!assumeLoggedIn) {
          await goHome(); // because we were on the settings page
          await sleep(1000);
        }
        return;
      }

      logger.log("Selected language");
      await sleep(3000);
      await goHome();
      await sleep(1000);
    } catch (err) {
      logger.error("Failed to set language, trying fallback (cookie)", err);
      // This doesn't seem to always work, hence why it's just a fallback now
      await goHome();
      await sleep(1000);

      await page.setCookie({
        name: "ig_lang",
        value: short,
        path: "/",
      });
      await sleep(1000);
      await goHome();
      await sleep(3000);
    }
  }

  const setEnglishLang = async (assumeLoggedIn) =>
    setLang("en", "English", assumeLoggedIn);
  // const setEnglishLang = async (assumeLoggedIn) => setLang('de', 'Deutsch', assumeLoggedIn);

  await setEnglishLang(false);

  async function tryPressButton(elementHandles, name, sleepMs = 3000) {
    try {
      if (elementHandles.length === 1) {
        logger.log(`Pressing button: ${name}`);
        elementHandles[0].click();
        await sleep(sleepMs);
      }
    } catch (err) {
      logger.warn(`Failed to press button: ${name}`);
    }
  }

  async function tryClickLogin() {
    async function tryClickButton(xpath) {
      const btn = (await page.$$(`xpath/.${xpath}`))[0];
      if (!btn) return false;
      await btn.click();
      return true;
    }

    if (await tryClickButton("//button[.//text() = 'Log In']")) return true;
    if (await tryClickButton("//button[.//text() = 'Log in']")) return true; // https://github.com/mifi/instauto/pull/110 https://github.com/mifi/instauto/issues/109
    return false;
  }

  // Obsługa cookie consent dialogs
  await tryPressButton(
    await page.$$('xpath/.//button[contains(text(), "Accept")]'),
    "Accept cookies dialog"
  );
  await tryPressButton(
    await page.$$(
      'xpath/.//button[contains(text(), "Only allow essential cookies")]'
    ),
    "Accept cookies dialog 2 button 1",
    10000
  );
  await tryPressButton(
    await page.$$(
      'xpath/.//button[contains(text(), "Allow essential and optional cookies")]'
    ),
    "Accept cookies dialog 2 button 2",
    10000
  );
  
  // Dodatkowa obsługa przycisków cookie consent z klasami CSS
  await tryPressButton(
    await page.$$('button[class="_a9-- _ap36 _a9_0"]'),
    "Cookie consent button _a9_0",
    5000
  );
  await tryPressButton(
    await page.$$('button[class="_a9-- _ap36 _a9_1"]'),
    "Cookie consent button _a9_1",
    5000
  );
  
  // Obsługa różnych wariantów przycisków cookie
  await tryPressButton(
    await page.$$('button[class*="_a9--"]'),
    "Any cookie consent button",
    5000
  );
  
  // Obsługa przycisków przez tekst
  await tryPressButton(
    await page.$$('xpath/.//button[contains(text(), "Allow")]'),
    "Allow cookies button",
    5000
  );
  await tryPressButton(
    await page.$$('xpath/.//button[contains(text(), "Accept All")]'),
    "Accept All cookies button",
    5000
  );
  await tryPressButton(
    await page.$$('xpath/.//button[contains(text(), "Accept all")]'),
    "Accept all cookies button",
    5000
  );

  // Sprawdź czy jesteśmy już zalogowani po załadowaniu cookies
  logger.log("Checking if already logged in...");

  if (!(await isLoggedIn())) {
    logger.log("Not logged in, attempting authentication...");

    // Sprawdź czy mamy credentials do logowania
    if ((!myUsername || !password) && !sessionid) {
      await tryDeleteCookies();
      throw new Error(
        "No longer logged in and no credentials provided. Need username/password or sessionid"
      );
    }

    // Tylko próbuj logowanie username/password jeśli nie masz sessionid
    if (!sessionid && myUsername && password) {
      logger.log("Attempting username/password login...");

      try {
        await page.click('a[href="/accounts/login/?source=auth_switcher"]');
        await sleep(1000);
      } catch (err) {
        logger.info("No login page button, assuming we are on login form");
        
        // Obsługa przycisków cookie consent
        await tryPressButton(
          await page.$$('button[class="_a9-- _ap36 _a9_0"]'),
          "Cookie consent button try 1"
        );
        await tryPressButton(
          await page.$$('button[class="_a9-- _ap36 _a9_1"]'),
          "Cookie consent button try 2"
        );
        
        // Dodatkowe warianty przycisków cookie
        await tryPressButton(
          await page.$$('button[class*="_a9--"]'),
          "Any cookie consent button"
        );
        await tryPressButton(
          await page.$$('xpath/.//button[contains(text(), "Allow")]'),
          "Allow cookies button"
        );
        await tryPressButton(
          await page.$$('xpath/.//button[contains(text(), "Accept")]'),
          "Accept cookies button"
        );
        
        await sleep(1000);
      }

      // Mobile version https://github.com/mifi/SimpleInstaBot/issues/7
      await tryPressButton(
        await page.$$('xpath/.//button[contains(text(), "Log In")]'),
        "Login form button"
      );

      await page.type('input[name="username"]', myUsername, { delay: 50 });
      await sleep(1000);
      await page.type('input[name="password"]', password, { delay: 50 });
      await sleep(1000);

      for (;;) {
        const didClickLogin = await tryClickLogin();
        if (didClickLogin) break;
        logger.warn(
          "Login button not found. Maybe you can help me click it? And also report an issue on github with a screenshot of what you're seeing :)"
        );
        await sleep(6000);
      }

      await sleepFixed(10000);

      // Sometimes login button gets stuck with a spinner
      // https://github.com/mifi/SimpleInstaBot/issues/25
      if (!(await isLoggedIn())) {
        logger.log("Still not logged in, trying to reload loading page");
        await page.reload();
        await sleep(5000);
      }
    } else if (sessionid) {
      // Jeśli mamy sessionid ale nie jesteśmy zalogowani, odśwież stronę
      logger.log("Have sessionid but not logged in, refreshing page...");
      await page.reload();
      await sleep(5000);
    }

    // Ostateczne sprawdzenie logowania
    let warnedAboutLoginFail = false;
    while (!(await isLoggedIn())) {
      if (!warnedAboutLoginFail) {
        logger.warn(
          'WARNING: Login has not succeeded. This could be because of an incorrect username/password, invalid sessionid, or a "suspicious login attempt"-message. You need to manually complete the process, or if really logged in, click the Instagram logo in the top left to go to the Home page.'
        );
      }
      warnedAboutLoginFail = true;
      await sleep(5000);
    }

    // In case language gets reset after logging in
    // https://github.com/mifi/SimpleInstaBot/issues/118
    await setEnglishLang(true);

    // Mobile version https://github.com/mifi/SimpleInstaBot/issues/7
    await tryPressButton(
      await page.$$('xpath/.//button[contains(text(), "Save Info")]'),
      "Login info dialog: Save Info"
    );
    // May sometimes be "Save info" too? https://github.com/mifi/instauto/pull/70
    await tryPressButton(
      await page.$$('xpath/.//button[contains(text(), "Save info")]'),
      "Login info dialog: Save info"
    );
  } else {
    logger.log("Already logged in! Skipping authentication.");
    
    // Force re-login if SHOW_BROWSER is true (for debugging)
    if (process.env.SHOW_BROWSER === "true" && process.env.FORCE_RELOGIN === "true") {
      logger.log("FORCE_RELOGIN enabled - forcing re-authentication for debugging");
      await tryDeleteCookies();
      await page.reload();
      await sleep(3000);
      
      // This will trigger the login process again
      if (!(await isLoggedIn())) {
        logger.log("Forced re-login triggered");
        // The code will continue to the login section above
      }
    }
  }

  await tryPressButton(
    await page.$$('xpath/.//button[contains(text(), "Not Now")]'),
    "Turn on Notifications dialog"
  );

  await trySaveCookies();

  logger.log(
    `Have followed/unfollowed ${getNumFollowedUsersThisTimeUnit(
      hourMs
    )} in the last hour`
  );
  logger.log(
    `Have followed/unfollowed ${getNumFollowedUsersThisTimeUnit(
      dayMs
    )} in the last 24 hours`
  );
  logger.log(
    `Have liked ${getNumLikesThisTimeUnit(dayMs)} images in the last 24 hours`
  );

  try {
    // Try multiple methods to detect username
    const detectedUsername = await page.evaluate(() => {
      // Method 1: Old Instagram structure
      if (window._sharedData && window._sharedData.config && window._sharedData.config.viewer) {
        return window._sharedData.config.viewer.username;
      }
      
      // Method 2: New Instagram structure
      if (window.__additionalDataLoaded && window.__additionalDataLoaded['/']) {
        const data = window.__additionalDataLoaded['/'];
        if (data && data.entry_data && data.entry_data.ProfilePage && data.entry_data.ProfilePage[0]) {
          return data.entry_data.ProfilePage[0].graphql.user.username;
        }
      }
      
      // Method 3: Check for username in page content
      const usernameElement = document.querySelector('meta[property="og:url"]');
      if (usernameElement) {
        const url = usernameElement.getAttribute('content');
        const match = url.match(/instagram\.com\/([^\/]+)/);
        if (match) return match[1];
      }
      
      return null;
    });
    
    if (detectedUsername) {
      myUsername = detectedUsername;
      logger.log(`Detected username: ${detectedUsername}`);
    } else {
      logger.warn("Could not detect username automatically");
    }
  } catch (err) {
    logger.error("Failed to detect username", err);
  }

  if (!myUsername) {
    logger.warn("Could not detect username, using username from config");
    myUsername = options.username;
  }
  
  // Log the username being used
  logger.log(`Using username: ${myUsername}`);
  
  if (!myUsername) {
    throw new Error("Don't know what's my username");
  }

  // Try to get user data, but don't fail if profile is private
  let myUserId;
  try {
    const userData = await navigateToUserAndGetData(myUsername);
    myUserId = userData.id;
  } catch (error) {
    logger.warn(`Could not access profile ${myUsername}, using fallback approach`);
    // Use a fallback approach - we'll still be able to follow users
    myUserId = "unknown";
  }

  // --- END OF INITIALIZATION

  async function doesUserFollowMe(username) {
    try {
      logger.info("Checking if user", username, "follows us");
      
      // Skip this check if we don't have a valid user ID
      if (myUserId === "unknown") {
        logger.warn("Cannot check if user follows us - no valid user ID");
        return undefined;
      }
      
      // Navigate to user's profile
      await navigateToUserAndGetData(username);
      
      // Check if we can see the "Message" button (indicates they follow us)
      const messageButton = await page.$$('xpath/.//a[contains(@href, "/direct/t/")]');
      if (messageButton.length > 0) {
        logger.info(`User ${username} follows us (Message button found)`);
        return true;
      }
      
      // Alternative check: look for "Follow" button (means they don't follow us)
      const followButton = await findFollowButton();
      if (followButton) {
        logger.info(`User ${username} does NOT follow us (Follow button found)`);
        return false;
      }
      
      // Check for "Following" button (means we follow them)
      const followingButton = await findUnfollowButton();
      if (followingButton) {
        // If we follow them but can't message them, they probably don't follow us back
        logger.info(`User ${username} does NOT follow us (Following button found, no Message button)`);
        return false;
      }
      
      logger.warn(`Could not determine if ${username} follows us`);
      return undefined;
      
    } catch (err) {
      if (err.message.includes('detached') || err.message.includes('Frame')) {
        logger.warn(`Detached frame error checking if ${username} follows us, returning undefined`);
        return undefined;
      }
      logger.error("Failed to check if user follows us", err);
      return undefined;
    }
  }

  async function unfollowNonMutualFollowers({ limit } = {}) {
    logger.log(`Unfollowing non-mutual followers (limit ${limit})...`);

    /* const allFollowers = await getFollowersOrFollowing({
      userId: myUserId,
      getFollowers: true,
    }); */
    const allFollowingGenerator = getFollowersOrFollowingGenerator({
      userId: myUserId,
      getFollowers: false,
    });

    async function condition(username) {
      // if (allFollowers.includes(u)) return false; // Follows us
      if (excludeUsers.includes(username)) {
        logger.log(`User ${username} is in exclude list, skipping`);
        return false;
      }
      if (haveRecentlyFollowedUser(username)) {
        logger.log(`Have recently followed user ${username}, skipping`);
        return false;
      }

      try {
        logger.log(`Checking if ${username} follows us...`);
        const followsMe = await doesUserFollowMe(username);
        logger.info(`User ${username} follows us? ${followsMe}`);
        
        if (followsMe === true) {
          logger.log(`User ${username} follows us, skipping (mutual follower)`);
          return false;
        } else if (followsMe === false) {
          logger.log(`User ${username} does NOT follow us, will unfollow`);
          return true;
        } else {
          logger.warn(`Could not determine if ${username} follows us, skipping to be safe`);
          return false;
        }
      } catch (error) {
        if (error.message.includes('detached') || error.message.includes('Frame')) {
          logger.warn(`Detached frame error checking if ${username} follows us, skipping to be safe`);
          return false; // Skip to be safe instead of assuming they don't follow us
        }
        logger.error(`Error checking if ${username} follows us: ${error.message}`);
        return false; // Skip to be safe
      }
    }

    return safelyUnfollowUserList(allFollowingGenerator, limit, condition);
  }

  async function unfollowAllUnknown({ limit } = {}) {
    logger.log("Unfollowing all except excludes and auto followed");

    const unfollowUsersGenerator = getFollowersOrFollowingGenerator({
      userId: myUserId,
      getFollowers: false,
    });

    function condition(username) {
      if (getPrevFollowedUser(username)) return false; // we followed this user, so it's not unknown
      if (excludeUsers.includes(username)) return false; // User is excluded by exclude list
      return true;
    }

    return safelyUnfollowUserList(unfollowUsersGenerator, limit, condition);
  }

  async function unfollowOldFollowed({ ageInDays, limit } = {}) {
    assert(ageInDays);

    logger.log(
      `Unfollowing currently followed users who were auto-followed more than ${ageInDays} days ago (limit ${limit})...`
    );

    const followingUsersGenerator = getFollowersOrFollowingGenerator({
      userId: myUserId,
      getFollowers: false,
    });

    function condition(username) {
      return (
        getPrevFollowedUser(username) &&
        !excludeUsers.includes(username) &&
        (new Date().getTime() - getPrevFollowedUser(username).time) /
          (1000 * 60 * 60 * 24) >
          ageInDays
      );
    }

    return safelyUnfollowUserList(followingUsersGenerator, limit, condition);
  }

  async function listManuallyFollowedUsers() {
    const allFollowing = await getFollowersOrFollowing({
      userId: myUserId,
      getFollowers: false,
    });

    return allFollowing.filter(
      (u) => !getPrevFollowedUser(u) && !excludeUsers.includes(u)
    );
  }

  return {
    followUserFollowers: processUserFollowers,
    unfollowNonMutualFollowers,
    unfollowAllUnknown,
    unfollowOldFollowed,
    followUser,
    unfollowUser,
    likeUserImages,
    sleep,
    listManuallyFollowedUsers,
    getFollowersOrFollowing,
    getFollowersOrFollowingGenerator,
    getUsersWhoLikedContent,
    safelyUnfollowUserList,
    safelyFollowUserList,
    getPage,
    followUsersFollowers: processUsersFollowers,
    doesUserFollowMe,
    navigateToUserAndGetData,
    followUserRespectingRestrictions,
    getNumFollowedUsersThisTimeUnit,
    safeGetUserFollowers,
    checkLoginStatus,
  };
};

Instauto.JSONDB = JSONDB;

module.exports = Instauto;
