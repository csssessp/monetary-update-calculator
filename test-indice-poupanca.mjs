#!/usr/bin/env node

/**
 * Teste: Verificar dados de Poupança para março 2020
 */

import fs from 'fs'

// Ler o arquivo de índices
const fileContent = fs.readFileSync('./lib/indices-data.ts', 'utf-8')

// Procurar por "Poupança:" e extrair o array
const poupancaMatch = fileContent.match(/Poupança:\s*\[([\s\S]*?)\],\s*}/)

if (!poupancaMatch) {
  console.log('❌ Não consegui encontrar a seção Poupança')
  process.exit(1)
}

const poupancaArray = poupancaMatch[1]

// Contar quantas vezes '0.5' aparece (não 0.25, 0.35, 0.65, etc)
const linhasComZeroMeio = (poupancaArray.match(/valor: 0\.5[,\s]/g) || []).length
const linhasTotal = (poupancaArray.match(/{ mes:/g) || []).length

console.log(`📊 Dados de Poupança no arquivo:`)
console.log(`   Total de linhas: ${linhasTotal}`)
console.log(`   Linhas com valor: 0.5: ${linhasComZeroMeio}`)
console.log()

// Procurar especificamente por março 2020
const marco2020Match = poupancaArray.match(/\{ mes: 3, ano: 2020, valor: ([\d.]+) \}/)
if (marco2020Match) {
  console.log(`✅ Poupança Março/2020: ${marco2020Match[1]}`)
} else {
  console.log(`❌ Não encontrei Poupança Março/2020`)
}

// Procurar por fevereiro 2020
const fev2020Match = poupancaArray.match(/\{ mes: 2, ano: 2020, valor: ([\d.]+) \}/)
if (fev2020Match) {
  console.log(`✅ Poupança Fevereiro/2020: ${fev2020Match[1]}`)
} else {
  console.log(`❌ Não encontrei Poupança Fevereiro/2020`)
}

// Verificar se há alguma seção "mal formatada" com 0.5 repetido
const malFormatadas = (poupancaArray.match(/valor: 0\.5 \},\s+\{ mes:.*valor: 0\.5 \},/g) || []).length
if (malFormatadas > 0) {
  console.log(`\n⚠️  ENCONTREI sequências com 0.5 repetido: ${malFormatadas}`)
}
