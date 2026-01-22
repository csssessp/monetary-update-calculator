# ❓ FAQ - Perguntas Frequentes sobre Índice Secundário

## Geral

### P: Como funciona a mudança de índice?

**R:** A calculadora permite que você use um índice diferente a partir de uma parcela específica. Por exemplo:
- Parcelas 1-12: IGP-M
- Parcelas 13+: IPCA

Isso é útil quando a legislação ou contrato exige índices diferentes para períodos distintos.

---

### P: Qual é o padrão para a parcela inicial do índice secundário?

**R:** O padrão é a **13ª parcela**. Você pode alterar para qualquer número ≥ 2. A escolha do número 13 é comum porque representa a primeira parcela do segundo ano em períodos mensais.

---

### P: Todos os índices funcionam com índice secundário?

**R:** Sim! A funcionalidade funciona com todos os 6 índices disponíveis:
- ✅ IGP-M
- ✅ IPCA
- ✅ INPC
- ✅ Poupança
- ✅ SELIC
- ✅ CDI

Qualquer combinação de índices é permitida.

---

## Uso

### P: Como ativo a funcionalidade?

**R:** 
1. Preencha os dados básicos (valor, datas, índice primário)
2. Na seção "Índice da Atualização", marque a checkbox:
   - ☑ "Usar índice diferente a partir de determinada parcela"
3. Aparecem dois campos:
   - "A partir da parcela" (número)
   - "Índice secundário" (dropdown)
4. Configure e execute o cálculo

---

### P: O que acontece se eu marcar a checkbox mas não selecionar um índice secundário?

**R:** O sistema não deixará você calcular. Ele exigirá que você selecione um índice secundário válido se a opção estiver ativada.

---

### P: Posso usar o mesmo índice como primário e secundário?

**R:** Tecnicamente sim, mas não faria sentido. O resultado seria idêntico a usar apenas um índice. Recomendamos usar índices diferentes para aproveitar a funcionalidade.

---

## Cálculo

### P: Como o sistema calcula quando faltam dados de um índice?

**R:** Se o índice secundário não tiver dados disponíveis para um mês específico, o sistema usa o índice primário como **fallback automático**. Isso garante que o cálculo sempre completa.

A memória de cálculo registra qual índice foi realmente utilizado em cada mês, então você sempre saberá exatamente o que foi aplicado.

---

### P: A tabela de detalhamento é sempre gerada?

**R:** Sim! Quando você ativa o índice secundário, a tabela é gerada automaticamente mostrando:
- Número da parcela
- Mês e ano
- Índice utilizado
- Taxa do índice
- Fator mensal e acumulado
- Valor acumulado

---

### P: Os cálculos são precisos quando há mudança de índice?

**R:** Totalmente! A precisão é mantida porque:
- ✅ Cada mês é processado individualmente
- ✅ O índice correto é aplicado para cada parcela
- ✅ Os fatores são acumulados corretamente
- ✅ Sem arredondamentos intermediários prejudiciais
- ✅ Auditável na memória de cálculo

---

### P: Como a correção pro-rata funciona com índice secundário?

**R:** A correção pro-rata é aplicada normalmente quando está ativada. Se você usar a Poupança como índice secundário, a pro-rata será aplicada com os dados da Poupança do período relevante.

---

## Memória de Cálculo

### P: Qual é o formato da tabela na memória de cálculo?

**R:** A tabela usa formato Markdown padrão:

```
| **Parcela** | **Mês/Ano** | **Índice Utilizado** | **Taxa (%)** | ... |
| 1ª | Janeiro/2023 | IGP-M | 0,5234 | ... |
| 13ª | Janeiro/2024 | IPCA | 0,3456 | ... |
```

---

### P: Como saber qual índice foi realmente aplicado?

**R:** Existem várias formas de verificar:

1. **Tabela de Detalhamento**: Coluna "Índice Utilizado" mostra explicitamente
2. **Resumo da Mudança**: Resume quantas parcelas usaram cada índice
3. **Resumo Final**: Indica "Índices utilizados: XXX (até parcela Y) e ZZZ (a partir da parcela Z)"

---

### P: Posso exportar a tabela em PDF?

**R:** Sim! Quando você clica em "Gerar PDF", a tabela é incluída com toda a formatação. A memória de cálculo inteira, incluindo a tabela de detalhamento, é exportada.

---

### P: Posso exportar em XLSX (Excel)?

**R:** Sim! A funcionalidade de exportação XLSX também inclui a tabela de detalhamento mensal completa em formato de linhas no Excel.

---

## Casos de Uso

### P: Qual é o melhor cenário para usar essa funcionalidade?

**R:** Ótimo para:
- Dívidas trabalhistas (períodos com índices diferentes)
- Créditos com regras de atualização em fases
- Cálculos judiciais com legislação específica
- Empréstimos imobiliários (com variações contratais)
- Qualquer situação onde há mudança de índice por período

---

### P: Como eu uso isso para uma dívida em 24 parcelas onde:
- Meses 1-12: INPC
- Meses 13-24: SELIC

**R:** 
1. Valor e datas (cobrindo os 24 meses)
2. Índice primário: INPC
3. ☑ Ativar índice secundário
4. Parcela inicial: 13
5. Índice secundário: SELIC
6. Executar!

---

### P: Funciona para deflacionamento?

**R:** Sim! Se você colocar a data final anterior à inicial para deflacionar:
- O cálculo reverso é feito corretamente
- A mudança de índice continua funcionando
- Os índices são aplicados no período inverso

---

## Troubleshooting

### P: A tabela não aparece na memória de cálculo

**Verificar:**
- ☑ A checkbox "Usar índice diferente..." está marcada?
- ☑ Um índice secundário foi selecionado?
- ☑ O cálculo foi executado após as mudanças?

---

### P: Os valores parecem errados

**Verificar:**
- ☑ As datas estão corretas?
- ☑ O índice primário está correto?
- ☑ A parcela de início do índice secundário faz sentido?
- ☑ Há dados disponíveis para ambos os índices no período?

---

### P: O PDF não mostra a tabela

**Solução:**
- Tente novamente clicar em "Gerar PDF"
- Se persistir, tente exportar em XLSX
- Verifique se a memória de cálculo mostra a tabela na tela

---

### P: Não consigo selecionar o índice secundário

**Verificar:**
- ☑ A checkbox foi marcada?
- ☑ Você está aguardando o carregamento do formulário?
- ☑ Tente atualizar a página (F5)

---

## Técnico

### P: Onde está o código dessa funcionalidade?

**R:** As alterações estão em:
- **lib/calculo-monetario.ts**: Lógica de cálculo (linhas ~440-530)
- **app/page.tsx**: Interface (linhas ~710-745)
- Interfaces: **ParametrosCalculo** com campos `usarIndiceSecundario`, `indiceSecundario`, `parcelaInicioIndiceSecundario`

---

### P: Como funciona o fallback de índice?

**R:** 
```typescript
if (usarSecundario) {
  const indiceEncontrado = existeIndiceSecundario(mes, ano)
  if (indiceEncontrado) {
    usa índice secundário ✓
  } else {
    usa índice primário (fallback) ✓
  }
}
```

---

### P: Há erros de tipagem?

**R:** Não! O código foi verificado:
- ✅ Sem erros TypeScript
- ✅ Tipos bem definidos
- ✅ Interfaces corretas

---

### P: Posso modificar o código para meus casos específicos?

**R:** Sim! O código é bem estruturado e documentado. Se você precisar de:
- Mais de 2 índices
- Regras customizadas de mudança
- Formatos diferentes de saída

Você pode estender a funcionalidade. Consulte RESUMO_ALTERACOES.md para entender a estrutura.

---

## Suporte

### P: Não consegui usar a funcionalidade. E agora?

**R:** Verifique:

1. **Documentação**:
   - FUNCIONALIDADE_INDICE_SECUNDARIO.md (como usar)
   - GUIA_TESTE.md (testes passo a passo)
   - VISUALIZACAO_FUNCIONALIDADE.md (diagramas)

2. **Testes**:
   - Siga um dos cenários de teste em TESTE_INDICE_SECUNDARIO.md
   - Compare seu resultado com o esperado

3. **Código**:
   - Verifique o código em lib/calculo-monetario.ts
   - Consulte os comentários nas funções

---

### P: Quero reportar um problema. Onde devo reportar?

**R:** Descreva:
- Valores que você usou
- Índices selecionados
- Data inicial e final
- Qual é o comportamento esperado
- Qual é o comportamento observado
- Screenshot da memória de cálculo

---

## Melhorias Futuras

### P: Posso sugerir melhorias?

**R:** Sim! Algumas ideias para melhorias futuras:
- Suporte a 3+ índices com múltiplas mudanças
- Salvar configurações frequentes
- Comparar múltiplos cenários
- Gráficos visuais da evolução
- Integração com sistemas jurídicos

---

## Resumo Rápido

| Pergunta | Resposta |
|----------|----------|
| Funciona? | ✅ Sim, totalmente |
| Qual padrão? | 13ª parcela |
| Todos os índices? | ✅ Sim, 6 índices |
| Preciso selecionar? | ✅ Sim, primário e secundário |
| Mostra qual índice foi usado? | ✅ Sim, na tabela |
| Exporta? | ✅ PDF e XLSX |
| Tem fallback? | ✅ Usa índice primário se faltar dado |
| Preciso modificar? | ❌ Não, funciona pronto |
| É preciso? | ✅ Sim, totalmente auditável |

---

**Última atualização**: 21 de janeiro de 2026

Para mais detalhes, consulte a documentação específica nos arquivos .md deste projeto.
