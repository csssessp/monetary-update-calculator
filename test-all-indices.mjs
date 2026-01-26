import { indicesData } from './lib/indices-data.ts';

console.log("=== ANÁLISE COMPLETA DE TODOS OS ÍNDICES (2020-2026) ===\n");

const indices = ['IGP-M', 'Poupança', 'INPC'];

for (const indice of indices) {
  const data = indicesData[indice] || [];
  
  // Filter 2020-2026
  const filtered = data.filter(i => i.ano >= 2020 && i.ano <= 2026);
  
  if (filtered.length === 0) {
    console.log(`❌ ${indice}: Sem dados para 2020-2026\n`);
    continue;
  }
  
  console.log(`✅ ${indice.toUpperCase()}`);
  console.log(`   Período: ${filtered[0].ano}/${String(filtered[0].mes).padStart(2, '0')} até ${filtered[filtered.length - 1].ano}/${String(filtered[filtered.length - 1].mes).padStart(2, '0')}`);
  console.log(`   Total de meses: ${filtered.length}`);
  
  // Agrupar por ano
  const porAno = {};
  filtered.forEach(i => {
    if (!porAno[i.ano]) porAno[i.ano] = [];
    porAno[i.ano].push(i);
  });
  
  // Mostrar resumo por ano
  Object.keys(porAno).sort().forEach(ano => {
    const meses = porAno[ano].length;
    console.log(`     ${ano}: ${meses} meses`);
  });
  
  console.log('');
}

// Teste de cálculo para validação
console.log("=== TESTE DE CÁLCULO COM DIFERENTES ÍNDICES ===\n");

const valorOriginal = 1000;
console.log(`Valor original: R$ ${valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`Período: 01/02/2020 a 26/01/2026\n`);

for (const indice of indices) {
  const data = indicesData[indice] || [];
  
  // Pegar dados de Mar/2020 até Jan/2026
  const periodo = data.filter(i => 
    (i.ano === 2020 && i.mes >= 3) ||
    (i.ano === 2021) ||
    (i.ano === 2022) ||
    (i.ano === 2023) ||
    (i.ano === 2024) ||
    (i.ano === 2025) ||
    (i.ano === 2026 && i.mes <= 1)
  );
  
  if (periodo.length === 0) {
    console.log(`${indice}: Dados insuficientes\n`);
    continue;
  }
  
  let fatorAcum = 1;
  periodo.forEach(m => {
    fatorAcum *= (1 + m.valor / 100);
  });
  
  const valorCorrigido = valorOriginal * fatorAcum;
  const correcaoPercentual = (fatorAcum - 1) * 100;
  
  console.log(`${indice}:`);
  console.log(`  Meses: ${periodo.length}`);
  console.log(`  Fator acumulado: ${fatorAcum.toFixed(10)}`);
  console.log(`  Correção: ${correcaoPercentual.toFixed(6)}%`);
  console.log(`  Valor final: R$ ${valorCorrigido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`);
}

// Validação de consistência
console.log("=== VALIDAÇÃO DE DADOS ===\n");

for (const indice of indices) {
  const data = indicesData[indice] || [];
  const filtered = data.filter(i => i.ano >= 2020 && i.ano <= 2026);
  
  if (filtered.length === 0) continue;
  
  let alertas = [];
  
  // Verificar valores realistas
  filtered.forEach(m => {
    if (m.valor > 20 || m.valor < -10) {
      alertas.push(`  ⚠️  ${m.ano}/${m.mes}: ${m.valor}% (valor fora do intervalo esperado)`);
    }
  });
  
  if (alertas.length === 0) {
    console.log(`✅ ${indice}: Todos os valores estão dentro do intervalo esperado`);
  } else {
    console.log(`⚠️  ${indice}:`);
    alertas.forEach(a => console.log(a));
  }
}
