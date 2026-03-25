import { IndiceData } from "./indices-data"

/**
 * Buscar IGP-M do Ipeadata (API oficial com dados mais confiáveis)
 * Series: IGP12_IGPMG12 (IGP-M Geral - % mensal)
 */
async function fetchIGPMFromIpeadata(): Promise<IndiceData[]> {
  try {
    const url = "https://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='IGP12_IGPMG12')?$format=json"
    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      console.warn(`Ipeadata API returned ${response.status}`)
      return []
    }

    const data = await response.json()
    const indices: IndiceData[] = []

    if (data.value && Array.isArray(data.value)) {
      for (const item of data.value) {
        // Data format: "2025-01-01T00:00:00"
        if (item.VALDATA && item.VALVALOR !== null && item.VALVALOR !== undefined) {
          const dateParts = item.VALDATA.split("T")[0].split("-")
          const year = parseInt(dateParts[0])
          const month = parseInt(dateParts[1])
          const valor = parseFloat(item.VALVALOR)

          if (year >= 1989 && month >= 1 && month <= 12 && !isNaN(valor)) {
            indices.push({
              mes: month,
              ano: year,
              valor, // Ipeadata já retorna em percentual
            })
          }
        }
      }
    }

    // Remover duplicatas, mantendo o último de cada mês
    const mesesMap = new Map<string, IndiceData>()
    for (const item of indices) {
      const key = `${item.mes}-${item.ano}`
      mesesMap.set(key, item) // Sobrescreve com último valor
    }

    const resultado = Array.from(mesesMap.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] IGP-M Ipeadata: ${resultado.length} registros fetched (${resultado.length > 0 ? `${resultado[0].ano}-${resultado[resultado.length - 1].ano}` : "vazio"})`)
    return resultado
  } catch (error) {
    console.error("Error fetching IGP-M from Ipeadata:", error)
    return []
  }
}

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
 * Buscar IGP-M do BCB (série 189)
 * Série: 189 (IGP-M - % mensal)
 */
async function fetchIGPMFromBCB(): Promise<IndiceData[]> {
  try {
    const url = buildBCBUrl(189)
    console.log(`[FETCH] Buscando IGP-M: ${url}`)
    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      console.warn(`BCB API (IGP-M) returned ${response.status}`)
      // Tentar Ipeadata como fallback
      return await fetchIGPMFromIpeadata()
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
    // Fallback para Ipeadata
    return await fetchIGPMFromIpeadata()
  }
}

/**
 * Buscar série genérica do BCB SGS e extrair dados mensais
 */
async function fetchSerieBCBGenerica(serie: number, nome: string): Promise<IndiceData[]> {
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

    const monthMap = new Map<string, IndiceData>()
    for (const item of data) {
      if (item.data && item.valor) {
        const dateParts = item.data.split("/")
        const month = parseInt(dateParts[1])
        const year = parseInt(dateParts[2])
        const valor = parseFloat(item.valor.replace(",", "."))
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
  const [igpmResult, poupancaResult, ipcaResult, inpcResult, cdiResult, selicResult, trResult] =
    await Promise.allSettled([
      fetchIGPMFromBCB(),
      fetchPoupancaFromBCB(),
      fetchSerieBCBGenerica(433, "IPCA"),
      fetchSerieBCBGenerica(188, "INPC"),
      fetchSerieBCBGenerica(4391, "CDI"),
      fetchSerieBCBGenerica(4390, "SELIC"),
      fetchSerieBCBGenerica(226, "TR"),
    ])

  const indexMapping: [PromiseSettledResult<IndiceData[]>, string][] = [
    [igpmResult, "IGP-M"],
    [poupancaResult, "Poupança"],
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

/**
 * Atualizar índices no cache local (localStorage)
 * Chamado APENAS no cliente antes de cada cálculo para garantir dados atualizados
 * ⚠️ APENAS FUNCIONA EM CLIENTE (typeof window !== "undefined")
 */
export async function atualizarIndicesNoCache(): Promise<boolean> {
  try {
    // Verificar se estamos em cliente
    if (typeof window === "undefined") {
      console.warn("[CACHE] Tentativa de atualizar cache fora do cliente. Ignorando.")
      return false
    }

    console.log("[CACHE] Iniciando atualização de índices...")
    const indicesObtidos = await fetchAllIndices()

    if (indicesObtidos.successCount === 0) {
      console.warn("[CACHE] Nenhum índice foi obtido da API")
      return false
    }

    // Salvar cada índice no localStorage
    if (indicesObtidos["IGP-M"].length > 0) {
      localStorage.setItem("indices_IGP-M", JSON.stringify(indicesObtidos["IGP-M"]))
      console.log(`[CACHE] ✓ IGP-M: ${indicesObtidos["IGP-M"].length} registros salvos no cache`)
    }

    if (indicesObtidos["Poupança"].length > 0) {
      localStorage.setItem("indices_Poupança", JSON.stringify(indicesObtidos["Poupança"]))
      console.log(`[CACHE] ✓ Poupança: ${indicesObtidos["Poupança"].length} registros salvos no cache`)
    }

    if (indicesObtidos["IPCA"].length > 0) {
      localStorage.setItem("indices_IPCA", JSON.stringify(indicesObtidos["IPCA"]))
      console.log(`[CACHE] ✓ IPCA: ${indicesObtidos["IPCA"].length} registros salvos no cache`)
    }

    if (indicesObtidos["INPC"].length > 0) {
      localStorage.setItem("indices_INPC", JSON.stringify(indicesObtidos["INPC"]))
      console.log(`[CACHE] ✓ INPC: ${indicesObtidos["INPC"].length} registros salvos no cache`)
    }

    if (indicesObtidos["CDI"].length > 0) {
      localStorage.setItem("indices_CDI", JSON.stringify(indicesObtidos["CDI"]))
      console.log(`[CACHE] ✓ CDI: ${indicesObtidos["CDI"].length} registros salvos no cache`)
    }

    if (indicesObtidos["SELIC"].length > 0) {
      localStorage.setItem("indices_SELIC", JSON.stringify(indicesObtidos["SELIC"]))
      console.log(`[CACHE] ✓ SELIC: ${indicesObtidos["SELIC"].length} registros salvos no cache`)
    }

    if (indicesObtidos["TR"].length > 0) {
      localStorage.setItem("indices_TR", JSON.stringify(indicesObtidos["TR"]))
      console.log(`[CACHE] ✓ TR: ${indicesObtidos["TR"].length} registros salvos no cache`)
    }

    // Salvar timestamp da última atualização
    localStorage.setItem("indices_timestamp", indicesObtidos.timestamp)
    localStorage.setItem("indices_last_update", new Date().toLocaleString("pt-BR"))

    console.log(`[CACHE] ✅ Todos os índices atualizados com sucesso (${indicesObtidos.successCount} fontes)`)
    return true
  } catch (error) {
    console.error("[CACHE] Erro ao atualizar índices no cache:", error)
    return false
  }
}
