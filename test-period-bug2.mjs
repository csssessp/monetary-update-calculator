// Teste com data de hoje: 23/01/2026
const dataParcelamento = { dia: 23, mes: 1, ano: 2026 };

// Calcular período IGP-M (12 meses ANTES)
let mesAtual = dataParcelamento.mes;
let anoAtual = dataParcelamento.ano;

let mesIGPMInicio = mesAtual - 12;  // 1 - 12 = -11
let anoIGPMInicio = anoAtual;

while (mesIGPMInicio <= 0) {
  mesIGPMInicio += 12;  // -11 + 12 = 1
  anoIGPMInicio -= 1;   // 2026 - 1 = 2025
}

console.log(`mesIGPMInicio: ${mesIGPMInicio}, anoIGPMInicio: ${anoIGPMInicio}`);

// Data de fim: 11 meses depois
let mesIGPMFim = mesIGPMInicio + 11;  // 1 + 11 = 12
let anoIGPMFim = anoIGPMInicio;

while (mesIGPMFim > 12) {
  mesIGPMFim -= 12;
  anoIGPMFim += 1;
}

console.log(`mesIGPMFim: ${mesIGPMFim}, anoIGPMFim: ${anoIGPMFim}`);
console.log(`Período IGP-M: ${mesIGPMInicio}/${anoIGPMInicio} a ${mesIGPMFim}/${anoIGPMFim}`);

// Agora simular obterIndicesPeriodo com essa data
const dataInicioIGPM = { dia: 23, mes: mesIGPMInicio, ano: anoIGPMInicio };
const dataFimIGPM = { dia: Math.min(23, 28), mes: mesIGPMFim, ano: anoIGPMFim };

console.log(`\ndataInicioIGPM: ${dataInicioIGPM.mes}/${dataInicioIGPM.ano}`);
console.log(`dataFimIGPM: ${dataFimIGPM.mes}/${dataFimIGPM.ano}`);

// Simular obterIndicesPeriodo
let mesAtualSim = dataInicioIGPM.dia === 1 ? dataInicioIGPM.mes : dataInicioIGPM.mes + 1;
let anoAtualSim = dataInicioIGPM.ano;

console.log(`\nLógica de obterIndicesPeriodo:`);
console.log(`dataInicioIGPM.dia: ${dataInicioIGPM.dia}`);
console.log(`mesAtualSim inicializado para: ${mesAtualSim}`);

if (mesAtualSim > 12) {
  mesAtualSim = 1;
  anoAtualSim++;
}

const meses = [];
while (
  anoAtualSim < dataFimIGPM.ano ||
  (anoAtualSim === dataFimIGPM.ano && mesAtualSim <= dataFimIGPM.mes)
) {
  meses.push(`${mesAtualSim}/${anoAtualSim}`);
  mesAtualSim++;
  if (mesAtualSim > 12) {
    mesAtualSim = 1;
    anoAtualSim++;
  }
}

console.log(`Meses encontrados: ${meses.length}`);
console.log(`Meses: ${meses.join(', ')}`);
