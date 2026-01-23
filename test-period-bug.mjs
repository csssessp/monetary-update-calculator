// Teste da lógica de período do IGP-M
// Reproduzir o bug do período com apenas 11 meses

// Simulação da lógica atual
function testCurrentLogic() {
  const dataInicial = { dia: 1, mes: 1, ano: 2025 };
  const dataFinal = { dia: 23, mes: 12, ano: 2025 };
  
  let mesAtual = dataInicial.dia === 1 ? dataInicial.mes : dataInicial.mes + 1;
  let anoAtual = dataInicial.ano;
  
  if (mesAtual > 12) {
    mesAtual = 1;
    anoAtual++;
  }

  const meses = [];
  let iteracoes = 0;
  
  while (
    anoAtual < dataFinal.ano ||
    (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)
  ) {
    meses.push(`${mesAtual}/${anoAtual}`);
    mesAtual++;
    iteracoes++;
    
    if (mesAtual > 12) {
      mesAtual = 1;
      anoAtual++;
    }
    
    if (iteracoes > 15) break; // Proteção contra loop infinito
  }
  
  console.log('Lógica ATUAL:');
  console.log(`Período: ${dataInicial.mes}/${dataInicial.ano} a ${dataFinal.mes}/${dataFinal.ano}`);
  console.log(`Meses encontrados: ${meses.length}`);
  console.log(`Meses: ${meses.join(', ')}`);
  console.log();
}

// Teste com a lógica corrigida
function testCorrectedLogic() {
  const dataInicial = { dia: 1, mes: 1, ano: 2025 };
  const dataFinal = { dia: 23, mes: 12, ano: 2025 };
  
  // Começa do mês inicial (já que dia é 1)
  let mesAtual = dataInicial.mes;
  let anoAtual = dataInicial.ano;

  const meses = [];
  let iteracoes = 0;
  
  // Condição corrigida: incluir até o último mês do período
  while (
    anoAtual < dataFinal.ano ||
    (anoAtual === dataFinal.ano && mesAtual <= dataFinal.mes)
  ) {
    meses.push(`${mesAtual}/${anoAtual}`);
    mesAtual++;
    iteracoes++;
    
    if (mesAtual > 12) {
      mesAtual = 1;
      anoAtual++;
    }
    
    if (iteracoes > 15) break;
  }
  
  console.log('Lógica CORRIGIDA:');
  console.log(`Período: ${dataInicial.mes}/${dataInicial.ano} a ${dataFinal.mes}/${dataFinal.ano}`);
  console.log(`Meses encontrados: ${meses.length}`);
  console.log(`Meses: ${meses.join(', ')}`);
  console.log();
}

testCurrentLogic();
testCorrectedLogic();
