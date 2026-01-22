// Script para testar cálculo de IGP-M com reajuste a cada 12 meses
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testIGPMCalculation() {
  try {
    const calcParams = {
      valorOriginal: 1000,
      dataInicial: {
        dia: 1,
        mes: 1,
        ano: 2020
      },
      dataFinal: {
        dia: 31,
        mes: 12,
        ano: 2021
      },
      indice: "IGP-M",
      correcaoProRata: false
    };

    console.log("\n=== TESTANDO CÁLCULO DE IGP-M COM REAJUSTE ===\n");
    console.log("Parâmetros do teste:");
    console.log(JSON.stringify(calcParams, null, 2));
    console.log("\n");

    // Nota: Este é um exemplo de como a API deveria ser chamada
    // Se houver um endpoint de cálculo, usar assim:
    // const response = await fetch('http://localhost:3000/api/calcular', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(calcParams)
    // });
    
    console.log("Teste criado. Para executar o cálculo, use a interface web em http://localhost:3000");
    console.log("\nParâmetros para testar:");
    console.log("- Valor: R$ 1.000,00");
    console.log("- Data inicial: 01/01/2020");
    console.log("- Data final: 31/12/2021");
    console.log("- Índice: IGP-M");
    console.log("\nEsperado:");
    console.log("- Primeiro ciclo (jan/2020 a dez/2020): aplicar índices normais");
    console.log("- Segundo ciclo (jan/2021 a dez/2021): reajuste IGP-M acumulado + valores fixos");
    console.log("- A memória de cálculo deve mostrar a fórmula: (1+m1)×(1+m2)×...×(1+m12)−1");
    
  } catch (error) {
    console.error("Erro:", error.message);
  }
}

testIGPMCalculation();
