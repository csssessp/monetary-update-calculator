/**
 * Teste de cálculo de Poupança com reajuste IGP-M a cada 12 meses
 * 
 * Dados do usuário:
 * - Valor original: R$ 296,557
 * - Data inicial: 10/2/2020
 * - Data final: 22/1/2026
 * - Índice: Poupança
 * - Taxa de juros: 0.05% Mensal (simples)
 */

import { calcularCorrecaoMonetaria, type ParametrosCalculo } from "./lib/calculo-monetario"

async function testPoupancaComReajusteIGPM() {
  console.log("=".repeat(80))
  console.log("TESTE: POUPANÇA COM REAJUSTE IGP-M A CADA 12 MESES")
  console.log("=".repeat(80))
  console.log()

  const parametros: ParametrosCalculo = {
    valorOriginal: 296.557,
    dataInicial: {
      dia: 10,
      mes: 2,
      ano: 2020,
    },
    dataFinal: {
      dia: 22,
      mes: 1,
      ano: 2026,
    },
    indice: "Poupança",
    correcaoProRata: false,
    taxaJuros: 0.05,
    periodicidadeJuros: "Mensal",
    tipoJuros: "simples",
    convencaoDias: "Actual/365",
  }

  console.log("Parâmetros do teste:")
  console.log(JSON.stringify(parametros, null, 2))
  console.log()

  try {
    const resultado = await calcularCorrecaoMonetaria(parametros)

    console.log("=".repeat(80))
    console.log("RESULTADO DO CÁLCULO")
    console.log("=".repeat(80))
    console.log()

    // Exibir memória de cálculo
    resultado.memoriaCalculo.forEach((linha) => {
      console.log(linha)
    })

    console.log()
    console.log("=".repeat(80))
    console.log("RESUMO FINAL")
    console.log("=".repeat(80))
    console.log(`Valor Original: R$ ${resultado.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`Valor Corrigido: R$ ${resultado.valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`Fator de Correção: ${resultado.fatorCorrecao.toFixed(6)}`)
    console.log(`Juros: R$ ${resultado.juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`Multa: R$ ${resultado.multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`Honorários: R$ ${resultado.honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`VALOR TOTAL: R$ ${resultado.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log()

    // Dados esperados do usuário
    console.log("=".repeat(80))
    console.log("DADOS ESPERADOS DO USUÁRIO")
    console.log("=".repeat(80))
    console.log(`Valor corrigido esperado: R$ 418,814`)
    console.log(`Fator de correção esperado: 1.412257`)
    console.log(`Valor total esperado: R$ 433,775`)
    console.log()
    console.log("NOTAS IMPORTANTES:")
    console.log("1. O cálculo do usuário não tinha o reajuste IGP-M a cada 12 meses")
    console.log("2. Agora o sistema APLICA o reajuste IGP-M acumulado a cada 12 meses")
    console.log("3. A tabela de detalhamento deve mostrar indicadores de REAJUSTE CICLO")
    console.log("4. O fator de correção pode ser diferente pois agora inclui o reajuste IGP-M")
    console.log()

  } catch (error) {
    console.error("Erro ao realizar o cálculo:", error)
  }
}

// Executar o teste
testPoupancaComReajusteIGPM()
