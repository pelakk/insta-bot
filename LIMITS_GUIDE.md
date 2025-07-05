# Indywidualne Limity Użytkowników - Przewodnik

## 🎯 Przegląd

Każdy użytkownik może teraz mieć własne, indywidualne limity dla swojego bota Instagram. To pozwala na lepsze dostosowanie działania bota do potrzeb każdego użytkownika.

## 📊 Dostępne Limity

### Podstawowe Limity
- **max_follows_per_hour** - Maksymalna liczba followów na godzinę (1-50)
- **max_follows_per_day** - Maksymalna liczba followów na dzień (1-200)
- **max_likes_per_day** - Maksymalna liczba likeów na dzień (0-100)

### Limity Ratio
- **follow_user_ratio_min** - Minimalny ratio followers/following (0-10)
- **follow_user_ratio_max** - Maksymalny ratio followers/following (0-10)

## 🔧 Komendy do Zarządzania Limitami

### Ustawienie Limitów
```
/set_limits <follows_per_hour> <follows_per_day> <likes_per_day> <ratio_min> <ratio_max>
```

**Przykłady:**
```
/set_limits 15 70 30 0.2 4.0
/set_limits 10 50 20 0.5 3.0
/set_limits 20 100 50 0.1 5.0
```

### Sprawdzenie Limitów
```
/my_limits
```

### Reset Limitów
```
/reset_limits
```

## 📋 Domyślne Wartości

Jeśli użytkownik nie ustawił własnych limitów, bot używa domyślnych:

```json
{
  "max_follows_per_hour": 15,
  "max_follows_per_day": 70,
  "max_likes_per_day": 30,
  "follow_user_ratio_min": 0.2,
  "follow_user_ratio_max": 4.0
}
```

## 🎯 Przykłady Konfiguracji

### Konserwatywny Bot (Bezpieczny)
```
/set_limits 10 50 20 0.5 3.0
```
- 10 followów na godzinę
- 50 followów na dzień
- 20 likeów na dzień
- Ratio 0.5-3.0 (bardziej selektywny)

### Agresywny Bot (Szybki)
```
/set_limits 25 150 60 0.1 6.0
```
- 25 followów na godzinę
- 150 followów na dzień
- 60 likeów na dzień
- Ratio 0.1-6.0 (mniej selektywny)

### Balansowany Bot (Zalecany)
```
/set_limits 15 70 30 0.2 4.0
```
- 15 followów na godzinę
- 70 followów na dzień
- 30 likeów na dzień
- Ratio 0.2-4.0 (zbalansowany)

## ⚠️ Walidacja Limitów

Bot automatycznie sprawdza poprawność wprowadzonych limitów:

- **follows_per_hour**: 1-50
- **follows_per_day**: 1-200
- **likes_per_day**: 0-100
- **ratio_min**: 0-10
- **ratio_max**: 0-10
- **ratio_min** musi być mniejsze niż **ratio_max**

## 🔄 Migracja z Globalnych Limitów

### Stare Ustawienia (Globalne)
```bash
MAX_FOLLOWS_PER_HOUR=15
MAX_FOLLOWS_PER_DAY=70
MAX_LIKES_PER_DAY=30
FOLLOW_USER_RATIO_MIN=0.2
FOLLOW_USER_RATIO_MAX=4.0
```

### Nowe Ustawienia (Indywidualne)
Każdy użytkownik może ustawić własne limity:
```
/set_limits 15 70 30 0.2 4.0
```

## 📊 Monitorowanie Limitów

### Status Użytkownika
```
/my_status
```
Pokazuje aktualne limity użytkownika.

### Status Wszystkich Botów
```
/status
```
Pokazuje limity dla wszystkich aktywnych botów.

## 🛡️ Bezpieczeństwo

### Zalecane Limity
- **Nowe konta**: Użyj konserwatywnych limitów
- **Stare konta**: Możesz używać bardziej agresywnych limitów
- **Testowanie**: Zacznij od niskich limitów i zwiększaj stopniowo

### Ostrzeżenia
- Zbyt wysokie limity mogą spowodować blokadę konta
- Ratio 0.1-6.0 jest bezpieczniejszy niż 0.0-10.0
- Monitoruj status bota przez `/my_status`

## 🔧 Integracja z Botem

Limity są automatycznie używane przez bot podczas:
- Uruchamiania bota (`/start_my_bot`)
- Sprawdzania statusu (`/my_status`)
- Monitorowania wszystkich botów (`/status`)

## 📝 Przykłady Użycia

### 1. Pierwsze Uruchomienie
```
/my_limits          # Sprawdź domyślne limity
/set_limits 10 50 20 0.5 3.0  # Ustaw bezpieczne limity
/start_my_bot       # Uruchom bot
```

### 2. Dostosowanie Limitów
```
/my_status          # Sprawdź aktualny status
/set_limits 15 70 30 0.2 4.0  # Zwiększ limity
/start_my_bot       # Uruchom z nowymi limitami
```

### 3. Reset do Domyślnych
```
/reset_limits       # Przywróć domyślne limity
/my_limits          # Sprawdź nowe limity
```

## 🎯 Najlepsze Praktyki

1. **Zacznij od niskich limitów** - Lepiej być ostrożnym
2. **Monitoruj status** - Używaj `/my_status` regularnie
3. **Dostosowuj stopniowo** - Zwiększaj limity powoli
4. **Uwzględnij wiek konta** - Starsze konta mogą mieć wyższe limity
5. **Testuj różne konfiguracje** - Znajdź optymalne ustawienia dla swojego konta 