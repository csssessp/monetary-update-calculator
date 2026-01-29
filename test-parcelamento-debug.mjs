// Simulando o cálculo
const valorParcelamentoComIGPM = 436.762458; // Valor corrigido de Poupança
const numeroParcelas = 24;
const igpmCiclo1 = -0.0100; // Ciclo 1: -0.0100%

// Calcular valor de parcela base
const valorParcelaBase = valorParcelamentoComIGPM / numeroParcelas;
console.log('Valor Parcela Base:', valorParcelaBase.toFixed(10));

// Array para armazenar parcelas exatas
let parcelasExatas = [];
let reajusteAcumuladoAtual = 1.0;

// Simular ciclo 1
for (let i = 1; i <= 12; i++) {
  const valorParcelaExato = valorParcelaBase * reajusteAcumuladoAtual;
  parcelasExatas.push(valorParcelaExato);
  console.log(`Parcela ${i}: ${valorParcelaExato.toFixed(10)} -> formatada: ${valorParcelaExato.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

// Simular mudança de ciclo
console.log('\n=== Mudando para Ciclo 2 ===');
const fatorReajuste = 1 + igpmCiclo1 / 100;
console.log('Fator de reajuste:', fatorReajuste.toFixed(10));
reajusteAcumuladoAtual *= fatorReajuste;
console.log('Reajuste acumulado após ciclo 2:', reajusteAcumuladoAtual.toFixed(10));

// Simular ciclo 2
for (let i = 13; i <= 24; i++) {
  const valorParcelaExato = valorParcelaBase * reajusteAcumuladoAtual;
  parcelasExatas.push(valorParcelaExato);
  console.log(`Parcela ${i}: ${valorParcelaExato.toFixed(10)} -> formatada: ${valorParcelaExato.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

// Somar valores exatos
const somaExata = parcelasExatas.reduce((acc, val) => acc + val, 0);
console.log('\n=== RESULTADO ===');
console.log('Soma exata:', somaExata.toFixed(10));
console.log('Soma formatada:', somaExata.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// Verificar a diferença
console.log('\nDiferença (deveria ser zero):');
console.log(valorParcelamentoComIGPM - somaExata);
