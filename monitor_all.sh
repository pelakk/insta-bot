#!/bin/bash

# InstaAuto - Monitor wszystkich instancji

echo "📊 Monitor wszystkich instancji InstaAuto"
echo ""

# Sprawdź czy tmux jest zainstalowany
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux nie jest zainstalowany!"
    exit 1
fi

# Funkcja do sprawdzenia statusu sesji
check_session() {
    local session_name=$1
    if tmux has-session -t "$session_name" 2>/dev/null; then
        echo "✅ $session_name - DZIAŁA"
    else
        echo "❌ $session_name - ZATRZYMANA"
    fi
}

# Sprawdź status wszystkich sesji
echo "🔍 Status sesji tmux:"
check_session "ladymcbeth_rells"
check_session "lariberrys"

echo ""
echo "📋 Wszystkie sesje tmux:"
tmux list-sessions 2>/dev/null || echo "Brak aktywnych sesji"

echo ""
echo "🔍 Procesy Node.js:"
ps aux | grep "node single_instance.js" | grep -v grep | wc -l | xargs echo "Aktywnych procesów:"

echo ""
echo "📊 Wykorzystanie zasobów:"
echo "Pamięć (Node.js procesy):"
ps aux | grep "node single_instance.js" | grep -v grep | awk '{sum += $6} END {print sum/1024 " MB"}'

echo ""
echo "📁 Rozmiar logów:"
if [ -d "logs" ]; then
    echo "Folder logs: $(du -h logs/ | tail -1 | cut -f1)"
    echo "Pliki logów:"
    ls -la logs/*.log 2>/dev/null || echo "Brak plików logów"
else
    echo "Folder logs nie istnieje"
fi

echo ""
echo "🎯 Najnowsze błędy (ostatnie 3 linie z każdego pliku):"
for logfile in logs/*-error.log; do
    if [ -f "$logfile" ]; then
        echo "--- $(basename "$logfile") ---"
        tail -3 "$logfile" 2>/dev/null || echo "Plik pusty"
        echo ""
    fi
done

echo ""
echo "📋 Dostępne komendy:"
echo "  📺 Podłącz się do instancji:"
echo "     tmux attach-session -t ladymcbeth_rells"
echo "     tmux attach-session -t lariberrys"
echo ""
echo "  📊 Sprawdź logi błędów:"
echo "     tail -f logs/ladymcbeth_rells-error.log"
echo "     tail -f logs/lariberrys-error.log"
echo ""
echo "  🛑 Zatrzymaj wszystkie:"
echo "     ./stop_tmux.sh"
echo ""
echo "  🔄 Uruchom ponownie:"
echo "     ./start_tmux.sh"
echo ""
echo "  📋 Odśwież monitor:"
echo "     ./monitor_all.sh" 