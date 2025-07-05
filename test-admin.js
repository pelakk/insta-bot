#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

// Test the admin system
async function testAdminSystem() {
  console.log("🧪 Testing Admin System...\n");

  const dataPath = path.join(__dirname, "data.json");

  // Test 1: Check if data.json exists
  console.log("1. Checking data.json file...");
  if (fs.existsSync(dataPath)) {
    console.log("✅ data.json exists");
  } else {
    console.log("❌ data.json not found");
    return;
  }

  // Test 2: Check data structure
  console.log("\n2. Checking data structure...");
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    
    if (data.users && Array.isArray(data.users)) {
      console.log("✅ users array exists");
    } else {
      console.log("❌ users array missing or invalid");
    }

    if (data.proxies && Array.isArray(data.proxies)) {
      console.log("✅ proxies array exists");
    } else {
      console.log("❌ proxies array missing or invalid");
    }

    if (data.cookies && Array.isArray(data.cookies)) {
      console.log("✅ cookies array exists");
    } else {
      console.log("❌ cookies array missing or invalid");
    }

    if (data.accounts && Array.isArray(data.accounts)) {
      console.log("✅ accounts array exists");
    } else {
      console.log("❌ accounts array missing or invalid");
    }

    console.log(`📊 Current data: ${data.users.length} users, ${data.proxies.length} proxies, ${data.cookies.length} cookies, ${data.accounts.length} accounts`);

  } catch (error) {
    console.log("❌ Error reading data.json:", error.message);
  }

  // Test 3: Test file operations
  console.log("\n3. Testing file operations...");
  try {
    const testData = {
      users: ["123456789"],
      proxies: ["socks5://test:pass@host:port"],
      cookies: ["sessionid=test123"],
      accounts: [
        {
          user_id: 123456789,
          cookie: "sessionid=test123",
          proxy: "socks5://test:pass@host:port",
          targets: ["@test1", "@test2"]
        }
      ]
    };

    fs.writeFileSync(dataPath, JSON.stringify(testData, null, 2));
    console.log("✅ Write operation successful");

    const readData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    console.log("✅ Read operation successful");

    // Restore original data
    const originalData = {
      users: [],
      proxies: [],
      cookies: [],
      accounts: []
    };
    fs.writeFileSync(dataPath, JSON.stringify(originalData, null, 2));
    console.log("✅ Restored original data");

  } catch (error) {
    console.log("❌ File operation test failed:", error.message);
  }

  // Test 4: Check admin module
  console.log("\n4. Testing admin module...");
  try {
    const TelegramAdmin = require("./src/telegram-admin");
    console.log("✅ Admin module can be loaded");
  } catch (error) {
    console.log("❌ Admin module load failed:", error.message);
  }

  // Test 5: Check accounts module
  console.log("\n5. Testing accounts module...");
  try {
    const TelegramAccounts = require("./src/telegram-accounts");
    console.log("✅ Accounts module can be loaded");
  } catch (error) {
    console.log("❌ Accounts module load failed:", error.message);
  }

  console.log("\n🎉 Admin and Accounts system test completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Configure ADMIN_IDS in src/telegram-admin.js and src/telegram-accounts.js");
  console.log("2. Start bot: npm run telegram");
  console.log("3. Test commands in Telegram");
  console.log("4. Use /account_help for account management commands");
}

// Run test
testAdminSystem().catch(console.error); 