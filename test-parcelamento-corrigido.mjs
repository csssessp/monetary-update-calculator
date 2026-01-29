// Simulando o cálculo CORRIGIDO
const valorParcelamentoComIGPM = 436.762458; // Valor corrigido de Poupança
const numeroParcelas = 24;
const igpmCiclo1 = -0.0100; // Ciclo 1: -0.0100%

let parcelasExatas = [];
let valorAtualPorCiclo = valorParcelamentoComIGPM;

console.log('Valor inicial:', valorParcelamentoComIGPM.toFixed(10));

for (let i = 1; i <= numeroParcelas; i++) {
  const numeroCiclo = Math.ceil(i / 12);
  const posicaoNoCiclo = ((i - 1) % 12) + 1;
  
  // Se mudou de ciclo, aplicar reajuste
  if (posicaoNoCiclo === 1 && i > 1) {
    const fatorReajuste = 1 + igpmCiclo1 / 100;
    valorAtualPorCiclo *= fatorReajuste;
    console.log(`\n>>> Mudando para Ciclo ${numeroCiclo}, aplicando fator ${fatorReajuste.toFixed(10)}`);
    console.log(`    Novo valor total do ciclo: ${valorAtualPorCiclo.toFixed(10)}`);
  }
  
  const valorParcelaExato = valorAtualPorCiclo / numeroParcelas;
  parcelasExatas.push(valorParcelaExato);
  
  if (i <= 2 || i === 12 || i === 13 || i === 24) {
    console.log(`Parcela ${i} (ciclo ${numeroCiclo}): ${valorParcelaExato.toFixed(10)} -> ${valorParcelaExato.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
}

const somaExata = parcelasExatas.reduce((acc, val) => acc + val, 0);
console.log('\n=== RESULTADO ===');
console.log('Soma exata:', somaExata.toFixed(10));
console.log('Soma formatada:', somaExata.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
console.log('\nDiferença (deveria ser ≈ zero):', (valorParcelamentoComIGPM - somaExata).toFixed(10));
