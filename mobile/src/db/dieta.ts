/** Alimentos, dieta (plano alimentar), consumo e balanço do dia. */
import { diaNaDieta } from '@/lib/calculos';
import { somarDias } from '@/lib/formato';

import { agoraIso, atualizar, db, excluir, gravar, hojeIso, inserir, USUARIO_ID } from './conexao';
import { tmb, usuario } from './perfil';
import { gastoAtividadesComOrigem } from './treino';

/* ---------- Nutrientes e alimentos ---------- */

export type Nutriente = { id: string; nome: string; unidade: string; categoria: string; recomendado_dia: number | null };
export type Valores = Record<string, number>;

export function nutrientes(): Nutriente[] {
  return db().all<Nutriente>('SELECT id, nome, unidade, categoria, recomendado_dia FROM nutriente ORDER BY ordem');
}

export type Alimento = {
  id: string;
  nome: string;
  marca: string | null;
  fonte: 'tbca' | 'taco' | 'base_app' | 'open_food_facts' | 'rotulo' | 'manual';
  codigo_barras: string | null;
  porcao_padrao_g: number | null;
  medida_caseira: string | null;
  usuario_id: string | null;
};

export const FONTES: Record<Alimento['fonte'], string> = {
  tbca: 'TBCA',
  taco: 'TACO',
  base_app: 'Base do app',
  open_food_facts: 'Código de barras',
  rotulo: 'Rótulo',
  manual: 'Meus alimentos',
};

export function alimento(id: string): Alimento | null {
  return db().get<Alimento>('SELECT * FROM alimento WHERE id = ?', [id]) ?? null;
}

export function valoresDoAlimento(id: string): Valores {
  const out: Valores = {};
  for (const r of db().all<{ nutriente_id: string; valor_por_100g: number }>('SELECT nutriente_id, valor_por_100g FROM alimento_nutriente WHERE alimento_id = ?', [id]))
    out[r.nutriente_id] = r.valor_por_100g;
  return out;
}

export function proporcao(v: Valores, gramas: number): Valores {
  const out: Valores = {};
  for (const [k, x] of Object.entries(v)) out[k] = (x * gramas) / 100;
  return out;
}

export function somar(a: Valores, b: Valores): Valores {
  const out = { ...a };
  for (const [k, x] of Object.entries(b)) out[k] = (out[k] ?? 0) + x;
  return out;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type AlimentoBusca = Alimento & { kcal100: number };

export function buscarAlimentos(busca: string, filtro: 'todos' | 'base' | 'meus' | 'recentes' = 'todos'): AlimentoBusca[] {
  let lista: AlimentoBusca[];
  if (filtro === 'recentes') {
    lista = db().all<AlimentoBusca>(
      `SELECT a.*, COALESCE(n.valor_por_100g, 0) AS kcal100, MAX(c.criado_em) AS ult FROM consumo c JOIN alimento a ON a.id = c.alimento_id
       LEFT JOIN alimento_nutriente n ON n.alimento_id = a.id AND n.nutriente_id = 'energia'
       WHERE c.excluido_em IS NULL AND a.excluido_em IS NULL GROUP BY a.id ORDER BY ult DESC LIMIT 30`,
    );
  } else {
    const cond = filtro === 'base' ? 'AND a.usuario_id IS NULL' : filtro === 'meus' ? 'AND a.usuario_id = ?' : 'AND (a.usuario_id IS NULL OR a.usuario_id = ?)';
    lista = db().all<AlimentoBusca>(
      `SELECT a.*, COALESCE(n.valor_por_100g, 0) AS kcal100 FROM alimento a
       LEFT JOIN alimento_nutriente n ON n.alimento_id = a.id AND n.nutriente_id = 'energia'
       WHERE a.excluido_em IS NULL ${cond} ORDER BY a.nome`,
      filtro === 'base' ? [] : [USUARIO_ID],
    );
  }
  const q = semAcento(busca.trim());
  if (!q) return lista;
  const partes = q.split(/\s+/);
  return lista
    .filter((a) => partes.every((p) => semAcento(`${a.nome} ${a.marca ?? ''}`).includes(p)))
    .sort((a, b) => Number(!semAcento(a.nome).startsWith(partes[0])) - Number(!semAcento(b.nome).startsWith(partes[0])));
}

export function alimentoPorCodigo(codigo: string): Alimento | null {
  return db().get<Alimento>('SELECT * FROM alimento WHERE codigo_barras = ? AND excluido_em IS NULL', [codigo]) ?? null;
}

export type AlimentoEntrada = {
  nome: string;
  marca?: string | null;
  fonte: 'open_food_facts' | 'rotulo' | 'manual';
  codigo_barras?: string | null;
  porcao_padrao_g?: number | null;
  medida_caseira?: string | null;
  valores: Valores;
};

/** Salva na base do usuário para reuso (RF40). */
export function criarAlimento(a: AlimentoEntrada) {
  return gravar(() => {
    const existente = a.codigo_barras ? alimentoPorCodigo(a.codigo_barras) : null;
    const id = existente?.id ?? inserir('alimento', { nome: a.nome, marca: a.marca, fonte: a.fonte, codigo_barras: a.codigo_barras, porcao_padrao_g: a.porcao_padrao_g, medida_caseira: a.medida_caseira });
    if (existente) atualizar('alimento', id, { nome: a.nome, marca: a.marca, porcao_padrao_g: a.porcao_padrao_g });
    for (const [k, v] of Object.entries(a.valores)) {
      if (v == null || !Number.isFinite(v)) continue;
      db().run('INSERT INTO alimento_nutriente (alimento_id, nutriente_id, valor_por_100g) VALUES (?,?,?) ON CONFLICT DO UPDATE SET valor_por_100g = excluded.valor_por_100g', [id, k, v]);
    }
    return id;
  });
}

/* ---------- Dieta (plano alimentar) ---------- */

export type ItemDieta = { id: string; alimento_id: string; nome: string; quantidade_g: number; medida_caseira: string | null; porcao_padrao_g: number | null; fonte: Alimento['fonte']; valores: Valores };
export type RefeicaoModelo = { id: string; nome: string; horario: string | null; ordem: number; itens: ItemDieta[]; valores: Valores };
export type Dieta = { id: string; nome: string; refeicoes: RefeicaoModelo[]; valores: Valores };

function itensDaRefeicao(refeicaoId: string): ItemDieta[] {
  return db()
    .all<Omit<ItemDieta, 'valores'>>(
      `SELECT i.id, i.alimento_id, a.nome, i.quantidade_g, a.medida_caseira, a.porcao_padrao_g, a.fonte FROM refeicao_modelo_item i JOIN alimento a ON a.id = i.alimento_id
       WHERE i.refeicao_modelo_id = ? AND i.excluido_em IS NULL ORDER BY i.criado_em`,
      [refeicaoId],
    )
    .map((i) => ({ ...i, valores: proporcao(valoresDoAlimento(i.alimento_id), i.quantidade_g) }));
}

export function dietaAtiva(): Dieta | null {
  const d = db().get<{ id: string; nome: string }>('SELECT id, nome FROM dieta WHERE ativa = 1 AND excluido_em IS NULL ORDER BY criado_em DESC LIMIT 1');
  if (!d) return null;
  const refeicoes = db()
    .all<{ id: string; nome: string; horario: string | null; ordem: number }>('SELECT id, nome, horario, ordem FROM refeicao_modelo WHERE dieta_id = ? AND excluido_em IS NULL ORDER BY ordem', [d.id])
    .map((r) => {
      const itens = itensDaRefeicao(r.id);
      return { ...r, itens, valores: itens.reduce((t, i) => somar(t, i.valores), {} as Valores) };
    });
  return { ...d, refeicoes, valores: refeicoes.reduce((t, r) => somar(t, r.valores), {} as Valores) };
}

export type DietaEntrada = { nome: string; refeicoes: { id?: string; nome: string; horario: string | null; itens: { alimento_id: string; quantidade_g: number }[] }[] };

export function salvarDieta(e: DietaEntrada, opts: { importacao_id?: string } = {}) {
  return gravar(() => {
    const atual = dietaAtiva();
    const did = atual?.id ?? inserir('dieta', { nome: e.nome, ativa: 1, importacao_id: opts.importacao_id });
    if (atual) atualizar('dieta', did, { nome: e.nome });
    const mantidas = new Set<string>();
    e.refeicoes.forEach((r, ordem) => {
      let rid = r.id && atual?.refeicoes.some((x) => x.id === r.id) ? r.id : undefined;
      if (rid) atualizar('refeicao_modelo', rid, { nome: r.nome, horario: r.horario, ordem });
      else rid = inserir('refeicao_modelo', { dieta_id: did, nome: r.nome, horario: r.horario, ordem });
      mantidas.add(rid);
      // Itens iguais (mesmo alimento e quantidade) mantêm o id, para não perder o vínculo com o consumo de hoje.
      const antigos = atual?.refeicoes.find((x) => x.id === rid)?.itens ?? [];
      const usados = new Set<string>();
      for (const it of r.itens) {
        const igual = antigos.find((a) => !usados.has(a.id) && a.alimento_id === it.alimento_id);
        if (igual) {
          usados.add(igual.id);
          if (igual.quantidade_g !== it.quantidade_g) atualizar('refeicao_modelo_item', igual.id, { quantidade_g: it.quantidade_g });
        } else inserir('refeicao_modelo_item', { refeicao_modelo_id: rid, alimento_id: it.alimento_id, quantidade_g: it.quantidade_g });
      }
      for (const a of antigos) if (!usados.has(a.id)) excluir('refeicao_modelo_item', a.id);
    });
    for (const r of atual?.refeicoes ?? []) if (!mantidas.has(r.id)) excluir('refeicao_modelo', r.id);
    return did;
  });
}

export function excluirDieta() {
  gravar(() => {
    const d = dietaAtiva();
    if (d) atualizar('dieta', d.id, { ativa: 0 });
  });
}

/* ---------- Consumo ---------- */

export type Consumo = {
  id: string;
  data: string;
  horario: string | null;
  refeicao_modelo_item_id: string | null;
  refeicao_modelo_id: string | null;
  refeicao_nome: string | null;
  alimento_id: string;
  nome: string;
  fonte: Alimento['fonte'];
  medida_caseira: string | null;
  porcao_padrao_g: number | null;
  quantidade_g: number;
  valores: Valores;
};

export function consumosDoDia(data: string): Consumo[] {
  return db()
    .all<Omit<Consumo, 'valores'>>(
      `SELECT c.id, c.data, c.horario, c.refeicao_modelo_item_id, i.refeicao_modelo_id, c.refeicao_nome, c.alimento_id, a.nome, a.fonte, a.medida_caseira, a.porcao_padrao_g, c.quantidade_g
       FROM consumo c JOIN alimento a ON a.id = c.alimento_id LEFT JOIN refeicao_modelo_item i ON i.id = c.refeicao_modelo_item_id
       WHERE c.data = ? AND c.excluido_em IS NULL ORDER BY c.horario, c.criado_em`,
      [data],
    )
    .map((c) => ({ ...c, valores: proporcao(valoresDoAlimento(c.alimento_id), c.quantidade_g) }));
}

export function consumo(id: string): Consumo | null {
  const c = db().get<{ data: string }>('SELECT data FROM consumo WHERE id = ?', [id]);
  return c ? (consumosDoDia(c.data).find((x) => x.id === id) ?? null) : null;
}

const horaAgora = () => agoraIso().slice(11, 16);

export function adicionarConsumo(c: { alimento_id: string; quantidade_g: number; data?: string; horario?: string | null; refeicao_nome?: string | null; refeicao_modelo_item_id?: string | null }) {
  return gravar(() =>
    inserir('consumo', {
      alimento_id: c.alimento_id,
      quantidade_g: c.quantidade_g,
      data: c.data ?? hojeIso(),
      horario: c.horario ?? horaAgora(),
      refeicao_nome: c.refeicao_nome ?? null,
      refeicao_modelo_item_id: c.refeicao_modelo_item_id ?? null,
    }),
  );
}

export function atualizarConsumo(id: string, d: { quantidade_g?: number; horario?: string | null }) {
  gravar(() => atualizar('consumo', id, d));
}

export function removerConsumo(id: string) {
  gravar(() => excluir('consumo', id));
}

/** Marca todos os itens da refeição como consumidos (RF18). */
export function marcarRefeicao(refeicaoId: string, data = hojeIso()) {
  gravar(() => {
    const r = db().get<{ nome: string }>('SELECT nome FROM refeicao_modelo WHERE id = ?', [refeicaoId]);
    const ja = new Set(consumosDoDia(data).map((c) => c.refeicao_modelo_item_id));
    const h = horaAgora();
    for (const i of itensDaRefeicao(refeicaoId))
      if (!ja.has(i.id)) inserir('consumo', { data, horario: h, refeicao_modelo_item_id: i.id, refeicao_nome: r?.nome ?? null, alimento_id: i.alimento_id, quantidade_g: i.quantidade_g });
  });
}

export function desmarcarRefeicao(refeicaoId: string, data = hojeIso()) {
  gravar(() => {
    for (const c of consumosDoDia(data)) if (c.refeicao_modelo_id === refeicaoId) excluir('consumo', c.id);
  });
}

export type EstadoRefeicao = RefeicaoModelo & {
  status: 'consumida' | 'parcial' | 'proxima' | 'pendente';
  consumos: Consumo[];
  avulsos: Consumo[];
  consumido: Valores;
  horaConsumo: string | null;
};

/** Refeições da dieta com o que já foi consumido no dia. */
export function refeicoesDoDia(data: string, dieta = dietaAtiva()): EstadoRefeicao[] {
  if (!dieta) return [];
  const cs = consumosDoDia(data);
  let achouProxima = false;
  return dieta.refeicoes.map((r) => {
    const consumos = cs.filter((c) => c.refeicao_modelo_id === r.id);
    const avulsos = cs.filter((c) => !c.refeicao_modelo_item_id && c.refeicao_nome === r.nome);
    const feitos = new Set(consumos.map((c) => c.refeicao_modelo_item_id));
    const todos = r.itens.length > 0 && r.itens.every((i) => feitos.has(i.id));
    let status: EstadoRefeicao['status'] = todos ? 'consumida' : consumos.length ? 'parcial' : 'pendente';
    if (status !== 'consumida' && !achouProxima) {
      achouProxima = true;
      if (status === 'pendente') status = 'proxima';
    }
    return {
      ...r,
      status,
      consumos,
      avulsos,
      consumido: [...consumos, ...avulsos].reduce((t, c) => somar(t, c.valores), {} as Valores),
      horaConsumo: consumos[0]?.horario ?? null,
    };
  });
}

/** Alimentos fora da dieta (ou todos os registros, sem dieta). */
export function avulsosDoDia(data: string, dieta = dietaAtiva()): Consumo[] {
  const nomes = new Set(dieta?.refeicoes.map((r) => r.nome) ?? []);
  return consumosDoDia(data).filter((c) => !c.refeicao_modelo_item_id && !(c.refeicao_nome && nomes.has(c.refeicao_nome)));
}

/* ---------- Balanço do dia ---------- */

/** RN05 */
export function metaCaloricaDoDia(dieta = dietaAtiva()): { kcal: number | null; origem: 'dieta' | 'usuario' | null } {
  if (dieta && dieta.valores.energia) return { kcal: Math.round(dieta.valores.energia), origem: 'dieta' };
  const u = usuario();
  if (u?.meta_calorias_kcal) return { kcal: u.meta_calorias_kcal, origem: 'usuario' };
  return { kcal: null, origem: null };
}

export type ResumoDia = {
  data: string;
  consumido: Valores;
  kcal: number;
  meta: number | null;
  metaOrigem: 'dieta' | 'usuario' | null;
  /** Metabolismo basal do dia inteiro. */
  tmb: number;
  /** Metabolismo basal contado até agora (hoje) ou do dia inteiro (dias passados). */
  tmbAteAgora: number;
  /** true quando o dia ainda não acabou: gasto e balanço são "até agora". */
  parcial: boolean;
  atividades: number;
  /** 'relogio' quando a energia ativa veio do Apple Saúde / Health Connect (RN11). */
  atividadesOrigem: 'relogio' | 'estimativa';
  gasto: number;
  balanco: number;
  metasMacros: Valores | null;
  naDieta: boolean;
};

/** Fração do dia já passada (0–1) para a data; 1 para dias passados, 0 para futuros. */
export function fracaoDoDia(data: string, agora = new Date()): number {
  const hoje = hojeIso(agora);
  if (data < hoje) return 1;
  if (data > hoje) return 0;
  return (agora.getHours() * 3600 + agora.getMinutes() * 60 + agora.getSeconds()) / 86_400;
}

export function resumoDoDia(data = hojeIso(), agora = new Date()): ResumoDia {
  const dieta = dietaAtiva();
  const consumido = consumosDoDia(data).reduce((t, c) => somar(t, c.valores), {} as Valores);
  const kcal = Math.round(consumido.energia ?? 0);
  const meta = metaCaloricaDoDia(dieta);
  const base = tmb(data)?.kcal ?? 0;
  const fracao = fracaoDoDia(data, agora);
  // O corpo gasta o metabolismo basal ao longo do dia: hoje, conta só o que já passou (RN06).
  const tmbAteAgora = Math.round(base * fracao);
  const { kcal: atividades, origem: atividadesOrigem } = gastoAtividadesComOrigem(data);
  const gasto = tmbAteAgora + atividades;
  return {
    data,
    consumido,
    kcal,
    meta: meta.kcal,
    metaOrigem: meta.origem,
    tmb: base,
    tmbAteAgora,
    parcial: fracao < 1,
    atividades,
    atividadesOrigem,
    gasto,
    balanco: kcal - gasto,
    metasMacros: dieta ? dieta.valores : null,
    naDieta: meta.origem === 'dieta' && diaNaDieta(kcal, meta.kcal),
  };
}

/** Dias seguidos na dieta (RN10). Hoje só conta se já estiver na margem. */
export function diasSeguidosNaDieta(hoje = hojeIso(), desde?: string): number {
  const dieta = dietaAtiva();
  if (!dieta?.valores.energia) return 0;
  const meta = dieta.valores.energia;
  let n = diaNaDieta(kcalDoDia(hoje), meta) ? 1 : 0;
  for (let d = somarDias(hoje, -1); n < 1000 && (!desde || d >= desde); d = somarDias(d, -1)) {
    if (!diaNaDieta(kcalDoDia(d), meta)) break;
    n++;
  }
  return n;
}

export function kcalDoDia(data: string): number {
  return consumosDoDia(data).reduce((t, c) => t + (c.valores.energia ?? 0), 0);
}

/** Situação de cada dia em relação à meta da dieta: true = na margem, false = fora, null = sem registro. */
export function diasDaDieta(datas: string[]): (boolean | null)[] {
  const meta = metaCaloricaDoDia().kcal;
  return datas.map((d) => {
    const k = kcalDoDia(d);
    return k ? diaNaDieta(k, meta) : null;
  });
}

export function diasComRegistro(desde: string, ate: string): string[] {
  return db()
    .all<{ data: string }>('SELECT DISTINCT data FROM consumo WHERE excluido_em IS NULL AND data BETWEEN ? AND ? ORDER BY data DESC', [desde, ate])
    .map((r) => r.data);
}
