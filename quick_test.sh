#!/bin/bash

# InstaAuto - Szybki test dla Linux

echo "🧪 Szybki test InstaAuto na Linux"
echo ""

# Sprawdź podstawowe wymagania
echo "🔍 Sprawdzanie wymagań..."

# Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js nie jest zainstalowany!"
    exit 1
fi

# npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm nie jest zainstalowany!"
    exit 1
fi

# tmux
if command -v tmux &> /dev/null; then
    echo "✅ tmux: $(tmux -V)"
else
    echo "❌ tmux nie jest zainstalowany!"
    echo "Zainstaluj: sudo apt install tmux"
    exit 1
fi

echo ""
echo "🔧 Sprawdzanie plików projektu..."

# Sprawdź czy istnieją wymagane pliki
files_to_check=("package.json" "single_instance.js" "start_tmux.sh" "stop_tmux.sh" "add_instance.sh")
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - nie istnieje!"
        exit 1
    fi
done

echo ""
echo "🔐 Sprawdzanie uprawnień skryptów..."

# Sprawdź uprawnienia
scripts=("start_tmux.sh" "stop_tmux.sh" "add_instance.sh")
for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo "✅ $script - wykonywalny"
    else
        echo "⚠️  $script - nie ma uprawnień wykonywania"
        echo "Napraw: chmod +x $script"
    fi
done

echo ""
echo "📦 Sprawdzanie zależności Node.js..."

# Sprawdź czy node_modules istnieje
if [ -d "node_modules" ]; then
    echo "✅ node_modules istnieje"
else
    echo "⚠️  node_modules nie istnieje"
    echo "Uruchom: npm install"
fi

# Sprawdź czy package.json ma wymagane zależności
required_deps=("puppeteer" "proxy-chain")
for dep in "${required_deps[@]}"; do
    if npm list "$dep" &> /dev/null; then
        echo "✅ $dep jest zainstalowane"
    else
        echo "⚠️  $dep może nie być zainstalowane"
    fi
done

echo ""
echo "📁 Tworzenie folderu logs..."

# Utwórz folder logs
mkdir -p logs
echo "✅ Folder logs utworzony"

echo ""
echo "🎯 Test zakończony!"
echo ""
echo "📋 Następne kroki:"
echo "1. Jeśli są błędy - napraw je"
echo "2. Edytuj start_tmux.sh (dane logowania i proxy)"
echo "3. Uruchom: ./start_tmux.sh"
echo "4. Sprawdź sesje: tmux list-sessions"
echo "5. Podłącz się: tmux attach-session -t ladymcbeth_rells"
echo ""
echo "🔗 Więcej informacji w README_LINUX.md" 