import { NextRequest, NextResponse } from 'next/server'

// Sempre dinâmica: usada pelo cálculo para buscar as taxas diárias do BCB (Poupança, TR, SELIC, CDI)
export const dynamic = 'force-dynamic'

/**
 * Proxy para API do BCB (resolves CORS issues)
 * GET /api/proxy-bcb-indices?serie=189&dataInicial=01/01/2025&dataFinal=31/12/2025
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serie = searchParams.get('serie')
    const dataInicial = searchParams.get('dataInicial')
    const dataFinal = searchParams.get('dataFinal')

    if (!serie) {
      return NextResponse.json(
        { error: 'Parâmetro "serie" é obrigatório' },
        { status: 400 }
      )
    }

    // Construir URL da API BCB
    let url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json`

    if (dataInicial) {
      url += `&dataInicial=${encodeURIComponent(dataInicial)}`
    }

    if (dataFinal) {
      url += `&dataFinal=${encodeURIComponent(dataFinal)}`
    }

    console.log(`[Proxy BCB] Requisição para série ${serie}`)

    // Fazer requisição no servidor (sem CORS)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Node.js) Calculadora-Monetaria/1.0',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`[Proxy BCB] Erro ${response.status}: ${response.statusText}`)
      return NextResponse.json(
        { error: `BCB API retornou ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Cache por 6 horas
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=21600',
      },
    })
  } catch (error) {
    console.error('[Proxy BCB] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do BCB', details: String(error) },
      { status: 500 }
    )
  }
}
