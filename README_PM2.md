# Instagram Bot - PM2 Deployment

## 🚀 Dlaczego PM2 zamiast Docker?

### Zalety PM2:
- ✅ **Prostsze zarządzanie** - łatwiejsze uruchamianie/zatrzymywanie
- ✅ **Szybsze development** - bez overheadu kontenerów
- ✅ **Lepsze logi** - wbudowany system logowania
- ✅ **Auto-restart** - automatyczne restartowanie po błędach
- ✅ **Monitoring** - wbudowany monitoring procesów

### Kiedy używać PM2:
- Pojedyncze środowisko (development/produkcja)
- Proste aplikacje (jak nasz bot)
- Szybkie iteracje i debugowanie
- Brak potrzeby izolacji środowiska

## 📋 Instalacja PM2

### 1. Instalacja globalna:
```bash
npm install -g pm2
```

### 2. Sprawdź instalację:
```bash
pm2 --version
```

## 🔧 Konfiguracja

### Plik konfiguracyjny: `ecosystem-telegram.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'instagram-bot-telegram',
    script: 'src/telegram-bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      TELEGRAM_BOT_TOKEN: '8096285619:AAH51QOUPqvx5SDAm6LMxom8IIDg5oBQP0U',
      TELEGRAM_ALLOWED_USERS: '7647790288',
      DRY_RUN: 'true'
    }
  }]
};
```

## 🎯 Komendy PM2

### Podstawowe komendy:
```bash
# Uruchom bot
npm run pm2:start

# Sprawdź status
npm run pm2:status

# Zatrzymaj bot
npm run pm2:stop

# Restart bot
npm run pm2:restart

# Pokaż logi
npm run pm2:logs

# Monitoring (interaktywny)
npm run pm2:monit

# Usuń proces
npm run pm2:delete
```

### Bezpośrednie komendy PM2:
```bash
# Uruchom z konfiguracją
pm2 start ecosystem-telegram.config.js

# Uruchom w trybie production
pm2 start ecosystem-telegram.config.js --env production

# Sprawdź status
pm2 status

# Pokaż logi
pm2 logs instagram-bot-telegram

# Monitoring
pm2 monit

# Restart
pm2 restart instagram-bot-telegram

# Stop
pm2 stop instagram-bot-telegram

# Delete
pm2 delete instagram-bot-telegram
```

## 📊 Monitoring i Logi

### Logi:
- **Error logs**: `./logs/err.log`
- **Output logs**: `./logs/out.log`
- **Combined logs**: `./logs/combined.log`

### Monitoring:
```bash
# Interaktywny monitoring
pm2 monit

# Pokaż szczegóły procesu
pm2 show instagram-bot-telegram

# Pokaż użycie zasobów
pm2 status
```

## 🔄 Zarządzanie środowiskami

### Development:
```bash
npm run pm2:start
# Używa env z DRY_RUN=true
```

### Production:
```bash
pm2 start ecosystem-telegram.config.js --env production
# Używa env_production z DRY_RUN=false
```

## ��️ Troubleshooting

### Problem: Bot nie uruchamia się
```bash
# Sprawdź logi błędów
pm2 logs instagram-bot-telegram --err

# Sprawdź status
pm2 status

# Restart z logami
pm2 restart instagram-bot-telegram && pm2 logs
```

### Problem: Brak pamięci
```bash
# Sprawdź użycie pamięci
pm2 monit

# Zwiększ limit pamięci w config
max_memory_restart: '2G'
```

### Problem: Bot się nie restartuje
```bash
# Sprawdź konfigurację
pm2 show instagram-bot-telegram

# Wymuś restart
pm2 restart instagram-bot-telegram
```

## 📈 Monitoring i Alerty

### Podstawowe monitoring:
```bash
# Sprawdź CPU i RAM
pm2 monit

# Pokaż statystyki
pm2 status

# Pokaż szczegóły procesu
pm2 show instagram-bot-telegram
```

### Zaawansowane monitoring:
```bash
# Eksportuj metryki
pm2 install pm2-server-monit

# Web interface
pm2 install pm2-web-interface
```

## 🔧 Konfiguracja środowiska

### Zmienne środowiskowe:
```bash
# Development
NODE_ENV=development
DRY_RUN=true
TELEGRAM_BOT_TOKEN=your_token

# Production
NODE_ENV=production
DRY_RUN=false
TELEGRAM_BOT_TOKEN=your_token
```

### Dostosowanie konfiguracji:
```javascript
// ecosystem-telegram.config.js
module.exports = {
  apps: [{
    name: 'instagram-bot-telegram',
    script: 'src/telegram-bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      // Development settings
      NODE_ENV: 'development',
      DRY_RUN: 'true'
    },
    env_production: {
      // Production settings
      NODE_ENV: 'production',
      DRY_RUN: 'false'
    }
  }]
};
```

## 🚀 Deployment

### 1. Przygotowanie:
```bash
# Zainstaluj PM2
npm install -g pm2

# Sprawdź konfigurację
node test-bot.js
```

### 2. Uruchomienie:
```bash
# Development
npm run pm2:start

# Production
pm2 start ecosystem-telegram.config.js --env production
```

### 3. Monitoring:
```bash
# Sprawdź status
npm run pm2:status

# Pokaż logi
npm run pm2:logs

# Monitoring
npm run pm2:monit
```

## 📋 Checklist przed uruchomieniem:

- [ ] PM2 zainstalowany globalnie
- [ ] Token bota skonfigurowany
- [ ] ADMIN_IDS ustawione
- [ ] Katalog logs istnieje
- [ ] Konfiguracja sprawdzona
- [ ] Bot testowany lokalnie

## 🎯 Podsumowanie

PM2 jest idealnym wyborem dla Twojego bota, ponieważ:
- ✅ Prosty w użyciu
- ✅ Szybki w development
- ✅ Dobry monitoring
- ✅ Auto-restart
- ✅ Wbudowane logi

Uruchom: `npm run pm2:start` i ciesz się prostym zarządzaniem botem! 🚀
