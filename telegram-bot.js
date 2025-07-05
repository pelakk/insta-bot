"use strict";

// Load environment variables from .env file
require("dotenv").config();

const TelegramIntegration = require("./src/telegram-integration");

// Configuration
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USERS = process.env.TELEGRAM_ALLOWED_USERS 
  ? process.env.TELEGRAM_ALLOWED_USERS.split(",") 
  : [];

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required in environment variables");
  console.error("Please set TELEGRAM_BOT_TOKEN in your .env file");
  process.exit(1);
}

console.log("🤖 Starting InstaBot with Telegram integration...");
console.log(`📱 Telegram Bot Token: ${TELEGRAM_TOKEN.substring(0, 10)}...`);
console.log(`👥 Allowed Users: ${ALLOWED_USERS.length > 0 ? ALLOWED_USERS.join(", ") : "All users"}`);

// Create Telegram integration
const telegramIntegration = new TelegramIntegration(TELEGRAM_TOKEN, ALLOWED_USERS);

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  
  try {
    await telegramIntegration.stopAllInstances();
    console.log("✅ All instances stopped successfully");
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  
  try {
    await telegramIntegration.stopAllInstances();
    console.log("✅ All instances stopped successfully");
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("❌ Uncaught Exception:", error);
  
  try {
    await telegramIntegration.stopAllInstances();
  } catch (shutdownError) {
    console.error("❌ Error during emergency shutdown:", shutdownError);
  }
  
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  
  try {
    await telegramIntegration.stopAllInstances();
  } catch (shutdownError) {
    console.error("❌ Error during emergency shutdown:", shutdownError);
  }
  
  process.exit(1);
});

console.log("✅ InstaBot with Telegram integration is running!");
console.log("📱 Send /start to your Telegram bot to begin");
console.log("💡 Use /help for available commands");

// Keep the process running
setInterval(() => {
  // Heartbeat to keep the process alive
}, 60000); 