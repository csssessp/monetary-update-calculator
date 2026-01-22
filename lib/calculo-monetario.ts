// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO DE CÁLCULO MONETÁRIO - FÓRMULAS OFICIAIS
// ═══════════════════════════════════════════════════════════════════════════════
//
// IMPLEMENTAÇÃO DAS 4 FÓRMULAS ESSENCIAIS:
//
// FÓRMULA 1: Correção mensal pela poupança (aplicada todo mês)
//   Valor_mês = Valor_anterior × (1 + p_m)
//   Onde: p_m = taxa mensal da poupança em forma decimal
//
// FÓRMULA 2: Reajuste anual pelo IGP-M (a cada 12 meses completos)
//   IGP-M_acumulado = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1
//   Onde: m1...m12 = índices mensais em forma decimal
//
// FÓRMULA 3: Consolidada (mês com aniversário de 12 meses)
//   Valor_mês = Valor_anterior × (1 + p_m) × (1 + igpm_12)
//   Onde: igpm_12 = IGP-M acumulado dos 12 meses anteriores
//
// FÓRMULA 4: Geral após N meses
//   Valor_final = Valor_inicial × ∏(1 + p_m) × ∏(1 + igpm_12)
//   Onde: Primeiro produtório = todos os meses
//         Segundo produtório = somente ciclos anuais completos
//
// ═════════════════════════════════════════════════════════════════════════════
// OBSERVAÇÕES TÉCNICAS ESSENCIAIS:
// ═════════════════════════════════════════════════════════════════════════════
// ✓ IGP-M NÃO entra mensalmente, apenas uma vez por ciclo de 12 meses
// ✓ Nunca somar percentuais (sempre multiplicar fatores: 1 + taxa/100)
// ✓ IGP-M nunca deve ser distribuído mês a mês
// ✓ Aplicar IGP-M uma única vez por ciclo, nos meses 12, 24, 36...
// ✓ Sempre multiplicar fatores, nunca somar
// ═══════════════════════════════════════════════════════════════════════════════

import { obterIndicesAtualizados, getIndiceNome, type IndiceData } from "./indices-data"

export interface DataCalculo {
  dia: number
  mes: number
  ano: number
}

export interface ParametrosCalculo {
  valorOriginal: number
  dataInicial: DataCalculo
  dataFinal: DataCalculo
  indice: string
  correcaoProRata: boolean
  taxaJuros?: number // em %
  periodicidadeJuros?: string // "Mensal" | "Anual" | "Diário" | "Trimestral" | "Semestral"
  tipoJuros?: string // "simples" | "composto"
  dataInicialJuros?: Date
  dataFinalJuros?: Date
  percentualMulta?: number
  percentualHonorarios?: number
  multaSobreJuros?: boolean
  convencaoDias?: "Actual/365" | "Actual/365.2425"
}

export interface DetalheLinha {
  mes: number
  ano: number
  pendente: boolean
  percentual?: number // em %
  fatorMensal?: number
  fatorAcumulado: number
  valorAcumulado: number
  taxaJurosMensal?: number // Taxa de juros aplicada no mês (%)
  valorJurosMensal?: number // Valor dos juros no mês
  taxaAcumuladaJuros?: number // Taxa de juros acumulada até o mês
  valorTotalComJuros?: number // Valor total com juros até o mês
}

export interface ResultadoCalculo {
  valorOriginal: number
  valorCorrigido: number
  fatorCorrecao: number
  juros: number
  multa: number
  honorarios: number
  valorTotal: number
  memoriaCalculo: string[]
  periodoCorrecao: {
    meses: number
    dias: number
  }
  diasTotais?: number
  anosExatos?: number
  taxaAnual?: number // decimal
  tipoTaxaAnual?: "simples" | "efetiva"
  convencaoDia?: "Actual/365" | "Actual/365.2425"
  // Transparência
  detalhamentoIGPM?: DetalheLinha[]
  detalhamentoPoupanca?: DetalheLinha[]
  fontes?: string[]
}

// Função para calcular diferença em meses e dias
export function calcularDiferencaData(
  dataInicial: DataCalculo,
  dataFinal: DataCalculo,
): { meses: number; dias: number } {
  const inicio = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
  const fim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

  let anos = fim.getFullYear() - inicio.getFullYear()
  let meses = fim.getMonth() - inicio.getMonth()
  let dias = fim.getDate() - inicio.getDate()

  if (dias < 0) {
    meses--
    const ultimoDiaMesAnterior = new Date(fim.getFullYear(), fim.getMonth(), 0).getDate()
    dias += ultimoDiaMesAnterior
  }

  if (meses < 0) {
    anos--
    meses += 12
  }

  const totalMeses = anos * 12 + meses

  return { meses: totalMeses, dias }
}

function diasExatosEntre(inicio: Date, fim: Date): number {
  const msPorDia = 24 * 60 * 60 * 1000
  const inicioUTC = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const fimUTC = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate())
  return Math.max(0, Math.round((fimUTC - inicioUTC) / msPorDia))
}

// ═══════════════════════════════════════════════════════════════════════════════
// FÓRMULA 2: Reajuste anual pelo IGP-M (a cada 12 meses completos)
// ═══════════════════════════════════════════════════════════════════════════════
// IGP-M acumulado = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1
// 
// Onde:
//   m1...m12 = índices mensais do IGP-M em forma decimal (ex: 0.85% = 0.0085)
//   Resultado em percentual (multiplicar por 100)
//
// Aplicação: Uma única vez por ciclo de 12 meses, nunca distribuído mensalmente
// ═══════════════════════════════════════════════════════════════════════════════
function calcularIGPMAcumulado12Meses(indices: IndiceData[]): { valor: number; detalhes: IndiceData[] } {
  if (indices.length === 0) return { valor: 0, detalhes: [] }
  
  // Usar exatamente os 12 meses passados (não fazer slice adicional)
  const mesesUsados = indices.length >= 12 ? indices.slice(-12) : indices
  
  let fatorAcumulado = 1
  for (const indice of mesesUsados) {
    const fatorMensal = 1 + indice.valor / 100
    fatorAcumulado *= fatorMensal
  }
  
  // Resultado em percentual
  const igpmAcumuladoPercentual = (fatorAcumulado - 1) * 100
  
  return {
    valor: igpmAcumuladoPercentual,
    detalhes: mesesUsados
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FÓRMULA 1: Correção mensal pela poupança (aplicada todo mês, de forma composta)
// ═══════════════════════════════════════════════════════════════════════════════
// Valor_mês = Valor_anterior × (1 + p_m)
//
// Onde:
//   p_m = taxa mensal da poupança do mês (em forma decimal)
//   Resultado = novo valor com a poupança aplicada
//
// IMPORTANTE: Aplicada em TODOS os meses, sem exceção
// ═══════════════════════════════════════════════════════════════════════════════
function aplicarCicloParcelasIGPM(
  indices: IndiceData[],
): IndiceData[] {
  if (indices.length <= 12) {
    return indices // Se houver 12 ou menos parcelas, retornar sem modificação
  }

  const resultado: IndiceData[] = []

  // Processar em ciclos de 12 meses
  let cicloInicio = 0
  
  while (cicloInicio < indices.length) {
    const cicloFim = Math.min(cicloInicio + 12, indices.length)
    const cicloMeses = indices.slice(cicloInicio, cicloFim)
    
    // Se for o primeiro ciclo, aplicar normalmente os índices
    if (cicloInicio === 0) {
      resultado.push(...cicloMeses)
    } else {
      // Para ciclos subsequentes, aplicar o IGP-M acumulado dos 12 meses anteriores
      // Este reajuste é aplicado no primeiro mês do novo ciclo
      const indicesCicloAnterior = indices.slice(cicloInicio - 12, cicloInicio)
      const igpmInfo = calcularIGPMAcumulado12Meses(indicesCicloAnterior)
      const igpmAcumulado = igpmInfo.valor
      
      // Primeiro mês do ciclo recebe o reajuste acumulado com marcação especial
      resultado.push({
        mes: cicloMeses[0].mes,
        ano: cicloMeses[0].ano,
        valor: igpmAcumulado,
      })
      
      // Meses seguintes do ciclo (2 a 12) mantêm valor fixo (0 = sem variação)
      for (let i = 1; i < cicloMeses.length; i++) {
        resultado.push({
          mes: cicloMeses[i].mes,
          ano: cicloMeses[i].ano,
          valor: 0, // Sem variação - valor fixo durante o ciclo
        })
      }
    }
    
    cicloInicio = cicloFim
  }

  return resultado
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGRAS DE CÁLCULO MENSAIS - 4 FÓRMULAS ESSENCIAIS
// ═══════════════════════════════════════════════════════════════════════════════
//
// REGRA 2: Cálculo correto mês a mês (REGRA GERAL)
// ─────────────────────────────────────────────────────────────────────────────
// 2.1. MESES COMUNS (sem aniversário anual):
//      Aplica-se somente a poupança do mês
//      Valor_mês = Valor_anterior × (1 + p_m)
//
//      Onde: p_m = taxa mensal da poupança (decimal)
//      
//      Exemplo:
//      Valor_mês = 296.556,65 × (1 + 0,001159)
//      Valor_mês = 296.900,36
//
// ─────────────────────────────────────────────────────────────────────────────
// REGRA 3: Cálculo correto no mês de aniversário de 12 meses
// ─────────────────────────────────────────────────────────────────────────────
// No mês em que se completam 12 meses, a aplicação é em duas ETAPAS:
//
// Etapa 1 — Correção mensal pela poupança:
//   Valor_corrigido = Valor_anterior × (1 + p_m)
//
// Etapa 2 — Reajuste anual pelo IGP-M acumulado:
//   Valor_mês = Valor_corrigido × (1 + igpm_12)
//
// Onde: igpm_12 = IGP-M acumulado dos 12 meses anteriores (decimal)
//
// ─────────────────────────────────────────────────────────────────────────────
// REGRA 4: Fórmula consolidada do mês com reajuste anual
// ─────────────────────────────────────────────────────────────────────────────
// Para uso direto em sistema ou planilha:
//
// Valor_mês = Valor_anterior × (1 + p_m) × (1 + igpm_12)
//
// CRÍTICO: O IGP-M entra uma única vez
//   ✗ Nunca deve aparecer como "taxa do mês"
//   ✗ Nunca deve gerar "juros do mês"
//   ✗ Multiplicação de FATORES, não soma de percentuais
//   ✗ Aplicado apenas nos meses: 12, 24, 36, 48...
//
// ═══════════════════════════════════════════════════════════════════════════════
function aplicarReajusteIGPMACada12Meses(
  indicesEscolhidos: IndiceData[],
  indicesIGPM: IndiceData[],
): IndiceData[] {
  const resultado: IndiceData[] = []

  if (indicesEscolhidos.length === 0) return resultado

  // ───────────────────────────────────────────────────────────────────────────
  // PSEUDOCÓDIGO OBRIGATÓRIO (implementado abaixo linha por linha):
  // ───────────────────────────────────────────────────────────────────────────
  // valor = valor_original
  // contador_meses = 0
  // 
  // para cada mês no período:
  //     contador_meses += 1
  //     valor = valor × (1 + poupanca_mensal)  ← FÓRMULA 1
  //     
  //     se contador_meses % 12 == 0:           ← Verificar aniversário exato
  //         igpm_acumulado = (1+m1)×(1+m2)×...×(1+m12) − 1  ← FÓRMULA 2
  //         valor = valor × (1 + igpm_acumulado)  ← FÓRMULA 3
  // ───────────────────────────────────────────────────────────────────────────
  
  // Seguir exatamente o pseudocódigo
  for (let i = 0; i < indicesEscolhidos.length; i++) {
    const indiceAtual = indicesEscolhidos[i]
    const contador_meses = i + 1 // contador começa em 1 (não em 0)

    // Sempre aplicar Poupança mensal
    const indicePoupanca = indiceAtual

    // ┌─────────────────────────────────────────────────────────────────┐
    // │ VERIFICAÇÃO: É mês múltiplo de 12 (aniversário)?              │
    // └─────────────────────────────────────────────────────────────────┘
    // Verificar se é mês múltiplo de 12 (exatamente nos meses 12, 24, 36...)
    if (contador_meses % 12 === 0) {
      // ┌─────────────────────────────────────────────────────────────────┐
      // │ REGRA 3 + REGRA 4: MÊS DE ANIVERSÁRIO (12, 24, 36...)         │
      // │                                                               │
      // │ ETAPA 1: Correção mensal pela poupança                       │
      // │   Valor_corrigido = Valor_anterior × (1 + p_m)              │
      // │                                                               │
      // │ ETAPA 2: Reajuste anual pelo IGP-M acumulado                 │
      // │   Valor_mês = Valor_corrigido × (1 + igpm_12)               │
      // │                                                               │
      // │ FÓRMULA CONSOLIDADA (Regra 4):                                │
      // │   Valor_mês = Valor_anterior × (1 + p_m) × (1 + igpm_12)    │
      // │                                                               │
      // │ CRÍTICO: Multiplicação de FATORES (NUNCA soma de percentuais) │
      // └─────────────────────────────────────────────────────────────────┘
      
      // Buscar os 12 meses DE IGP-M IMEDIATAMENTE ANTERIORES
      const inicioIGPM = i - 11 // 12 meses antes (0-based)

      // Coletar os índices de IGP-M deste ciclo
      const igpmDoCiclo: IndiceData[] = []

      for (let j = 0; j < 12; j++) {
        const indiceDoMesAnterior = indicesEscolhidos[inicioIGPM + j]
        if (indiceDoMesAnterior) {
          // Buscar o IGP-M correspondente a este mês
          const igpmCorrespondenteEncontrado = indicesIGPM.find(
            (idx) => idx.mes === indiceDoMesAnterior.mes && idx.ano === indiceDoMesAnterior.ano
          )
          if (igpmCorrespondenteEncontrado) {
            igpmDoCiclo.push(igpmCorrespondenteEncontrado)
          }
        }
      }

      // Calcular IGP-M acumulado apenas se temos 12 meses completos
      if (igpmDoCiclo.length === 12) {
        const igpmInfo = calcularIGPMAcumulado12Meses(igpmDoCiclo)
        const igpmAcumulado = igpmInfo.valor

        // FÓRMULA 3: Fator = (1 + Poupança) × (1 + IGP-M acumulado)
        // Multiplicação de fatores (NUNCA soma de percentuais)
        const fatorPoupanca = 1 + indicePoupanca.valor / 100
        const fatorIGPM = 1 + igpmAcumulado / 100
        const fatorTotal = fatorPoupanca * fatorIGPM

        // Converter fator de volta para percentual
        const percentualTotal = (fatorTotal - 1) * 100

        resultado.push({
          mes: indiceAtual.mes,
          ano: indiceAtual.ano,
          valor: percentualTotal,
          isReajusteIGPM: true,
          indiceOriginal: indicePoupanca.valor,
          igpmReajuste: igpmAcumulado,
        })
      } else {
        // Ciclo incompleto: aplicar apenas Poupança (sem IGP-M)
        resultado.push(indicePoupanca)
      }
    } else {
      // ┌─────────────────────────────────────────────────────────────────┐
      // │ REGRA 2: MESES COMUNS (sem aniversário anual)                 │
      // │ Meses: 1-11, 13-23, 25-35, etc.                              │
      // │                                                               │
      // │ Aplica-se somente a poupança do mês:                         │
      // │ Valor_mês = Valor_anterior × (1 + p_m)                      │
      // │                                                               │
      // │ Onde: p_m = taxa mensal da poupança (decimal)               │
      // │                                                               │
      // │ Exemplo:                                                      │
      // │ Valor_mês = 296.556,65 × (1 + 0,001159)                     │
      // │ Valor_mês = 296.900,36                                       │
      // │                                                               │
      // │ IMPORTANTE: IGP-M NÃO entra mensalmente                       │
      // │ Ele entra uma única vez por ciclo de 12 meses                │
      // └─────────────────────────────────────────────────────────────────┘
      resultado.push(indicePoupanca)
    }
  }

  return resultado
}

function obterTaxaAnual(
  taxaInformadaPercent: number,
  periodicidade: string | undefined,
  tipoJuros: "simples" | "composto" | undefined,
): { taxaAnual: number; tipoTaxaAnual: "simples" | "efetiva" } {
  const r = (taxaInformadaPercent ?? 0) / 100
  const tipo = (tipoJuros === "simples" ? "simples" : "composto") as "simples" | "composto"
  const per = periodicidade || "Mensal"

  const periodosPorAnoMap: Record<string, number> = {
    Mensal: 12,
    Anual: 1,
    Diário: 365,
    Trimestral: 4,
    Semestral: 2,
  }
  const n = periodosPorAnoMap[per] ?? 12

  if (per === "Anual") {
    return {
      taxaAnual: r,
      tipoTaxaAnual: tipo === "simples" ? "simples" : "efetiva",
    }
  }

  if (per === "Mensal") {
    if (tipo === "simples") {
      return { taxaAnual: r * 12, tipoTaxaAnual: "simples" }
    } else {
      return { taxaAnual: Math.pow(1 + r, 12) - 1, tipoTaxaAnual: "efetiva" }
    }
  }

  if (tipo === "simples") {
    return { taxaAnual: r * n, tipoTaxaAnual: "simples" }
  } else {
    return { taxaAnual: Math.pow(1 + r, n) - 1, tipoTaxaAnual: "efetiva" }
  }
}

// Obter índices do período – regra especial para poupança (aniversários)
export async function obterIndicesPeriodo(
  dataInicial: DataCalculo,
  dataFinal: DataCalculo,
  nomeIndice: string,
): Promise<IndiceData[]> {
  const indices = await obterIndicesAtualizados(
    nomeIndice,
    dataInicial.mes,
    dataInicial.ano,
    dataFinal.mes,
    dataFinal.ano,
  )

  const indicesPeriodo: IndiceData[] = []
  const nomeCurtoIndice = getIndiceNome(nomeIndice)

  if (nomeCurtoIndice === "Poupança") {
    let dataAtual = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
    const dataFim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

    while (dataAtual < dataFim) {
      const proximoAniversario = new Date(dataAtual)
      proximoAniversario.setMonth(proximoAniversario.getMonth() + 1)

      if (proximoAniversario <= dataFim) {
        const mesIndice = proximoAniversario.getMonth() + 1
        const anoIndice = proximoAniversario.getFullYear()
        const indiceDoMes = indices.find((i) => i.mes === mesIndice && i.ano === anoIndice)
        if (indiceDoMes) indicesPeriodo.push(indiceDoMes)
      }
      dataAtual = proximoAniversario
    }
  } else {
    let mesAtual = dataInicial.dia === 1 ? dataInicial.mes : dataInicial.mes + 1
    let anoAtual = dataInicial.ano
    if (mesAtual > 12) {
      mesAtual = 1
      anoAtual++
    }

    while (anoAtual < dataFinal.ano || (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)) {
      const indiceDoMes = indices.find((i) => i.mes === mesAtual && i.ano === anoAtual)
      if (indiceDoMes) indicesPeriodo.push(indiceDoMes)
      mesAtual++
      if (mesAtual > 12) {
        mesAtual = 1
        anoAtual++
      }
    }
  }

  return indicesPeriodo
}

// Cálculo principal
export async function calcularCorrecaoMonetaria(parametros: ParametrosCalculo): Promise<ResultadoCalculo> {
  const memoriaCalculo: string[] = []
  const nomeIndice = getIndiceNome(parametros.indice)

  // REGRA OBRIGATÓRIA: Valor das parcelas permanece fixo durante cada ciclo de 12 parcelas
  // e é reajustado exclusivamente pelo IGP-M/FGV somente ao final de cada período de 12 parcelas
  const aplicarCiclosParcelasIGPM = true // Ativar regra de 12 parcelas

  memoriaCalculo.push(`=== CÁLCULO DE CORREÇÃO MONETÁRIA ===`)
  memoriaCalculo.push(
    `Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  )
  memoriaCalculo.push(
    `Data inicial: ${parametros.dataInicial.dia}/${parametros.dataInicial.mes}/${parametros.dataInicial.ano}`,
  )
  memoriaCalculo.push(`Data final: ${parametros.dataFinal.dia}/${parametros.dataFinal.mes}/${parametros.dataFinal.ano}`)
  memoriaCalculo.push(`Índice utilizado: ${nomeIndice}`)

  if (parametros.taxaJuros !== undefined) {
    memoriaCalculo.push(
      `Taxa de juros informada pelo usuário: ${parametros.taxaJuros}% ${parametros.periodicidadeJuros || "Mensal"} (${parametros.tipoJuros || "simples"})`,
    )

    const periodicidade = parametros.periodicidadeJuros || "Mensal"
    const tipoJuros = parametros.tipoJuros || "simples"

    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== PROCESSAMENTO DA TAXA INFORMADA ===`)
    memoriaCalculo.push(`Taxa digitada pelo usuário: ${parametros.taxaJuros}% ${periodicidade}`)
    memoriaCalculo.push(`Tipo de juros selecionado: ${tipoJuros}`)

    // Show how the rate will be converted for calculation
    const conv = obterTaxaAnual(parametros.taxaJuros, periodicidade, tipoJuros as any)

    if (periodicidade === "Anual") {
      memoriaCalculo.push(`A taxa será aplicada diretamente como taxa anual: ${parametros.taxaJuros}%`)
    } else if (periodicidade === "Mensal") {
      if (tipoJuros === "simples") {
        memoriaCalculo.push(
          `Conversão para taxa anual simples: ${parametros.taxaJuros}% × 12 = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      } else {
        memoriaCalculo.push(
          `Conversão para taxa anual efetiva: (1 + ${parametros.taxaJuros}%)^12 - 1 = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      }
    } else {
      const periodosPorAno =
        periodicidade === "Diário" ? 365 : periodicidade === "Trimestral" ? 4 : periodicidade === "Semestral" ? 2 : 12
      if (tipoJuros === "simples") {
        memoriaCalculo.push(
          `Conversão para taxa anual simples: ${parametros.taxaJuros}% × ${periodosPorAno} = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      } else {
        memoriaCalculo.push(
          `Conversão para taxa anual efetiva: (1 + ${parametros.taxaJuros}%)^${periodosPorAno} - 1 = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      }
    }

    memoriaCalculo.push(`Esta taxa convertida será aplicada no cálculo dos juros sobre o valor corrigido.`)
  } else {
    memoriaCalculo.push(`Taxa de juros: Não informada`)
  }

  if (nomeIndice === "Poupança") {
    memoriaCalculo.push(`Regra: Aniversário mensal no dia ${parametros.dataInicial.dia}`)
  }
  memoriaCalculo.push(``)

  // Período (exibição)
  const periodo = calcularDiferencaData(parametros.dataInicial, parametros.dataFinal)
  memoriaCalculo.push(`Período: ${periodo.meses} meses e ${periodo.dias} dias`)

  // Obter índices do período principal
  let indicesDBPeriodo = await obterIndicesPeriodo(parametros.dataInicial, parametros.dataFinal, parametros.indice)
  
  // Obter índices IGP-M do período (para reajuste a cada 12 meses)
  let indicesIGPMPeriodo = await obterIndicesPeriodo(parametros.dataInicial, parametros.dataFinal, "IGP-M")
  
  // APLICAR REGRA: Reajuste pelo IGP-M a cada 12 meses (para TODOS os índices, inclusive Poupança)
  const temReajusteIGPM = aplicarCiclosParcelasIGPM && indicesDBPeriodo.length > 12
  
  if (temReajusteIGPM && nomeIndice !== "IGP-M") {
    // Se não for IGP-M, aplicar reajuste IGP-M a cada 12 meses SOBRE O ÍNDICE ESCOLHIDO
    indicesDBPeriodo = aplicarReajusteIGPMACada12Meses(indicesDBPeriodo, indicesIGPMPeriodo)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== METODOLOGIA DE CÁLCULO: POUPANÇA MENSAL + REAJUSTE ANUAL IGP-M ===`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Baseado em regra contratual/judicial que autoriza a cumulação de correção mensal`)
    memoriaCalculo.push(`pela Poupança com reajuste anual pelo IGP-M (FGV).`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`REGRA OBRIGATÓRIA (Pseudocódigo):`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`valor = valor_original`)
    memoriaCalculo.push(`contador_meses = 0`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`para cada mês no período:`)
    memoriaCalculo.push(`    contador_meses += 1`)
    memoriaCalculo.push(`    valor = valor × (1 + poupanca_mensal)`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`    se contador_meses % 12 == 0:`)
    memoriaCalculo.push(`        igpm_acumulado = (1+m1)×(1+m2)×...×(1+m12) - 1`)
    memoriaCalculo.push(`        valor = valor × (1 + igpm_acumulado)`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`FÓRMULAS EXATAS:`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`1. Todos os meses (1-11, 13-23, 25-35...):`)
    memoriaCalculo.push(`   Valor_mês = Valor_anterior × (1 + poupança_mês)`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`2. IGP-M acumulado de cada ciclo:`)
    memoriaCalculo.push(`   IGP-M_acumulado = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
    memoriaCalculo.push(`   onde m1...m12 = índices mensais do IGP-M em decimal`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`3. Mês exato do reajuste (12, 24, 36...):`)
    memoriaCalculo.push(`   Fator_mês = (1 + poupança) × (1 + IGP-M_acumulado)`)
    memoriaCalculo.push(`   Valor_final = Valor_anterior × Fator_mês`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`RESTRIÇÕES ABSOLUTAS:`)
    memoriaCalculo.push(`✓ NÃO somar percentuais`)
    memoriaCalculo.push(`✓ NÃO distribuir IGP-M mês a mês`)
    memoriaCalculo.push(`✓ NÃO aplicar IGP-M antes de 12 meses completos`)
    memoriaCalculo.push(`✓ Aplicar IGP-M uma única vez por ciclo`)
    memoriaCalculo.push(`✓ Sempre multiplicar fatores, nunca somar`)
    memoriaCalculo.push(``)
  } else if (temReajusteIGPM && nomeIndice === "IGP-M") {
    // Se for IGP-M, aplicar ciclos de valor fixo
    indicesDBPeriodo = aplicarCicloParcelasIGPM(indicesDBPeriodo)
    
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== REGRA DE REAJUSTE A CADA 12 MESES (IGP-M) ===`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`De acordo com a Fundação Getúlio Vargas (FGV):`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`1. O valor das parcelas permanece FIXO durante cada ciclo de 12 meses`)
    memoriaCalculo.push(`2. A cada 12 meses, é aplicado o REAJUSTE pelo IGP-M acumulado`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`3. Fórmula de cálculo do IGP-M acumulado dos 12 meses:`)
    memoriaCalculo.push(`   IGP-M acumulado = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
    memoriaCalculo.push(`   Onde m1 até m12 são os índices mensais em formato decimal (ex: 0.85 para 0.85%)`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`4. Este reajuste é aplicado no PRIMEIRO MÊS de cada novo ciclo`)
    memoriaCalculo.push(`5. Os meses 2 a 12 de cada ciclo NÃO VARIAM (valor fixo)`)
    memoriaCalculo.push(``)
  }

  let fatorCorrecao = 1
  memoriaCalculo.push(``)

  if (nomeIndice === "Poupança") {
    memoriaCalculo.push(`=== APLICAÇÃO DOS ÍNDICES DA POUPANÇA (ANIVERSÁRIOS) ===`)
  } else {
    memoriaCalculo.push(`=== APLICAÇÃO DOS ÍNDICES MENSAIS ===`)
  }

  // Transparência – montar linhas completas com "pendente" quando faltarem dados
  let detalhamentoIGPM: DetalheLinha[] | undefined
  let detalhamentoPoupanca: DetalheLinha[] | undefined

  if (nomeIndice === "IGP-M") {
    detalhamentoIGPM = []
    let mesEsperado = parametros.dataInicial.dia === 1 ? parametros.dataInicial.mes : parametros.dataInicial.mes + 1
    let anoEsperado = parametros.dataInicial.ano
    if (mesEsperado > 12) {
      mesEsperado = 1
      anoEsperado++
    }

    const existe = (m: number, a: number) => indicesDBPeriodo.find((x) => x.mes === m && x.ano === a)

    let fatorAcum = 1
    while (
      anoEsperado < parametros.dataFinal.ano ||
      (anoEsperado === parametros.dataFinal.ano && mesEsperado <= parametros.dataFinal.mes)
    ) {
      const row = existe(mesEsperado, anoEsperado)
      if (row) {
        const fatorMensal = 1 + row.valor / 100
        fatorAcum *= fatorMensal
        detalhamentoIGPM.push({
          mes: mesEsperado,
          ano: anoEsperado,
          pendente: false,
          percentual: row.valor,
          fatorMensal,
          fatorAcumulado: fatorAcum,
          valorAcumulado: parametros.valorOriginal * fatorAcum,
        })
      } else {
        detalhamentoIGPM.push({
          mes: mesEsperado,
          ano: anoEsperado,
          pendente: true,
          fatorAcumulado: fatorAcum,
          valorAcumulado: parametros.valorOriginal * fatorAcum,
        })
      }
      mesEsperado++
      if (mesEsperado > 12) {
        mesEsperado = 1
        anoEsperado++
      }
    }
  }

  if (nomeIndice === "Poupança") {
    detalhamentoPoupanca = []
    const inicio = new Date(parametros.dataInicial.ano, parametros.dataInicial.mes - 1, parametros.dataInicial.dia)
    const fim = new Date(parametros.dataFinal.ano, parametros.dataFinal.mes - 1, parametros.dataFinal.dia)
    const existe = (m: number, a: number) => indicesDBPeriodo.find((x) => x.mes === m && x.ano === a)

    let fatorAcum = 1
    let aniversario = new Date(inicio)
    let taxaAcumuladaJuros = 0
    let valorAnterior = parametros.valorOriginal

    while (aniversario < fim) {
      const proximo = new Date(aniversario)
      proximo.setMonth(proximo.getMonth() + 1)
      if (proximo > fim) break

      const mes = proximo.getMonth() + 1
      const ano = proximo.getFullYear()
      const row = existe(mes, ano)

      if (row) {
        const fatorMensal = 1 + row.valor / 100
        const valorAtual = valorAnterior * fatorMensal
        const valorJurosMensal = valorAtual - valorAnterior // Juros ganhos no mês
        taxaAcumuladaJuros = (fatorAcum - 1) * 100 // Taxa acumulada em %

        detalhamentoPoupanca.push({
          mes,
          ano,
          pendente: false,
          percentual: row.valor,
          fatorMensal,
          fatorAcumulado: fatorAcum,
          valorAcumulado: valorAtual,
          taxaJurosMensal: row.valor, // Taxa do mês em %
          valorJurosMensal,
          taxaAcumuladaJuros,
          valorTotalComJuros: valorAtual,
        })

        valorAnterior = valorAtual
        fatorAcum *= fatorMensal
      } else {
        detalhamentoPoupanca.push({
          mes,
          ano,
          pendente: true,
          fatorAcumulado: fatorAcum,
          valorAcumulado: valorAnterior,
          taxaAcumuladaJuros,
          valorTotalComJuros: valorAnterior,
        })
      }

      aniversario = proximo
    }
  }

  // Aplicação efetiva dos índices (sem arredondamentos intermediários)
  if (indicesDBPeriodo.length === 0) {
    memoriaCalculo.push(`Nenhum índice encontrado para o período informado.`)
    fatorCorrecao = 1
  } else {
    memoriaCalculo.push(`Índices aplicados no período:`)
    memoriaCalculo.push(``)

    if (nomeIndice === "Poupança") {
      memoriaCalculo.push(`=== DETALHAMENTO MENSAL DOS JUROS DA POUPANÇA ===`)
      
      // Verificar se há reajuste IGP-M
      const temReajusteIGPM = aplicarCiclosParcelasIGPM && indicesDBPeriodo.length > 12
      
      if (temReajusteIGPM) {
        memoriaCalculo.push(``)
        memoriaCalculo.push(`Com REAJUSTE IGP-M a cada 12 meses conforme determinação FGV`)
        memoriaCalculo.push(`Fórmula do reajuste: IGP-M acumulado = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(`OBSERVAÇÃO IMPORTANTE:`)
        memoriaCalculo.push(`A Poupança recebe dois componentes a cada 12 meses:`)
        memoriaCalculo.push(`1. O índice mensal da própria Poupança`)
        memoriaCalculo.push(`2. O reajuste IGP-M acumulado dos 12 meses anteriores`)
        memoriaCalculo.push(`Ambos são MULTIPLICADOS (acúmulo de fatores): Fator Total = (1 + Poupança) × (1 + IGP-M acumulado)`)
        memoriaCalculo.push(``)
      }
      
      memoriaCalculo.push(
        `| **Mês/Ano** | **Taxa (%)** | **Juros do Mês (R$)** | **Taxa Acum. (%)** | **Valor Total (R$)** |`,
      )

      let valorAnterior = parametros.valorOriginal
      let taxaAcumulada = 0
      let mesDosCiclo = 0

      indicesDBPeriodo.forEach((indice, index) => {
        mesDosCiclo = (index % 12) + 1
        
        const fatorMensal = 1 + indice.valor / 100
        const valorAtual = valorAnterior * fatorMensal
        const jurosMes = valorAtual - valorAnterior
        taxaAcumulada = (valorAtual / parametros.valorOriginal - 1) * 100

        const mesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][
          indice.mes - 1
        ]

        const mesAno = `${mesNome}/${indice.ano}`
        const taxa = `${indice.valor.toFixed(4).replace(".", ",")}%`
        const jurosFormatado = `R$ ${jurosMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const taxaAcumFormatada = `${taxaAcumulada.toFixed(4).replace(".", ",")}%`
        const valorTotalFormatado = `R$ ${valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        let linha = `| ${mesAno} | ${taxa} | ${jurosFormatado} | ${taxaAcumFormatada} | ${valorTotalFormatado} |`
        
        // Indicador de reajuste IGP-M: mostrar no mês 12, 24, 36... (fim do ciclo)
        if (temReajusteIGPM && mesDosCiclo === 12 && indice.isReajusteIGPM) {
          const indiceOriginal = indice.indiceOriginal ?? 0
          const reajusteIGPM = indice.igpmReajuste ?? 0
          const numeroCiclo = Math.floor(index / 12)
          linha += ` ← **REAJUSTE ANUAL - CICLO ${numeroCiclo}** | Poupança: ${indiceOriginal.toFixed(4)}% + IGP-M acumulado: ${reajusteIGPM.toFixed(4)}% | Fator: 1.${(indiceOriginal / 100).toFixed(6)} × 1.${(reajusteIGPM / 100).toFixed(6)}`
        }
        
        memoriaCalculo.push(linha)

        valorAnterior = valorAtual
        fatorCorrecao = valorAtual / parametros.valorOriginal
      })

      memoriaCalculo.push(``)
      
      // Se houver reajuste IGP-M, mostrar detalhamento
      if (temReajusteIGPM) {
        memoriaCalculo.push(`=== DETALHAMENTO DO MODELO HÍBRIDO (Poupança + IGP-M Anual) ===`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(`Este detalhamento mostra o cálculo dos ciclos de 12 meses com reajuste anual pelo IGP-M.`)
        memoriaCalculo.push(``)
        
        let cicloAtual = 1
        let mesDosCiclo = 0
        let indicesCiclo: IndiceData[] = []
        let igpmDoCiclo: IndiceData[] = []
        
        indicesDBPeriodo.forEach((indice, index) => {
          mesDosCiclo = (index % 12) + 1
          
          if (mesDosCiclo === 1 && index > 0) {
            // Fim do ciclo anterior - mostrar cálculo do reajuste
            if (indicesCiclo.length === 12 && indice.isReajusteIGPM) {
              memoriaCalculo.push(``)
              memoriaCalculo.push(`**CICLO ${cicloAtual}** (Meses ${index - 11} a ${index}):`)
              
              // Mostrar período
              const primeiroIndice = indicesCiclo[0]
              const ultimoIndice = indicesCiclo[11]
              const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
              const mesInicio = `${mesesNomes[primeiroIndice.mes - 1]}/${primeiroIndice.ano}`
              const mesFim = `${mesesNomes[ultimoIndice.mes - 1]}/${ultimoIndice.ano}`
              
              memoriaCalculo.push(`Período: ${mesInicio} a ${mesFim}`)
              memoriaCalculo.push(``)
              
              // Mostrar índices mensais da Poupança
              memoriaCalculo.push(`Índices mensais da Poupança:`)
              let fatorPoupanca = 1
              const valoresPoupanca: string[] = []
              indicesCiclo.forEach((m, idx) => {
                const fator = 1 + m.valor / 100
                fatorPoupanca *= fator
                const mesNome = mesesNomes[m.mes - 1]
                valoresPoupanca.push(`${mesNome}: ${m.valor.toFixed(4)}%`)
              })
              memoriaCalculo.push(valoresPoupanca.join("  |  "))
              
              const poupancaAcumulada = (fatorPoupanca - 1) * 100
              memoriaCalculo.push(`Fator acumulado Poupança: ${fatorPoupanca.toFixed(8)}`)
              memoriaCalculo.push(`Percentual acumulado: ${poupancaAcumulada.toFixed(8)}%`)
              memoriaCalculo.push(``)
              
              // Mostrar IGP-M do ciclo (referência)
              if (indice.isReajusteIGPM && indice.igpmReajuste !== undefined) {
                memoriaCalculo.push(`IGP-M acumulado do ciclo (${mesInicio} a ${mesFim}):`)
                memoriaCalculo.push(`Fórmula: IGP-M = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
                memoriaCalculo.push(`Resultado: ${indice.igpmReajuste.toFixed(8)}%`)
                memoriaCalculo.push(``)
                
                // Mostrar fórmula final do ciclo
                const fatorIGPM = 1 + (indice.igpmReajuste / 100)
                const fatorPoupancaMes12 = 1 + (indice.indiceOriginal ?? 0) / 100
                memoriaCalculo.push(`APLICAÇÃO NO MÊS 12 (${mesFim}):`)
                memoriaCalculo.push(`Fator Poupança (mês 12): ${fatorPoupancaMes12.toFixed(8)}`)
                memoriaCalculo.push(`Fator IGP-M acumulado: ${fatorIGPM.toFixed(8)}`)
                memoriaCalculo.push(`Fator total: ${fatorPoupancaMes12.toFixed(4)} × ${fatorIGPM.toFixed(4)} = ${(fatorPoupancaMes12 * fatorIGPM).toFixed(8)}`)
                memoriaCalculo.push(`Percentual total: ${((fatorPoupancaMes12 * fatorIGPM - 1) * 100).toFixed(8)}%`)
              }
            }
            
            indicesCiclo = [indice]
            cicloAtual++
          } else {
            indicesCiclo.push(indice)
          }
        })
        
        // Último ciclo
        if (indicesCiclo.length > 0 && indicesCiclo.length < 12) {
          memoriaCalculo.push(``)
          memoriaCalculo.push(`**CICLO ${cicloAtual}** (incompleto):`)
          memoriaCalculo.push(`Período: ${indicesCiclo.length} meses (últimos meses do período)`)
          memoriaCalculo.push(`Observação: Ciclo incompleto não recebe reajuste IGP-M`)
        }
        
        memoriaCalculo.push(``)
      }
      
      memoriaCalculo.push(`Total de aniversários aplicados: ${indicesDBPeriodo.length}`)
      memoriaCalculo.push(`Taxa de juros total acumulada: ${((fatorCorrecao - 1) * 100).toFixed(6)}%`)
      memoriaCalculo.push(
        `Total de juros ganhos: R$ ${(valorAnterior - parametros.valorOriginal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
    } else {
      // Aplicar índices principais (com detalhamento melhorado para IGP-M)
      let contadorParcelas = 0
      let cicloAtual = 1
      
      if (nomeIndice === "IGP-M" && indicesDBPeriodo.length > 12) {
        memoriaCalculo.push(`=== DETALHAMENTO COM REAJUSTE A CADA 12 MESES (FÓRMULA IGP-M ACUMULADO) ===`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(`Fórmula aplicada: IGP-M acumulado = (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(`CICLO 1 (Meses 1-12): Aplicar índices normais do período`)
        memoriaCalculo.push(``)
      }
      
      indicesDBPeriodo.forEach((indice, index) => {
        contadorParcelas = index + 1
        const posicaoNoCiclo = ((contadorParcelas - 1) % 12) + 1
        const cicloAtualMes = Math.floor((contadorParcelas - 1) / 12) + 1
        
        // Mostrar indicador de novo ciclo
        if (posicaoNoCiclo === 1 && contadorParcelas > 1 && nomeIndice === "IGP-M" && indicesDBPeriodo.length > 12) {
          // Mostrar fim do ciclo anterior
          const cicloAnterior = indicesDBPeriodo.slice(Math.max(0, index - 12), index)
          if (cicloAnterior.length === 12) {
            memoriaCalculo.push(``)
            memoriaCalculo.push(`--- CICLO ${cicloAtualMes - 1} FINALIZADO ---`)
            memoriaCalculo.push(``)
            
            // Calcular e mostrar o reajuste que será aplicado no próximo ciclo
            let fatorReajuste = 1
            const mesesAnterior: string[] = []
            
            cicloAnterior.forEach((m, idx) => {
              const fator = 1 + m.valor / 100
              fatorReajuste *= fator
              const mesNomePrev = [
                "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
              ][m.mes - 1]
              mesesAnterior.push(`${mesNomePrev}/${m.ano}`)
            })
            
            const reajustePercent = (fatorReajuste - 1) * 100
            
            memoriaCalculo.push(`CICLO ${cicloAtualMes} (Meses ${contadorParcelas}-${contadorParcelas + 11}): Aplicar reajuste IGP-M acumulado`)
            memoriaCalculo.push(``)
            memoriaCalculo.push(`Reajuste IGP-M acumulado dos 12 meses anteriores (${mesesAnterior[0]} a ${mesesAnterior[11]}):`)
            memoriaCalculo.push(`Fórmula: (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
            memoriaCalculo.push(``)
            
            cicloAnterior.forEach((m, idx) => {
              const fator = 1 + m.valor / 100
              const mesNomePrev = [
                "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
              ][m.mes - 1]
              memoriaCalculo.push(`  m${idx + 1} (${mesNomePrev}/${m.ano}): 1 + ${m.valor.toFixed(6)}% = ${fator.toFixed(8)}`)
            })
            
            memoriaCalculo.push(``)
            memoriaCalculo.push(`Cálculo: ${fatorReajuste.toFixed(10)} - 1 = ${reajustePercent.toFixed(8)}%`)
            memoriaCalculo.push(``)
            memoriaCalculo.push(`Este reajuste será aplicado no 1º mês do novo ciclo e os demais meses terão valor FIXO.`)
            memoriaCalculo.push(``)
          }
        }
        
        const fatorMensal = 1 + indice.valor / 100
        fatorCorrecao *= fatorMensal
        const valorAcumulado = parametros.valorOriginal * fatorCorrecao
        const mesNome = [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ][indice.mes - 1]
        
        // Mostrar indicação de reajuste para IGP-M
        let indicadorCiclo = ""
        if (nomeIndice === "IGP-M" && indicesDBPeriodo.length > 12) {
          if (posicaoNoCiclo === 1 && contadorParcelas > 1) {
            indicadorCiclo = " ← REAJUSTE CICLO (IGP-M acumulado dos 12 meses anteriores)"
          } else if (posicaoNoCiclo > 1) {
            indicadorCiclo = " (VALOR FIXO - sem variação neste ciclo)"
          }
        }
        
        memoriaCalculo.push(
          `${String(contadorParcelas).padStart(2, "0")}. ${mesNome}/${indice.ano}: ${indice.valor.toFixed(4).replace(".", ",")}% → Fator: ${fatorMensal.toFixed(6)} → Acumulado: ${fatorCorrecao.toFixed(6)}${indicadorCiclo}`,
        )
      })
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`--- CICLO ${cicloAtual} FINALIZADO ---`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Total de meses com índices aplicados: ${indicesDBPeriodo.length}`)
    }
  }

  // Correção pro-rata (apenas se solicitado explicitamente)
  if (parametros.correcaoProRata && nomeIndice === "Poupança") {
    const dataInicio = new Date(parametros.dataInicial.ano, parametros.dataInicial.mes - 1, parametros.dataInicial.dia)
    const dataFim = new Date(parametros.dataFinal.ano, parametros.dataFinal.mes - 1, parametros.dataFinal.dia)

    let ultimoAniversario = new Date(dataInicio)
    while (ultimoAniversario < dataFim) {
      const proximoAniversario = new Date(ultimoAniversario)
      proximoAniversario.setMonth(proximoAniversario.getMonth() + 1)
      if (proximoAniversario > dataFim) break
      ultimoAniversario = proximoAniversario
    }

    const diasRestantes = diasExatosEntre(ultimoAniversario, dataFim)
    if (diasRestantes > 0) {
      const diasNoMesConvencao = 30
      const fatorProRata = diasRestantes / diasNoMesConvencao

      const proximoMes = ultimoAniversario.getMonth() + 2
      const proximoAno = proximoMes > 12 ? ultimoAniversario.getFullYear() + 1 : ultimoAniversario.getFullYear()
      const mesAjustado = proximoMes > 12 ? 1 : proximoMes

      const indiceProRataArray = await obterIndicesAtualizados(
        parametros.indice,
        mesAjustado,
        proximoAno,
        mesAjustado,
        proximoAno,
      )
      const indiceProRata = indiceProRataArray[0] || indicesDBPeriodo[indicesDBPeriodo.length - 1]

      if (indiceProRata) {
        const fatorProRataAdicional = 1 + (indiceProRata.valor / 100) * fatorProRata
        fatorCorrecao *= fatorProRataAdicional
        memoriaCalculo.push(
          `Correção pro-rata da poupança (${diasRestantes}/${diasNoMesConvencao} dias): fator ${fatorProRataAdicional}`,
        )
      }
    }
  }

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Fator de correção total: ${fatorCorrecao}`)

  const valorCorrigido = parametros.valorOriginal * fatorCorrecao
  memoriaCalculo.push(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)

  // Juros (opcional) – Actual/365
  let juros = 0
  let diasTotais: number | undefined
  let anosExatos: number | undefined
  let taxaAnual: number | undefined
  let tipoTaxaAnual: "simples" | "efetiva" | undefined
  let convencaoDia: "Actual/365" | "Actual/365.2425" | undefined

  if (parametros.taxaJuros !== undefined && parametros.taxaJuros > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DOS JUROS ===`)
    memoriaCalculo.push(
      `Taxa informada pelo usuário: ${parametros.taxaJuros}% ${parametros.periodicidadeJuros || "Mensal"}`,
    )
    memoriaCalculo.push(`Tipo de juros: ${parametros.tipoJuros || "simples"}`)

    const dataInicioJuros =
      parametros.dataInicialJuros ||
      new Date(parametros.dataInicial.ano, parametros.dataInicial.mes - 1, parametros.dataInicial.dia)
    const dataFimJuros =
      parametros.dataFinalJuros ||
      new Date(parametros.dataFinal.ano, parametros.dataFinal.mes - 1, parametros.dataFinal.dia)

    diasTotais = diasExatosEntre(dataInicioJuros, dataFimJuros)
    convencaoDia = parametros.convencaoDias === "Actual/365.2425" ? "Actual/365.2425" : "Actual/365"
    const divisorDias = convencaoDia === "Actual/365.2425" ? 365.2425 : 365
    anosExatos = diasTotais / divisorDias

    const conv = obterTaxaAnual(parametros.taxaJuros, parametros.periodicidadeJuros, parametros.tipoJuros as any)
    taxaAnual = conv.taxaAnual
    tipoTaxaAnual = conv.tipoTaxaAnual

    memoriaCalculo.push(`Dias totais (Actual): ${diasTotais} dia(s)`)
    memoriaCalculo.push(`Convenção de dias: ${convencaoDia}`)
    memoriaCalculo.push(`Anos exatos: ${anosExatos.toFixed(6)}`)
    memoriaCalculo.push(`Taxa anual convertida (${tipoTaxaAnual}): ${(taxaAnual * 100).toFixed(6)}%`)

    if ((parametros.tipoJuros || "simples") === "simples") {
      juros = valorCorrigido * (taxaAnual ?? 0) * (anosExatos ?? 0)
      memoriaCalculo.push(`Fórmula: Juros simples = Valor corrigido × taxa_anual × anos`)
      memoriaCalculo.push(
        `Cálculo: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × ${(taxaAnual * 100).toFixed(6)}% × ${anosExatos.toFixed(6)} = R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
    } else {
      const montante = valorCorrigido * Math.pow(1 + (taxaAnual ?? 0), anosExatos ?? 0)
      juros = montante - valorCorrigido
      memoriaCalculo.push(`Fórmula: Juros compostos = M - Principal`)
      memoriaCalculo.push(
        `Montante: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × (1 + ${(taxaAnual * 100).toFixed(6)}%)^${anosExatos.toFixed(6)} = R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
      memoriaCalculo.push(
        `Juros: R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
    }
  }

  // Multa
  let multa = 0
  if (parametros.percentualMulta && parametros.percentualMulta > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DA MULTA ===`)
    const baseCalculoMulta = parametros.multaSobreJuros ? valorCorrigido + juros : valorCorrigido
    multa = baseCalculoMulta * (parametros.percentualMulta / 100)
    memoriaCalculo.push(`Base de cálculo: R$ ${baseCalculoMulta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Percentual da multa: ${parametros.percentualMulta}%`)
    memoriaCalculo.push(`Multa: R$ ${multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  }

  // Honorários
  let honorarios = 0
  if (parametros.percentualHonorarios && parametros.percentualHonorarios > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DOS HONORÁRIOS ===`)
    honorarios = valorCorrigido * (parametros.percentualHonorarios / 100)
    memoriaCalculo.push(`Base de cálculo: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Percentual dos honorários: ${parametros.percentualHonorarios}%`)
    memoriaCalculo.push(`Honorários: R$ ${honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  }

  const valorTotal = valorCorrigido + juros + multa + honorarios

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== RESUMO FINAL ===`)
  memoriaCalculo.push(
    `Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  )
  memoriaCalculo.push(`Índices utilizados: ${nomeIndice}`)
  memoriaCalculo.push(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`Fator de correção: ${fatorCorrecao.toFixed(6)}`)
  if (taxaAnual !== undefined) {
    memoriaCalculo.push(
      `Dias totais: ${diasTotais} | Anos exatos (${convencaoDia}): ${anosExatos} | Taxa anual (${tipoTaxaAnual}): ${taxaAnual}`,
    )
  }
  memoriaCalculo.push(`Juros: R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`Multa: R$ ${multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`Honorários: R$ ${honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`VALOR TOTAL: R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)

  // Fontes
  const fontes =
    nomeIndice === "IGP-M"
      ? [
          "FGV – Portal IBRE: https://portalibre.fgv.br",
          "FGV – Sala de Imprensa (releases mensais): https://portalibre.fgv.br/press-releases",
          "Tabela histórica IGP-M – Brasil Indicadores: https://brasilindicadores.com.br/igpm/",
          "Mobills – Tabela IGP-M: https://www.mobills.com.br/tabelas/igp-m/",
          "Trading Economics (mensal): https://pt.tradingeconomics.com/brazil/igp-m-inflation-mom",
        ]
      : nomeIndice === "Poupança"
        ? [
            "Banco Central do Brasil – SGS (série 195): https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json",
            "Banco Central do Brasil – SGS (série 4391): https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json",
            "Mobills – Tabela Poupança: https://www.mobills.com.br/tabelas/poupanca/",
            "FGV – Indicadores Econômicos: https://portalibre.fgv.br/indicadores",
          ]
        : undefined

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== FONTES DOS DADOS ===`)

  // Add source based on the index used
  switch (parametros.indice.toLowerCase()) {
    case "poupanca":
      memoriaCalculo.push(`Poupança: https://www.debit.com.br/tabelas/poupanca`)
      memoriaCalculo.push(`Dados oficiais do Banco Central do Brasil`)
      break
    case "igpm":
      memoriaCalculo.push(`IGP-M: Fundação Getúlio Vargas (FGV)`)
      memoriaCalculo.push(`Banco Central do Brasil - Sistema Gerenciador de Séries Temporais`)
      break
    case "cdi":
      memoriaCalculo.push(`CDI: Banco Central do Brasil`)
      memoriaCalculo.push(`Sistema Especial de Liquidação e de Custódia (SELIC)`)
      break
    case "ipca":
      memoriaCalculo.push(`IPCA: Instituto Brasileiro de Geografia e Estatística (IBGE)`)
      memoriaCalculo.push(`Sistema Nacional de Índices de Preços ao Consumidor`)
      break
    default:
      memoriaCalculo.push(`${nomeIndice}: Banco Central do Brasil`)
      break
  }

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Cálculo realizado em: ${new Date().toLocaleString("pt-BR")}`)
  memoriaCalculo.push(`Sistema: Calculadora de Atualização Monetária - CGOF/SP`)

  return {
    valorOriginal: parametros.valorOriginal,
    valorCorrigido,
    fatorCorrecao,
    juros,
    multa,
    honorarios,
    valorTotal,
    memoriaCalculo,
    periodoCorrecao: periodo,
    diasTotais,
    anosExatos,
    taxaAnual,
    tipoTaxaAnual,
    convencaoDia,
    detalhamentoIGPM,
    detalhamentoPoupanca,
    fontes,
  }
}

export function validarDatas(dataInicial: DataCalculo, dataFinal: DataCalculo): string[] {
  const erros: string[] = []
  const inicio = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
  const fim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

  if (isNaN(inicio.getTime())) erros.push("Data inicial inválida")
  if (isNaN(fim.getTime())) erros.push("Data final inválida")
  if (fim < inicio) erros.push("ATENÇÃO: Data final anterior à inicial - será realizado deflacionamento")

  return erros
}
