import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    // Buscar dados dos sites oficiais
    const responses = await Promise.allSettled([
      // Poupança - https://www.debit.com.br/tabelas/poupanca
      fetch("https://www.debit.com.br/tabelas/poupanca", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)",
        },
      }),
      // IGP-M - https://legacy.debit.com.br/tabelas/tabela-completa-pdf.php?indice=igpm
      fetch("https://legacy.debit.com.br/tabelas/tabela-completa-pdf.php?indice=igpm", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)",
        },
      }),
    ])

    const indices: Record<string, any[]> = {
      Poupança: [],
      "IGP-M": [],
    }

    // Tentar parsear resposta da Poupança
    if (responses[0].status === "fulfilled") {
      try {
        const html = await responses[0].value.text()
        // Parse HTML para extrair dados da Poupança
        // Padrão: procurar por tabelas com data e valor
        const poupancaData = parsePoUpancaHTML(html)
        indices["Poupança"] = poupancaData
      } catch (error) {
        console.error("Erro ao parsear Poupança:", error)
      }
    }

    // Tentar parsear resposta do IGP-M
    if (responses[1].status === "fulfilled") {
      try {
        const html = await responses[1].value.text()
        // Parse HTML para extrair dados do IGP-M
        const igpmData = parseIGPMHTML(html)
        indices["IGP-M"] = igpmData
      } catch (error) {
        console.error("Erro ao parsear IGP-M:", error)
      }
    }

    return NextResponse.json(indices)
  } catch (error) {
    console.error("Erro ao buscar índices:", error)
    return NextResponse.json({ error: "Erro ao buscar índices" }, { status: 500 })
  }
}

// Parser para HTML da Poupança
function parsePoUpancaHTML(html: string): any[] {
  const indices: any[] = []

  // Procurar por padrões de data/valor na tabela
  // Exemplo: <td>01/2024</td><td>0,5342%</td>
  const regex = /(\d{1,2})\/(\d{4})\D+?([\d,]+)%/g
  let match

  while ((match = regex.exec(html)) !== null) {
    const mes = parseInt(match[1])
    const ano = parseInt(match[2])
    const valor = parseFloat(match[3].replace(",", "."))

    if (mes >= 1 && mes <= 12 && ano >= 1986 && ano <= new Date().getFullYear() + 1) {
      indices.push({
        mes,
        ano,
        valor,
        fonte: "debit.com.br",
      })
    }
  }

  return indices.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes))
}

// Parser para HTML do IGP-M
function parseIGPMHTML(html: string): any[] {
  const indices: any[] = []

  // Procurar por padrões de data/valor na tabela do IGP-M
  const regex = /(\d{1,2})\/(\d{4})\D+?([-\d,]+)%/g
  let match

  while ((match = regex.exec(html)) !== null) {
    const mes = parseInt(match[1])
    const ano = parseInt(match[2])
    const valor = parseFloat(match[3].replace(",", "."))

    if (mes >= 1 && mes <= 12 && ano >= 1989 && ano <= new Date().getFullYear() + 1) {
      indices.push({
        mes,
        ano,
        valor,
        fonte: "legacy.debit.com.br",
      })
    }
  }

  return indices.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes))
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

    // Aqui você poderia salvar em um banco de dados
    // Por enquanto, apenas confirmamos a operação
    return NextResponse.json({
      success: true,
      message: `Índice ${indice} ${mes}/${ano} atualizado para ${valor}`,
      data: { indice, mes, ano, valor },
    })
  } catch (error) {
    console.error("Erro ao atualizar índice:", error)
    return NextResponse.json({ error: "Erro ao atualizar índice" }, { status: 500 })
  }
}
