# Funcionalidade: Mudança de Índice a Partir de Determinada Parcela

## Descrição

Esta funcionalidade permite que o usuário utilize um índice diferente a partir de uma parcela específica do cálculo de atualização monetária, com demonstração clara na memória de cálculo de qual índice foi utilizado em cada mês.

## Como Usar

### 1. Acessar a Opção no Formulário

1. Preencha os dados básicos do cálculo:
   - Valor a ser atualizado
   - Data inicial e data final
   - Selecione o índice principal

2. Na seção **"Índice da Atualização"**, você encontrará uma checkbox:
   - **"Usar índice diferente a partir de determinada parcela"**

3. Marque essa checkbox para ativar a funcionalidade

### 2. Configurar o Índice Secundário

Após marcar a checkbox, dois campos adicionais aparecerão:

- **"A partir da parcela"**: Digite o número da parcela em que deseja iniciar o uso do índice secundário (padrão: 13)
- **"Índice secundário"**: Selecione qual índice deseja usar a partir dessa parcela

### 3. Executar o Cálculo

Clique em **"Executar o Cálculo"** para processar com a configuração definida.

## Resultado na Memória de Cálculo

### Visualização Detalhada

A memória de cálculo agora apresenta uma **tabela detalhada** mostrando:

| **Parcela** | **Mês/Ano** | **Índice Utilizado** | **Taxa (%)** | **Fator Mensal** | **Fator Acumulado** | **Valor Acumulado (R$)** |
|---|---|---|---|---|---|---|
| 1ª | Jan/2023 | IGP-M | 0,5234 | 1,005234 | 1,005234 | R$ 1.050,23 |
| ... | ... | ... | ... | ... | ... | ... |
| 13ª | Jan/2024 | IPCA | 0,3456 | 1,003456 | 1,051234 | R$ 1.053,87 |

### Resumo da Mudança

No final da seção de índices, aparece um resumo claro:

```
**Resumo da mudança de índice:**
- Parcelas 1 a 12: IGP-M (12 parcelas)
- Parcelas 13 em diante: IPCA (5 parcelas)
```

## Resumo Final

O resumo final do cálculo também inclui informação sobre quais índices foram utilizados:

```
=== RESUMO FINAL ===
Valor original: R$ 1.000,00
Índices utilizados: IGP-M (até parcela 12) e IPCA (a partir da parcela 13)
Valor corrigido: R$ 1.053,87
Fator de correção: 1,053870
...
```

## Exemplo Prático

**Cenário**: Calcular uma dívida de R$ 10.000,00 de 01/01/2023 a 31/12/2024, usando:
- IGP-M para os primeiros 12 meses
- IPCA a partir do 13º mês

**Passos**:
1. Valor: 10.000,00
2. Data inicial: 01/01/2023
3. Data final: 31/12/2024
4. Índice principal: IGP-M
5. ✅ Marque "Usar índice diferente a partir de determinada parcela"
6. Parcela inicial do secundário: 13
7. Índice secundário: IPCA
8. Clique em "Executar o Cálculo"

**Resultado**: O cálculo aplica IGP-M nos meses 1-12 e IPCA a partir do mês 13, com a tabela detalhada mostrando exatamente qual índice foi usado em cada mês.

## Detalhes Técnicos

### Implementação

- **Arquivo principal**: `lib/calculo-monetario.ts`
- **Função**: `calcularCorrecaoMonetaria()`
- **Interface**: `ParametrosCalculo`

### Parâmetros

```typescript
{
  usarIndiceSecundario: boolean        // Ativa a funcionalidade
  indiceSecundario?: string            // Nome do índice secundário
  parcelaInicioIndiceSecundario?: number // Parcela inicial (padrão: 13)
}
```

### Lógica do Cálculo

1. Obtém todos os índices do período principal
2. Obtém todos os índices do período para o índice secundário
3. Para cada mês:
   - Se o número da parcela < parcelaInicio: usa índice primário
   - Se o número da parcela >= parcelaInicio: tenta usar índice secundário
   - Se índice secundário não estiver disponível para o mês: usa índice primário

### Formatação da Tabela

A tabela é gerada em formato Markdown padrão:
- Cada linha mostra os dados de uma parcela/mês
- Parcela número (ex: 1ª, 2ª, ..., 13ª)
- Mês e Ano no formato (ex: Jan/2023)
- Nome do índice utilizado
- Taxa percentual com 4 casas decimais
- Fator mensal acumulado com 6 casas decimais
- Valor acumulado formatado em Real

## Notas Importantes

1. **Disponibilidade de Dados**: O índice secundário deve ter dados disponíveis para o período. Se não tiver dados para um mês específico, o sistema usará o índice primário como fallback.

2. **Compatibilidade**: A funcionalidade funciona com todos os índices disponíveis:
   - IGP-M
   - IPCA
   - INPC
   - Poupança
   - SELIC
   - CDI

3. **Exportação**: A memória de cálculo com a tabela detalhada pode ser exportada em:
   - PDF (com impressão)
   - XLSX (Excel)

4. **Auditoria**: A memória de cálculo fornece rastreamento completo de qual índice foi usado em cada mês, facilitando auditorias e validações judiciais.

## Validação

A funcionalidade valida automaticamente:
- ✅ Se ambos os índices foram selecionados quando ativada
- ✅ Se o número da parcela é válido (≥ 2)
- ✅ Se os índices têm dados para o período informado
