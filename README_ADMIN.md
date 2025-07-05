# InstaBot Admin System 🔧

System administracyjny dla InstaBot z zarządzaniem użytkownikami, proxy i cookies przez Telegram.

## 🚀 Funkcje Administracyjne

### 👥 Zarządzanie Użytkownikami
- **Dodawanie użytkowników** - `/add_user <user_id>`
- **Usuwanie użytkowników** - `/remove_user <user_id>`
- **Lista użytkowników** - `/list_users`

### 🌐 Zarządzanie Proxy
- **Dodawanie proxy** - `/add_proxy <proxy_url>`
- **Usuwanie proxy** - `/remove_proxy <proxy_url>`
- **Lista proxy** - `/list_proxies`

### 🍪 Zarządzanie Cookies
- **Dodawanie cookies** - `/add_cookie <cookie_data>`
- **Usuwanie cookies** - `/remove_cookie <cookie_data>`
- **Lista cookies** - `/list_cookies`

## 🔐 Bezpieczeństwo

### Admin IDs
Tylko użytkownicy z listy `ADMIN_IDS` mają dostęp do komend administracyjnych:

```javascript
const ADMIN_IDS = [123456789]; // Zastąp swoim ID
```

### Jak znaleźć swój Telegram User ID:
1. Napisz do [@userinfobot](https://t.me/userinfobot) w Telegram
2. Skopiuj swój ID
3. Dodaj do tablicy `ADMIN_IDS` w pliku `src/telegram-admin.js`

## 📋 Komendy Administracyjne

### Zarządzanie Użytkownikami

| Komenda | Opis | Przykład |
|---------|------|----------|
| `/add_user` | Dodaj użytkownika | `/add_user 123456789` |
| `/remove_user` | Usuń użytkownika | `/remove_user 123456789` |
| `/list_users` | Lista użytkowników | `/list_users` |

### Zarządzanie Proxy

| Komenda | Opis | Przykład |
|---------|------|----------|
| `/add_proxy` | Dodaj proxy | `/add_proxy socks5://user:pass@host:port` |
| `/remove_proxy` | Usuń proxy | `/remove_proxy socks5://user:pass@host:port` |
| `/list_proxies` | Lista proxy | `/list_proxies` |

### Zarządzanie Cookies

| Komenda | Opis | Przykład |
|---------|------|----------|
| `/add_cookie` | Dodaj cookie | `/add_cookie sessionid=abc123` |
| `/remove_cookie` | Usuń cookie | `/remove_cookie sessionid=abc123` |
| `/list_cookies` | Lista cookies | `/list_cookies` |

### Pomoc

| Komenda | Opis |
|---------|------|
| `/admin_help` | Pomoc dla komend administracyjnych |

## 📁 Struktura Danych

Dane są przechowywane w pliku `data.json`:

```json
{
  "users": ["123456789", "987654321"],
  "proxies": [
    "socks5://user:pass@host1:port1",
    "socks5://user:pass@host2:port2"
  ],
  "cookies": [
    "sessionid=abc123",
    "csrftoken=def456"
  ]
}
```

## 🔧 Instalacja i Konfiguracja

### 1. Skonfiguruj Admin ID

Edytuj plik `src/telegram-admin.js`:

```javascript
const ADMIN_IDS = [123456789]; // Zastąp swoim ID
```

### 2. Uruchom bot

```bash
# Uruchom z PM2
pm2 start ecosystem-telegram.config.js

# Lub bezpośrednio
npm run telegram
```

### 3. Dodaj użytkowników

W Telegram:
```
/add_user 123456789
/add_user 987654321
```

### 4. Dodaj proxy

```
/add_proxy socks5://kamzza:bJXwSnBLy9@77.47.240.226:50101
/add_proxy socks5://kamzza:bJXwSnBLy9@82.163.175.153:50101
```

### 5. Dodaj cookies

```
/add_cookie sessionid=your_session_id
/add_cookie csrftoken=your_csrf_token
```

## 📊 Przykłady Użycia

### Dodawanie użytkownika:
```
/add_user 123456789
✅ Użytkownik 123456789 został dodany.
```

### Lista użytkowników:
```
/list_users
📋 Lista użytkowników:

• 123456789
• 987654321

Łącznie: 2 użytkowników
```

### Dodawanie proxy:
```
/add_proxy socks5://user:pass@host:port
✅ Proxy socks5://user:pass@host:port zostało dodane.
```

### Lista proxy:
```
/list_proxies
🌐 Lista proxy:

• socks5://kamzza:bJXwSnBLy9@77.47.240.226:50101
• socks5://kamzza:bJXwSnBLy9@82.163.175.153:50101

Łącznie: 2 proxy
```

## 🔄 Integracja z PM2

### Uruchomienie:
```bash
pm2 start ecosystem-telegram.config.js
```

### Monitorowanie:
```bash
pm2 status
pm2 logs instabot-telegram
```

### Restart:
```bash
pm2 restart instabot-telegram
```

### Stop:
```bash
pm2 stop instabot-telegram
```

## 🛡️ Walidacja

Każda komenda zawiera walidację:

- **Brak argumentu** → wyświetl poprawny sposób użycia
- **Element już istnieje** → zwróć komunikat ostrzegawczy
- **Element nie istnieje** → zwróć informację
- **Brak uprawnień** → odmów dostępu

## 📝 Logi

Logi są zapisywane w:
- `./logs/telegram-error.log` - Błędy
- `./logs/telegram-out.log` - Standardowe wyjście
- `./logs/telegram-combined.log` - Wszystkie logi

## 🔧 Rozwiązywanie Problemów

### Bot nie odpowiada na komendy administracyjne
1. Sprawdź czy Twój ID jest w `ADMIN_IDS`
2. Sprawdź logi: `pm2 logs instabot-telegram`
3. Sprawdź czy bot jest uruchomiony: `pm2 status`

### Błąd "Brak uprawnień administracyjnych"
1. Znajdź swój Telegram User ID przez [@userinfobot](https://t.me/userinfobot)
2. Dodaj ID do tablicy `ADMIN_IDS` w `src/telegram-admin.js`
3. Restartuj bot: `pm2 restart instabot-telegram`

### Dane nie są zapisywane
1. Sprawdź uprawnienia do pliku `data.json`
2. Sprawdź logi błędów
3. Sprawdź czy ścieżka do pliku jest poprawna

## 🔄 Aktualizacje

Aby zaktualizować system:

```bash
git pull
npm install
pm2 restart instabot-telegram
```

## 📞 Wsparcie

W przypadku problemów:

1. Sprawdź logi: `pm2 logs instabot-telegram`
2. Sprawdź status: `pm2 status`
3. Sprawdź czy wszystkie pliki są na miejscu
4. Sprawdź uprawnienia do plików

## 📄 Licencja

MIT License - zobacz plik LICENSE dla szczegółów. 