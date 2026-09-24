/**
 * Parcelamento do débito e rompimento do acordo — Parecer AJG nº 573/2007 (item 12):
 *   (i)  o débito é atualizado pelos rendimentos da caderneta de poupança;
 *   (ii) as parcelas são reajustadas pelo IGP-M/FGV ao término de cada período de 12 parcelas;
 *   (iii) no rompimento do acordo incidem juros moratórios de 0,5% ao mês e o não pagamento
 *         de uma parcela gera o vencimento antecipado da dívida total.
 *
 * Premissas adotadas (a confirmar pelo setor — ficam explícitas na memória de cálculo):
 *   • Parcela p vence no mesmo dia do 1º vencimento, p−1 meses depois (dia ajustado ao fim do mês).
 *   • Reajuste do ciclo c (parcelas 12c−11 a 12c): IGP-M acumulado nos 12 meses de vencimento
 *     das parcelas do ciclo anterior, aplicado de forma cumulativa.
 *   • Rompimento: vence antecipadamente o saldo = parcelas não pagas × valor da parcela vigente
 *     na data do rompimento (vencimento da 1ª parcela não paga); o saldo é atualizado pela
 *     Poupança e recebe juros moratórios simples até a data de atualização.
 */

import type { DataCalculo, FatorPeriodo } from "./calculo-monetario"
import { fundamentacaoParcelamento, fundamentacaoRompimento } from "./fundamentacao"

export type IndiceReajusteParcelas = "nenhum" | "IGP-M" | "IPCA"
export type ContagemJuros = "dias" | "meses"

export interface ParametrosParcelamento {
  valorBase: number
  numeroParcelas: number
  dataPrimeiraParcela: DataCalculo
  reajuste: IndiceReajusteParcelas
  rompimento?: {
    parcelasPagas: number
    dataAtualizacao: DataCalculo
    taxaJurosMoraMensal: number // em %
    contagemJuros: ContagemJuros
  }
}

export interface ParcelaCalculada {
  numero: number
  ciclo: number
  vencimento: DataCalculo
  valor: number
  provisoria: boolean // reajuste do ciclo depende de IGP-M/IPCA ainda não publicado
}

export interface ResultadoRompimento {
  parcelasPagas: number
  parcelasEmAberto: number
  dataRompimento: DataCalculo
  dataAtualizacao: DataCalculo
  valorParcelaVigente: number
  saldoAntecipado: number
  fatorPoupanca: number
  saldoCorrigido: number
  taxaJurosMoraMensal: number
  periodoJurosMeses: number
  juros: number
  totalDevido: number
  valorPago: number
}

export interface ResultadoParcelamento {
  parcelas: ParcelaCalculada[]
  totalParcelado: number
  valorParcelaInicial: number
  possuiProvisorias: boolean
  rompimento?: ResultadoRompimento
  memoria: string[]
  fundamentacao: string[] // base legal e critérios, para a seção final da memória
}

type FatorFn = (di: DataCalculo, df: DataCalculo, indice: string) => Promise<FatorPeriodo>

const pad = (n: number) => String(n).padStart(2, "0")
export const fmtData = (d: DataCalculo) => `${pad(d.dia)}/${pad(d.mes)}/${d.ano}`
const fmtMesAno = (d: DataCalculo) => `${pad(d.mes)}/${d.ano}`
const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const paraDate = (d: DataCalculo) => new Date(d.ano, d.mes - 1, d.dia)

/** Soma meses mantendo o dia; se o mês não tiver o dia (ex.: 31/02), usa o último dia do mês. */
export function somarMeses(d: DataCalculo, meses: number): DataCalculo {
  const base = new Date(d.ano, d.mes - 1 + meses, 1)
  const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return { dia: Math.min(d.dia, ultimoDia), mes: base.getMonth() + 1, ano: base.getFullYear() }
}

/**
 * Período entre duas datas em meses: meses completos (de aniversário a aniversário)
 * + dias restantes ÷ 30 (pro rata die, mês comercial de 30 dias).
 */
export function periodoEmMeses(inicio: DataCalculo, fim: DataCalculo): { meses: number; mesesCompletos: number; diasRestantes: number } {
  const dFim = paraDate(fim)
  if (dFim <= paraDate(inicio)) return { meses: 0, mesesCompletos: 0, diasRestantes: 0 }
  let completos = 0
  while (paraDate(somarMeses(inicio, completos + 1)) <= dFim) completos++
  const aniversario = paraDate(somarMeses(inicio, completos))
  const diasRestantes = Math.round((Date.UTC(fim.ano, fim.mes - 1, fim.dia) - Date.UTC(aniversario.getFullYear(), aniversario.getMonth(), aniversario.getDate())) / 86400000)
  return { meses: completos + diasRestantes / 30, mesesCompletos: completos, diasRestantes }
}

export function diasEntre(inicio: DataCalculo, fim: DataCalculo): number {
  return Math.max(0, Math.round((Date.UTC(fim.ano, fim.mes - 1, fim.dia) - Date.UTC(inicio.ano, inicio.mes - 1, inicio.dia)) / 86400000))
}

export async function calcularParcelamento(p: ParametrosParcelamento, fatorPeriodo: FatorFn): Promise<ResultadoParcelamento> {
  const memoria: string[] = []
  const n = Math.floor(p.numeroParcelas)
  const valorParcelaBase = p.valorBase / n
  const numCiclos = Math.ceil(n / 12)
  const vencimento = (numero: number) => somarMeses(p.dataPrimeiraParcela, numero - 1)
  const nomeIndice = p.reajuste === "IPCA" ? "IPCA (IBGE)" : "IGP-M (FGV)"

  memoria.push(``)
  memoria.push(`═══════════════════════════════════════════════════════════`)
  memoria.push(`PARCELAMENTO EM ${n} PARCELAS`)
  memoria.push(`═══════════════════════════════════════════════════════════`)
  memoria.push(`Valor base (total atualizado): ${brl(p.valorBase)}`)
  memoria.push(`Parcela base (1º ciclo): ${brl(p.valorBase)} ÷ ${n} = ${brl(valorParcelaBase)}`)
  memoria.push(`Vencimento da 1ª parcela: ${fmtData(p.dataPrimeiraParcela)} (demais no mesmo dia dos meses seguintes)`)

  // Fator de reajuste acumulado de cada ciclo
  const fatorCiclo: number[] = [1]
  const provisorioCiclo: boolean[] = [false]
  if (p.reajuste !== "nenhum" && numCiclos > 1) {
    memoria.push(`Reajuste das parcelas: ${p.reajuste} acumulado dos 12 meses de vencimento do ciclo anterior, ao término de cada período de 12 parcelas${p.reajuste === "IGP-M" ? " (Parecer AJG nº 573/2007, item 12, ii)" : ""}.`)
    memoria.push(``)
    memoria.push(`Ciclo | Parcelas | Meses do ${p.reajuste} | ${p.reajuste} acumulado | Fator do ciclo`)
    let acumulado = 1
    let pendente = false
    for (let c = 2; c <= numCiclos; c++) {
      const de = vencimento((c - 2) * 12 + 1)
      const ate = vencimento((c - 1) * 12)
      const fp = await fatorPeriodo({ ...de, dia: 1 }, { ...ate, dia: 1 }, nomeIndice)
      const completo = !pendente && fp.aplicados === fp.esperados && fp.esperados === 12
      if (completo) {
        acumulado *= fp.fator
        memoria.push(`${String(c).padStart(5)} | ${String((c - 1) * 12 + 1).padStart(3)} a ${String(Math.min(c * 12, n)).padStart(3)} | ${fmtMesAno(de)} a ${fmtMesAno(ate)} | ${((fp.fator - 1) * 100).toFixed(4).replace(".", ",")}% | ${acumulado.toFixed(8)}`)
      } else {
        pendente = true
        memoria.push(`${String(c).padStart(5)} | ${String((c - 1) * 12 + 1).padStart(3)} a ${String(Math.min(c * 12, n)).padStart(3)} | ${fmtMesAno(de)} a ${fmtMesAno(ate)} | a definir (${p.reajuste} ainda não publicado) | provisório = ${acumulado.toFixed(8)}`)
      }
      fatorCiclo.push(acumulado)
      provisorioCiclo.push(pendente)
    }
  } else {
    memoria.push(`Reajuste das parcelas: ${p.reajuste === "nenhum" ? "não aplicado" : "não se aplica (até 12 parcelas)"}.`)
    for (let c = 2; c <= numCiclos; c++) {
      fatorCiclo.push(1)
      provisorioCiclo.push(false)
    }
  }

  const parcelas: ParcelaCalculada[] = []
  for (let numero = 1; numero <= n; numero++) {
    const ciclo = Math.ceil(numero / 12)
    parcelas.push({
      numero,
      ciclo,
      vencimento: vencimento(numero),
      valor: valorParcelaBase * fatorCiclo[ciclo - 1],
      provisoria: provisorioCiclo[ciclo - 1],
    })
  }
  const totalParcelado = parcelas.reduce((s, x) => s + x.valor, 0)
  const possuiProvisorias = parcelas.some((x) => x.provisoria)

  memoria.push(``)
  memoria.push(`Parcela | Ciclo | Vencimento | Valor (R$)`)
  memoria.push(`--------|-------|------------|------------------------------`)
  for (const x of parcelas) {
    memoria.push(`${String(x.numero).padStart(7)} | ${String(x.ciclo).padStart(5)} | ${fmtData(x.vencimento)} | ${x.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${x.provisoria ? "  (a reajustar)" : ""}`)
  }
  memoria.push(`--------|-------|------------|------------------------------`)
  memoria.push(`  TOTAL |       |            | ${totalParcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${possuiProvisorias ? "  (provisório)" : ""}`)
  if (possuiProvisorias) {
    memoria.push(`⚠ ATENÇÃO: parcelas marcadas "(a reajustar)" dependem de ${p.reajuste} ainda não publicado; seus valores serão reajustados quando o índice for divulgado.`)
  }

  let rompimento: ResultadoRompimento | undefined
  if (p.rompimento) {
    const r = p.rompimento
    const pagas = Math.max(0, Math.floor(r.parcelasPagas))
    memoria.push(``)
    memoria.push(`═══════════════════════════════════════════════════════════`)
    memoria.push(`ROMPIMENTO DO PARCELAMENTO — VENCIMENTO ANTECIPADO`)
    memoria.push(`═══════════════════════════════════════════════════════════`)
    if (pagas >= n) {
      memoria.push(`Todas as ${n} parcelas foram pagas: não há saldo em aberto.`)
    } else {
      const parcelaNaoPaga = parcelas[pagas]
      const dataRompimento = parcelaNaoPaga.vencimento
      const valorPago = parcelas.slice(0, pagas).reduce((s, x) => s + x.valor, 0)
      const emAberto = n - pagas
      const saldoAntecipado = emAberto * parcelaNaoPaga.valor

      const fp = await fatorPeriodo(dataRompimento, r.dataAtualizacao, "Poupança")
      const fatorPoupanca = paraDate(r.dataAtualizacao) > paraDate(dataRompimento) ? fp.fator : 1
      const saldoCorrigido = saldoAntecipado * fatorPoupanca

      const periodo = periodoEmMeses(dataRompimento, r.dataAtualizacao)
      const dias = diasEntre(dataRompimento, r.dataAtualizacao)
      const periodoJurosMeses = r.contagemJuros === "meses" ? periodo.meses : (dias / 365) * 12
      const juros = saldoCorrigido * (r.taxaJurosMoraMensal / 100) * periodoJurosMeses
      const totalDevido = saldoCorrigido + juros

      memoria.push(`Parcelas pagas: ${pagas} (${brl(valorPago)}) | Parcelas em aberto: ${emAberto}`)
      memoria.push(`Data do rompimento (vencimento da parcela ${parcelaNaoPaga.numero}, não paga): ${fmtData(dataRompimento)}`)
      memoria.push(`Vencimento antecipado da dívida total (Parecer AJG nº 573/2007, item 12).`)
      memoria.push(``)
      memoria.push(`1) Saldo vencido antecipadamente = ${emAberto} parcela(s) × ${brl(parcelaNaoPaga.valor)} (parcela vigente) = ${brl(saldoAntecipado)}`)
      memoria.push(`2) Atualização pela Poupança de ${fmtData(dataRompimento)} a ${fmtData(r.dataAtualizacao)} (Parecer, item 12, i): fator ${fatorPoupanca.toFixed(8)}`)
      for (const aviso of fp.avisos) memoria.push(`   ⚠ ${aviso}`)
      memoria.push(`   Saldo corrigido = ${brl(saldoAntecipado)} × ${fatorPoupanca.toFixed(8)} = ${brl(saldoCorrigido)}`)
      if (r.contagemJuros === "meses") {
        memoria.push(`3) Juros moratórios simples de ${r.taxaJurosMoraMensal.toString().replace(".", ",")}% ao mês (Parecer, item 12): ${periodo.mesesCompletos} mês(es) + ${periodo.diasRestantes} dia(s) ÷ 30 = ${periodo.meses.toFixed(6)} meses`)
      } else {
        memoria.push(`3) Juros moratórios simples de ${r.taxaJurosMoraMensal.toString().replace(".", ",")}% ao mês (Parecer, item 12): ${dias} dias ÷ 365 × 12 = ${periodoJurosMeses.toFixed(6)} meses`)
      }
      memoria.push(`   Juros = ${brl(saldoCorrigido)} × ${r.taxaJurosMoraMensal.toString().replace(".", ",")}% × ${periodoJurosMeses.toFixed(6)} = ${brl(juros)}`)
      memoria.push(``)
      memoria.push(`TOTAL DEVIDO EM ${fmtData(r.dataAtualizacao)}: ${brl(saldoCorrigido)} + ${brl(juros)} = ${brl(totalDevido)}`)

      rompimento = {
        parcelasPagas: pagas,
        parcelasEmAberto: emAberto,
        dataRompimento,
        dataAtualizacao: r.dataAtualizacao,
        valorParcelaVigente: parcelaNaoPaga.valor,
        saldoAntecipado,
        fatorPoupanca,
        saldoCorrigido,
        taxaJurosMoraMensal: r.taxaJurosMoraMensal,
        periodoJurosMeses,
        juros,
        totalDevido,
        valorPago,
      }
    }
  }

  const fundamentacao = fundamentacaoParcelamento({ reajuste: p.reajuste })
  if (p.rompimento) {
    fundamentacao.push(...fundamentacaoRompimento({ taxaMensal: p.rompimento.taxaJurosMoraMensal, contagem: p.rompimento.contagemJuros }))
  }

  return { parcelas, totalParcelado, valorParcelaInicial: parcelas[0]?.valor ?? 0, possuiProvisorias, rompimento, memoria, fundamentacao }
}
