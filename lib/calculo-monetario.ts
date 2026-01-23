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
  numeroParcelas?: number // Número de parcelas para parcelamento
  dataParcelamento?: DataCalculo // Data de REFERÊNCIA para calcular ciclos (usa data atual se não informado)
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
  // Parcelamento
  parcelamento?: {
    numeroParcelas: number
    valorParcela: number
    valorTotalParcelado: number
  }
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
// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: Calcular ciclos de parcelamento com base na data ATUAL
// ═══════════════════════════════════════════════════════════════════════════════
// 
// IMPORTANTE: O IGP-M é determinado UMA VEZ na contratação (data atual)
// e usado para TODOS os ciclos de parcelamento
//
// Exemplo com 24 parcelas iniciado em 23/1/2026:
// - IGP-M de referência: ÚNICO, 12 meses ANTES = 1/2025 a 12/2025
//
// - Ciclo 1 (Parcelas 1-12): 
//   ├─ Período de pagamento: 1/2026 a 12/2026
//   └─ IGP-M acumulado: 1/2025 a 12/2025 ✓ (mesma referência)
//
// - Ciclo 2 (Parcelas 13-24):
//   ├─ Período de pagamento: 1/2027 a 12/2027
//   └─ IGP-M acumulado: 1/2025 a 12/2025 ✓ (MESMA referência)
//
// A data de referência é A DATA ATUAL (dataParcelamento)
// ═══════════════════════════════════════════════════════════════════════════════
export function calcularIndicesPorCicloDeParcelamento(
  numeroParcelas: number,
  dataParcelamento: DataCalculo, // Data de referência (data atual ou data escolhida)
  nomeIndice: string,
): {
  ciclos: Array<{
    numero: number
    parcelaInicio: number
    parcelaFim: number
    dataInicio: DataCalculo
    dataFim: DataCalculo
    periodoDescricao: string
    dataInicioIGPM: DataCalculo  // Período para buscar IGP-M (UMA VEZ, 12 meses antes da data atual)
    dataFimIGPM: DataCalculo
    periodoIGPMDescricao: string
  }>
} {
  const ciclos: Array<{
    numero: number
    parcelaInicio: number
    parcelaFim: number
    dataInicio: DataCalculo
    dataFim: DataCalculo
    periodoDescricao: string
    dataInicioIGPM: DataCalculo
    dataFimIGPM: DataCalculo
    periodoIGPMDescricao: string
  }> = []

  let mesAtual = dataParcelamento.mes
  let anoAtual = dataParcelamento.ano
  let diaAtual = dataParcelamento.dia

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULAR O PERÍODO IGP-M UMA VEZ (para TODOS os ciclos)
  // IGP-M = 12 meses ANTES da data atual
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Data de início do IGP-M: 12 meses ANTES da data atual
  let mesIGPMInicio = mesAtual - 12
  let anoIGPMInicio = anoAtual
  while (mesIGPMInicio <= 0) {
    mesIGPMInicio += 12
    anoIGPMInicio -= 1
  }

  const dataInicioIGPMReferencia: DataCalculo = {
    dia: diaAtual,
    mes: mesIGPMInicio,
    ano: anoIGPMInicio,
  }

  // Data de fim do IGP-M: 11 meses após o início (total 12 meses)
  let mesIGPMFim = mesIGPMInicio + 11
  let anoIGPMFim = anoIGPMInicio
  while (mesIGPMFim > 12) {
    mesIGPMFim -= 12
    anoIGPMFim += 1
  }

  const dataFimIGPMReferencia: DataCalculo = {
    dia: Math.min(diaAtual, 28),
    mes: mesIGPMFim,
    ano: anoIGPMFim,
  }

  let parcelaAtual = 1

  while (parcelaAtual <= numeroParcelas) {
    const numeroCiclo = Math.ceil(parcelaAtual / 12)
    const parcelaFimCiclo = Math.min(numeroCiclo * 12, numeroParcelas)

    // Data de início do ciclo
    const dataInicioCiclo: DataCalculo = {
      dia: diaAtual,
      mes: mesAtual,
      ano: anoAtual,
    }

    // Calcular data de fim do ciclo (11 meses depois)
    let mesF = mesAtual + 11
    let anoF = anoAtual
    while (mesF > 12) {
      mesF -= 12
      anoF += 1
    }

    const dataFimCiclo: DataCalculo = {
      dia: Math.min(diaAtual, 28),
      mes: mesF,
      ano: anoF,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USAR O MESMO PERÍODO IGP-M PARA TODOS OS CICLOS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const dataInicioIGPM: DataCalculo = dataInicioIGPMReferencia

    const dataFimIGPM: DataCalculo = dataFimIGPMReferencia

    const nomeMeses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    const descricao = `${nomeMeses[dataInicioCiclo.mes - 1]}/${dataInicioCiclo.ano} a ${nomeMeses[dataFimCiclo.mes - 1]}/${dataFimCiclo.ano}`
    const descricaoIGPM = `${nomeMeses[dataInicioIGPM.mes - 1]}/${dataInicioIGPM.ano} a ${nomeMeses[dataFimIGPM.mes - 1]}/${dataFimIGPM.ano}`

    ciclos.push({
      numero: numeroCiclo,
      parcelaInicio: parcelaAtual,
      parcelaFim: parcelaFimCiclo,
      dataInicio: dataInicioCiclo,
      dataFim: dataFimCiclo,
      periodoDescricao: descricao,
      dataInicioIGPM,
      dataFimIGPM,
      periodoIGPMDescricao: descricaoIGPM,
    })

    // Preparar para próximo ciclo
    mesAtual = mesF + 1
    anoAtual = anoF
    if (mesAtual > 12) {
      mesAtual = 1
      anoAtual += 1
    }

    parcelaAtual = parcelaFimCiclo + 1
  }

  return { ciclos }
}

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
    // │ APLICAR APENAS POUPANÇA MENSAL                                 │
    // │                                                               │
    // │ Valor_mês = Valor_anterior × (1 + p_m)                      │
    // │                                                               │
    // │ Onde: p_m = taxa mensal da poupança (decimal)               │
    // │                                                               │
    // │ Exemplo:                                                      │
    // │ Valor_mês = 296.556,65 × (1 + 0,001159)                     │
    // │ Valor_mês = 296.900,36                                       │
    // │                                                               │
    // │ NOTA: IGP-M será aplicado apenas no parcelamento,            │
    // │ a cada 12 meses de parcelamento (não aqui)                   │
    // └─────────────────────────────────────────────────────────────────┘
    resultado.push(indicePoupanca)
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

  // Apenas suportar IGP-M (Poupança foi removida devido a CORS bloqueado)
  // IMPORTANTE: Para período de 12 meses, sempre começar do mês inicial (sem incremento)
  // pois o período já foi calculado para incluir exatamente 12 meses
  let mesAtual = dataInicial.mes
  let anoAtual = dataInicial.ano

  while (
    anoAtual < dataFinal.ano ||
    (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)
  ) {
    const indiceDoMes = indices.find((i) => i.mes === mesAtual && i.ano === anoAtual)
    if (indiceDoMes) indicesPeriodo.push(indiceDoMes)
    mesAtual++
    if (mesAtual > 12) {
      mesAtual = 1
      anoAtual++
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

  memoriaCalculo.push(`=== APLICAÇÃO DOS ÍNDICES IGP-M (MENSAIS) ===`)

  // Transparência – montar linhas completas com "pendente" quando faltarem dados
  let detalhamentoIGPM: DetalheLinha[] | undefined

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

  let detalhamentoPoupanca: DetalheLinha[] | undefined = undefined

  // Aplicação efetiva dos índices (sem arredondamentos intermediários)
  if (indicesDBPeriodo.length === 0) {
    memoriaCalculo.push(`Nenhum índice encontrado para o período informado.`)
    fatorCorrecao = 1
  } else {
    memoriaCalculo.push(`Índices aplicados no período:`)
    memoriaCalculo.push(``)

    // Aplicar índices IGP-M
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
      : undefined

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== FONTES DOS DADOS ===`)

  // Add source based on the index used
  switch (parametros.indice.toLowerCase()) {
    case "igpm":
      memoriaCalculo.push(`IGP-M: Ipeadata`)
      memoriaCalculo.push(`Série: IGP12_IGPMG12 (IGP-M Geral - % mensal)`)
      memoriaCalculo.push(`https://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='IGP12_IGPMG12')?$format=json`)
      break
    default:
      memoriaCalculo.push(`${nomeIndice}: Ipeadata`)
      break
  }

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Cálculo realizado em: ${new Date().toLocaleString("pt-BR")}`)
  memoriaCalculo.push(`Sistema: Calculadora de Atualização Monetária - CGOF/SP`)

  // ═════════════════════════════════════════════════════════════════════════════════
  // PARCELAMENTO
  // ═════════════════════════════════════════════════════════════════════════════════
  let parcelamento: { numeroParcelas: number; valorParcela: number; valorTotalParcelado: number } | undefined

  if (parametros.numeroParcelas && parametros.numeroParcelas > 0) {
    const numeroParcelas = Math.floor(parametros.numeroParcelas)
    
    // USAR DATA ATUAL PARA CALCULAR OS CICLOS (não a data inicial)
    const dataParcelamento = parametros.dataParcelamento || {
      dia: new Date().getDate(),
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
    }
    
    // Calcular os ciclos de parcelamento baseado na data atual
    const ciclosInfo = calcularIndicesPorCicloDeParcelamento(numeroParcelas, dataParcelamento, nomeIndice)
    
    // Para cada ciclo, buscar os índices IGP-M e calcular o reajuste
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== PARCELAMENTO EM ${numeroParcelas} PARCELAS ===`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Data de referência para cálculo dos ciclos: ${dataParcelamento.dia}/${dataParcelamento.mes}/${dataParcelamento.ano}`)
    memoriaCalculo.push(`(usar data atual garante que os índices utilizados sejam os atualizados)`)
    memoriaCalculo.push(``)
    
    let valorParcelamentoComIGPM = parametros.valorOriginal
    let cicloAnteriorDetalhes: Array<{ ciclo: number; periodo: string; igpmAcumulado: number; descricao: string }> = []
    
    // Processar cada ciclo
    for (const ciclo of ciclosInfo.ciclos) {
      memoriaCalculo.push(``)
      memoriaCalculo.push(`CICLO ${ciclo.numero} (Parcelas ${ciclo.parcelaInicio} a ${ciclo.parcelaFim}):`)
      memoriaCalculo.push(`Período de pagamento: ${ciclo.periodoDescricao}`)
      
      // ═══════════════════════════════════════════════════════════════════════════════
      // IMPORTANTE: IGP-M acumulado = 12 meses ANTES do período de pagamento
      // ═══════════════════════════════════════════════════════════════════════════════
      memoriaCalculo.push(`Período para cálculo IGP-M acumulado (12 meses ANTES): ${ciclo.periodoIGPMDescricao}`)
      memoriaCalculo.push(``)
      
      // Buscar índices IGP-M do PERÍODO ANTERIOR (12 meses antes)
      const indicesIGPMCiclo = await obterIndicesPeriodo(
        ciclo.dataInicioIGPM,
        ciclo.dataFimIGPM,
        "IGP-M"
      )
      
      if (indicesIGPMCiclo.length === 12) {
        // Calcular IGP-M acumulado do ciclo
        const igpmInfo = calcularIGPMAcumulado12Meses(indicesIGPMCiclo)
        const igpmAcumulado = igpmInfo.valor
        const fatorIGPM = 1 + igpmAcumulado / 100
        
        memoriaCalculo.push(`IGP-M acumulado (${ciclo.periodoIGPMDescricao}): ${igpmAcumulado.toFixed(4)}%`)
        memoriaCalculo.push(`Fórmula: (1 + m1) × (1 + m2) × ... × (1 + m12) − 1`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(`Detalhamento dos 12 meses:`)
        
        
        indicesIGPMCiclo.forEach((ind, idx) => {
          const mesNome = [
            "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
            "Jul", "Ago", "Set", "Out", "Nov", "Dez"
          ][ind.mes - 1]
          memoriaCalculo.push(`  m${idx + 1} (${mesNome}/${ind.ano}): ${ind.valor.toFixed(6)}%`)
        })
        
        if (ciclo.numero > 1) {
          // Aplicar o reajuste IGP-M do ciclo anterior no início deste ciclo
          const fatorReajusteAnterior = 1 + cicloAnteriorDetalhes[cicloAnteriorDetalhes.length - 1].igpmAcumulado / 100
          valorParcelamentoComIGPM *= fatorReajusteAnterior
          
          memoriaCalculo.push(``)
          memoriaCalculo.push(`Reajuste aplicado no 1º mês deste ciclo (IGP-M do ciclo anterior): ${cicloAnteriorDetalhes[cicloAnteriorDetalhes.length - 1].igpmAcumulado.toFixed(4)}%`)
          memoriaCalculo.push(`Fator de reajuste: ${fatorReajusteAnterior.toFixed(10)}`)
          memoriaCalculo.push(`Valor após reajuste: R$ ${valorParcelamentoComIGPM.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
        }
        
        cicloAnteriorDetalhes = [{
          ciclo: ciclo.numero,
          periodo: ciclo.periodoDescricao,
          igpmAcumulado,
          descricao: `Ciclo ${ciclo.numero}: ${igpmAcumulado.toFixed(4)}%`
        }]
        
      } else {
        memoriaCalculo.push(`⚠️ AVISO: Período não contém 12 meses completos (encontrados: ${indicesIGPMCiclo.length})`)
        memoriaCalculo.push(`Os índices para este ciclo ainda não foram publicados.`)
      }
    }
    
    // Calcular valor final da parcela
    const valorParcela = valorParcelamentoComIGPM / numeroParcelas
    const valorTotalParcelado = valorParcela * numeroParcelas
    
    parcelamento = {
      numeroParcelas,
      valorParcela,
      valorTotalParcelado,
    }
    
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO FINAL DO PARCELAMENTO ===`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Valor após todos os reajustes IGP-M: R$ ${valorParcelamentoComIGPM.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Número de parcelas: ${numeroParcelas}`)
    memoriaCalculo.push(`Valor de cada parcela: R$ ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Valor total parcelado: R$ ${valorTotalParcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Cronograma de Pagamento:`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`| Parcela | Valor (R$) |`)
    memoriaCalculo.push(`|---------|------------|`)
    for (let i = 1; i <= numeroParcelas; i++) {
      memoriaCalculo.push(`| ${i} | ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} |`)
    }
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Total: R$ ${valorTotalParcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(``)
  }

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
    parcelamento,
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
