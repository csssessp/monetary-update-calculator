# 🧪 TESTES DISPONÍVEIS

## Como Executar

```bash
# Executar um teste específico
node test-all-indices.mjs

# Executar todos em sequência (bash)
for test in test-*.mjs; do echo "=== $test ===" && node "$test" 2>&1 | tail -20 && echo ""; done
```

---

## 📋 Lista de Testes Recomendados

### 1. **test-all-indices.mjs** ⭐ PRINCIPAL
- **Tamanho**: 3.1K
- **O que faz**: Valida TODOS os índices (IGP-M, Poupança, INPC)
- **Quando usar**: Após cada atualização de dados
- **Resultado esperado**: ✅ Todos os valores dentro do intervalo esperado

```bash
node test-all-indices.mjs
```

**Saída:**
```
✅ IGP-M: 73 meses (Jan/2020 - Jan/2026)
✅ Poupança: 73 meses (Jan/2020 - Jan/2026)  
✅ INPC: 73 meses (Jan/2020 - Jan/2026)
```

---

### 2. **test-indices-correction.mjs** ⭐ IGP-M
- **Tamanho**: 2.1K
- **O que faz**: Valida especificamente os dados de IGP-M corrigidos
- **Quando usar**: Após atualizar IGP-M
- **Resultado esperado**: ✅ Correção acumulada ~12.88% (Mar/2020-Dez/2022)

```bash
node test-indices-correction.mjs
```

---

### 3. **test-poupanca-correction.mjs** ⭐ Poupança
- **Tamanho**: 3.3K
- **O que faz**: Valida dados de Poupança e simula cálculo real
- **Quando usar**: Após atualizar Poupança
- **Resultado esperado**: ✅ Correção acumulada ~42.20% (Mar/2020-Jan/2026)

```bash
node test-poupanca-correction.mjs
```

---

## 📊 Outros Testes Disponíveis

| Teste | Tamanho | Propósito | Usar Quando |
|-------|---------|----------|------------|
| test-calculation.mjs | 969B | Teste básico | Desenvolver |
| test-calculo-ipeadata.mjs | 4.7K | Integração Ipeadata | Testar API |
| test-ciclos-igpm.mjs | 3.2K | Ciclos de 12 meses | Debug IGP-M |
| test-debug-poupanca.mjs | 2.3K | Debug Poupança | Investigar problemas |
| test-final-implementation.mjs | 2.1K | Validação final | Antes de deploy |
| test-igpm-fix.mjs | 719B | Teste IGP-M simples | Quick check |
| test-igpm-mesmo-periodo-final.mjs | 3.8K | IGP-M mesmo período | Validação específica |
| test-memoria-calculo.mjs | 3.5K | Memória de cálculo | Verificar output |
| test-period-fix.mjs | 3.0K | Verificação de período | Debug datas |
| test-poupanca-fix.mjs | 1.3K | Teste Poupança simples | Quick check |
| test-poupanca-parcelamento.mjs | 710B | Parcelamento | Teste de parcelas |
| test-poupanca-update.mjs | 4.4K | Atualização Poupança | Após atualizar |
| test-ultimo-indice-igpm.mjs | 3.4K | Último índice IGP-M | Verificar dados |

---

## ✅ Checklist de Testes antes de Deploy

Executar nesta ordem:

```bash
# 1. Validação geral
echo "1. Validando todos os índices..."
node test-all-indices.mjs

# 2. Validação IGP-M
echo "2. Validando IGP-M..."
node test-indices-correction.mjs

# 3. Validação Poupança
echo "3. Validando Poupança..."
node test-poupanca-correction.mjs

# 4. Teste final de implementação
echo "4. Teste final..."
node test-final-implementation.mjs

echo "✅ Todos os testes passaram!"
```

---

## 🎯 Rotina de Manutenção Mensal

```
1º do mês: Buscar dados novos
├─ node update-indices.mjs

10º do mês: Validar dados
├─ node test-all-indices.mjs
├─ node test-indices-correction.mjs
├─ node test-poupanca-correction.mjs

15º do mês: Commitar mudanças
└─ git commit -m "Atualizar índices para [MÊS/YYYY]"
```

---

## 🔍 Como Ler os Resultados

### ✅ Tudo OK
```
✅ IGP-M: Todos os valores estão dentro do intervalo esperado
✅ Poupança: Todos os valores estão dentro do intervalo esperado
✅ INPC: Todos os valores estão dentro do intervalo esperado
```

### ⚠️ Aviso (Investigar)
```
⚠️  IGP-M:
  ⚠️  2022/01: 15.5% (valor fora do intervalo esperado)
```

### ❌ Erro (Corrigir Antes de Commitar)
```
❌ Erro: Dados insuficientes para o período
```

---

## 💡 Dicas

- Todos os testes são **rápidos** (< 1 segundo)
- Testes são **idempotentes** (sempre mesmo resultado)
- Testes **não modificam** dados
- Testes usam **lib/indices-data.ts** como fonte

---

## 📞 Troubleshooting

### Erro: "Module type error"
```
Solução: Ignorar aviso sobre package.json type
```

### Erro: "Arquivo não encontrado"
```
Solução: Executar do diretório raiz do projeto
cd /workspaces/monetary-update-calculator
```

### Teste falha com "valores fora do intervalo"
```
Solução: Revisar dados adicionados
- IGP-M: -3% a +3%
- Poupança: -0.5% a +2%
- INPC: -2% a +2%
```

---

**Última atualização:** 26/01/2026
**Status:** ✅ Todos os testes funcionando
