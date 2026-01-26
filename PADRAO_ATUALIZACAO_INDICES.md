# 📊 PADRÃO DE ATUALIZAÇÃO DE ÍNDICES

## Objetivo
Manter os dados do arquivo `lib/indices-data.ts` sincronizados com as fontes oficiais para cálculos precisos de correção monetária.

## Índices Disponíveis

| Índice | Fonte Oficial | Série BC | Período Atual | Atualização |
|--------|--------------|----------|--------------|------------|
| **IGP-M** | FGV/BACEN | 189 | Jan/2020 - Jan/2026 | Mensal (1º do mês) |
| **Poupança** | BACEN | 195 | Jan/2020 - Jan/2026 | Mensal (aniversário) |
| **INPC** | IBGE/BACEN | 188 | Jan/2020 - Jan/2026 | Mensal (15º dia) |

## Quando Atualizar

- **Poupança**: No primeiro dia útil de cada mês
- **IGP-M**: No primeiro dia de cada mês (divulgação FGV)
- **INPC**: Até o 15º de cada mês (divulgação IBGE)

## Como Atualizar

### Método 1: Manual (Recomendado para poucos dados)

1. Acesse as fontes oficiais:
   - **BACEN**: https://www.bcb.gov.br/estadisticas/
   - **FGV**: https://portal.fgv.br/noticias
   - **IBGE**: https://www.ibge.gov.br/

2. Copie os dados mensais

3. Adicione ao arquivo `lib/indices-data.ts` na seção correspondente:

```typescript
// 2026
{ mes: 2, ano: 2026, valor: X.XXXX }, // Poupança
{ mes: 2, ano: 2026, valor: X.XX },   // IGP-M
{ mes: 2, ano: 2026, valor: X.XX },   // INPC
```

### Método 2: Automático via API (Em desenvolvimento)

```typescript
// Futuro: script de sincronização automática
async function atualizarIndices() {
  const igpm = await fetchIGPMFromIpeadata();
  const poupanca = await fetchPoupancaFromBCB();
  const inpc = await fetchINPCFromBCB();
  
  // Salvar em lib/indices-data.ts
}
```

## Estrutura de Dados

```typescript
// Todos os índices seguem este padrão:
interface IndiceData {
  mes: number;      // 1-12
  ano: number;      // YYYY
  valor: number;    // Percentual em forma decimal (ex: 0.56 para 0.56%)
}

// Exemplo:
{ mes: 1, ano: 2026, valor: 0.6707 } // Poupança Jan/2026: 0.6707%
```

## Validação de Dados

Antes de commitar, validar:

1. **Formato**: Todos os valores são números decimais?
2. **Intervalo**: Poupança e INPC entre -2% e 2%? IGP-M entre -3% e 3%?
3. **Continuidade**: Não há meses faltando?
4. **Tipo**: Valores em forma decimal (não percentual inteiro)?

```bash
# Executar testes de validação
node test-all-indices.mjs
```

## Histórico de Atualizações

| Data | Índice | Período | Status |
|------|--------|---------|--------|
| 26/01/2026 | IGP-M, Poupança, INPC | 2020-2026 | ✅ Completo |
| 26/01/2026 | Correção de dados | Mar/2020 - Jan/2026 | ✅ Corrigido |
| 26/01/2026 | Adição INPC 2025-2026 | Jan/2026 | ✅ Adicionado |

## Fontes Oficiais

### BACEN - Sistema Gerenciador de Séries Temporais (SGS)
- **URL Base**: https://api.bcb.gov.br/dados/series/
- **Poupança (195)**: https://api.bcb.gov.br/dados/series/195
- **IGP-M (189)**: https://api.bcb.gov.br/dados/series/189
- **INPC (188)**: https://api.bcb.gov.br/dados/series/188

### IBGE - Instituto Brasileiro de Geografia e Estatística
- **URL**: https://www.ibge.gov.br/estatisticas
- **Série INPC**: Publicação mensal

### FGV - Fundação Getúlio Vargas
- **URL**: https://portal.fgv.br/indices
- **IGP-M**: Série de Índices de Preços

### Ipeadata
- **URL**: https://ipeadata.gov.br/
- **IGP-M (IGP12_IGPMG12)**: Série alternativa

## Notas Importantes

⚠️ **Sempre usar dados oficiais** - Não utilizar estimativas ou previsões
⚠️ **Manter histórico** - Nunca deletar dados antigos
⚠️ **Documentar fonte** - Sempre citar de onde vieram os dados
⚠️ **Testar antes de commitar** - Executar testes de validação

## Contato para Dúvidas

Para dúvidas sobre dados específicos:
1. Consultar a fonte oficial
2. Executar test-all-indices.mjs para validação
3. Documentar a origem do dado no comentário do código
