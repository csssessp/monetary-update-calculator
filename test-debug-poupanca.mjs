import fetch from "node-fetch";

async function testPoupanca() {
  console.log("Fetching Poupança data...");
  
  try {
    const response = await fetch("http://localhost:3000/api/proxy-bcb?serie=25");
    const data = await response.json();
    
    console.log(`Total records: ${data.length}`);
    
    // Show data for January 2025
    const jan2025 = data.filter(d => d.data.includes("/01/2025"));
    console.log(`\n== January 2025 Data (${jan2025.length} records) ==`);
    jan2025.slice(0, 5).forEach(d => {
      console.log(`  ${d.data}: ${d.valor}`);
    });
    
    // Show data for December 2024
    const dec2024 = data.filter(d => d.data.includes("/12/2024"));
    console.log(`\n== December 2024 Data (${dec2024.length} records) ==`);
    dec2024.slice(0, 5).forEach(d => {
      console.log(`  ${d.data}: ${d.valor}`);
    });
    
    // Test aggregation logic
    console.log("\n== Aggregated by month (first value) ==");
    const monthMap = new Map();
    for (const item of data) {
      const dateParts = item.data.split("/");
      const month = parseInt(dateParts[1]);
      const year = parseInt(dateParts[2]);
      const dateKey = `${month}-${year}`;
      
      if (!monthMap.has(dateKey)) {
        const valor = parseFloat(item.valor.replace(",", "."));
        if (year >= 1989 && month >= 1 && month <= 12 && !isNaN(valor) && valor > 0) {
          monthMap.set(dateKey, { mes: month, ano: year, valor });
        }
      }
    }
    
    const resultado = Array.from(monthMap.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });
    
    console.log(`Total aggregated: ${resultado.length}`);
    console.log(`First: ${resultado[0].ano}-${String(resultado[0].mes).padStart(2, '0')} = ${resultado[0].valor}`);
    console.log(`Last: ${resultado[resultado.length-1].ano}-${String(resultado[resultado.length-1].mes).padStart(2, '0')} = ${resultado[resultado.length-1].valor}`);
    
    // Show few recent months
    console.log("\nRecent months:");
    resultado.slice(-6).forEach(r => {
      console.log(`  ${r.ano}-${String(r.mes).padStart(2, '0')}: ${r.valor}`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testPoupanca();
