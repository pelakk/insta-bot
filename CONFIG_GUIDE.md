# 📋 Przewodnik po Konfiguracji Instagram Bot

## 🎯 Nowy System Konfiguracji

Bot został zaktualizowany do używania przejrzystego systemu konfiguracji w stylu `.env`. Każdy użytkownik ma teraz pełną kontrolę nad swoimi ustawieniami.

## 🔧 Komendy Konfiguracji

### `/set_config <klucz> <wartość>`
Ustawia konkretną wartość w konfiguracji Twojego konta.

**Przykłady:**
```
/set_config MAX_FOLLOWS_PER_HOUR 20
/set_config ENABLE_LIKES true
/set_config FOLLOW_USER_MIN_FOLLOWERS 100
```

### `/get_config`
Wyświetla pełną konfigurację Twojego konta.

## 📊 Dostępne Klucze Konfiguracji

### 🕐 Rate Limits (Limity Szybkości)
| Klucz | Opis | Zakres | Domyślna |
|-------|------|--------|----------|
| `MAX_FOLLOWS_PER_HOUR` | Maksymalna liczba followów na godzinę | 1-50 | 20 |
| `MAX_FOLLOWS_PER_DAY` | Maksymalna liczba followów na dzień | 1-200 | 150 |
| `MAX_LIKES_PER_DAY` | Maksymalna liczba likeów na dzień | 0-100 | 30 |

### ❤️ Likes (Likeowanie)
| Klucz | Opis | Wartości | Domyślna |
|-------|------|----------|----------|
| `ENABLE_LIKES` | Włącz/wyłącz likeowanie | true/false | false |

### 👥 Follow Filters (Filtry Followowania)
| Klucz | Opis | Zakres | Domyślna |
|-------|------|--------|----------|
| `FOLLOW_USER_MIN_FOLLOWERS` | Minimalna liczba followers użytkownika | 0-10000 | 50 |
| `FOLLOW_USER_MAX_FOLLOWERS` | Maksymalna liczba followers użytkownika | 0-10000 | 5000 |
| `FOLLOW_USER_MIN_FOLLOWING` | Minimalna liczba following użytkownika | 0-10000 | 50 |
| `FOLLOW_USER_MAX_FOLLOWING` | Maksymalna liczba following użytkownika | 0-10000 | 2000 |

## 🚀 Przykłady Konfiguracji

### Konfiguracja Konserwatywna
```
/set_config MAX_FOLLOWS_PER_HOUR 10
/set_config MAX_FOLLOWS_PER_DAY 50
/set_config MAX_LIKES_PER_DAY 20
/set_config ENABLE_LIKES false
/set_config FOLLOW_USER_MIN_FOLLOWERS 100
/set_config FOLLOW_USER_MAX_FOLLOWERS 2000
```

### Konfiguracja Agresywna
```
/set_config MAX_FOLLOWS_PER_HOUR 30
/set_config MAX_FOLLOWS_PER_DAY 200
/set_config MAX_LIKES_PER_DAY 50
/set_config ENABLE_LIKES true
/set_config FOLLOW_USER_MIN_FOLLOWERS 10
/set_config FOLLOW_USER_MAX_FOLLOWERS 10000
```

### Konfiguracja Balansowana
```
/set_config MAX_FOLLOWS_PER_HOUR 20
/set_config MAX_FOLLOWS_PER_DAY 150
/set_config MAX_LIKES_PER_DAY 30
/set_config ENABLE_LIKES false
/set_config FOLLOW_USER_MIN_FOLLOWERS 50
/set_config FOLLOW_USER_MAX_FOLLOWERS 5000
```

## 🔄 Migracja z Poprzedniego Systemu

Jeśli masz konto z poprzedniego systemu limitów, zostanie automatycznie zaktualizowane do nowej struktury z wartościami domyślnymi.

## ⚠️ Uwagi Bezpieczeństwa

1. **Zachowaj ostrożność** - Zbyt agresywne ustawienia mogą spowodować blokadę konta
2. **Testuj stopniowo** - Zacznij od konserwatywnych ustawień
3. **Monitoruj wyniki** - Używaj `/my_status` aby sprawdzać działanie bota
4. **Dostosuj filtry** - Ustaw odpowiednie filtry followers/following dla swojego targetu

## 🛠️ Rozwiązywanie Problemów

### Błąd: "Nieprawidłowy klucz"
Użyj `/get_config` aby zobaczyć listę dozwolonych kluczy.

### Błąd: "Wartość poza zakresem"
Sprawdź tabelę powyżej dla prawidłowych zakresów wartości.

### Błąd: "Nie masz jeszcze skonfigurowanego konta"
Skontaktuj się z administratorem aby dodał Twoje konto.

## 📈 Monitorowanie

Używaj następujących komend do monitorowania:
- `/get_config` - Pełna konfiguracja
- `/my_status` - Status bota z konfiguracją
- `/status` - Status wszystkich botów

## 🎯 Najlepsze Praktyki

1. **Zacznij konserwatywnie** - Ustaw niskie limity na początku
2. **Stopniowo zwiększaj** - Podnoś limity powoli w miarę sukcesów
3. **Dostosuj filtry** - Ustaw filtry odpowiednie dla Twoich targetów
4. **Monitoruj wyniki** - Sprawdzaj statystyki regularnie
5. **Bądź elastyczny** - Dostosowuj ustawienia w zależności od wyników 