#!/bin/bash

# Script de Deploy para Vercel
# Uso: ./deploy.sh [token]

set -e

echo "🚀 Deploy para Vercel - Monetary Update Calculator"
echo "=================================================="

if [ -z "$1" ]; then
    echo "❌ Erro: Token do Vercel não fornecido"
    echo ""
    echo "Uso: ./deploy.sh <seu_vercel_token>"
    echo ""
    echo "Como obter o token:"
    echo "1. Acesse: https://vercel.com/account/tokens"
    echo "2. Crie um novo token"
    echo "3. Use: ./deploy.sh seu_token_aqui"
    exit 1
fi

export VERCEL_TOKEN="$1"

echo "✅ Token configurado"
echo ""
echo "📦 Iniciando deploy em produção..."
echo ""

vercel deploy --prod

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Acesse o dashboard do Vercel: https://vercel.com/dashboard"
echo "2. Verifique o status do deployment"
echo "3. Teste a URL da aplicação"
