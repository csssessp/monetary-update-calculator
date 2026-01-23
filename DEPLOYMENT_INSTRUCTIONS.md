# Instruções de Deploy - Vercel

## Status do Commit
✅ Commit realizado e pushed para GitHub (commit: ed9c06d)

**Mudanças incluídas:**
- ✅ Correção de agregação de índices de Poupança (fetchPoupancaFromBCB)
- ✅ Correção de agregação de índices de IGP-M (fetchIGPMFromBCB)
- ✅ Adição de URLs absolutas para chamadas de API proxy-bcb
- ✅ Adição de typeof window check em atualizarIndicesNoCache()
- ✅ Atualização da API response para incluir Poupança

## Para fazer o Deploy no Vercel

### Opção 1: Deploy Manual via CLI (Recomendado em Container)
```bash
cd /workspaces/monetary-update-calculator

# Se tiver token de personal access token salvo:
export VERCEL_TOKEN="seu_token_aqui"
vercel deploy --prod

# Ou fazer login interativo:
vercel login
vercel deploy --prod
```

### Opção 2: Deployment Automático (Recomendado)
1. Acesse: https://vercel.com/dashboard
2. Clique em "Add New..." → "Project"
3. Selecione o repositório "csssessp/monetary-update-calculator"
4. Clique em "Import"
5. Configure as variáveis de ambiente se necessário
6. Clique em "Deploy"

**Após este passo, todo push para `main` fará deploy automático!**

### Opção 3: GitHub Actions Workflow (Para Futuros Deploys)

Crie `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          prod: true
```

## Como Gerar Token Pessoal no Vercel
1. Acesse: https://vercel.com/account/tokens
2. Clique em "Create Token"
3. Dê um nome (ex: "GitHub Actions")
4. Copie o token
5. Adicione ao repositório GitHub como secret `VERCEL_TOKEN`

## Status Atual
- ✅ Código corrigido
- ✅ Testado localmente
- ✅ Commit feito
- ✅ Push realizado
- ⏳ Deploy pendente (aguardando autenticação Vercel)

## Verificação Pós-Deploy
Após o deploy, verifique:
1. https://seu-projeto.vercel.app/api/atualizar-indices (POST)
2. Verifique se Poupança está sendo retornada
3. Teste um cálculo na interface web
