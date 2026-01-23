"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calculator, FileText, AlertTriangle, Download, Database } from "lucide-react" // Added Download icon
import {
  calcularCorrecaoMonetaria,
  validarDatas,
  type ParametrosCalculo,
  type ResultadoCalculo,
} from "@/lib/calculo-monetario"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

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
}

export default function CalculadoraAtualizacaoMonetaria() {
  const { toast } = useToast()
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
  })

  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null)
  const [erros, setErros] = useState<string[]>([])
  const [atualizandoIndices, setAtualizandoIndices] = useState(false)
  const [mensagemAtualizacao, setMensagemAtualizacao] = useState<string>("")

  const obterDataAtualFormatada = () => {
    const agora = new Date()
    const mesesAbreviados = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
    const mesAtual = mesesAbreviados[agora.getMonth()]
    const anoAtual = agora.getFullYear()
    return `${mesAtual}/${anoAtual}`
  }

  const dataAtualFormatada = obterDataAtualFormatada()

  const indicesDisponiveis = [
    `IGP-M (FGV) ...... (jun/1989 a ${dataAtualFormatada})`,
    `Poupança ...... (mai/2012 a ${dataAtualFormatada})`,
  ]

  const meses = [
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
  ]
  const dias = Array.from({ length: 31 }, (_, i) => i + 1)
  const anos = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i)
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
    const novosErros: string[] = []
    const valorNumerico = parseBrazilianNumber(formData.valor)
    if (!formData.valor || valorNumerico <= 0) novosErros.push("Valor deve ser maior que zero")
    if (!formData.dataInicial.dia || !formData.dataInicial.mes || !formData.dataInicial.ano)
      novosErros.push("Data inicial deve ser preenchida completamente")
    if (!formData.dataFinal.dia || !formData.dataFinal.mes || !formData.dataFinal.ano)
      novosErros.push("Data final deve ser preenchida completamente")
    if (!formData.indice) novosErros.push("Índice deve ser selecionado")

    if (novosErros.length > 0) {
      setErros(novosErros)
      setResultado(null)
      return
    }

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
      dataInicialJuros: formData.dataInicialJuros ? new Date(formData.dataInicialJuros) : undefined,
      dataFinalJuros: formData.dataFinalJuros ? new Date(formData.dataFinalJuros) : undefined,
      percentualMulta: formData.percentualMulta ? parseBrazilianNumber(formData.percentualMulta) : undefined,
      percentualHonorarios: formData.percentualHonorarios
        ? parseBrazilianNumber(formData.percentualHonorarios)
        : undefined,
      multaSobreJuros: formData.multaSobreJuros,
      numeroParcelas: formData.numeroParcelas ? Number.parseInt(formData.numeroParcelas) : undefined,
    }

    try {
      const resultadoCalculo = await calcularCorrecaoMonetaria(parametros)
      setResultado(resultadoCalculo)
      setErros(errosData)
    } catch (error) {
      setErros([`Erro no cálculo: ${error instanceof Error ? error.message : "Erro desconhecido"}`])
      setResultado(null)
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
        .memoria-content { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-line; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${base64Logo}" alt="Secretaria da Saúde - São Paulo" class="logo" />
        <div class="title">Calculadora de Atualização Monetária - CGOF</div>
        <div class="subtitle">Memória de Cálculo Detalhada</div>
        <div class="subtitle">Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>

      <div class="memoria-content">
${resultado?.memoriaCalculo.join("\n") || ""}
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

    img.src = "/images/secretaria-saude-sp.png"
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
        <img src="${base64Logo}" alt="Secretaria da Saúde - São Paulo" style="height: 80px; margin-bottom: 15px; max-width: 100%;" />
        <div style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #333;">Calculadora de Atualização Monetária - CGOF</div>
        <div style="font-size: 16px; color: #666; margin-bottom: 10px;">Memória de Cálculo Detalhada</div>
        <div style="font-size: 14px; color: #666;">Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>

      <div style="font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-line; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
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

    img.src = "/images/secretaria-saude-sp.png"
  }

  const atualizarIndicesOficiais = async () => {
    setAtualizandoIndices(true)
    setMensagemAtualizacao("Iniciando atualização dos índices das fontes oficiais...")

    try {
      setMensagemAtualizacao("Buscando dados do Banco Central e FGV...")
      // Fetch from official sources
      const response = await fetch("/api/atualizar-indices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const resultado = await response.json()
        
        // Salvar dados atualizados no localStorage
        if (typeof window !== "undefined") {
          try {
            // Salvar cada índice no localStorage
            if (resultado.data?.["IGP-M"]?.length > 0) {
              localStorage.setItem("indices_IGP-M", JSON.stringify(resultado.data["IGP-M"]))
            }
            if (resultado.data?.["IPCA"]?.length > 0) {
              localStorage.setItem("indices_IPCA", JSON.stringify(resultado.data["IPCA"]))
            }
            if (resultado.data?.["INPC"]?.length > 0) {
              localStorage.setItem("indices_INPC", JSON.stringify(resultado.data["INPC"]))
            }
            if (resultado.data?.["Poupança"]?.length > 0) {
              localStorage.setItem("indices_Poupança", JSON.stringify(resultado.data["Poupança"]))
            }
            if (resultado.data?.["SELIC"]?.length > 0) {
              localStorage.setItem("indices_SELIC", JSON.stringify(resultado.data["SELIC"]))
            }
            if (resultado.data?.["CDI"]?.length > 0) {
              localStorage.setItem("indices_CDI", JSON.stringify(resultado.data["CDI"]))
            }
            // Guardar timestamp da atualização
            localStorage.setItem("indices_atualizado_em", new Date().toISOString())
            console.log("✓ Dados salvos no cache local")
          } catch (e) {
            console.warn("Aviso: não foi possível salvar dados no cache", e)
          }
        }
        
        setMensagemAtualizacao(
          `✓ Sucesso! ${resultado.total || resultado.successCount || 0} índice(s) foram atualizados das fontes oficiais (Banco Central/FGV/IBGE).`,
        )
        toast({
          title: "Atualização Concluída",
          description: resultado.message || `${resultado.total} índices atualizados com sucesso`,
        })
        setTimeout(() => {
          setMensagemAtualizacao("")
        }, 8000)
      } else {
        const erro = await response.json()
        throw new Error(erro.message || "Erro ao atualizar índices")
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido"
      setMensagemAtualizacao(`✗ Erro: ${mensagem}. Usando dados locais como fallback.`)
      toast({
        variant: "destructive",
        title: "Erro na Atualização",
        description: mensagem,
      })
      setTimeout(() => {
        setMensagemAtualizacao("")
      }, 8000)
    } finally {
      setAtualizandoIndices(false)
    }
  }

  const isIGPM = formData.indice.includes("IGP-M")
  const isPoupanca = formData.indice.includes("Poupança")

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Cabeçalho compacto e institucional */}
        <div className="bg-white border-b border-gray-200 -mx-4 px-4 py-3 mb-8">
          <div className="max-w-6xl mx-auto flex items-center gap-6">
            {/* Logo à esquerda */}
            <div className="flex-shrink-0">
              <img 
                src="/images/secretaria-saude-sp.png" 
                alt="Secretaria da Saúde - São Paulo" 
                className="h-24 w-auto"
              />
            </div>
            
            {/* Título e descrição à direita */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-600" />
                Calculadora de Atualização Monetária
              </h1>
              <p className="text-sm text-gray-600 mt-1">CGOF - Correção Monetária, Juros, Multa e Honorários</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Sobre os Índices</h3>
          <p className="text-gray-600 mb-4">Dados oficiais do Banco Central, FGV e IBGE</p>
          <div className="text-sm text-gray-500 mb-4">
            <p>• Poupança: debit.com.br</p>
            <p>• IGP-M: Fundação Getúlio Vargas</p>
            <p>• CDI: Banco Central do Brasil</p>
            <p>• IPCA: IBGE</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/indices" className="w-full">
              <Button variant="outline" className="w-full gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100">
                <Database className="h-4 w-4" />
                Visualizar e Editar Índices
              </Button>
            </Link>
            
            <Button
              onClick={atualizarIndicesOficiais}
              disabled={atualizandoIndices}
              variant="outline"
              className="w-full sm:w-auto bg-transparent"
            >
              {atualizandoIndices ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Atualizando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Atualizar Índices dos Sites Oficiais
                </>
              )}
            </Button>

            {mensagemAtualizacao && (
              <Alert
                className={
                  mensagemAtualizacao.includes("sucesso")
                    ? "border-green-200 bg-green-50"
                    : mensagemAtualizacao.includes("Erro")
                      ? "border-red-200 bg-red-50"
                      : "border-blue-200 bg-blue-50"
                }
              >
                <AlertDescription
                  className={
                    mensagemAtualizacao.includes("sucesso")
                      ? "text-green-700"
                      : mensagemAtualizacao.includes("Erro")
                        ? "text-red-700"
                        : "text-blue-700"
                  }
                >
                  {mensagemAtualizacao}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
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
              <Label htmlFor="descricao" className="text-base font-semibold mb-2 block">
                Descrição do Cálculo
              </Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o cálculo que será realizado..."
                value={formData.descricao}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Separator className="my-6" />

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
                  <Label className="mb-2 block font-medium">Data Inicial</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={formData.dataInicial.dia}
                      onValueChange={(value) => handleInputChange("dataInicial.dia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {dias.map((dia) => (
                          <SelectItem key={dia} value={dia.toString()}>
                            {dia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={formData.dataInicial.mes}
                      onValueChange={(value) => handleInputChange("dataInicial.mes", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {meses.map((mes, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {mes}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={formData.dataInicial.ano}
                      onValueChange={(value) => handleInputChange("dataInicial.ano", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map((ano) => (
                          <SelectItem key={ano} value={ano.toString()}>
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block font-medium">Data Final</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={formData.dataFinal.dia}
                      onValueChange={(value) => handleInputChange("dataFinal.dia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {dias.map((dia) => (
                          <SelectItem key={dia} value={dia.toString()}>
                            {dia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={formData.dataFinal.mes}
                      onValueChange={(value) => handleInputChange("dataFinal.mes", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {meses.map((mes, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {mes}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={formData.dataFinal.ano}
                      onValueChange={(value) => handleInputChange("dataFinal.ano", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map((ano) => (
                          <SelectItem key={ano} value={ano.toString()}>
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Índice da Atualização</h3>
              <Select value={formData.indice} onValueChange={(value) => handleInputChange("indice", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o índice" />
                </SelectTrigger>
                <SelectContent>
                  {indicesDisponiveis.map((indice, index) => (
                    <SelectItem key={index} value={indice}>
                      {indice}
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
                    <span className="text-xs text-gray-500 ml-2">(Ex: 0,05 = 0,05% | 5 = 5%)</span>
                  </Label>
                  <Input
                    id="taxaJuros"
                    type="text"
                    placeholder="Digite o valor: 0,05 (para 0,05%) ou 5 (para 5%)"
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
                    value={formData.dataFinalJuros}
                    onChange={(e) => handleInputChange("dataFinalJuros", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">(*) Informar apenas se diferentes das datas acima.</p>
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

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Button onClick={executarCalculo} className="w-full sm:w-auto" size="lg">
                <Calculator className="mr-2 h-4 w-4" />
                Executar o Cálculo
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
                      R$ {(resultado.valorOriginal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Valor Atualizado</p>
                    <p className="text-2xl font-bold text-green-700">
                      R$ {(resultado.valorAtualizado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Valor Corrigido:</span>
                      <span className="font-medium">
                        R$ {(resultado.valorCorrigido ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Juros:</span>
                      <span className="font-medium">
                        R$ {(resultado.juros ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Multa:</span>
                      <span className="font-medium">
                        R$ {(resultado.multa ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Honorários:</span>
                      <span className="font-medium">
                        R$ {(resultado.honorarios ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">
                        R$ {(resultado.valorTotal ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* PARCELAMENTO                                                   */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <Separator className="mt-6" />

                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold mb-4">📋 Parcelamento (Opcional)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Divida o valor total em parcelas iguais. Digite o número de parcelas desejadas:
                  </p>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label htmlFor="numeroParcelas" className="text-sm font-medium mb-2 block">
                        Número de Parcelas
                      </Label>
                      <Input
                        id="numeroParcelas"
                        type="number"
                        min="1"
                        max="360"
                        placeholder="Ex: 12, 24, 36..."
                        value={formData.numeroParcelas || ""}
                        onChange={(e) => handleInputChange("numeroParcelas", e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (formData.numeroParcelas) {
                          executarCalculo()
                        }
                      }}
                      className="mb-0"
                    >
                      Calcular Parcelas
                    </Button>
                  </div>
                </div>

                {/* Exibir resultado do parcelamento */}
                {resultado.parcelamento && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-4 text-green-900">✅ Parcelamento Calculado</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-gray-600">Número de Parcelas</p>
                        <p className="text-2xl font-bold text-green-700">{resultado.parcelamento.numeroParcelas}×</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Valor de Cada Parcela</p>
                        <p className="text-2xl font-bold text-green-700">
                          R$ {resultado.parcelamento.valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="text-2xl font-bold text-green-700">
                          R$ {resultado.parcelamento.valorTotalParcelado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 p-3 bg-white rounded border border-green-100">
                      <p className="mb-2">
                        <strong>Observe:</strong> O valor de cada parcela é resultado da divisão do valor total por {resultado.parcelamento.numeroParcelas}.
                        Confira na Memória de Cálculo (abaixo) o cronograma completo.
                      </p>
                    </div>
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
                                    ? d.valorAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
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
                                      ? "R$ " + d.valorJurosMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
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
                                    ? "R$ " + d.valorTotalComJuros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                                    : d.valorAcumulado !== undefined
                                      ? "R$ " + d.valorAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
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
                          <FileText className="mr-2 h-4 w-4" />
                          Gerar PDF
                        </Button>
                        <Button onClick={imprimir} variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          Imprimir
                        </Button>
                      </div>
                    </div>

                    <div
                      id="memoria-calculo"
                      className="bg-gray-50 p-4 rounded-lg border font-mono text-sm whitespace-pre-line overflow-x-auto"
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
