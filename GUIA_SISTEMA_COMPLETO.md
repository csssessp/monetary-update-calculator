# 📚 GUIA COMPLETO DO SISTEMA DE ÍNDICES

## 🎯 Princípio Central

```
┌──────────────────────────────────────────────────────────┐
│  CÁLCULO                                                 │
│  ├─ Usa SEMPRE: lib/indices-data.ts (arquivo local)    │
│  ├─ Sem requisições de API                              │
│  └─ Resultado: 100% reproduzível                        │
├──────────────────────────────────────────────────────────┤
│  ATUALIZAÇÃO                                             │
│  ├─ Usa: APIs externas (BACEN, IBGE, FGV)              │
│  ├─ Retorna: Dados para revisar                         │
│  └─ Ação: Adicionar manualmente ao arquivo local        │
└──────────────────────────────────────────────────────────┘
```

---

## 📖 Índices Disponíveis

### 1. IGP-M (Índice Geral de Preços - Mercado)
- **Fonte:** FGV via BACEN (Série 189) ou Ipeadata
- **Período:** Jul/1989 - Jan/2026
- **Melhor para:** Contratos, reajustes de longo prazo
- **Arquivo:** `lib/indices-data.ts`
- **Últimos dados:** 438 meses

### 2. Poupança (Rentabilidade da Caderneta)
- **Fonte:** BACEN (Série 195)
- **Período:** Jan/2020 - Jan/2026
- **Melhor para:** Dívidas judiciais, correção monetária
- **Arquivo:** `lib/indices-data.ts`
- **Últimos dados:** 73 meses

### 3. INPC (Índice Nacional de Preços ao Consumidor)
- **Fonte:** IBGE via BACEN (Série 188)
- **Período:** Jan/2020 - Jan/2026
- **Melhor para:** Correção de salários, índice oficial
- **Arquivo:** `lib/indices-data.ts`
- **Últimos dados:** 74 meses

---

## 🔄 Ciclo de Vida dos Dados

### Fase 1: CÁLCULO (Usa Dados Locais)

```typescript
// app/page.tsx (Interface do Usuário)
user.click("Calcular")
↓
// lib/calculo-monetario.ts
calcularCorrecaoMonetaria(parametros)
↓
// lib/indices-data.ts
obterIndicesPeriodo()
↓
// ✅ Busca em lib/indices-data.ts (arquivo local)
// ❌ Não chama API externas
filtrarLocal(nomeIndice)
↓
// Aplica índices no cálculo
Resultado preciso e reproduzível
```

### Fase 2: ATUALIZAÇÃO (Busca em APIs)

```typescript
// app/indices/page.tsx (Página de Gerenciamento)
user.click("Atualizar Índices dos Sites Oficiais")
↓
// app/api/atualizar-indices/route.ts
POST /api/atualizar-indices
↓
// lib/fetch-indices.ts
fetchAllIndices()
├─ fetchIGPMFromIpeadata() → API Ipeadata
├─ fetchIGPMFromBCB() → API BACEN
├─ fetchPoupancaFromBCB() → API BACEN
└─ fetchINPCFromBCB() → API BACEN
↓
// Retorna dados para o usuário
// Usuário revisa
```

### Fase 3: VALIDAÇÃO (Testa Dados)

```bash
# Usuário executa
$ node test-all-indices.mjs

# Sistema valida:
✅ Formatos corretos?
✅ Valores realistas?
✅ Sem duplicatas?
✅ Período contínuo?
↓
// Se tudo OK: prosseguir
```

### Fase 4: INTEGRAÇÃO (Adiciona ao Arquivo)

```typescript
// Usuário adiciona manualmente a lib/indices-data.ts:

Poupança: [
  // ... dados anteriores ...
  { mes: 1, ano: 2026, valor: 0.6707 },
  // Novos dados adicionados
]
```

### Fase 5: COMMIT (Salva Versão)

```bash
$ git add lib/indices-data.ts
$ git commit -m "Atualizar índices para Janeiro/2026"

# Histórico preservado
# Rastreabilidade completa
```

---

## 📋 Arquivos Importantes

### Dados (Source of Truth)
```
lib/indices-data.ts
├─ IGP-M: 438 registros (Jul/1989 - Jan/2026)
├─ Poupança: 73 registros (Jan/2020 - Jan/2026)
└─ INPC: 74 registros (Jan/2020 - Jan/2026)

USE ESTE ARQUIVO PARA:
✅ Cálculos
✅ Relatórios
✅ Auditoria

ATUALIZE QUANDO:
📅 Novos meses divulgados oficialmente
```

### Cálculo
```
lib/calculo-monetario.ts
├─ calcularCorrecaoMonetaria() → função principal
├─ obterIndicesPeriodo() → busca dados
└─ Usa lib/indices-data.ts sempre

NÃO modifique para:
❌ Chamar APIs
❌ Fazer download de dados
```

### Atualização de Dados
```
app/api/atualizar-indices/route.ts
├─ Endpoint POST /api/atualizar-indices
├─ Chama fetchAllIndices()
└─ Retorna dados para revisar

lib/fetch-indices.ts
├─ fetchIGPMFromIpeadata()
├─ fetchIGPMFromBCB()
├─ fetchPoupancaFromBCB()
└─ fetchINPCFromBCB()

update-indices.mjs
├─ Script CLI para atualizar
└─ Busca dados via APIs
```

### Validação
```
test-all-indices.mjs
├─ Valida todos os índices
├─ Testa cálculos comparativos
└─ Verifica valores realistas

EXECUTE SEMPRE ANTES DE:
✅ Usar novos dados
✅ Commitar mudanças
```

---

## 🎮 Como Usar

### Cenário 1: Fazer um Cálculo

```
1. Abrir aplicação
2. Preencher:
   - Valor original
   - Data inicial
   - Data final
   - Índice desejado
3. Clicar "Calcular"
4. ✅ Sistema usa lib/indices-data.ts automaticamente
```

### Cenário 2: Atualizar Índices (Mensal)

```
1. Dia 1-15 do mês: Novo dado divulgado
2. Na aplicação: Clicar "Atualizar Índices"
3. Revisar dados exibidos
4. Validar: node test-all-indices.mjs
5. Editar lib/indices-data.ts
6. Adicionar nova linha com novo mês
7. Commit: git commit -m "..."
8. ✅ Pronto para usar
```

### Cenário 3: Linha de Comando

```bash
# Verificar dados disponíveis
$ node test-all-indices.mjs

# Buscar dados novos (manual)
$ node update-indices.mjs

# Revisar um período específico
$ grep "ano: 2026" lib/indices-data.ts
```

---

## 🔒 Garantias do Sistema

### ✅ Precisão
- Dados vêm de fontes oficiais
- Validação antes de usar
- Nenhuma estimativa ou previsão

### ✅ Reproducibilidade
- Arquivo local para todas as informações
- Mesmo cálculo sempre retorna mesmo resultado
- Histórico completo no Git

### ✅ Rastreabilidade
- Cada dado tem documentação de origem
- Versão controlada
- Auditable

### ✅ Performance
- Sem requisições de API durante cálculo
- Respostas instantâneas
- Sem latência de rede

### ✅ Confiabilidade
- Dados em arquivo (não em servidor remoto)
- Funciona offline
- Backup automático no Git

---

## 🚀 Manutenção Mensal

### Checklist

```
[ ] Dia 1-15: Novos dados divulgados?
[ ] Executar: node update-indices.mjs
[ ] Revisar: Dados no output
[ ] Validar: node test-all-indices.mjs
[ ] Editar: lib/indices-data.ts
[ ] Adicionar: Novos meses
[ ] Testar: node test-all-indices.mjs (novamente)
[ ] Commitar: git commit
[ ] Verificar: Aplicação usa novos dados

✅ Pronto para o próximo mês
```

---

## 📞 Troubleshooting

### "Cálculo usando dados antigos"
```
✅ Solução:
1. Editar lib/indices-data.ts
2. Adicionar novos meses
3. Salvar arquivo
4. Cálculo automaticamente usa novos dados
```

### "Erro: Dados incompletos"
```
✅ Solução:
1. Executar: node test-all-indices.mjs
2. Verificar quais meses faltam
3. Buscar dados oficiais
4. Adicionar a lib/indices-data.ts
```

### "API retorna erro"
```
✅ Solução:
1. API pode estar offline
2. Usar dados anteriores
3. Tentar update-indices.mjs depois
4. Continuar usando dados locais
```

---

## 📊 Exemplo Prático

### Adicionar dados de Fevereiro/2026

**Passo 1: Buscar**
```bash
$ node update-indices.mjs

📥 Buscando Poupança...
   ✅ Poupança fev/2026: 0.63%

📥 Buscando IGP-M...
   ✅ IGP-M fev/2026: 0.35%

📥 Buscando INPC...
   ✅ INPC fev/2026: 0.42%
```

**Passo 2: Adicionar a `lib/indices-data.ts`**
```typescript
  Poupança: [
    // ... dados anteriores ...
    { mes: 1, ano: 2026, valor: 0.6707 },
    { mes: 2, ano: 2026, valor: 0.63 },  // ← NOVO
  ],
```

**Passo 3: Validar**
```bash
$ node test-all-indices.mjs

✅ Poupança: Todos os valores dentro do intervalo
✅ IGP-M: Todos os valores dentro do intervalo
✅ INPC: Todos os valores dentro do intervalo
```

**Passo 4: Commitar**
```bash
$ git add lib/indices-data.ts
$ git commit -m "Atualizar índices para Fevereiro/2026"
```

**Pronto!** Novos cálculos automaticamente usam fevereiro/2026 ✅

---

## ✨ Conclusão

Sistema implementado corretamente:
- ✅ Cálculos usam arquivo local
- ✅ APIs para atualização apenas
- ✅ Dados sempre validados
- ✅ Rastreabilidade completa
- ✅ Pronto para auditoria
- ✅ Pronto para produção
