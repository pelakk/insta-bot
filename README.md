# 🤖 Instagram Automation Bot

**Automatyzacja Instagram z obsługą wielu kont, proxy, stealth mode i bezpiecznym logowaniem**

## 📋 Spis treści

- [🚀 Szybki start](#-szybki-start)
- [⚙️ Konfiguracja](#️-konfiguracja)
- [🛡️ Stealth Mode](#️-stealth-mode)
- [🪟 Automatyczne Obsługa Popupów](#-automatyczne-obsługa-popupów)
- [👥 Zarządzanie kontami](#-zarządzanie-kontami)
- [🔧 Ustawienia](#-ustawienia)
- [📊 Monitorowanie](#-monitorowanie)
- [❓ Rozwiązywanie problemów](#-rozwiązywanie-problemów)

---

## 🚀 Szybki start

### 1. Przygotowanie sessionid (bezpieczne logowanie)

**Aby uniknąć blokad, używaj sessionid zamiast hasła:**

1. **Zaloguj się do Instagram w przeglądarce**
2. **Otwórz konsolę deweloperską** (F12 → Console)
3. **Wklej i wykonaj kod:**

```javascript
document.cookie
  .split(";")
  .find((row) => row.startsWith("sessionid"))
  .split("=")[1];
```

4. **Skopiuj wynik** (to jest Twój sessionid)

### 2. Konfiguracja konta

**Edytuj plik `ecosystem.config.js`:**

```javascript
{
  "name": "twoje_konto",
  "env": {
    "INSTAGRAM_SESSIONID": "skopiowany_sessionid",
    "INSTAGRAM_USERNAME": "twoja_nazwa_użytkownika",
    "PROXY_IP": "twoje_proxy_ip",
    "PROXY_USERNAME": "twoje_proxy_login",
    "PROXY_PASSWORD": "twoje_proxy_hasło",
    "PROXY_PORT": "50101"
  }
}
```

### 3. Uruchomienie

```bash
# Uruchom boty
pm2 start ecosystem.config.js

# Sprawdź status
pm2 status

# Zobacz logi
pm2 logs --lines 50
```

---

## ⚙️ Konfiguracja

### Wymagane zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `INSTAGRAM_SESSIONID` | Sessionid z przeglądarki | `74377058585%3A7gBhijBAe7qLvd%3A6%3AAYeiTK6JVYXn3Ej6A6yh3iyszU0EmV1aDXW-L1RUng` |
| `INSTAGRAM_USERNAME` | Nazwa użytkownika Instagram | `twoje_konto` |
| `PROXY_IP` | Adres IP proxy | `82.163.175.153` |
| `PROXY_USERNAME` | Login do proxy | `kamzza` |
| `PROXY_PASSWORD` | Hasło do proxy | `bJXwSnBLy9` |
| `PROXY_PORT` | Port proxy | `50101` |

### Opcjonalne ustawienia

| Zmienna | Domyślna wartość | Opis |
|---------|------------------|------|
| `MAX_FOLLOWS_PER_HOUR` | `25` | Maksymalna liczba follow na godzinę |
| `MAX_FOLLOWS_PER_DAY` | `150` | Maksymalna liczba follow dziennie |
| `MAX_LIKES_PER_DAY` | `50` | Maksymalna liczba like dziennie |
| `FOLLOW_USER_MIN_FOLLOWERS` | `0` | Minimalna liczba followers użytkownika |
| `FOLLOW_USER_MAX_FOLLOWERS` | `999999` | Maksymalna liczba followers użytkownika |
| `MINIMUM_POST_COUNT` | `0` | Minimalna liczba postów użytkownika |
| `USERS_TO_FOLLOW` | `lelasohnabaka,vixeniaaa` | Lista użytkowników do followowania |
| `HEADLESS` | `false` | Tryb niewidoczny (true/false) |

---

## 🛡️ Stealth Mode

### Funkcje Stealth

Bot został wyposażony w zaawansowane funkcje stealth, które maksymalizują trust factor:

#### 🎭 Spoofing Fingerprint
- **User-Agent**: iPhone 12, Safari (mobilny)
- **Navigator**: Pełny spoofing navigatora
- **Hardware**: Emulacja hardwareConcurrency, deviceMemory
- **Plugins**: Spoofing pluginów przeglądarki
- **Languages**: Ustawienie języków
- **WebGL**: Spoofing WebGL renderera
- **Canvas**: Fingerprint canvas
- **Audio**: Spoofing audio context
- **Connection**: Emulacja Connection API
- **Geolocation**: Spoofing geolokalizacji
- **Permissions**: Emulacja uprawnień
- **MediaDevices**: Spoofing urządzeń multimedialnych
- **Performance**: Spoofing performance API
- **Console**: Ukrycie webdriver
- **toString**: Spoofing toString funkcji
- **Document**: Spoofing document.hidden
- **Window**: Spoofing window.outerWidth/innerWidth

#### 📱 Tryb Mobilny
- Emulacja iPhone 12
- Mobilny user-agent
- Responsive design
- Touch events

#### 🔄 Automatyczne Testy
- Test stealth na bot.sannysoft.com
- Automatyczne screenshoty
- Monitoring trust factor

### Testowanie Stealth

```bash
# Uruchom test stealth
node test-stealth.js

# Sprawdź trust factor
# Bot automatycznie testuje na bot.sannysoft.com
```

---

## 🪟 Automatyczne Obsługa Popupów

### Funkcje Obsługi Dialogów

Bot automatycznie obsługuje wszystkie typowe popupy Instagram, które mogą pojawić się podczas logowania:

#### 🔐 Dialog "Save your login info?"
- **Automatyczne wykrywanie** popupu po zalogowaniu
- **Kliknięcie "Not now"** - nie zapisuje danych logowania
- **Wielokrotne sprawdzenie** - obsługa w różnych scenariuszach logowania
- **Robustne selektory** - używa aria-label i fallback selektorów

#### 🍪 Cookie Consent Dialogs
- **Accept cookies** - automatyczne akceptowanie
- **Only allow essential cookies** - obsługa różnych wariantów
- **Allow essential and optional cookies** - pełna obsługa

#### 🔔 Notification Dialogs
- **"Turn on Notifications"** - automatyczne kliknięcie "Not Now"
- **Różne warianty** - obsługa różnych języków i wersji

### Techniczne Szczegóły

#### Selektory XPath
```javascript
// Primary selector using aria-label
'xpath/.//div[@aria-label="Dialog for saving Instagram login information"]//button[contains(text(), "Not now")]'

// Alternative selectors using class names
'xpath/.//div[contains(@class, "x1n2onr6") and contains(@class, "x1ja2u2z")]//button[contains(text(), "Not now")]'

// Generic dialog selector
'xpath/.//div[@role="dialog"]//button[contains(text(), "Not now")]'
```

#### Lokalizacje Obsługi
- **Po udanym logowaniu** - gdy użytkownik nie był zalogowany
- **Gdy już zalogowany** - dodatkowe sprawdzenie
- **Po obsłudze innych dialogów** - jako zabezpieczenie

#### Logowanie
```
[INFO] Checking for 'Save your login info?' popup...
[INFO] Found 'Save login info' popup with selector: xpath/.//div[@aria-label="Dialog for saving Instagram login information"]//button[contains(text(), "Not now")]
[INFO] Pressing button: Save login info dialog: Not now
```

### Korzyści

✅ **Bezpieczeństwo** - nie zapisuje danych logowania w przeglądarce  
✅ **Automatyzacja** - brak potrzeby ręcznej interwencji  
✅ **Niezawodność** - wielokrotne sprawdzenie i fallback selektory  
✅ **Stealth** - naturalne zachowanie jak człowiek  
✅ **Wielojęzyczność** - obsługa różnych wersji językowych  

---

## 👥 Zarządzanie kontami

### Aktualne konta

| Nazwa | Status | Proxy | Ustawienia |
|-------|--------|-------|------------|
| `lariberrys` | Konfigurowane | 82.163.175.153 | Standardowe |
| `miyaakln` | Konfigurowane | 161.77.68.134 | Standardowe |
| `ladymcbeth.rells` | **Aktywne** | 82.163.175.153 | **Followuje każdego** |

### Dodawanie nowego konta

1. **Edytuj `ecosystem.config.js`:**
```javascript
{
  "name": "nowe_konto",
  "script": "./single_instance.js",
  "instances": 1,
  "exec_mode": "fork",
  "env": {
    "INSTANCE_ID": "4",
    "PROXY_IP": "twoje_proxy",
    "INSTAGRAM_SESSIONID": "sessionid",
    "INSTAGRAM_USERNAME": "nazwa_konta",
    // ... inne ustawienia
  }
}
```

2. **Uruchom:**
```bash
pm2 start ecosystem.config.js --only nowe_konto
```

### Usuwanie konta

```bash
pm2 delete nazwa_konta
```

---

## 🔧 Ustawienia

### Tryb headless (niewidoczne okienka)

**Przez zmienną środowiskową:**
```javascript
"HEADLESS": "false"  // true = niewidoczne, false = widoczne
```

### Filtry follow

#### 🎯 Followowanie każdego (testowe)
```javascript
"FOLLOW_USER_RATIO_MIN": "0.0",
"FOLLOW_USER_RATIO_MAX": "999999.0",
"MINIMUM_POST_COUNT": "0",
"FOLLOW_USER_MIN_FOLLOWERS": "0",
"FOLLOW_USER_MAX_FOLLOWERS": "999999",
"FOLLOW_USER_MIN_FOLLOWING": "0",
"FOLLOW_USER_MAX_FOLLOWING": "999999"
```

#### 🛡️ Bezpieczne ustawienia (zalecane) - OPTIMIZED ENGAGEMENT
```javascript
"MAX_FOLLOWS_PER_HOUR": "35",
"MAX_FOLLOWS_PER_DAY": "300",
"MAX_LIKES_PER_DAY": "40",
"FOLLOW_USER_MIN_FOLLOWERS": "200",
"FOLLOW_USER_MAX_FOLLOWERS": "10000",
"FOLLOW_USER_MIN_FOLLOWING": "100",
"FOLLOW_USER_MAX_FOLLOWING": "2000",
"FOLLOW_USER_RATIO_MIN": "0.2",
"FOLLOW_USER_RATIO_MAX": "5.0",
"MINIMUM_POST_COUNT": "3",
"POSTS_TO_LIKE": "2"
```

#### ⚡ Agresywne ustawienia (ryzykowne)
```javascript
"MAX_FOLLOWS_PER_HOUR": "50",
"FOLLOW_USER_MIN_FOLLOWERS": "1",
"FOLLOW_USER_MAX_FOLLOWERS": "999999",
"FOLLOW_USER_RATIO_MIN": "0.0",
"FOLLOW_USER_RATIO_MAX": "999999.0"
```

### 🎯 Strategia Anti-Shadowban

#### 📊 Optymalne Limity
- **35 followów na godzinę** - zoptymalizowany limit dla lepszego wzrostu
- **300 followów dziennie** - zwiększona aktywność, szybszy wzrost
- **40 like'ów dziennie** - bezpieczny engagement, unika shadowbana

#### 🎯 Targeting Kont
- **200-10,000 followers** - konta o średniej popularności, lepsze engagement
- **100-2,000 following** - aktywne konta, nie spamowe
- **Ratio 0.2-5.0** - szeroki zakres, od aktywnych po popularne
- **Minimum 3 posty** - aktywne konta z treścią

#### 🛡️ Dlaczego Te Ustawienia?
- **Naturalne tempo** - naśladuje ludzkie zachowanie
- **Jakość over ilość** - lepsze engagement z mniejszą liczbą followów
- **Bezpieczne limity** - poniżej progu wykrywania Instagram
- **Zrównoważone targeting** - unika kont spamowych i botowych



---

## 📊 Monitorowanie

### Podstawowe komendy

```bash
# Status wszystkich botów
pm2 status

# Logi wszystkich botów
pm2 logs

# Logi konkretnego bota
pm2 logs nazwa_konta

# Restart bota
pm2 restart nazwa_konta

# Zatrzymanie bota
pm2 stop nazwa_konta

# Usunięcie bota
pm2 delete nazwa_konta
```

### Sprawdzanie działania

1. **Sprawdź logi** - czy nie ma błędów
2. **Sprawdź Instagram** - czy liczba following rośnie
3. **Monitoruj proxy** - czy połączenie działa
4. **Sprawdź stealth** - czy trust factor jest wysoki

---

## ❓ Rozwiązywanie problemów

### Częste problemy

#### 1. Błąd logowania
```
WARNING: Login has not succeeded
```
**Rozwiązanie:**
- Sprawdź czy sessionid jest aktualny
- Wygeneruj nowy sessionid
- Sprawdź czy konto nie wymaga weryfikacji

#### 2. Shadowban po zmianie hasła
**Objawy:**
- Brak reakcji na follow
- Nie można dać follow ręcznie
- Ograniczenia na koncie

**Rozwiązanie:**
- Poczekaj 24-48h
- Używaj sessionid zamiast hasła
- Zmniejsz agresywność ustawień
- Sprawdź czy konto nie jest zablokowane

#### 3. Błąd proxy
```
Proxy error during language setup
```
**Rozwiązanie:**
- Sprawdź dane proxy
- Przetestuj połączenie proxy
- Użyj backup proxy

#### 4. Timeout errors
```
TimeoutError: Timed out after waiting 30000ms
```
**Rozwiązanie:**
- Sprawdź połączenie internetowe
- Zmniejsz agresywność ustawień
- Sprawdź czy Instagram nie blokuje

#### 5. Bot nie followuje
**Sprawdź:**
- Czy filtry nie są za restrykcyjne
- Czy lista USERS_TO_FOLLOW jest poprawna
- Czy nie ma błędów w logach
- Czy `MINIMUM_POST_COUNT` nie jest > 0

#### 6. Problemy z popupami
**Objawy:**
- Bot utyka na stronie logowania
- Pojawiają się błędy związane z dialogami
- Logi pokazują problemy z selektorami

**Rozwiązanie:**
- Sprawdź czy popup "Save your login info?" jest obsługiwany
- Sprawdź logi pod kątem komunikatów o popupach
- Bot automatycznie obsługuje większość dialogów
- W razie problemów sprawdź czy Instagram nie zmienił struktury HTML

### Przydatne komendy diagnostyczne

```bash
# Sprawdź wszystkie logi
pm2 logs --lines 100

# Sprawdź konkretny błąd
pm2 logs | grep "ERROR"

# Restart z nowymi ustawieniami
pm2 restart all --update-env

# Pełny restart (usuń i uruchom ponownie)
pm2 delete all
pm2 start ecosystem.config.js

# Test stealth
node test-stealth.js
```

---

## 📚 Dodatkowe zasoby

- **PM2 Guide**: [README_PM2.md](README_PM2.md)
- **100 Accounts Guide**: [README_100_ACCOUNTS.md](README_100_ACCOUNTS.md)
- **Sessionid Guide**: [README_SESSIONID.md](README_SESSIONID.md)

---

## ⚠️ Ważne uwagi

1. **Używaj sessionid** zamiast hasła dla bezpieczeństwa
2. **Nie ustawiaj zbyt agresywnych limitów** - ryzyko bana
3. **Regularnie sprawdzaj logi** - wczesne wykrycie problemów
4. **Używaj proxy** - ochrona przed blokadami
5. **Testuj na małej skali** przed uruchomieniem wielu kont
6. **Stealth mode** - maksymalizuje trust factor
7. **Po zmianie hasła** - możliwy shadowban przez 24-48h

---

## 🎯 Aktualne ustawienia

### 🛡️ Zoptymalizowana Konfiguracja Engagement
- **MAX_FOLLOWS_PER_HOUR**: 35 (zoptymalizowany limit)
- **MAX_FOLLOWS_PER_DAY**: 300 (szybszy wzrost)
- **MAX_LIKES_PER_DAY**: 40 (bezpieczny engagement)
- **FOLLOW_USER_MIN_FOLLOWERS**: 200 (aktywne konta)
- **FOLLOW_USER_MAX_FOLLOWERS**: 10,000 (średnia popularność)
- **FOLLOW_USER_RATIO_MIN**: 0.2 (aktywne konta)
- **FOLLOW_USER_RATIO_MAX**: 5.0 (szeroki zakres)
- **MINIMUM_POST_COUNT**: 3 (aktywne z treścią)
- **Trust Factor**: Bardzo wysoki (stealth mode + bezpieczne limity)

### 📈 Strategia Wzrostu
1. **Start**: Użyj zoptymalizowanych ustawień przez 2-3 tygodnie
2. **Monitor**: Sprawdź engagement i reakcje Instagram
3. **Dostosuj**: Jeśli wszystko OK, możesz zwiększyć do 40-45 followów/godzinę
4. **Bezpieczeństwo**: Zawsze trzymaj się poniżej 50 followów/godzinę

**💡 Wskazówka:** Ta konfiguracja maksymalizuje bezpieczeństwo i minimalizuje ryzyko shadowbana. Lepiej mieć mniej followów ale bezpiecznie, niż więcej ale z ryzykiem bana.
