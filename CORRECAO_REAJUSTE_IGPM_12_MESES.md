# Correção: Implementação do Reajuste IGP-M a Cada 12 Meses

## Problema Identificado

O sistema **NÃO estava aplicando o reajuste IGP-M a cada 12 meses** quando utilizava o índice de **Poupança** como base de correção monetária.

### Exemplo do Usuário
- **Valor original**: R$ 296,557
- **Data inicial**: 10/2/2020
- **Data final**: 22/1/2026
- **Índice**: Poupança
- **Problema**: Faltava o reajuste IGP-M acumulado a cada 12 meses

## Solução Implementada

### 1. Modificações no Cálculo de Poupança

A função `aplicarReajusteIGPMACada12Meses` foi **melhorada e agora funciona para Poupança**:

#### Antes (Problema)
```typescript
// Apenas substituía o índice de Poupança pelo reajuste IGP-M
valor: igpmAcumulado  // ❌ Perdia o índice original da Poupança
```

#### Depois (Correto)
```typescript
// Acumula AMBOS os fatores (Poupança + IGP-M)
const fatorIGPMReajuste = 1 + igpmAcumulado / 100
const fatorIndiceOriginal = 1 + indiceAtual.valor / 100
const fatorAcumulado = fatorIGPMReajuste * fatorIndiceOriginal
const percentualAcumulado = (fatorAcumulado - 1) * 100
// ✅ Mantém ambos os componentes
```

### 2. Fórmula de Reajuste IGP-M

A fórmula aplicada a cada 12 meses é:

$$\text{IGP-M acumulado} = \left(1 + \frac{m_1}{100}\right) \times \left(1 + \frac{m_2}{100}\right) \times \cdots \times \left(1 + \frac{m_{12}}{100}\right) - 1$$

Onde:
- $m_1$ até $m_{12}$ = índices mensais do IGP-M em percentual
- Resultado em percentual (multiplicado por 100)

### 3. Tabela de Demonstração Melhorada

A memória de cálculo agora mostra claramente:

```
| **Mês/Ano** | **Taxa (%)** | **Juros do Mês (R$)** | **Taxa Acum. (%)** | **Valor Total (R$)** |
| Mar/2020 | 0,2446% | R$ 0,73 | 0,2446% | R$ 297,28 |
...
| Feb/2021 | 0,7812% | R$ X,XX | Y,YYYY% | R$ Z,ZZ | ← REAJUSTE CICLO 1
```

A anotação `← REAJUSTE CICLO X` indica que naquele mês foi aplicado:
1. O índice da Poupança normalmente
2. **MAIS** o reajuste IGP-M acumulado dos 12 meses anteriores

### 4. Nova Seção de Detalhamento

Uma nova seção `=== DETALHAMENTO DO REAJUSTE IGP-M A CADA 12 MESES ===` foi adicionada para mostrar:

```markdown
**CICLO 1 (Meses 1 a 12):**
Período: Feb/2020 a Jan/2021
Fórmula IGP-M acumulado: (1 + m1) × (1 + m2) × ... × (1 + m12) − 1
Resultado: X.XXXXXX%

**CICLO 2 (Meses 13 a 24):**
Período: Feb/2021 a Jan/2022
...
```

## Como o Reajuste Funciona

### Ciclo 1 (Meses 1-12)
- Aplica os índices mensais normais da Poupança

### Ciclo 2 (Mês 13 em diante)
No mês 13 (primeira aplicação do novo ciclo):
1. **Componente 1**: Índice da Poupança do mês 13 (ex: 0.1159%)
2. **Componente 2**: IGP-M acumulado dos meses 1-12 (ex: 2.3456%)
3. **Fator Total**: (1 + 0.1159%) × (1 + 2.3456%) - 1 = 2.4649%

### Ciclos Subsequentes
- O mesmo padrão se repete a cada 12 meses
- Sempre acumulando o IGP-M dos 12 meses imediatamente anteriores

## Impacto no Cálculo

### Valor Corrigido
Com o reajuste IGP-M aplicado corretamente, o valor final será:
- **Maior** que o anterior (sem reajuste)
- Inclui tanto a correção de Poupança quanto a correção IGP-M

### Exemplo (dados do usuário)
```
Sem reajuste IGP-M:
Valor corrigido: ~R$ 418,814

Com reajuste IGP-M (CORRETO):
Valor corrigido: R$ X,XXX (maior)
```

## Arquivos Modificados

1. **lib/calculo-monetario.ts**
   - ✅ Função `aplicarReajusteIGPMACada12Meses` melhorada
   - ✅ Adicionada lógica para acumular Poupança + IGP-M
   - ✅ Melhorada seção de demonstração da tabela
   - ✅ Adicionada nova seção de detalhamento do reajuste

2. **lib/indices-data.ts**
   - ✅ Interface `IndiceData` expandida com campos:
     - `indiceOriginal?`: índice original antes do reajuste
     - `igpmReajuste?`: valor do reajuste IGP-M

3. **test-poupanca-reajuste-igpm.ts** (novo)
   - Script de teste para validar o funcionamento

## Como Testar

```bash
# Executar o sistema na interface web
npm run dev

# Preencher com os dados do usuário:
# - Valor: 296.557
# - Data inicial: 10/02/2020
# - Data final: 22/01/2026
# - Índice: Poupança
# - Taxa de juros: 0.05% Mensal (simples)

# Observar:
# 1. Indicadores de "REAJUSTE CICLO" na tabela
# 2. Nova seção "DETALHAMENTO DO REAJUSTE IGP-M A CADA 12 MESES"
# 3. Fórmula de cálculo exibida: (1 + m1) × (1 + m2) × ... × (1 + m12) − 1
```

## Validação

- [x] Código compila sem erros
- [x] Função de reajuste implementada
- [x] Demonstração na memória de cálculo adicionada
- [x] Campos de detalhamento adicionados
- [ ] Teste com dados do usuário (executar na interface)
- [ ] Validação de resultado final

## Referências

- **FGV (Fundação Getúlio Vargas)**: https://portalibre.fgv.br
- **Banco Central - IGP-M**: https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/
- **Banco Central - Poupança**: https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/

---

**Status**: ✅ IMPLEMENTADO E PRONTO PARA TESTE

**Data**: 22/01/2026

**Sistema**: Calculadora de Atualização Monetária - CGOF/SP
