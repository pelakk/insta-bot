# InstaAuto - Przewodnik PM2

## 📋 Spis treści

- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Konfiguracja proxy](#konfiguracja-proxy)
- [Pierwszy start](#pierwszy-start)
- [Zarządzanie instancjami](#zarządzanie-instancjami)
- [Monitoring i logi](#monitoring-i-logi)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)
- [Skalowanie](#skalowanie)
- [Przydatne komendy](#przydatne-komendy)

## 🔧 Wymagania

- **Node.js** (wersja 16 lub nowsza)
- **PM2** (menedżer procesów)
- **Proxy SOCKS5** z uwierzytelnianiem
- **Konto Instagram** z danymi logowania

## 🚀 Instalacja

### 1. Zainstaluj PM2 globalnie

```bash
npm install -g pm2
```

### 2. Zainstaluj zależności projektu

```bash
npm install
```

### 3. Utwórz folder na logi

```bash
mkdir logs
```

## 🌐 Konfiguracja proxy

### 1. Edytuj plik `.env`

```env
# Dane logowania Instagram (WYMAGANE)
INSTAGRAM_USERNAME=twoja_nazwa_uzytkownika
INSTAGRAM_PASSWORD=twoje_haslo

# Ustawienia limitów
MAX_FOLLOWS_PER_HOUR=20
MAX_FOLLOWS_PER_DAY=150
MAX_LIKES_PER_DAY=30

# Filtry obserwowania
FOLLOW_USER_RATIO_MIN=0.2
FOLLOW_USER_RATIO_MAX=4.0

# Użytkownicy do obserwowania (oddzieleni przecinkami)
USERS_TO_FOLLOW=everchanginghorizon,sam_kolder,natgeo
```

### 2. Skonfiguruj proxy w `ecosystem.config.js`

Każda instancja ma przypisane unikalne proxy:

```javascript
env: {
  INSTANCE_ID: '1',
  PROXY_IP: '77.47.240.226'  // Zmień na swój IP proxy
}
```

## 🎯 Pierwszy start

### 1. Uruchom wszystkie instancje

```bash
pm2 start ecosystem.config.js
```

### 2. Sprawdź status

```bash
pm2 list
```

### 3. Obserwuj logi (realtime)

```bash
pm2 logs
```

## 🎛️ Zarządzanie instancjami

### Podstawowe komendy

```bash
# Wyświetl status wszystkich instancji
pm2 list

# Zatrzymaj wszystkie instancje
pm2 stop all

# Uruchom ponownie wszystkie instancje
pm2 restart all

# Usuń wszystkie instancje z PM2
pm2 delete all
```

### Zarządzanie pojedynczą instancją

```bash
# Zatrzymaj konkretną instancję
pm2 stop *nazwa*

# Uruchom ponownie konkretną instancję
pm2 restart *nazwa*

# Usuń konkretną instancję
pm2 delete *nazwa*

# Szczegółowe informacje o instancji
pm2 show *nazwa*
```

### Zarządzanie grupą instancji

```bash
# Zatrzymaj wszystkie instancje o nazwie zaczynającej się od "instauto"
pm2 stop instauto*

# Uruchom ponownie wszystkie instancje o nazwie zaczynającej się od "instauto"
pm2 restart instauto*
```

## 📊 Monitoring i logi

### Wyświetlanie logów

```bash
# Logi z wszystkich instancji (realtime)
pm2 logs

# Logi z konkretnej instancji
pm2 logs *nazwa*

# Ostatnie 50 linii z konkretnej instancji
pm2 logs *nazwa* --lines 50

# Logi z określonego czasu
pm2 logs *nazwa* --timestamp

# Wyczyść wszystkie logi
pm2 flush
```

### Monitoring w czasie rzeczywistym

```bash
# Monitor zasobów (CPU, RAM)
pm2 monit

# Szczegółowe informacje o procesie
pm2 show *nazwa*
```

### Pliki logów

Logi są automatycznie zapisywane w folderze `./logs/`:

- `*nazwa*-out.log` - standardowe wyjście
- `*nazwa*-error.log` - błędy
- `*nazwa*.log` - wszystkie logi

## 🔧 Rozwiązywanie problemów

### Instancja nie startuje

```bash
# Sprawdź szczegóły błędu
pm2 show *nazwa*

# Sprawdź logi błędów
pm2 logs *nazwa* --err

# Usuń i uruchom ponownie
pm2 delete *nazwa*
pm2 start ecosystem.config.js
```

### Problemy z proxy

```bash
# Sprawdź czy proxy działa
curl --proxy socks5://kamzza:bJXwSnBLy9@77.47.240.226:50101 https://httpbin.org/ip

# Sprawdź logi proxy w aplikacji
pm2 logs *nazwa* | grep proxy
```

### Problemy z logowaniem Instagram

```bash
# Sprawdź dane logowania w .env
cat .env

# Sprawdź logi błędów logowania
pm2 logs *nazwa* --err | grep -i "login\|password\|auth"
```

### Konflikty portów

```bash
# Sprawdź zajęte porty
netstat -an | find "8001"
netstat -an | find "8002"
netstat -an | find "8003"
```

## 📈 Skalowanie

### Dodawanie nowych instancji

1. **Edytuj `ecosystem.config.js`** - dodaj nową instancję:

```javascript
{
  name: 'instauto-4',
  script: './single_instance.js',
  instances: 1,
  exec_mode: 'fork',
  env: {
    INSTANCE_ID: '4',
    PROXY_IP: '192.168.1.100'  // Nowy IP proxy
  },
  out_file: './logs/instauto-4-out.log',
  error_file: './logs/instauto-4-error.log',
  log_file: './logs/instauto-4.log',
  time: true,
  autorestart: true,
  max_restarts: 10,
  restart_delay: 5000
}
```

2. **Uruchom nową konfigurację**:

```bash
pm2 start ecosystem.config.js
```

### Skalowanie do 20 instancji

Aby przejść do 20 instancji, będziesz potrzebować:

- **20 różnych proxy IP**
- **20 różnych kont Instagram** (zalecane)
- **Wystarczająco RAM** (około 60MB na instancję)

## 📋 Przydatne komendy

### Podstawowe zarządzanie

```bash
# Wyświetl wszystkie procesy PM2
pm2 list

# Zatrzymaj daemon PM2
pm2 kill

# Uruchom daemon PM2
pm2 resurrect

# Zapisz aktualną konfigurację
pm2 save

# Przywróć zapisaną konfigurację
pm2 resurrect
```

### Automatyczne uruchamianie przy starcie systemu

```bash
# Skonfiguruj auto-start
pm2 startup

# Zapisz aktualną konfigurację do auto-start
pm2 save
```

### Aktualizacja instancji

```bash
# Zaktualizuj kod bez przerywania działania
pm2 reload ecosystem.config.js

# Uruchom ponownie wszystkie instancje
pm2 restart all
```

### Backup i restore

```bash
# Zrób backup konfiguracji
pm2 dump

# Przywróć z backup'u
pm2 resurrect
```

## 🎪 Przykładowe scenariusze

### Scenariusz 1: Uruchomienie po raz pierwszy

```bash
# 1. Zainstaluj PM2
npm install -g pm2

# 2. Uruchom instancje
pm2 start ecosystem.config.js

# 3. Sprawdź status
pm2 list

# 4. Obserwuj logi
pm2 logs
```

### Scenariusz 2: Jedna instancja ma problemy

```bash
# 1. Sprawdź która instancja ma problem
pm2 list

# 2. Sprawdź logi błędów
pm2 logs instauto-2 --err

# 3. Uruchom ponownie problematyczną instancję
pm2 restart instauto-2
```

### Scenariusz 3: Dodanie nowej instancji

```bash
# 1. Edytuj ecosystem.config.js (dodaj nową instancję)
# 2. Uruchom nową konfigurację
pm2 start ecosystem.config.js

# 3. Sprawdź czy nowa instancja działa
pm2 list
```

### Scenariusz 4: Całkowite zatrzymanie

```bash
# 1. Zatrzymaj wszystkie instancje
pm2 stop all

# 2. Usuń wszystkie instancje
pm2 delete all

# 3. Zatrzymaj daemon PM2
pm2 kill
```

## 🔗 Użyteczne linki

- [PM2 Dokumentacja](https://pm2.keymetrics.io/docs/)
- [PM2 Monitoring](https://pm2.keymetrics.io/docs/usage/monitoring/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)

---

## ⚠️ Ważne uwagi

1. **Zawsze używaj różnych proxy** dla każdej instancji
2. **Monitoruj logi** regularnie pod kątem błędów
3. **Nie uruchamiaj zbyt wielu instancji** z tego samego IP
4. **Używaj limitów** (maxFollowsPerDay, maxLikesPerDay)
5. **Rób regularne backup'y** baz danych (followed.json, itp.)

---

_Przygotowane dla InstaAuto PM2 - Automatyzacja Instagram z wieloma instancjami_
