/**
 * Associa os nomes lidos (exercícios e alimentos) aos itens do app, por semelhança de palavras.
 * Quando a semelhança é baixa, o item volta sem associação e a revisão pede para o usuário escolher.
 */
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'na', 'no', 'em', 'a', 'o', 'e', 'ao', 'para', 'tipo']);
const SINONIMOS: Record<string, string> = {
  halter: 'halteres', haltere: 'halteres', halteres: 'halteres', frente: 'frontal', pulley: 'polia', puxador: 'puxada', cross: 'crossover',
  maq: 'maquina', aparelho: 'maquina', smith: 'smith', abdominais: 'abdominal', bike: 'bicicleta', triceps: 'triceps', biceps: 'rosca',
  ovos: 'ovo', bananas: 'banana', fatias: 'fatia', batata: 'batata', frango: 'frango', peito: 'peito', file: 'file', grelhada: 'grelhado',
  cozida: 'cozido', integrais: 'integral', feijao: 'feijao',
};

export function tokens(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !PARADAS.has(t))
    .map((t) => SINONIMOS[t] ?? (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t));
}

/** Nota de 0 a 1: quanto das palavras lidas aparece no nome do item, com desconto para nomes muito maiores. */
export function semelhanca(lido: string, nome: string): number {
  const a = tokens(lido);
  const b = new Set(tokens(nome));
  if (!a.length || !b.size) return 0;
  const comuns = a.filter((t) => b.has(t) || [...b].some((x) => x.length > 3 && (x.startsWith(t) || t.startsWith(x)))).length;
  const cobertura = comuns / a.length;
  const excesso = Math.max(0, b.size - comuns) / (b.size + 2);
  return cobertura * (1 - 0.35 * excesso);
}

/** Preferências para alimentos: pronto para comer antes de cru. */
const PREFERIDOS = /\b(cozid|grelhad|assad|refogad|natural)/i;
/** Versões processadas só ganham quando o texto lido pede por elas. */
const PROCESSADOS = ['doce', 'barra', 'frit', 'conserva', 'enlatad', 'calda', 'xarope', 'po', 'desidratad', 'cristalizad', 'empanad', 'achocolatad'];

export function melhor<T extends { id: string; nome: string }>(lido: string, itens: T[], opts: { minimo?: number; alimento?: boolean } = {}) {
  let top: { item: T; nota: number } | null = null;
  for (const item of itens) {
    let nota = semelhanca(lido, item.nome);
    if (nota > 0) {
      const tl = tokens(lido);
      const tn = tokens(item.nome);
      // A primeira palavra costuma ser o alimento ou o movimento ("Aveia, flocos" e não "Pão, aveia").
      if (tl[0] && tn[0] === tl[0]) nota += 0.1;
      if (opts.alimento) {
        if (PREFERIDOS.test(item.nome) && !/\bcru/i.test(lido)) nota += 0.03;
        const proc = (t: string) => PROCESSADOS.some((p) => (p.length <= 2 ? t === p : t.startsWith(p)));
        if (tn.some(proc) && !tl.some(proc)) nota -= 0.08;
      }
    }
    if (!top || nota > top.nota) top = { item, nota };
  }
  return top && top.nota >= (opts.minimo ?? 0.6) ? top : null;
}
