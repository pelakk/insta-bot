#!/bin/bash

# InstaAuto - Dodawanie nowej instancji

if [ $# -ne 5 ]; then
    echo "❌ Nieprawidłowa liczba argumentów!"
    echo ""
    echo "Użycie:"
    echo "  ./add_instance.sh [nazwa_sesji] [instance_id] [proxy_ip] [username] [password]"
    echo ""
    echo "Przykład:"
    echo "  ./add_instance.sh nowe_konto 3 192.168.1.100 nowe_konto_insta MojeHaslo123"
    echo ""
    exit 1
fi

NAZWA_SESJI=$1
INSTANCE_ID=$2
PROXY_IP=$3
USERNAME=$4
PASSWORD=$5

echo "🚀 Dodawanie nowej instancji: $NAZWA_SESJI"

# Sprawdź czy sesja już istnieje
if tmux has-session -t "$NAZWA_SESJI" 2>/dev/null; then
    echo "❌ Sesja $NAZWA_SESJI już istnieje!"
    echo "Zatrzymaj ją najpierw: tmux kill-session -t $NAZWA_SESJI"
    exit 1
fi

# Sprawdź czy tmux jest zainstalowany
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux nie jest zainstalowany!"
    echo "Zainstaluj: sudo apt install tmux"
    exit 1
fi

# Utwórz folder na logi jeśli nie istnieje
mkdir -p logs

echo "📱 Uruchamianie instancji: $NAZWA_SESJI"
echo "   - Instance ID: $INSTANCE_ID"
echo "   - Proxy IP: $PROXY_IP"
echo "   - Username: $USERNAME"

# Uruchom nową instancję w sesji tmux
tmux new-session -d -s "$NAZWA_SESJI" \
  -c "$(pwd)" \
  "INSTANCE_ID=$INSTANCE_ID PROXY_IP=$PROXY_IP INSTAGRAM_USERNAME=$USERNAME INSTAGRAM_PASSWORD=$PASSWORD MAX_FOLLOWS_PER_HOUR=20 MAX_FOLLOWS_PER_DAY=150 MAX_LIKES_PER_DAY=30 FOLLOW_USER_RATIO_MIN=0.2 FOLLOW_USER_RATIO_MAX=4.0 USERS_TO_FOLLOW=natgeo,sam_kolder node single_instance.js"

echo ""
echo "✅ Instancja $NAZWA_SESJI została uruchomiona!"
echo ""
echo "📋 Dostępne komendy dla tej instancji:"
echo ""
echo "  📺 Podłącz się do terminala:"
echo "     tmux attach-session -t $NAZWA_SESJI"
echo ""
echo "  🛑 Zatrzymaj instancję:"
echo "     tmux kill-session -t $NAZWA_SESJI"
echo ""
echo "  📊 Zobacz błędy w logach:"
echo "     tail -f logs/${NAZWA_SESJI}-error.log"
echo ""
echo "  🔄 Odłącz się od sesji tmux:"
echo "     Ctrl+B, potem D" 