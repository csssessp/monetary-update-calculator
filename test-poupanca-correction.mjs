import { indicesData } from './lib/indices-data.ts';

// Test the corrected savings index for 2020-2026
console.log("=== VERIFICAÇÃO DOS ÍNDICES DE POUPANÇA CORRIGIDOS ===\n");

const poupancaIndices = indicesData["Poupança"];

// Get indices for the period 10/2/2020 to 26/1/2026
console.log("Período do cálculo: 10/2/2020 a 26/1/2026\n");

// Since the calculation starts from the next month (from Feb 2020 onwards)
const testIndices = poupancaIndices.filter(i => {
  if (i.ano < 2020) return false;
  if (i.ano === 2020 && i.mes < 3) return false; // starts Mar/2020
  if (i.ano > 2026) return false;
  if (i.ano === 2026 && i.mes > 1) return false; // up to Jan/2026
  return true;
});

console.log(`Total de meses com dados de Poupança: ${testIndices.length}\n`);

console.log("2020:");
poupancaIndices.filter(i => i.ano === 2020).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

console.log("\n2021:");
poupancaIndices.filter(i => i.ano === 2021).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

console.log("\n2022:");
poupancaIndices.filter(i => i.ano === 2022).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

console.log("\n2023:");
poupancaIndices.filter(i => i.ano === 2023).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

console.log("\n2024:");
poupancaIndices.filter(i => i.ano === 2024).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

console.log("\n2025:");
poupancaIndices.filter(i => i.ano === 2025).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

console.log("\n2026:");
poupancaIndices.filter(i => i.ano === 2026).forEach(i => {
  console.log(`  Mês ${i.mes}: ${i.valor}%`);
});

// Calculate accumulated savings for the test period
console.log("\n=== CÁLCULO DO FATOR DE CORREÇÃO ACUMULADO (MAR/2020 A JAN/2026) ===\n");

let fatorAcum = 1;
let linha = 1;

console.log("| # | Período | Taxa (%) | Fator Mensal | Acumulado |");
console.log("|---|---------|----------|--------------|-----------|");

testIndices.forEach((indice) => {
  const fatorMensal = 1 + indice.valor / 100;
  fatorAcum *= fatorMensal;
  const mesNome = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ][indice.mes - 1];
  
  const percentualFormatado = indice.valor.toFixed(4).padStart(8, " ");
  const acumuladoFormatado = ((fatorAcum - 1) * 100).toFixed(6).padStart(9, " ");
  
  console.log(
    `| ${String(linha).padStart(2, " ")} | ${mesNome}/${indice.ano} | ${percentualFormatado} | ${fatorMensal.toFixed(10)} | ${acumuladoFormatado} |`
  );
  linha++;
});

console.log("\n=== RESUMO DO CÁLCULO ===");
console.log(`Total de meses: ${testIndices.length}`);
console.log(`Fator de correção acumulado: ${fatorAcum.toFixed(10)}`);
console.log(`Correção acumulada (%): ${((fatorAcum - 1) * 100).toFixed(6)}%`);

const valorOriginal = 296556.65;
const valorCorrigido = valorOriginal * fatorAcum;

console.log(`\nValor original: R$ ${valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
console.log(`Valor corrigido: R$ ${valorCorrigido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
console.log(`Correção em reais: R$ ${(valorCorrigido - valorOriginal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
