import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const DATA_FILE = path.join(process.cwd(), "data", "poupanca-indices.json")
const HISTORICO_FILE = path.join(process.cwd(), "data", "indices-historico.txt")

interface IndiceEntry {
  mes: number
  ano: number
  valor: number
}

interface PoupancaData {
  version: string
  lastUpdated: string
  fonte: string
  indices: IndiceEntry[]
}

function lerArquivo(): PoupancaData | null {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8")
    return JSON.parse(raw) as PoupancaData
  } catch {
    return null
  }
}

function salvarArquivo(data: PoupancaData): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8")
    return true
  } catch {
    // Falha silenciosa em ambientes read-only (ex: Vercel)
    return false
  }
}

function dataDesatualizada(indices: IndiceEntry[]): boolean {
  if (indices.length === 0) return true
  const ultimo = indices[indices.length - 1]
  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()
  // Desatualizado se o último mês disponível é anterior ao mês passado
  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
  const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
  return ultimo.ano < anoAnterior || (ultimo.ano === anoAnterior && ultimo.mes < mesAnterior)
}

/**
 * Busca Poupança do BCB série 195 (taxa mensal oficial)
 * Série 195: "Taxa de remuneração dos depósitos de poupança" — mensal
 */
async function buscarBCBSerie195(dataInicial: string, dataFinal: string): Promise<IndiceEntry[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`
  console.log(`[Poupança] Buscando BCB série 195: ${url}`)
  const resp = await fetch(url, {
    headers: { "Accept": "application/json" },
    cache: "no-store",
  })
  if (!resp.ok) throw new Error(`BCB API retornou ${resp.status}`)
  const dados = await resp.json()
  if (!Array.isArray(dados)) return []

  // BCB Série 195 retorna uma entrada por DIA-ANIVERSÁRIO do mês.
  // O valor correto é o do DIA 1 de cada mês (rate para depósitos com aniversário no dia 1),
  // que é o mesmo valor usado pela Calculadora do Cidadão do BCB para correção monetária.
  // Usamos "first-entry wins" por mês: a primeira entrada encontrada vence.
  const mapaResult = new Map<string, IndiceEntry>()
  for (const item of dados) {
    if (!item.data || !item.valor) continue
    const partes = item.data.split("/")
    const mes = parseInt(partes[1])
    const ano = parseInt(partes[2])
    const valor = parseFloat(String(item.valor).replace(",", "."))
    if (isNaN(mes) || isNaN(ano) || isNaN(valor) || valor <= 0) continue
    const key = `${ano}-${mes}`
    if (!mapaResult.has(key)) {
      mapaResult.set(key, { mes, ano, valor })
    }
  }
  return Array.from(mapaResult.values())
}

const NOMES_MES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function atualizarHistoricoTxt(novosEntries: IndiceEntry[], periodoInicial: string): void {
  try {
    const hoje = new Date().toISOString().split("T")[0]
    const mesesStr = novosEntries
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
      .map((e) => {
        const mm = String(e.mes).padStart(2, "0")
        const nMes = NOMES_MES[e.mes - 1]
        return `${e.ano}-${mm}   ${e.valor.toFixed(4)}  # ${nMes}/${e.ano} — adicionado em ${hoje} via BCB`
      })
      .join("\n")

    const logEntry = `${hoje}   Atualização automática       ${novosEntries.map(e=>`${NOMES_MES[e.mes-1]}/${e.ano}`).join(", ")}   BCB Série 195\n`

    let conteudo = ""
    try { conteudo = fs.readFileSync(HISTORICO_FILE, "utf-8") } catch { return }

    // Inserir novas linhas de dados antes da linha do LOG DE ATUALIZAÇÕES
    const marcadorDados = "2026-06   0.6718"
    const marcadorLog = "LOG DE ATUALIZAÇÕES"

    if (conteudo.includes(marcadorLog)) {
      // Adicionar novas linhas de dados logo antes do bloco de LOG
      const partes = conteudo.split(/={3,}[\s\S]*?LOG DE ATUALIZAÇÕES[\s\S]*?={3,}\n/)
      if (partes.length >= 2) {
        // Encontrar posição do separador do LOG
        const idxLog = conteudo.indexOf("=" .repeat(3))
        const idxLogReal = conteudo.indexOf("LOG DE ATUALIZAÇÕES")
        const idxSep = conteudo.lastIndexOf("=".repeat(10), idxLogReal)

        const antes = conteudo.substring(0, idxSep).trimEnd()
        const depois = conteudo.substring(idxSep)

        // Encontrar última linha de dados e inserir após ela
        const ultimaLinhaDados = marcadorDados
        const posUltima = antes.lastIndexOf(ultimaLinhaDados)
        if (posUltima >= 0) {
          const fimUltima = antes.indexOf("\n", posUltima)
          const novoConteudo =
            antes.substring(0, fimUltima + 1) +
            mesesStr + "\n" +
            antes.substring(fimUltima + 1) + "\n" +
            depois.replace(
              /(----------   -------------------------   ---------------------   ---------------\n)/,
              `$1${logEntry}`
            )
          fs.writeFileSync(HISTORICO_FILE, novoConteudo, "utf-8")
        }
      }
    }
  } catch {
    // Falha silenciosa — o histórico é apenas um registro auxiliar
  }
}

// GET — retorna o arquivo JSON com todos os índices
export async function GET() {
  const dados = lerArquivo()
  if (!dados) {
    return NextResponse.json({ error: "Arquivo de dados não encontrado" }, { status: 404 })
  }
  return NextResponse.json(dados)
}

// POST — verifica se está desatualizado e, se sim, busca BCB série 195 e atualiza o arquivo
export async function POST() {
  const dados = lerArquivo()
  if (!dados) {
    return NextResponse.json({ error: "Arquivo de dados não encontrado" }, { status: 500 })
  }

  if (!dataDesatualizada(dados.indices)) {
    return NextResponse.json({
      atualizado: false,
      mensagem: "Dados já estão atualizados",
      ultimoMes: dados.indices[dados.indices.length - 1],
    })
  }

  // Calcular período a buscar: mês seguinte ao último registro até hoje
  const ultimo = dados.indices[dados.indices.length - 1]
  const proximoMes = ultimo.mes === 12 ? 1 : ultimo.mes + 1
  const proximoAno = ultimo.mes === 12 ? ultimo.ano + 1 : ultimo.ano
  const hoje = new Date()
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  const dataInicial = `01/${String(proximoMes).padStart(2, "0")}/${proximoAno}`
  const dataFinal = fmt(hoje)

  console.log(`[Poupança] Buscando período: ${dataInicial} a ${dataFinal}`)

  let novosEntries: IndiceEntry[] = []
  try {
    novosEntries = await buscarBCBSerie195(dataInicial, dataFinal)
  } catch (err) {
    console.error("[Poupança] Falha ao buscar BCB:", err)
    return NextResponse.json({ error: "Falha ao buscar dados do BCB", detalhes: String(err) }, { status: 502 })
  }

  if (novosEntries.length === 0) {
    return NextResponse.json({
      atualizado: false,
      mensagem: "Nenhum dado novo disponível no BCB para o período",
      periodo: `${dataInicial} a ${dataFinal}`,
    })
  }

  // Mesclar sem duplicatas
  const mapa = new Map<string, IndiceEntry>()
  for (const e of dados.indices) mapa.set(`${e.ano}-${e.mes}`, e)
  for (const e of novosEntries) mapa.set(`${e.ano}-${e.mes}`, e)

  const indicesAtualizados = Array.from(mapa.values()).sort((a, b) =>
    a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
  )

  const dadosNovos: PoupancaData = {
    ...dados,
    lastUpdated: new Date().toISOString(),
    fonte: "BCB Série 195 (atualização automática)",
    indices: indicesAtualizados,
  }

  const salvo = salvarArquivo(dadosNovos)

  // Atualizar arquivo histórico de texto com os novos meses
  if (salvo) {
    atualizarHistoricoTxt(novosEntries, dataInicial)
  }

  return NextResponse.json({
    atualizado: true,
    salvoEmArquivo: salvo,
    novosRegistros: novosEntries.length,
    totalRegistros: indicesAtualizados.length,
    ultimoMes: indicesAtualizados[indicesAtualizados.length - 1],
    mensagem: `${novosEntries.length} novo(s) mês(es) adicionado(s) via BCB série 195`,
  })
}
