import { calcularCorrecaoMonetaria, type ParametrosCalculo } from "./lib/calculo-monetario"

async function testarIGPMCiclos() {
  console.log("🧪 TESTE DO REAJUSTE IGP-M A CADA 12 MESES")
  console.log("=".repeat(60))
  console.log("")

  const parametros: ParametrosCalculo = {
    valorOriginal: 100000,
    dataInicial: { dia: 1, mes: 1, ano: 2022 },
    dataFinal: { dia: 31, mes: 12, ano: 2023 }, // 24 meses para testar 2 ciclos
    indice: "IGP-M",
    correcaoProRata: false,
    aplicarCiclosParcelasIGPM: true, // ATIVAR CICLOS
  }

  try {
    const resultado = await calcularCorrecaoMonetaria(parametros)

    console.log("📊 RESULTADO DO CÁLCULO:")
    console.log("")
    console.log(`Valor Original: R$ ${resultado.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`Valor Corrigido: R$ ${resultado.valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    console.log(`Fator de Correção: ${resultado.fatorCorrecao}`)
    console.log(`Período: ${resultado.periodoCorrecao.meses} meses e ${resultado.periodoCorrecao.dias} dias`)
    console.log("")

    console.log("📝 MEMÓRIA DE CÁLCULO:")
    console.log("-".repeat(60))
    resultado.memoriaCalculo.forEach((linha) => {
      console.log(linha)
    })
    console.log("-".repeat(60))

    console.log("")
    console.log("✅ TESTE CONCLUÍDO")
  } catch (error) {
    console.error("❌ ERRO:", error)
  }
}

testarIGPMCiclos()
