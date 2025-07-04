# InstaAuto - Przewodnik Linux (tmux)

## 🐧 Dla Linux - Każda instancja w osobnym terminalu

Ten przewodnik pokazuje jak uruchomić InstaAuto na Linux z każdą instancją w osobnym terminalu tmux. **Zalecane dla serwerów Linux!**

## 📋 Spis treści

- [Wymagania Linux](#wymagania-linux)
- [Instalacja](#instalacja)
- [Szybki start](#szybki-start)
- [Zarządzanie instancjami](#zarządzanie-instancjami)
- [Dodawanie nowych instancji](#dodawanie-nowych-instancji)
- [Monitoring](#monitoring)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)
- [Skalowanie do 20+ instancji](#skalowanie)

## 🔧 Wymagania Linux

- **Ubuntu/Debian/CentOS** (lub inna dystrybucja Linux)
- **Node.js** (wersja 16 lub nowsza)
- **tmux** (menedżer sesji terminalowych)
- **Proxy SOCKS5** z uwierzytelnianiem
- **Konta Instagram** z danymi logowania

## 🚀 Instalacja

### 1. Zainstaluj wymagane pakiety

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install tmux nodejs npm

# CentOS/RHEL
sudo yum install tmux nodejs npm
```

### 2. Zainstaluj zależności projektu

```bash
npm install
```

### 3. Nadaj uprawnienia skryptom

```bash
chmod +x start_tmux.sh stop_tmux.sh add_instance.sh
```

### 4. Utwórz folder na logi

```bash
mkdir -p logs
```

## 🎯 Szybki start

### 1. Edytuj konfigurację w `start_tmux.sh`

Zmień dane logowania i proxy w pliku:

```bash
nano start_tmux.sh
```

### 2. Uruchom wszystkie instancje

```bash
./start_tmux.sh
```

### 3. Podłącz się do terminala konkretnej instancji

```bash
# Podłączenie do pierwszej instancji
tmux attach-session -t ladymcbeth_rells

# Podłączenie do drugiej instancji
tmux attach-session -t lariberrys
```

### 4. Odłącz się od sesji (nie zatrzymując jej)

```
Ctrl+B, potem D
```

## 🎛️ Zarządzanie instancjami

### Podstawowe komendy

```bash
# Uruchom wszystkie instancje
./start_tmux.sh

# Zatrzymaj wszystkie instancje
./stop_tmux.sh

# Zobacz listę wszystkich sesji
tmux list-sessions

# Podłącz się do konkretnej sesji
tmux attach-session -t [nazwa_sesji]

# Zatrzymaj konkretną sesję
tmux kill-session -t [nazwa_sesji]
```

### Zarządzanie pojedynczą instancją

```bash
# Zatrzymaj konkretną instancję
tmux kill-session -t ladymcbeth_rells

# Uruchom nową instancję ręcznie
./add_instance.sh nowa_instancja 3 192.168.1.100 username password

# Sprawdź status sesji
tmux has-session -t ladymcbeth_rells && echo "Działa" || echo "Nie działa"
```

## ➕ Dodawanie nowych instancji

### Użyj skryptu `add_instance.sh`

```bash
./add_instance.sh [nazwa_sesji] [instance_id] [proxy_ip] [username] [password]
```

### Przykład:

```bash
./add_instance.sh trzecie_konto 3 161.77.68.134 moje_konto_insta MojeHaslo123
```

### Parametry:

- **nazwa_sesji** - unikalna nazwa dla sesji tmux
- **instance_id** - numer instancji (unikalny)
- **proxy_ip** - adres IP proxy SOCKS5
- **username** - nazwa użytkownika Instagram
- **password** - hasło do Instagram

## 📊 Monitoring

### Logowanie realtime

```bash
# Podłącz się do terminala instancji (realtime)
tmux attach-session -t ladymcbeth_rells

# Zobacz błędy w plikach logów
tail -f logs/ladymcbeth_rells-error.log
tail -f logs/lariberrys-error.log

# Sprawdź wszystkie błędy
tail -f logs/*-error.log
```

### Status systemu

```bash
# Lista wszystkich sesji tmux
tmux list-sessions

# Procesy Node.js
ps aux | grep node

# Wykorzystanie zasobów
top -p $(pgrep -d',' node)

# Miejsce na dysku (logi)
du -h logs/
```

## 🔧 Rozwiązywanie problemów

### Instancja nie startuje

```bash
# Sprawdź czy sesja istnieje
tmux list-sessions

# Sprawdź logi błędów
tail logs/[nazwa_instancji]-error.log

# Uruchom ponownie konkretną instancję
tmux kill-session -t ladymcbeth_rells
./add_instance.sh ladymcbeth_rells 1 77.47.240.226 ladymcbeth.rells Randki123
```

### Problemy z proxy

```bash
# Testuj proxy ręcznie
curl --proxy socks5://kamzza:bJXwSnBLy9@77.47.240.226:50101 https://httpbin.org/ip

# Sprawdź logi związane z proxy
grep -i proxy logs/*-error.log
```

### Problemy z tmux

```bash
# Zabij wszystkie sesje tmux
tmux kill-server

# Uruchom ponownie
./start_tmux.sh

# Sprawdź konfigurację tmux
tmux show-options -g
```

### Zbyt dużo logów

```bash
# Wyczyść stare logi
rm logs/*-error.log

# Ogranicz rozmiar logów (rotacja)
find logs/ -name "*.log" -size +100M -delete
```

## 📈 Skalowanie

### Skalowanie do 20+ instancji

1. **Przygotuj proxy i konta**:

   - 20 różnych proxy IP
   - 20 różnych kont Instagram
   - Wystarczająco RAM (około 60MB na instancję)

2. **Utwórz skrypt masowego uruchamiania**:

```bash
#!/bin/bash
# mass_start.sh

instances=(
    "konto1:1:77.47.240.226:user1:pass1"
    "konto2:2:82.163.175.153:user2:pass2"
    "konto3:3:161.77.68.134:user3:pass3"
    # ... dodaj więcej
)

for instance in "${instances[@]}"; do
    IFS=':' read -r name id proxy user pass <<< "$instance"
    ./add_instance.sh "$name" "$id" "$proxy" "$user" "$pass"
    sleep 2  # Opóźnienie między uruchomieniami
done
```

3. **Monitoring wielu instancji**:

```bash
# Sprawdź wszystkie sesje
tmux list-sessions | wc -l

# Sprawdź zasoby wszystkich procesów
ps aux | grep "node single_instance.js" | wc -l

# Monitor zasobów systemowych
htop
```

## 📋 Przydatne komendy tmux

### Podstawy tmux

```bash
# Lista wszystkich sesji
tmux list-sessions

# Nowa sesja
tmux new-session -s nazwa_sesji

# Podłączenie do sesji
tmux attach-session -t nazwa_sesji

# Odłączenie bez zatrzymywania (w sesji)
Ctrl+B, potem D

# Zabicie sesji
tmux kill-session -t nazwa_sesji

# Zabicie wszystkich sesji
tmux kill-server
```

### Zaawansowane

```bash
# Uruchom komendę w sesji bez podłączania
tmux send-keys -t nazwa_sesji "jakas_komenda" Enter

# Sprawdź czy sesja istnieje
tmux has-session -t nazwa_sesji

# Lista okien w sesji
tmux list-windows -t nazwa_sesji

# Zmień nazwę sesji
tmux rename-session -t stara_nazwa nowa_nazwa
```

## 🎪 Przykładowe scenariusze

### Scenariusz 1: Pierwsze uruchomienie

```bash
# 1. Zainstaluj wymagania
sudo apt install tmux nodejs npm

# 2. Zainstaluj zależności
npm install

# 3. Nadaj uprawnienia
chmod +x *.sh

# 4. Uruchom
./start_tmux.sh

# 5. Sprawdź status
tmux list-sessions
```

### Scenariusz 2: Jedna instancja ma problemy

```bash
# 1. Sprawdź które sesje działają
tmux list-sessions

# 2. Sprawdź logi błędów
tail logs/ladymcbeth_rells-error.log

# 3. Zatrzymaj problematyczną instancję
tmux kill-session -t ladymcbeth_rells

# 4. Uruchom ponownie
./add_instance.sh ladymcbeth_rells 1 77.47.240.226 ladymcbeth.rells Randki123
```

### Scenariusz 3: Dodanie 10 nowych instancji

```bash
# Utwórz plik z konfiguracją
cat > instances.txt << EOF
konto3:3:192.168.1.1:user3:pass3
konto4:4:192.168.1.2:user4:pass4
konto5:5:192.168.1.3:user5:pass5
# ... więcej
EOF

# Uruchom automatycznie
while read line; do
    IFS=':' read -r name id proxy user pass <<< "$line"
    ./add_instance.sh "$name" "$id" "$proxy" "$user" "$pass"
    sleep 2
done < instances.txt
```

### Scenariusz 4: Całkowite zatrzymanie

```bash
# 1. Zatrzymaj wszystkie instancje
./stop_tmux.sh

# 2. Sprawdź czy wszystko zostało zatrzymane
tmux list-sessions
ps aux | grep node

# 3. Wyczyść logi (opcjonalnie)
rm logs/*.log
```

## ⚡ Zalety rozwiązania tmux

### ✅ **Korzyści:**

- 🖥️ **Osobny terminal** dla każdej instancji
- 🔍 **Realtime monitoring** - widzisz logi na żywo
- ⚡ **Małe zużycie zasobów** - brak nadmiarowych logów do plików
- 🎛️ **Łatwe zarządzanie** - podłączaj/odłączaj się od sesji
- 🔄 **Restart bez utraty logów** - sesje działają w tle
- 📊 **Tylko error logi** - brak zapychania dysku

### ⚠️ **Vs PM2:**

- **tmux**: Lepszy dla serwerów Linux, realtime monitoring
- **PM2**: Lepszy dla automatyzacji, dashboardy, clustering

## 🔗 Użyteczne linki

- [tmux Documentation](https://github.com/tmux/tmux/wiki)
- [tmux Cheat Sheet](https://tmuxcheatsheet.com/)
- [Linux Terminal Basics](https://ubuntu.com/tutorials/command-line-for-beginners)

---

## ⚠️ Ważne uwagi

1. **Używaj różnych proxy** dla każdej instancji
2. **Monitoruj zasoby** serwera regularnie
3. **Rób backup baz danych** (followed.json, itp.)
4. **Testuj proxy** przed uruchomieniem
5. **Nie uruchamiaj zbyt wielu instancji** jednocześnie bez testów
6. **Używaj screen** jeśli tmux nie jest dostępny

---

_Przygotowane dla InstaAuto Linux - Osobne terminale tmux dla każdej instancji_
