#!/usr/bin/env node
import { calcularValorComParcelamento } from './lib/calculo-monetario.ts'

console.log('═══════════════════════════════════════════════════════════════════════════')
console.log('TESTE: Todos os ciclos devem usar o MESMO período IGP-M')
console.log('═══════════════════════════════════════════════════════════════════════════')
console.log('')

const parametros = {
  valorOriginal: 100000,
  numeroParcelas: 24,
  nomeIndice: 'IGP-M',
  dataParcelamento: {
    dia: 23,
    mes: 1,
    ano: 2026
  }
}

console.log(`Data de contratação: ${parametros.dataParcelamento.dia}/${parametros.dataParcelamento.mes}/${parametros.dataParcelamento.ano}`)
console.log(`Período IGP-M de referência: 1/2025 a 12/2025 (12 meses ANTES)`)
console.log('')
console.log('Ciclo 1 (1-12 parcelas): Pagamento 1/2026-12/2026 → IGP-M 1/2025-12/2025 ✓')
console.log('Ciclo 2 (13-24 parcelas): Pagamento 1/2027-12/2027 → IGP-M 1/2025-12/2025 ✓ (MESMO)')
console.log('')
console.log('═══════════════════════════════════════════════════════════════════════════')

try {
  const resultado = await calcularValorComParcelamento(parametros)
  
  const memoria = resultado.memoriaCalculo.join('\n')
  
  // Extrai os períodos IGP-M
  const linhas = memoria.split('\n')
  const ciclosIGPM: { [ciclo: number]: string } = {}
  
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    if (linha.includes('CICLO') && linha.includes('(Parcelas')) {
      const cicloMatch = linha.match(/CICLO (\d+)/)
      if (cicloMatch) {
        const cicloNum = cicloMatch[1]
        // Procura a próxima linha com "Período para cálculo IGP-M"
        for (let j = i; j < Math.min(i + 5, linhas.length); j++) {
          if (linhas[j].includes('Período para cálculo IGP-M acumulado')) {
            const periodoMatch = linhas[j].match(/:\s*(.*)/)
            if (periodoMatch) {
              ciclosIGPM[cicloNum] = periodoMatch[1].trim()
            }
            break
          }
        }
      }
    }
  }
  
  console.log('Períodos IGP-M encontrados:')
  console.log('')
  Object.entries(ciclosIGPM).forEach(([ciclo, periodo]) => {
    console.log(`CICLO ${ciclo}: ${periodo}`)
  })
  
  // Verifica se todos são iguais
  const periodos = Object.values(ciclosIGPM)
  const periodoIGPM = periodos[0]
  const todosIguais = periodos.every(p => p === periodoIGPM)
  
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════════════════')
  if (todosIguais) {
    console.log(`✅ CORRETO: Todos os ciclos usam o MESMO período IGP-M`)
    console.log(`   Período: ${periodoIGPM}`)
  } else {
    console.log(`❌ ERRO: Os ciclos têm períodos IGP-M diferentes!`)
    console.log('   Períodos encontrados:')
    periodos.forEach((p, idx) => console.log(`     - ${p}`))
  }
  console.log('═══════════════════════════════════════════════════════════════════════════')
  
} catch (error: unknown) {
  const err = error as Error
  console.error('Erro:', err.message)
  console.error(err.stack)
}
