# 🚀 Instruções de Deploy Vercel

## Status do Commit GitHub
✅ **Commit realizado com sucesso!**
- Hash: `a0089f5`
- Branch: `main`
- Arquivos: 13 alterados, 2169 inserções, 325 exclusões

✅ **Push para GitHub realizado!**
- Repositório: https://github.com/Coordenadoria/monetary-update-calculator
- Branch remoto atualizado: main

## 🔧 Deploy no Vercel

O projeto está conectado ao Vercel via GitHub. O deploy automático deve ocorrer em um dos seguintes cenários:

### Opção 1: Deploy Automático (Recomendado)
Quando um commit é feito na branch `main`, o Vercel detecta automaticamente a mudança e inicia o deploy.

**Status esperado:**
1. Vercel recebe webhook do GitHub
2. Inicia build automático
3. Deploy em produção
4. URL: https://monetary-update-calculator.vercel.app (ou seu domínio personalizado)

**Tempo estimado:** 2-5 minutos

### Opção 2: Verificar Status do Deploy
Acesse: https://vercel.com/dashboard

### Opção 3: Deploy Manual com CLI Autenticado
```bash
# Se tiver token do Vercel armazenado:
vercel deploy --prod

# Ou criar .vercelignore (se necessário)
echo "node_modules" >> .vercelignore
```

## ✨ Implementações Incluídas

Este deploy inclui as 3 funcionalidades solicitadas:

### 1️⃣ Atualização Real de Índices
- Dados em tempo real do Banco Central do Brasil
- APIs: IGP-M, IPCA, INPC, Poupança, SELIC, CDI
- Endpoint: `POST /api/atualizar-indices`

### 2️⃣ Remoção de Índice Secundário
- UI simplificada
- Campo "Usar índice diferente" removido
- Apenas 1 índice por cálculo

### 3️⃣ Reajuste IGP-M a Cada 12 Meses
- Fórmula FGV: (1 + m1) × (1 + m2) × ... × (1 + m12) − 1
- Ciclo automático a cada 12 meses
- Documentação detalhada na memória de cálculo

## 📊 Endpoints Disponíveis

- `GET /` - Aplicação web
- `POST /api/atualizar-indices` - Atualiza dados dos índices
- `GET /api/indices` - Lista índices em cache
- `POST /api/buscar-indices` - Busca histórico de índices

## 🧪 Teste em Produção

```bash
# Atualizar índices
curl -X POST https://monetary-update-calculator.vercel.app/api/atualizar-indices

# Listar índices
curl https://monetary-update-calculator.vercel.app/api/indices
```

## 📝 Próximos Passos

1. **Verificar Deploy:** Acesse https://monetary-update-calculator.vercel.app
2. **Testar Funcionalidades:** Clique em "Atualizar Índices" e teste cálculos
3. **Monitorar Analytics:** Dashboard do Vercel em https://vercel.com/dashboard
4. **Logs:** Disponíveis em Vercel Dashboard → Project → Deployments

## ⚠️ Troubleshooting

Se o deploy não funcionar:

1. **Verificar GitHub Integration:**
   - Vercel Dashboard → Settings → Git Integration
   - Confirmar se o repositório está conectado

2. **Logs de Build:**
   - Vercel Dashboard → Deployments → Ver logs de build

3. **Variáveis de Ambiente (se necessário):**
   - Vercel Dashboard → Settings → Environment Variables

4. **Redeployed Manual:**
   ```bash
   vercel redeploy --prod
   ```

---

**Data do Deploy:** $(date)  
**Status:** ✅ Pronto para produção
