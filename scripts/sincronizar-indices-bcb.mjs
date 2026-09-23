#!/usr/bin/env node
/**
 * Sincroniza os dados estáticos (lib/indices-data.ts e data/poupanca-indices.json)
 * com as séries oficiais do Banco Central (SGS).
 *
 * - IGP-M, IPCA, INPC, CDI, SELIC, TR: cada bloco é regenerado integralmente a partir do BCB,
 *   mantendo o mês inicial já usado no sistema (IGP-M começa em Jun/1989, início da série FGV).
 * - Poupança: o histórico curado é preservado; apenas os meses posteriores ao último registro
 *   são acrescentados (valor do dia 01 de cada mês da série 195).
 *
 * Uso: node scripts/sincronizar-indices-bcb.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const ARQ_TS = path.join(raiz, "lib", "indices-data.ts")
const ARQ_JSON = path.join(raiz, "data", "poupanca-indices.json")
const ARQ_TXT = path.join(raiz, "data", "indices-historico.txt")

const SERIES = [
  { chave: '"IGP-M"', serie: 28655, inicio: [1989, 6], titulo: "IGP-M - Índice Geral de Preços do Mercado (FGV)" },
  { chave: "IPCA", serie: 433, inicio: [1994, 7], titulo: "IPCA - Índice Nacional de Preços ao Consumidor Amplo (IBGE)" },
  { chave: "INPC", serie: 188, inicio: [1994, 7], titulo: "INPC - Índice Nacional de Preços ao Consumidor (IBGE)" },
  // CDI/SELIC: o mês corrente é um acumulado parcial — só entram meses encerrados
  { chave: "CDI", serie: 4391, inicio: [2010, 1], titulo: "CDI - taxa acumulada no mês", soMesesFechados: true },
  { chave: "SELIC", serie: 4390, inicio: [2010, 1], titulo: "SELIC - taxa acumulada no mês", soMesesFechados: true },
  { chave: "TR", serie: 7811, inicio: [2017, 1], titulo: "TR - Taxa Referencial (primeiro dia do mês)" },
]

const CRLF = "\r\n"
const LF = "\n"
const pad = (n) => String(n).padStart(2, "0")
const fmtData = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`

async function buscarJSON(url) {
  let ultimoErro
  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    try {
      const resp = await fetch(url, { headers: { Accept: "application/json" } })
      const texto = await resp.text()
      const json = JSON.parse(texto)
      if (!Array.isArray(json)) throw new Error(JSON.stringify(json).slice(0, 200))
      return json
    } catch (e) {
      ultimoErro = e
      await new Promise((r) => setTimeout(r, 2000 * tentativa))
    }
  }
  throw new Error(`Falha ao buscar ${url}: ${ultimoErro}`)
}

function parseItem(item) {
  const [dia, mes, ano] = String(item.data).split("/").map(Number)
  const valor = parseFloat(String(item.valor).replace(",", "."))
  return { dia, mes, ano, valor }
}

async function buscarMensal(serie, [anoIni, mesIni], soMesesFechados) {
  const hoje = new Date()
  const dados = await buscarJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json`)
  const mapa = new Map()
  for (const item of dados) {
    const { mes, ano, valor } = parseItem(item)
    if (!Number.isFinite(valor) || ano < anoIni || (ano === anoIni && mes < mesIni)) continue
    if (soMesesFechados && ano * 12 + mes >= hoje.getFullYear() * 12 + hoje.getMonth() + 1) continue
    mapa.set(`${ano}-${mes}`, { mes, ano, valor })
  }
  return [...mapa.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes)
}

function gerarBloco({ chave, serie, titulo }, dados) {
  const linhas = [
    `  ${chave}: [`,
    `    // ═══════════════════════════════════════════════════════════════════`,
    `    // ${titulo}`,
    `    // Fonte: Banco Central do Brasil (BCB Série ${serie}) — sincronizado em ${new Date().toISOString().slice(0, 10)}`,
    `    // Gerado por scripts/sincronizar-indices-bcb.mjs`,
    `    // ═══════════════════════════════════════════════════════════════════`,
  ]
  let anoAtual = null
  for (const d of dados) {
    if (d.ano !== anoAtual) {
      linhas.push(`    // ${d.ano}`)
      anoAtual = d.ano
    }
    linhas.push(`    { mes: ${d.mes}, ano: ${d.ano}, valor: ${d.valor} },`)
  }
  linhas.push(`  ],`)
  return linhas.join(LF)
}

function substituirBloco(fonte, chave, novoBloco) {
  const inicio = fonte.indexOf(`${LF}  ${chave}: [`)
  if (inicio < 0) throw new Error(`Bloco ${chave} não encontrado em indices-data.ts`)
  const fechamento = `${LF}  ],`
  const fim = fonte.indexOf(fechamento, inicio)
  return fonte.slice(0, inicio + 1) + novoBloco + fonte.slice(fim + fechamento.length)
}

// Poupança: meses após o último registro, valor do dia 01 (série 195 é diária → exige intervalo de datas)
async function buscarPoupancaNovos(ultimo) {
  const proximo = new Date(ultimo.ano, ultimo.mes, 1)
  const hoje = new Date()
  if (proximo > hoje) return []
  const dados = await buscarJSON(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial=${fmtData(proximo)}&dataFinal=${fmtData(hoje)}`,
  )
  return dados
    .map(parseItem)
    .filter((d) => d.dia === 1 && Number.isFinite(d.valor) && d.valor > 0)
    .map(({ mes, ano, valor }) => ({ mes, ano, valor }))
}

async function main() {
  const original = fs.readFileSync(ARQ_TS, "utf-8")
  const eol = original.includes(CRLF) ? CRLF : LF
  let fonte = original.split(CRLF).join(LF)

  for (const cfg of SERIES) {
    const dados = await buscarMensal(cfg.serie, cfg.inicio, cfg.soMesesFechados)
    if (dados.length === 0) throw new Error(`BCB retornou série ${cfg.serie} vazia`)
    fonte = substituirBloco(fonte, cfg.chave, gerarBloco(cfg, dados))
    const u = dados[dados.length - 1]
    console.log(`✓ ${cfg.chave.replace(/"/g, "")}: ${dados.length} meses (até ${pad(u.mes)}/${u.ano})`)
  }

  // Poupança
  const json = JSON.parse(fs.readFileSync(ARQ_JSON, "utf-8"))
  const ultimo = json.indices[json.indices.length - 1]
  const novos = await buscarPoupancaNovos(ultimo)
  if (novos.length > 0) {
    // data/poupanca-indices.json: inserção textual (preserva a formatação existente)
    let textoJson = fs.readFileSync(ARQ_JSON, "utf-8")
    const fimArray = textoJson.lastIndexOf("}", textoJson.lastIndexOf("]")) + 1
    const linhasJson = novos.map((e) => `    {"mes": ${e.mes}, "ano": ${e.ano}, "valor": ${e.valor}}`).join(`,${LF}`)
    textoJson = textoJson.slice(0, fimArray) + `,${LF}${linhasJson}` + textoJson.slice(fimArray)
    textoJson = textoJson.replace(/"lastUpdated": "[^"]*"/, `"lastUpdated": "${new Date().toISOString()}"`)
    JSON.parse(textoJson) // valida antes de gravar
    fs.writeFileSync(ARQ_JSON, textoJson, "utf-8")

    // lib/indices-data.ts: acrescentar ao fim do bloco Poupança
    const ini = fonte.indexOf(`${LF}  Poupança: [`)
    const fim = fonte.indexOf(`${LF}  ],`, ini)
    let extra = ""
    let anoAnterior = ultimo.ano
    for (const n of novos) {
      if (n.ano !== anoAnterior) {
        extra += `${LF}    // ${n.ano}`
        anoAnterior = n.ano
      }
      extra += `${LF}    { mes: ${n.mes}, ano: ${n.ano}, valor: ${n.valor} },`
    }
    fonte = fonte.slice(0, fim) + extra + fonte.slice(fim)

    // data/indices-historico.txt: linhas de dados + log
    const hoje = new Date().toISOString().slice(0, 10)
    let txt = fs.readFileSync(ARQ_TXT, "utf-8")
    // linha de dados do último mês: "AAAA-MM   0.1234" no início da linha
    const linhaUltimo = new RegExp(`^${ultimo.ano}-${pad(ultimo.mes)}   \\d`, "m").exec(txt)
    if (linhaUltimo) {
      const fimLinha = txt.indexOf(LF, linhaUltimo.index)
      const novasLinhas = novos
        .map((n) => `${n.ano}-${pad(n.mes)}   ${n.valor.toFixed(4)}  # BCB Série 195 dia 01/${pad(n.mes)}/${n.ano} — adicionado em ${hoje}`)
        .join(LF)
      txt = txt.slice(0, fimLinha + 1) + novasLinhas + LF + txt.slice(fimLinha + 1)
      // LOG: inserir após a última linha "AAAA-MM-DD   ..."
      const linhasLog = [...txt.matchAll(/^\d{4}-\d{2}-\d{2}   .*$/gm)]
      if (linhasLog.length > 0) {
        const ultimaLog = linhasLog[linhasLog.length - 1]
        const pos = ultimaLog.index + ultimaLog[0].length
        const periodo = `${novos[0].ano}-${pad(novos[0].mes)} a ${novos.at(-1).ano}-${pad(novos.at(-1).mes)}`
        txt = txt.slice(0, pos) + `${LF}${hoje}   Sincronização BCB           ${periodo.padEnd(21)}   BCB Série 195` + txt.slice(pos)
      }
      fs.writeFileSync(ARQ_TXT, txt, "utf-8")
    }
    console.log(`✓ Poupança: +${novos.length} mês(es): ${novos.map((n) => `${pad(n.mes)}/${n.ano}=${n.valor}`).join(", ")}`)
  } else {
    console.log("✓ Poupança: já atualizada")
  }

  fs.writeFileSync(ARQ_TS, fonte.split(LF).join(eol), "utf-8")
  console.log(`${LF}Arquivos atualizados. Revise o diff antes de commitar.`)
}

main().catch((e) => {
  console.error("❌", e.message)
  process.exit(1)
})
