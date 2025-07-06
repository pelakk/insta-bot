const fs = require('fs');
const { generateConfig } = require('./generate_config');

// Funkcja do dodawania konta
function addAccount(username, sessionid, proxy_ip = "82.163.175.153") {
  try {
    let csvContent = '';
    
    if (fs.existsSync('./accounts.csv')) {
      csvContent = fs.readFileSync('./accounts.csv', 'utf8');
    } else {
      csvContent = 'username,sessionid,proxy_ip,proxy_username,proxy_password,proxy_port,backup_proxy_ip\n';
    }
    
    const newAccount = `${username},${sessionid},${proxy_ip},kamzza,bJXwSnBLy9,50101,77.47.240.226\n`;
    fs.writeFileSync('./accounts.csv', csvContent + newAccount);
    
    console.log(`✅ Dodano konto: ${username}`);
    return true;
  } catch (error) {
    console.error('❌ Błąd dodawania konta:', error.message);
    return false;
  }
}

// Funkcja do usuwania konta
function removeAccount(username) {
  try {
    if (!fs.existsSync('./accounts.csv')) {
      console.log('❌ Plik accounts.csv nie istnieje');
      return false;
    }
    
    const csvContent = fs.readFileSync('./accounts.csv', 'utf8');
    const lines = csvContent.split('\n');
    const header = lines[0];
    const accounts = lines.slice(1).filter(line => {
      const accountUsername = line.split(',')[0];
      return accountUsername !== username;
    });
    
    const newContent = [header, ...accounts].join('\n');
    fs.writeFileSync('./accounts.csv', newContent);
    
    console.log(`✅ Usunięto konto: ${username}`);
    return true;
  } catch (error) {
    console.error('❌ Błąd usuwania konta:', error.message);
    return false;
  }
}

// Funkcja do listowania kont
function listAccounts() {
  try {
    if (!fs.existsSync('./accounts.csv')) {
      console.log('❌ Plik accounts.csv nie istnieje');
      return;
    }
    
    const csvContent = fs.readFileSync('./accounts.csv', 'utf8');
    const lines = csvContent.split('\n');
    const accounts = lines.slice(1).filter(line => line.trim());
    
    console.log(`📊 Znaleziono ${accounts.length} kont:`);
    accounts.forEach((account, index) => {
      const username = account.split(',')[0];
      console.log(`${index + 1}. ${username}`);
    });
  } catch (error) {
    console.error('❌ Błąd listowania kont:', error.message);
  }
}

// Funkcja do szybkiego dodawania wielu kont
function addMultipleAccounts(accountsData) {
  console.log('🚀 Dodawanie wielu kont...');
  
  accountsData.forEach((account, index) => {
    console.log(`📝 Dodawanie ${index + 1}/${accountsData.length}: ${account.username}`);
    addAccount(account.username, account.sessionid, account.proxy_ip);
  });
  
  console.log('✅ Wszystkie konta dodane!');
  console.log('🔄 Generowanie konfiguracji...');
  generateConfig();
}

// CLI Interface
function showHelp() {
  console.log(`
🤖 INSTAGRAM BOT - ZARZĄDZANIE KONTAMI

Użycie:
  node manage_accounts.js add <username> <sessionid> [proxy_ip]
  node manage_accounts.js remove <username>
  node manage_accounts.js list
  node manage_accounts.js generate
  node manage_accounts.js bulk-add

Przykłady:
  node manage_accounts.js add myaccount SESSIONID_HERE
  node manage_accounts.js add myaccount SESSIONID_HERE 82.163.175.153
  node manage_accounts.js remove myaccount
  node manage_accounts.js list
  node manage_accounts.js generate
`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'add':
      if (args.length < 3) {
        console.log('❌ Brakuje argumentów: username i sessionid');
        showHelp();
        return;
      }
      addAccount(args[1], args[2], args[3]);
      generateConfig();
      break;
      
    case 'remove':
      if (args.length < 2) {
        console.log('❌ Brakuje username');
        showHelp();
        return;
      }
      removeAccount(args[1]);
      generateConfig();
      break;
      
    case 'list':
      listAccounts();
      break;
      
    case 'generate':
      generateConfig();
      break;
      
    case 'bulk-add':
      console.log('📋 Tryb bulk-add - edytuj plik accounts.csv ręcznie');
      console.log('💡 Format: username,sessionid,proxy_ip,proxy_username,proxy_password,proxy_port,backup_proxy_ip');
      break;
      
    default:
      showHelp();
  }
}

// Uruchom jeśli wywołano bezpośrednio
if (require.main === module) {
  main();
}

module.exports = { addAccount, removeAccount, listAccounts, addMultipleAccounts }; 