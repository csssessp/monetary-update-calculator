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
// FÓRMULA 2: Reajuste pelo ÚLTIMO IGP-M disponível (mais recente)
// ═══════════════════════════════════════════════════════════════════════════════
// Reajuste = Último índice IGP-M disponível (ex: Dezembro/2025 = -0.01%)
// 
// Onde:
//   Usa o valor do mês mais recente disponível como reajuste
//   Resultado em percentual
//
// Aplicação: Uma única vez por ciclo de 12 meses, nunca distribuído mensalmente
// ═══════════════════════════════════════════════════════════════════════════════
function obterUltimoIndiceIGPM(indices: IndiceData[]): { valor: number; detalhes: IndiceData[] } {
  if (indices.length === 0) return { valor: 0, detalhes: [] }
  
  // Ordenar por ano e depois por mês para encontrar o mais recente
  const indicesOrdenados = [...indices].sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano
    return a.mes - b.mes
  })
  
  // Pegar o último índice (mais recente)
  const ultimoIndice = indicesOrdenados[indicesOrdenados.length - 1]
  
  return {
    valor: ultimoIndice.valor, // Usar o valor diretamente
    detalhes: [ultimoIndice]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FÓRMULA 2 (DESCONTINUADA): Reajuste anual pelo IGP-M acumulado (a cada 12 meses completos)
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
    // Para IGP-M: sempre começar no mês solicitado, independente do dia
    // Se dataInicial.dia > 15, ainda contamos o mês inteiro
    let mesAtual = dataInicial.mes
    let anoAtual = dataInicial.ano

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
  console.log("[CALCULO] Iniciando calcularCorrecaoMonetaria com índice:", parametros.indice, "e numeroParcelas:", parametros.numeroParcelas)
  const memoriaCalculo: string[] = []
  const nomeIndice = getIndiceNome(parametros.indice)
  console.log("[CALCULO] Nome do índice:", nomeIndice)

  memoriaCalculo.push(`=== CÁLCULO DE CORREÇÃO MONETÁRIA ===`)
  memoriaCalculo.push(
    `Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
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

// Obter índices do período — Metodologia BCB Calculadora do Cidadão
  // Fórmula: fator = ∏(1 + taxa_i / 100) para cada mês do período
  const indicesDBPeriodo = await obterIndicesPeriodo(parametros.dataInicial, parametros.dataFinal, parametros.indice)

  // Cálculo do fator e memorial em passo único — consistência total entre exibição e resultado
  let fatorCorrecao = 1
  const detalhamentoIGPM: DetalheLinha[] = []
  let contadorMesesComDado = 0
  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== DETALHAMENTO MÊS A MÊS — ${nomeIndice} (Metodologia: BCB Calculadora do Cidadão) ===${""}`)

  if (indicesDBPeriodo.length === 0) {
    memoriaCalculo.push(`Nenhum índice encontrado para o período informado.`)
    memoriaCalculo.push(`Verifique se o índice ${nomeIndice} possui dados para este período ou clique em "Atualizar do BCB".`)
  } else {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`| # | Período | ${nomeIndice} (%) | Fator Mensal | Fator Acumulado | Valor Acumulado (R$) |`)
    memoriaCalculo.push(`|---|---------|${"−".repeat(Math.max(nomeIndice.length + 6, 14))}|--------------|-----------------|---------------------|`)

    let mesIt = parametros.dataInicial.mes
    let anoIt = parametros.dataInicial.ano
    while (anoIt < parametros.dataFinal.ano || (anoIt === parametros.dataFinal.ano && mesIt <= parametros.dataFinal.mes)) {
      const indiceDoMes = indicesDBPeriodo.find((x) => x.mes === mesIt && x.ano === anoIt)
      if (indiceDoMes) {
        contadorMesesComDado++
        const fatorMensal = 1 + indiceDoMes.valor / 100
        fatorCorrecao *= fatorMensal
        const valorAcum = parametros.valorOriginal * fatorCorrecao
        detalhamentoIGPM.push({
          mes: mesIt,
          ano: anoIt,
          pendente: false,
          percentual: indiceDoMes.valor,
          fatorMensal,
          fatorAcumulado: fatorCorrecao,
          valorAcumulado: valorAcum,
        })
        memoriaCalculo.push(
          `| ${String(contadorMesesComDado).padStart(2, " ")} | ${mesesNomes[mesIt - 1]}/${anoIt} | ${indiceDoMes.valor.toFixed(4).replace(".", ",")} | ${fatorMensal.toFixed(8)} | ${fatorCorrecao.toFixed(8)} | R$ ${valorAcum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |`
        )
      } else {
        detalhamentoIGPM.push({
          mes: mesIt,
          ano: anoIt,
          pendente: true,
          fatorAcumulado: fatorCorrecao,
          valorAcumulado: parametros.valorOriginal * fatorCorrecao,
        })
        memoriaCalculo.push(
          `|  — | ${mesesNomes[mesIt - 1]}/${anoIt} | ⚠ não disponível | — | ${fatorCorrecao.toFixed(8)} | — |`
        )
      }
      mesIt++
      if (mesIt > 12) { mesIt = 1; anoIt++ }
    }
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Meses com índices aplicados: ${contadorMesesComDado} de ${detalhamentoIGPM.length} esperados no período`)
    if (contadorMesesComDado < detalhamentoIGPM.length) {
      memoriaCalculo.push(`⚠ ATENÇÃO: ${detalhamentoIGPM.length - contadorMesesComDado} mês(es) sem dado — clique em "Atualizar do BCB" para buscar os dados mais recentes.`)
    }
  }

  let detalhamentoPoupanca: DetalheLinha[] | undefined = undefined

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Fator de correção total: ${fatorCorrecao}`)

  const valorCorrigido = parametros.valorOriginal * fatorCorrecao
  memoriaCalculo.push(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)

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
        `Cálculo: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} × ${(taxaAnual * 100).toFixed(6)}% × ${anosExatos.toFixed(6)} = R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
      )
    } else {
      const montante = valorCorrigido * Math.pow(1 + (taxaAnual ?? 0), anosExatos ?? 0)
      juros = montante - valorCorrigido
      memoriaCalculo.push(`Fórmula: Juros compostos = M - Principal`)
      memoriaCalculo.push(
        `Montante: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} × (1 + ${(taxaAnual * 100).toFixed(6)}%)^${anosExatos.toFixed(6)} = R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
      )
      memoriaCalculo.push(
        `Juros: R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} - R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} = R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
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
    memoriaCalculo.push(`Base de cálculo: R$ ${baseCalculoMulta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Percentual da multa: ${parametros.percentualMulta}%`)
    memoriaCalculo.push(`Multa: R$ ${multa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  }

  // Honorários
  let honorarios = 0
  if (parametros.percentualHonorarios && parametros.percentualHonorarios > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DOS HONORÁRIOS ===`)
    honorarios = valorCorrigido * (parametros.percentualHonorarios / 100)
    memoriaCalculo.push(`Base de cálculo: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
    memoriaCalculo.push(`Percentual dos honorários: ${parametros.percentualHonorarios}%`)
    memoriaCalculo.push(`Honorários: R$ ${honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
  }

  const valorTotal = valorCorrigido + juros + multa + honorarios

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== RESUMO FINAL ===`)
  memoriaCalculo.push(
    `Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
  )
  memoriaCalculo.push(`Índices utilizados: ${nomeIndice}`)
  memoriaCalculo.push(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
  memoriaCalculo.push(`Fator de correção: ${fatorCorrecao.toFixed(6)}`)
  if (taxaAnual !== undefined) {
    memoriaCalculo.push(
      `Dias totais: ${diasTotais} | Anos exatos (${convencaoDia}): ${anosExatos} | Taxa anual (${tipoTaxaAnual}): ${taxaAnual}`,
    )
  }
  memoriaCalculo.push(`Juros: R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
  memoriaCalculo.push(`Multa: R$ ${multa.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
  memoriaCalculo.push(`Honorários: R$ ${honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
  memoriaCalculo.push(`VALOR TOTAL: R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== FONTES DOS DADOS ===`)

  const fontesPorIndice: Record<string, string[]> = {
    "IGP-M": [
      "IGP-M (Índice Geral de Preços - Mercado) — FGV/IBRE",
      "Banco Central do Brasil — Série BCB 189",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados",
      "Ipeadata — Série IGP12_IGPMG12",
    ],
    "IPCA": [
      "IPCA (Índice Nacional de Preços ao Consumidor Amplo) — IBGE",
      "Banco Central do Brasil — Série BCB 433",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados",
      "Metodologia: Calculadora do Cidadão (BCB) — https://www.bcb.gov.br/calculadora",
    ],
    "INPC": [
      "INPC (Índice Nacional de Preços ao Consumidor) — IBGE",
      "Banco Central do Brasil — Série BCB 188",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.188/dados",
    ],
    "Poupança": [
      "Poupança — remuneração mensal dos depósitos (TR + 0,5%/mês ou 70% SELIC)",
      "Banco Central do Brasil — Série BCB 195",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados",
    ],
    "CDI": [
      "CDI (Certificado de Depósito Interbancário) — taxa acumulada ao mês",
      "Banco Central do Brasil — Série BCB 4391",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados",
    ],
    "SELIC": [
      "SELIC (Sistema Especial de Liquidação e de Custódia) — taxa efetiva acumulada ao mês",
      "Banco Central do Brasil — Série BCB 4390",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados",
    ],
    "TR": [
      "TR (Taxa Referencial) — taxa mensal",
      "Banco Central do Brasil — Série BCB 226",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados",
    ],
  }

  const fonteDoIndice = fontesPorIndice[nomeIndice] || [`${nomeIndice} — Banco Central do Brasil`]
  fonteDoIndice.forEach((linha) => memoriaCalculo.push(linha))

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Cálculo realizado em: ${new Date().toLocaleString("pt-BR")}`)
  memoriaCalculo.push(`Sistema: Calculadora de Atualização Monetária - CGOF/SP`)

  // ═════════════════════════════════════════════════════════════════════════════════
  // PARCELAMENTO (PARA IGP-M E POUPANÇA)
  // ═════════════════════════════════════════════════════════════════════════════════
  let parcelamento: { numeroParcelas: number; valorParcela: number; valorTotalParcelado: number } | undefined

  console.log("[CALC] numeroParcelas:", parametros.numeroParcelas, "indice:", nomeIndice)
  if (parametros.numeroParcelas && parametros.numeroParcelas > 0) {
    console.log("[CALC] Iniciando parcelamento para", nomeIndice)
    console.log("[CALCULO] Entrando na seção de parcelamento com numeroParcelas:", parametros.numeroParcelas, "e nomeIndice:", nomeIndice)
    const numeroParcelas = Math.floor(parametros.numeroParcelas)
    
    if (nomeIndice === "IGP-M") {
      console.log("[CALCULO] Processando parcelamento para IGP-M")
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
      
      let valorParcelamentoComIGPM = valorCorrigido  // Usar valor já corrigido, não o original
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
        
        // Buscar IGP-M para o período solicitado
        let indicesIGPMCiclo = await obterIndicesPeriodo(
          ciclo.dataInicioIGPM,
          ciclo.dataFimIGPM,
          "IGP-M"
        )
        
        // Se não tiver todos os 12 meses, buscar meses faltantes
        if (indicesIGPMCiclo.length < 12) {
          memoriaCalculo.push(`ℹ️ NOTA: Período contém ${indicesIGPMCiclo.length} meses. Buscando meses faltantes...`)
          memoriaCalculo.push(``)
          
          // Se temos alguns meses, ver qual é o último e tentar completar de antes
          if (indicesIGPMCiclo.length > 0) {
            // Ordenar para encontrar o primeiro mês
            const indicesOrdenados = [...indicesIGPMCiclo].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano
              return a.mes - b.mes
            })
            
            const primeiroMes = indicesOrdenados[0]
            const ultimoMes = indicesOrdenados[indicesOrdenados.length - 1]
            
            // Tentar buscar meses anteriores ao primeiro
            if (indicesIGPMCiclo.length < 12) {
              let mesAnterior = primeiroMes.mes - (12 - indicesIGPMCiclo.length)
              let anoAnterior = primeiroMes.ano
              
              while (mesAnterior <= 0) {
                mesAnterior += 12
                anoAnterior -= 1
              }
              
              const dataInicioAnterior: DataCalculo = {
                dia: ciclo.dataInicioIGPM.dia,
                mes: mesAnterior,
                ano: anoAnterior,
              }
              
              const dataFimAnterior: DataCalculo = {
                dia: ciclo.dataInicioIGPM.dia,
                mes: primeiroMes.mes - 1 <= 0 ? 12 : primeiroMes.mes - 1,
                ano: primeiroMes.mes - 1 <= 0 ? primeiroMes.ano - 1 : primeiroMes.ano,
              }
              
              const indicesAnteriores = await obterIndicesPeriodo(
                dataInicioAnterior,
                dataFimAnterior,
                "IGP-M"
              )
              
              // Juntar índices anteriores com os atuais
              if (indicesAnteriores.length > 0) {
                indicesIGPMCiclo = [...indicesAnteriores, ...indicesIGPMCiclo]
                const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
                memoriaCalculo.push(`✓ Adicionados ${indicesAnteriores.length} mês(es) anterior(es)`)
                memoriaCalculo.push(``)
              }
            }
          }
        }
        
        // Usar até 12 meses ou os que estão disponíveis
        const mesesParaUsar = indicesIGPMCiclo.slice(0, 12)
        
        if (mesesParaUsar.length > 0) {
          // Pegar apenas o ÚLTIMO índice IGP-M disponível (mais recente)
          const igpmInfo = obterUltimoIndiceIGPM(mesesParaUsar)
          const igpmAcumulado = igpmInfo.valor
        const fatorIGPM = 1 + igpmAcumulado / 100
        
        const ultimoIndiceData = igpmInfo.detalhes[0]
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        memoriaCalculo.push(`IGP-M - Último índice disponível: ${nomeMeses[ultimoIndiceData.mes - 1]}/${ultimoIndiceData.ano}: ${igpmAcumulado.toFixed(4)}%`)
        memoriaCalculo.push(``)
        
        memoriaCalculo.push(`Reajuste a ser aplicado: ${igpmAcumulado.toFixed(4)}%`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(``)
        
        cicloAnteriorDetalhes.push({
          ciclo: ciclo.numero,
          periodo: ciclo.periodoDescricao,
          igpmAcumulado,
          descricao: `Ciclo ${ciclo.numero}: ${igpmAcumulado.toFixed(4)}%`
        })
        
      } else {
        memoriaCalculo.push(`⚠️ AVISO: Período não contém 12 meses completos (encontrados: ${indicesIGPMCiclo.length})`)
        memoriaCalculo.push(`Os índices para este ciclo ainda não foram publicados.`)
      }
    }
    
      // Calcular valor final da parcela (DENTRO DO BLOCO IGP-M)
      const valorParcela = valorParcelamentoComIGPM / numeroParcelas
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`=== CÁLCULO FINAL DO PARCELAMENTO ===`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
      memoriaCalculo.push(`Valor após todos os reajustes IGP-M: R$ ${valorParcelamentoComIGPM.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`)
      memoriaCalculo.push(`Número de parcelas: ${numeroParcelas}`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Cronograma de Pagamento:`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`| Parcela | Ciclo | Valor (R$) |`)
      memoriaCalculo.push(`|---------|-------|------------|`)
      
      let parcelasExatas: number[] = [] // Guardar valores exatos para soma precisa
      
      // PASSO 1: Calcular o valor total para cada ciclo ANTES de dividir em parcelas
      // Ciclo 1 (parcelas 1-12): usa valorParcelamentoComIGPM base
      // Ciclo 2 (parcelas 13-24): aplica reajuste do ciclo 1
      const ciclosValores: { ciclo: number; valorTotal: number; parcelasNoCiclo: number }[] = []
      
      // O valor total é para 24 parcelas, mas cada ciclo tem 12
      // Então o valor base para cálculo é o total dividido apropriadamente
      let valorCiclo1 = valorParcelamentoComIGPM // Valor base para ciclo 1 (sem divisão ainda)
      ciclosValores.push({ ciclo: 1, valorTotal: valorCiclo1, parcelasNoCiclo: 12 })
      
      // Se há ciclo 2, aplicar reajuste ANTES de armazenar o valor
      if (numeroParcelas > 12 && cicloAnteriorDetalhes.length > 0) {
        const cicloAnterior = cicloAnteriorDetalhes[0] // Ciclo 1 está no índice 0
        const fatorReajuste = 1 + cicloAnterior.igpmAcumulado / 100
        // Aplicar reajuste ao valor do ciclo 1, depois armazenar como ciclo 2
        const valorCiclo2 = valorCiclo1 * fatorReajuste
        ciclosValores.push({ ciclo: 2, valorTotal: valorCiclo2, parcelasNoCiclo: 12 })
      }
      
      memoriaCalculo.push(`=== DETALHAMENTO POR CICLO ===`)
      ciclosValores.forEach(ciclo => {
        memoriaCalculo.push(`Ciclo ${ciclo.ciclo}: R$ ${ciclo.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ÷ 12 = R$ ${(ciclo.valorTotal / 12).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} por parcela`)
      })
      memoriaCalculo.push(``)
      
      // PASSO 2: Agora dividir cada ciclo em suas parcelas
      for (let i = 1; i <= numeroParcelas; i++) {
        const numeroCiclo = Math.ceil(i / 12)
        const cicloInfo = ciclosValores.find(c => c.ciclo === numeroCiclo)
        
        if (cicloInfo) {
          const valorParcelaExato = cicloInfo.valorTotal / cicloInfo.parcelasNoCiclo
          parcelasExatas.push(valorParcelaExato)
          memoriaCalculo.push(`| ${i} | ${numeroCiclo} | ${valorParcelaExato.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} |`)
        }
      }
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`=== SOMA DAS PARCELAS ===`)
      // PASSO 3: Somar valores EXATOS para obter total preciso
      const somaParcelasComReajuste = parcelasExatas.reduce((acc, val) => acc + val, 0)
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Total: R$ ${somaParcelasComReajuste.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      memoriaCalculo.push(``)
      
      // AGORA criar o objeto parcelamento com valores precisos
      parcelamento = {
        numeroParcelas,
        valorParcela: parcelasExatas[0], // Primeira parcela (ciclo 1)
        valorTotalParcelado: somaParcelasComReajuste, // Total EXATO calculado
      }
    } else if (nomeIndice === "Poupança") {
      console.log("[CALCULO] Processando parcelamento para Poupança com ciclos IGP-M")
      // Para Poupança, aplicar os MESMOS ciclos de reajuste IGP-M que o IGP-M
      const dataParcelamento = parametros.dataParcelamento || {
        dia: new Date().getDate(),
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
      }
      
      // Calcular os ciclos de parcelamento baseado na data atual
      const ciclosInfo = calcularIndicesPorCicloDeParcelamento(numeroParcelas, dataParcelamento, "Poupança")
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`=== PARCELAMENTO EM ${numeroParcelas} PARCELAS (POUPANÇA COM REAJUSTES IGP-M) ===`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Valor total corrigido: R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      memoriaCalculo.push(`Data de referência para cálculo dos ciclos: ${dataParcelamento.dia}/${dataParcelamento.mes}/${dataParcelamento.ano}`)
      memoriaCalculo.push(`(Aplicar reajustes IGP-M a cada 12 meses, igual ao contrato de Poupança)`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Número de parcelas: ${numeroParcelas}`)
      memoriaCalculo.push(``)
      
      let valorParcelamentoPoupanca = valorTotal
      let cicloAnteriorDetalhesPoupanca: Array<{ ciclo: number; periodo: string; igpmAcumulado: number; descricao: string }> = []
      
      // Processar cada ciclo
      for (const ciclo of ciclosInfo.ciclos) {
        memoriaCalculo.push(``)
        memoriaCalculo.push(`CICLO ${ciclo.numero} (Parcelas ${ciclo.parcelaInicio} a ${ciclo.parcelaFim}):`)
        memoriaCalculo.push(`Período de pagamento: ${ciclo.periodoDescricao}`)
        
        memoriaCalculo.push(`Período para cálculo IGP-M acumulado (12 meses ANTES): ${ciclo.periodoIGPMDescricao}`)
        memoriaCalculo.push(``)
        
        // Buscar IGP-M para o período solicitado
        let indicesIGPMCiclo = await obterIndicesPeriodo(
          ciclo.dataInicioIGPM,
          ciclo.dataFimIGPM,
          "IGP-M"
        )
        
        // Se não tiver todos os 12 meses, buscar meses faltantes
        if (indicesIGPMCiclo.length < 12) {
          memoriaCalculo.push(`ℹ️ NOTA: Período contém ${indicesIGPMCiclo.length} meses. Buscando meses faltantes...`)
          memoriaCalculo.push(``)
          
          // Se temos alguns meses, ver qual é o último e tentar completar de antes
          if (indicesIGPMCiclo.length > 0) {
            // Ordenar para encontrar o primeiro mês
            const indicesOrdenados = [...indicesIGPMCiclo].sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano
              return a.mes - b.mes
            })
            
            const primeiroMes = indicesOrdenados[0]
            const ultimoMes = indicesOrdenados[indicesOrdenados.length - 1]
            
            // Tentar buscar meses anteriores ao primeiro
            if (indicesIGPMCiclo.length < 12) {
              let mesAnterior = primeiroMes.mes - (12 - indicesIGPMCiclo.length)
              let anoAnterior = primeiroMes.ano
              
              while (mesAnterior <= 0) {
                mesAnterior += 12
                anoAnterior -= 1
              }
              
              const dataInicioAnterior: DataCalculo = {
                dia: ciclo.dataInicioIGPM.dia,
                mes: mesAnterior,
                ano: anoAnterior,
              }
              
              const dataFimAnterior: DataCalculo = {
                dia: ciclo.dataInicioIGPM.dia,
                mes: primeiroMes.mes - 1 <= 0 ? 12 : primeiroMes.mes - 1,
                ano: primeiroMes.mes - 1 <= 0 ? primeiroMes.ano - 1 : primeiroMes.ano,
              }
              
              const indicesAnteriores = await obterIndicesPeriodo(
                dataInicioAnterior,
                dataFimAnterior,
                "IGP-M"
              )
              
              // Juntar índices anteriores com os atuais
              if (indicesAnteriores.length > 0) {
                indicesIGPMCiclo = [...indicesAnteriores, ...indicesIGPMCiclo]
                memoriaCalculo.push(`✓ Adicionados ${indicesAnteriores.length} mês(es) anterior(es)`)
                memoriaCalculo.push(``)
              }
            }
          }
        }
        
        // Usar até 12 meses ou os que estão disponíveis
        const mesesParaUsar = indicesIGPMCiclo.slice(0, 12)
        
        if (mesesParaUsar.length > 0) {
          // Pegar apenas o ÚLTIMO índice IGP-M disponível (mais recente)
          const igpmInfo = obterUltimoIndiceIGPM(mesesParaUsar)
          const igpmAcumulado = igpmInfo.valor
          const fatorIGPM = 1 + igpmAcumulado / 100
          
          const ultimoIndiceData = igpmInfo.detalhes[0]
          const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
          memoriaCalculo.push(`IGP-M - Último índice disponível: ${nomeMeses[ultimoIndiceData.mes - 1]}/${ultimoIndiceData.ano}: ${igpmAcumulado.toFixed(4)}%`)
          memoriaCalculo.push(``)
          
          memoriaCalculo.push(`Reajuste a ser aplicado: ${igpmAcumulado.toFixed(4)}%`)
          memoriaCalculo.push(``)
          
          cicloAnteriorDetalhesPoupanca.push({
            ciclo: ciclo.numero,
            periodo: ciclo.periodoDescricao,
            igpmAcumulado,
            descricao: `Ciclo ${ciclo.numero}: ${igpmAcumulado.toFixed(4)}%`
          })
        }
      }
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`=== CÁLCULO FINAL DO PARCELAMENTO (POUPANÇA) ===`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      memoriaCalculo.push(`Valor após todos os reajustes IGP-M: R$ ${valorParcelamentoPoupanca.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      memoriaCalculo.push(`Número de parcelas: ${numeroParcelas}`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Cronograma de Pagamento:`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(`| Parcela | Ciclo | Valor (R$) |`)
      memoriaCalculo.push(`|---------|-------|------------|`)
      
      // Calcular valor de parcela base (valor CORRIGIDO dividido por número de parcelas)
      let parcelasExatasPoupanca: number[] = [] // Guardar valores exatos para soma precisa
      let valorAtualPorCiclo = valorParcelamentoPoupanca // Rastrear valor por ciclo
      
      for (let i = 1; i <= numeroParcelas; i++) {
        // Determinar qual ciclo esta parcela pertence
        const numeroCiclo = Math.ceil(i / 12)
        const posicaoNoCiclo = ((i - 1) % 12) + 1 // 1-12 dentro de cada ciclo
        
        // Se mudou de ciclo, aplicar o reajuste do ciclo anterior SOBRE O VALOR TOTAL
        if (posicaoNoCiclo === 1 && i > 1 && cicloAnteriorDetalhesPoupanca.length >= numeroCiclo - 1) {
          // Aplicar reajuste do ciclo anterior para recalcular o valor base do novo ciclo
          // Para ciclo N, usar cicloAnteriorDetalhesPoupanca[N-2] (ex: ciclo 2 usa índice 0 = ciclo 1)
          const cicloAnterior = cicloAnteriorDetalhesPoupanca[numeroCiclo - 2]
          const fatorReajuste = 1 + cicloAnterior.igpmAcumulado / 100
          valorAtualPorCiclo *= fatorReajuste
        }
        
        // Calcular valor EXATO da parcela para este ciclo
        const valorParcelaExato = valorAtualPorCiclo / numeroParcelas
        parcelasExatasPoupanca.push(valorParcelaExato)
        memoriaCalculo.push(`| ${i} | ${numeroCiclo} | ${valorParcelaExato.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |`)
      }
      
      // Somar valores EXATOS para obter total preciso
      const somaParcelasComReajustePoupanca = parcelasExatasPoupanca.reduce((acc, val) => acc + val, 0)
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Total: R$ ${somaParcelasComReajustePoupanca.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      memoriaCalculo.push(``)
      
      // AGORA criar o objeto parcelamento com valores precisos
      parcelamento = {
        numeroParcelas,
        valorParcela: parcelasExatasPoupanca[0], // Primeira parcela (ciclo 1)
        valorTotalParcelado: somaParcelasComReajustePoupanca, // Total EXATO calculado
      }
    }
  }

  console.log("[CALCULO] Função calcularCorrecaoMonetaria concluída com sucesso")
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
    fontes: fonteDoIndice,
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
