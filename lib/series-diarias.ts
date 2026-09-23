/**
 * Séries diárias do Banco Central (SGS), usadas pela metodologia da Calculadora do Cidadão:
 *   - Poupança: série 195 (regra nova, depósitos a partir de 04/05/2012) e 25 (regra antiga)
 *     → uma taxa por dia de aniversário, válida de DD/MM a DD/MM+1
 *   - TR: série 226 → uma taxa por dia de início do período, válida de DD/MM a DD/MM+1
 *   - SELIC: série 11 e CDI: série 12 → taxa % ao dia útil
 *
 * O BCB aceita no máximo 10 anos por consulta em séries diárias, então a busca é feita em janelas.
 * No navegador a consulta passa pelo proxy /api/proxy-bcb-indices (CORS); no servidor vai direto ao BCB.
 */

export const SERIE_POUPANCA_NOVA = 195
export const SERIE_POUPANCA_ANTIGA = 25
export const SERIE_TR_DIARIA = 226
export const SERIE_SELIC_DIARIA = 11
export const SERIE_CDI_DIARIA = 12

// Data de corte da regra nova da poupança (Lei 12.703/2012)
export const INICIO_REGRA_NOVA_POUPANCA = new Date(2012, 4, 4)

const pad = (n: number) => String(n).padStart(2, "0")
export const formatarData = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`

function urlSerie(serie: number, inicio: Date, fim: Date): string {
  const di = encodeURIComponent(formatarData(inicio))
  const df = encodeURIComponent(formatarData(fim))
  if (typeof window !== "undefined") {
    return `/api/proxy-bcb-indices?serie=${serie}&dataInicial=${di}&dataFinal=${df}`
  }
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${di}&dataFinal=${df}`
}

async function buscarJanela(serie: number, inicio: Date, fim: Date): Promise<{ data: string; valor: string }[]> {
  let ultimoErro: unknown
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const resp = await fetch(urlSerie(serie, inicio, fim), {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      })
      // 404 do BCB = nenhum dado no intervalo
      if (resp.status === 404) return []
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const dados = await resp.json()
      if (!Array.isArray(dados)) throw new Error(`resposta inválida: ${JSON.stringify(dados).slice(0, 120)}`)
      return dados
    } catch (erro) {
      ultimoErro = erro
      if (tentativa < 3) await new Promise((r) => setTimeout(r, 800 * tentativa))
    }
  }
  throw new Error(`Falha ao consultar série ${serie} do BCB: ${ultimoErro}`)
}

const cache = new Map<string, Promise<Map<string, number>>>()

/**
 * Retorna as taxas diárias (em %) da série, indexadas por "DD/MM/AAAA", no intervalo [inicio, fim].
 * Lança erro se o BCB não responder — quem chama decide o fallback.
 */
export function obterSerieDiaria(serie: number, inicio: Date, fim: Date): Promise<Map<string, number>> {
  const chave = `${serie}|${formatarData(inicio)}|${formatarData(fim)}`
  const existente = cache.get(chave)
  if (existente) return existente

  const promessa = (async () => {
    const taxas = new Map<string, number>()
    // Janelas de até 9 anos (margem sob o limite de 10 anos do BCB)
    let janelaInicio = new Date(inicio)
    while (janelaInicio <= fim) {
      const janelaFim = new Date(janelaInicio.getFullYear() + 9, janelaInicio.getMonth(), janelaInicio.getDate() - 1)
      const ate = janelaFim < fim ? janelaFim : fim
      for (const item of await buscarJanela(serie, janelaInicio, ate)) {
        const valor = parseFloat(String(item.valor).replace(",", "."))
        if (item.data && Number.isFinite(valor)) taxas.set(item.data, valor)
      }
      janelaInicio = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate() + 1)
    }
    return taxas
  })()

  cache.set(chave, promessa)
  promessa.catch(() => cache.delete(chave)) // não guardar falhas
  return promessa
}
