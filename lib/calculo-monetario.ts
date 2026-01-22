import { obterIndicesAtualizados, getIndiceNome, type IndiceData } from "./indices-data"

export interface DataCalculo {
  dia: number
  mes: number
  ano: number
}

export interface ParametrosCalculo {
  valorOriginal: number
  dataInicial: DataCalculo
  dataFinal: DataCalculo
  indice: string
  correcaoProRata: boolean
  taxaJuros?: number // em %
  periodicidadeJuros?: string // "Mensal" | "Anual" | "Diário" | "Trimestral" | "Semestral"
  tipoJuros?: string // "simples" | "composto"
  dataInicialJuros?: Date
  dataFinalJuros?: Date
  percentualMulta?: number
  percentualHonorarios?: number
  multaSobreJuros?: boolean
  convencaoDias?: "Actual/365" | "Actual/365.2425"
  usarIndiceSecundario?: boolean
  indiceSecundario?: string
  parcelaInicioIndiceSecundario?: number
}

export interface DetalheLinha {
  mes: number
  ano: number
  pendente: boolean
  percentual?: number // em %
  fatorMensal?: number
  fatorAcumulado: number
  valorAcumulado: number
  taxaJurosMensal?: number // Taxa de juros aplicada no mês (%)
  valorJurosMensal?: number // Valor dos juros no mês
  taxaAcumuladaJuros?: number // Taxa de juros acumulada até o mês
  valorTotalComJuros?: number // Valor total com juros até o mês
}

export interface ResultadoCalculo {
  valorOriginal: number
  valorCorrigido: number
  fatorCorrecao: number
  juros: number
  multa: number
  honorarios: number
  valorTotal: number
  memoriaCalculo: string[]
  periodoCorrecao: {
    meses: number
    dias: number
  }
  diasTotais?: number
  anosExatos?: number
  taxaAnual?: number // decimal
  tipoTaxaAnual?: "simples" | "efetiva"
  convencaoDia?: "Actual/365" | "Actual/365.2425"
  // Transparência
  detalhamentoIGPM?: DetalheLinha[]
  detalhamentoPoupanca?: DetalheLinha[]
  fontes?: string[]
}

// Função para calcular diferença em meses e dias
export function calcularDiferencaData(
  dataInicial: DataCalculo,
  dataFinal: DataCalculo,
): { meses: number; dias: number } {
  const inicio = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
  const fim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

  let anos = fim.getFullYear() - inicio.getFullYear()
  let meses = fim.getMonth() - inicio.getMonth()
  let dias = fim.getDate() - inicio.getDate()

  if (dias < 0) {
    meses--
    const ultimoDiaMesAnterior = new Date(fim.getFullYear(), fim.getMonth(), 0).getDate()
    dias += ultimoDiaMesAnterior
  }

  if (meses < 0) {
    anos--
    meses += 12
  }

  const totalMeses = anos * 12 + meses

  return { meses: totalMeses, dias }
}

function diasExatosEntre(inicio: Date, fim: Date): number {
  const msPorDia = 24 * 60 * 60 * 1000
  const inicioUTC = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const fimUTC = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate())
  return Math.max(0, Math.round((fimUTC - inicioUTC) / msPorDia))
}

function obterTaxaAnual(
  taxaInformadaPercent: number,
  periodicidade: string | undefined,
  tipoJuros: "simples" | "composto" | undefined,
): { taxaAnual: number; tipoTaxaAnual: "simples" | "efetiva" } {
  const r = (taxaInformadaPercent ?? 0) / 100
  const tipo = (tipoJuros === "simples" ? "simples" : "composto") as "simples" | "composto"
  const per = periodicidade || "Mensal"

  const periodosPorAnoMap: Record<string, number> = {
    Mensal: 12,
    Anual: 1,
    Diário: 365,
    Trimestral: 4,
    Semestral: 2,
  }
  const n = periodosPorAnoMap[per] ?? 12

  if (per === "Anual") {
    return {
      taxaAnual: r,
      tipoTaxaAnual: tipo === "simples" ? "simples" : "efetiva",
    }
  }

  if (per === "Mensal") {
    if (tipo === "simples") {
      return { taxaAnual: r * 12, tipoTaxaAnual: "simples" }
    } else {
      return { taxaAnual: Math.pow(1 + r, 12) - 1, tipoTaxaAnual: "efetiva" }
    }
  }

  if (tipo === "simples") {
    return { taxaAnual: r * n, tipoTaxaAnual: "simples" }
  } else {
    return { taxaAnual: Math.pow(1 + r, n) - 1, tipoTaxaAnual: "efetiva" }
  }
}

// Obter índices do período – regra especial para poupança (aniversários)
export async function obterIndicesPeriodo(
  dataInicial: DataCalculo,
  dataFinal: DataCalculo,
  nomeIndice: string,
): Promise<IndiceData[]> {
  const indices = await obterIndicesAtualizados(
    nomeIndice,
    dataInicial.mes,
    dataInicial.ano,
    dataFinal.mes,
    dataFinal.ano,
  )

  const indicesPeriodo: IndiceData[] = []
  const nomeCurtoIndice = getIndiceNome(nomeIndice)

  if (nomeCurtoIndice === "Poupança") {
    let dataAtual = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
    const dataFim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

    while (dataAtual < dataFim) {
      const proximoAniversario = new Date(dataAtual)
      proximoAniversario.setMonth(proximoAniversario.getMonth() + 1)

      if (proximoAniversario <= dataFim) {
        const mesIndice = proximoAniversario.getMonth() + 1
        const anoIndice = proximoAniversario.getFullYear()
        const indiceDoMes = indices.find((i) => i.mes === mesIndice && i.ano === anoIndice)
        if (indiceDoMes) indicesPeriodo.push(indiceDoMes)
      }
      dataAtual = proximoAniversario
    }
  } else {
    let mesAtual = dataInicial.dia === 1 ? dataInicial.mes : dataInicial.mes + 1
    let anoAtual = dataInicial.ano
    if (mesAtual > 12) {
      mesAtual = 1
      anoAtual++
    }

    while (anoAtual < dataFinal.ano || (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)) {
      const indiceDoMes = indices.find((i) => i.mes === mesAtual && i.ano === anoAtual)
      if (indiceDoMes) indicesPeriodo.push(indiceDoMes)
      mesAtual++
      if (mesAtual > 12) {
        mesAtual = 1
        anoAtual++
      }
    }
  }

  return indicesPeriodo
}

// Cálculo principal
export async function calcularCorrecaoMonetaria(parametros: ParametrosCalculo): Promise<ResultadoCalculo> {
  const memoriaCalculo: string[] = []
  const nomeIndice = getIndiceNome(parametros.indice)

  const nomeIndiceSecundario = parametros.usarIndiceSecundario && parametros.indiceSecundario 
    ? getIndiceNome(parametros.indiceSecundario) 
    : null
  const parcelaInicio = parametros.parcelaInicioIndiceSecundario || 13

  memoriaCalculo.push(`=== CÁLCULO DE CORREÇÃO MONETÁRIA ===`)
  memoriaCalculo.push(
    `Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  )
  memoriaCalculo.push(
    `Data inicial: ${parametros.dataInicial.dia}/${parametros.dataInicial.mes}/${parametros.dataInicial.ano}`,
  )
  memoriaCalculo.push(`Data final: ${parametros.dataFinal.dia}/${parametros.dataFinal.mes}/${parametros.dataFinal.ano}`)
  memoriaCalculo.push(`Índice utilizado: ${nomeIndice}`)
  
  if (nomeIndiceSecundario) {
    memoriaCalculo.push(`Índice secundário: ${nomeIndiceSecundario} (a partir da ${parcelaInicio}ª parcela)`)
  }

  if (parametros.taxaJuros !== undefined) {
    memoriaCalculo.push(
      `Taxa de juros informada pelo usuário: ${parametros.taxaJuros}% ${parametros.periodicidadeJuros || "Mensal"} (${parametros.tipoJuros || "simples"})`,
    )

    const periodicidade = parametros.periodicidadeJuros || "Mensal"
    const tipoJuros = parametros.tipoJuros || "simples"

    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== PROCESSAMENTO DA TAXA INFORMADA ===`)
    memoriaCalculo.push(`Taxa digitada pelo usuário: ${parametros.taxaJuros}% ${periodicidade}`)
    memoriaCalculo.push(`Tipo de juros selecionado: ${tipoJuros}`)

    // Show how the rate will be converted for calculation
    const conv = obterTaxaAnual(parametros.taxaJuros, periodicidade, tipoJuros as any)

    if (periodicidade === "Anual") {
      memoriaCalculo.push(`A taxa será aplicada diretamente como taxa anual: ${parametros.taxaJuros}%`)
    } else if (periodicidade === "Mensal") {
      if (tipoJuros === "simples") {
        memoriaCalculo.push(
          `Conversão para taxa anual simples: ${parametros.taxaJuros}% × 12 = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      } else {
        memoriaCalculo.push(
          `Conversão para taxa anual efetiva: (1 + ${parametros.taxaJuros}%)^12 - 1 = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      }
    } else {
      const periodosPorAno =
        periodicidade === "Diário" ? 365 : periodicidade === "Trimestral" ? 4 : periodicidade === "Semestral" ? 2 : 12
      if (tipoJuros === "simples") {
        memoriaCalculo.push(
          `Conversão para taxa anual simples: ${parametros.taxaJuros}% × ${periodosPorAno} = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      } else {
        memoriaCalculo.push(
          `Conversão para taxa anual efetiva: (1 + ${parametros.taxaJuros}%)^${periodosPorAno} - 1 = ${(conv.taxaAnual * 100).toFixed(6)}%`,
        )
      }
    }

    memoriaCalculo.push(`Esta taxa convertida será aplicada no cálculo dos juros sobre o valor corrigido.`)
  } else {
    memoriaCalculo.push(`Taxa de juros: Não informada`)
  }

  if (nomeIndice === "Poupança") {
    memoriaCalculo.push(`Regra: Aniversário mensal no dia ${parametros.dataInicial.dia}`)
  }
  memoriaCalculo.push(``)

  // Período (exibição)
  const periodo = calcularDiferencaData(parametros.dataInicial, parametros.dataFinal)
  memoriaCalculo.push(`Período: ${periodo.meses} meses e ${periodo.dias} dias`)

  // Obter índices do período principal
  const indicesDBPeriodo = await obterIndicesPeriodo(parametros.dataInicial, parametros.dataFinal, parametros.indice)
  
  // Obter índices do período secundário (se configurado)
  let indicesSecundario: IndiceData[] = []
  if (nomeIndiceSecundario && parametros.indiceSecundario) {
    indicesSecundario = await obterIndicesPeriodo(parametros.dataInicial, parametros.dataFinal, parametros.indiceSecundario)
  }

  let fatorCorrecao = 1
  memoriaCalculo.push(``)

  if (nomeIndice === "Poupança") {
    memoriaCalculo.push(`=== APLICAÇÃO DOS ÍNDICES DA POUPANÇA (ANIVERSÁRIOS) ===`)
  } else {
    memoriaCalculo.push(`=== APLICAÇÃO DOS ÍNDICES MENSAIS ===`)
  }

  // Transparência – montar linhas completas com "pendente" quando faltarem dados
  let detalhamentoIGPM: DetalheLinha[] | undefined
  let detalhamentoPoupanca: DetalheLinha[] | undefined

  if (nomeIndice === "IGP-M") {
    detalhamentoIGPM = []
    let mesEsperado = parametros.dataInicial.dia === 1 ? parametros.dataInicial.mes : parametros.dataInicial.mes + 1
    let anoEsperado = parametros.dataInicial.ano
    if (mesEsperado > 12) {
      mesEsperado = 1
      anoEsperado++
    }

    const existe = (m: number, a: number) => indicesDBPeriodo.find((x) => x.mes === m && x.ano === a)

    let fatorAcum = 1
    while (
      anoEsperado < parametros.dataFinal.ano ||
      (anoEsperado === parametros.dataFinal.ano && mesEsperado <= parametros.dataFinal.mes)
    ) {
      const row = existe(mesEsperado, anoEsperado)
      if (row) {
        const fatorMensal = 1 + row.valor / 100
        fatorAcum *= fatorMensal
        detalhamentoIGPM.push({
          mes: mesEsperado,
          ano: anoEsperado,
          pendente: false,
          percentual: row.valor,
          fatorMensal,
          fatorAcumulado: fatorAcum,
          valorAcumulado: parametros.valorOriginal * fatorAcum,
        })
      } else {
        detalhamentoIGPM.push({
          mes: mesEsperado,
          ano: anoEsperado,
          pendente: true,
          fatorAcumulado: fatorAcum,
          valorAcumulado: parametros.valorOriginal * fatorAcum,
        })
      }
      mesEsperado++
      if (mesEsperado > 12) {
        mesEsperado = 1
        anoEsperado++
      }
    }
  }

  if (nomeIndice === "Poupança") {
    detalhamentoPoupanca = []
    const inicio = new Date(parametros.dataInicial.ano, parametros.dataInicial.mes - 1, parametros.dataInicial.dia)
    const fim = new Date(parametros.dataFinal.ano, parametros.dataFinal.mes - 1, parametros.dataFinal.dia)
    const existe = (m: number, a: number) => indicesDBPeriodo.find((x) => x.mes === m && x.ano === a)

    let fatorAcum = 1
    let aniversario = new Date(inicio)
    let taxaAcumuladaJuros = 0
    let valorAnterior = parametros.valorOriginal

    while (aniversario < fim) {
      const proximo = new Date(aniversario)
      proximo.setMonth(proximo.getMonth() + 1)
      if (proximo > fim) break

      const mes = proximo.getMonth() + 1
      const ano = proximo.getFullYear()
      const row = existe(mes, ano)

      if (row) {
        const fatorMensal = 1 + row.valor / 100
        const valorAtual = valorAnterior * fatorMensal
        const valorJurosMensal = valorAtual - valorAnterior // Juros ganhos no mês
        taxaAcumuladaJuros = (fatorAcum - 1) * 100 // Taxa acumulada em %

        detalhamentoPoupanca.push({
          mes,
          ano,
          pendente: false,
          percentual: row.valor,
          fatorMensal,
          fatorAcumulado: fatorAcum,
          valorAcumulado: valorAtual,
          taxaJurosMensal: row.valor, // Taxa do mês em %
          valorJurosMensal,
          taxaAcumuladaJuros,
          valorTotalComJuros: valorAtual,
        })

        valorAnterior = valorAtual
        fatorAcum *= fatorMensal
      } else {
        detalhamentoPoupanca.push({
          mes,
          ano,
          pendente: true,
          fatorAcumulado: fatorAcum,
          valorAcumulado: valorAnterior,
          taxaAcumuladaJuros,
          valorTotalComJuros: valorAnterior,
        })
      }

      aniversario = proximo
    }
  }

  // Aplicação efetiva dos índices (sem arredondamentos intermediários)
  if (indicesDBPeriodo.length === 0) {
    memoriaCalculo.push(`Nenhum índice encontrado para o período informado.`)
    fatorCorrecao = 1
  } else {
    memoriaCalculo.push(`Índices aplicados no período:`)
    memoriaCalculo.push(``)

    if (nomeIndice === "Poupança") {
      memoriaCalculo.push(`=== DETALHAMENTO MENSAL DOS JUROS DA POUPANÇA ===`)
      memoriaCalculo.push(``)
      memoriaCalculo.push(
        `| **Mês/Ano** | **Taxa (%)** | **Juros do Mês (R$)** | **Taxa Acum. (%)** | **Valor Total (R$)** |`,
      )

      let valorAnterior = parametros.valorOriginal
      let taxaAcumulada = 0

      indicesDBPeriodo.forEach((indice, index) => {
        const fatorMensal = 1 + indice.valor / 100
        const valorAtual = valorAnterior * fatorMensal
        const jurosMes = valorAtual - valorAnterior
        taxaAcumulada = (valorAtual / parametros.valorOriginal - 1) * 100

        const mesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][
          indice.mes - 1
        ]

        const mesAno = `${mesNome}/${indice.ano}`
        const taxa = `${indice.valor.toFixed(4).replace(".", ",")}%`
        const jurosFormatado = `R$ ${jurosMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const taxaAcumFormatada = `${taxaAcumulada.toFixed(4).replace(".", ",")}%`
        const valorTotalFormatado = `R$ ${valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        memoriaCalculo.push(
          `| ${mesAno} | ${taxa} | ${jurosFormatado} | ${taxaAcumFormatada} | ${valorTotalFormatado} |`,
        )

        valorAnterior = valorAtual
        fatorCorrecao = valorAtual / parametros.valorOriginal
      })

      memoriaCalculo.push(``)
      memoriaCalculo.push(`Total de aniversários aplicados: ${indicesDBPeriodo.length}`)
      memoriaCalculo.push(`Taxa de juros total acumulada: ${((fatorCorrecao - 1) * 100).toFixed(6)}%`)
      memoriaCalculo.push(
        `Total de juros ganhos: R$ ${(valorAnterior - parametros.valorOriginal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
    } else {
      // Lógica com suporte a índice secundário
      const existeIndiceSecundario = (m: number, a: number) => 
        indicesSecundario.find((x) => x.mes === m && x.ano === a)
      
      let contadorPrimario = 0
      let contadorSecundario = 0
      
      // Se houver índice secundário, criar tabela detalhada
      if (nomeIndiceSecundario) {
        memoriaCalculo.push(`=== DETALHAMENTO MENSAL COM MUDANÇA DE ÍNDICE ===`)
        memoriaCalculo.push(``)
        memoriaCalculo.push(
          `| **Parcela** | **Mês/Ano** | **Índice Utilizado** | **Taxa (%)** | **Fator Mensal** | **Fator Acumulado** | **Valor Acumulado (R$)** |`,
        )
        memoriaCalculo.push(
          `|---|---|---|---|---|---|---|`,
        )
      }
      
      indicesDBPeriodo.forEach((indice, index) => {
        const parcelaAtual = index + 1
        const usarSecundario = nomeIndiceSecundario && parcelaAtual >= parcelaInicio
        
        let indiceUsado = indice
        let nomeIndiceUsado = nomeIndice
        
        if (usarSecundario) {
          // Tentar usar índice secundário
          const indiceSecundarioEncontrado = existeIndiceSecundario(indice.mes, indice.ano)
          if (indiceSecundarioEncontrado) {
            indiceUsado = indiceSecundarioEncontrado
            nomeIndiceUsado = nomeIndiceSecundario
            contadorSecundario++
          } else {
            contadorPrimario++
          }
        } else {
          contadorPrimario++
        }
        
        const fatorMensal = 1 + indiceUsado.valor / 100
        fatorCorrecao *= fatorMensal
        const valorAcumulado = parametros.valorOriginal * fatorCorrecao
        const mesNome = [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ][indice.mes - 1]
        
        if (nomeIndiceSecundario) {
          // Formato de tabela
          const parcelaStr = `${parcelaAtual}ª`
          const mesAnoStr = `${mesNome}/${indice.ano}`
          const indiceStr = nomeIndiceUsado
          const taxaStr = `${indiceUsado.valor.toFixed(4).replace(".", ",")}`
          const fatorStr = `${fatorMensal.toFixed(6).replace(".", ",")}`
          const fatorAcumStr = `${fatorCorrecao.toFixed(6).replace(".", ",")}`
          const valorAcumStr = `R$ ${valorAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          
          memoriaCalculo.push(
            `| ${parcelaStr} | ${mesAnoStr} | ${indiceStr} | ${taxaStr} | ${fatorStr} | ${fatorAcumStr} | ${valorAcumStr} |`,
          )
        } else {
          // Formato de linha simples (sem mudança de índice)
          const indicador = usarSecundario && nomeIndiceUsado === nomeIndiceSecundario 
            ? ` [${nomeIndiceSecundario}]` 
            : ""
          
          memoriaCalculo.push(
            `${String(parcelaAtual).padStart(2, "0")}. ${mesNome}/${indice.ano}: ${indiceUsado.valor.toString()}% → Fator: ${fatorMensal} → Acumulado: ${fatorCorrecao}${indicador}`,
          )
        }
      })
      
      memoriaCalculo.push(``)
      memoriaCalculo.push(`Total de meses com índices aplicados: ${indicesDBPeriodo.length}`)
      
      if (nomeIndiceSecundario) {
        memoriaCalculo.push(``)
        memoriaCalculo.push(`**Resumo da mudança de índice:**`)
        memoriaCalculo.push(`- Parcelas 1 a ${parcelaInicio - 1}: ${nomeIndice} (${contadorPrimario} parcelas)`)
        memoriaCalculo.push(`- Parcelas ${parcelaInicio} em diante: ${nomeIndiceSecundario} (${contadorSecundario} parcelas)`)
      }
    }
  }

  // Correção pro-rata (apenas se solicitado explicitamente)
  if (parametros.correcaoProRata && nomeIndice === "Poupança") {
    const dataInicio = new Date(parametros.dataInicial.ano, parametros.dataInicial.mes - 1, parametros.dataInicial.dia)
    const dataFim = new Date(parametros.dataFinal.ano, parametros.dataFinal.mes - 1, parametros.dataFinal.dia)

    let ultimoAniversario = new Date(dataInicio)
    while (ultimoAniversario < dataFim) {
      const proximoAniversario = new Date(ultimoAniversario)
      proximoAniversario.setMonth(proximoAniversario.getMonth() + 1)
      if (proximoAniversario > dataFim) break
      ultimoAniversario = proximoAniversario
    }

    const diasRestantes = diasExatosEntre(ultimoAniversario, dataFim)
    if (diasRestantes > 0) {
      const diasNoMesConvencao = 30
      const fatorProRata = diasRestantes / diasNoMesConvencao

      const proximoMes = ultimoAniversario.getMonth() + 2
      const proximoAno = proximoMes > 12 ? ultimoAniversario.getFullYear() + 1 : ultimoAniversario.getFullYear()
      const mesAjustado = proximoMes > 12 ? 1 : proximoMes

      const indiceProRataArray = await obterIndicesAtualizados(
        parametros.indice,
        mesAjustado,
        proximoAno,
        mesAjustado,
        proximoAno,
      )
      const indiceProRata = indiceProRataArray[0] || indicesDBPeriodo[indicesDBPeriodo.length - 1]

      if (indiceProRata) {
        const fatorProRataAdicional = 1 + (indiceProRata.valor / 100) * fatorProRata
        fatorCorrecao *= fatorProRataAdicional
        memoriaCalculo.push(
          `Correção pro-rata da poupança (${diasRestantes}/${diasNoMesConvencao} dias): fator ${fatorProRataAdicional}`,
        )
      }
    }
  }

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Fator de correção total: ${fatorCorrecao}`)

  const valorCorrigido = parametros.valorOriginal * fatorCorrecao
  memoriaCalculo.push(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)

  // Juros (opcional) – Actual/365
  let juros = 0
  let diasTotais: number | undefined
  let anosExatos: number | undefined
  let taxaAnual: number | undefined
  let tipoTaxaAnual: "simples" | "efetiva" | undefined
  let convencaoDia: "Actual/365" | "Actual/365.2425" | undefined

  if (parametros.taxaJuros !== undefined && parametros.taxaJuros > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DOS JUROS ===`)
    memoriaCalculo.push(
      `Taxa informada pelo usuário: ${parametros.taxaJuros}% ${parametros.periodicidadeJuros || "Mensal"}`,
    )
    memoriaCalculo.push(`Tipo de juros: ${parametros.tipoJuros || "simples"}`)

    const dataInicioJuros =
      parametros.dataInicialJuros ||
      new Date(parametros.dataInicial.ano, parametros.dataInicial.mes - 1, parametros.dataInicial.dia)
    const dataFimJuros =
      parametros.dataFinalJuros ||
      new Date(parametros.dataFinal.ano, parametros.dataFinal.mes - 1, parametros.dataFinal.dia)

    diasTotais = diasExatosEntre(dataInicioJuros, dataFimJuros)
    convencaoDia = parametros.convencaoDias === "Actual/365.2425" ? "Actual/365.2425" : "Actual/365"
    const divisorDias = convencaoDia === "Actual/365.2425" ? 365.2425 : 365
    anosExatos = diasTotais / divisorDias

    const conv = obterTaxaAnual(parametros.taxaJuros, parametros.periodicidadeJuros, parametros.tipoJuros as any)
    taxaAnual = conv.taxaAnual
    tipoTaxaAnual = conv.tipoTaxaAnual

    memoriaCalculo.push(`Dias totais (Actual): ${diasTotais} dia(s)`)
    memoriaCalculo.push(`Convenção de dias: ${convencaoDia}`)
    memoriaCalculo.push(`Anos exatos: ${anosExatos.toFixed(6)}`)
    memoriaCalculo.push(`Taxa anual convertida (${tipoTaxaAnual}): ${(taxaAnual * 100).toFixed(6)}%`)

    if ((parametros.tipoJuros || "simples") === "simples") {
      juros = valorCorrigido * (taxaAnual ?? 0) * (anosExatos ?? 0)
      memoriaCalculo.push(`Fórmula: Juros simples = Valor corrigido × taxa_anual × anos`)
      memoriaCalculo.push(
        `Cálculo: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × ${(taxaAnual * 100).toFixed(6)}% × ${anosExatos.toFixed(6)} = R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
    } else {
      const montante = valorCorrigido * Math.pow(1 + (taxaAnual ?? 0), anosExatos ?? 0)
      juros = montante - valorCorrigido
      memoriaCalculo.push(`Fórmula: Juros compostos = M - Principal`)
      memoriaCalculo.push(
        `Montante: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × (1 + ${(taxaAnual * 100).toFixed(6)}%)^${anosExatos.toFixed(6)} = R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
      memoriaCalculo.push(
        `Juros: R$ ${montante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      )
    }
  }

  // Multa
  let multa = 0
  if (parametros.percentualMulta && parametros.percentualMulta > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DA MULTA ===`)
    const baseCalculoMulta = parametros.multaSobreJuros ? valorCorrigido + juros : valorCorrigido
    multa = baseCalculoMulta * (parametros.percentualMulta / 100)
    memoriaCalculo.push(`Base de cálculo: R$ ${baseCalculoMulta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Percentual da multa: ${parametros.percentualMulta}%`)
    memoriaCalculo.push(`Multa: R$ ${multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  }

  // Honorários
  let honorarios = 0
  if (parametros.percentualHonorarios && parametros.percentualHonorarios > 0) {
    memoriaCalculo.push(``)
    memoriaCalculo.push(`=== CÁLCULO DOS HONORÁRIOS ===`)
    honorarios = valorCorrigido * (parametros.percentualHonorarios / 100)
    memoriaCalculo.push(`Base de cálculo: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
    memoriaCalculo.push(`Percentual dos honorários: ${parametros.percentualHonorarios}%`)
    memoriaCalculo.push(`Honorários: R$ ${honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  }

  const valorTotal = valorCorrigido + juros + multa + honorarios

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== RESUMO FINAL ===`)
  memoriaCalculo.push(
    `Valor original: R$ ${parametros.valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  )
  memoriaCalculo.push(`Índices utilizados: ${nomeIndice}${nomeIndiceSecundario ? ` (até parcela ${parcelaInicio - 1}) e ${nomeIndiceSecundario} (a partir da parcela ${parcelaInicio})` : ""}`)
  memoriaCalculo.push(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`Fator de correção: ${fatorCorrecao.toFixed(6)}`)
  if (taxaAnual !== undefined) {
    memoriaCalculo.push(
      `Dias totais: ${diasTotais} | Anos exatos (${convencaoDia}): ${anosExatos} | Taxa anual (${tipoTaxaAnual}): ${taxaAnual}`,
    )
  }
  memoriaCalculo.push(`Juros: R$ ${juros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`Multa: R$ ${multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`Honorários: R$ ${honorarios.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  memoriaCalculo.push(`VALOR TOTAL: R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)

  // Fontes
  const fontes =
    nomeIndice === "IGP-M"
      ? [
          "FGV – Portal IBRE: https://portalibre.fgv.br",
          "FGV – Sala de Imprensa (releases mensais): https://portalibre.fgv.br/press-releases",
          "Tabela histórica IGP-M – Brasil Indicadores: https://brasilindicadores.com.br/igpm/",
          "Mobills – Tabela IGP-M: https://www.mobills.com.br/tabelas/igp-m/",
          "Trading Economics (mensal): https://pt.tradingeconomics.com/brazil/igp-m-inflation-mom",
        ]
      : nomeIndice === "Poupança"
        ? [
            "Banco Central do Brasil – SGS (série 195): https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json",
            "Banco Central do Brasil – SGS (série 4391): https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json",
            "Mobills – Tabela Poupança: https://www.mobills.com.br/tabelas/poupanca/",
            "FGV – Indicadores Econômicos: https://portalibre.fgv.br/indicadores",
          ]
        : undefined

  memoriaCalculo.push(``)
  memoriaCalculo.push(`=== FONTES DOS DADOS ===`)

  // Add source based on the index used
  switch (parametros.indice.toLowerCase()) {
    case "poupanca":
      memoriaCalculo.push(`Poupança: https://www.debit.com.br/tabelas/poupanca`)
      memoriaCalculo.push(`Dados oficiais do Banco Central do Brasil`)
      break
    case "igpm":
      memoriaCalculo.push(`IGP-M: Fundação Getúlio Vargas (FGV)`)
      memoriaCalculo.push(`Banco Central do Brasil - Sistema Gerenciador de Séries Temporais`)
      break
    case "cdi":
      memoriaCalculo.push(`CDI: Banco Central do Brasil`)
      memoriaCalculo.push(`Sistema Especial de Liquidação e de Custódia (SELIC)`)
      break
    case "ipca":
      memoriaCalculo.push(`IPCA: Instituto Brasileiro de Geografia e Estatística (IBGE)`)
      memoriaCalculo.push(`Sistema Nacional de Índices de Preços ao Consumidor`)
      break
    default:
      memoriaCalculo.push(`${nomeIndice}: Banco Central do Brasil`)
      break
  }

  memoriaCalculo.push(``)
  memoriaCalculo.push(`Cálculo realizado em: ${new Date().toLocaleString("pt-BR")}`)
  memoriaCalculo.push(`Sistema: Calculadora de Atualização Monetária - CGOF/SP`)

  return {
    valorOriginal: parametros.valorOriginal,
    valorCorrigido,
    fatorCorrecao,
    juros,
    multa,
    honorarios,
    valorTotal,
    memoriaCalculo,
    periodoCorrecao: periodo,
    diasTotais,
    anosExatos,
    taxaAnual,
    tipoTaxaAnual,
    convencaoDia,
    detalhamentoIGPM,
    detalhamentoPoupanca,
    fontes,
  }
}

export function validarDatas(dataInicial: DataCalculo, dataFinal: DataCalculo): string[] {
  const erros: string[] = []
  const inicio = new Date(dataInicial.ano, dataInicial.mes - 1, dataInicial.dia)
  const fim = new Date(dataFinal.ano, dataFinal.mes - 1, dataFinal.dia)

  if (isNaN(inicio.getTime())) erros.push("Data inicial inválida")
  if (isNaN(fim.getTime())) erros.push("Data final inválida")
  if (fim < inicio) erros.push("ATENÇÃO: Data final anterior à inicial - será realizado deflacionamento")

  return erros
}
