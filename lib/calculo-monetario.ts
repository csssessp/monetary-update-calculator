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
import {
  obterSerieDiaria,
  formatarData,
  INICIO_REGRA_NOVA_POUPANCA,
  SERIE_POUPANCA_NOVA,
  SERIE_POUPANCA_ANTIGA,
  SERIE_TR_DIARIA,
  SERIE_SELIC_DIARIA,
  SERIE_CDI_DIARIA,
} from "./series-diarias"

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
  reajustarParcelasComIPCA?: boolean // Aplicar IPCA acumulado a cada 12 meses
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

// Meses cujo índice deve ser aplicado no período – regra especial para poupança (aniversários)
export function mesesEsperadosPeriodo(
  dataInicial: DataCalculo,
  dataFinal: DataCalculo,
  nomeIndice: string,
): { mes: number; ano: number }[] {
  const meses: { mes: number; ano: number }[] = []

  if (getIndiceNome(nomeIndice) === "Poupança") {
    let dataAtual = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
    const dataFim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

    while (dataAtual < dataFim) {
      const proximoAniversario = new Date(dataAtual)
      proximoAniversario.setMonth(proximoAniversario.getMonth() + 1)

      if (proximoAniversario <= dataFim) {
        meses.push({ mes: proximoAniversario.getMonth() + 1, ano: proximoAniversario.getFullYear() })
      }
      dataAtual = proximoAniversario
    }
  } else {
    // Para IGP-M: sempre começar no mês solicitado, independente do dia
    // Se dataInicial.dia > 15, ainda contamos o mês inteiro
    let mesAtual = dataInicial.mes
    let anoAtual = dataInicial.ano

    while (anoAtual < dataFinal.ano || (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)) {
      meses.push({ mes: mesAtual, ano: anoAtual })
      mesAtual++
      if (mesAtual > 12) {
        mesAtual = 1
        anoAtual++
      }
    }
  }

  return meses
}

// Obter índices do período (apenas os meses com dado disponível)
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
  for (const { mes, ano } of mesesEsperadosPeriodo(dataInicial, dataFinal, nomeIndice)) {
    const indiceDoMes = indices.find((i) => i.mes === mes && i.ano === ano)
    if (indiceDoMes) indicesPeriodo.push(indiceDoMes)
  }

  return indicesPeriodo
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATOR DE CORREÇÃO DO PERÍODO — metodologia da Calculadora do Cidadão (BCB)
// ═══════════════════════════════════════════════════════════════════════════════
//  • IGP-M, IPCA, INPC ("mensal"): ∏(1 + taxa_mês/100) do mês inicial ao mês final, inclusive
//  • Poupança, TR ("aniversário"): períodos DD/MM → DD/MM+1 a partir da data inicial;
//    cada período usa a taxa da série diária na data de início do período
//    (dias 29, 30 e 31 passam para o dia 01 do mês seguinte).
//    Poupança: série 195 (depósitos a partir de 04/05/2012) ou 25 (regra antiga). TR: série 226.
//  • SELIC, CDI ("diária"): ∏(1 + taxa_dia/100) para cada dia útil em [data inicial, data final)
//    Séries 11 (SELIC) e 12 (CDI).
// Validado contra https://www3.bcb.gov.br/CALCIDADAO com precisão de 8 casas decimais.
// ═══════════════════════════════════════════════════════════════════════════════

export type MetodologiaIndice = "mensal" | "aniversario" | "diaria"

export function metodologiaDoIndice(nomeIndice: string): MetodologiaIndice {
  const nome = getIndiceNome(nomeIndice)
  if (nome === "Poupança" || nome === "TR") return "aniversario"
  if (nome === "SELIC" || nome === "CDI") return "diaria"
  return "mensal"
}

export interface FatorPeriodo {
  fator: number // fator acumulado com base 1
  linhas: DetalheLinha[] // valorAcumulado com base 1 (quem chama reescala)
  rotulos: string[] // rótulo de cada linha para a memória de cálculo
  aplicados: number
  esperados: number
  descricao: string[] // metodologia e fonte, para a memória de cálculo
  avisos: string[] // aproximações ou dados faltantes
}

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const paraDate = (d: DataCalculo) => new Date(d.ano, d.mes - 1, d.dia)
const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const fmtCurta = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`

async function fatorMensal(di: DataCalculo, df: DataCalculo, indice: string): Promise<FatorPeriodo> {
  const indices = await obterIndicesPeriodo(di, df, indice)
  const r: FatorPeriodo = { fator: 1, linhas: [], rotulos: [], aplicados: 0, esperados: 0, descricao: [], avisos: [] }
  r.descricao.push(`Metodologia: variação mensal, do mês inicial ao mês final (inclusive) — igual à Calculadora do Cidadão.`)
  for (const { mes, ano } of mesesEsperadosPeriodo(di, df, indice)) {
    r.esperados++
    const dado = indices.find((x) => x.mes === mes && x.ano === ano)
    if (dado) {
      r.aplicados++
      const fm = 1 + dado.valor / 100
      r.fator *= fm
      r.linhas.push({ mes, ano, pendente: false, percentual: dado.valor, fatorMensal: fm, fatorAcumulado: r.fator, valorAcumulado: r.fator })
    } else {
      r.linhas.push({ mes, ano, pendente: true, fatorAcumulado: r.fator, valorAcumulado: r.fator })
    }
    r.rotulos.push(`${NOMES_MES[mes - 1]}/${ano}`)
  }
  if (r.aplicados < r.esperados) {
    r.avisos.push(`${r.esperados - r.aplicados} mês(es) sem índice publicado — o fator não inclui esses meses. Atualize os índices ou aguarde a divulgação oficial.`)
  }
  return r
}

async function fatorAniversario(di: DataCalculo, df: DataCalculo, indice: string): Promise<FatorPeriodo> {
  const nome = getIndiceNome(indice)
  const r: FatorPeriodo = { fator: 1, linhas: [], rotulos: [], aplicados: 0, esperados: 0, descricao: [], avisos: [] }
  const inicio = paraDate(di)
  const fim = paraDate(df)

  const dia = di.dia > 28 ? 1 : di.dia
  const periodos: { inicio: Date; fim: Date }[] = []
  let base = new Date(di.ano, di.mes - 1 + (di.dia > 28 ? 1 : 0), dia)
  while (true) {
    const proximo = new Date(base.getFullYear(), base.getMonth() + 1, dia)
    if (proximo > fim) break
    periodos.push({ inicio: base, fim: proximo })
    base = proximo
  }

  let serie: number
  if (nome === "Poupança") {
    const regraNova = inicio >= INICIO_REGRA_NOVA_POUPANCA
    serie = regraNova ? SERIE_POUPANCA_NOVA : SERIE_POUPANCA_ANTIGA
    r.descricao.push(
      `Metodologia: rendimento nos aniversários (dia ${dia}), taxa vigente no início de cada período — igual à Calculadora do Cidadão.`,
      `Regra da poupança: ${regraNova ? "NOVA (depósitos a partir de 04/05/2012)" : "ANTIGA (depósitos até 03/05/2012)"} — BCB série ${serie}.`,
    )
  } else {
    serie = SERIE_TR_DIARIA
    r.descricao.push(
      `Metodologia: TR aplicada nos aniversários (dia ${dia}), taxa do período iniciado em cada aniversário — igual à Calculadora do Cidadão.`,
      `Fonte: BCB série ${serie} (TR diária por data de início).`,
    )
  }
  if (di.dia > 28) r.descricao.push(`Data inicial no dia ${di.dia}: aniversários contados a partir do dia 01 do mês seguinte (regra BCB).`)

  let taxas: Map<string, number> | null = null
  if (periodos.length > 0) {
    try {
      taxas = await obterSerieDiaria(serie, periodos[0].inicio, periodos[periodos.length - 1].inicio)
    } catch (erro) {
      r.avisos.push(`Não foi possível consultar a série diária ${serie} do BCB (${erro instanceof Error ? erro.message : erro}).`)
    }
  }

  // Fallback: taxa mensal armazenada (dia 01 do mês de início do período)
  const mensais = new Map<string, number>()
  for (const d of await obterIndicesAtualizados(indice)) mensais.set(`${d.ano}-${d.mes}`, d.valor)

  let aproximados = 0
  for (const p of periodos) {
    r.esperados++
    const mes = p.fim.getMonth() + 1
    const ano = p.fim.getFullYear()
    r.rotulos.push(`${fmtCurta(p.inicio)} a ${fmtCurta(p.fim)}`)
    let taxa = taxas?.get(formatarData(p.inicio))
    if (taxa === undefined) {
      const mensal = mensais.get(`${p.inicio.getFullYear()}-${p.inicio.getMonth() + 1}`)
      if (mensal !== undefined) {
        taxa = mensal
        aproximados++
      }
    }
    if (taxa === undefined) {
      r.linhas.push({ mes, ano, pendente: true, fatorAcumulado: r.fator, valorAcumulado: r.fator })
      continue
    }
    r.aplicados++
    const fm = 1 + taxa / 100
    r.fator *= fm
    r.linhas.push({ mes, ano, pendente: false, percentual: taxa, fatorMensal: fm, fatorAcumulado: r.fator, valorAcumulado: r.fator })
  }

  if (aproximados > 0) {
    r.avisos.push(
      `${aproximados} período(s) calculado(s) com a taxa mensal armazenada (dia 01) por indisponibilidade da taxa diária do BCB — resultado APROXIMADO. Refaça o cálculo com conexão ao BCB para o valor oficial.`,
    )
  }
  if (r.aplicados < r.esperados) {
    r.avisos.push(`${r.esperados - r.aplicados} período(s) sem taxa publicada — o fator não inclui esses períodos.`)
  }
  if (periodos.length === 0) {
    r.descricao.push(`Nenhum aniversário completo entre as datas informadas: não há rendimento no período.`)
  }
  return r
}

async function fatorDiario(di: DataCalculo, df: DataCalculo, indice: string): Promise<FatorPeriodo> {
  const nome = getIndiceNome(indice)
  const serie = nome === "CDI" ? SERIE_CDI_DIARIA : SERIE_SELIC_DIARIA
  const r: FatorPeriodo = { fator: 1, linhas: [], rotulos: [], aplicados: 0, esperados: 0, descricao: [], avisos: [] }
  const inicio = paraDate(di)
  const fim = paraDate(df)
  r.descricao.push(
    `Metodologia: taxa ${nome} diária acumulada em cada dia útil de ${fmtCurta(inicio)} (inclusive) a ${fmtCurta(fim)} (exclusive) — igual à Calculadora do Cidadão.`,
    `Fonte: BCB série ${serie} (% ao dia). Linhas abaixo agrupam os dias úteis por mês.`,
  )
  if (fim <= inicio) return r

  const ultimoDia = somarDias(fim, -1)
  let taxas: Map<string, number>
  try {
    taxas = await obterSerieDiaria(serie, inicio, ultimoDia)
  } catch (erro) {
    // Fallback: taxa mensal acumulada armazenada (meses inteiros)
    r.avisos.push(
      `Não foi possível consultar a série diária ${serie} do BCB (${erro instanceof Error ? erro.message : erro}). ` +
        `Usada a taxa mensal acumulada armazenada, considerando meses inteiros — resultado APROXIMADO. Refaça o cálculo com conexão ao BCB para o valor oficial.`,
    )
    const mensal = await fatorMensal(di, { ...df, dia: 1, mes: ultimoDia.getMonth() + 1, ano: ultimoDia.getFullYear() }, indice)
    return { ...mensal, descricao: r.descricao, avisos: [...r.avisos, ...mensal.avisos] }
  }

  let ultimaDataComTaxa: Date | null = null
  let d = new Date(inicio)
  while (d < fim) {
    const mes = d.getMonth() + 1
    const ano = d.getFullYear()
    const inicioMes = new Date(d)
    let fatorMes = 1
    let diasUteis = 0
    while (d < fim && d.getMonth() + 1 === mes) {
      const taxa = taxas.get(formatarData(d))
      if (taxa !== undefined) {
        fatorMes *= 1 + taxa / 100
        diasUteis++
        ultimaDataComTaxa = new Date(d)
      }
      d = somarDias(d, 1)
    }
    r.esperados++
    r.rotulos.push(`${fmtCurta(inicioMes)} a ${fmtCurta(somarDias(d, -1))} (${diasUteis} dias úteis)`)
    if (diasUteis === 0) {
      r.linhas.push({ mes, ano, pendente: true, fatorAcumulado: r.fator, valorAcumulado: r.fator })
      continue
    }
    r.aplicados++
    r.fator *= fatorMes
    r.linhas.push({ mes, ano, pendente: false, percentual: (fatorMes - 1) * 100, fatorMensal: fatorMes, fatorAcumulado: r.fator, valorAcumulado: r.fator })
  }

  // Taxas publicadas só até dias úteis passados: avisar se o fim do período ainda não tem taxa
  if (!ultimaDataComTaxa || ultimoDia.getTime() - ultimaDataComTaxa.getTime() > 5 * 86400000) {
    r.avisos.push(
      `Taxas diárias publicadas pelo BCB até ${ultimaDataComTaxa ? fmtCurta(ultimaDataComTaxa) : "—"}; os dias seguintes até ${fmtCurta(ultimoDia)} ainda não têm taxa e não foram corrigidos.`,
    )
  }
  return r
}

export async function calcularFatorPeriodo(di: DataCalculo, df: DataCalculo, indice: string): Promise<FatorPeriodo> {
  const metodologia = metodologiaDoIndice(indice)
  if (metodologia === "aniversario") return fatorAniversario(di, df, indice)
  if (metodologia === "diaria") return fatorDiario(di, df, indice)
  return fatorMensal(di, df, indice)
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

  // Deflação: data final anterior à inicial → fator = 1 / fator(final → inicial)
  const deflacao = paraDate(parametros.dataFinal) < paraDate(parametros.dataInicial)
  const periodoDe = deflacao ? parametros.dataFinal : parametros.dataInicial
  const periodoAte = deflacao ? parametros.dataInicial : parametros.dataFinal

  // Período (exibição)
  const periodo = calcularDiferencaData(periodoDe, periodoAte)
  memoriaCalculo.push(`Período: ${periodo.meses} meses e ${periodo.dias} dias`)

  // Fator e memorial em passo único — consistência total entre exibição e resultado
  const fp = await calcularFatorPeriodo(periodoDe, periodoAte, parametros.indice)
  const fatorCorrecao = deflacao ? 1 / fp.fator : fp.fator
  // Valor na data mais antiga do período; as linhas mostram sua evolução até a data mais recente
  const valorBase = deflacao ? parametros.valorOriginal / fp.fator : parametros.valorOriginal
  const detalhamentoIGPM: DetalheLinha[] = fp.linhas.map((l) => ({ ...l, valorAcumulado: valorBase * l.fatorAcumulado }))

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== DETALHAMENTO — ${nomeIndice} (Metodologia: BCB Calculadora do Cidadão) ===`)
  for (const linha of fp.descricao) memoriaCalculo.push(linha)
  if (deflacao) {
    memoriaCalculo.push(
      `DEFLAÇÃO: data final anterior à inicial. Tabela calculada de ${fmtCurta(paraDate(periodoDe))} a ${fmtCurta(paraDate(periodoAte))}; fator aplicado = 1 / ${fp.fator.toFixed(8)}.`,
    )
  }

  if (fp.esperados === 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Nenhum período de correção entre as datas informadas (fator = 1).`)
  } else {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`| # | Período | ${nomeIndice} (%) | Fator do Período | Fator Acumulado | Valor Acumulado (R$) |`)
    memoriaCalculo.push(`|---|---------|${"−".repeat(Math.max(nomeIndice.length + 6, 14))}|------------------|-----------------|---------------------|`)
    let contador = 0
    detalhamentoIGPM.forEach((l, i) => {
      if (l.pendente) {
        memoriaCalculo.push(`|  — | ${fp.rotulos[i]} | ⚠ não disponível | — | ${l.fatorAcumulado.toFixed(8)} | — |`)
        return
      }
      contador++
      memoriaCalculo.push(
        `| ${String(contador).padStart(2, " ")} | ${fp.rotulos[i]} | ${l.percentual!.toFixed(6).replace(".", ",")} | ${l.fatorMensal!.toFixed(8)} | ${l.fatorAcumulado.toFixed(8)} | R$ ${l.valorAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |`,
      )
    })
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Períodos com índice aplicado: ${fp.aplicados} de ${fp.esperados}`)
  }
  for (const aviso of fp.avisos) memoriaCalculo.push(`⚠ ATENÇÃO: ${aviso}`)

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
      "Banco Central do Brasil — Série BCB 28655 (IGP-M, mesma da Calculadora do Cidadão)",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.28655/dados",
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
      "Banco Central do Brasil — Séries BCB 195 (regra nova) e 25 (regra antiga), taxa diária por aniversário",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados",
    ],
    "CDI": [
      "CDI (Certificado de Depósito Interbancário) — taxa acumulada ao mês",
      "Banco Central do Brasil — Série BCB 12 (CDI diário)",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados",
    ],
    "SELIC": [
      "SELIC (Sistema Especial de Liquidação e de Custódia) — taxa efetiva acumulada ao mês",
      "Banco Central do Brasil — Série BCB 11 (SELIC diária)",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados",
    ],
    "TR": [
      "TR (Taxa Referencial) — taxa mensal",
      "Banco Central do Brasil — Série BCB 226 (TR diária por data de início)",
      "API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados",
    ],
  }

  const fonteDoIndice = fontesPorIndice[nomeIndice] || [`${nomeIndice} — Banco Central do Brasil`]
  fonteDoIndice.forEach((linha) => memoriaCalculo.push(linha))

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Cálculo realizado em: ${new Date().toLocaleString("pt-BR")}`)
  memoriaCalculo.push(`Sistema: Calculadora de Atualização Monetária - CGOF/SP`)

  // ═════════════════════════════════════════════════════════════════════════════════
  // PARCELAMENTO — funciona com qualquer índice; IPCA reajuste a cada 12 meses (opcional)
  // ═════════════════════════════════════════════════════════════════════════════════
  let parcelamento: { numeroParcelas: number; valorParcela: number; valorTotalParcelado: number } | undefined

  if (parametros.numeroParcelas && parametros.numeroParcelas > 0) {
    const numeroParcelas = Math.floor(parametros.numeroParcelas)
    const valorBase = valorTotal
    const valorParcelaBase = valorBase / numeroParcelas
    const hoje = new Date()
    const dataParcelamento = parametros.dataParcelamento || {
      dia: hoje.getDate(),
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
    }

    const nomeMesesFull = [
      "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
    ]
    const nomeMesesAbrev = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]

    const numCiclos = Math.ceil(numeroParcelas / 12)
    const ciclos: Array<{
      numero: number
      parcelaInicio: number
      parcelaFim: number
      dataInicio: DataCalculo
      dataFim: DataCalculo
    }> = []

    let mesC = dataParcelamento.mes
    let anoC = dataParcelamento.ano
    for (let c = 0; c < numCiclos; c++) {
      const parcelaInicio = c * 12 + 1
      const parcelaFim = Math.min((c + 1) * 12, numeroParcelas)
      const dataInicio: DataCalculo = { dia: dataParcelamento.dia, mes: mesC, ano: anoC }
      let mesFim = mesC + 11
      let anoFim = anoC
      while (mesFim > 12) { mesFim -= 12; anoFim++ }
      const dataFim: DataCalculo = { dia: dataParcelamento.dia, mes: mesFim, ano: anoFim }
      ciclos.push({ numero: c + 1, parcelaInicio, parcelaFim, dataInicio, dataFim })
      mesFim++
      if (mesFim > 12) { mesFim = 1; anoFim++ }
      mesC = mesFim
      anoC = anoFim
    }

    const fatorIPCAPorCiclo: number[] = [1]
    let ipcaAcumuladoLabel = ""

    if (parametros.reajustarParcelasComIPCA && numCiclos > 1) {
      let mesIPCAInicio = dataParcelamento.mes - 12
      let anoIPCAInicio = dataParcelamento.ano
      while (mesIPCAInicio <= 0) { mesIPCAInicio += 12; anoIPCAInicio-- }
      let mesIPCAFim = mesIPCAInicio + 11
      let anoIPCAFim = anoIPCAInicio
      while (mesIPCAFim > 12) { mesIPCAFim -= 12; anoIPCAFim++ }
      const dataIPCAInicio: DataCalculo = { dia: 1, mes: mesIPCAInicio, ano: anoIPCAInicio }
      const dataIPCAFim: DataCalculo = { dia: 28, mes: mesIPCAFim, ano: anoIPCAFim }

      try {
        const indicesIPCA = await obterIndicesPeriodo(dataIPCAInicio, dataIPCAFim, "IPCA")
        if (indicesIPCA.length > 0) {
          let fatorAcumulado = 1
          for (const idx of indicesIPCA) {
            fatorAcumulado *= (1 + idx.valor / 100)
          }
          const ipcaAcum = (fatorAcumulado - 1) * 100
          ipcaAcumuladoLabel = `IPCA acumulado (${nomeMesesAbrev[mesIPCAInicio - 1]}/${anoIPCAInicio} a ${nomeMesesAbrev[mesIPCAFim - 1]}/${anoIPCAFim}, ${indicesIPCA.length} meses): ${ipcaAcum.toFixed(4).replace(".", ",")}%  →  fator: ${fatorAcumulado.toFixed(6)}`
          let fatorCumulativo = 1
          for (let c = 1; c < numCiclos; c++) {
            fatorCumulativo *= fatorAcumulado
            fatorIPCAPorCiclo.push(fatorCumulativo)
          }
        } else {
          ipcaAcumuladoLabel = "⚠️ Índices IPCA não encontrados para o período de referência — reajuste não aplicado."
          for (let c = 1; c < numCiclos; c++) fatorIPCAPorCiclo.push(1)
        }
      } catch (err) {
        ipcaAcumuladoLabel = `⚠️ Erro ao buscar IPCA (${err}) — reajuste não aplicado.`
        for (let c = 1; c < numCiclos; c++) fatorIPCAPorCiclo.push(1)
      }
    } else {
      for (let c = 1; c < numCiclos; c++) fatorIPCAPorCiclo.push(1)
    }

    memoriaCalculo.push(``)
    memoriaCalculo.push(`═══════════════════════════════════════════════════════════`)
    memoriaCalculo.push(`PARCELAMENTO EM ${numeroParcelas} PARCELAS`)
    memoriaCalculo.push(`═══════════════════════════════════════════════════════════`)
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Valor base (total corrigido): R$ ${valorBase.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Parcela base (1º ciclo):      R$ ${valorParcelaBase.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Data de início:               ${String(dataParcelamento.dia).padStart(2, "0")}/${String(dataParcelamento.mes).padStart(2, "0")}/${dataParcelamento.ano}`)
    if (parametros.reajustarParcelasComIPCA) {
      memoriaCalculo.push(`Reajuste IPCA a cada 12 meses: SIM`)
      if (ipcaAcumuladoLabel) memoriaCalculo.push(ipcaAcumuladoLabel)
    } else {
      memoriaCalculo.push(`Reajuste IPCA a cada 12 meses: NÃO`)
    }
    memoriaCalculo.push(``)
    memoriaCalculo.push(`Parcela | Ciclo | Vencimento  | Valor (R$)`)
    memoriaCalculo.push(`--------|-------|-------------|------------------------------`)

    const valoresParcelas: number[] = []

    for (const ciclo of ciclos) {
      const fator = fatorIPCAPorCiclo[ciclo.numero - 1]
      const valorParcela = valorParcelaBase * fator

      if (ciclo.numero > 1 && parametros.reajustarParcelasComIPCA) {
        memoriaCalculo.push(`        |       | >>> Reajuste IPCA Ciclo ${ciclo.numero}: ×${fator.toFixed(6)} = R$ ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/parcela`)
      }

      for (let p = ciclo.parcelaInicio; p <= ciclo.parcelaFim; p++) {
        valoresParcelas.push(valorParcela)
        const mesesOffset = p - 1
        let mesVenc = dataParcelamento.mes + mesesOffset
        let anoVenc = dataParcelamento.ano
        while (mesVenc > 12) { mesVenc -= 12; anoVenc++ }
        const mesAbrev = nomeMesesAbrev[mesVenc - 1]
        memoriaCalculo.push(`${String(p).padStart(7)} | ${String(ciclo.numero).padStart(5)} | ${mesAbrev}/${anoVenc}     | ${valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      }
    }

    const totalParcelado = valoresParcelas.reduce((a, b) => a + b, 0)
    memoriaCalculo.push(`--------|-------|-------------|------------------------------`)
    memoriaCalculo.push(`  TOTAL |       |             | ${totalParcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    memoriaCalculo.push(``)

    parcelamento = {
      numeroParcelas,
      valorParcela: valoresParcelas[0],
      valorTotalParcelado: totalParcelado,
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

  // new Date(2025, 1, 31) "rola" para 03/03 — conferir se o dia informado existe no mês
  const existe = (d: DataCalculo, dt: Date) =>
    !isNaN(dt.getTime()) && dt.getDate() === d.dia && dt.getMonth() === d.mes - 1 && dt.getFullYear() === d.ano
  if (!existe(dataInicial, inicio)) erros.push(`Data inicial inválida: ${dataInicial.dia}/${dataInicial.mes}/${dataInicial.ano} não existe`)
  if (!existe(dataFinal, fim)) erros.push(`Data final inválida: ${dataFinal.dia}/${dataFinal.mes}/${dataFinal.ano} não existe`)
  if (fim < inicio) erros.push("ATENÇÃO: Data final anterior à inicial - será realizado deflacionamento")

  return erros
}
