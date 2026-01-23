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
    if (resultado["IGP-M"].length > 0) {
      indicesAtualizados.push({name: "IGP-M", count: resultado["IGP-M"].length})
      console.log(`✓ IGP-M: ${resultado["IGP-M"].length} registros atualizados`)
    }

    console.log(`Total de índices atualizados: ${resultado.successCount}`)
    console.log("=".repeat(60))

    const mensagemIndices = indicesAtualizados.map(i => `${i.name} (${i.count} registros)`).join(", ")

    return NextResponse.json({
      success: true,
      indicesAtualizados: indicesAtualizados,
      total: resultado.successCount,
      timestamp: resultado.timestamp,
      message: `${resultado.successCount} índice(s) foram atualizados com sucesso dos sites oficiais: ${mensagemIndices}`,
      data: {
        "IGP-M": resultado["IGP-M"],
      },
      detalhes: {
        "IGP-M": `${resultado["IGP-M"].length} registros (Ipeadata)`,
      },
      fontes: {
        "IGP-M": "https://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='IGP12_IGPMG12')?$format=json",
      }
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
