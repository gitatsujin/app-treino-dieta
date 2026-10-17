/** Exercícios, plano de treino, sessões, séries e aeróbicos. */
import { escalaDe, idade, kcalAtividade, MET_MUSCULACAO, metAerobico, umRm, type Escala, type TipoAerobico } from '@/lib/calculos';
import { inicioDaSemana, somarDias } from '@/lib/formato';

import { agoraIso, atualizar, db, excluir, gravar, hojeIso, inserir, USUARIO_ID } from './conexao';
import { pesoAtual, usuario } from './perfil';

/* ---------- Exercícios ---------- */

export type Exercicio = { id: string; nome: string; grupo_muscular: string; equipamento: string | null; fonte: string };

export const GRUPOS: Record<string, string> = {
  peito: 'Peito', costas: 'Costas', pernas: 'Pernas', ombros: 'Ombros', bracos: 'Braços', abdomen: 'Abdômen', corpo_todo: 'Corpo todo',
};
export const EQUIPAMENTOS: Record<string, string> = {
  barra: 'Barra', halteres: 'Halteres', maquina: 'Máquina', polia: 'Polia', peso_corporal: 'Peso corporal', outro: 'Outro',
};
export const AEROBICOS: Record<TipoAerobico, string> = {
  esteira: 'Esteira', bicicleta: 'Bicicleta', eliptico: 'Elíptico', corrida_rua: 'Corrida na rua', caminhada: 'Caminhada', outro: 'Outro',
};

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function exercicios(busca = '', grupo?: string): Exercicio[] {
  const todos = db().all<Exercicio>(
    `SELECT id, nome, grupo_muscular, equipamento, fonte FROM exercicio
     WHERE excluido_em IS NULL AND (usuario_id IS NULL OR usuario_id = ?) ${grupo ? 'AND grupo_muscular = ?' : ''}
     ORDER BY nome`,
    grupo ? [USUARIO_ID, grupo] : [USUARIO_ID],
  );
  const q = semAcento(busca.trim());
  return q ? todos.filter((e) => q.split(/\s+/).every((p) => semAcento(e.nome).includes(p))) : todos;
}

export function exercicio(id: string): Exercicio | null {
  return db().get<Exercicio>('SELECT id, nome, grupo_muscular, equipamento, fonte FROM exercicio WHERE id = ?', [id]) ?? null;
}

export function criarExercicio(d: { nome: string; grupo_muscular: string; equipamento: string }) {
  return gravar(() => inserir('exercicio', { ...d, fonte: 'usuario', codigo_met: '02054' }));
}

/* ---------- Plano ---------- */

export type ItemPlano = {
  id: string;
  exercicio_id: string | null;
  exercicio_nome: string | null;
  grupo_muscular: string | null;
  tipo_aerobico: TipoAerobico | null;
  ordem: number;
  series_previstas: number | null;
  reps_min: number | null;
  reps_max: number | null;
  carga_prevista_kg: number | null;
  duracao_prevista_min: number | null;
  observacao: string | null;
};
export type TreinoModelo = { id: string; nome: string; ordem: number; letra: string; itens: ItemPlano[] };
export type Plano = { id: string; nome: string; treinos: TreinoModelo[] };

export const letra = (ordem: number) => String.fromCharCode(65 + ordem);
export const tituloTreino = (t: { letra: string; nome: string }) => (t.nome ? `Treino ${t.letra} · ${t.nome}` : `Treino ${t.letra}`);

export function reps(i: { reps_min: number | null; reps_max: number | null }) {
  if (i.reps_min == null) return '';
  return i.reps_max != null && i.reps_max !== i.reps_min ? `${i.reps_min}–${i.reps_max}` : `${i.reps_min}`;
}
export const prescricao = (i: ItemPlano) =>
  i.tipo_aerobico ? `${AEROBICOS[i.tipo_aerobico]}${i.duracao_prevista_min ? ` · ${i.duracao_prevista_min} min` : ''}` : `${i.series_previstas ?? 3} × ${reps(i) || '—'}`;

/** "6 exercícios + aeróbico · cerca de 55 min" (estimativa de 8 min por exercício). */
export function resumoItens(itens: ItemPlano[]) {
  const ex = itens.filter((i) => !i.tipo_aerobico).length;
  const aer = itens.length - ex;
  const min = Math.round(ex * 8 + itens.reduce((t, i) => t + (i.duracao_prevista_min ?? 0), 0));
  return `${ex} exercício${ex === 1 ? '' : 's'}${aer ? ' + aeróbico' : ''}${min ? ` · cerca de ${min} min` : ''}`;
}

function itensDoTreino(treinoId: string): ItemPlano[] {
  return db().all<ItemPlano>(
    `SELECT i.id, i.exercicio_id, e.nome AS exercicio_nome, e.grupo_muscular, i.tipo_aerobico, i.ordem, i.series_previstas,
            i.reps_min, i.reps_max, i.carga_prevista_kg, i.duracao_prevista_min, i.observacao
     FROM treino_modelo_item i LEFT JOIN exercicio e ON e.id = i.exercicio_id
     WHERE i.treino_modelo_id = ? AND i.excluido_em IS NULL ORDER BY i.ordem`,
    [treinoId],
  );
}

export function treinoModelo(id: string): TreinoModelo | null {
  const t = db().get<{ id: string; nome: string; ordem: number }>('SELECT id, nome, ordem FROM treino_modelo WHERE id = ?', [id]);
  return t ? { ...t, letra: letra(t.ordem), itens: itensDoTreino(t.id) } : null;
}

export function planoAtivo(): Plano | null {
  const p = db().get<{ id: string; nome: string }>('SELECT id, nome FROM plano_treino WHERE ativo = 1 AND excluido_em IS NULL ORDER BY criado_em DESC LIMIT 1');
  if (!p) return null;
  const treinos = db()
    .all<{ id: string; nome: string; ordem: number }>('SELECT id, nome, ordem FROM treino_modelo WHERE plano_treino_id = ? AND excluido_em IS NULL ORDER BY ordem', [p.id])
    .map((t) => ({ ...t, letra: letra(t.ordem), itens: itensDoTreino(t.id) }));
  return { ...p, treinos };
}

export type ItemEntrada = Omit<ItemPlano, 'id' | 'ordem' | 'exercicio_nome' | 'grupo_muscular' | 'observacao'> & { observacao?: string | null };
export type PlanoEntrada = { nome: string; treinos: { id?: string; nome: string; itens: ItemEntrada[] }[] };

/** Cria ou substitui o plano ativo. Treinos existentes mantêm o id, para o histórico continuar ligado a eles. */
export function salvarPlano(entrada: PlanoEntrada, opts: { importacao_id?: string } = {}) {
  return gravar(() => {
    const atual = planoAtivo();
    const planoId = atual?.id ?? inserir('plano_treino', { nome: entrada.nome, ativo: 1, importacao_id: opts.importacao_id });
    if (atual) atualizar('plano_treino', planoId, { nome: entrada.nome });
    const mantidos = new Set<string>();
    entrada.treinos.forEach((t, ordem) => {
      let tid = t.id && atual?.treinos.some((x) => x.id === t.id) ? t.id : undefined;
      if (tid) atualizar('treino_modelo', tid, { nome: t.nome, ordem });
      else tid = inserir('treino_modelo', { plano_treino_id: planoId, nome: t.nome, ordem });
      mantidos.add(tid);
      db().run('UPDATE treino_modelo_item SET excluido_em = ? WHERE treino_modelo_id = ? AND excluido_em IS NULL', [agoraIso(), tid]);
      t.itens.forEach((i, io) =>
        inserir('treino_modelo_item', {
          treino_modelo_id: tid,
          exercicio_id: i.exercicio_id,
          tipo_aerobico: i.tipo_aerobico,
          ordem: io,
          series_previstas: i.tipo_aerobico ? null : (i.series_previstas ?? 3),
          reps_min: i.reps_min,
          reps_max: i.reps_max,
          carga_prevista_kg: i.carga_prevista_kg,
          duracao_prevista_min: i.duracao_prevista_min,
          observacao: i.observacao ?? null,
        }),
      );
    });
    for (const t of atual?.treinos ?? []) if (!mantidos.has(t.id)) excluir('treino_modelo', t.id);
    return planoId;
  });
}

/** Próximo treino da sequência (A → B → C → A), a partir do último realizado. */
export function proximoTreino(plano = planoAtivo()): TreinoModelo | null {
  if (!plano?.treinos.length) return null;
  const ult = db().get<{ treino_modelo_id: string }>(
    `SELECT treino_modelo_id FROM sessao_treino WHERE treino_modelo_id IS NOT NULL AND excluido_em IS NULL ORDER BY inicio DESC LIMIT 1`,
  );
  const i = plano.treinos.findIndex((t) => t.id === ult?.treino_modelo_id);
  return plano.treinos[i < 0 ? 0 : (i + 1) % plano.treinos.length];
}

/* ---------- Séries anteriores ---------- */

export type SerieFeita = { numero: number; carga_kg: number; repeticoes: number };

/** Séries da última sessão em que o exercício foi feito (RF11). */
export function ultimaVez(exercicioId: string, excetoSessao?: string): { data: string; series: SerieFeita[] } | null {
  const s = db().get<{ se: string; inicio: string }>(
    `SELECT se.id AS se, st.inicio FROM sessao_exercicio se JOIN sessao_treino st ON st.id = se.sessao_treino_id
     WHERE se.exercicio_id = ? AND se.excluido_em IS NULL AND st.excluido_em IS NULL AND st.id <> ?
       AND EXISTS (SELECT 1 FROM serie x WHERE x.sessao_exercicio_id = se.id AND x.excluido_em IS NULL)
     ORDER BY st.inicio DESC LIMIT 1`,
    [exercicioId, excetoSessao ?? ''],
  );
  if (!s) return null;
  return { data: s.inicio.slice(0, 10), series: seriesDe(s.se) };
}

function seriesDe(sessaoExercicioId: string): SerieFeita[] {
  return db().all<SerieFeita>('SELECT numero, carga_kg, repeticoes FROM serie WHERE sessao_exercicio_id = ? AND excluido_em IS NULL ORDER BY numero', [sessaoExercicioId]);
}

const fmtN = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
/** "40 kg × 10, 10, 9" */
export function resumoSeries(series: SerieFeita[]): string {
  if (!series.length) return '';
  const cargas = new Set(series.map((s) => s.carga_kg));
  if (cargas.size === 1) return `${fmtN(series[0].carga_kg)} kg × ${series.map((s) => s.repeticoes).join(', ')}`;
  return series.map((s) => `${fmtN(s.carga_kg)} × ${s.repeticoes}`).join(' · ') + '  (kg × reps)';
}
/** Melhor série (maior carga; empate, mais repetições): "55 kg × 12" */
export function melhorSerie(series: SerieFeita[]): SerieFeita | null {
  return series.reduce<SerieFeita | null>((m, s) => (!m || s.carga_kg > m.carga_kg || (s.carga_kg === m.carga_kg && s.repeticoes > m.repeticoes) ? s : m), null);
}
export const textoSerie = (s: SerieFeita | null) => (s ? `${fmtN(s.carga_kg)} kg × ${s.repeticoes}` : '');

/* ---------- Sessões ---------- */

export type Sessao = {
  id: string;
  treino_modelo_id: string | null;
  inicio: string;
  fim: string | null;
  status: 'em_andamento' | 'pausada' | 'concluida' | 'parcial';
  pausada_em: string | null;
  segundos_pausada: number;
  calorias_gastas_kcal: number | null;
};

export function sessao(id: string): Sessao | null {
  return db().get<Sessao>('SELECT * FROM sessao_treino WHERE id = ? AND excluido_em IS NULL', [id]) ?? null;
}

/** Segundos de treino efetivo (sem as pausas). */
export function segundosAtivos(s: Sessao, agora = new Date()): number {
  const fim = s.fim ? new Date(s.fim) : s.pausada_em ? new Date(s.pausada_em) : agora;
  return Math.max(0, (fim.getTime() - new Date(s.inicio).getTime()) / 1000 - s.segundos_pausada);
}

/** RN23: treino aberto de um dia anterior é finalizado como parcial. */
export function fecharSessoesAntigas(hoje = hojeIso()) {
  const antigas = db().all<{ id: string }>(
    "SELECT id FROM sessao_treino WHERE status IN ('em_andamento','pausada') AND substr(inicio, 1, 10) < ? AND excluido_em IS NULL",
    [hoje],
  );
  for (const a of antigas) finalizarSessao(a.id, { forcarParcial: true });
}

/** Treino em andamento ou pausado. */
export function sessaoAberta(): Sessao | null {
  return db().get<Sessao>("SELECT * FROM sessao_treino WHERE status IN ('em_andamento','pausada') AND excluido_em IS NULL ORDER BY inicio DESC LIMIT 1") ?? null;
}

export function iniciarSessao(o: { treinoModeloId?: string | null; exercicioIds?: string[] }) {
  return gravar(() => {
    const aberta = sessaoAberta();
    if (aberta) finalizarSessao(aberta.id);
    const id = inserir('sessao_treino', { treino_modelo_id: o.treinoModeloId ?? null, inicio: agoraIso(), status: 'em_andamento', origem_gasto: 'estimativa' });
    if (o.treinoModeloId) {
      const t = treinoModelo(o.treinoModeloId);
      t?.itens
        .filter((i) => i.exercicio_id)
        .forEach((i, ordem) => inserir('sessao_exercicio', { sessao_treino_id: id, exercicio_id: i.exercicio_id, treino_modelo_item_id: i.id, ordem }));
    }
    (o.exercicioIds ?? []).forEach((e, ordem) => inserir('sessao_exercicio', { sessao_treino_id: id, exercicio_id: e, ordem }));
    return id;
  });
}

export function adicionarExerciciosNaSessao(sessaoId: string, exercicioIds: string[]) {
  gravar(() => {
    const n = db().get<{ n: number }>('SELECT COUNT(*) AS n FROM sessao_exercicio WHERE sessao_treino_id = ? AND excluido_em IS NULL', [sessaoId])?.n ?? 0;
    exercicioIds.forEach((e, i) => inserir('sessao_exercicio', { sessao_treino_id: sessaoId, exercicio_id: e, ordem: n + i }));
  });
}

export type ExercicioDaSessao = {
  id: string;
  exercicio_id: string;
  nome: string;
  grupo_muscular: string;
  ordem: number;
  previsto: ItemPlano | null;
  series: SerieFeita[];
};

export type Aerobico = {
  id: string;
  sessao_treino_id: string | null;
  tipo: TipoAerobico;
  inicio: string;
  duracao_min: number;
  distancia_km: number | null;
  intensidade_escala: Escala | null;
  intensidade_pse: number | null;
  fc_media_bpm: number | null;
  inclinacao_pct: number | null;
  nivel_carga: number | null;
  calorias_gastas_kcal: number | null;
  origem: string;
};

export type SessaoCompleta = Sessao & { titulo: string; subtitulo: string; letra: string | null; exercicios: ExercicioDaSessao[]; aerobicos: Aerobico[]; aerobicoPrevisto: ItemPlano | null };

export function sessaoCompleta(id: string): SessaoCompleta | null {
  const s = sessao(id);
  if (!s) return null;
  const t = s.treino_modelo_id ? treinoModelo(s.treino_modelo_id) : null;
  const exs = db()
    .all<{ id: string; exercicio_id: string; nome: string; grupo_muscular: string; ordem: number; treino_modelo_item_id: string | null }>(
      `SELECT se.id, se.exercicio_id, e.nome, e.grupo_muscular, se.ordem, se.treino_modelo_item_id
       FROM sessao_exercicio se JOIN exercicio e ON e.id = se.exercicio_id
       WHERE se.sessao_treino_id = ? AND se.excluido_em IS NULL ORDER BY se.ordem`,
      [id],
    )
    .map((e) => {
      const previsto =
        (e.treino_modelo_item_id && db().get<ItemPlano>('SELECT * FROM treino_modelo_item WHERE id = ?', [e.treino_modelo_item_id])) || null;
      return { id: e.id, exercicio_id: e.exercicio_id, nome: e.nome, grupo_muscular: e.grupo_muscular, ordem: e.ordem, previsto, series: seriesDe(e.id) };
    });
  const aerobicos = db().all<Aerobico>('SELECT * FROM sessao_aerobico WHERE sessao_treino_id = ? AND excluido_em IS NULL ORDER BY inicio', [id]);
  return {
    ...s,
    titulo: t ? `Treino ${t.letra}` : 'Treino livre',
    subtitulo: t?.nome ?? `${exs.length} exercício${exs.length === 1 ? '' : 's'}`,
    letra: t?.letra ?? null,
    exercicios: exs,
    aerobicos,
    aerobicoPrevisto: t?.itens.find((i) => i.tipo_aerobico) ?? null,
  };
}

/** Marca uma série como feita: grava na hora (RF65). */
export function marcarSerie(sessaoExercicioId: string, numero: number, carga_kg: number, repeticoes: number) {
  gravar(() => {
    const ex = db().get<{ id: string }>('SELECT id FROM serie WHERE sessao_exercicio_id = ? AND numero = ? AND excluido_em IS NULL', [sessaoExercicioId, numero]);
    if (ex) atualizar('serie', ex.id, { carga_kg, repeticoes });
    else inserir('serie', { sessao_exercicio_id: sessaoExercicioId, numero, carga_kg, repeticoes });
  });
}

export function desmarcarSerie(sessaoExercicioId: string, numero: number) {
  gravar(() => {
    const ex = db().get<{ id: string }>('SELECT id FROM serie WHERE sessao_exercicio_id = ? AND numero = ? AND excluido_em IS NULL', [sessaoExercicioId, numero]);
    if (ex) excluir('serie', ex.id);
  });
}

export function pausarSessao(id: string) {
  gravar(() => atualizar('sessao_treino', id, { status: 'pausada', pausada_em: agoraIso() }));
}

export function retomarSessao(id: string) {
  gravar(() => {
    const s = sessao(id);
    if (!s || s.status !== 'pausada') return;
    const pausa = s.pausada_em ? Math.round((Date.now() - new Date(s.pausada_em).getTime()) / 1000) : 0;
    atualizar('sessao_treino', id, { status: 'em_andamento', pausada_em: null, segundos_pausada: s.segundos_pausada + pausa });
  });
}

/** Reabre um treino concluído para corrigir séries (Editar no detalhe da sessão). */
export function reabrirSessao(id: string) {
  gravar(() => atualizar('sessao_treino', id, { status: 'em_andamento', fim: null }));
}

export function volume(series: SerieFeita[]) {
  return series.reduce((t, s) => t + s.carga_kg * s.repeticoes, 0);
}

export type Recorde = { nome: string; serie: SerieFeita; exercicio_id: string };

/** Exercícios em que a sessão superou a maior carga de todas as sessões anteriores. */
export function recordesDaSessao(id: string): Recorde[] {
  const s = sessaoCompleta(id);
  if (!s) return [];
  const out: Recorde[] = [];
  for (const e of s.exercicios) {
    const m = melhorSerie(e.series);
    if (!m) continue;
    const antes = db().get<{ max: number | null }>(
      `SELECT MAX(x.carga_kg) AS max FROM serie x JOIN sessao_exercicio se ON se.id = x.sessao_exercicio_id JOIN sessao_treino st ON st.id = se.sessao_treino_id
       WHERE se.exercicio_id = ? AND st.inicio <= ? AND st.id <> ? AND x.excluido_em IS NULL AND se.excluido_em IS NULL AND st.excluido_em IS NULL`,
      [e.exercicio_id, s.inicio, s.id],
    )?.max;
    if (antes != null && m.carga_kg > antes) out.push({ nome: e.nome, serie: m, exercicio_id: e.exercicio_id });
  }
  return out;
}

/** Finaliza: concluída se fez todas as séries previstas, senão parcial. Sem nada feito, a sessão é descartada. */
export function finalizarSessao(id: string, opts: { forcarParcial?: boolean } = {}) {
  return gravar(() => {
    const s = sessaoCompleta(id);
    if (!s) return null;
    if (s.status === 'concluida' || s.status === 'parcial') return id; // já finalizada
    const feitas = s.exercicios.reduce((t, e) => t + e.series.length, 0);
    if (!feitas && !s.aerobicos.length) {
      excluir('sessao_treino', id);
      return null;
    }
    const completo = s.exercicios.every((e) => e.series.length >= (e.previsto?.series_previstas ?? 1));
    const fim = s.status === 'pausada' && s.pausada_em ? s.pausada_em : agoraIso();
    const seg = segundosAtivos({ ...s, fim, pausada_em: null });
    const peso = pesoAtual()?.peso_kg ?? 70;
    atualizar('sessao_treino', id, {
      status: opts.forcarParcial || !completo ? 'parcial' : 'concluida',
      fim,
      pausada_em: null,
      calorias_gastas_kcal: feitas ? kcalAtividade(MET_MUSCULACAO, peso, seg / 60) : 0,
    });
    return id;
  });
}

export function excluirSessao(id: string) {
  gravar(() => {
    excluir('sessao_treino', id);
    db().run('UPDATE sessao_aerobico SET excluido_em = ? WHERE sessao_treino_id = ?', [agoraIso(), id]);
  });
}

/* ---------- Aeróbicos ---------- */

export type AerobicoEntrada = {
  tipo: TipoAerobico;
  inicio: string;
  duracao_min: number;
  distancia_km: number | null;
  intensidade_escala: Escala | null;
  intensidade_pse: number | null;
  fc_media_bpm: number | null;
  inclinacao_pct: number | null;
  nivel_carga: number | null;
  sessao_treino_id: string | null;
};

export function estimarAerobico(a: Pick<AerobicoEntrada, 'tipo' | 'duracao_min' | 'intensidade_escala' | 'intensidade_pse' | 'fc_media_bpm'>) {
  const u = usuario();
  const anos = u ? idade(u.data_nascimento, hojeIso()) : undefined;
  const met = metAerobico(a.tipo, escalaDe({ escala: a.intensidade_escala, pse: a.intensidade_pse, fc: a.fc_media_bpm, idade: anos }));
  return { met, kcal: kcalAtividade(met, pesoAtual()?.peso_kg ?? 70, a.duracao_min) };
}

export function registrarAerobico(a: AerobicoEntrada, id?: string) {
  return gravar(() => {
    const dados = { ...a, calorias_gastas_kcal: estimarAerobico(a).kcal, origem: 'manual' };
    if (id) {
      atualizar('sessao_aerobico', id, dados);
      return id;
    }
    return inserir('sessao_aerobico', dados);
  });
}

export function aerobico(id: string): Aerobico | null {
  return db().get<Aerobico>('SELECT * FROM sessao_aerobico WHERE id = ? AND excluido_em IS NULL', [id]) ?? null;
}

export function excluirAerobico(id: string) {
  gravar(() => excluir('sessao_aerobico', id));
}

export function descreverAerobico(a: Aerobico): string {
  const p: string[] = [];
  if (a.distancia_km) p.push(`${fmtN(a.distancia_km)} km`);
  if (a.inclinacao_pct) p.push(`inclinação ${fmtN(a.inclinacao_pct)}%`);
  if (a.nivel_carga) p.push(`nível ${fmtN(a.nivel_carga)}`);
  if (a.intensidade_escala) p.push(a.intensidade_escala);
  else if (a.intensidade_pse) p.push(`esforço ${a.intensidade_pse}/10`);
  else if (a.fc_media_bpm) p.push(`${a.fc_media_bpm} bpm`);
  return p.join(' · ');
}

/* ---------- Histórico ---------- */

export type ItemHistorico = {
  id: string;
  tipo: 'treino' | 'aerobico';
  inicio: string;
  titulo: string;
  detalhe: string;
  valor: string;
  unidade: 'volume' | 'gasto';
  minutos: number;
  kcal: number;
  parcial?: boolean;
};

export function historico(desde?: string): ItemHistorico[] {
  const filtro = desde ? 'AND substr(inicio,1,10) >= ?' : '';
  const ps = desde ? [desde] : [];
  const sessoes = db().all<Sessao>(`SELECT * FROM sessao_treino WHERE status IN ('concluida','parcial') AND excluido_em IS NULL ${filtro} ORDER BY inicio DESC`, ps);
  const out: ItemHistorico[] = sessoes.map((s) => {
    const c = sessaoCompleta(s.id)!;
    const series = c.exercicios.flatMap((e) => e.series);
    const vol = volume(series);
    const min = segundosAtivos(s) / 60;
    const nEx = c.exercicios.filter((e) => e.series.length).length;
    const aer = c.aerobicos.map((a) => AEROBICOS[a.tipo].toLowerCase()).join(', ');
    const kcalAer = c.aerobicos.reduce((t, a) => t + (a.calorias_gastas_kcal ?? 0), 0);
    return {
      id: s.id,
      tipo: 'treino',
      inicio: s.inicio,
      titulo: c.letra ? `${c.titulo} · ${c.subtitulo}` : c.titulo,
      detalhe: `${Math.round(min)} min · ${nEx} exercício${nEx === 1 ? '' : 's'}${aer ? ` + ${aer}` : ''}${s.status === 'parcial' ? ' · parcial' : ''}`,
      valor: `${Math.round(vol).toLocaleString('pt-BR')} kg`,
      unidade: 'volume',
      minutos: min + c.aerobicos.reduce((t, a) => t + a.duracao_min, 0),
      kcal: (s.calorias_gastas_kcal ?? 0) + kcalAer,
      parcial: s.status === 'parcial',
    };
  });
  const aers = db().all<Aerobico>(`SELECT * FROM sessao_aerobico WHERE sessao_treino_id IS NULL AND excluido_em IS NULL ${filtro} ORDER BY inicio DESC`, ps);
  for (const a of aers) {
    out.push({
      id: a.id,
      tipo: 'aerobico',
      inicio: a.inicio,
      titulo: AEROBICOS[a.tipo],
      detalhe: [`${Math.round(a.duracao_min)} min`, descreverAerobico(a)].filter(Boolean).join(' · '),
      valor: `${a.calorias_gastas_kcal ?? 0} kcal`,
      unidade: 'gasto',
      minutos: a.duracao_min,
      kcal: a.calorias_gastas_kcal ?? 0,
    });
  }
  return out.sort((a, b) => b.inicio.localeCompare(a.inicio));
}

/** Contagem da semana (RN07): treinos de musculação e aeróbicos, separados. */
export function semana(data = hojeIso()) {
  const ini = inicioDaSemana(data);
  const fim = somarDias(ini, 6);
  const dias = db().all<{ d: string }>(
    `SELECT DISTINCT substr(st.inicio,1,10) AS d FROM sessao_treino st
     WHERE st.status IN ('concluida','parcial') AND st.excluido_em IS NULL AND substr(st.inicio,1,10) BETWEEN ? AND ?
       AND EXISTS (SELECT 1 FROM sessao_exercicio se JOIN serie x ON x.sessao_exercicio_id = se.id WHERE se.sessao_treino_id = st.id AND x.excluido_em IS NULL AND se.excluido_em IS NULL)`,
    [ini, fim],
  );
  const treinos =
    db().get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sessao_treino st WHERE st.status IN ('concluida','parcial') AND st.excluido_em IS NULL AND substr(st.inicio,1,10) BETWEEN ? AND ?
       AND EXISTS (SELECT 1 FROM sessao_exercicio se JOIN serie x ON x.sessao_exercicio_id = se.id WHERE se.sessao_treino_id = st.id AND x.excluido_em IS NULL AND se.excluido_em IS NULL)`,
      [ini, fim],
    )?.n ?? 0;
  const aerobicos = db().get<{ n: number }>('SELECT COUNT(*) AS n FROM sessao_aerobico WHERE excluido_em IS NULL AND substr(inicio,1,10) BETWEEN ? AND ?', [ini, fim])?.n ?? 0;
  const diasAer = db().all<{ d: string }>('SELECT DISTINCT substr(inicio,1,10) AS d FROM sessao_aerobico WHERE excluido_em IS NULL AND substr(inicio,1,10) BETWEEN ? AND ?', [ini, fim]);
  return { inicio: ini, fim, treinos, aerobicos, diasComTreino: new Set([...dias, ...diasAer].map((x) => x.d)) };
}

/** Calorias gastas em atividades num dia (sem a TMB). */
export function gastoAtividadesDoDia(data: string): number {
  const s = db().get<{ k: number | null }>("SELECT SUM(calorias_gastas_kcal) AS k FROM sessao_treino WHERE excluido_em IS NULL AND status IN ('concluida','parcial') AND substr(inicio,1,10) = ?", [data])?.k ?? 0;
  const a = db().get<{ k: number | null }>('SELECT SUM(calorias_gastas_kcal) AS k FROM sessao_aerobico WHERE excluido_em IS NULL AND substr(inicio,1,10) = ?', [data])?.k ?? 0;
  return s + a;
}

/* ---------- Evolução do exercício ---------- */

export type PontoEvolucao = { data: string; melhor: SerieFeita; volume: number };

export function evolucao(exercicioId: string, desde?: string): PontoEvolucao[] {
  const linhas = db().all<{ se: string; inicio: string }>(
    `SELECT se.id AS se, st.inicio FROM sessao_exercicio se JOIN sessao_treino st ON st.id = se.sessao_treino_id
     WHERE se.exercicio_id = ? AND se.excluido_em IS NULL AND st.excluido_em IS NULL ${desde ? 'AND substr(st.inicio,1,10) >= ?' : ''}
     ORDER BY st.inicio`,
    desde ? [exercicioId, desde] : [exercicioId],
  );
  return linhas
    .map((l) => {
      const ss = seriesDe(l.se);
      const m = melhorSerie(ss);
      return m ? { data: l.inicio.slice(0, 10), melhor: m, volume: volume(ss) } : null;
    })
    .filter((x): x is PontoEvolucao => !!x);
}

export function melhorDeTodos(exercicioId: string) {
  const pts = evolucao(exercicioId);
  const melhor = melhorSerie(pts.map((p) => p.melhor));
  const rm = pts.reduce((m, p) => Math.max(m, umRm(p.melhor.carga_kg, p.melhor.repeticoes)), 0);
  return { melhor, umRm: rm, data: melhor ? pts.find((p) => p.melhor === melhor || (p.melhor.carga_kg === melhor.carga_kg && p.melhor.repeticoes === melhor.repeticoes))?.data : undefined };
}

/** Maior carga já feita no exercício desde uma data (progresso de meta de carga). */
export function maiorCarga(exercicioId: string, desde?: string): number | null {
  return (
    db().get<{ m: number | null }>(
      `SELECT MAX(x.carga_kg) AS m FROM serie x JOIN sessao_exercicio se ON se.id = x.sessao_exercicio_id JOIN sessao_treino st ON st.id = se.sessao_treino_id
       WHERE se.exercicio_id = ? AND x.excluido_em IS NULL AND se.excluido_em IS NULL AND st.excluido_em IS NULL ${desde ? 'AND substr(st.inicio,1,10) >= ?' : ''}`,
      desde ? [exercicioId, desde] : [exercicioId],
    )?.m ?? null
  );
}

/** Último recorde pessoal (para o card da Início). */
export function ultimoRecorde(): (Recorde & { data: string }) | null {
  const ss = db().all<{ id: string; inicio: string }>(
    "SELECT id, inicio FROM sessao_treino WHERE status IN ('concluida','parcial') AND excluido_em IS NULL ORDER BY inicio DESC LIMIT 10",
  );
  for (const s of ss) {
    const r = recordesDaSessao(s.id)[0];
    if (r) return { ...r, data: s.inicio.slice(0, 10) };
  }
  return null;
}
