/**
 * Interpreta o texto reconhecido no aparelho (sem internet) e monta os mesmos dados que a IA devolve.
 * São regras simples: funcionam bem com texto impresso e organizado; o resto vai marcado como dúvida
 * e o usuário corrige na revisão (RN01).
 */
import type { LidoBio, LidoDieta, LidoRotulo, LidoTreino } from './tipos';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s: string) => semAcento(s).toLowerCase();
const numero = (s: string | undefined) => (s == null ? null : Number(s.replace(/\./g, (m, i, t) => (t.includes(',') ? '' : m)).replace(',', '.')));

/** Junta blocos do OCR e quebra em linhas limpas. */
export function linhas(blocos: string[]): string[] {
  return blocos
    .flatMap((b) => b.split(/\r?\n/))
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
}

/* ---------------- Ficha de treino ---------------- */

const AEROBICOS = /\b(esteira|bike|bicicleta|eliptico|elíptico|corrida|caminhada|transport|escada|remo ergometro|spinning)\b/i;
const CABECALHO_TREINO = /^(?:treino|ficha|dia|rotina)?\s*[-:]?\s*\(?([A-F])\)?\s*(?:[-–:.)]|$)\s*(.*)$/i;
const CABECALHO_DIA = /^(segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo)(?:-feira)?\b[\s:–-]*(.*)$/i;

export function interpretarTreino(blocos: string[]): LidoTreino {
  const ls = linhas(blocos);
  const treinos: LidoTreino['treinos'] = [];
  let atual: LidoTreino['treinos'][number] | null = null;
  const novo = (nome: string | null) => {
    atual = { nome: nome?.trim() || null, itens: [] };
    treinos.push(atual);
  };
  for (const l of ls) {
    // Cabeçalhos: "Treino A - Peito e tríceps", "A) Costas", "Segunda: pernas".
    const cab = l.match(/^treino\s+([A-F])\b[\s:–.-]*(.*)$/i) ?? (l.length <= 40 ? l.match(CABECALHO_TREINO) : null);
    const dia = l.match(CABECALHO_DIA);
    if (cab && !/\d\s*[x×]\s*\d/i.test(l)) {
      novo(cab[2] || null);
      continue;
    }
    if (dia && !/\d\s*[x×]\s*\d/i.test(l)) {
      novo(dia[2] || dia[1]);
      continue;
    }
    const item = interpretarLinhaExercicio(l);
    if (!item) continue;
    if (!atual) novo(null);
    atual!.itens.push(item);
  }
  return { nome_plano: null, treinos: treinos.filter((t) => t.itens.length) };
}

export function interpretarLinhaExercicio(l: string): LidoTreino['treinos'][number]['itens'][number] | null {
  // "Supino reto 4x10", "Puxada frente 3 x 8-12 40kg", "Leg press 4 séries de 12", "Esteira 20 min"
  const sxr = l.match(/(\d{1,2})\s*[x×X]\s*(\d{1,3})(?:\s*(?:-|a|–|\/)\s*(\d{1,3}))?/);
  const series = l.match(/(\d{1,2})\s*s[ée]ries?\s*(?:de)?\s*(\d{1,3})(?:\s*(?:-|a|–)\s*(\d{1,3}))?/i);
  const min = l.match(/(\d{1,3})\s*(?:min|minutos|')/i);
  const carga = l.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*kg\b/i);
  const m = sxr ?? series;
  const aerobico = AEROBICOS.test(l) && !m;
  if (!m && !aerobico) return null;
  const corte = m ? l.indexOf(m[0]) : min ? l.indexOf(min[0]) : l.length;
  let nome = l
    .slice(0, corte)
    .replace(/^\s*(?:\d{1,2}[.)-]|[-•*·])\s*/, '')
    .replace(/[-–:|]+\s*$/, '')
    .trim();
  if (!nome) nome = l.replace(m?.[0] ?? '', '').replace(carga?.[0] ?? '', '').trim();
  if (!nome || nome.length < 3) return null;
  const a = m ? Number(m[2]) : null;
  const b = m?.[3] ? Number(m[3]) : a;
  return {
    exercicio: nome.charAt(0).toUpperCase() + nome.slice(1),
    aerobico,
    series: m ? Number(m[1]) : null,
    reps_min: a != null && b != null ? Math.min(a, b) : null,
    reps_max: a != null && b != null ? Math.max(a, b) : null,
    carga_kg: carga ? numero(carga[1]) : null,
    duracao_min: aerobico && min ? Number(min[1]) : null,
    observacao: null,
    duvida: !m && !aerobico,
  };
}

/* ---------------- Plano alimentar ---------------- */

const REFEICOES: [RegExp, string][] = [
  [/caf[ée] da manh[ãa]|desjejum/i, 'Café da manhã'],
  [/lanche da manh[ãa]|cola[çc][ãa]o/i, 'Lanche da manhã'],
  [/pr[ée][\s-]?treino/i, 'Pré-treino'],
  [/p[óo]s[\s-]?treino/i, 'Pós-treino'],
  [/almo[çc]o/i, 'Almoço'],
  [/lanche da tarde|lanche/i, 'Lanche da tarde'],
  [/jantar/i, 'Jantar'],
  [/ceia/i, 'Ceia'],
];

const HORA = /\b([01]?\d|2[0-3])\s*(?:[:h]\s*([0-5]\d)?)\b/i;
const QTD = /(\d+(?:[.,]\d+)?)\s*(g|gr|gramas|ml|kg|l)\b/i;
const MEDIDA = /(\d+(?:[.,]\d+)?|meia|uma|um|duas|dois|tr[êe]s)\s+(fatias?|unidades?|un|colher(?:es)?(?: de sopa| de ch[áa]| de sobremesa)?|conchas?|x[íi]caras?|copos?|pegadores?|escumadeiras?|scoops?|potes?|por[çc][õo]es?|bananas?|ovos?)/i;

export function interpretarDieta(blocos: string[]): LidoDieta {
  const ls = linhas(blocos);
  const refeicoes: LidoDieta['refeicoes'] = [];
  let atual: LidoDieta['refeicoes'][number] | null = null;
  for (const l of ls) {
    const ref = REFEICOES.find(([r]) => r.test(l));
    if (ref && l.length <= 45 && !QTD.test(l)) {
      const h = l.match(HORA);
      atual = { nome: ref[1], horario: h ? `${h[1].padStart(2, '0')}:${h[2] ?? '00'}` : null, itens: [] };
      refeicoes.push(atual);
      continue;
    }
    // Com opções ("iogurte 170 g ou 1 banana"), fica a primeira e o item vai marcado como dúvida.
    const temOpcao = /\s+ou\s+/i.test(l);
    const l1 = l.split(/\s+ou\s+/i)[0];
    const q = l1.match(QTD);
    const md = l1.match(MEDIDA);
    if (!q && !md) continue;
    const alvo = q ?? md!;
    let nome = l1.replace(alvo[0], '').replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').replace(/\b(de|do|da)\s*$/i, '').replace(/[-–:(),]+\s*$/, '').replace(/^\s*(de|do|da)\s+/i, '').trim();
    if (nome.length < 2) continue;
    let g: number | null = null;
    if (q) {
      const v = numero(q[1])!;
      const u = q[2].toLowerCase();
      g = u === 'kg' || u === 'l' ? v * 1000 : v;
    }
    if (!atual) {
      atual = { nome: 'Refeição', horario: null, itens: [] };
      refeicoes.push(atual);
    }
    atual.itens.push({ alimento: nome.charAt(0).toUpperCase() + nome.slice(1), quantidade_g: g, medida: md ? md[0] : null, duvida: g == null || temOpcao });
  }
  return { nome: null, refeicoes: refeicoes.filter((r) => r.itens.length) };
}

/* ---------------- Laudo de bioimpedância ---------------- */

function valorApos(ls: string[], rotulo: RegExp, unidade?: RegExp): number | null {
  for (let i = 0; i < ls.length; i++) {
    if (!rotulo.test(ls[i])) continue;
    // Valor na mesma linha (depois do rótulo) ou na linha seguinte.
    for (const trecho of [ls[i].replace(rotulo, ' '), ls[i + 1] ?? '']) {
      const re = new RegExp(`(\\d{1,4}(?:[.,]\\d{1,2})?)\\s*${unidade ? unidade.source : ''}`, 'i');
      const m = trecho.match(re);
      if (m) return numero(m[1]);
    }
  }
  return null;
}

export function interpretarBio(blocos: string[]): LidoBio {
  const ls = linhas(blocos);
  const texto = ls.join(' ');
  const d = texto.match(/\b(\d{2})[/.-](\d{2})[/.-](\d{4})\b/);
  return {
    data: d ? `${d[3]}-${d[2]}-${d[1]}` : null,
    peso_kg: valorApos(ls, /\bpeso(?: corporal)?\b(?! ideal)/i, /kg/),
    cintura_cm: valorApos(ls, /cintura/i),
    gordura_pct: valorApos(ls, /(?:%|percentual de|porcentagem de)?\s*gordura corporal|\bpgc\b|body fat/i, /%/),
    musculo_esqueletico_pct: valorApos(ls, /m[úu]sculo esquel[ée]tico|massa muscular esquel[ée]tica/i, /%/),
    metabolismo_repouso_kcal: valorApos(ls, /metabolismo (?:basal|em repouso)|\btmb\b|taxa metab[óo]lica/i),
    idade_biologica: valorApos(ls, /idade (?:metab[óo]lica|biol[óo]gica|corporal)/i),
    gordura_visceral_nivel: valorApos(ls, /gordura visceral|n[íi]vel visceral/i),
  };
}

/* ---------------- Tabela nutricional ---------------- */

export function interpretarRotulo(blocos: string[]): LidoRotulo {
  const ls = linhas(blocos);
  const t = ls.join('\n');
  const porcao = t.match(/por[çc][ãa]o(?: de)?\s*(\d+(?:[.,]\d+)?)\s*(?:g|ml)\b\s*(?:\(([^)]+)\))?/i);
  const v = (re: RegExp) => {
    const l = ls.find((x) => re.test(norm(x)));
    if (!l) return null;
    const m = l.replace(re, ' ').match(/(\d+(?:[.,]\d+)?)/);
    return m ? numero(m[1]) : null;
  };
  return {
    nome: null,
    marca: null,
    porcao_g: porcao ? numero(porcao[1]) : null,
    medida_caseira: porcao?.[2]?.trim() ?? null,
    por_porcao: {
      energia_kcal: v(/valor energetico|energia/),
      proteina_g: v(/proteinas?/),
      carboidrato_g: v(/carboidratos?(?! .*acucar)/),
      gordura_g: v(/gorduras? totais/),
      fibra_g: v(/fibras?(?: alimentar)?/),
      sodio_mg: v(/sodio/),
    },
  };
}
