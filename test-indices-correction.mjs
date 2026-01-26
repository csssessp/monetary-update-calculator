import { indicesData } from './lib/indices-data.ts';

// Test the corrected IGP-M indices for 2020-2022
console.log("=== VERIFICAÇÃO DOS ÍNDICES IGP-M CORRIGIDOS ===\n");

const igpmIndices = indicesData["IGP-M"];

// 2020
console.log("2020:");
const indices2020 = igpmIndices.filter(i => i.ano === 2020);
indices2020.forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

// 2021
console.log("\n2021:");
const indices2021 = igpmIndices.filter(i => i.ano === 2021);
indices2021.forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

// 2022
console.log("\n2022:");
const indices2022 = igpmIndices.filter(i => i.ano === 2022);
indices2022.forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

// Calculate accumulated IGP-M for a test period (Jan 2020 - Dec 2022)
console.log("\n=== CÁLCULO DO IGP-M ACUMULADO (MAR/2020 A DEZ/2022) ===\n");

const testeIndices = igpmIndices.filter(i => 
  (i.ano === 2020 && i.mes >= 3) || 
  (i.ano === 2021) || 
  (i.ano === 2022)
);

console.log("Período: Mar/2020 a Dez/2022\n");

let fatorAcum = 1;
let linha = 1;

console.log("| # | Período | Taxa (%) | Fator Mensal | Acumulado |");
console.log("|---|---------|----------|--------------|-----------|");

testeIndices.forEach((indice) => {
  const fatorMensal = 1 + indice.valor / 100;
  fatorAcum *= fatorMensal;
  const mesNome = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ][indice.mes - 1];
  
  console.log(
    `| ${String(linha).padStart(2, " ")} | ${mesNome}/${indice.ano} | ${indice.valor.toFixed(4).padStart(8, " ")} | ${fatorMensal.toFixed(10)} | ${((fatorAcum - 1) * 100).toFixed(6).padStart(9, " ")} |`
  );
  linha++;
});

console.log("\n=== RESUMO DO CÁLCULO ===");
console.log(`Total de meses: ${testeIndices.length}`);
console.log(`Fator de correção acumulado: ${fatorAcum.toFixed(10)}`);
console.log(`Correção acumulada (%): ${((fatorAcum - 1) * 100).toFixed(6)}%`);
console.log(`Valor original (exemplo): R$ 1.000,00`);
console.log(`Valor corrigido: R$ ${(1000 * fatorAcum).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
