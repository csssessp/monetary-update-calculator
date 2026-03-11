import { type NextRequest, NextResponse } from "next/server"
import { fetchAllIndices } from "@/lib/fetch-indices"

export async function POST(request: NextRequest) {
  try {
    console.log("=".repeat(60))
    console.log("INICIANDO ATUALIZAÇÃO DE ÍNDICES DE SITES OFICIAIS")
    console.log("=".repeat(60))
    console.log(`Horário: ${new Date().toLocaleString("pt-BR")}`)

    // Fetch data from all official sources
    const resultado = await fetchAllIndices()

    console.log("=".repeat(60))
    console.log("RESULTADO DA ATUALIZAÇÃO")
    console.log("=".repeat(60))

    // Log which indices were updated
    const indicesAtualizados: Array<{name: string, count: number}> = []
    for (const nome of ["IGP-M", "Poupança", "IPCA", "INPC"] as const) {
      if (resultado[nome].length > 0) {
        indicesAtualizados.push({name: nome, count: resultado[nome].length})
        console.log(`✓ ${nome}: ${resultado[nome].length} registros atualizados`)
      }
    }

    console.log(`Total de índices atualizados: ${resultado.successCount}`)
    console.log("=".repeat(60))

    const mensagemIndices = indicesAtualizados.map(i => `${i.name} (${i.count} registros)`).join(", ")

    const data: Record<string, any> = {}
    const detalhes: Record<string, string> = {}
    const fontes: Record<string, string> = {}
    for (const nome of ["IGP-M", "Poupança", "IPCA", "INPC"] as const) {
      if (resultado[nome].length > 0) {
        data[nome] = resultado[nome]
        detalhes[nome] = `${resultado[nome].length} registros (Banco Central)`
        fontes[nome] = "Banco Central do Brasil"
      }
    }

    return NextResponse.json({
      success: true,
      indicesAtualizados: indicesAtualizados,
      total: resultado.successCount,
      timestamp: resultado.timestamp,
      message: `${resultado.successCount} índice(s) foram atualizados com sucesso dos sites oficiais: ${mensagemIndices}`,
      data,
      detalhes,
      fontes,
    })
  } catch (error) {
    console.error("Erro ao atualizar índices:", error)
    console.error("=".repeat(60))
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao atualizar índices dos sites oficiais",
        detalhes: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
