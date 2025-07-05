# InstaBot z Integracją Telegram 🤖

Ten projekt rozszerza funkcjonalność InstaBot o pełną integrację z Telegram, umożliwiając zdalne zarządzanie botem Instagram przez aplikację Telegram.

## 🚀 Funkcje

- **Zdalne zarządzanie** - Kontroluj bota przez Telegram
- **Monitoring w czasie rzeczywistym** - Sprawdzaj status i statystyki
- **Powiadomienia** - Otrzymuj powiadomienia o ważnych wydarzeniach
- **Bezpieczeństwo** - Kontrola dostępu przez listę dozwolonych użytkowników
- **Wielużytkownikowość** - Obsługa wielu użytkowników Telegram

## 📋 Komendy Telegram

### Podstawowe komendy
| Komenda | Opis |
|---------|------|
| `/start` | Rozpocznij interakcję z botem |
| `/help` | Pokaż pomoc ogólną |
| `/myid` | Pokaż swoje Telegram ID |
| `/status` | Sprawdź status wszystkich botów |
| `/stats` | Pokaż statystyki systemu |

### Komendy użytkownika
| Komenda | Opis |
|---------|------|
| `/start_my_bot` | Uruchom bot dla swojego konta |
| `/stop_my_bot` | Zatrzymaj swój bot |
| `/my_status` | Status Twojego bota |
| `/my_targets` | Twoje targety (USERS_TO_FOLLOW) |

### Zarządzanie targetami
| Komenda | Opis |
|---------|------|
| `/add_target @username` | Dodaj target do USERS_TO_FOLLOW |
| `/remove_target @username` | Usuń target z USERS_TO_FOLLOW |

### Zarządzanie konfiguracją
| Komenda | Opis |
|---------|------|
| `/set_config <klucz> <wartość>` | Ustaw wartość konfiguracji |
| `/get_config` | Pokaż swoją konfigurację |

### Komendy administracyjne
| Komenda | Opis |
|---------|------|
| `/admin_help` | Pomoc administracyjna |
| `/add_account <user_id> <cookie> <proxy>` | Dodaj konto użytkownika |
| `/update_account <user_id> <cookie> <proxy>` | Zaktualizuj konto użytkownika |
| `/start_bot <user_id>` | Uruchom bot dla konkretnego użytkownika |
| `/stop_bot <user_id>` | Zatrzymaj bot dla konkretnego użytkownika |
| `/stop_all` | Zatrzymaj wszystkie boty |
| `/kill_all` | Zatrzymaj wszystkie boty i wyczyść sesje |

## 🛠️ Instalacja

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Skonfiguruj zmienne środowiskowe

Skopiuj plik `env.example` do `.env` i wypełnij dane:

```bash
cp env.example .env
```

Edytuj plik `.env`:

```env
# Instagram Configuration
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ALLOWED_USERS=123456789,987654321

# Bot Limits
MAX_FOLLOWS_PER_HOUR=15
MAX_FOLLOWS_PER_DAY=70
MAX_LIKES_PER_DAY=30

# Follow Settings
FOLLOW_USER_RATIO_MIN=0.2
FOLLOW_USER_RATIO_MAX=4.0

# Target Users (comma-separated)
USERS_TO_FOLLOW=everchanginghorizon,sam_kolder
```

### 3. Utwórz Telegram Bot

1. Otwórz Telegram i znajdź [@BotFather](https://t.me/botfather)
2. Wyślij `/newbot`
3. Podaj nazwę i username dla bota
4. Skopiuj token i dodaj do `.env`

### 4. Uruchom bot

```bash
npm run telegram
```

## 🔧 Konfiguracja

### Telegram Bot Token

Aby uzyskać token bota:

1. Napisz do [@BotFather](https://t.me/botfather) w Telegram
2. Wyślij `/newbot`
3. Podaj nazwę bota (np. "InstaBot Control")
4. Podaj username (np. "instabot_control_bot")
5. Skopiuj token i dodaj do `TELEGRAM_BOT_TOKEN`

### Dozwoleni Użytkownicy

Aby ograniczyć dostęp do bota:

1. Znajdź swój Telegram User ID (napisz do [@userinfobot](https://t.me/userinfobot))
2. Dodaj ID do `TELEGRAM_ALLOWED_USERS` (oddzielone przecinkami)
3. Jeśli zostawisz puste, dostęp będą mieli wszyscy

### Przykład konfiguracji:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALLOWED_USERS=123456789,987654321
```

## ⚙️ System Konfiguracji

Bot używa nowego systemu konfiguracji w stylu `.env`. Każdy użytkownik ma pełną kontrolę nad swoimi ustawieniami.

### Dostępne Klucze Konfiguracji

#### Rate Limits (Limity Szybkości)
- `MAX_FOLLOWS_PER_HOUR` (1-50, domyślnie 20)
- `MAX_FOLLOWS_PER_DAY` (1-200, domyślnie 150)
- `MAX_LIKES_PER_DAY` (0-100, domyślnie 30)

#### Likes (Likeowanie)
- `ENABLE_LIKES` (true/false, domyślnie false)

#### Follow Filters (Filtry Followowania)
- `FOLLOW_USER_MIN_FOLLOWERS` (0-10000, domyślnie 50)
- `FOLLOW_USER_MAX_FOLLOWERS` (0-10000, domyślnie 5000)
- `FOLLOW_USER_MIN_FOLLOWING` (0-10000, domyślnie 50)
- `FOLLOW_USER_MAX_FOLLOWING` (0-10000, domyślnie 2000)

### Przykłady Użycia

```bash
# Ustaw limity
/set_config MAX_FOLLOWS_PER_HOUR 20
/set_config MAX_FOLLOWS_PER_DAY 150

# Włącz likeowanie
/set_config ENABLE_LIKES true

# Ustaw filtry
/set_config FOLLOW_USER_MIN_FOLLOWERS 100
/set_config FOLLOW_USER_MAX_FOLLOWERS 5000

# Sprawdź konfigurację
/get_config
```

📖 **Szczegółowy przewodnik**: Zobacz [CONFIG_GUIDE.md](CONFIG_GUIDE.md)

## 📊 Monitorowanie

### Status Instancji

Komenda `/status` pokazuje:
- 🟢 Online - Instancja działa
- 🔴 Offline - Instancja zatrzymana
- Czas działania (uptime)

### Statystyki

Komenda `/stats` pokazuje dzisiejsze:
- 👥 Followed - Liczba użytkowników, których followowano
- 👋 Unfollowed - Liczba użytkowników, których unfollowowano
- ❤️ Liked - Liczba polubionych postów
- 📊 Net - Różnica (followed - unfollowed)

## 🔒 Bezpieczeństwo

- **Kontrola dostępu** - Tylko dozwoleni użytkownicy mogą używać bota
- **Logowanie** - Wszystkie akcje są logowane
- **Powiadomienia o błędach** - Automatyczne powiadomienia o problemach

## 🚨 Powiadomienia

Bot automatycznie wysyła powiadomienia o:

- ✅ Uruchomieniu instancji
- 🛑 Zatrzymaniu instancji
- ❌ Błędach i problemach
- 📊 Ważnych statystykach
- 🔄 Postępach w pracy

## 🐳 Docker

Możesz uruchomić bot w Docker:

```bash
docker-compose up -d
```

## 📝 Logi

Logi są zapisywane w konsoli z timestampami:

```
2024-01-15T10:30:00.000Z [Instance 1] Starting with proxy IP: 77.47.240.226
2024-01-15T10:30:05.000Z [Instance 1] Following user username123
```

## 🔧 Rozwiązywanie problemów

### Bot nie odpowiada
- Sprawdź czy token jest poprawny
- Sprawdź czy bot jest uruchomiony
- Sprawdź logi w konsoli

### Błąd "Nie masz uprawnień"
- Sprawdź czy Twój User ID jest w `TELEGRAM_ALLOWED_USERS`
- Użyj [@userinfobot](https://t.me/userinfobot) aby znaleźć swój ID

### Instancja się nie uruchamia
- Sprawdź czy dane Instagram są poprawne
- Sprawdź czy proxy działa
- Sprawdź logi błędów

## 📞 Wsparcie

W przypadku problemów:

1. Sprawdź logi w konsoli
2. Sprawdź czy wszystkie zmienne środowiskowe są ustawione
3. Sprawdź czy Telegram Bot Token jest poprawny
4. Sprawdź czy masz dostęp do internetu

## 🔄 Aktualizacje

Aby zaktualizować bot:

```bash
git pull
npm install
npm run telegram
```

## 📄 Licencja

MIT License - zobacz plik LICENSE dla szczegółów. 