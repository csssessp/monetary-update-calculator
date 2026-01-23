// Teste de cálculo com parcelamento
import fetch from 'node-fetch';

const payload = {
  descricao: "Teste de IGP-M com 12 parcelas",
  valorOriginal: 100000,
  dataInicial: { dia: 1, mes: 1, ano: 2025 },
  dataFinal: { dia: 23, mes: 1, ano: 2026 },
  indice: "IGP-M",
  numeroParcelas: 12,
  mostrarMemoria: true,
};

async function testarCalculo() {
  try {
    const response = await fetch('http://localhost:3000/api/indices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('Resposta da API:');
    console.log(JSON.stringify(data, null, 2).substring(0, 5000));
  } catch (error) {
    console.error('Erro:', error);
  }
}

testarCalculo();
