// Este arquivo foi desabilitado para evitar problemas de deploy no Vercel
// As funcionalidades de banco de dados agora usam dados locais do arquivo indices-data.ts
// Mantemos as funções exportadas como stubs para compatibilidade

/**
 * @deprecated Use local indices-data.ts instead
 * Cria tabela se não existir e garante precisão adequada
 */
export async function createIndicesTable() {
  console.log("Database operations disabled - using local indices instead")
  return
}

/**
 * @deprecated Use local indices-data.ts instead
 * Upsert de 1 linha
 */
export async function upsertIndex(name: string, month: number, year: number, value: number) {
  console.log(`Database upsertIndex disabled for ${name} ${month}/${year}`)
  return
}

/**
 * @deprecated Use local indices-data.ts instead
 * Upsert em lote
 */
export async function upsertIndicesBulk(
  name: string,
  items: { mes: number; ano: number; valor: number }[],
  chunkSize = 200,
) {
  console.log(`Database upsertIndicesBulk disabled for ${name} - ${items?.length || 0} items`)
  return
}

/**
 * @deprecated Use local indices-data.ts instead
 * Busca dinâmica por nome e/ou período
 */
export async function getIndices(
  name?: string,
  startMonth?: number,
  startYear?: number,
  endMonth?: number,
  endYear?: number,
) {
  console.log("Database operations disabled - using local indices instead")
  return []
}

/**
 * @deprecated Use local indices-data.ts instead
 * Nomes distintos
 */
export async function getDistinctIndexNames() {
  console.log("Database operations disabled - using local indices instead")
  return []
}
