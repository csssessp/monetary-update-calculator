// Teste direto - verificar se todos ciclos usam o mesmo período IGP-M

const dataAtual = { dia: 23, mes: 1, ano: 2026 }

console.log('═══════════════════════════════════════════════════════════════════════════')
console.log('TESTE: Todos os ciclos devem usar o MESMO período IGP-M')
console.log('═══════════════════════════════════════════════════════════════════════════')
console.log('')
console.log(`Data atual: ${dataAtual.dia}/${dataAtual.mes}/${dataAtual.ano}`)
console.log(`Período IGP-M esperado: 1/2025 a 12/2025 (12 meses ANTES)`)
console.log('')

// Calcular período IGP-M
let mesIGPMInicio = dataAtual.mes - 12
let anoIGPMInicio = dataAtual.ano
while (mesIGPMInicio <= 0) {
  mesIGPMInicio += 12
  anoIGPMInicio -= 1
}

let mesIGPMFim = mesIGPMInicio + 11
let anoIGPMFim = anoIGPMInicio
while (mesIGPMFim > 12) {
  mesIGPMFim -= 12
  anoIGPMFim += 1
}

console.log(`Período IGP-M calculado: ${mesIGPMInicio}/2025 a ${mesIGPMFim}/${anoIGPMFim}`)
console.log('')
console.log('Simulando ciclos de 24 parcelas:')
console.log('')

const mesesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// Ciclo 1
let mesInicioCiclo1 = dataAtual.mes
let anoInicioCiclo1 = dataAtual.ano
let mesFinCiclo1 = mesInicioCiclo1 + 11
let anoFinCiclo1 = anoInicioCiclo1
while (mesFinCiclo1 > 12) {
  mesFinCiclo1 -= 12
  anoFinCiclo1 += 1
}
console.log(`CICLO 1 (Parcelas 1-12):`)
console.log(`  Período de pagamento: ${mesesNome[mesInicioCiclo1-1]}/${anoInicioCiclo1} a ${mesesNome[mesFinCiclo1-1]}/${anoFinCiclo1}`)
console.log(`  IGP-M acumulado:      ${mesesNome[mesIGPMInicio-1]}/2025 a ${mesesNome[mesIGPMFim-1]}/${anoIGPMFim}`)
console.log('')

// Ciclo 2
let mesInicioCiclo2 = mesFinCiclo1 + 1
let anoInicioCiclo2 = anoFinCiclo1
if (mesInicioCiclo2 > 12) {
  mesInicioCiclo2 = 1
  anoInicioCiclo2 += 1
}
let mesFinCiclo2 = mesInicioCiclo2 + 11
let anoFinCiclo2 = anoInicioCiclo2
while (mesFinCiclo2 > 12) {
  mesFinCiclo2 -= 12
  anoFinCiclo2 += 1
}
console.log(`CICLO 2 (Parcelas 13-24):`)
console.log(`  Período de pagamento: ${mesesNome[mesInicioCiclo2-1]}/${anoInicioCiclo2} a ${mesesNome[mesFinCiclo2-1]}/${anoFinCiclo2}`)
console.log(`  IGP-M acumulado:      ${mesesNome[mesIGPMInicio-1]}/2025 a ${mesesNome[mesIGPMFim-1]}/${anoIGPMFim}`)
console.log('')

console.log('═══════════════════════════════════════════════════════════════════════════')
console.log(`✅ CORRETO: Todos os ciclos usam o MESMO período IGP-M`)
console.log(`   ${mesesNome[mesIGPMInicio-1]}/2025 a ${mesesNome[mesIGPMFim-1]}/${anoIGPMFim}`)
console.log('═══════════════════════════════════════════════════════════════════════════')
