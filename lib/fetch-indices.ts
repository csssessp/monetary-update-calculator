import { IndiceData, CHAVE_VERSAO_CACHE, VERSAO_CACHE_INDICES } from "./indices-data"
import { obterSerieDiaria, SERIE_SELIC_DIARIA } from "./series-diarias"

/**
 * Construir URL para API BCB SGS - funciona tanto server-side (direto) quanto client-side (via proxy)
 */
function buildBCBUrl(serie: number): string {
  if (typeof window !== "undefined") {
    // Client-side: usar proxy para contornar CORS
    return `/api/proxy-bcb?serie=${serie}`
  }
  // Server-side: chamar API do BCB diretamente
  const dataFinal = new Date()
  const dataInicial = new Date()
  dataInicial.setFullYear(dataInicial.getFullYear() - 10)
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${fmt(dataInicial)}&dataFinal=${fmt(dataFinal)}`
}

/**
 * Buscar Poupança do BCB (série 195 - remuneração mensal dos depósitos de poupança)
 */
async function fetchPoupancaFromBCB(): Promise<IndiceData[]> {
  try {
    const url = buildBCBUrl(195)
    console.log(`[FETCH] Buscando Poupança: ${url}`)
    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      console.warn(`BCB API (Poupança série 195) returned ${response.status}, tentando série 25...`)
      // Fallback: série 25 (diária) via proxy
      return await fetchPoupancaSerie25()
    }

    const data = await response.json()
    const indices: IndiceData[] = []

    if (Array.isArray(data)) {
      // Agrupar por mês-ano e pegar ÚLTIMO valor útil de cada mês
      // (o valor do último dia do período de aniversário é o correto)
      const monthMap = new Map<string, IndiceData>()

      for (const item of data) {
        if (item.data && item.valor) {
          const dateParts = item.data.split("/")
          const day = parseInt(dateParts[0])
          const month = parseInt(dateParts[1])
          const year = parseInt(dateParts[2])
          const dateKey = `${month}-${year}`

          // Validar valores
          const valor = parseFloat(item.valor.replace(",", "."))

          if (year >= 1989 && month >= 1 && month <= 12 && !isNaN(valor) && valor > 0) {
            // Sempre sobrescreve com o valor mais recente (último do mês)
            monthMap.set(dateKey, {
              mes: month,
              ano: year,
              valor,
            })
          }
        }
      }

      // Converter map para array
      indices.push(...Array.from(monthMap.values()))
    }

    const resultado = indices.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] Poupança BCB: ${resultado.length} registros fetched (${resultado.length > 0 ? `${resultado[0].ano}-${resultado[resultado.length - 1].ano}` : "vazio"})`)
    return resultado
  } catch (error) {
    console.error("Error fetching Poupança from BCB:", error)
    // Tentar série 25 como último recurso
    try {
      return await fetchPoupancaSerie25()
    } catch {
      return []
    }
  }
}

/**
 * Fallback: Buscar Poupança do BCB (série 25 - diária)
 */
async function fetchPoupancaSerie25(): Promise<IndiceData[]> {
  try {
    const url = buildBCBUrl(25)
    console.log(`[FETCH] Poupança BCB (série 25 fallback): ${url}`)
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return []

    const data = await response.json()
    const indices: IndiceData[] = []
    if (Array.isArray(data)) {
      const monthMap = new Map<string, IndiceData>()
      for (const item of data) {
        if (item.data && item.valor) {
          const dateParts = item.data.split("/")
          const month = parseInt(dateParts[1])
          const year = parseInt(dateParts[2])
          const valor = parseFloat(item.valor.replace(",", "."))
          if (year >= 1989 && month >= 1 && month <= 12 && !isNaN(valor) && valor > 0) {
            monthMap.set(`${month}-${year}`, { mes: month, ano: year, valor })
          }
        }
      }
      indices.push(...Array.from(monthMap.values()))
    }
    return indices.sort((a, b) => a.ano - b.ano || a.mes - b.mes)
  } catch (error) {
    console.error("Error fetching Poupança série 25:", error)
    return []
  }
}

/**
 * Buscar IGP-M do BCB (série 28655 — mesma da Calculadora do Cidadão, precisão completa)
 * A série 189 é arredondada em 2 casas e acumula erro em períodos longos
 */
async function fetchIGPMFromBCB(): Promise<IndiceData[]> {
  try {
    const url = buildBCBUrl(28655)
    console.log(`[FETCH] Buscando IGP-M: ${url}`)
    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      // Sem fallback para Ipeadata: seus valores são arredondados e sobrescreveriam os dados exatos armazenados
      console.warn(`BCB API (IGP-M) returned ${response.status}`)
      return []
    }

    const data = await response.json()
    const indices: IndiceData[] = []

    if (Array.isArray(data)) {
      const monthMap = new Map<string, IndiceData>()

      for (const item of data) {
        if (item.data && item.valor) {
          const dateParts = item.data.split("/")
          const month = parseInt(dateParts[1])
          const year = parseInt(dateParts[2])
          const dateKey = `${month}-${year}`

          // Pega último valor do mês (mais confiável)
          const valor = parseFloat(item.valor.replace(",", "."))

          if (year >= 1989 && month >= 1 && month <= 12 && !isNaN(valor)) {
            // Sempre sobrescreve com o valor mais recente (último do mês)
            monthMap.set(dateKey, {
              mes: month,
              ano: year,
              valor,
            })
          }
        }
      }

      indices.push(...Array.from(monthMap.values()))
    }

    const resultado = indices.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] IGP-M BCB: ${resultado.length} registros fetched (${resultado.length > 0 ? `${resultado[0].ano}-${resultado[resultado.length - 1].ano}` : "vazio"})`)
    return resultado
  } catch (error) {
    console.error("Error fetching IGP-M from BCB:", error)
    return []
  }
}

/**
 * Buscar série genérica do BCB SGS e extrair dados mensais.
 * soMesesFechados: descarta o mês corrente (CDI/SELIC publicam acumulado parcial do mês em curso).
 */
async function fetchSerieBCBGenerica(serie: number, nome: string, soMesesFechados = false): Promise<IndiceData[]> {
  try {
    const url = buildBCBUrl(serie)
    console.log(`[FETCH] Buscando ${nome} (série ${serie}): ${url}`)
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
      console.warn(`BCB API (${nome} série ${serie}) returned ${response.status}`)
      return []
    }
    const data = await response.json()
    if (!Array.isArray(data)) return []

    const hoje = new Date()
    const mesCorrente = hoje.getFullYear() * 12 + hoje.getMonth() + 1
    const monthMap = new Map<string, IndiceData>()
    for (const item of data) {
      if (item.data && item.valor) {
        const dateParts = item.data.split("/")
        const month = parseInt(dateParts[1])
        const year = parseInt(dateParts[2])
        const valor = parseFloat(item.valor.replace(",", "."))
        if (soMesesFechados && year * 12 + month >= mesCorrente) continue
        if (year >= 1980 && month >= 1 && month <= 12 && !isNaN(valor)) {
          monthMap.set(`${month}-${year}`, { mes: month, ano: year, valor })
        }
      }
    }
    const resultado = Array.from(monthMap.values()).sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    console.log(`[FETCH] ${nome}: ${resultado.length} registros`)
    return resultado
  } catch (error) {
    console.error(`Error fetching ${nome}:`, error)
    return []
  }
}

export async function fetchAllIndices(): Promise<{
  "IGP-M": IndiceData[]
  "Poupança": IndiceData[]
  "IPCA": IndiceData[]
  "INPC": IndiceData[]
  "CDI": IndiceData[]
  "SELIC": IndiceData[]
  "TR": IndiceData[]
  timestamp: string
  successCount: number
}> {
  const results = {
    "IGP-M": [] as IndiceData[],
    "Poupança": [] as IndiceData[],
    "IPCA": [] as IndiceData[],
    "INPC": [] as IndiceData[],
    "CDI": [] as IndiceData[],
    "SELIC": [] as IndiceData[],
    "TR": [] as IndiceData[],
    timestamp: new Date().toISOString(),
    successCount: 0,
  }

  // Fetch todos os índices em paralelo
  // Poupança NÃO é buscada do BCB pois a série 195 retorna valores diários que divergem
  // dos índices mensais publicados (debit.com.br). Os dados da Poupança são mantidos
  // manualmente nos dados estáticos em lib/indices-data.ts.
  const [igpmResult, ipcaResult, inpcResult, cdiResult, selicResult, trResult] =
    await Promise.allSettled([
      fetchIGPMFromBCB(),
      fetchSerieBCBGenerica(433, "IPCA"),
      fetchSerieBCBGenerica(188, "INPC"),
      fetchSerieBCBGenerica(4391, "CDI", true),
      fetchSerieBCBGenerica(4390, "SELIC", true),
      // TR: série 7811 (mensal, primeiro dia do mês). A 226 é diária e o BCB recusa consulta sem datas.
      fetchSerieBCBGenerica(7811, "TR"),
    ])

  const indexMapping: [PromiseSettledResult<IndiceData[]>, string][] = [
    [igpmResult, "IGP-M"],
    [ipcaResult, "IPCA"],
    [inpcResult, "INPC"],
    [cdiResult, "CDI"],
    [selicResult, "SELIC"],
    [trResult, "TR"],
  ]

  for (const [result, name] of indexMapping) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      (results as any)[name] = result.value
      results.successCount++
      console.log(`[SUCCESS] ${name}: ${result.value.length} registros obtidos`)
    } else {
      console.warn(`[WARNING] ${name}: Falha ao obter dados`)
    }
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATUALIZAÇÃO COM PROGRESSO (botão "Atualizar índices" e aviso mensal)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ItemAtualizacao {
  nome: string
  ok: boolean
  registros: number
  ultimo?: string // "MM/AAAA" (índices mensais) ou "DD/MM/AAAA" (taxas diárias)
  erro?: string
}

export interface RelatorioAtualizacao {
  data: string // ISO
  mesReferencia: string // "AAAA-MM" em que a atualização foi feita
  sucesso: boolean
  itens: ItemAtualizacao[]
}

export interface ProgressoAtualizacao {
  concluidos: number
  total: number
  etapa: string
}

const CHAVE_RELATORIO = "indices_relatorio"
const CHAVE_MES_ATUALIZACAO = "indices_mes_atualizacao"

export function mesReferenciaAtual(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
}

export function lerRelatorioAtualizacao(): RelatorioAtualizacao | null {
  if (typeof window === "undefined") return null
  try {
    const bruto = localStorage.getItem(CHAVE_RELATORIO)
    return bruto ? (JSON.parse(bruto) as RelatorioAtualizacao) : null
  } catch {
    return null
  }
}

/** true quando ainda não houve atualização completa bem-sucedida no mês corrente */
export function precisaAtualizarNoMes(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(CHAVE_MES_ATUALIZACAO) !== mesReferenciaAtual()
  } catch {
    return true
  }
}

const fmtMesAno = (d: IndiceData) => `${String(d.mes).padStart(2, "0")}/${d.ano}`

/**
 * Atualiza todos os índices a partir do BCB, reportando o progresso etapa por etapa.
 * Índices mensais vão para o localStorage (mesclados com os dados estáticos no cálculo);
 * Poupança é complementada pela rota /api/poupanca-indices; as taxas diárias
 * (Poupança, TR, SELIC, CDI) são consultadas no momento do cálculo — aqui só se confirma o acesso.
 */
export async function atualizarIndicesComProgresso(
  onProgresso?: (p: ProgressoAtualizacao) => void,
): Promise<RelatorioAtualizacao> {
  const etapas: { nome: string; executar: () => Promise<ItemAtualizacao> }[] = [
    ...(
      [
        ["IGP-M", () => fetchIGPMFromBCB()],
        ["IPCA", () => fetchSerieBCBGenerica(433, "IPCA")],
        ["INPC", () => fetchSerieBCBGenerica(188, "INPC")],
        ["CDI", () => fetchSerieBCBGenerica(4391, "CDI", true)],
        ["SELIC", () => fetchSerieBCBGenerica(4390, "SELIC", true)],
        ["TR", () => fetchSerieBCBGenerica(7811, "TR")],
      ] as [string, () => Promise<IndiceData[]>][]
    ).map(([nome, buscar]) => ({
      nome,
      executar: async (): Promise<ItemAtualizacao> => {
        const dados = await buscar()
        if (dados.length === 0) return { nome, ok: false, registros: 0, erro: "BCB não retornou dados" }
        localStorage.setItem(`indices_${nome}`, JSON.stringify(dados))
        return { nome, ok: true, registros: dados.length, ultimo: fmtMesAno(dados[dados.length - 1]) }
      },
    })),
    {
      nome: "Poupança",
      executar: async () => {
        const resp = await fetch("/api/poupanca-indices", { cache: "no-store" })
        if (!resp.ok) return { nome: "Poupança", ok: false, registros: 0, erro: `HTTP ${resp.status}` }
        const json = await resp.json()
        const indices: IndiceData[] = Array.isArray(json.indices) ? json.indices : []
        if (indices.length === 0) return { nome: "Poupança", ok: false, registros: 0, erro: "sem dados" }
        const item: ItemAtualizacao = { nome: "Poupança", ok: !json.avisoBCB, registros: indices.length, ultimo: fmtMesAno(indices[indices.length - 1]) }
        if (json.avisoBCB) item.erro = `BCB indisponível: ${json.avisoBCB}`
        return item
      },
    },
    {
      nome: "Taxas diárias (SELIC/CDI/TR/Poupança)",
      executar: async () => {
        const hoje = new Date()
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 20)
        const taxas = await obterSerieDiaria(SERIE_SELIC_DIARIA, inicio, hoje)
        const datas = [...taxas.keys()]
        if (datas.length === 0) return { nome: "Taxas diárias (SELIC/CDI/TR/Poupança)", ok: false, registros: 0, erro: "BCB não retornou taxas diárias" }
        return { nome: "Taxas diárias (SELIC/CDI/TR/Poupança)", ok: true, registros: datas.length, ultimo: datas[datas.length - 1] }
      },
    },
  ]

  // Descarta caches de versões antigas antes de gravar os novos
  try {
    if (localStorage.getItem(CHAVE_VERSAO_CACHE) !== VERSAO_CACHE_INDICES) {
      for (const nome of ["IGP-M", "IPCA", "INPC", "CDI", "SELIC", "TR", "Poupança"]) localStorage.removeItem(`indices_${nome}`)
      localStorage.setItem(CHAVE_VERSAO_CACHE, VERSAO_CACHE_INDICES)
    }
  } catch {
    // armazenamento indisponível
  }

  const itens: ItemAtualizacao[] = []
  const total = etapas.length
  onProgresso?.({ concluidos: 0, total, etapa: "Conectando ao Banco Central..." })

  // Em paralelo, mas o progresso avança a cada etapa concluída
  let concluidos = 0
  await Promise.all(
    etapas.map(async (etapa) => {
      let item: ItemAtualizacao
      try {
        item = await etapa.executar()
      } catch (erro) {
        item = { nome: etapa.nome, ok: false, registros: 0, erro: erro instanceof Error ? erro.message : String(erro) }
      }
      itens.push(item)
      concluidos++
      onProgresso?.({ concluidos, total, etapa: `${item.ok ? "✓" : "⚠"} ${item.nome}${item.ultimo ? ` (até ${item.ultimo})` : ""}` })
    }),
  )

  const ordem = etapas.map((e) => e.nome)
  itens.sort((a, b) => ordem.indexOf(a.nome) - ordem.indexOf(b.nome))
  const relatorio: RelatorioAtualizacao = {
    data: new Date().toISOString(),
    mesReferencia: mesReferenciaAtual(),
    sucesso: itens.every((i) => i.ok),
    itens,
  }
  try {
    localStorage.setItem(CHAVE_RELATORIO, JSON.stringify(relatorio))
    localStorage.setItem("indices_last_update", new Date().toLocaleString("pt-BR"))
    if (relatorio.sucesso) localStorage.setItem(CHAVE_MES_ATUALIZACAO, relatorio.mesReferencia)
  } catch {
    // armazenamento indisponível (modo privativo): o cálculo segue com os dados estáticos
  }
  return relatorio
}

/**
 * Atualizar índices no cache local antes de cada cálculo.
 * ⚠️ APENAS FUNCIONA EM CLIENTE (typeof window !== "undefined")
 */
export async function atualizarIndicesNoCache(onProgresso?: (p: ProgressoAtualizacao) => void): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const relatorio = await atualizarIndicesComProgresso(onProgresso)
    return relatorio.sucesso
  } catch (error) {
    console.error("[CACHE] Erro ao atualizar índices no cache:", error)
    return false
  }
}
