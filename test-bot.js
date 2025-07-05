#!/usr/bin/env node

const TelegramBot = require("node-telegram-bot-api");

console.log("🤖 Testing Telegram Bot Connection...");

// Sprawdź czy token jest ustawiony
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.log("❌ TELEGRAM_BOT_TOKEN nie jest ustawiony!");
  console.log("📝 Ustaw token w zmiennych środowiskowych lub w pliku .env");
  console.log("🔗 Pobierz token od @BotFather na Telegram");
  process.exit(1);
}

console.log("✅ Token znaleziony:", token.substring(0, 10) + "...");

// Utwórz instancję bota
const bot = new TelegramBot(token, { polling: false });

// Test połączenia
async function testConnection() {
  try {
    console.log("🔄 Testowanie połączenia z Telegram API...");
    
    const me = await bot.getMe();
    console.log("✅ Połączenie udane!");
    console.log("🤖 Bot info:");
    console.log("   Nazwa:", me.first_name);
    console.log("   Username:", me.username);
    console.log("   ID:", me.id);
    console.log("   Can join groups:", me.can_join_groups);
    console.log("   Can read all group messages:", me.can_read_all_group_messages);
    
    console.log("\n🎉 Bot jest gotowy do użycia!");
    console.log("📱 Otwórz Telegram i wyszukaj:", me.username);
    console.log("💬 Napisz /start aby rozpocząć");
    
  } catch (error) {
    console.log("❌ Błąd połączenia:", error.message);
    console.log("🔧 Sprawdź czy token jest poprawny");
    process.exit(1);
  }
}

testConnection(); 