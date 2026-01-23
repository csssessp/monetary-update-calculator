import { IndiceData } from "./indices-data"

/**
 * Buscar IGP-M do Ipeadata (API oficial com dados mais confiáveis)
 * Series: IGP12_IGPMG12 (IGP-M Geral - % mensal)
 */
async function fetchIGPMFromIpeadata(): Promise<IndiceData[]> {
  try {
    const url = "https://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='IGP12_IGPMG12')?$format=json"
    const response = await fetch(url, { cache: "no-store", timeout: 10000 })

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

// Fetch IGP-M from FGV using Banco Central API with multi-window support (1989-2026)
async function fetchIGPMFromFGV(): Promise<IndiceData[]> {
  try {
    const todosDados: IndiceData[] = []

    // Janelas de 10 anos para contornar limite da API BACEN
    const janelas = [
      { inicio: "01/01/1989", fim: "31/12/1998" },
      { inicio: "01/01/1999", fim: "31/12/2008" },
      { inicio: "01/01/2009", fim: "31/12/2018" },
      { inicio: "01/01/2019", fim: "31/12/2026" },
    ]

    for (const janela of janelas) {
      try {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=${janela.inicio}&dataFinal=${janela.fim}`
        const response = await fetch(url, { cache: "no-store" })

        if (response.ok) {
          const data = await response.json() as Array<{ data: string; valor: string }>

          for (const item of data) {
            const [day, month, year] = item.data.split("/")
            const valor = parseFloat(item.valor.replace(",", "."))

            if (day && month && year && !isNaN(valor)) {
              todosDados.push({
                mes: parseInt(month),
                ano: parseInt(year),
                valor,
              })
            }
          }
        }
      } catch (error) {
        console.warn(`Erro ao buscar janela IGP-M (${janela.inicio} - ${janela.fim}):`, error)
      }
    }

    // Remover duplicatas e ordenar
    const mesesMap = new Map<string, IndiceData>()
    for (const item of todosDados) {
      const key = `${item.mes}-${item.ano}`
      // Manter o último valor do mês
      if (!mesesMap.has(key) || item.mes > 0) {
        mesesMap.set(key, item)
      }
    }

    const indices = Array.from(mesesMap.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] IGP-M: ${indices.length} registros fetched from Banco Central (1989-2026)`)
    return indices
  } catch (error) {
    console.error("Error fetching IGP-M from Banco Central:", error)
    return []
  }
}

// Fetch IPCA from IBGE
async function fetchIPCAFromIBGE(): Promise<IndiceData[]> {
  try {
    // IBGE SGS API for IPCA (series 433)
    const response = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json")

    if (!response.ok) {
      throw new Error(`IBGE API returned ${response.status}`)
    }

    const data = await response.json() as Array<{ data: string; valor: string }>
    const indices: IndiceData[] = []

    for (const item of data) {
      const [day, month, year] = item.data.split("/")
      const valor = parseFloat(item.valor.replace(",", "."))

      if (day && month && year && !isNaN(valor)) {
        indices.push({
          mes: parseInt(month),
          ano: parseInt(year),
          valor,
        })
      }
    }

    console.log(`[FETCH] IPCA: ${indices.length} registros fetched from Banco Central`)
    return indices
  } catch (error) {
    console.error("Error fetching IPCA from Banco Central:", error)
    return []
  }
}

// Fetch INPC from IBGE
async function fetchINPCFromIBGE(): Promise<IndiceData[]> {
  try {
    // IBGE SGS API for INPC (series 188)
    const response = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.188/dados?formato=json")

    if (!response.ok) {
      throw new Error(`INPC API returned ${response.status}`)
    }

    const data = await response.json() as Array<{ data: string; valor: string }>
    const indices: IndiceData[] = []

    for (const item of data) {
      const [day, month, year] = item.data.split("/")
      const valor = parseFloat(item.valor.replace(",", "."))

      if (day && month && year && !isNaN(valor)) {
        indices.push({
          mes: parseInt(month),
          ano: parseInt(year),
          valor,
        })
      }
    }

    console.log(`[FETCH] INPC: ${indices.length} registros fetched from Banco Central`)
    return indices
  } catch (error) {
    console.error("Error fetching INPC from Banco Central:", error)
    return []
  }
}

// Fetch Poupança from Banco Central
async function fetchPoupancaFromBC(): Promise<IndiceData[]> {
  try {
    // Banco Central SGS API for Poupança (series 195 - taxa média de remuneração)
    // Series 195 requer data inicial e final (máximo 10 anos por janela)
    // IMPORTANTE: A API retorna uma linha para CADA DIA
    // Devemos usar o PRIMEIRO valor útil de cada mês (começo do período)
    
    const todosDados: IndiceData[] = []
    const janelas = [
      { inicio: "01/01/1994", fim: "31/12/2003" },
      { inicio: "01/01/2004", fim: "31/12/2013" },
      { inicio: "01/01/2014", fim: "31/12/2023" },
      { inicio: "01/01/2024", fim: "31/12/2026" },
    ]

    for (const janela of janelas) {
      try {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=${janela.inicio}&dataFinal=${janela.fim}`
        const response = await fetch(url, { cache: "no-store" })

        if (!response.ok) {
          console.warn(`BACEN Poupança janela ${janela.inicio}-${janela.fim} retornou ${response.status}`)
          continue
        }

        const data = await response.json() as Array<{ data: string; valor: string }>
        
        // Agrupar por mês/ano e usar o PRIMEIRO valor (primeiro dia útil do mês)
        const porMes = new Map<string, { data: string; valor: string }>()
        for (const item of data) {
          const [day, month, year] = item.data.split("/")
          const key = `${month}-${year}`
          // Usa o primeiro valor de cada mês (se não estiver setado ainda)
          if (!porMes.has(key)) {
            porMes.set(key, item)
          }
        }

        // Converter para IndiceData
        for (const [key, item] of porMes.entries()) {
          const [day, month, year] = item.data.split("/")
          const valor = parseFloat(item.valor.replace(",", "."))

          if (day && month && year && !isNaN(valor)) {
            todosDados.push({
              mes: parseInt(month),
              ano: parseInt(year),
              valor,
            })
          }
        }
      } catch (janelError) {
        console.warn(`Erro na janela Poupança ${janela.inicio}-${janela.fim}:`, janelError)
        continue
      }
    }

    // Ordenar cronologicamente
    const indicesOrdenados = todosDados.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] Poupança: ${indicesOrdenados.length} registros fetched from Banco Central (usando primeiro dia útil de cada mês)`)
    return indicesOrdenados
  } catch (error) {
    console.error("Error fetching Poupança from Banco Central:", error)
    return []
  }
}

// Fetch SELIC from Banco Central
async function fetchSELICFromBC(): Promise<IndiceData[]> {
  try {
    // Banco Central SGS API for SELIC (series 11 - taxa média diária)
    // Requires date windows (max 10 years per request)
    const todosDados: IndiceData[] = []
    const janelas = [
      { inicio: "01/01/2000", fim: "31/12/2009" },
      { inicio: "01/01/2010", fim: "31/12/2019" },
      { inicio: "01/01/2020", fim: "31/12/2026" },
    ]

    for (const janela of janelas) {
      try {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${janela.inicio}&dataFinal=${janela.fim}`
        const response = await fetch(url, { cache: "no-store" })

        if (!response.ok) {
          console.warn(`BACEN SELIC janela ${janela.inicio}-${janela.fim} retornou ${response.status}`)
          continue
        }

        const data = await response.json() as Array<{ data: string; valor: string }>
        
        for (const item of data) {
          const [day, month, year] = item.data.split("/")
          const valor = parseFloat(item.valor.replace(",", "."))

          if (day && month && year && !isNaN(valor)) {
            // Group by month, taking average of daily values
            const mes = parseInt(month)
            const ano = parseInt(year)
            const existing = todosDados.find((i) => i.mes === mes && i.ano === ano)
            if (existing) {
              existing.valor = (existing.valor + valor) / 2
            } else {
              todosDados.push({
                mes,
                ano,
                valor,
              })
            }
          }
        }
      } catch (janelError) {
        console.warn(`Erro na janela SELIC ${janela.inicio}-${janela.fim}:`, janelError)
        continue
      }
    }

    // Ordenar cronologicamente
    const indicesOrdenados = todosDados.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] SELIC: ${indicesOrdenados.length} registros fetched from Banco Central`)
    return indicesOrdenados
  } catch (error) {
    console.error("Error fetching SELIC from Banco Central:", error)
    return []
  }
}

// Fetch CDI from Banco Central
async function fetchCDIFromBC(): Promise<IndiceData[]> {
  try {
    // Banco Central SGS API for CDI (series 12 - taxa média diária)
    // Requires date windows (max 10 years per request)
    const todosDados: IndiceData[] = []
    const janelas = [
      { inicio: "01/01/2000", fim: "31/12/2009" },
      { inicio: "01/01/2010", fim: "31/12/2019" },
      { inicio: "01/01/2020", fim: "31/12/2026" },
    ]

    for (const janela of janelas) {
      try {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${janela.inicio}&dataFinal=${janela.fim}`
        const response = await fetch(url, { cache: "no-store" })

        if (!response.ok) {
          console.warn(`BACEN CDI janela ${janela.inicio}-${janela.fim} retornou ${response.status}`)
          continue
        }

        const data = await response.json() as Array<{ data: string; valor: string }>
        
        for (const item of data) {
          const [day, month, year] = item.data.split("/")
          const valor = parseFloat(item.valor.replace(",", "."))

          if (day && month && year && !isNaN(valor)) {
            // Group by month, taking average of daily values
            const mes = parseInt(month)
            const ano = parseInt(year)
            const existing = todosDados.find((i) => i.mes === mes && i.ano === ano)
            if (existing) {
              existing.valor = (existing.valor + valor) / 2
            } else {
              todosDados.push({
                mes,
                ano,
                valor,
              })
            }
          }
        }
      } catch (janelError) {
        console.warn(`Erro na janela CDI ${janela.inicio}-${janela.fim}:`, janelError)
        continue
      }
    }

    // Ordenar cronologicamente
    const indicesOrdenados = todosDados.sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })

    console.log(`[FETCH] CDI: ${indicesOrdenados.length} registros fetched from Banco Central`)
    return indicesOrdenados
  } catch (error) {
    console.error("Error fetching CDI from Banco Central:", error)
    return []
  }
}

export async function fetchAllIndices(): Promise<{
  "IGP-M": IndiceData[]
  "IPCA": IndiceData[]
  "INPC": IndiceData[]
  "Poupança": IndiceData[]
  "SELIC": IndiceData[]
  "CDI": IndiceData[]
  timestamp: string
  successCount: number
}> {
  const results = {
    "IGP-M": [] as IndiceData[],
    "IPCA": [] as IndiceData[],
    "INPC": [] as IndiceData[],
    "Poupança": [] as IndiceData[],
    "SELIC": [] as IndiceData[],
    "CDI": [] as IndiceData[],
    timestamp: new Date().toISOString(),
    successCount: 0,
  }

  // Fetch from all sources in parallel
  // NOTE: Using Ipeadata for IGP-M instead of BACEN FGV for more accurate official data
  const [igpm, ipca, inpc, poupanca, selic, cdi] = await Promise.allSettled([
    fetchIGPMFromIpeadata(),
    fetchIPCAFromIBGE(),
    fetchINPCFromIBGE(),
    fetchPoupancaFromBC(),
    fetchSELICFromBC(),
    fetchCDIFromBC(),
  ])

  if (igpm.status === "fulfilled" && igpm.value.length > 0) {
    results["IGP-M"] = igpm.value
    results.successCount++
  }
  if (ipca.status === "fulfilled" && ipca.value.length > 0) {
    results["IPCA"] = ipca.value
    results.successCount++
  }
  if (inpc.status === "fulfilled" && inpc.value.length > 0) {
    results["INPC"] = inpc.value
    results.successCount++
  }
  if (poupanca.status === "fulfilled" && poupanca.value.length > 0) {
    results["Poupança"] = poupanca.value
    results.successCount++
  }
  if (selic.status === "fulfilled" && selic.value.length > 0) {
    results["SELIC"] = selic.value
    results.successCount++
  }
  if (cdi.status === "fulfilled" && cdi.value.length > 0) {
    results["CDI"] = cdi.value
    results.successCount++
  }

  return results
}

/**
 * Atualizar índices no cache local (localStorage)
 * Chamado antes de cada cálculo para garantir dados atualizados
 */
export async function atualizarIndicesNoCache(): Promise<boolean> {
  try {
    const indicesObtidos = await fetchAllIndices()

    if (indicesObtidos.successCount === 0) {
      console.warn("[CACHE] Nenhum índice foi obtido da API")
      return false
    }

    // Salvar cada índice no localStorage
    if (indicesObtidos["IGP-M"].length > 0) {
      localStorage.setItem("indices_IGP-M", JSON.stringify(indicesObtidos["IGP-M"]))
      console.log(`[CACHE] ✓ IGP-M: ${indicesObtidos["IGP-M"].length} registros salvos`)
    }
    if (indicesObtidos["IPCA"].length > 0) {
      localStorage.setItem("indices_IPCA", JSON.stringify(indicesObtidos["IPCA"]))
      console.log(`[CACHE] ✓ IPCA: ${indicesObtidos["IPCA"].length} registros salvos`)
    }
    if (indicesObtidos["INPC"].length > 0) {
      localStorage.setItem("indices_INPC", JSON.stringify(indicesObtidos["INPC"]))
      console.log(`[CACHE] ✓ INPC: ${indicesObtidos["INPC"].length} registros salvos`)
    }
    if (indicesObtidos["Poupança"].length > 0) {
      localStorage.setItem("indices_Poupança", JSON.stringify(indicesObtidos["Poupança"]))
      console.log(`[CACHE] ✓ Poupança: ${indicesObtidos["Poupança"].length} registros salvos`)
    }
    if (indicesObtidos["SELIC"].length > 0) {
      localStorage.setItem("indices_SELIC", JSON.stringify(indicesObtidos["SELIC"]))
      console.log(`[CACHE] ✓ SELIC: ${indicesObtidos["SELIC"].length} registros salvos`)
    }
    if (indicesObtidos["CDI"].length > 0) {
      localStorage.setItem("indices_CDI", JSON.stringify(indicesObtidos["CDI"]))
      console.log(`[CACHE] ✓ CDI: ${indicesObtidos["CDI"].length} registros salvos`)
    }

    // Salvar timestamp da última atualização
    localStorage.setItem("indices_timestamp", indicesObtidos.timestamp)

    console.log(`[CACHE] ✅ Índices atualizados com sucesso: ${indicesObtidos.successCount} fontes`)
    return true
  } catch (error) {
    console.error("[CACHE] Erro ao atualizar índices no cache:", error)
    return false
  }
}
