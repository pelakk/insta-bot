const fs = require('fs');
const path = require('path');

// Template dla pojedynczego konta
const accountTemplate = (accountData, index) => ({
  name: accountData.username,
  script: "./single_instance.js",
  instances: 1,
  exec_mode: "fork",
  env: {
    // Instance config
    INSTANCE_ID: index.toString(),
    PROXY_IP: accountData.proxy_ip || "82.163.175.153",
    PROXY_USERNAME: accountData.proxy_username || "kamzza",
    PROXY_PASSWORD: accountData.proxy_password || "bJXwSnBLy9",
    PROXY_PORT: accountData.proxy_port || "50101",
    BACKUP_PROXY_IP: accountData.backup_proxy_ip || "77.47.240.226",

    // Instagram account
    INSTAGRAM_SESSIONID: accountData.sessionid,
    INSTAGRAM_USERNAME: accountData.username,

    // OPTIMIZED ENGAGEMENT RATE LIMITS
    MAX_FOLLOWS_PER_HOUR: "35",
    MAX_FOLLOWS_PER_DAY: "300",
    MAX_LIKES_PER_DAY: "40",

    // OPTIMAL ENGAGEMENT FILTERS
    FOLLOW_USER_RATIO_MIN: "0.2",
    FOLLOW_USER_RATIO_MAX: "5.0",
    MINIMUM_POST_COUNT: "3",
    MAXIMUM_POST_COUNT: "500",
    SHOULD_LIKE_POSTS: "true",
    POSTS_TO_LIKE: "2",
    
    // SAFE FOLLOWER TARGETING (200-10000 followers)
    FOLLOW_USER_MIN_FOLLOWERS: "200",
    FOLLOW_USER_MAX_FOLLOWERS: "10000",
    FOLLOW_USER_MIN_FOLLOWING: "100",
    FOLLOW_USER_MAX_FOLLOWING: "2000",

    // ENGAGEMENT-OPTIMIZED TARGET USERS
    USERS_TO_FOLLOW: "lelasohnabaka,vixeniaaa,gonkgonk666,zxeriascute,msliababy,grungeeaesth",
    
    // BROWSER SETTINGS
    HEADLESS: "true",  // true = niewidoczne okna, false = widoczne
  },
  error_file: `./logs/${accountData.username}.log`,
  time: false,
  autorestart: true,
  max_restarts: 10,
  restart_delay: 5000,
});

// Funkcja do parsowania CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1)
    .filter(line => line.trim() && line.split(',').length >= headers.length)
    .map(line => {
      const values = line.split(',').map(v => v.trim());
      const account = {};
      headers.forEach((header, index) => {
        account[header] = values[index];
      });
      return account;
    });
}

// Główna funkcja
function generateConfig() {
  try {
    // Sprawdź czy plik accounts.csv istnieje
    if (!fs.existsSync('./accounts.csv')) {
      console.log('❌ Plik accounts.csv nie istnieje!');
      console.log('📝 Utworzę przykładowy plik accounts.csv...');
      
      const exampleCSV = `username,sessionid,proxy_ip,proxy_username,proxy_password,proxy_port,backup_proxy_ip\nlariberrys,74377058585%3A7gBhijBAe7qLvd%3A6%3AAYeiTK6JVYXn3Ej6A6yh3iyszU0EmV1aDXW-L1RUng,82.163.175.153,kamzza,bJXwSnBLy9,50101,77.47.240.226\nexample_account2,SESSIONID_HERE,82.163.175.153,kamzza,bJXwSnBLy9,50101,77.47.240.226`;
      
      fs.writeFileSync('./accounts.csv', exampleCSV);
      console.log('✅ Utworzono accounts.csv z przykładem');
      console.log('📋 Edytuj accounts.csv i dodaj swoje konta, następnie uruchom ponownie: node generate_config.js');
      return;
    }

    // Wczytaj konta z CSV
    const csvContent = fs.readFileSync('./accounts.csv', 'utf8');
    const accounts = parseCSV(csvContent);
    
    console.log('DEBUG: Wczytane konta:', accounts);
    console.log(`📊 Znaleziono ${accounts.length} kont w accounts.csv`);
    
    // Wygeneruj konfigurację PM2
    const pm2Config = {
      apps: accounts.map((account, index) => accountTemplate(account, index + 1))
    };
    console.log('DEBUG: Wygenerowana tablica apps:', pm2Config.apps);
    
    // Zapisz do pliku jako JS, nie string!
    const configContent = 'module.exports = ' + JSON.stringify(pm2Config, null, 2) + '\n';
    fs.writeFileSync('./ecosystem.config.js', configContent);
    
    console.log('✅ Wygenerowano ecosystem.config.js');
    console.log(`🚀 Gotowe do uruchomienia: pm2 start ecosystem.config.js`);
    console.log(`📊 Będzie uruchomionych ${accounts.length} instancji`);
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  }
}

// Uruchom jeśli wywołano bezpośrednio
if (require.main === module) {
  generateConfig();
}

module.exports = { generateConfig, parseCSV }; 