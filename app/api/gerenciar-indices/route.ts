import { NextRequest, NextResponse } from "next/server"

// Série 195: Rentabilidade da Poupança (a partir de maio/2012) - mensal
// Série 4391: Rentabilidade da Poupança (a partir de janeiro/2012) - com TR
// Série 189: IGP-M (a partir de 1989)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const indiceParam = searchParams.get("indice") || "poupanca"

    const indices: Record<string, any[]> = {
      Poupança: [],
      "IGP-M": [],
    }

    // Buscar dados da Poupança via API do BACEN (Série 195)
    if (indiceParam === "poupanca" || indiceParam === "all") {
      try {
        // Poupança está disponível a partir de maio/2012
        // Usar uma janela de 10 anos (máximo permitido pela API)
        const dataInicial = "23/01/2016" // 10 anos atrás
        const dataFinal = formatDateBrazilian(new Date())

        const respPoupanca = await fetch(
          `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`,
          { cache: "no-store" }
        )

        if (respPoupanca.ok) {
          const dadosPoupanca = await respPoupanca.json()
          if (Array.isArray(dadosPoupanca)) {
            indices["Poupança"] = parseBCBResponse(dadosPoupanca, "Poupança")
          }
        }
      } catch (error) {
        console.error("Erro ao buscar Poupança do BACEN:", error)
      }
    }

    // Buscar dados do IGP-M via API do BACEN (Série 189)
    // IGP-M disponível desde 1989, mas API permite max 10 anos por requisição
    if (indiceParam === "igpm" || indiceParam === "all") {
      try {
        const igpmData = await fetchIGPMHistorico()
        indices["IGP-M"] = igpmData
      } catch (error) {
        console.error("Erro ao buscar IGP-M:", error)
      }
    }

    // Se nenhuma série foi especificada, buscar ambas
    if (indiceParam === "all" || !indiceParam) {
      try {
        const dataInicial = "23/01/2016"
        const dataFinal = formatDateBrazilian(new Date())

        const [respPoupanca, igpmData] = await Promise.all([
          fetch(
            `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`,
            { cache: "no-store" }
          ),
          fetchIGPMHistorico(),
        ])

        if (respPoupanca.ok) {
          const dadosPoupanca = await respPoupanca.json()
          if (Array.isArray(dadosPoupanca)) {
            indices["Poupança"] = parseBCBResponse(dadosPoupanca, "Poupança")
          }
        }

        indices["IGP-M"] = igpmData
      } catch (error) {
        console.error("Erro ao buscar índices do BACEN:", error)
      }
    }

    return NextResponse.json(indices, {
      headers: {
        "Cache-Control": "public, max-age=3600", // Cache de 1 hora
      },
    })
  } catch (error) {
    console.error("Erro ao processar requisição de índices:", error)
    return NextResponse.json(
      { error: "Erro ao buscar índices do BACEN" },
      { status: 500 }
    )
  }
}

/**
 * Buscar histórico completo do IGP-M desde 1989
 * Usa múltiplas requisições de 10 anos para contornar limite da API BACEN
 */
async function fetchIGPMHistorico(): Promise<any[]> {
  const todosDados: any[] = []

  // Janelas de 10 anos a partir de 1989
  const janelas = [
    { inicio: "01/01/1989", fim: "31/12/1998" },
    { inicio: "01/01/1999", fim: "31/12/2008" },
    { inicio: "01/01/2009", fim: "31/12/2018" },
    { inicio: "01/01/2019", fim: "31/12/2026" },
  ]

  for (const janela of janelas) {
    try {
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=${janela.inicio}&dataFinal=${janela.fim}`
      const resp = await fetch(url, { cache: "no-store" })

      if (resp.ok) {
        const dados = await resp.json()
        if (Array.isArray(dados)) {
          todosDados.push(...dados)
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar IGP-M BACEN (${janela.inicio} - ${janela.fim}):`, error)
    }
  }

  return parseBCBResponse(todosDados, "IGP-M")
}

/**
 * Formatar data para o padrão brasileiro (dd/mm/yyyy)
 */
function formatDateBrazilian(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Parse da resposta JSON do BACEN
 * Formato esperado:
 * [
 *   { "data": "23/01/2026", "valor": "0.5234" },
 *   ...
 * ]
 * 
 * Agrega valores diários para mensais (última data do mês)
 */
function parseBCBResponse(
  dados: any[],
  indiceNome: string
): any[] {
  if (!Array.isArray(dados)) return []

  // Mapa para armazenar último valor de cada mês
  const mesVsUltimoValor = new Map<string, { mes: number; ano: number; valor: number }>()

  dados.forEach((item: any) => {
    try {
      // Parse da data: "23/01/2026"
      const [dia, mes, ano] = item.data.split("/").map(Number)

      // Validar data
      if (!Number.isFinite(mes) || mes < 1 || mes > 12) return
      if (!Number.isFinite(ano) || ano < 1980 || ano > new Date().getFullYear() + 1) return

      // Parse do valor
      const valor = parseFloat(item.valor.replace(",", "."))
      if (!Number.isFinite(valor)) return

      // Usar a última data de cada mês
      const chave = `${ano}-${String(mes).padStart(2, "0")}`
      mesVsUltimoValor.set(chave, {
        mes,
        ano,
        valor: Math.round(valor * 10000) / 10000,
      })
    } catch (error) {
      console.error(`Erro ao fazer parse do item ${indiceNome}:`, item, error)
    }
  })

  // Converter mapa para array e ordenar
  return Array.from(mesVsUltimoValor.values())
    .sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes))
    .map((item) => ({
      ...item,
      fonte: "BACEN - SGS API",
      dataAtualizado: new Date().toISOString(),
    }))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { indice, mes, ano, valor } = body

    // Validar dados
    if (!indice || !mes || !ano || valor === undefined) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Apenas Poupança e IGP-M são permitidos
    if (indice !== "Poupança" && indice !== "IGP-M") {
      return NextResponse.json({ error: "Índice não permitido" }, { status: 400 })
    }

    // Validar valores
    if (mes < 1 || mes > 12 || !Number.isFinite(valor)) {
      return NextResponse.json({ error: "Valores inválidos" }, { status: 400 })
    }

    // TODO: Implementar persistência em banco de dados
    // Por enquanto, apenas confirmamos a operação

    return NextResponse.json({
      success: true,
      message: `Índice ${indice} ${mes}/${ano} atualizado para ${valor}`,
      data: { indice, mes, ano, valor, dataAtualizado: new Date().toISOString() },
    })
  } catch (error) {
    console.error("Erro ao atualizar índice:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar índice" },
      { status: 500 }
    )
  }
}

