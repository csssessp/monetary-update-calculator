import { type NextRequest, NextResponse } from "next/server"

function parseOptionalInt(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get("name") || undefined
  const startMonth = parseOptionalInt(searchParams.get("startMonth"))
  const startYear = parseOptionalInt(searchParams.get("startYear"))
  const endMonth = parseOptionalInt(searchParams.get("endMonth"))
  const endYear = parseOptionalInt(searchParams.get("endYear"))

  try {
    // Retornar dados dos índices locais como fallback
    // O sistema usa dados locais definidos em lib/indices-data.ts
    return NextResponse.json({ 
      success: true, 
      indices: [],
      message: "Use os índices locais pré-configurados no sistema" 
    })
  } catch (error) {
    console.error("Erro ao buscar índices:", error)
    return NextResponse.json({ success: false, error: "Erro ao buscar índices." })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, month, year, value } = await request.json()

    if (!name || !month || !year || value === undefined) {
      return NextResponse.json({ success: false, error: "Dados incompletos para salvar o índice." }, { status: 400 })
    }

    // Apenas confirmar sem persistir (dados locais são usados como source of truth)
    return NextResponse.json({ success: true, message: "Índices do sistema estão em uso. Dados locais pré-configurados são utilizados." })
  } catch (error) {
    console.error("Erro ao processar requisição:", error)
    return NextResponse.json({ success: false, error: "Erro ao processar requisição." }, { status: 500 })
  }
}
