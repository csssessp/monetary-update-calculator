import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const serie = searchParams.get("serie") // 189 para IGP-M, 25 para Poupança
  let dataInicial = searchParams.get("dataInicial")
  let dataFinal = searchParams.get("dataFinal")

  if (!serie) {
    return NextResponse.json(
      { error: "Parâmetro 'serie' é obrigatório" },
      { status: 400 }
    )
  }

  try {
    let url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json`

    // Série 25 (Poupança - diária) requer obrigatoriamente dataInicial e dataFinal
    // BCB permite MÁXIMO 10 anos de dados para séries diárias
    // Série 189 (IGP-M - mensal) funciona sem essas parâmetros
    
    if (serie === "25") {
      // Para Poupança: forçar last 10 years
      if (!dataInicial || !dataFinal) {
        const today = new Date()
        // Data final = hoje
        const dayEnd = String(today.getDate()).padStart(2, "0")
        const monthEnd = String(today.getMonth() + 1).padStart(2, "0")
        const yearEnd = today.getFullYear()
        dataFinal = `${dayEnd}/${monthEnd}/${yearEnd}`
        
        // Data inicial = 10 anos atrás (usando getFullYear - 10, mantendo mês e dia)
        const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
        const dayStart = String(tenYearsAgo.getDate()).padStart(2, "0")
        const monthStart = String(tenYearsAgo.getMonth() + 1).padStart(2, "0")
        const yearStart = tenYearsAgo.getFullYear()
        dataInicial = `${dayStart}/${monthStart}/${yearStart}`
        
        console.log(`[Proxy BCB] Série 25 (Poupança): Calculadas datas - ${dataInicial} a ${dataFinal}`)
      }
      
      url += `&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`
    } else if (serie === "189") {
      // Para IGP-M (série mensal), datas são opcionais
      // Mas se fornecidas, as incluímos
      if (dataInicial) {
        url += `&dataInicial=${encodeURIComponent(dataInicial)}`
      }
      if (dataFinal) {
        url += `&dataFinal=${encodeURIComponent(dataFinal)}`
      }
    } else {
      // Série desconhecida: tenta com 10 anos se necessário
      if (dataInicial) {
        url += `&dataInicial=${encodeURIComponent(dataInicial)}`
      }
      if (dataFinal) {
        url += `&dataFinal=${encodeURIComponent(dataFinal)}`
      }
    }

    console.log(`[Proxy BCB] Buscando série ${serie}: ${url}`)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    }).catch((err) => {
      console.error("[Proxy BCB] Erro no fetch da URL:", url)
      console.error("[Proxy BCB] Erro do fetch:", err)
      throw err
    })

    console.log(`[Proxy BCB] Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Proxy BCB] Erro ${response.status}: ${errorText}`)
      throw new Error(`BCB API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    
    // Tratar caso onde BCB retorna erro em JSON
    if (data.error) {
      console.warn(`[Proxy BCB] Erro da API para série ${serie}:`, data.message)
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    // Validar que é um array
    if (!Array.isArray(data)) {
      console.warn(`[Proxy BCB] Resposta não é array para série ${serie}:`, typeof data)
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    console.log(`[Proxy BCB] Série ${serie}: ${data.length} registros retornados`)
    
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Proxy BCB] Erro completo:", errorMessage)
    console.error("[Proxy BCB] Stack:", error instanceof Error ? error.stack : "N/A")
    
    return NextResponse.json(
      {
        error: "Erro ao buscar dados da API do BCB",
        details: errorMessage,
        serie: serie,
      },
      { status: 500 }
    )
  }
}
