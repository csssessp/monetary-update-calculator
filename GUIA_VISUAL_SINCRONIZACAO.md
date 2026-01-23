# 👁️ Guia Visual: Como Funciona a Sincronização de Índices

## O QUE VOCÊ VERÁ NA INTERFACE

### Antes de Clicar em "Executar o Cálculo"
```
┌─────────────────────────────────────────────────┐
│ Valor: 1.000,00                                 │
│ Data Inicial: 01/01/2020                        │
│ Data Final: 31/12/2024                          │
│ Índice: IGP-M                                   │
├─────────────────────────────────────────────────┤
│ [ Executar o Cálculo ]  [ Limpar ]              │
└─────────────────────────────────────────────────┘
```

### Durante o Clique (Etapa 1: Sincronização)
```
┌─────────────────────────────────────────────────┐
│ Valor: 1.000,00                                 │
│ Data Inicial: 01/01/2020                        │
│ Data Final: 31/12/2024                          │
│ Índice: IGP-M                                   │
├─────────────────────────────────────────────────┤
│ 🟡 🔄 Atualizando Índices...                    │ ← ALERT AMARELO
├─────────────────────────────────────────────────┤
│ [🔄 Atualizando...] [Limpar]                    │ ← BOTÃO DESABILITADO
│                      (desabilitado)             │    COM SPINNER
└─────────────────────────────────────────────────┘

Enquanto isso, o sistema está:
  • Conectando ao Banco Central
  • Buscando IGP-M (1989-2026)
  • Buscando IPCA, INPC, Poupança, SELIC, CDI
  • Salvando dados no cache local
```

### Após Sincronização bem-sucedida (Etapa 2: Cálculo)
```
┌─────────────────────────────────────────────────┐
│ ✅ Índices atualizados com sucesso              │ ← ALERT VERDE
├─────────────────────────────────────────────────┤
│ Valor: 1.000,00                                 │
│ Data Inicial: 01/01/2020                        │
│ Data Final: 31/12/2024                          │
│ Índice: IGP-M                                   │
├─────────────────────────────────────────────────┤
│ [ Executar o Cálculo ]  [ Limpar ]              │ ← BOTÃO REABILITADO
└─────────────────────────────────────────────────┘
```

### Resultado Final
```
┌─────────────────────────────────────────────────┐
│ RESULTADO DO CÁLCULO                            │
├─────────────────────────────────────────────────┤
│ Valor Original:        R$ 1.000,00              │
│ Valor Corrigido:       R$ 1.123,45              │
│ Percentual de Correção: 12.35%                  │
│ Fator de Atualização:  1.1235                   │
│ Período:               5 anos                   │
│                                                 │
│ 🔗 Fonte: Banco Central - Atualizado: HOJE     │
└─────────────────────────────────────────────────┘
```

---

## CENÁRIOS DE UTILIZAÇÃO

### ✅ Cenário 1: Tudo Normal (Com Internet)
```
Clique "Executar"
    ↓
🔄 Atualizando... (2-3 segundos)
    ↓
✅ Índices atualizados com sucesso
    ↓
Resultado com dados DO BANCO CENTRAL
```

### ⚠️ Cenário 2: Sem Internet
```
Clique "Executar"
    ↓
🔄 Atualizando... (tenta conectar)
    ↓
❌ Timeout/Erro de conexão
    ↓
⚠️ Alguns índices usarão dados em cache
    ↓
Resultado com dados DO CACHE LOCAL
```

### 📱 Cenário 3: Internet Cai no Meio
```
1º Clique "Executar" (com internet)
    ↓
✅ Sincronizou com sucesso
    ↓
❌ Internet cai

2º Clique "Executar" (sem internet)
    ↓
⚠️ Dados em cache
    ↓
Resultado com dados DO CACHE (que é recente!)
```

---

## INTERPRETANDO AS MENSAGENS

### ✅ Verde - SUCESSO
```
✅ Índices atualizados com sucesso

Significa:
• Todos os índices foram obtidos do Banco Central
• Dados são os MAIS RECENTES possíveis
• Cálculo será 100% confiável
```

### ⚠️ Amarelo - PARCIAL
```
⚠️ Alguns índices usarão dados em cache

Significa:
• Alguns índices não conseguiram conectar
• Usando dados ANTERIORMENTE SALVOS no cache
• Cálculo ainda é confiável (dados recentes)
• Tente novamente assim que tiver internet
```

### 🔄 Cinza - PROCESSANDO
```
🔄 Sincronizando índices com Banco Central...

Significa:
• Sistema está buscando os dados
• Aguarde 2-3 segundos
• Não feche a página
• Não clique em outro lugar
```

---

## FLUXO DETALHADO DO QUE ACONTECE

### Etapa 0: Validação (Instantâneo)
```
Sistema verifica:
✓ Valor é número positivo?
✓ Data inicial preenchida?
✓ Data final preenchida?
✓ Índice foi escolhido?

Se algo estiver faltando:
❌ "Valor deve ser maior que zero"
❌ "Data inicial deve ser preenchida completamente"
❌ "Índice deve ser selecionado"

Se tudo OK → próxima etapa
```

### Etapa 1: Sincronização (2-3 segundos)
```
Sistema busca em PARALELO:

┌─────────────────────────────────┐
│ Banco Central API               │
├─────────────────────────────────┤
│ IGP-M (4 janelas):              │
│  • 1989-1998: ✓                 │
│  • 1999-2008: ✓                 │
│  • 2009-2018: ✓                 │
│  • 2019-2026: ✓                 │
│                                 │
│ IPCA (série 433): ✓             │
│ INPC (série 188): ✓             │
│ Poupança (série 195): ✓         │
│ SELIC (série 11): ✓             │
│ CDI (série 12): ✓               │
└─────────────────────────────────┘

Se TODOS os índices voltaram OK:
  ✅ Sucesso

Se ALGUNS falharam:
  ⚠️ Usa dados do cache
```

### Etapa 2: Cache Local
```
Dados obtidos são salvos em:
localStorage.setItem("indices_IGP-M", ...)
localStorage.setItem("indices_IPCA", ...)
localStorage.setItem("indices_INPC", ...)
localStorage.setItem("indices_Poupança", ...)
localStorage.setItem("indices_timestamp", ...)

Benefício:
• Próxima sincronização pode ser mais rápida
• Se internet cair, usa dados salvos
• Sem necessidade de servidor
```

### Etapa 3: Cálculo (Instantâneo)
```
Sistema executa:

calcularCorrecaoMonetaria({
  valor: 1000,
  dataInicial: { dia: 1, mes: 1, ano: 2020 },
  dataFinal: { dia: 31, mes: 12, ano: 2024 },
  indice: "IGP-M",
  indices: [← AQUI VÊEM OS DADOS SINCRONIZADOS!
    { mes: 1, ano: 1989, valor: 19.68 },
    { mes: 2, ano: 1989, valor: 35.91 },
    ...
    { mes: 12, ano: 2025, valor: -0.01 },
  ]
})

Retorna:
{
  valorOriginal: 1000,
  valorCorrigido: 1123.45,
  fatorCorrecao: 1.12345,
  ...
}
```

### Etapa 4: Exibição (Instantâneo)
```
Resultado mostrado com:
• Valor original
• Valor corrigido
• Percentual de correção
• Período coberto
• Fonte dos dados (Banco Central)
• Timestamp de sincronização
```

---

## CHECKPOINTS DE SUCESSO

✅ **Checkpoint 1: Validação**
- [ ] Valor é preenchido e > 0
- [ ] Datas são preenchidas corretamente
- [ ] Índice é selecionado

✅ **Checkpoint 2: Sincronização**
- [ ] Botão muda para "Atualizando..." com spinner
- [ ] Mensagem aparece durante o processo
- [ ] Após ~2-3 segundos, mensagem muda para ✅ ou ⚠️

✅ **Checkpoint 3: Cálculo**
- [ ] Resultado é exibido
- [ ] Valores estão corretos
- [ ] Fonte mostra "Banco Central"

✅ **Checkpoint 4: Cache**
- [ ] Próximo cálculo é mais rápido
- [ ] Funciona mesmo sem internet (usa cache)

---

## DÚVIDAS FREQUENTES

### P: Por que demora 2-3 segundos?
R: O sistema está buscando dados de várias APIs do Banco Central em paralelo. É normal e esperado.

### P: E se a internet cair?
R: O sistema usa dados salvos em cache. Continua funcionando normalmente.

### P: Os dados são sempre de hoje?
R: Sim! A cada cálculo, o sistema tenta sincronizar com os dados mais recentes do Banco Central.

### P: O que é "dados em cache"?
R: São dados que foram sincronizados anteriormente e salvos no navegador (localStorage). Usados como fallback.

### P: Posso desligar esta sincronização?
R: Não. É automática e garantida para cada cálculo. Assim você sempre tem dados atualizados.

### P: Qual é a precisão dos dados?
R: Dados vêm diretamente do Banco Central do Brasil. São os dados OFICIAIS.

---

## RESUMO

Agora TODA VEZ que você clica em "Executar o Cálculo":

1. ✅ Sistema valida seu formulário
2. 🔄 Sistema sincroniza com Banco Central
3. 💾 Sistema salva em cache para offline
4. 🧮 Sistema calcula com dados atualizados
5. 📊 Sistema mostra resultado com dados GARANTIDAMENTE ATUALIZADOS

**Você sempre tem os dados mais recentes oficiais!**
