import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tipo = searchParams.get("tipo")

  try {
    // Web scraping desabilitado - usando apenas dados locais pré-configurados
    return NextResponse.json({ 
      success: true, 
      indices: [],
      message: "Use os dados locais pré-configurados no sistema" 
    })
  } catch (error) {
    console.error("Erro ao buscar índices:", error)
    return NextResponse.json({
      success: false,
      error: "Erro ao buscar dados dos sites",
    })
  }
}
        const [mes, ano] = mesAno.split("/")
        const valorNumerico = Number.parseFloat(valor.replace(",", ".").replace("%", ""))

        if (!isNaN(valorNumerico) && mes && ano) {
          indices.push({
            mes: Number.parseInt(mes),
            ano: Number.parseInt(ano),
            valor: valorNumerico,
          })
        }
      }
    })

    return indices
  } catch (error) {
    console.error("Erro ao buscar dados do IGP-M:", error)
    return []
  }
}
