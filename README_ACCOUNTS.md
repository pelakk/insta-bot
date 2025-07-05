# InstaBot Account Management System 👤

System zarządzania kontami użytkowników z cookies, proxy i targetami przez Telegram.

## 🚀 Funkcje Zarządzania Kontami

### 👥 Zarządzanie Kontami (Admini)
- **Dodawanie kont** - `/add_account <user_id> <cookie> <proxy>`
- **Usuwanie kont** - `/remove_account <user_id>`
- **Lista kont** - `/list_accounts`
- **Szczegóły konta** - `/get_account <user_id>`

### 🎯 Zarządzanie Targetami (Właściciele kont)
- **Dodawanie targetów** - `/add_target @target`
- **Usuwanie targetów** - `/remove_target @target`
- **Moje targety** - `/my_targets`

## 📁 Struktura Danych

Dane są przechowywane w pliku `data.json`:

```json
{
  "accounts": [
    {
      "user_id": 123456789,
      "cookie": "sessionid=abc123; csrftoken=def456",
      "proxy": "socks5://user:pass@host:port",
      "targets": ["@instagram", "@target1", "@target2"]
    },
    {
      "user_id": 987654321,
      "cookie": "sessionid=xyz789",
      "proxy": "http://proxy.example.com:8080",
      "targets": ["@user1", "@user2"]
    }
  ]
}
```

## 🔐 Bezpieczeństwo

### Admin IDs
Tylko użytkownicy z listy `ADMIN_IDS` mają dostęp do komend administracyjnych:

```javascript
const ADMIN_IDS = [123456789]; // Zastąp swoim ID
```

### Uprawnienia
- **Admini** - mogą zarządzać wszystkimi kontami
- **Właściciele kont** - mogą zarządzać tylko swoimi targetami
- **Automatyczne tworzenie** - konto jest tworzone automatycznie przy pierwszym użyciu

## 📋 Komendy

### Zarządzanie Kontami (Admini)

| Komenda | Opis | Przykład |
|---------|------|----------|
| `/add_account` | Dodaj konto | `/add_account 123456789 "sessionid=abc123" "socks5://user:pass@host:port"` |
| `/remove_account` | Usuń konto | `/remove_account 123456789` |
| `/list_accounts` | Lista kont | `/list_accounts` |
| `/get_account` | Szczegóły konta | `/get_account 123456789` |

### Zarządzanie Targetami (Użytkownicy)

| Komenda | Opis | Przykład |
|---------|------|----------|
| `/add_target` | Dodaj target | `/add_target @instagram` |
| `/remove_target` | Usuń target | `/remove_target @instagram` |
| `/my_targets` | Moje targety | `/my_targets` |

### Pomoc

| Komenda | Opis |
|---------|------|
| `/account_help` | Pomoc dla zarządzania kontami |

## 🔧 Instalacja i Konfiguracja

### 1. Skonfiguruj Admin ID

Edytuj pliki:
- `src/telegram-admin.js`
- `src/telegram-accounts.js`

```javascript
const ADMIN_IDS = [123456789]; // Zastąp swoim ID
```

### 2. Uruchom bot

```bash
# Uruchom z PM2
npm run pm2:start

# Lub bezpośrednio
npm run telegram
```

### 3. Dodaj konto (Admin)

```
/add_account 123456789 "sessionid=abc123" "socks5://user:pass@host:port"
```

### 4. Dodaj targety (Użytkownik)

```
/add_target @instagram
/add_target @target_user
```

## 📊 Przykłady Użycia

### Dodawanie konta:
```
/add_account 123456789 "sessionid=abc123" "socks5://user:pass@host:port"
✅ Konto dla użytkownika 123456789 zostało dodane.

Cookie: sessionid=abc123
Proxy: socks5://user:pass@host:port
```

### Lista kont:
```
/list_accounts
📋 Lista kont:

• User ID: 123456789
  Proxy: socks5://user:pass@host:port
  Targets: 2

• User ID: 987654321
  Proxy: http://proxy.example.com:8080
  Targets: 1

Łącznie: 2 kont
```

### Szczegóły konta:
```
/get_account 123456789
📋 Konto użytkownika 123456789

🍪 Cookie: sessionid=abc123
🌐 Proxy: socks5://user:pass@host:port
🎯 Targets (2):
• @instagram
• @target_user
```

### Dodawanie targetu:
```
/add_target @instagram
✅ Target @instagram został dodany do Twojej listy.
```

### Moje targety:
```
/my_targets
🎯 Twoje targety:

• @instagram
• @target_user

Łącznie: 2 targetów
```

## 🛡️ Walidacja

Każda komenda zawiera pełną walidację:

- **Brak argumentów** → wyświetl poprawny sposób użycia
- **Duplikaty** → nie dodawaj ponownie
- **Brak wpisu** → pokaż komunikat
- **Brak uprawnień** → odmów dostępu
- **Automatyczne tworzenie** → konto tworzone przy pierwszym użyciu

## 🔄 Automatyczne Tworzenie Kont

System automatycznie tworzy konto dla użytkownika przy pierwszym użyciu:

```javascript
// Przykład: Użytkownik używa /add_target @instagram
// System automatycznie tworzy konto:
{
  "user_id": 123456789,
  "cookie": "",
  "proxy": "",
  "targets": ["@instagram"]
}
```

## 📝 Logi

Logi są zapisywane w:
- `./logs/telegram-error.log` - Błędy
- `./logs/telegram-out.log` - Standardowe wyjście
- `./logs/telegram-combined.log` - Wszystkie logi

## 🔧 Rozwiązywanie Problemów

### Bot nie odpowiada na komendy kont
1. Sprawdź czy Twój ID jest w `ADMIN_IDS`
2. Sprawdź logi: `pm2 logs instabot-telegram`
3. Sprawdź czy bot jest uruchomiony: `pm2 status`

### Błąd "Brak uprawnień administracyjnych"
1. Znajdź swój Telegram User ID przez [@userinfobot](https://t.me/userinfobot)
2. Dodaj ID do tablicy `ADMIN_IDS` w plikach:
   - `src/telegram-admin.js`
   - `src/telegram-accounts.js`
3. Restartuj bot: `pm2 restart instabot-telegram`

### Dane nie są zapisywane
1. Sprawdź uprawnienia do pliku `data.json`
2. Sprawdź logi błędów
3. Sprawdź czy ścieżka do pliku jest poprawna

### Target nie jest dodawany
1. Sprawdź czy target ma prefix @
2. Sprawdź czy nie ma duplikatów
3. Sprawdź logi błędów

## 🔄 Integracja z PM2

### Uruchomienie:
```bash
npm run pm2:start
```

### Monitorowanie:
```bash
npm run pm2:status
npm run pm2:logs
```

### Restart:
```bash
npm run pm2:restart
```

### Stop:
```bash
npm run pm2:stop
```

## 🧪 Testowanie

System został przetestowany i działa poprawnie:

```bash
npm run test:admin
```

Wynik testu:
- ✅ data.json exists
- ✅ users array exists  
- ✅ proxies array exists
- ✅ cookies array exists
- ✅ accounts array exists
- ✅ Write operation successful
- ✅ Read operation successful
- ✅ Admin module can be loaded
- ✅ Accounts module can be loaded

## 🎯 Korzyści

- **Dynamiczne zarządzanie** - Dodawaj/usuń konta bez restartu
- **Bezpieczeństwo** - Kontrola dostępu przez Admin IDs
- **Automatyczne tworzenie** - Konta tworzone przy pierwszym użyciu
- **Trwałość danych** - Dane zapisywane w `data.json`
- **Integracja z PM2** - Pełna kompatybilność
- **Walidacja** - Bezpieczne operacje z pełną walidacją

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