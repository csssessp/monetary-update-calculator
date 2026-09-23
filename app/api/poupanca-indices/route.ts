import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { indicesData } from "@/lib/indices-data"

export const dynamic = "force-dynamic"

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
    const dados = JSON.parse(raw) as PoupancaData
    if (Array.isArray(dados.indices) && dados.indices.length > 0) return dados
  } catch {
    // arquivo ausente no bundle do servidor — usa dados estáticos abaixo
  }
  return null
}

// Base sempre disponível: arquivo JSON ou, na falta dele, os dados estáticos de lib/indices-data.ts
function lerBase(): PoupancaData {
  const arquivo = lerArquivo()
  if (arquivo) return arquivo
  return {
    version: "1.0",
    lastUpdated: "",
    fonte: "lib/indices-data.ts (estático)",
    indices: indicesData["Poupança"].map(({ mes, ano, valor }) => ({ mes, ano, valor })),
  }
}

function salvarArquivo(data: PoupancaData): boolean {
  try {
    // Mesmo formato do arquivo versionado: um mês por linha
    const { indices, ...meta } = data
    const cabecalho = JSON.stringify(meta, null, 2).replace(/\n}$/, "")
    const linhas = indices.map((e) => `    {"mes": ${e.mes}, "ano": ${e.ano}, "valor": ${e.valor}}`).join(",\n")
    fs.writeFileSync(DATA_FILE, `${cabecalho},\n  "indices": [\n${linhas}\n  ]\n}\n`, "utf-8")
    return true
  } catch {
    // Ambientes read-only (ex: Vercel): os meses novos continuam sendo servidos pelo cache em memória
    return false
  }
}

// A taxa da Poupança de um mês é publicada no dia 01 desse mês (período 01/MM → 01/MM+1),
// então o arquivo está desatualizado sempre que não contém o mês corrente.
function dataDesatualizada(indices: IndiceEntry[]): boolean {
  if (indices.length === 0) return true
  const ultimo = indices[indices.length - 1]
  const hoje = new Date()
  return ultimo.ano * 12 + ultimo.mes < hoje.getFullYear() * 12 + hoje.getMonth() + 1
}

const pad = (n: number) => String(n).padStart(2, "0")
const fmtData = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`

/**
 * Busca Poupança do BCB série 195 (série diária: exige dataInicial/dataFinal).
 * A série traz uma taxa por dia-aniversário; o valor usado é o do DIA 01 de cada mês,
 * mesma metodologia da Calculadora do Cidadão do BCB.
 */
async function buscarBCBSerie195(dataInicial: string, dataFinal: string): Promise<IndiceEntry[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`
  console.log(`[Poupança] Buscando BCB série 195: ${url}`)
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`BCB API retornou ${resp.status}`)
  const dados = await resp.json()
  if (!Array.isArray(dados)) throw new Error(`BCB API retornou resposta inválida: ${JSON.stringify(dados).slice(0, 200)}`)

  const resultado: IndiceEntry[] = []
  for (const item of dados) {
    if (!item?.data || item.valor === undefined || item.valor === null) continue
    const [dia, mes, ano] = String(item.data).split("/").map((p: string) => parseInt(p, 10))
    const valor = parseFloat(String(item.valor).replace(",", "."))
    if (dia !== 1 || isNaN(mes) || isNaN(ano) || isNaN(valor) || valor <= 0) continue
    resultado.push({ mes, ano, valor })
  }
  return resultado
}

// Cache em memória por instância do servidor (evita consultar o BCB a cada requisição)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
let cacheBCB: { chave: string; entradas: IndiceEntry[]; expiraEm: number } | null = null

interface Complemento {
  dados: PoupancaData
  novos: IndiceEntry[]
  erro?: string
}

// Acrescenta à base os meses posteriores ao último registro, buscando no BCB.
async function complementarComBCB(base: PoupancaData): Promise<Complemento> {
  if (!dataDesatualizada(base.indices)) return { dados: base, novos: [] }

  const ultimo = base.indices[base.indices.length - 1]
  const proximo = new Date(ultimo.ano, ultimo.mes, 1)
  const dataInicial = fmtData(proximo)
  const dataFinal = fmtData(new Date())
  const chave = `${dataInicial}-${dataFinal}`

  let entradas: IndiceEntry[]
  if (cacheBCB && cacheBCB.chave === chave && cacheBCB.expiraEm > Date.now()) {
    entradas = cacheBCB.entradas
  } else {
    try {
      entradas = await buscarBCBSerie195(dataInicial, dataFinal)
      cacheBCB = { chave, entradas, expiraEm: Date.now() + CACHE_TTL_MS }
    } catch (err) {
      console.error("[Poupança] Falha ao buscar BCB:", err)
      return { dados: base, novos: [], erro: String(err) }
    }
  }

  const mapa = new Map<string, IndiceEntry>()
  for (const e of base.indices) mapa.set(`${e.ano}-${e.mes}`, e)
  const novos = entradas.filter((e) => !mapa.has(`${e.ano}-${e.mes}`))
  if (novos.length === 0) return { dados: base, novos: [] }
  for (const e of novos) mapa.set(`${e.ano}-${e.mes}`, e)

  const indices = Array.from(mapa.values()).sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes))
  return {
    dados: { ...base, lastUpdated: new Date().toISOString(), fonte: `${base.fonte} + BCB Série 195 (automático)`, indices },
    novos,
  }
}

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function atualizarHistoricoTxt(novosEntries: IndiceEntry[], anterior: IndiceEntry): void {
  try {
    let conteudo = fs.readFileSync(HISTORICO_FILE, "utf-8")
    const hoje = new Date().toISOString().split("T")[0]
    const novos = [...novosEntries].sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes))

    // Linhas de dados: inserir após a linha do último mês já registrado ("AAAA-MM   0.1234")
    const linhaAnterior = new RegExp(`^${anterior.ano}-${pad(anterior.mes)}   \\d.*$`, "m").exec(conteudo)
    if (!linhaAnterior) return
    const posDados = linhaAnterior.index + linhaAnterior[0].length
    const linhasDados = novos
      .map((e) => `${e.ano}-${pad(e.mes)}   ${e.valor.toFixed(4)}  # ${NOMES_MES[e.mes - 1]}/${e.ano} — adicionado em ${hoje} via BCB`)
      .join("\n")
    conteudo = conteudo.slice(0, posDados) + "\n" + linhasDados + conteudo.slice(posDados)

    // LOG: inserir após a última linha "AAAA-MM-DD   ..."
    const linhasLog = [...conteudo.matchAll(/^\d{4}-\d{2}-\d{2}   .*$/gm)]
    if (linhasLog.length > 0) {
      const ultimaLog = linhasLog[linhasLog.length - 1]
      const posLog = (ultimaLog.index ?? 0) + ultimaLog[0].length
      const meses = novos.map((e) => `${NOMES_MES[e.mes - 1]}/${e.ano}`).join(", ")
      conteudo = conteudo.slice(0, posLog) + `\n${hoje}   Atualização automática      ${meses}   BCB Série 195` + conteudo.slice(posLog)
    }

    fs.writeFileSync(HISTORICO_FILE, conteudo, "utf-8")
  } catch {
    // Falha silenciosa — o histórico é apenas um registro auxiliar
  }
}

// GET — retorna todos os índices, já complementados com os meses mais recentes do BCB
export async function GET() {
  const { dados, erro } = await complementarComBCB(lerBase())
  return NextResponse.json(erro ? { ...dados, avisoBCB: erro } : dados)
}

// POST — complementa com o BCB e tenta persistir no arquivo (funciona em servidor com disco gravável)
export async function POST() {
  const base = lerBase()
  const { dados, novos, erro } = await complementarComBCB(base)

  if (erro) {
    return NextResponse.json({ error: "Falha ao buscar dados do BCB", detalhes: erro }, { status: 502 })
  }

  if (novos.length === 0) {
    return NextResponse.json({
      atualizado: false,
      mensagem: "Dados já estão atualizados",
      ultimoMes: dados.indices[dados.indices.length - 1],
    })
  }

  const salvo = lerArquivo() !== null && salvarArquivo(dados)
  if (salvo) {
    atualizarHistoricoTxt(novos, base.indices[base.indices.length - 1])
  }

  return NextResponse.json({
    atualizado: true,
    salvoEmArquivo: salvo,
    novosRegistros: novos.length,
    totalRegistros: dados.indices.length,
    ultimoMes: dados.indices[dados.indices.length - 1],
    mensagem: `${novos.length} novo(s) mês(es) adicionado(s) via BCB série 195`,
  })
}
