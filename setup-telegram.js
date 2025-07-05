#!/usr/bin/env node

"use strict";

const fs = require("fs-extra");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupTelegram() {
  console.log("🤖 InstaBot Telegram Setup");
  console.log("========================\n");

  try {
    // Check if .env exists
    const envExists = await fs.pathExists(".env");
    
    if (envExists) {
      const overwrite = await question("Plik .env już istnieje. Czy chcesz go nadpisać? (y/N): ");
      if (overwrite.toLowerCase() !== "y" && overwrite.toLowerCase() !== "yes") {
        console.log("❌ Setup przerwany.");
        rl.close();
        return;
      }
    }

    console.log("\n📝 Konfiguracja Instagram:");
    const instagramUsername = await question("Instagram Username: ");
    const instagramPassword = await question("Instagram Password: ");

    console.log("\n🤖 Konfiguracja Telegram Bot:");
    console.log("1. Otwórz Telegram i znajdź @BotFather");
    console.log("2. Wyślij /newbot");
    console.log("3. Podaj nazwę bota (np. 'InstaBot Control')");
    console.log("4. Podaj username (np. 'instabot_control_bot')");
    console.log("5. Skopiuj token\n");
    
    const telegramToken = await question("Telegram Bot Token: ");
    
    console.log("\n👥 Konfiguracja użytkowników:");
    console.log("Aby znaleźć swój Telegram User ID:");
    console.log("1. Napisz do @userinfobot w Telegram");
    console.log("2. Skopiuj swój ID\n");
    
    const allowedUsers = await question("Telegram User IDs (oddzielone przecinkami, puste = wszyscy): ");

    console.log("\n⚙️ Konfiguracja limitów:");
    const maxFollowsPerHour = await question("Max follows per hour (domyślnie 15): ") || "15";
    const maxFollowsPerDay = await question("Max follows per day (domyślnie 70): ") || "70";
    const maxLikesPerDay = await question("Max likes per day (domyślnie 30): ") || "30";

    console.log("\n🎯 Konfiguracja target users:");
    const usersToFollow = await question("Users to follow (oddzielone przecinkami): ");

    // Create .env content
    const envContent = `# Instagram Configuration
INSTAGRAM_USERNAME=${instagramUsername}
INSTAGRAM_PASSWORD=${instagramPassword}

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${telegramToken}
TELEGRAM_ALLOWED_USERS=${allowedUsers}

# Bot Limits
MAX_FOLLOWS_PER_HOUR=${maxFollowsPerHour}
MAX_FOLLOWS_PER_DAY=${maxFollowsPerDay}
MAX_LIKES_PER_DAY=${maxLikesPerDay}

# Follow Settings
FOLLOW_USER_RATIO_MIN=0.2
FOLLOW_USER_RATIO_MAX=4.0

# Target Users (comma-separated)
USERS_TO_FOLLOW=${usersToFollow}

# Optional: Session ID (if you have it)
# SESSIONID=your_session_id
`;

    // Write .env file
    await fs.writeFile(".env", envContent);

    console.log("\n✅ Konfiguracja zakończona!");
    console.log("📁 Plik .env został utworzony");
    console.log("\n🚀 Aby uruchomić bot:");
    console.log("npm run telegram");
    console.log("\n📱 W Telegram:");
    console.log("1. Znajdź swojego bota");
    console.log("2. Wyślij /start");
    console.log("3. Użyj /help aby zobaczyć dostępne komendy");

  } catch (error) {
    console.error("❌ Błąd podczas setup:", error.message);
  } finally {
    rl.close();
  }
}

// Run setup
setupTelegram(); 