import fetch from "node-fetch";

async function testCalculation() {
  console.log("Testing calculation with updated indices...\n");
  
  // First, trigger index update
  const updateResponse = await fetch("http://localhost:3000/api/atualizar-indices", {
    method: "POST"
  });
  
  const updateResult = await updateResponse.json();
  console.log("Update response:", updateResult);
  
  // Now make a calculation request
  const calcPayload = {
    tipoCalculo: "corracao-monetaria",
    dataInicial: "01/01/2020",
    dataFinal: "01/01/2021",
    valor: 1000,
    indice: "Poupança"
  };
  
  console.log("\nCalculation payload:", calcPayload);
  
  const calcResponse = await fetch("http://localhost:3000/api/gerenciar-indices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(calcPayload)
  });
  
  const result = await calcResponse.json();
  console.log("\nCalculation result:", result);
}

testCalculation();
