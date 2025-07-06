# 🤖 Instagram Automation Bot

**Automatyzacja Instagram z obsługą wielu kont, proxy i bezpiecznym logowaniem**

## 📋 Spis treści

- [🚀 Szybki start](#-szybki-start)
- [⚙️ Konfiguracja](#️-konfiguracja)
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
| `FOLLOW_USER_MIN_FOLLOWERS` | `100` | Minimalna liczba followers użytkownika |
| `FOLLOW_USER_MAX_FOLLOWERS` | `8000` | Maksymalna liczba followers użytkownika |
| `MINIMUM_POST_COUNT` | `3` | Minimalna liczba postów użytkownika |
| `USERS_TO_FOLLOW` | `lelasohnabaka,vixeniaaa` | Lista użytkowników do followowania |

---

## 👥 Zarządzanie kontami

### Dodawanie nowego konta

1. **Uruchom skrypt zarządzania:**

```bash
node manage_accounts.js
```

2. **Wybierz opcję "Add account"**
3. **Podaj dane konta:**
   - Nazwa użytkownika
   - Sessionid
   - Dane proxy

### Usuwanie konta

```bash
node manage_accounts.js
# Wybierz "Remove account"
```

### Lista kont

```bash
node manage_accounts.js
# Wybierz "List accounts"
```

---

## 🔧 Ustawienia

### Tryb headless (niewidoczne okienka)

**W pliku `single_instance.js`:**

```javascript
browser = await puppeteer.launch({
  headless: true,  // true = niewidoczne, false = widoczne
  // ...
});
```

### Filtry follow

**Bezpieczne ustawienia (zalecane):**

```javascript
"MAX_FOLLOWS_PER_HOUR": "25",
"MAX_FOLLOWS_PER_DAY": "150",
"MAX_LIKES_PER_DAY": "50",
"FOLLOW_USER_MIN_FOLLOWERS": "100",
"FOLLOW_USER_MAX_FOLLOWERS": "8000",
"FOLLOW_USER_MIN_FOLLOWING": "50",
"FOLLOW_USER_MAX_FOLLOWING": "1500",
"FOLLOW_USER_RATIO_MIN": "0.2",
"FOLLOW_USER_RATIO_MAX": "5.0",
"MINIMUM_POST_COUNT": "3",
"POSTS_TO_LIKE": "2"
```

**Agresywne ustawienia (ryzykowne):**

```javascript
"MAX_FOLLOWS_PER_HOUR": "50",
"FOLLOW_USER_MIN_FOLLOWERS": "1",
"FOLLOW_USER_MAX_FOLLOWERS": "999999",
"FOLLOW_USER_RATIO_MIN": "0.0",
"FOLLOW_USER_RATIO_MAX": "999999.0"
```

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

#### 2. Błąd proxy
```
Proxy error during language setup
```
**Rozwiązanie:**
- Sprawdź dane proxy
- Przetestuj połączenie proxy
- Użyj backup proxy

#### 3. Timeout errors
```
TimeoutError: Timed out after waiting 30000ms
```
**Rozwiązanie:**
- Sprawdź połączenie internetowe
- Zmniejsz agresywność ustawień
- Sprawdź czy Instagram nie blokuje

#### 4. Bot nie followuje
**Sprawdź:**
- Czy filtry nie są za restrykcyjne
- Czy lista USERS_TO_FOLLOW jest poprawna
- Czy nie ma błędów w logach

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
```

---

## 📚 Dodatkowe zasoby

- **PM2 Guide**: [README_PM2.md](README_PM2.md)
- **Linux Setup**: [README_LINUX.md](README_LINUX.md)
- **Sessionid Guide**: [README_SESSIONID.md](README_SESSIONID.md)

---

## ⚠️ Ważne uwagi

1. **Używaj sessionid** zamiast hasła dla bezpieczeństwa
2. **Nie ustawiaj zbyt agresywnych limitów** - ryzyko bana
3. **Regularnie sprawdzaj logi** - wczesne wykrycie problemów
4. **Używaj proxy** - ochrona przed blokadami
5. **Testuj na małej skali** przed uruchomieniem wielu kont

---

**💡 Wskazówka:** Zacznij od konserwatywnych ustawień i stopniowo zwiększaj agresywność, monitorując reakcję Instagram.
