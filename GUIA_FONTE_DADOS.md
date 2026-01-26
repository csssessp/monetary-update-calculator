# 📋 GUIA DE FONTE DE DADOS

## Princípio Fundamental

```
🎯 CÁLCULOS SEMPRE USAM: lib/indices-data.ts (Arquivo Local)
📡 ATUALIZAÇÃO VIA APIs: SOMENTE para adicionar novos meses
```

---

## Como Funciona

### 1. Durante o Cálculo (Fluxo de Uso)

```
┌─────────────────────────────────┐
│  Usuário Clica em "Calcular"    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Sistema Busca Índices para o Período                   │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Verificar Dados em Cache (opcional) │
│  ❌ Raramente tem dados novos         │
└────────┬─────────────────────────────┘
         │ Se não achar em cache
         ▼
┌──────────────────────────────────────────────────────────┐
│  ✅ USAR: lib/indices-data.ts                           │
│  Este é o arquivo de dados DEFINITIVO                   │
│  Sempre contém dados confiáveis e validados             │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Aplicar Índices no Cálculo         │
│  ✅ Resultado Preciso                │
└──────────────────────────────────────┘
```

### 2. Atualização Mensal (Fluxo de Manutenção)

```
┌─────────────────────────────────────────┐
│  1º a 15º do Mês: Buscar Dados Novos    │
└────────────┬────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Executar: node update-indices.mjs       │
│  Busca dados das APIs:                   │
│  - BACEN (Poupança, INPC, IGP-M)        │
│  - Ipeadata (IGP-M alternativa)         │
│  - IBGE (INPC alternativa)              │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Revisar Dados no Output                 │
│  Validar que estão corretos              │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  ✅ ADICIONAR MANUALMENTE A:             │
│  lib/indices-data.ts                     │
│  (Copiar os novos meses)                 │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Testar: node test-all-indices.mjs       │
│  Validar que dados estão corretos        │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Git Commit                              │
│  git commit -m "Atualizar índices..."    │
└──────────────────────────────────────────┘
```

---

## Arquivos Importantes

### 📁 lib/indices-data.ts
**Tipo:** Arquivo local
**Propósito:** Fonte de verdade para cálculos
**Frequência:** Atualizado mensalmente
**Como:** Adicionar novos meses manualmente
**Uso:** 100% dos cálculos

```typescript
// SEMPRE contém:
// - Dados validados
// - Valores reais (não estimativas)
// - Histórico completo
// - Documentação de origem

export const indicesData = {
  "IGP-M": [ { mes: 1, ano: 2026, valor: 0.42 }, ... ],
  "Poupança": [ { mes: 1, ano: 2026, valor: 0.6707 }, ... ],
  "INPC": [ { mes: 1, ano: 2026, valor: 0.43 }, ... ]
}
```

### 🔧 update-indices.mjs
**Tipo:** Script de atualização
**Propósito:** Buscar dados novos das APIs
**Frequência:** Executar 1-15 do mês
**Como:** `node update-indices.mjs`
**Saída:** Recomendações para adicionar ao arquivo

```bash
# Exemplo de uso:
$ node update-indices.mjs

📥 Buscando Poupança (Série 195)...
   ✅ 73 registros obtidos

📥 Buscando IGP-M via Ipeadata...
   ✅ 438 registros obtidos

📥 Buscando INPC (Série 188)...
   ✅ 74 registros obtidos

# Depois: revisar e adicionar ao lib/indices-data.ts
```

### 🧪 test-all-indices.mjs
**Tipo:** Script de validação
**Propósito:** Validar dados antes de usar
**Frequência:** Sempre que atualizar dados
**Como:** `node test-all-indices.mjs`

```bash
# Resultado esperado:
✅ IGP-M: Todos os valores dentro do intervalo
✅ Poupança: Todos os valores dentro do intervalo
✅ INPC: Todos os valores dentro do intervalo
```

---

## Fluxo Correto de Atualização

### ✅ CORRETO:

1. **Atualizar dados:**
   ```bash
   node update-indices.mjs
   ```

2. **Revisar output**

3. **Adicionar manualmente a lib/indices-data.ts:**
   ```typescript
   // 2026
   { mes: 2, ano: 2026, valor: X.XXXX }, // Poupança do BACEN
   { mes: 2, ano: 2026, valor: X.XX },   // IGP-M da FGV
   ```

4. **Validar:**
   ```bash
   node test-all-indices.mjs
   ```

5. **Commitar:**
   ```bash
   git commit -m "Atualizar índices para Fevereiro/2026"
   ```

6. **Usar no cálculo:**
   - Sistema automaticamente usa dados de `lib/indices-data.ts`
   - Nenhuma configuração necessária

### ❌ INCORRETO:

- ❌ Não usar `lib/indices-data.ts` no cálculo
- ❌ Buscar dados de APIs durante o cálculo
- ❌ Adicionar dados não validados
- ❌ Usar estimativas ou previsões
- ❌ Confiar em cache quando há novos dados

---

## Código do Sistema (Garantindo Uso Correto)

### Na função `obterIndicesAtualizados()`:

```typescript
// lib/indices-data.ts

export async function obterIndicesAtualizados(
  nomeIndice: string,
  startMonth?: number,
  startYear?: number,
  endMonth?: number,
  endYear?: number,
): Promise<IndiceData[]> {
  
  // ✅ PRIORIDADE 1: Dados em cache (opcional, para performance)
  // ⚠️ Apenas se houver dados frescos
  let dadosReais = tentar_buscar_do_cache()
  
  // ✅ PRIORIDADE 2: Dados locais (SEMPRE disponível)
  // 🎯 Esta é a fonte de verdade
  let indicesAUsar = dadosReais.length > 0 
    ? dadosReais 
    : filtrarLocal(nomeIndice, startMonth, startYear, endMonth, endYear)
  
  return indicesAUsar
}
```

---

## Garantias do Sistema

✅ **Durante o Cálculo:**
- Sempre usa `lib/indices-data.ts`
- Nunca faz requisições de API
- Resultado é 100% reproduzível
- Rastreabilidade completa

✅ **Durante a Atualização:**
- APIs usadas SOMENTE para obter novos meses
- Usuário revisa os dados
- Testes validam antes de usar
- Dados adicionados manualmente ao arquivo

✅ **Auditoria:**
- Todos os dados vêm de fonte documentada
- Histórico completo no git
- Possível reprocessar qualquer cálculo histórico

---

## Checklist de Segurança

Antes de cada commit:

- [ ] Dados vêm de fonte oficial?
- [ ] Dados validados com test-all-indices.mjs?
- [ ] Valores estão dentro do intervalo esperado?
- [ ] Arquivo lib/indices-data.ts foi editado?
- [ ] Nenhuma API foi chamada durante o cálculo?
- [ ] Todos os testes passaram?

---

## Contato e Dúvidas

**Princípio:** Use sempre `lib/indices-data.ts` para cálculos
**Atualização:** Script `update-indices.mjs` ajuda a encontrar novos dados
**Validação:** `test-all-indices.mjs` garante qualidade

**Resultado:** 100% precisão nos cálculos ✅
