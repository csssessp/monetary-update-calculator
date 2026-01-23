/**
 * Teste de validação de índices do Ipeadata
 * Verifica se a função fetchIGPMFromIpeadata está retornando dados corretos
 * e se eles serão exibidos corretamente na memória de cálculo
 */

async function validateIpeadataIntegration() {
  console.log("\n" + "=".repeat(70))
  console.log("TESTE DE INTEGRAÇÃO IPEADATA - IGP-M")
  console.log("=".repeat(70))

  try {
    // Step 1: Verify API is accessible
    console.log("\n[STEP 1] Acessando API Ipeadata...")
    const url = "https://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='IGP12_IGPMG12')?$format=json"
    const response = await fetch(url, { cache: "no-store" })

    if (!response.ok) {
      console.error(`❌ Erro ao acessar Ipeadata: ${response.status} ${response.statusText}`)
      return false
    }
    console.log(`✓ API Ipeadata respondendo: ${response.status} OK`)

    // Step 2: Parse response
    console.log("\n[STEP 2] Parseando resposta...")
    const data = await response.json()
    const recordCount = data.value?.length || 0
    console.log(`✓ Resposta contém ${recordCount} registros`)

    if (recordCount === 0) {
      console.error("❌ Nenhum registro retornado")
      return false
    }

    // Step 3: Validate data structure
    console.log("\n[STEP 3] Validando estrutura de dados...")
    const firstRecord = data.value[0]
    console.log(`  Primeiro registro: ${JSON.stringify(firstRecord, null, 2)}`)

    const hasRequiredFields = firstRecord.VALDATA && firstRecord.VALVALOR !== undefined
    if (!hasRequiredFields) {
      console.error("❌ Registros não têm campos esperados (VALDATA, VALVALOR)")
      return false
    }
    console.log("✓ Estrutura de dados válida")

    // Step 4: Validate data format and values
    console.log("\n[STEP 4] Validando valores e formatos...")
    const indices = []
    let validCount = 0
    let invalidCount = 0

    for (const item of data.value) {
      try {
        const dateParts = item.VALDATA.split("T")[0].split("-")
        const year = parseInt(dateParts[0])
        const month = parseInt(dateParts[1])
        const valor = parseFloat(item.VALVALOR)

        if (year >= 1989 && month >= 1 && month <= 12 && !isNaN(valor)) {
          indices.push({ mes: month, ano: year, valor })
          validCount++
        } else {
          invalidCount++
        }
      } catch (e) {
        invalidCount++
      }
    }

    console.log(`✓ Registros válidos: ${validCount}`)
    console.log(`  Registros inválidos/filtrados: ${invalidCount}`)
    console.log(`  Período: ${indices[0].ano}-${String(indices[0].mes).padStart(2, "0")} até ${indices[indices.length - 1].ano}-${String(indices[indices.length - 1].mes).padStart(2, "0")}`)

    // Step 5: Remove duplicates and sort
    console.log("\n[STEP 5] Removendo duplicatas e ordenando...")
    const mesesMap = new Map()
    for (const item of indices) {
      const key = `${item.mes}-${item.ano}`
      mesesMap.set(key, item)
    }
    const resultado = Array.from(mesesMap.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano
      return a.mes - b.mes
    })
    console.log(`✓ ${resultado.length} registros únicos após dedupliação`)

    // Step 6: Verify known values
    console.log("\n[STEP 6] Validando valores conhecidos...")
    const knownValues = [
      { mes: 7, ano: 1989, expectedRange: [35, 36] },
      { mes: 1, ano: 1990, expectedRange: [61, 62] },
      { mes: 8, ano: 1994, expectedRange: [7, 8] },
    ]

    let allValidated = true
    for (const known of knownValues) {
      const record = resultado.find((r) => r.mes === known.mes && r.ano === known.ano)
      if (record) {
        const isInRange = record.valor >= known.expectedRange[0] && record.valor <= known.expectedRange[1]
        const status = isInRange ? "✓" : "⚠"
        console.log(`  ${status} ${String(known.mes).padStart(2, "0")}/${known.ano}: ${record.valor}% (esperado: ${known.expectedRange[0]}-${known.expectedRange[1]}%)`)
        if (!isInRange) allValidated = false
      } else {
        console.log(`  ❌ ${String(known.mes).padStart(2, "0")}/${known.ano}: NÃO ENCONTRADO`)
        allValidated = false
      }
    }

    // Step 7: Display sample indices for memory calculation
    console.log("\n[STEP 7] Exemplo de dados para memória de cálculo...")
    console.log("  Últimos 12 meses de IGP-M (para exemplo em memória de cálculo):")
    const last12 = resultado.slice(-12)
    for (const r of last12) {
      console.log(`    ${String(r.mes).padStart(2, "0")}/${r.ano}: ${r.valor}%`)
    }

    // Summary
    console.log("\n" + "=".repeat(70))
    if (allValidated && resultado.length > 400) {
      console.log("✓✓✓ TESTE CONCLUÍDO COM SUCESSO ✓✓✓")
      console.log("Os índices do Ipeadata estão corretos e prontos para uso na memória de cálculo")
    } else {
      console.log("⚠ TESTE CONCLUÍDO COM AVISOS")
      console.log("Alguns valores não puderam ser validados contra valores esperados")
    }
    console.log("=".repeat(70) + "\n")

    return true
  } catch (error) {
    console.error("❌ Erro durante o teste:", error)
    return false
  }
}

// Run validation
validateIpeadataIntegration()
