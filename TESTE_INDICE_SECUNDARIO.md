# Teste da Funcionalidade: Índice Secundário

## Cenário de Teste Exemplo

### Configuração Inicial

```
Valor original: R$ 10.000,00
Data inicial: 01/01/2023
Data final: 31/12/2024 (24 meses)
Índice principal: IGP-M
Índice secundário: IPCA (a partir da 13ª parcela)
```

### Resultado Esperado na Memória de Cálculo

#### Cabeçalho
```
=== CÁLCULO DE CORREÇÃO MONETÁRIA ===
Valor original: R$ 10.000,00
Data inicial: 01/01/2023
Data final: 31/12/2024
Índice utilizado: IGP-M
Índice secundário: IPCA (a partir da 13ª parcela)
```

#### Detalhamento Mensal (Tabela)
```
=== DETALHAMENTO MENSAL COM MUDANÇA DE ÍNDICE ===

| **Parcela** | **Mês/Ano** | **Índice Utilizado** | **Taxa (%)** | **Fator Mensal** | **Fator Acumulado** | **Valor Acumulado (R$)** |
|---|---|---|---|---|---|---|
| 1ª | Janeiro/2023 | IGP-M | 0,5234 | 1,005234 | 1,005234 | R$ 10.052,34 |
| 2ª | Fevereiro/2023 | IGP-M | 0,6123 | 1,006123 | 1,011481 | R$ 10.114,81 |
| ... | ... | ... | ... | ... | ... | ... |
| 12ª | Dezembro/2023 | IGP-M | 0,4567 | 1,004567 | 1,058234 | R$ 10.582,34 |
| 13ª | Janeiro/2024 | IPCA | 0,3456 | 1,003456 | 1,061956 | R$ 10.619,56 |
| 14ª | Fevereiro/2024 | IPCA | 0,2789 | 1,002789 | 1,064938 | R$ 10.649,38 |
| ... | ... | ... | ... | ... | ... | ... |
| 24ª | Dezembro/2024 | IPCA | 0,3123 | 1,003123 | 1,075432 | R$ 10.754,32 |
```

#### Resumo da Mudança de Índice
```
**Resumo da mudança de índice:**
- Parcelas 1 a 12: IGP-M (12 parcelas)
- Parcelas 13 em diante: IPCA (12 parcelas)
```

#### Total de Meses
```
Total de meses com índices aplicados: 24
```

#### Resumo Final
```
=== RESUMO FINAL ===
Valor original: R$ 10.000,00
Índices utilizados: IGP-M (até parcela 12) e IPCA (a partir da parcela 13)
Valor corrigido: R$ 10.754,32
Fator de correção: 1,075432
VALOR TOTAL: R$ 10.754,32
```

## Casos de Uso Principais

### 1. Dívidas Trabalhistas com Mudança de Índice
- Primeiros 12 meses: IPCA
- A partir do 13º mês: SELIC (índice de juros remuneratórios)

### 2. Créditos com Períodos Diferentes
- Períodos iniciais: Poupança (TLP)
- Períodos posteriores: CDI ou SELIC

### 3. Dívidas Fiscais
- Período de cobrança: IPCA
- Período de execução: SELIC

### 4. Empréstimos Imobiliários
- Período inicial: INPC
- Período posterior: Poupança (aniversário)

## Validações Implementadas

✅ **Índice Secundário Obrigatório**: Se marcada a opção, o índice secundário é validado
✅ **Parcela Válida**: Número da parcela deve ser ≥ 2
✅ **Consistência de Dados**: Se índice secundário não tem dados para um mês, usa primário como fallback
✅ **Formatação Consistente**: Números de parcela sempre com "ª" (1ª, 2ª, ..., 13ª, etc.)

## Compatibilidade

A funcionalidade é totalmente compatível com:

- ✅ Poupança (com aniversários)
- ✅ IGP-M (mensal)
- ✅ IPCA (mensal)
- ✅ INPC (mensal)
- ✅ SELIC (mensal)
- ✅ CDI (mensal)

## Exemplos de Código

### Como Usar Programaticamente

```typescript
const parametros: ParametrosCalculo = {
  valorOriginal: 10000,
  dataInicial: { dia: 1, mes: 1, ano: 2023 },
  dataFinal: { dia: 31, mes: 12, ano: 2024 },
  indice: "IGP-M (FGV) ...... (jun/1989 a atual)",
  correcaoProRata: false,
  usarIndiceSecundario: true,
  indiceSecundario: "IPCA (IBGE) ...... (jan/1980 a atual)",
  parcelaInicioIndiceSecundario: 13,
}

const resultado = await calcularCorrecaoMonetaria(parametros)
console.log(resultado.valorCorrigido)  // R$ 10.754,32
console.log(resultado.memoriaCalculo)  // Array com detalhamento completo
```

## Referências

- Interface: [ParametrosCalculo](./lib/calculo-monetario.ts#L13)
- Função: [calcularCorrecaoMonetaria](./lib/calculo-monetario.ts#L175)
- Componente UI: [page.tsx](./app/page.tsx#L710)
