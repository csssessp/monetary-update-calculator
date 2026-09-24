"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calculator, AlertTriangle, Download, FileText, Loader2, RefreshCw, CreditCard, TrendingUp, Landmark, PiggyBank, BarChart2, Activity, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  calcularCorrecaoMonetaria,
  validarDatas,
  memoriaSemFundamentacao,
  type ParametrosCalculo,
  type ResultadoCalculo,
} from "@/lib/calculo-monetario"
import {
  atualizarIndicesNoCache,
  atualizarIndicesComProgresso,
  lerRelatorioAtualizacao,
  precisaAtualizarNoMes,
  type ProgressoAtualizacao,
  type RelatorioAtualizacao,
} from "@/lib/fetch-indices"
import { indicesData } from "@/lib/indices-data"
import { useToast } from "@/components/ui/use-toast"

interface FormData {
  descricao: string
  valor: string
  dataInicial: { dia: string; mes: string; ano: string }
  dataFinal: { dia: string; mes: string; ano: string }
  correcaoProRata: boolean
  indice: string
  taxaJuros: string
  periodicidadeJuros: string
  tipoJuros: string
  dataInicialJuros: string
  dataFinalJuros: string
  percentualMulta: string
  percentualHonorarios: string
  multaSobreJuros: boolean
  apresentarMemoria: boolean
  mostrarTransparencia: boolean
  numeroParcelas: string
  reajusteParcelas: "nenhum" | "IGP-M" | "IPCA"
  dataPrimeiraParcela: string // AAAA-MM-DD; vazio = data final do cálculo
  parcelamentoRompido: boolean
  parcelasPagas: string
  dataAtualizacaoRompimento: string // AAAA-MM-DD; vazio = hoje
  jurosMoraMensal: string
  contagemJuros: "dias" | "meses"
}

export default function CalculadoraAtualizacaoMonetaria() {
  const { toast } = useToast()

  // Estado da atualização de índices (botão, aviso mensal e barra de progresso)
  const [relatorioIndices, setRelatorioIndices] = useState<RelatorioAtualizacao | null>(null)
  const [progressoIndices, setProgressoIndices] = useState<ProgressoAtualizacao | null>(null)
  const [avisoMensalAberto, setAvisoMensalAberto] = useState(false)

  // Ao abrir: carregar o último relatório e, se ainda não houve atualização completa neste mês, pedir para atualizar
  useEffect(() => {
    setRelatorioIndices(lerRelatorioAtualizacao())
    if (precisaAtualizarNoMes()) setAvisoMensalAberto(true)
  }, [])

  const atualizarIndices = async () => {
    if (progressoIndices) return
    setProgressoIndices({ concluidos: 0, total: 1, etapa: "Iniciando..." })
    try {
      const relatorio = await atualizarIndicesComProgresso(setProgressoIndices)
      setRelatorioIndices(relatorio)
      const falhas = relatorio.itens.filter((i) => !i.ok)
      if (relatorio.sucesso) {
        setAvisoMensalAberto(false)
        toast({ title: "Índices atualizados", description: "Todos os índices foram sincronizados com o Banco Central." })
      } else {
        toast({
          title: "Atualização incompleta",
          description: `Não foi possível atualizar: ${falhas.map((f) => f.nome).join(", ")}. Os dados já armazenados continuam válidos; tente novamente mais tarde.`,
          variant: "destructive",
        })
      }
    } catch (erro) {
      toast({ title: "Erro ao atualizar índices", description: String(erro), variant: "destructive" })
    } finally {
      setProgressoIndices(null)
    }
  }

  const [formData, setFormData] = useState<FormData>({
    descricao: "",
    valor: "",
    dataInicial: { dia: "", mes: "", ano: "" },
    dataFinal: { dia: "", mes: "", ano: "" },
    correcaoProRata: false,
    indice: "",
    taxaJuros: "",
    periodicidadeJuros: "",
    tipoJuros: "",
    dataInicialJuros: "",
    dataFinalJuros: "",
    percentualMulta: "",
    percentualHonorarios: "",
    multaSobreJuros: false,
    apresentarMemoria: false,
    mostrarTransparencia: false,
    numeroParcelas: "",
    reajusteParcelas: "IGP-M",
    dataPrimeiraParcela: "",
    parcelamentoRompido: false,
    parcelasPagas: "",
    dataAtualizacaoRompimento: "",
    jurosMoraMensal: "0,5",
    contagemJuros: "dias",
  })

  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null)
  const [erros, setErros] = useState<string[]>([])
  const [atualizandoIndices, setAtualizandoIndices] = useState(false)
  const [mensagemAtualizacao, setMensagemAtualizacao] = useState<string>("")
  const [calculando, setCalculando] = useState(false)

  // Período real de dados de cada índice (início fixo pela fonte; fim pelo último dado disponível)
  const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  const fimDoIndice = (curto: string, diario: boolean): string => {
    const item = relatorioIndices?.itens.find((i) => i.nome === (diario ? "Taxas diárias (SELIC/CDI/TR/Poupança)" : curto))
    if (item?.ok && item.ultimo) {
      const partes = item.ultimo.split("/").map(Number) // MM/AAAA ou DD/MM/AAAA
      return partes.length === 3 ? item.ultimo : `${MESES_ABREV[partes[0] - 1]}/${partes[1]}`
    }
    const estaticos = (indicesData as Record<string, readonly { mes: number; ano: number }[]>)[curto] ?? []
    const ultimo = estaticos[estaticos.length - 1]
    return ultimo ? `${MESES_ABREV[ultimo.mes - 1]}/${ultimo.ano}` : "—"
  }
  const indicesDisponiveis = [
    { valor: "IGP-M (FGV)", inicio: "jun/1989", fim: fimDoIndice("IGP-M", false) },
    { valor: "IPCA (IBGE)", inicio: "jul/1994", fim: fimDoIndice("IPCA", false) },
    { valor: "INPC (IBGE)", inicio: "jul/1994", fim: fimDoIndice("INPC", false) },
    { valor: "Poupança", inicio: "ago/1986", fim: fimDoIndice("Poupança", false) },
    { valor: "CDI", inicio: "mar/1986", fim: fimDoIndice("CDI", true) },
    { valor: "SELIC", inicio: "jun/1986", fim: fimDoIndice("SELIC", true) },
    { valor: "TR (Taxa Referencial)", inicio: "fev/1991", fim: fimDoIndice("TR", false) },
  ]

  const periodicidades = ["Mensal", "Anual", "Diário", "Trimestral", "Semestral"]

  // Função para converter formato brasileiro (296.556,65) para número (296556.65)
  // ⚠️ IMPORTANTE para Taxa de Juros:
  //   - Digite 0,05 para 0,05% (não 0,0005)
  //   - Digite 5 para 5% (não 500)
  //   - A função assume que o valor digitado JÁ é percentual
  //   - Exemplos: "0,05" → 0.05 (zero vírgula zero cinco por cento)
  //              "2,5" → 2.5 (dois vírgula cinco por cento)
  //              "5" → 5 (cinco por cento)
  const parseBrazilianNumber = (value: string): number => {
    if (!value) return 0
    // Remove espaços e converte formato brasileiro para padrão JS
    // 296.556,65 → 296556.65
    // 296,65 → 296.65
    // 0,05 → 0.05 (mantém como está, será tratado como percentual)
    const normalized = value.trim().replace(/\./g, "").replace(",", ".")
    return Number.parseFloat(normalized)
  }

  // Campo de calendário usa "AAAA-MM-DD"; o cálculo usa { dia, mes, ano }
  const dataParaISO = (d: { dia: string; mes: string; ano: string }) =>
    d.dia && d.mes && d.ano && d.ano.length === 4 ? `${d.ano}-${d.mes.padStart(2, "0")}-${d.dia.padStart(2, "0")}` : ""
  const definirDataDoCampo = (campo: "dataInicial" | "dataFinal", valorISO: string) => {
    const [ano, mes, dia] = valorISO ? valorISO.split("-") : ["", "", ""]
    setFormData((prev) => ({
      ...prev,
      [campo]: valorISO ? { dia: String(Number(dia)), mes: String(Number(mes)), ano } : { dia: "", mes: "", ano: "" },
    }))
  }
  const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtDataCalc = (d: { dia: number; mes: number; ano: number }) =>
    `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`
  const isoParaDataCalculo = (valorISO: string) => {
    const [ano, mes, dia] = valorISO.split("-").map(Number)
    return { dia, mes, ano }
  }
  // "AAAA-MM-DD" como data LOCAL (new Date("AAAA-MM-DD") seria meia-noite UTC = dia anterior no Brasil)
  const isoParaDataLocal = (valorISO: string) => {
    const [ano, mes, dia] = valorISO.split("-").map(Number)
    return new Date(ano, mes - 1, dia)
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const executarCalculo = async () => {
    console.log("[CALCULAR] Iniciando cálculo...")
    setCalculando(true)

    const novosErros: string[] = []
    const valorNumerico = parseBrazilianNumber(formData.valor)
    if (!formData.valor || valorNumerico <= 0) novosErros.push("Valor deve ser maior que zero")
    if (!formData.dataInicial.dia || !formData.dataInicial.mes || !formData.dataInicial.ano)
      novosErros.push("Data inicial deve ser preenchida completamente")
    if (!formData.dataFinal.dia || !formData.dataFinal.mes || !formData.dataFinal.ano)
      novosErros.push("Data final deve ser preenchida completamente")
    if (!formData.indice) novosErros.push("Índice deve ser selecionado")
    if (novosErros.length === 0) {
      const errosDatas = validarDatas(
        { dia: Number(formData.dataInicial.dia), mes: Number(formData.dataInicial.mes), ano: Number(formData.dataInicial.ano) },
        { dia: Number(formData.dataFinal.dia), mes: Number(formData.dataFinal.mes), ano: Number(formData.dataFinal.ano) },
      )
      // Avisos começam com "ATENÇÃO" (ex.: deflação) e não bloqueiam; datas inexistentes bloqueiam
      novosErros.push(...errosDatas.filter((e) => !e.startsWith("ATENÇÃO")))
    }
    if (formData.numeroParcelas && formData.parcelamentoRompido) {
      const pagas = Number(formData.parcelasPagas || "0")
      if (!Number.isInteger(pagas) || pagas < 0 || pagas >= Number(formData.numeroParcelas))
        novosErros.push("Rompimento: informe quantas parcelas foram pagas (menos que o total de parcelas)")
      if (!(parseBrazilianNumber(formData.jurosMoraMensal || "0") >= 0))
        novosErros.push("Rompimento: taxa de juros moratórios inválida")
    }

    if (novosErros.length > 0) {
      console.log("[CALCULAR] Erros de validação:", novosErros)
      setErros(novosErros)
      setResultado(null)
      setCalculando(false)
      return
    }

    // ✅ ATUALIZAR ÍNDICES ANTES DO CÁLCULO
    setAtualizandoIndices(true)
    setMensagemAtualizacao("🔄 Sincronizando índices com Banco Central...")

    try {
      const sucesso = await atualizarIndicesNoCache(setProgressoIndices)
      setRelatorioIndices(lerRelatorioAtualizacao())
      if (!sucesso) {
        console.warn("⚠️ Alguns índices não foram atualizados, usando cache local")
        setMensagemAtualizacao("⚠️ Usando dados em cache local - alguns índices não foram sincronizados")
      } else {
        setMensagemAtualizacao("✅ Índices atualizados com sucesso - iniciando cálculo...")
      }
    } catch (error) {
      console.error("Erro ao atualizar índices:", error)
      setMensagemAtualizacao("⚠️ Usando dados em cache local")
    } finally {
      setAtualizandoIndices(false)
      setProgressoIndices(null)
    }

    // ✅ PROSSEGUIR COM O CÁLCULO USANDO OS ÍNDICES ATUALIZADOS
    const dataInicial = {
      dia: Number.parseInt(formData.dataInicial.dia),
      mes: Number.parseInt(formData.dataInicial.mes),
      ano: Number.parseInt(formData.dataInicial.ano),
    }
    const dataFinal = {
      dia: Number.parseInt(formData.dataFinal.dia),
      mes: Number.parseInt(formData.dataFinal.mes),
      ano: Number.parseInt(formData.dataFinal.ano),
    }
    const errosData = validarDatas(dataInicial, dataFinal)

    const parametros: ParametrosCalculo = {
      valorOriginal: valorNumerico,
      dataInicial,
      dataFinal,
      indice: formData.indice,
      correcaoProRata: formData.correcaoProRata,
      taxaJuros: formData.taxaJuros ? parseBrazilianNumber(formData.taxaJuros) : undefined,
      periodicidadeJuros: formData.periodicidadeJuros || undefined,
      tipoJuros: formData.tipoJuros || undefined,
      dataInicialJuros: formData.dataInicialJuros ? isoParaDataLocal(formData.dataInicialJuros) : undefined,
      dataFinalJuros: formData.dataFinalJuros ? isoParaDataLocal(formData.dataFinalJuros) : undefined,
      percentualMulta: formData.percentualMulta ? parseBrazilianNumber(formData.percentualMulta) : undefined,
      percentualHonorarios: formData.percentualHonorarios
        ? parseBrazilianNumber(formData.percentualHonorarios)
        : undefined,
      multaSobreJuros: formData.multaSobreJuros,
      numeroParcelas: formData.numeroParcelas ? Number.parseInt(formData.numeroParcelas) : undefined,
      reajusteParcelas: formData.reajusteParcelas,
      dataPrimeiraParcela: formData.dataPrimeiraParcela ? isoParaDataCalculo(formData.dataPrimeiraParcela) : undefined,
      rompimento:
        formData.numeroParcelas && formData.parcelamentoRompido
          ? {
              parcelasPagas: Number.parseInt(formData.parcelasPagas || "0"),
              dataAtualizacao: formData.dataAtualizacaoRompimento
                ? isoParaDataCalculo(formData.dataAtualizacaoRompimento)
                : { dia: new Date().getDate(), mes: new Date().getMonth() + 1, ano: new Date().getFullYear() },
              taxaJurosMoraMensal: parseBrazilianNumber(formData.jurosMoraMensal || "0,5"),
            }
          : undefined,
      contagemJuros: formData.contagemJuros,
    }

    try {
      console.log("[CALCULAR] Parâmetros:", parametros)
      const resultadoCalculo = await calcularCorrecaoMonetaria(parametros)
      console.log("[CALCULAR] Resultado:", resultadoCalculo)
      setResultado(resultadoCalculo)
      // Aviso (não bloqueia): taxa mensal muito baixa costuma ser erro de digitação (ex.: 0,05 em vez de 0,5)
      const taxaInformada = formData.taxaJuros ? parseBrazilianNumber(formData.taxaJuros) : 0
      const avisoTaxa =
        taxaInformada > 0 && taxaInformada < 0.1 && (formData.periodicidadeJuros || "Mensal") === "Mensal"
          ? [`ATENÇÃO: taxa de juros de ${formData.taxaJuros}% ao mês é muito baixa — confira a digitação (o Parecer AJG nº 573/2007 prevê juros moratórios de 0,5% ao mês).`]
          : []
      setErros([...errosData, ...avisoTaxa])
      setMensagemAtualizacao("")
    } catch (error) {
      console.error("[CALCULAR] Erro:", error)
      setErros([`Erro no cálculo: ${error instanceof Error ? error.message : "Erro desconhecido"}`])
      setResultado(null)
      setMensagemAtualizacao("")
    } finally {
      setCalculando(false)
    }
  }

  const limparFormulario = () => {
    setFormData({
      descricao: "",
      valor: "",
      dataInicial: { dia: "", mes: "", ano: "" },
      dataFinal: { dia: "", mes: "", ano: "" },
      correcaoProRata: false,
      indice: "",
      taxaJuros: "",
      periodicidadeJuros: "",
      tipoJuros: "",
      dataInicialJuros: "",
      dataFinalJuros: "",
      percentualMulta: "",
      percentualHonorarios: "",
      multaSobreJuros: false,
      apresentarMemoria: false,
      mostrarTransparencia: false,
      numeroParcelas: "",
      reajusteParcelas: "IGP-M",
      dataPrimeiraParcela: "",
      parcelamentoRompido: false,
      parcelasPagas: "",
      dataAtualizacaoRompimento: "",
      jurosMoraMensal: "0,5",
      contagemJuros: "dias",
    })
    setResultado(null)
    setErros([])
  }

  const gerarPDF = () => {
    const element = document.getElementById("memoria-calculo")
    if (!element) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const base64Logo = canvas.toDataURL("image/png")

      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Memória de Cálculo - CGOF</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .logo { height: 80px; margin-bottom: 15px; max-width: 100%; }
        .title { font-size: 24px; font-weight: bold; margin: 10px 0; color: #333; }
        .subtitle { font-size: 16px; color: #666; margin-bottom: 10px; }
        .memoria-content { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-line; overflow-wrap: anywhere; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${base64Logo}" alt="Governo do Estado de São Paulo - Secretaria da Saúde" class="logo" />
        <div class="title">Calculadora de Atualização Monetária - CGOF</div>
        <div class="subtitle">Memória de Cálculo Detalhada</div>
        <div class="subtitle">Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>

      <div class="memoria-content">
${resultado ? memoriaSemFundamentacao(resultado.memoriaCalculo).join("\n") : ""}
      </div>

      <div class="footer">
        <p>Secretaria da Saúde do Estado de São Paulo - CGOF</p>
        <p>Documento gerado automaticamente pela Calculadora de Atualização Monetária</p>
      </div>
    </body>
    </html>
  `
      printWindow.document.write(printContent)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 1000)
    }

    img.src = "/images/brasao-sp-saude.png"
  }

  const gerarXLSX = async () => {
    if (!resultado?.memoriaCalculo) return

    try {
      // Preparar dados da memória de cálculo
      const memoriaLinhas = resultado.memoriaCalculo

      // Criar workbook
      const workbook = XLSX.utils.book_new()

      // Criar dados do cabeçalho
      const headerData = [
        ["CALCULADORA DE ATUALIZAÇÃO MONETÁRIA - CGOF"],
        ["Secretaria da Saúde do Estado de São Paulo"],
        ["Memória de Cálculo Detalhada"],
        [`Data: ${new Date().toLocaleDateString("pt-BR")}`],
        [],
      ]

      // Combinar cabeçalho com memória de cálculo
      const allData = [...headerData, ...memoriaLinhas.map((linha) => [linha])]

      // Criar worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(allData)

      // Ajustar largura da coluna
      worksheet["!cols"] = [{ wch: 120 }]

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Memória de Cálculo")

      // Gerar array buffer em vez de tentar usar writeFile
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

      // Criar Blob
      const blob = new Blob([wbout], { type: "application/octet-stream" })

      // Criar URL temporária e fazer download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      const dataFormatada = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")
      a.href = url
      a.download = `Memoria_Calculo_CGOF_${dataFormatada}.xlsx`
      document.body.appendChild(a)
      a.click()

      // Limpar
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)

      toast({
        title: "Download XLSX iniciado",
        description: "O arquivo está sendo baixado...",
      })
    } catch (error) {
      console.error("[v0] Erro ao gerar XLSX:", error)
      toast({
        title: "Erro ao gerar XLSX",
        description: "Ocorreu um erro ao gerar o arquivo. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const imprimir = () => {
    const element = document.getElementById("memoria-calculo")
    if (!element) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const base64Logo = canvas.toDataURL("image/png")

      const originalContents = document.body.innerHTML
      const originalTitle = document.title

      const printContent = `
    <div style="font-family: Arial, sans-serif; margin: 20px; line-height: 1.4;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <img src="${base64Logo}" alt="Governo do Estado de São Paulo - Secretaria da Saúde" style="height: 80px; margin-bottom: 15px; max-width: 100%;" />
        <div style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #333;">Calculadora de Atualização Monetária - CGOF</div>
        <div style="font-size: 16px; color: #666; margin-bottom: 10px;">Memória de Cálculo Detalhada</div>
        <div style="font-size: 14px; color: #666;">Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>

      <div style="font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-line; overflow-wrap: anywhere; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
${resultado?.memoriaCalculo.join("\n") || ""}
      </div>

      <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
        <p>Secretaria da Saúde do Estado de São Paulo - CGOF</p>
        <p>Documento gerado automaticamente pela Calculadora de Atualização Monetária</p>
      </div>
    </div>
  `
      document.body.innerHTML = printContent
      document.title = "Memória de Cálculo - CGOF"

      const style = document.createElement("style")
      style.textContent = `
    @media print { body { margin: 0 !important; } @page { margin: 1cm; } }
  `
      document.head.appendChild(style)

      setTimeout(() => {
        window.print()
        document.body.innerHTML = originalContents
        document.title = originalTitle
        window.location.reload()
      }, 500)
    }

    img.src = "/images/brasao-sp-saude.png"
  }

  const isIGPM = formData.indice.includes("IGP-M")
  const isPoupanca = formData.indice.includes("Poupança")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Cabeçalho institucional */}
        <div className="bg-white border-b border-gray-200 shadow-sm -mx-4 px-4 py-3 mb-6">
          <div className="max-w-6xl mx-auto flex items-center gap-6">
            <div className="flex-shrink-0">
              <img 
                src="/images/brasao-sp-saude.png" 
                alt="Governo do Estado de São Paulo - Secretaria da Saúde" 
                className="h-24 w-auto"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-600" />
                Calculadora de Atualização Monetária
              </h1>
              <p className="text-sm text-gray-500 mt-1">CGOF — Correção Monetária, Juros, Multa e Honorários</p>
            </div>
          </div>
        </div>

        {/* Status e atualização dos índices */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                Índices do Banco Central
              </h3>
              <p className="text-sm text-gray-500">
                {relatorioIndices
                  ? `Última atualização: ${new Date(relatorioIndices.data).toLocaleString("pt-BR")}${relatorioIndices.sucesso ? "" : " (incompleta)"}`
                  : "Ainda não atualizados neste navegador — usando os dados oficiais embarcados no sistema."}
              </p>
            </div>
            <Button onClick={atualizarIndices} disabled={!!progressoIndices || calculando} className="shrink-0">
              {progressoIndices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {progressoIndices ? "Atualizando..." : "Atualizar índices"}
            </Button>
          </div>

          {progressoIndices && !calculando && (
            <div className="mt-4">
              <Progress value={(progressoIndices.concluidos / progressoIndices.total) * 100} className="h-3 [&>div]:bg-blue-600" />
              <p className="text-xs text-gray-600 mt-1">
                {progressoIndices.concluidos} de {progressoIndices.total} — {progressoIndices.etapa}
              </p>
            </div>
          )}

          {relatorioIndices && (
            <div className="mt-3 flex flex-wrap gap-2">
              {relatorioIndices.itens.map((item) => (
                <span
                  key={item.nome}
                  title={item.erro ?? `${item.registros} registros`}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    item.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-300 text-amber-800"
                  }`}
                >
                  {item.ok ? "✓" : "⚠"} {item.nome}
                  {item.ultimo ? ` · até ${item.ultimo}` : ""}
                  {!item.ok ? " · falhou" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Aviso mensal: a cada novo mês o sistema pede para atualizar os índices */}
        <Dialog open={avisoMensalAberto && !calculando} onOpenChange={(aberto) => !progressoIndices && setAvisoMensalAberto(aberto)}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => progressoIndices && e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                Atualize os índices deste mês
              </DialogTitle>
              <DialogDescription>
                Começou um novo mês e os índices ainda não foram atualizados. Atualize para garantir que os cálculos usem
                os valores mais recentes publicados pelo Banco Central.
              </DialogDescription>
            </DialogHeader>
            {progressoIndices && (
              <div className="py-2">
                <Progress value={(progressoIndices.concluidos / progressoIndices.total) * 100} className="h-3 [&>div]:bg-blue-600" />
                <p className="text-xs text-gray-600 mt-1">
                  {progressoIndices.concluidos} de {progressoIndices.total} — {progressoIndices.etapa}
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAvisoMensalAberto(false)} disabled={!!progressoIndices}>
                Lembrar depois
              </Button>
              <Button onClick={atualizarIndices} disabled={!!progressoIndices}>
                {progressoIndices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {progressoIndices ? "Atualizando..." : "Atualizar agora"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100 mb-6">
          <h3 className="text-lg font-bold mb-1 text-blue-900 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" />
            Sobre os Índices
          </h3>
          <p className="text-sm text-blue-700 mb-4">Dados oficiais atualizados mensalmente via API do Banco Central do Brasil</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <TrendingUp className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">IGP-M (FGV)</p>
                <p className="text-xs text-gray-500">Índice Geral de Preços – Mercado</p>
                <p className="text-xs text-blue-600 mt-1">Fundação Getúlio Vargas · BCB Série 28655</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <Activity className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">IPCA (IBGE)</p>
                <p className="text-xs text-gray-500">Índice Nacional de Preços ao Consumidor Amplo</p>
                <p className="text-xs text-blue-600 mt-1">IBGE · BCB Série 433</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <Activity className="h-5 w-5 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">INPC (IBGE)</p>
                <p className="text-xs text-gray-500">Índice Nacional de Preços ao Consumidor</p>
                <p className="text-xs text-blue-600 mt-1">IBGE · BCB Série 188</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <PiggyBank className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">Poupança</p>
                <p className="text-xs text-gray-500">Rendimento mensal da Caderneta de Poupança</p>
                <p className="text-xs text-blue-600 mt-1">BCB Séries 195 (regra nova) e 25 (regra antiga) · taxa diária por aniversário</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <Landmark className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">CDI</p>
                <p className="text-xs text-gray-500">Certificado de Depósito Interbancário</p>
                <p className="text-xs text-blue-600 mt-1">B3/CETIP · BCB Série 12 (taxa diária)</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <DollarSign className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">SELIC</p>
                <p className="text-xs text-gray-500">Taxa Básica de Juros da Economia</p>
                <p className="text-xs text-blue-600 mt-1">Banco Central do Brasil · BCB Série 11 (taxa diária)</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100 flex items-start gap-3 shadow-sm">
              <RefreshCw className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-800 text-sm">TR (Taxa Referencial)</p>
                <p className="text-xs text-gray-500">Taxa de remuneração de depósitos de poupança</p>
                <p className="text-xs text-blue-600 mt-1">Banco Central do Brasil · BCB Série 226 (taxa diária por aniversário)</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <Dialog open={calculando}>
              <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 justify-center">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    Processando Cálculo
                  </DialogTitle>
                </DialogHeader>
                <div className="py-6 text-center">
                  {atualizandoIndices ? (
                    <>
                      <p className="text-blue-700 font-medium mb-3">🔄 Sincronizando com Banco Central...</p>
                      <Progress
                        value={progressoIndices ? (progressoIndices.concluidos / progressoIndices.total) * 100 : 0}
                        className="h-3 [&>div]:bg-blue-600"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {progressoIndices
                          ? `${progressoIndices.concluidos} de ${progressoIndices.total} — ${progressoIndices.etapa}`
                          : "Buscando índices atualizados"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-blue-700 font-medium mb-2">Calculando correção monetária...</p>
                      <p className="text-sm text-gray-500">Aguarde enquanto processamos os dados</p>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">
                Cálculo de atualização monetária (Para deflacionar um valor, informe uma data final anterior à inicial)
              </AlertDescription>
            </Alert>

            {erros.length > 0 && (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-orange-700">
                    {erros.map((erro, index) => (
                      <li key={index}>{erro}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Valor e Datas para Atualização</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="valor" className="mb-2 block">
                    Valor a ser atualizado ou deflacionado
                  </Label>
                  <Input
                    id="valor"
                    type="text"
                    placeholder="Ex: 296.556,65"
                    value={formData.valor}
                    onChange={(e) => handleInputChange("valor", e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="prorata"
                    checked={formData.correcaoProRata}
                    onCheckedChange={(checked) => handleInputChange("correcaoProRata", checked as boolean)}
                  />
                  <Label htmlFor="prorata">Correção Pro-Rata (apenas Poupança)</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <Label htmlFor="dataInicial" className="mb-2 block font-medium">Data Inicial</Label>
                  <Input
                    id="dataInicial"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    value={dataParaISO(formData.dataInicial)}
                    onChange={(e) => definirDataDoCampo("dataInicial", e.target.value)}
                    aria-describedby="dica-datas"
                  />
                </div>

                <div>
                  <Label htmlFor="dataFinal" className="mb-2 block font-medium">Data Final</Label>
                  <Input
                    id="dataFinal"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    value={dataParaISO(formData.dataFinal)}
                    onChange={(e) => definirDataDoCampo("dataFinal", e.target.value)}
                    aria-describedby="dica-datas"
                  />
                </div>
              </div>
              <p id="dica-datas" className="text-xs text-gray-500 mt-2">
                Digite a data (dd/mm/aaaa) ou clique no ícone do calendário para escolher.
              </p>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Índice da Atualização</h3>
              <Select value={formData.indice} onValueChange={(value) => handleInputChange("indice", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o índice" />
                </SelectTrigger>
                <SelectContent>
                  {indicesDisponiveis.map((indice) => (
                    <SelectItem key={indice.valor} value={indice.valor}>
                      {indice.valor} ...... ({indice.inicio} a {indice.fim})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Dados referentes aos juros</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="taxaJuros" className="mb-2 block">
                    Taxa e período (%)
                    <span className="text-xs text-gray-500 ml-2">(Ex: 0,5 = 0,5% | 1 = 1%)</span>
                  </Label>
                  <Input
                    id="taxaJuros"
                    type="text"
                    placeholder="Digite o percentual: 0,5 (para 0,5%) ou 1 (para 1%)"
                    value={formData.taxaJuros}
                    onChange={(e) => handleInputChange("taxaJuros", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Periodicidade</Label>
                  <Select
                    value={formData.periodicidadeJuros}
                    onValueChange={(value) => handleInputChange("periodicidadeJuros", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mensal", "Anual", "Diário", "Trimestral", "Semestral"].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Tipo de juros</Label>
                  <Select value={formData.tipoJuros} onValueChange={(value) => handleInputChange("tipoJuros", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples">Simples</SelectItem>
                      <SelectItem value="composto">Composto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicialJuros" className="mb-2 block">
                    Data inicial dos juros
                  </Label>
                  <Input
                    id="dataInicialJuros"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    value={formData.dataInicialJuros}
                    onChange={(e) => handleInputChange("dataInicialJuros", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dataFinalJuros" className="mb-2 block">
                    Data final dos juros
                  </Label>
                  <Input
                    id="dataFinalJuros"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    value={formData.dataFinalJuros}
                    onChange={(e) => handleInputChange("dataFinalJuros", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">(*) Informar apenas se diferentes das datas acima.</p>
              <div className="mt-4 max-w-md">
                <Label className="mb-2 block">Contagem do tempo dos juros</Label>
                <Select
                  value={formData.contagemJuros}
                  onValueChange={(value) => handleInputChange("contagemJuros", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dias">Dias corridos (dias ÷ 365)</SelectItem>
                    <SelectItem value="meses">Meses (pro rata die: meses completos + dias ÷ 30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Multa / Honorários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="percentualMulta" className="mb-2 block">
                    Percentual da multa (%)
                  </Label>
                  <Input
                    id="percentualMulta"
                    type="text"
                    placeholder="Ex: 10,5"
                    value={formData.percentualMulta}
                    onChange={(e) => handleInputChange("percentualMulta", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="percentualHonorarios" className="mb-2 block">
                    Percentual dos honorários (%)
                  </Label>
                  <Input
                    id="percentualHonorarios"
                    type="text"
                    placeholder="Ex: 5,25"
                    value={formData.percentualHonorarios}
                    onChange={(e) => handleInputChange("percentualHonorarios", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multaSobreJuros"
                  checked={formData.multaSobreJuros}
                  onCheckedChange={(checked) => handleInputChange("multaSobreJuros", checked as boolean)}
                />
                <Label htmlFor="multaSobreJuros">Calcular a multa também sobre os juros</Label>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
                Parcelamento (Opcional)
              </h3>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-gray-600 mb-3">
                  Divida o valor total atualizado em parcelas. Pelo Parecer AJG nº 573/2007, as parcelas são reajustadas
                  pelo IGP-M/FGV ao término de cada período de 12 parcelas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="numeroParcelas" className="text-sm font-medium mb-2 block">
                      Número de Parcelas
                    </Label>
                    <Input
                      id="numeroParcelas"
                      type="number"
                      min="1"
                      max="360"
                      placeholder="Vazio = sem parcelamento"
                      value={formData.numeroParcelas || ""}
                      onChange={(e) => handleInputChange("numeroParcelas", e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataPrimeiraParcela" className="text-sm font-medium mb-2 block">
                      Vencimento da 1ª parcela
                    </Label>
                    <Input
                      id="dataPrimeiraParcela"
                      type="date"
                      min="1900-01-01"
                      max="2100-12-31"
                      value={formData.dataPrimeiraParcela}
                      onChange={(e) => handleInputChange("dataPrimeiraParcela", e.target.value)}
                    />
                    <span className="text-xs text-gray-500">Vazio = data final do cálculo</span>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Reajuste a cada 12 parcelas</Label>
                    <Select
                      value={formData.reajusteParcelas}
                      onValueChange={(value) => handleInputChange("reajusteParcelas", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IGP-M">IGP-M/FGV (Parecer AJG 573/2007)</SelectItem>
                        <SelectItem value="IPCA">IPCA/IBGE</SelectItem>
                        <SelectItem value="nenhum">Sem reajuste</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!formData.numeroParcelas || Number(formData.numeroParcelas) <= 12) && (
                      <span className="text-xs text-gray-500">Só se aplica com mais de 12 parcelas</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-amber-200">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="parcelamentoRompido"
                      checked={formData.parcelamentoRompido}
                      disabled={!formData.numeroParcelas}
                      onCheckedChange={(checked) => handleInputChange("parcelamentoRompido", checked as boolean)}
                    />
                    <Label htmlFor="parcelamentoRompido" className="text-sm cursor-pointer font-medium">
                      Parcelamento rompido (parcela não paga — vencimento antecipado da dívida)
                    </Label>
                  </div>
                  {formData.parcelamentoRompido && formData.numeroParcelas && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                      <div>
                        <Label htmlFor="parcelasPagas" className="text-sm font-medium mb-2 block">
                          Parcelas pagas
                        </Label>
                        <Input
                          id="parcelasPagas"
                          type="number"
                          min="0"
                          max={Number(formData.numeroParcelas) - 1}
                          placeholder="Ex: 14"
                          value={formData.parcelasPagas}
                          onChange={(e) => handleInputChange("parcelasPagas", e.target.value)}
                        />
                        <span className="text-xs text-gray-500">Rompimento = vencimento da parcela seguinte</span>
                      </div>
                      <div>
                        <Label htmlFor="dataAtualizacaoRompimento" className="text-sm font-medium mb-2 block">
                          Atualizar o saldo até
                        </Label>
                        <Input
                          id="dataAtualizacaoRompimento"
                          type="date"
                          min="1900-01-01"
                          max="2100-12-31"
                          value={formData.dataAtualizacaoRompimento}
                          onChange={(e) => handleInputChange("dataAtualizacaoRompimento", e.target.value)}
                        />
                        <span className="text-xs text-gray-500">Vazio = hoje</span>
                      </div>
                      <div>
                        <Label htmlFor="jurosMoraMensal" className="text-sm font-medium mb-2 block">
                          Juros moratórios (% ao mês)
                        </Label>
                        <Input
                          id="jurosMoraMensal"
                          type="text"
                          value={formData.jurosMoraMensal}
                          onChange={(e) => handleInputChange("jurosMoraMensal", e.target.value)}
                        />
                        <span className="text-xs text-gray-500">Parecer AJG 573/2007: 0,5% ao mês</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button 
                onClick={executarCalculo} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" 
                size="lg"
                disabled={calculando}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {calculando ? "Calculando..." : "Executar o Cálculo"}
              </Button>
              <Button
                onClick={limparFormulario}
                variant="outline"
                className="w-full sm:w-auto bg-transparent"
                size="lg"
              >
                Limpar
              </Button>
              <div className="flex items-center space-x-4 ml-auto">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mostrarTransparencia"
                    checked={formData.mostrarTransparencia}
                    onCheckedChange={(checked) => handleInputChange("mostrarTransparencia", checked as boolean)}
                  />
                  <Label htmlFor="mostrarTransparencia">Mostrar transparência</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apresentarMemoria"
                    checked={formData.apresentarMemoria}
                    onCheckedChange={(checked) => handleInputChange("apresentarMemoria", checked as boolean)}
                  />
                  <Label htmlFor="apresentarMemoria">Apresentar memória de cálculo</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {resultado && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resultado do Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Valor Original</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {(resultado.valorOriginal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Valor Atualizado</p>
                    <p className="text-2xl font-bold text-green-700">
                      R$ {(resultado.valorCorrigido ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Valor Corrigido:</span>
                      <span className="font-medium">
                        R$ {(resultado.valorCorrigido ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Juros:</span>
                      <span className="font-medium">
                        R$ {(resultado.juros ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Multa:</span>
                      <span className="font-medium">
                        R$ {(resultado.multa ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Honorários:</span>
                      <span className="font-medium">
                        R$ {(resultado.honorarios ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">
                        R$ {(resultado.valorTotal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exibir resultado do parcelamento */}
                {resultado.parcelamento && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-4 text-green-900">✅ Parcelamento Calculado</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-gray-600">Número de Parcelas</p>
                        <p className="text-2xl font-bold text-green-700">{resultado.parcelamento.numeroParcelas}×</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="text-2xl font-bold text-green-700">
                          R$ {resultado.parcelamento.valorTotalParcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 p-3 bg-white rounded border border-green-100">
                      <p className="mb-2">
                        <strong>⚠️ Importante:</strong> Os valores das parcelas variam conforme os reajustes por índice (a cada 12 parcelas).
                        Confira na Memória de Cálculo (abaixo) o cronograma completo com os valores individuais de cada parcela.
                      </p>
                      {resultado.parcelamento.possuiProvisorias && (
                        <p className="text-amber-700">
                          Há parcelas “a reajustar”: dependem de {resultado.parcelamento.reajuste} ainda não publicado — o total é provisório.
                        </p>
                      )}
                    </div>

                    {resultado.parcelamento.rompimento && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-semibold mb-3 text-red-900">Rompimento do parcelamento — vencimento antecipado</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          {[
                            ["Parcelas pagas / em aberto", `${resultado.parcelamento.rompimento.parcelasPagas} / ${resultado.parcelamento.rompimento.parcelasEmAberto}`],
                            ["Data do rompimento", fmtDataCalc(resultado.parcelamento.rompimento.dataRompimento)],
                            ["Saldo vencido antecipadamente", brl(resultado.parcelamento.rompimento.saldoAntecipado)],
                            [`Saldo atualizado pela Poupança (fator ${resultado.parcelamento.rompimento.fatorPoupanca.toFixed(6).replace(".", ",")})`, brl(resultado.parcelamento.rompimento.saldoCorrigido)],
                            [`Juros moratórios (${resultado.parcelamento.rompimento.taxaJurosMoraMensal.toString().replace(".", ",")}% a.m. × ${resultado.parcelamento.rompimento.periodoJurosMeses.toFixed(4).replace(".", ",")} meses)`, brl(resultado.parcelamento.rompimento.juros)],
                          ].map(([rotulo, valor]) => (
                            <div key={rotulo} className="flex justify-between gap-4">
                              <span className="text-gray-600">{rotulo}</span>
                              <span className="font-medium">{valor}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-red-200 flex justify-between">
                          <span className="font-semibold text-red-900">
                            Total devido em {fmtDataCalc(resultado.parcelamento.rompimento.dataAtualizacao)}
                          </span>
                          <span className="text-xl font-bold text-red-700">{brl(resultado.parcelamento.rompimento.totalDevido)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {resultado.juros > 0 && (
                  <div className="mt-4 p-4 rounded border bg-white">
                    <h4 className="font-semibold mb-2">Detalhes dos Juros</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Dias totais (Actual):</span>
                        <span className="font-medium">{resultado.diasTotais ?? "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Anos exatos{resultado.convencaoDia ? ` (${resultado.convencaoDia})` : ""}:</span>
                        <span className="font-medium">
                          {resultado.anosExatos !== undefined ? resultado.anosExatos.toString() : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa anual{resultado.tipoTaxaAnual ? ` (${resultado.tipoTaxaAnual})` : ""}:</span>
                        <span className="font-medium">
                          {resultado.taxaAnual !== undefined ? (resultado.taxaAnual * 100).toFixed(6) + "%" : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {formData.mostrarTransparencia &&
                  isIGPM &&
                  resultado.detalhamentoIGPM &&
                  resultado.detalhamentoIGPM.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3 text-lg">Transparência – Detalhamento IGP-M</h4>
                      <div className="overflow-x-auto border rounded">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Mês/Ano</th>
                              <th className="px-3 py-2 text-right">Percentual IGP-M (%)</th>
                              <th className="px-3 py-2 text-right">Fator Mensal</th>
                              <th className="px-3 py-2 text-right">Fator Acumulado</th>
                              <th className="px-3 py-2 text-right">Valor Acumulado (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultado.detalhamentoIGPM.map((d, i) => (
                              <tr key={i} className={d.pendente ? "bg-yellow-50" : ""}>
                                <td className="px-3 py-2">
                                  {String(d.mes).padStart(2, "0")}/{d.ano}
                                  {d.pendente && (
                                    <span className="ml-2 text-xs text-yellow-700 font-medium">Pendente</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {d.pendente
                                    ? "-"
                                    : d.percentual !== undefined
                                      ? d.percentual.toString().replace(".", ",")
                                      : "-"}
                                </td>
                                <td className="px-3 py-2 text-right">{d.pendente ? "-" : d.fatorMensal?.toString()}</td>
                                <td className="px-3 py-2 text-right">{d.fatorAcumulado.toString()}</td>
                                <td className="px-3 py-2 text-right">
                                  {d.valorAcumulado !== undefined
                                    ? d.valorAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {resultado.fontes && (
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          <div className="font-medium">Fontes utilizadas para obtenção dos percentuais do índice:</div>
                          <ul className="list-disc list-inside">
                            {resultado.fontes.map((f, idx) => (
                              <li key={idx}>
                                <a
                                  href={f.split(": ").slice(-1)[0]}
                                  target="_blank"
                                  className="text-gray-700 underline"
                                  rel="noreferrer"
                                >
                                  {f}
                                </a>
                              </li>
                            ))}
                          </ul>
                          <div className="text-gray-600">
                            Observações: Nunca utilizamos valores estimados. Meses sem divulgação aparecem como
                            "Pendente" e não entram no cálculo. Evitamos arredondamentos intermediários; o
                            arredondamento ocorre apenas na apresentação final.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {formData.mostrarTransparencia &&
                  isPoupanca &&
                  resultado.detalhamentoPoupanca &&
                  resultado.detalhamentoPoupanca.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3 text-lg">Transparência – Detalhamento Poupança</h4>
                      <div className="overflow-x-auto border rounded">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Mês/Ano</th>
                              <th className="px-3 py-2 text-right">Taxa Mensal (%)</th>
                              <th className="px-3 py-2 text-right">Juros do Mês (R$)</th>
                              <th className="px-3 py-2 text-right">Taxa Acumulada (%)</th>
                              <th className="px-3 py-2 text-right">Fator Mensal</th>
                              <th className="px-3 py-2 text-right">Valor Total (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultado.detalhamentoPoupanca.map((d, i) => (
                              <tr key={i} className={d.pendente ? "bg-yellow-50" : ""}>
                                <td className="px-3 py-2">
                                  {String(d.mes).padStart(2, "0")}/{d.ano}
                                  {d.pendente && (
                                    <span className="ml-2 text-xs text-yellow-700 font-medium">Pendente</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {d.pendente
                                    ? "-"
                                    : d.taxaJurosMensal !== undefined
                                      ? d.taxaJurosMensal.toFixed(4).replace(".", ",") + "%"
                                      : "-"}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {d.pendente
                                    ? "-"
                                    : d.valorJurosMensal !== undefined
                                      ? "R$ " + d.valorJurosMensal.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                      : "-"}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {d.taxaAcumuladaJuros !== undefined
                                    ? d.taxaAcumuladaJuros.toFixed(4).replace(".", ",") + "%"
                                    : "-"}
                                </td>
                                <td className="px-3 py-2 text-right">{d.pendente ? "-" : d.fatorMensal?.toFixed(6)}</td>
                                <td className="px-3 py-2 text-right">
                                  {d.valorTotalComJuros !== undefined
                                    ? "R$ " + d.valorTotalComJuros.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                    : d.valorAcumulado !== undefined
                                      ? "R$ " + d.valorAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                      : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {resultado.fontes && (
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          <div className="font-medium">Dados referentes aos juros - Taxa e período (%) mês a mês:</div>
                          <div className="text-gray-700 bg-gray-50 p-2 rounded">
                            • <strong>Taxa Mensal (%):</strong> Percentual de rendimento da poupança no mês específico
                            <br />• <strong>Juros do Mês (R$):</strong> Valor em reais dos juros ganhos no período
                            mensal
                            <br />• <strong>Taxa Acumulada (%):</strong> Percentual total de rendimento desde o início
                            do período
                            <br />• <strong>Valor Total (R$):</strong> Valor principal + juros acumulados até o mês
                          </div>
                          <div className="font-medium">
                            Fontes utilizadas para obtenção dos percentuais da Poupança:
                          </div>
                          <ul className="list-disc list-inside">
                            {resultado.fontes.map((f, idx) => (
                              <li key={idx}>
                                <a
                                  href={f.split(": ").slice(-1)[0]}
                                  target="_blank"
                                  className="text-gray-700 underline"
                                  rel="noreferrer"
                                >
                                  {f}
                                </a>
                              </li>
                            ))}
                          </ul>
                          <div className="text-gray-600">
                            Observações: Dados oficiais do Banco Central do Brasil. Taxas aplicadas conforme regra de
                            aniversário da poupança. Cálculos realizados sem arredondamentos intermediários para máxima
                            precisão.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {formData.apresentarMemoria && resultado.memoriaCalculo && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Memória de Cálculo
                      </h3>
                      <div className="flex gap-2">
                        <Button onClick={gerarXLSX} variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Baixar XLSX
                        </Button>
                        <Button onClick={gerarPDF} variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Gerar PDF
                        </Button>
                        <Button onClick={imprimir} variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Imprimir
                        </Button>
                      </div>
                    </div>

                    <div
                      id="memoria-calculo"
                      className="bg-gray-50 p-4 rounded-lg border font-mono text-sm whitespace-pre-line overflow-x-auto [overflow-wrap:anywhere]"
                    >
                      {resultado.memoriaCalculo.join("\n")}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
