"use strict";

const assert = require("assert");
const fs = require("fs-extra");
const { join } = require("path");
const UserAgent = require("user-agents");
const JSONDB = require("./db");
const { configureStealthPage } = require("./stealth-config");

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

    minimumLikeCount = null,
    maximumLikeCount = null,

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
      logger.log("Have reached daily follow/unfollow limit, waiting 10 min");
      await sleep(10 * 60 * 1000);
    }
  }

  async function checkReachedFollowedUserHourLimit() {
    if (getNumFollowedUsersThisTimeUnit(hourMs) >= maxFollowsPerHour) {
      logger.log("Have reached hourly follow rate limit, pausing 10 min");
      await sleep(10 * 60 * 1000);
    }
  }

  async function checkReachedLikedUserDayLimit() {
    if (getNumLikesThisTimeUnit(dayMs) >= maxLikesPerDay) {
      logger.log("Have reached daily like rate limit, pausing 10 min");
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
      const elementHandles = await page.$$(
        `xpath/.//body//main//*[contains(text(),${escapeXpathStr(username)})]`
      );
      const foundUsernameOnPage = elementHandles.length > 0;
      if (!foundUsernameOnPage) {
        logger.warn(`Cannot find text "${username}" on page`);
      }
      return foundUsernameOnPage;
    }

    throw new Error(`Navigate to user failed with status ${status}`);
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

    // intercept special XHR network request that fetches user's data and store it in a cache
    // TODO fallback to DOM to get user ID if this request fails?
    // https://github.com/mifi/SimpleInstaBot/issues/125#issuecomment-1145354294
    async function getUserDataFromInterceptedRequest() {
      const t = setTimeout(async () => {
        logger.log("Unable to intercept request, will send manually");
        try {
          await page.evaluate(async (username2) => {
            try {
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
            } catch (fetchError) {
              // Silently ignore fetch errors - they're expected when API is not available
              console.log("Fetch failed, continuing with fallback methods");
            }
          }, username);
          // todo `https://i.instagram.com/api/v1/users/${userId}/info/`
          // https://www.javafixing.com/2022/07/fixed-can-get-instagram-profile-picture.html?m=1
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
          // page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);

        const json = JSON.parse(await foundResponse.text());
        return json.data.user;
      } finally {
        clearTimeout(t);
      }
    }

    logger.log("Trying to get user data from HTML");

    await navigateToUserWithCheck(username);
    let userData = await getUserDataFromPage();
    if (userData) {
      userDataCache[username] = userData;
      return userData;
    }

    logger.log("Need to intercept network request to get user data");

    // works for old accounts only:
    userData = await getUserDataFromInterceptedRequest();
    if (userData) {
      userDataCache[username] = userData;
      return userData;
    }

    return undefined;
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
    // todo escape text?

    // button seems to look like this now:
    // <button class="..."><div class="...">Follow</div></button>
    // https://sqa.stackexchange.com/questions/36918/xpath-text-buy-now-is-working-but-not-containstext-buy-now
    // https://github.com/mifi/SimpleInstaBot/issues/106
    let elementHandles = await page.$$(
      `xpath/.//header//button[contains(.,'${text}')]`
    );
    if (elementHandles.length > 0) return elementHandles[0];

    // old button:
    elementHandles = await page.$$(`xpath/.//header//button[text()='${text}']`);
    if (elementHandles.length > 0) return elementHandles[0];

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
    let button = await findButtonWithText("Following");
    if (button) return button;

    button = await findButtonWithText("Requested");
    if (button) return button;

    let elementHandles = await page.$$(
      "xpath/.//header//button[*//span[@aria-label='Following']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    elementHandles = await page.$$(
      "xpath/.//header//button[*//span[@aria-label='Requested']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    elementHandles = await page.$$(
      "xpath/.//header//button[*//*[name()='svg'][@aria-label='Following']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

    elementHandles = await page.$$(
      "xpath/.//header//button[*//*[name()='svg'][@aria-label='Requested']]"
    );
    if (elementHandles.length > 0) return elementHandles[0];

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

  async function followUser(username) {
    await navigateToUserAndGetData(username);
    const elementHandle = await findFollowButton();

    if (!elementHandle) {
      if (await findUnfollowButton()) {
        logger.log("We are already following this user");
        await sleep(5000);
        return;
      }

      throw new Error("Follow button not found");
    }

    logger.log(`Following user ${username}`);

    if (!dryRun) {
      await elementHandle.click();
      await sleep(5000);

      await checkActionBlocked();

      const elementHandle2 = await findUnfollowButton();

      // Don't want to retry this user over and over in case there is an issue https://github.com/mifi/instauto/issues/33#issuecomment-723217177
      const entry = { username, time: new Date().getTime() };
      if (!elementHandle2) entry.failed = true;

      await addPrevFollowedUser(entry);

      if (!elementHandle2) {
        logger.log("Button did not change state - Sleeping 1 min");
        await sleep(60000);
        throw new Error("Button did not change state");
      }
    }

    await sleep(1000);
  }

  // See https://github.com/timgrossmann/InstaPy/pull/2345
  // https://github.com/timgrossmann/InstaPy/issues/2355
  async function unfollowUser(username) {
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
      }

      await addPrevUnfollowedUser(res);
    }

    await sleep(1000);

    return res;
  }

  const isLoggedIn = async () => {
    // Sprawdź obecność przycisku profilu (ikona w dolnym menu, mobile)
    const profileBtn = await page.$('a[href$="/accounts/edit/"], a[href*="/accounts/"]');
    if (profileBtn) {
      logger.log("isLoggedIn: wykryto przycisk profilu (MOBILE)");
      return true;
    }
    // Sprawdź obecność przycisku Home (desktop fallback)
    const homeBtn = await page.$('xpath/.//*[@aria-label="Home"]');
    if (homeBtn) {
      logger.log("isLoggedIn: wykryto przycisk Home (DESKTOP)");
      return true;
    }
    logger.log("isLoggedIn: nie wykryto zalogowania");
    return false;
  };

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

    while (hasNextPage) {
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
        logger.log(`Has more pages (current ${i})`);
        // await sleep(300);
      }

      yield ret;
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

  async function followUserRespectingRestrictions({
    username,
    skipPrivate = false,
  }) {
    if (getPrevFollowedUser(username)) {
      logger.log("Skipping already followed user", username);
      return false;
    }

    const graphqlUser = await navigateToUserAndGetData(username);

    const {
      edge_followed_by: { count: followedByCount },
      edge_follow: { count: followsCount },
      edge_owner_to_timeline_media: { count: mediaCount } = { count: 0 },
      is_private: isPrivate,
      is_verified: isVerified,
      is_business_account: isBusinessAccount,
      is_professional_account: isProfessionalAccount,
      full_name: fullName,
      biography,
      profile_pic_url_hd: profilePicUrlHd,
      external_url: externalUrl,
      business_category_name: businessCategoryName,
      category_name: categoryName,
    } = graphqlUser;

    // logger.log('followedByCount:', followedByCount, 'followsCount:', followsCount);

    const ratio = followedByCount / (followsCount || 1);

    if (isPrivate && skipPrivate) {
      logger.log("User is private, skipping");
      return false;
    }
    if (
      (followUserMaxFollowers != null &&
        followedByCount > followUserMaxFollowers) ||
      (followUserMaxFollowing != null &&
        followsCount > followUserMaxFollowing) ||
      (followUserMinFollowers != null &&
        followedByCount < followUserMinFollowers) ||
      (followUserMinFollowing != null && followsCount < followUserMinFollowing)
    ) {
      logger.log(
        "User has too many or too few followers or following, skipping.",
        "followedByCount:",
        followedByCount,
        "followsCount:",
        followsCount
      );
      return false;
    }
    if (
      (followUserRatioMax != null && ratio > followUserRatioMax) ||
      (followUserRatioMin != null && ratio < followUserRatioMin)
    ) {
      logger.log(
        "User has too many followers compared to follows or opposite, skipping"
      );
      return false;
    }
    if (
      (minimumLikeCount != null && mediaCount < minimumLikeCount) ||
      (maximumLikeCount != null && mediaCount > maximumLikeCount)
    ) {
      logger.log(
        "User post count is outside the specified range, skipping.",
        "mediaCount:",
        mediaCount,
        "minimumLikeCount:",
        minimumLikeCount,
        "maximumLikeCount:",
        maximumLikeCount
      );
      return false;
    }
    if (
      shouldFollowUser !== null &&
      typeof shouldFollowUser === "function" &&
      !shouldFollowUser({
        username,
        isVerified,
        isBusinessAccount,
        isProfessionalAccount,
        fullName,
        biography,
        profilePicUrlHd,
        externalUrl,
        businessCategoryName,
        categoryName,
      }) === true
    ) {
      logger.log(
        `Custom follow logic returned false for ${username}, skipping`
      );
      return false;
    }

    await followUser(username);

    await sleep(30000);
    await throttle();

    return true;
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
            logger.error("Failed to unfollow, continuing with next", err);
          }
        }
      }
    }

    logger.log("Done with unfollowing", i, j);

    return j;
  }

  async function safelyFollowUserList({ users, skipPrivate, limit }) {
    logger.log("Following users, up to limit", limit);

    for (const username of users) {
      await throttle();

      try {
        await followUserRespectingRestrictions({ username, skipPrivate });
      } catch (err) {
        logger.error(`Failed to follow user ${username}, continuing`, err);
        await takeScreenshot();
        await sleep(20000);
      }
    }
  }

  function getPage() {
    return page;
  }

  page = await browser.newPage();

  // Configure stealth settings for the page
  await configureStealthPage(page);

  // https://github.com/mifi/SimpleInstaBot/issues/118#issuecomment-1067883091
  await page.setExtraHTTPHeaders({ "Accept-Language": "en" });

  if (randomizeUserAgent) {
    const userAgentGenerated = new UserAgent({ deviceCategory: "mobile" });
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
        try {
          await gotoUrl(`${instagramBaseUrl}/accounts/edit/`);
        } catch (proxyError) {
          logger.warn("Proxy error during language setup, skipping language change");
          return;
        }
      } else {
        try {
          await goHome();
        } catch (proxyError) {
          logger.warn("Proxy error during language setup, skipping language change");
          return;
        }
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

  // Sprawdź czy jesteśmy już zalogowani po załadowaniu cookies
  logger.log("Checking if already logged in...");

  if (!(await isLoggedIn())) {
    logger.log("Not logged in, attempting authentication...");

    // Sprawdź czy mamy sessionid do logowania
    if (!sessionid) {
      await tryDeleteCookies();
      throw new Error(
        "No longer logged in and no sessionid provided. Please provide INSTAGRAM_SESSIONID environment variable."
      );
    }

    // Jeśli mamy sessionid ale nie jesteśmy zalogowani, odśwież stronę
    logger.log("Have sessionid but not logged in, refreshing page...");
    await page.reload();
    await sleep(5000);

    // Ostateczne sprawdzenie logowania
    let warnedAboutLoginFail = false;
    while (!(await isLoggedIn())) {
      if (!warnedAboutLoginFail) {
        logger.warn(
          'WARNING: Login has not succeeded. This could be because of an invalid sessionid or a "suspicious login attempt"-message. You need to manually complete the process, or if really logged in, click the Instagram logo in the top left to go to the Home page.'
        );
      }
      warnedAboutLoginFail = true;
      await sleep(5000);
    }

    // In case language gets reset after logging in
    // https://github.com/mifi/SimpleInstaBot/issues/118
    await setEnglishLang(true);

    // Skuteczne zamykanie popupu "Save your login info?" (najpierw <span> 'Not now', potem X, na końcu usuwanie z DOM)
    let popupClosed = false;
    for (let i = 0; i < 20; i++) {
      // Szukaj <span> z tekstem "Not now" lub "Nie teraz"
      const notNowSpans = await page.$x("//span[contains(text(), 'Not now') or contains(text(), 'Nie teraz')]");
      if (notNowSpans.length) {
        for (const elHandle of notNowSpans) {
          // Próbuj kliknąć ancestorów do 4 poziomów w górę
          let ancestor = elHandle;
          let clicked = false;
          for (let j = 0; j < 4; j++) {
            ancestor = await ancestor.evaluateHandle(el => el.parentElement);
            if (!ancestor) break;
            try {
              await ancestor.evaluate(el => el.click());
              logger.log(`Clicked ancestor level ${j+1} of 'Not now' <span>`);
              clicked = true;
              popupClosed = true;
              break;
            } catch (e) {
              // Ignoruj, spróbuj wyżej
            }
          }
          if (clicked) break;
        }
        if (popupClosed) break;
      }
      // Spróbuj kliknąć X w prawym górnym rogu
      let closeBtn = await page.$('div[role="dialog"] svg[aria-label="Close"]');
      if (!closeBtn) {
        closeBtn = await page.$('div[role="dialog"] svg[aria-hidden="true"] path[d^="M5.707"]');
        if (closeBtn) {
          closeBtn = await closeBtn.evaluateHandle(path => path.parentElement);
        }
      }
      if (closeBtn) {
        try {
          await closeBtn.evaluate(el => el.click());
          logger.log("Clicked 'X' SVG on save login info dialog");
          popupClosed = true;
          break;
        } catch (e) {
          // Ignoruj, spróbuj dalej
        }
      }
      // Ostateczność: usuń popup z DOM
      await page.evaluate(() => {
        document.querySelectorAll('div[role="dialog"]').forEach(dialog => {
          if (dialog.innerText && (
            dialog.innerText.includes("Save your login info?") ||
            dialog.innerText.includes("Zapisz informacje o logowaniu") ||
            dialog.innerText.includes("Zapisz dane logowania")
          )) {
            dialog.remove();
          }
        });
      });
      logger.log("Removed dialog[role='dialog'] from DOM (fallback)");
      await sleep(1000);
    }
    // Po zamknięciu popupu: automatyczny test i screenshot
    await sleep(3000);
    const popupStillExists = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('div[role="dialog"]')).find(dialog =>
        dialog.innerText && (
          dialog.innerText.includes("Save your login info?") ||
          dialog.innerText.includes("Zapisz informacje o logowaniu") ||
          dialog.innerText.includes("Zapisz dane logowania")
        )
      );
    });
    if (popupStillExists) {
      logger.error("UWAGA: Popup 'Save your login info?' nadal istnieje!");
    } else {
      logger.log("Popup 'Save your login info?' został skutecznie zamknięty/usunięty.");
    }
    await page.screenshot({ path: 'after_popup.png' });
    logger.log("Screenshot zapisany: after_popup.png");

    // Mobile version https://github.com/mifi/SimpleInstaBot/issues/7
    await tryPressButton(
      await page.$$('xpath/.//button[contains(text(), "Save Info")]'),
      "Login info dialog: Save Info"
    );
    await tryPressButton(
      await page.$$('xpath/.//button[contains(text(), "Save info")]'),
      "Login info dialog: Save info"
    );
  } else {
    logger.log("Already logged in! Skipping authentication.");
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
    // First try to navigate to profile page to get better access to username
    try {
      await gotoUrl(`${instagramBaseUrl}/accounts/activity/`);
      await sleep(2000);
    } catch (err) {
      logger.warn("Could not navigate to activity page, trying alternative methods");
    }
    
    // Try multiple methods to detect username
    const detectedUsername = await page.evaluate(() => {
      // Method 1: Try the old _sharedData approach
      if (window._sharedData && window._sharedData.config && window._sharedData.config.viewer) {
        return window._sharedData.config.viewer.username;
      }
      
      // Method 2: Try to get from meta tags
      const metaUsername = document.querySelector('meta[property="og:url"]');
      if (metaUsername && metaUsername.content) {
        const match = metaUsername.content.match(/instagram\.com\/([^\/\?]+)/);
        if (match && match[1] && match[1] !== 'p' && match[1] !== 'explore' && match[1] !== 'reels') {
          return match[1];
        }
      }
      
      // Method 3: Try to get from the profile link in navigation
      const profileLink = document.querySelector('a[href^="/"][href$="/"]');
      if (profileLink && profileLink.href) {
        const match = profileLink.href.match(/instagram\.com\/([^\/\?]+)/);
        if (match && match[1] && match[1] !== 'p' && match[1] !== 'explore' && match[1] !== 'reels') {
          return match[1];
        }
      }
      
      // Method 4: Try to get from any link that looks like a profile
      const allLinks = Array.from(document.querySelectorAll('a[href^="/"]'));
      for (const link of allLinks) {
        const href = link.getAttribute('href');
        if (href && href.match(/^\/[^\/\?]+$/) && href !== '/') {
          const username = href.substring(1);
          if (username && username !== 'p' && username !== 'explore' && username !== 'reels' && username !== 'accounts') {
            return username;
          }
        }
      }
      
      // Method 5: Try to get from current URL if we're on a profile page
      const currentUrl = window.location.href;
      const urlMatch = currentUrl.match(/instagram\.com\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1] && urlMatch[1] !== 'p' && urlMatch[1] !== 'explore' && urlMatch[1] !== 'reels' && urlMatch[1] !== 'accounts') {
        return urlMatch[1];
      }
      
      // Method 6: Try to get from profile picture alt text or aria-label
      const profilePic = document.querySelector('img[alt*="@"]');
      if (profilePic && profilePic.alt) {
        const altMatch = profilePic.alt.match(/@([a-zA-Z0-9._]+)/);
        if (altMatch && altMatch[1]) {
          return altMatch[1];
        }
      }
      
      // Method 7: Try to get from any element with aria-label containing username
      const ariaElements = document.querySelectorAll('[aria-label*="@"]');
      for (const element of ariaElements) {
        const ariaMatch = element.getAttribute('aria-label').match(/@([a-zA-Z0-9._]+)/);
        if (ariaMatch && ariaMatch[1]) {
          return ariaMatch[1];
        }
      }
      
      return null;
    });
    
    if (detectedUsername) {
      myUsername = detectedUsername;
      logger.log(`Detected username: ${detectedUsername}`);
    }
  } catch (err) {
    logger.error("Failed to detect username", err);
  }

  if (!myUsername) {
    // Try to get username from environment variable as last resort
    if (process.env.INSTAGRAM_USERNAME) {
      myUsername = process.env.INSTAGRAM_USERNAME;
      logger.log(`Using username from environment variable: ${myUsername}`);
    } else {
      throw new Error("Don't know what's my username. Please set INSTAGRAM_USERNAME environment variable or ensure you're logged in to Instagram.");
    }
  }

  const { id: myUserId } = await navigateToUserAndGetData(myUsername);

  // --- END OF INITIALIZATION

  async function doesUserFollowMe(username) {
    try {
      logger.info("Checking if user", username, "follows us");
      const { id: userId } = await navigateToUserAndGetData(username);

      const elementHandles = await page.$$(
        "xpath/.//a[contains(.,' following')][contains(@href,'/following')]"
      );
      if (elementHandles.length === 0) {
        throw new Error("Following button not found");
      }

      const [foundResponse] = await Promise.all([
        page.waitForResponse((response) => {
          const request = response.request();
          return (
            request.method() === "GET" &&
            new RegExp(
              `instagram.com/api/v1/friendships/${userId}/following/`
            ).test(request.url())
          );
        }),
        elementHandles[0].click(),
        // page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);

      const { users } = JSON.parse(await foundResponse.text());
      if (users.length < 2) throw new Error("Unable to find user follows list");
      // console.log(users, myUserId);
      return users.some(
        (user) =>
          String(user.pk) === String(myUserId) || user.username === myUsername
      ); // If they follow us, we will show at the top of the list
    } catch (err) {
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
      if (excludeUsers.includes(username)) return false; // User is excluded by exclude list
      if (haveRecentlyFollowedUser(username)) {
        logger.log(`Have recently followed user ${username}, skipping`);
        return false;
      }

      const followsMe = await doesUserFollowMe(username);
      logger.info("User follows us?", followsMe);
      return followsMe === false;
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

  // Cykliczne usuwanie popupu "Save your login info?" (działa nawet na dynamiczne/mountowane popupy)
  await page.evaluateOnNewDocument(() => {
    setInterval(() => {
      // Główny DOM
      document.querySelectorAll('div[role="dialog"]').forEach(dialog => {
        if (dialog.innerText && (
          dialog.innerText.includes("Save your login info?") ||
          dialog.innerText.includes("Zapisz informacje o logowaniu") ||
          dialog.innerText.includes("Zapisz dane logowania")
        )) {
          dialog.remove();
        }
      });
      // Shadow DOM (jeśli istnieje)
      document.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          el.shadowRoot.querySelectorAll('div[role="dialog"]').forEach(dialog => {
            if (dialog.innerText && (
              dialog.innerText.includes("Save your login info?") ||
              dialog.innerText.includes("Zapisz informacje o logowaniu") ||
              dialog.innerText.includes("Zapisz dane logowania")
            )) {
              dialog.remove();
            }
          });
        }
      });
    }, 1000);
  });

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
    getUsersWhoLikedContent,
    safelyUnfollowUserList,
    safelyFollowUserList,
    getPage,
    followUsersFollowers: processUsersFollowers,
    doesUserFollowMe,
    navigateToUserAndGetData,
  };
};

Instauto.JSONDB = JSONDB;

module.exports = Instauto;
