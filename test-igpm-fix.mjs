import { calcularCorrecaoMonetaria } from './lib/calculo-monetario.ts'

// Testar o cálculo de IGP-M acumulado para Jan-Dez 2025
try {
  const resultado = await calcularCorrecaoMonetaria({
    valorOriginal: 1000,
    dataInicial: { dia: 15, mes: 1, ano: 2025 },
    dataFinal: { dia: 15, mes: 12, ano: 2025 },
    indice: 'IGP-M',
    correcaoProRata: false,
    numeroParcelas: 24, // 2 ciclos de 12
  })

  console.log('=== TESTE IGP-M ===')
  console.log('Resultado esperado: ~-0.01% (acumulado de Jan-Dez 2025)')
  console.log('')
  console.log('Resultado obtido:')
  console.log(resultado.memoriaCalculo.slice(0, 50).join('\n'))
} catch (error) {
  console.error('Erro:', error.message)
  console.error(error)
}
