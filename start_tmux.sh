#!/bin/bash

# InstaAuto - Uruchamianie w osobnych terminalach tmux
# Dla Linux - każda instancja w osobnej sesji

echo "🚀 Uruchamianie InstaAuto w osobnych terminalach tmux..."

# Sprawdź czy tmux jest zainstalowany
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux nie jest zainstalowany!"
    echo "Zainstaluj: sudo apt install tmux"
    exit 1
fi

# Sprawdź czy PM2 jest zainstalowany
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 nie jest zainstalowany!"
    echo "Zainstaluj: npm install -g pm2"
    exit 1
fi

# Utwórz folder na logi jeśli nie istnieje
mkdir -p logs

# Zatrzymaj wszystkie poprzednie sesje tmux instauto
echo "🛑 Zatrzymywanie poprzednich sesji..."
tmux kill-session -t ladymcbeth_rells 2>/dev/null || true
tmux kill-session -t lariberrys 2>/dev/null || true

# Zatrzymaj PM2 (jeśli było uruchomione)
pm2 delete all 2>/dev/null || true

echo "✅ Uruchamianie instancji w osobnych terminalach..."

# Uruchom każdą instancję w osobnej sesji tmux
echo "📱 Uruchamianie: ladymcbeth_rells"
tmux new-session -d -s ladymcbeth_rells \
  -c "$(pwd)" \
  "INSTANCE_ID=1 PROXY_IP=77.47.240.226 INSTAGRAM_USERNAME=ladymcbeth.rells INSTAGRAM_PASSWORD=Randki123 MAX_FOLLOWS_PER_HOUR=20 MAX_FOLLOWS_PER_DAY=150 MAX_LIKES_PER_DAY=30 FOLLOW_USER_RATIO_MIN=0.2 FOLLOW_USER_RATIO_MAX=4.0 USERS_TO_FOLLOW=emilka_kk,jakis_influencer1 node single_instance.js"

echo "📱 Uruchamianie: lariberrys"
tmux new-session -d -s lariberrys \
  -c "$(pwd)" \
  "INSTANCE_ID=2 PROXY_IP=82.163.175.153 INSTAGRAM_USERNAME=lariberrys INSTAGRAM_PASSWORD=Randki123 MAX_FOLLOWS_PER_HOUR=20 MAX_FOLLOWS_PER_DAY=150 MAX_LIKES_PER_DAY=30 FOLLOW_USER_RATIO_MIN=0.2 FOLLOW_USER_RATIO_MAX=4.0 USERS_TO_FOLLOW=natgeo,sam_kolder node single_instance.js"

echo ""
echo "✅ Wszystkie instancje uruchomione!"
echo ""
echo "📋 Dostępne komendy:"
echo ""
echo "  📺 Podłącz się do terminala konkretnej instancji:"
echo "     tmux attach-session -t ladymcbeth_rells"
echo "     tmux attach-session -t lariberrys"
echo ""
echo "  📋 Zobacz listę wszystkich sesji:"
echo "     tmux list-sessions"
echo ""
echo "  🛑 Zatrzymaj konkretną instancję:"
echo "     tmux kill-session -t ladymcbeth_rells"
echo "     tmux kill-session -t lariberrys"
echo ""
echo "  🛑 Zatrzymaj wszystkie instancje:"
echo "     ./stop_tmux.sh"
echo ""
echo "  📊 Zobacz błędy w logach:"
echo "     tail -f logs/ladymcbeth_rells-error.log"
echo "     tail -f logs/lariberrys-error.log"
echo ""
echo "  🔄 Odłącz się od sesji tmux:"
echo "     Ctrl+B, potem D"
echo ""
echo "🎯 Każda instancja działa w osobnym terminalu!"
echo "🔍 Logi błędów zapisywane są do plików w folderze logs/" 