# 🚀 SYSTEM DLA 100 KONT INSTAGRAM

## **📋 SZYBKIE DODAWANIE KONT**

### **Metoda 1: Przez CSV (NAJLEPSZA)**
1. **Edytuj plik `accounts.csv`:**
```csv
username,sessionid,proxy_ip,proxy_username,proxy_password,proxy_port,backup_proxy_ip
account1,SESSIONID1,82.163.175.153,kamzza,bJXwSnBLy9,50101,77.47.240.226
account2,SESSIONID2,82.163.175.153,kamzza,bJXwSnBLy9,50101,77.47.240.226
account3,SESSIONID3,82.163.175.153,kamzza,bJXwSnBLy9,50101,77.47.240.226
```

2. **Wygeneruj konfigurację:**
```bash
node generate_config.js
```

3. **Uruchom wszystkie konta:**
```bash
pm2 start ecosystem.config.js
```

### **Metoda 2: Przez CLI**
```bash
# Dodaj pojedyncze konto
node manage_accounts.js add username SESSIONID

# Listuj wszystkie konta
node manage_accounts.js list

# Usuń konto
node manage_accounts.js remove username

# Wygeneruj konfigurację
node manage_accounts.js generate
```

## **🔧 ZARZĄDZANIE**

### **Uruchamianie**
```bash
# Uruchom wszystkie konta
pm2 start ecosystem.config.js

# Uruchom tylko wybrane konta
pm2 start ecosystem.config.js --only account1,account2

# Restart z nowymi ustawieniami
pm2 restart all --update-env
```

### **Monitorowanie**
```bash
# Status wszystkich kont
pm2 status

# Logi wszystkich kont
pm2 logs

# Logi konkretnego konta
pm2 logs account1

# Monitor w czasie rzeczywistym
pm2 monit
```

### **Zatrzymywanie**
```bash
# Zatrzymaj wszystkie
pm2 stop all

# Zatrzymaj konkretne konto
pm2 stop account1

# Usuń wszystkie z PM2
pm2 delete all
```

## **📊 OPTYMALIZACJA DLA 100 KONT**

### **Zalecane ustawienia:**
- **Maksymalnie 20-30 kont jednocześnie** (ze względu na zasoby)
- **Różne proxy dla różnych grup kont**
- **Staggered start** - uruchamiaj konta w odstępach 5-10 minut

### **Skrypt do staggered start:**
```bash
# Uruchom konta w grupach po 10
for i in {0..9}; do
  pm2 start ecosystem.config.js --only $(sed -n "$((i*10+1)),$(((i+1)*10))p" accounts.csv | cut -d',' -f1 | tr '\n' ',')
  sleep 300  # 5 minut przerwy
done
```

## **🛡️ BEZPIECZEŃSTWO**

### **Dobre praktyki:**
1. **Różne proxy** dla różnych grup kont
2. **Różne target users** dla różnych kont
3. **Różne rate limits** (15-25 follows/hour)
4. **Random delays** między akcjami
5. **Monitorowanie logów** codziennie

### **Wykrywanie problemów:**
```bash
# Sprawdź błędy
pm2 logs --err

# Sprawdź konta z błędami
pm2 list | grep "error"

# Restart problematycznych kont
pm2 restart account_with_error
```

## **📈 SKALOWANIE**

### **Dla 100+ kont:**
1. **Podziel na grupy** po 20-30 kont
2. **Użyj różnych serwerów** dla różnych grup
3. **Różne target users** dla każdej grupy
4. **Monitoruj zasoby** (CPU, RAM, bandwidth)

### **Automatyczne zarządzanie:**
```bash
# Skrypt do automatycznego restartu problematycznych kont
pm2 restart $(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "error") | .name')
```

## **🔍 TROUBLESHOOTING**

### **Częste problemy:**
1. **Proxy errors** - sprawdź logi, zmień proxy
2. **Session expired** - zaktualizuj sessionid
3. **Rate limiting** - zmniejsz rate limits
4. **Memory issues** - zmniejsz liczbę jednoczesnych kont

### **Debugowanie:**
```bash
# Szczegółowe logi
pm2 logs --lines 100

# Sprawdź zasoby
pm2 monit

# Sprawdź konfigurację
cat ecosystem.config.js
```

## **📝 PRZYKŁADY**

### **Dodanie 10 kont szybko:**
```bash
# Edytuj accounts.csv z 10 kontami
# Następnie:
node generate_config.js
pm2 start ecosystem.config.js
```

### **Zmiana ustawień dla wszystkich kont:**
```bash
# Edytuj generate_config.js (linie 15-35)
# Następnie:
node generate_config.js
pm2 restart all --update-env
```

### **Backup konfiguracji:**
```bash
cp accounts.csv accounts_backup.csv
cp ecosystem.config.js ecosystem_backup.js
``` 