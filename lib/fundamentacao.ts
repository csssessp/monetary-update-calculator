/**
 * Textos de fundamentação legal para a memória de cálculo (juros, parcelamento e rompimento).
 *
 * Transcrições conferidas em 24/09/2026:
 *  - Código Civil (Lei 10.406/2002), arts. 394, 397 e 407: texto original, não alterado pela Lei 14.905/2024.
 *  - Arts. 389 e 406 do Código Civil: redação da Lei 14.905/2024 (publicação original, Câmara dos Deputados).
 *  - Parecer AJG nº 573/2007, item 12: citado conforme o documento fornecido pelo setor
 *    (parecer da Assessoria Jurídica do Governo não disponível em fonte pública).
 *
 * Regra: o que não tem norma localizada é apresentado como "critério técnico adotado", nunca como lei.
 */

export const URL_CODIGO_CIVIL = "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm"
export const URL_LEI_14905 = "https://www2.camara.leg.br/legin/fed/lei/2024/lei-14905-28-junho-2024-795872-publicacaooriginal-172245-pl.html"
const URL_CALC_CIDADAO = "https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores"

const PARECER =
  `Parecer AJG nº 573/2007 (Assessoria Jurídica do Governo do Estado de São Paulo), item 12 — citado conforme documento do processo: ` +
  `"(i) a atualização do débito deve ser feita em consonância com os rendimentos das cadernetas de poupança no período, e (ii) a atualização das parcelas deve ser feita de acordo com o IGPM-FGV, ao término de cada período de 12 parcelas. ` +
  `Além disso, o referido parecer ressaltou a incidência de juros moratórios de 0,5% ao mês na hipótese de rompimento dos acordos de parcelamento [...], bem como que o não pagamento de uma parcela gera o vencimento antecipado da dívida total."`

const ART_394 = `Código Civil, art. 394: "Considera-se em mora o devedor que não efetuar o pagamento e o credor que não quiser recebê-lo no tempo, lugar e forma que a lei ou a convenção estabelecer."`
const ART_397 = `Código Civil, art. 397: "O inadimplemento da obrigação, positiva e líquida, no seu termo, constitui de pleno direito em mora o devedor." Parágrafo único: "Não havendo termo, a mora se constitui mediante interpelação judicial ou extrajudicial."`
const ART_406 = `Código Civil, art. 406 (redação da Lei nº 14.905/2024): "Quando não forem convencionados, ou quando o forem sem taxa estipulada, ou quando provierem de determinação da lei, os juros serão fixados de acordo com a taxa legal." § 1º: "A taxa legal corresponderá à taxa referencial do Sistema Especial de Liquidação e de Custódia (Selic), deduzido o índice de atualização monetária de que trata o parágrafo único do art. 389 deste Código." § 3º: "Caso a taxa legal apresente resultado negativo, este será considerado igual a 0 (zero) para efeito de cálculo dos juros no período de referência."`
const ART_407 = `Código Civil, art. 407: "Ainda que se não alegue prejuízo, é obrigado o devedor aos juros da mora que se contarão assim às dívidas em dinheiro, como às prestações de outra natureza, uma vez que lhes esteja fixado o valor pecuniário por sentença judicial, arbitramento, ou acordo entre as partes."`
const VIGENCIA_14905 = `Lei nº 14.905/2024, art. 5º: a nova redação do art. 406 produz efeitos 60 dias após a publicação (publicada em 01/07/2024) — ${URL_LEI_14905}`

const pct = (v: number) => v.toString().replace(".", ",")

export function fundamentacaoJuros(opcoes: { taxaMensal?: number; contagem: "dias" | "meses" }): string[] {
  const L: string[] = []
  L.push(`— JUROS —`)
  L.push(`Base legal (${URL_CODIGO_CIVIL}):`)
  L.push(`  ${ART_407}`)
  L.push(`  ${ART_406}`)
  L.push(`  ${VIGENCIA_14905}`)
  L.push(
    `  Aplicação: havendo taxa convencionada (termo de acordo, contrato ou decisão), prevalece a taxa convencionada; sem convenção, aplica-se a taxa legal do art. 406 (Selic − IPCA), que deve ser informada pelo usuário — o sistema NÃO a calcula automaticamente.`,
  )
  if (opcoes.taxaMensal !== undefined) L.push(`  Taxa aplicada neste cálculo: ${pct(opcoes.taxaMensal)}% ao mês, informada pelo usuário.`)
  L.push(`Critérios técnicos adotados (sem norma específica localizada — confirmar com a Consultoria Jurídica):`)
  L.push(`  • Juros simples, sem capitalização, sobre o valor atualizado.`)
  L.push(
    opcoes.contagem === "meses"
      ? `  • Contagem do tempo em meses: meses completos (de aniversário a aniversário) + dias restantes ÷ 30 (pro rata die, mês comercial).`
      : `  • Contagem do tempo em dias corridos ÷ 365 (taxa mensal convertida em anual × 12).`,
  )
  return L
}

export function fundamentacaoParcelamento(opcoes: { reajuste: "nenhum" | "IGP-M" | "IPCA" }): string[] {
  const L: string[] = []
  L.push(`— PARCELAMENTO —`)
  L.push(`Orientação administrativa: ${PARECER}`)
  if (opcoes.reajuste === "IGP-M") {
    L.push(`Índice do reajuste: IGP-M/FGV — BCB/SGS série 28655, "Índice Geral de Preços do Mercado (IGP-M) - Variação mensal consistente com número índice" (mesma série da Calculadora do Cidadão).`)
    L.push(`  Conferência de cada ciclo: Calculadora do Cidadão (${URL_CALC_CIDADAO}) → aba "Índices de preços" → IGP-M → mês inicial e final do ciclo indicados na tabela de reajuste.`)
  } else if (opcoes.reajuste === "IPCA") {
    L.push(`Índice do reajuste: IPCA/IBGE (BCB/SGS série 433). ATENÇÃO: o Parecer AJG nº 573/2007 determina o IGP-M/FGV; o IPCA foi escolhido pelo usuário.`)
  } else {
    L.push(`Sem reajuste das parcelas. ATENÇÃO: o Parecer AJG nº 573/2007 determina reajuste pelo IGP-M/FGV a cada 12 parcelas.`)
  }
  L.push(`Critérios técnicos adotados (sem norma específica localizada — confirmar com a Consultoria Jurídica):`)
  L.push(`  • Parcela base = valor total atualizado ÷ número de parcelas.`)
  L.push(`  • Vencimentos mensais no mesmo dia do 1º vencimento (dia ajustado ao fim do mês quando inexistente).`)
  if (opcoes.reajuste !== "nenhum") {
    L.push(`  • O reajuste de cada ciclo usa o índice acumulado nos 12 meses de vencimento das parcelas do ciclo anterior, de forma cumulativa.`)
  }
  return L
}

export function fundamentacaoRompimento(opcoes: { taxaMensal: number; contagem: "dias" | "meses" }): string[] {
  const L: string[] = []
  L.push(`— ROMPIMENTO DO PARCELAMENTO —`)
  L.push(`Orientação administrativa: Parecer AJG nº 573/2007, item 12 — vencimento antecipado da dívida total pelo não pagamento de uma parcela, juros moratórios de 0,5% ao mês e atualização do débito pelos rendimentos da caderneta de poupança (transcrição na seção PARCELAMENTO).`)
  L.push(`Base legal (${URL_CODIGO_CIVIL}):`)
  L.push(`  ${ART_394}`)
  L.push(`  ${ART_397}`)
  L.push(`  → A mora se constitui no vencimento da parcela não paga; os juros moratórios correm a partir dessa data.`)
  L.push(`  ${ART_406}`)
  L.push(`  → A taxa de ${pct(opcoes.taxaMensal)}% ao mês aplica-se por ser a taxa convencionada/orientada (Parecer AJG nº 573/2007); sem convenção valeria a taxa legal.`)
  if (opcoes.taxaMensal !== 0.5) {
    L.push(`  ATENÇÃO: a taxa informada (${pct(opcoes.taxaMensal)}% ao mês) difere dos 0,5% ao mês do Parecer AJG nº 573/2007.`)
  }
  L.push(`Critérios técnicos adotados (sem norma específica localizada — confirmar com a Consultoria Jurídica):`)
  L.push(`  • Saldo vencido antecipadamente = parcelas em aberto × valor da parcela vigente na data do rompimento (reajustes futuros não se aplicam).`)
  L.push(`  • Atualização do saldo pela Poupança da data do rompimento até a data de atualização (mesma metodologia da seção de correção).`)
  L.push(`  • Juros moratórios simples sobre o saldo atualizado; contagem do tempo ${opcoes.contagem === "meses" ? "em meses completos + dias ÷ 30" : "em dias corridos ÷ 365"}.`)
  return L
}
