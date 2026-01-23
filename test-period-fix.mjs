// Teste direto do cálculo com TypeScript/Node
// Precisamos testar se a função obterIndicesPeriodo está retornando 12 meses

// Simular a função de cálculo com dados do IGP-M
const igpmData = [
  { mes: 1, ano: 2025, valor: 0.28 },
  { mes: 2, ano: 2025, valor: 0.46 },
  { mes: 3, ano: 2025, valor: 0.47 },
  { mes: 4, ano: 2025, valor: 0.65 },
  { mes: 5, ano: 2025, valor: 0.51 },
  { mes: 6, ano: 2025, valor: 0.56 },
  { mes: 7, ano: 2025, valor: 0.66 },
  { mes: 8, ano: 2025, valor: 0.51 },
  { mes: 9, ano: 2025, valor: 0.73 },
  { mes: 10, ano: 2025, valor: 0.55 },
  { mes: 11, ano: 2025, valor: 0.41 },
  { mes: 12, ano: 2025, valor: 0.48 },
];

// Simulação da função corrigida
function obterIndicesPeriodoCorrigido(dataInicial, dataFinal) {
  const indicesPeriodo = [];
  
  // NOVA LÓGICA: Sempre começar do mês inicial
  let mesAtual = dataInicial.mes;
  let anoAtual = dataInicial.ano;

  while (
    anoAtual < dataFinal.ano ||
    (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)
  ) {
    const indiceDoMes = igpmData.find((i) => i.mes === mesAtual && i.ano === anoAtual);
    if (indiceDoMes) indicesPeriodo.push(indiceDoMes);
    mesAtual++;
    if (mesAtual > 12) {
      mesAtual = 1;
      anoAtual++;
    }
  }
  
  return indicesPeriodo;
}

// Simular cenário: Data de referência = 23/01/2026
// Período IGP-M deveria ser: 01/01/2025 a 31/12/2025 (12 meses)

const dataInicial = { dia: 1, mes: 1, ano: 2025 };
const dataFinal = { dia: 31, mes: 12, ano: 2025 };

console.log("=== TESTE DO CÁLCULO DE PERÍODO IGP-M ===\n");
console.log(`Data Inicial: ${dataInicial.dia}/${dataInicial.mes}/${dataInicial.ano}`);
console.log(`Data Final: ${dataFinal.dia}/${dataFinal.mes}/${dataFinal.ano}`);
console.log();

const indices = obterIndicesPeriodoCorrigido(dataInicial, dataFinal);

console.log(`✅ Meses encontrados: ${indices.length}`);
if (indices.length === 12) {
  console.log("✅ SUCESSO: Exatamente 12 meses!");
} else {
  console.log(`❌ ERRO: Esperava 12 meses, mas encontrou ${indices.length}`);
}

console.log("\nDetalhamento dos meses:");
indices.forEach((ind, idx) => {
  const mesNome = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ][ind.mes - 1];
  console.log(`  ${idx + 1}. ${mesNome}/${ind.ano}: ${ind.valor}%`);
});

// Calcular acumulado
console.log("\n=== CÁLCULO DO ACUMULADO ===");
let fatorAcumulado = 1;
indices.forEach((ind) => {
  const fatorMensal = 1 + ind.valor / 100;
  fatorAcumulado *= fatorMensal;
});
const igpmAcumulado = (fatorAcumulado - 1) * 100;
console.log(`IGP-M Acumulado: ${igpmAcumulado.toFixed(4)}%`);

// Aplicar em valor de exemplo
const valorOriginal = 100000;
const valorAjustado = valorOriginal * fatorAcumulado;
console.log(`\nValor Original: R$ ${valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
console.log(`Valor Ajustado (com IGP-M): R$ ${valorAjustado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
