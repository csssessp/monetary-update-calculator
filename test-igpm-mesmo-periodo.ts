// Teste simples para verificar que todos os ciclos usam o mesmo período IGP-M
import { calcularIndicesPorCicloDeParcelamento } from './lib/calculo-monetario'

const dataAtual = { dia: 23, mes: 1, ano: 2026 }

console.log('═══════════════════════════════════════════════════════════════════════════')
console.log('TESTE: Todos os ciclos devem usar o MESMO período IGP-M')
console.log('═══════════════════════════════════════════════════════════════════════════')
console.log('')
console.log(`Data atual: ${dataAtual.dia}/${dataAtual.mes}/${dataAtual.ano}`)
console.log(`Período IGP-M esperado: 1/2025 a 12/2025 (12 meses ANTES)`)
console.log('')

try {
  const resultado = calcularIndicesPorCicloDeParcelamento(24, dataAtual, 'IGP-M')
  
  console.log('Resultados dos ciclos:')
  console.log('')
  
  resultado.ciclos.forEach((ciclo: any) => {
    console.log(`CICLO ${ciclo.numero}:`)
    console.log(`  Pagamento: ${ciclo.periodoDescricao}`)
    console.log(`  IGP-M:     ${ciclo.periodoIGPMDescricao}`)
    console.log('')
  })
  
  // Verificar se todos têm o mesmo período IGP-M
  const periodoIGPMPrimeiro = resultado.ciclos[0].periodoIGPMDescricao
  const todosIguais = resultado.ciclos.every((c: any) => c.periodoIGPMDescricao === periodoIGPMPrimeiro)
  
  console.log('═══════════════════════════════════════════════════════════════════════════')
  if (todosIguais) {
    console.log(`✅ CORRETO: Todos os ciclos usam o mesmo período IGP-M: ${periodoIGPMPrimeiro}`)
  } else {
    console.log(`❌ ERRO: Ciclos têm períodos IGP-M diferentes!`)
  }
  console.log('═══════════════════════════════════════════════════════════════════════════')
  
} catch (error: unknown) {
  const err = error as Error
  console.error('Erro ao testar:', err.message)
  console.error(err.stack)
}
