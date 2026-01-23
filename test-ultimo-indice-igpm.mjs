#!/usr/bin/env node

// Teste para verificar o cálculo com o novo método (último índice IGP-M)

console.log('=== TESTE DO NOVO CÁLCULO IGP-M ===')
console.log('')
console.log('Cenário: Parcelamento com 24 parcelas (2 ciclos de 12 meses)')
console.log('Período: Janeiro/2025 a Dezembro/2025')
console.log('Índice: IGP-M')
console.log('')

// Dados do IGP-M de 2025 (de acordo com indices-data.ts)
const indicesIGPM2025 = [
  { mes: 1, ano: 2025, valor: 0.27 },
  { mes: 2, ano: 2025, valor: 1.06 },
  { mes: 3, ano: 2025, valor: -0.34 },
  { mes: 4, ano: 2025, valor: 0.24 },
  { mes: 5, ano: 2025, valor: -0.49 },
  { mes: 6, ano: 2025, valor: -1.67 },
  { mes: 7, ano: 2025, valor: -0.77 },
  { mes: 8, ano: 2025, valor: 0.36 },
  { mes: 9, ano: 2025, valor: 0.42 },
  { mes: 10, ano: 2025, valor: -0.36 },
  { mes: 11, ano: 2025, valor: 0.27 },
  { mes: 12, ano: 2025, valor: -0.01 },
]

console.log('Dados de 2025:')
console.log(indicesIGPM2025.map(i => `  ${i.mes.toString().padStart(2, '0')}/2025: ${i.valor.toFixed(2)}%`).join('\n'))
console.log('')

// Novo método: pegar apenas o ÚLTIMO índice
const ultimoIndice = indicesIGPM2025[indicesIGPM2025.length - 1]
console.log('MÉTODO NOVO (solicitado pelo usuário):')
console.log(`  Último índice: ${ultimoIndice.mes.toString().padStart(2, '0')}/${ultimoIndice.ano} = ${ultimoIndice.valor.toFixed(4)}%`)
console.log(`  Reajuste aplicado em cada ciclo: ${ultimoIndice.valor.toFixed(4)}%`)
console.log('')

// Antigo método (para comparação)
console.log('MÉTODO ANTIGO (12 meses acumulados - DESCONTINUADO):')
let fatorAcumulado = 1
for (const indice of indicesIGPM2025) {
  const fatorMensal = 1 + indice.valor / 100
  fatorAcumulado *= fatorMensal
}
const acumulado12meses = (fatorAcumulado - 1) * 100
console.log(`  Acumulado de 12 meses: ${acumulado12meses.toFixed(4)}%`)
console.log('')

// Cálculo do parcelamento
console.log('RESULTADO DO PARCELAMENTO COM 24 PARCELAS:')
const valorOriginal = 1000
const numeroParcelas = 24

// Ciclo 1: Usa o ÚLTIMO índice
const fatorReajusteCiclo1 = 1 + ultimoIndice.valor / 100
const valorComReajusteCiclo1 = valorOriginal * fatorReajusteCiclo1

console.log(`  Valor original: R$ ${valorOriginal.toFixed(2)}`)
console.log(`  Ciclo 1 (Parcelas 1-12): Reajuste de ${ultimoIndice.valor.toFixed(4)}%`)
console.log(`    Fator: ${fatorReajusteCiclo1.toFixed(10)}`)
console.log(`    Valor: R$ ${valorComReajusteCiclo1.toFixed(2)}`)
console.log(`    Valor por parcela: R$ ${(valorComReajusteCiclo1 / 12).toFixed(2)}`)
console.log('')

// Ciclo 2: Usa o mesmo ÚLTIMO índice novamente (já que não tem novos dados)
const fatorReajusteCiclo2 = 1 + ultimoIndice.valor / 100
const valorComReajusteCiclo2 = valorComReajusteCiclo1 * fatorReajusteCiclo2

console.log(`  Ciclo 2 (Parcelas 13-24): Reajuste de ${ultimoIndice.valor.toFixed(4)}%`)
console.log(`    Fator: ${fatorReajusteCiclo2.toFixed(10)}`)
console.log(`    Valor: R$ ${valorComReajusteCiclo2.toFixed(2)}`)
console.log(`    Valor por parcela: R$ ${(valorComReajusteCiclo2 / 12).toFixed(2)}`)
console.log('')

console.log('RESUMO:')
console.log(`  Valor original: R$ ${valorOriginal.toFixed(2)}`)
console.log(`  Reajuste total (2 ciclos com ${ultimoIndice.valor.toFixed(4)}% cada): ${(((valorComReajusteCiclo2 / valorOriginal) - 1) * 100).toFixed(4)}%`)
console.log(`  Valor final: R$ ${valorComReajusteCiclo2.toFixed(2)}`)
console.log('')

console.log('✓ Teste concluído')
