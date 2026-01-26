#!/usr/bin/env node

/**
 * Script de teste para validar atualização de índices de Poupança
 * Testa se os índices estão sendo obtidos corretamente do BCB
 */

const BASE_URL = "http://localhost:3000"

async function testPoupancaUpdate() {
  console.log("\n" + "=".repeat(80))
  console.log("TESTE DE ATUALIZAÇÃO DE ÍNDICES DE POUPANÇA")
  console.log("=".repeat(80))

  try {
    // 1. Chamar a API de proxy do BCB para Poupança (série 25)
    console.log("\n[ETAPA 1] Buscando dados de Poupança do BCB (série 25)...")
    const urlPoupanca = `${BASE_URL}/api/proxy-bcb?serie=25`
    console.log(`URL: ${urlPoupanca}`)

    const responsePoupanca = await fetch(urlPoupanca)
    if (!responsePoupanca.ok) {
      console.error(`❌ Erro: Status ${responsePoupanca.status}`)
      return
    }

    const dataPoupanca = await responsePoupanca.json()
    console.log(`✓ Recebidos ${Array.isArray(dataPoupanca) ? dataPoupanca.length : "?"} registros`)

    if (Array.isArray(dataPoupanca) && dataPoupanca.length > 0) {
      console.log(`✓ Primeiros registros:`)
      dataPoupanca.slice(0, 5).forEach(item => {
        console.log(`  - ${item.data}: ${item.valor}`)
      })
      console.log(`✓ Últimos registros:`)
      dataPoupanca.slice(-5).forEach(item => {
        console.log(`  - ${item.data}: ${item.valor}`)
      })
    }

    // 2. Chamar a API de atualização de índices
    console.log("\n[ETAPA 2] Chamando POST /api/atualizar-indices...")
    const responseUpdate = await fetch(`${BASE_URL}/api/atualizar-indices`, {
      method: "POST",
    })

    if (!responseUpdate.ok) {
      console.error(`❌ Erro: Status ${responseUpdate.status}`)
      return
    }

    const dataUpdate = await responseUpdate.json()
    console.log(`\n✓ Resposta da API:`)
    console.log(`  - Sucesso: ${dataUpdate.success}`)
    console.log(`  - Total atualizado: ${dataUpdate.total}`)
    console.log(`  - Timestamp: ${dataUpdate.timestamp}`)
    console.log(`  - Mensagem: ${dataUpdate.message}`)

    if (dataUpdate.data) {
      console.log(`\n✓ Dados retornados:`)
      if (dataUpdate.data["IGP-M"] && dataUpdate.data["IGP-M"].length > 0) {
        console.log(`  - IGP-M: ${dataUpdate.data["IGP-M"].length} registros`)
        console.log(`    Última atualização: ${dataUpdate.data["IGP-M"][dataUpdate.data["IGP-M"].length - 1].mes}/${dataUpdate.data["IGP-M"][dataUpdate.data["IGP-M"].length - 1].ano}`)
      }
      if (dataUpdate.data["Poupança"] && dataUpdate.data["Poupança"].length > 0) {
        console.log(`  - Poupança: ${dataUpdate.data["Poupança"].length} registros`)
        console.log(`    Última atualização: ${dataUpdate.data["Poupança"][dataUpdate.data["Poupança"].length - 1].mes}/${dataUpdate.data["Poupança"][dataUpdate.data["Poupança"].length - 1].ano}`)
      }
    }

    // 3. Validar que os valores estão corretos
    console.log("\n[ETAPA 3] Validando valores de Poupança...")
    if (dataUpdate.data && dataUpdate.data["Poupança"]) {
      const poupanca = dataUpdate.data["Poupança"]
      
      // Verificar se há dados recentes
      const recentData = poupanca.filter(item => item.ano >= 2024)
      console.log(`✓ Registros de 2024+: ${recentData.length}`)
      
      if (recentData.length > 0) {
        console.log(`✓ Últimos 5 valores:`)
        recentData.slice(-5).forEach(item => {
          console.log(`  - ${item.mes}/${item.ano}: ${item.valor.toFixed(4)}%`)
        })
      }

      // Validar que todos os valores são positivos
      const invalidos = poupanca.filter(item => item.valor <= 0)
      if (invalidos.length > 0) {
        console.error(`❌ Encontrados ${invalidos.length} valores inválidos (≤ 0)`)
      } else {
        console.log(`✓ Todos os valores de Poupança são válidos (> 0)`)
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("✅ TESTE CONCLUÍDO COM SUCESSO")
    console.log("=".repeat(80) + "\n")

  } catch (error) {
    console.error("\n❌ ERRO:", error)
    process.exit(1)
  }
}

// Verificar se servidor está rodando
async function checkServer() {
  try {
    const response = await fetch(BASE_URL)
    return response.ok
  } catch {
    return false
  }
}

// Executar teste
(async () => {
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.error(`❌ Servidor não está rodando em ${BASE_URL}`)
    console.error("Execute: npm run dev")
    process.exit(1)
  }

  await testPoupancaUpdate()
})()
