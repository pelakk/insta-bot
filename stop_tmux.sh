#!/bin/bash

# InstaAuto - Zatrzymywanie wszystkich sesji tmux

echo "🛑 Zatrzymywanie wszystkich instancji InstaAuto..."

# Zatrzymaj wszystkie sesje tmux instauto
echo "📱 Zatrzymywanie: ladymcbeth_rells"
tmux kill-session -t ladymcbeth_rells 2>/dev/null || echo "   ⚠️  Sesja ladymcbeth_rells nie była uruchomiona"

echo "📱 Zatrzymywanie: lariberrys"
tmux kill-session -t lariberrys 2>/dev/null || echo "   ⚠️  Sesja lariberrys nie była uruchomiona"

# Zatrzymaj PM2 (jeśli było uruchomione)
echo "🛑 Zatrzymywanie PM2..."
pm2 delete all 2>/dev/null || echo "   ⚠️  PM2 nie miał uruchomionych procesów"

echo ""
echo "✅ Wszystkie instancje zostały zatrzymane!"
echo ""
echo "📋 Sprawdź czy wszystko zostało zatrzymane:"
echo "     tmux list-sessions"
echo "     pm2 list" 