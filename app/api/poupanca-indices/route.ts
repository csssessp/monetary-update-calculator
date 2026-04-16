import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const DATA_FILE = path.join(process.cwd(), "data", "poupanca-indices.json")

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

  const resultado: IndiceEntry[] = []
  for (const item of dados) {
    if (!item.data || !item.valor) continue
    const partes = item.data.split("/")
    const mes = parseInt(partes[1])
    const ano = parseInt(partes[2])
    const valor = parseFloat(String(item.valor).replace(",", "."))
    if (isNaN(mes) || isNaN(ano) || isNaN(valor) || valor <= 0) continue
    resultado.push({ mes, ano, valor })
  }
  return resultado
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

  return NextResponse.json({
    atualizado: true,
    salvoEmArquivo: salvo,
    novosRegistros: novosEntries.length,
    totalRegistros: indicesAtualizados.length,
    ultimoMes: indicesAtualizados[indicesAtualizados.length - 1],
    mensagem: `${novosEntries.length} novo(s) mês(es) adicionado(s) via BCB série 195`,
  })
}
