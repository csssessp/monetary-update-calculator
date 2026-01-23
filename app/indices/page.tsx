"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Save, X, Loader2, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { obterIndicesAtualizados, type IndiceData } from "@/lib/indices-data" // Importar obterIndicesAtualizados
import Link from "next/link"

interface Indice extends IndiceData {
  name: string
}

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
const anos = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).reverse()

// Lista de nomes de índices padrão para o Select - apenas Poupança e IGP-M
const nomesIndicesPadrao = ["IGP-M", "Poupança"]

export default function IndicesPage() {
  const [indices, setIndices] = useState<Indice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentIndice, setCurrentIndice] = useState<Indice | null>(null)
  const [formName, setFormName] = useState("")
  const [formMonth, setFormMonth] = useState("")
  const [formYear, setFormYear] = useState("")
  const [formValue, setFormValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [atualizando, setAtualizando] = useState(false)

  const fetchIndices = async () => {
    setLoading(true)
    try {
      const allIndices: Indice[] = []
      for (const name of nomesIndicesPadrao) {
        // Chamar obterIndicesAtualizados para cada nome de índice
        const dataForName = await obterIndicesAtualizados(name)
        dataForName.forEach((item) => {
          allIndices.push({
            name,
            month: item.mes,
            year: item.ano,
            value: item.valor,
            mes: item.mes,
            ano: item.ano,
            valor: item.valor,
          })
        })
      }
      setIndices(
        allIndices.sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name)
          if (a.year !== b.year) return a.year - b.year
          return a.month - b.month
        }),
      )
    } catch (error) {
      toast.error("Erro ao carregar índices: " + (error instanceof Error ? error.message : "Erro desconhecido"))
      console.error("Erro ao carregar índices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIndices()
  }, [])

  // Atualizar índices dos sites oficiais
  const handleAtualizarDosBCB = async () => {
    setAtualizando(true)
    try {
      // Usar o endpoint de atualização completo que sincroniza com todas as fontes
      const response = await fetch("/api/atualizar-indices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        toast.error("Não foi possível conectar aos servidores de atualização")
        setAtualizando(false)
        return
      }

      const resultado = await response.json()

      // Se a resposta contém .data, use-a; caso contrário, tente a estrutura alternativa
      const novosDados = resultado.data || resultado

      // Converter dados para formato esperado
      const allIndices: Indice[] = []
      for (const [name, items] of Object.entries(novosDados)) {
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            if ((item.mes || item.month) && (item.ano || item.year) && (item.valor || item.value) !== undefined) {
              allIndices.push({
                name,
                month: item.mes || item.month,
                year: item.ano || item.year,
                value: item.valor || item.value,
                mes: item.mes,
                ano: item.ano,
                valor: item.valor,
              })
            }
          })
        }
      }

      setIndices(
        allIndices.sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name)
          if (a.year !== b.year) return a.year - b.year
          return a.month - b.month
        }),
      )

      toast.success(`Índices atualizados com sucesso! ${resultado.successCount || resultado.total || 0} fonte(s) sincronizadas`)
    } catch (error) {
      console.error("Erro ao atualizar índices:", error)
      toast.error("Erro ao conectar com os servidores de atualização")
    } finally {
      setAtualizando(false)
    }
  }

  const handleOpenDialog = (indice?: Indice) => {
    console.log("Indice recebido por handleOpenDialog:", indice) // Para depuração
    if (indice) {
      // Adiciona verificações defensivas antes de chamar toString()
      const month = indice.month
      const year = indice.year
      const value = indice.value

      if (typeof month !== "number" || !Number.isFinite(month) || month < 1 || month > 12) {
        console.error("Mês inválido no índice:", indice)
        toast.error("Dados do índice inválidos (mês).")
        return
      }
      if (typeof year !== "number" || !Number.isFinite(year)) {
        // Ano pode ser qualquer número finito
        console.error("Ano inválido no índice:", indice)
        toast.error("Dados do índice inválidos (ano).")
        return
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        console.error("Valor inválido no índice:", indice)
        toast.error("Dados do índice inválidos (valor).")
        return
      }

      setCurrentIndice(indice)
      setFormName(indice.name)
      setFormMonth(month.toString())
      setFormYear(year.toString())
      setFormValue(value.toString().replace(".", ","))
    } else {
      setCurrentIndice(null)
      setFormName("")
      setFormMonth("")
      setFormYear("")
      setFormValue("")
    }
    setDialogOpen(true)
  }

  const handleSaveIndice = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formName,
        month: Number.parseInt(formMonth, 10),
        year: Number.parseInt(formYear, 10),
        value: Number.parseFloat(formValue.replace(",", ".")),
      }

      if (!payload.name || isNaN(payload.month) || isNaN(payload.year) || isNaN(payload.value)) {
        toast.error("Por favor, preencha todos os campos corretamente.")
        setSaving(false) // Ensure saving state is reset on validation error
        return
      }

      const res = await fetch("/api/indices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        toast.success("Índice salvo com sucesso!")
        setDialogOpen(false)
        fetchIndices() // Recarrega a lista
      } else {
        toast.error("Erro ao salvar índice: " + data.error)
      }
    } catch (error) {
      toast.error("Erro de rede ao salvar índice.")
      console.error("Erro ao salvar índice:", error)
    } finally {
      setSaving(false)
    }
  }

  // TODO: Implementar funcionalidade de exclusão se necessário
  // const handleDeleteIndice = async (indice: Indice) => {
  //   if (!confirm(`Tem certeza que deseja excluir o índice ${indice.name} de ${indice.month}/${indice.year}?`)) return;
  //   try {
  //     const res = await fetch('/api/indices', {
  //       method: 'DELETE',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ name: indice.name, month: indice.month, year: indice.year }),
  //     });
  //     const data = await res.json();
  //     if (data.success) {
  //       toast.success('Índice excluído com sucesso!');
  //       fetchIndices();
  //     } else {
  //       toast.error('Erro ao excluir índice: ' + data.error);
  //     }
  //   } catch (error) {
  //     toast.error('Erro de rede ao excluir índice.');
  //     console.error('Erro ao excluir índice:', error);
  //   }
  // };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <Link href="/" passHref>
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Calculadora
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gerenciar Índices</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleAtualizarDosBCB} disabled={atualizando} variant="outline" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${atualizando ? "animate-spin" : ""}`} />
                {atualizando ? "Atualizando..." : "Atualizar do BCB"}
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Dados Oficiais:</strong> Os índices são sincronizados com o Banco Central do Brasil (BCB). 
                Você pode editar manualmente se detectar discrepâncias. Clique em "Atualizar do BCB" para sincronizar com os dados oficiais mais recentes.
              </AlertDescription>
            </Alert>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-600">Carregando índices...</span>
              </div>
            ) : indices.length === 0 ? (
              <p className="text-center text-gray-600">Nenhum índice encontrado. Adicione um novo!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Índice</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead className="text-right">Valor (%)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indices.map((indice, index) => (
                      <TableRow key={`${indice.name}-${indice.year}-${indice.month}`}>
                        {/* Simplified key */}
                        <TableCell className="font-medium">{indice.name}</TableCell>
                        <TableCell>
                          {/* Adiciona verificação defensiva para o mês */}
                          {typeof indice.month === "number" && indice.month >= 1 && indice.month <= 12
                            ? meses[indice.month - 1]
                            : "Inválido"}
                          /{indice.year}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Adiciona verificação para garantir que indice.value é um número finito */}
                          {typeof indice.value === "number" && Number.isFinite(indice.value)
                            ? indice.value.toLocaleString("pt-BR", { minimumFractionDigits: 4 })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(indice)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* <Button variant="ghost" size="sm" onClick={() => handleDeleteIndice(indice)}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button> */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentIndice ? "Editar Índice" : "Adicionar Novo Índice"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Select value={formName} onValueChange={setFormName} disabled={!!currentIndice}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o índice" />
                </SelectTrigger>
                <SelectContent>
                  {nomesIndicesPadrao.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="month" className="text-right">
                Mês
              </Label>
              <Select value={formMonth} onValueChange={setFormMonth} disabled={!!currentIndice}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Ano
              </Label>
              <Select value={formYear} onValueChange={setFormYear} disabled={!!currentIndice}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o ano" />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Valor (%)
              </Label>
              <Input
                id="value"
                type="text" // Use text to allow comma for decimal
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className="col-span-3"
                placeholder="0,0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleSaveIndice} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
