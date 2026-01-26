#!/usr/bin/env node

/**
 * Script de Atualização de Índices
 * 
 * Este script busca os dados mais recentes das APIs oficiais
 * e atualiza o arquivo lib/indices-data.ts
 * 
 * Uso: node update-indices.mjs
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, 'lib', 'indices-data.ts');

console.log('🔄 Iniciando atualização de índices...\n');

/**
 * Buscar dados de um índice via BACEN SGS API
 * @param {string} serieId - ID da série (ex: '195' para Poupança)
 * @param {string} nomeSerie - Nome da série para logging
 */
async function buscarDadosBACEN(serieId, nomeSerie) {
  try {
    console.log(`📥 Buscando ${nomeSerie} (Série ${serieId})...`);
    
    const url = `https://api.bcb.gov.br/dados/series/${serieId}/dados?formato=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonetaryCalculator/1.0)'
      }
    });

    if (!response.ok) {
      console.error(`   ❌ Erro HTTP ${response.status}`);
      return null;
    }

    const dados = await response.json();
    
    if (!Array.isArray(dados)) {
      console.error('   ❌ Formato de resposta inválido');
      return null;
    }

    // Converter para formato esperado
    const indices = dados
      .filter(d => d.valor) // Remover valores nulos
      .map(d => {
        const data = new Date(d.data);
        return {
          mes: data.getMonth() + 1,
          ano: data.getFullYear(),
          valor: parseFloat(parseFloat(d.valor).toFixed(4))
        };
      })
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

    // Remover duplicatas (manter o último de cada mês/ano)
    const unicos = [];
    const visto = new Set();
    for (const idx of indices.reverse()) {
      const chave = `${idx.ano}-${idx.mes}`;
      if (!visto.has(chave)) {
        visto.add(chave);
        unicos.push(idx);
      }
    }

    console.log(`   ✅ ${unicos.length} registros obtidos`);
    return unicos.reverse();

  } catch (erro) {
    console.error(`   ❌ Erro ao buscar dados: ${erro.message}`);
    return null;
  }
}

/**
 * Buscar IGP-M via Ipeadata (API alternativa, mais confiável)
 */
async function buscarIGPMIpeadata() {
  try {
    console.log('📥 Buscando IGP-M via Ipeadata...');
    
    const url = 'https://ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO=\'IGP12_IGPMG12\')?$format=json';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonetaryCalculator/1.0)'
      }
    });

    if (!response.ok) {
      console.error(`   ❌ Erro HTTP ${response.status}`);
      return null;
    }

    const dados = await response.json();
    
    if (!dados.value || !Array.isArray(dados.value)) {
      console.error('   ❌ Formato de resposta inválido');
      return null;
    }

    const indices = dados.value
      .map(d => {
        const data = new Date(d.VALDATA);
        return {
          mes: data.getMonth() + 1,
          ano: data.getFullYear(),
          valor: parseFloat(parseFloat(d.VALVALOR).toFixed(4))
        };
      })
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

    console.log(`   ✅ ${indices.length} registros obtidos`);
    return indices;

  } catch (erro) {
    console.error(`   ❌ Erro ao buscar dados: ${erro.message}`);
    return null;
  }
}

/**
 * Gerar código TypeScript para os índices
 */
function gerarCodigoTypeScript(indices, nomeIndice) {
  const linhas = [];
  
  let anoAtual = null;
  for (const ind of indices) {
    if (ind.ano !== anoAtual) {
      if (anoAtual !== null) linhas.push('');
      linhas.push(`    // ${ind.ano}`);
      anoAtual = ind.ano;
    }
    
    const padrao = `    { mes: ${ind.mes}, ano: ${ind.ano}, valor: ${ind.valor} }`;
    if (ind === indices[indices.length - 1]) {
      linhas.push(padrao);
    } else {
      linhas.push(padrao + ',');
    }
  }

  return linhas.join('\n');
}

/**
 * Main
 */
async function main() {
  console.time('⏱️  Tempo total');

  const indices = {};

  // Tentar buscar cada índice
  const poupanca = await buscarDadosBACEN('195', 'Poupança');
  if (poupanca) indices['Poupança'] = poupanca;
  console.log();

  const igpmBacen = await buscarDadosBACEN('189', 'IGP-M (BACEN)');
  const igpmIpeadata = await buscarIGPMIpeadata();
  if (igpmIpeadata && (!igpmBacen || igpmIpeadata.length > igpmBacen.length)) {
    indices['IGP-M'] = igpmIpeadata;
  } else if (igpmBacen) {
    indices['IGP-M'] = igpmBacen;
  }
  console.log();

  const inpc = await buscarDadosBACEN('188', 'INPC');
  if (inpc) indices['INPC'] = inpc;
  console.log();

  // Resumo
  console.log('📊 RESUMO DA ATUALIZAÇÃO:\n');
  let atualizado = 0;
  for (const [nome, dados] of Object.entries(indices)) {
    if (dados && dados.length > 0) {
      const periodoInicial = `${dados[0].ano}-${String(dados[0].mes).padStart(2, '0')}`;
      const periodoFinal = `${dados[dados.length-1].ano}-${String(dados[dados.length-1].mes).padStart(2, '0')}`;
      console.log(`✅ ${nome}: ${dados.length} registros (${periodoInicial} até ${periodoFinal})`);
      atualizado++;
    } else {
      console.log(`⚠️  ${nome}: Falha na busca`);
    }
  }

  console.log('\n💡 Próximos passos:');
  console.log('1. Revisar os dados acima');
  console.log('2. Se estiverem corretos, adicionar ao arquivo lib/indices-data.ts');
  console.log('3. Executar: node test-all-indices.mjs');
  console.log('4. Commitar as mudanças');

  console.timeEnd('⏱️  Tempo total');
}

main().catch(erro => {
  console.error('❌ Erro fatal:', erro);
  process.exit(1);
});
