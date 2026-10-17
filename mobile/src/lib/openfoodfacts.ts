/**
 * Consulta de produto por código de barras no Open Food Facts (RF38). Base aberta (ODbL):
 * o crédito aparece em Perfil › Sobre o app. Valores convertidos para os nutrientes do app, por 100 g.
 */
import type { Valores } from '@/db/dieta';

export type ProdutoOff = { codigo: string; nome: string; marca: string | null; porcao_g: number | null; valores: Valores };

const MAPA: [chaveOff: string, nutriente: string, fator: number][] = [
  ['energy-kcal_100g', 'energia', 1],
  ['proteins_100g', 'proteina', 1],
  ['carbohydrates_100g', 'carboidrato', 1],
  ['fat_100g', 'gordura', 1],
  ['fiber_100g', 'fibra', 1],
  ['sodium_100g', 'sodio', 1000], // g → mg
  ['calcium_100g', 'calcio', 1000],
  ['iron_100g', 'ferro', 1000],
  ['potassium_100g', 'potassio', 1000],
  ['magnesium_100g', 'magnesio', 1000],
  ['zinc_100g', 'zinco', 1000],
  ['vitamin-c_100g', 'vitamina_c', 1000],
  ['vitamin-a_100g', 'vitamina_a', 1_000_000], // g → µg
];

export async function buscarProduto(codigo: string, sinal?: AbortSignal): Promise<ProdutoOff | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=product_name,product_name_pt,brands,serving_quantity,nutriments`;
  const r = await fetch(url, { headers: { 'User-Agent': 'TreinoEDieta/1.0 (app móvel)' }, signal: sinal });
  if (!r.ok) {
    if (r.status === 404) return null;
    throw new Error(`Open Food Facts respondeu ${r.status}`);
  }
  const j = (await r.json()) as { status?: number; product?: Record<string, unknown> };
  const p = j.product;
  if (!j.status || !p) return null;
  const n = (p.nutriments ?? {}) as Record<string, number | string | undefined>;
  const valores: Valores = {};
  for (const [k, id, f] of MAPA) {
    const v = Number(n[k]);
    if (Number.isFinite(v) && v >= 0) valores[id] = v * f;
  }
  // Sem kcal, tenta converter de kJ.
  if (valores.energia == null && Number.isFinite(Number(n['energy_100g']))) valores.energia = Number(n['energy_100g']) / 4.184;
  const nome = String(p.product_name_pt || p.product_name || '').trim();
  if (!nome || valores.energia == null) return null;
  const porcao = Number(p.serving_quantity);
  return {
    codigo,
    nome,
    marca: String(p.brands ?? '').split(',')[0].trim() || null,
    porcao_g: Number.isFinite(porcao) && porcao > 0 ? porcao : null,
    valores,
  };
}
