/**
 * Grava no banco o que veio do Apple Saúde / Health Connect. Independente da plataforma (testável em Node).
 *
 * - Energia ativa do dia → gasto_ativo_diario. Com ela, o gasto do dia usa o relógio (RN11) e as
 *   sessões não são somadas de novo (modelo de dados › Gasto do dia).
 * - Treinos aeróbicos do relógio → sessao_aerobico (origem apple_saude / health_connect), atualizados
 *   a cada sincronização enquanto o usuário não editar.
 * - Treinos de força do relógio → só as calorias, na sessão do app que estiver no mesmo horário.
 * - Duplicidade (RN13): aeróbico manual no mesmo horário de um do relógio → fica o do relógio e o app
 *   pergunta se o usuário quer usar o que ele registrou.
 * - Peso → registro_peso (origem integracao), um por dia, sem passar por cima de pesagem manual.
 * - Menstruação → ciclo_menstrual, só com o registro do ciclo ativo.
 */
import { agoraIso, atualizar, db, excluir, gravar, hojeIso, inserir } from '@/db/conexao';
import { definirPref, pref } from '@/db/perfil';
import { estimarAerobico } from '@/db/treino';

import type { DadosSaude, DiaMenstruacao, ProvedorSaude, TreinoExterno } from './tipos';

export type Integracao = { id: string; provedor: ProvedorSaude; ativa: boolean; ultima_sincronizacao: string | null };

export type ResumoSincronizacao = {
  dias: number;
  aerobicosNovos: number;
  aerobicosAtualizados: number;
  sessoesComCalorias: number;
  pesos: number;
  ciclos: number;
  duplicidades: number;
};

export function integracao(): Integracao | null {
  const r = db().get<{ id: string; provedor: ProvedorSaude; ativa: number; ultima_sincronizacao: string | null }>(
    'SELECT id, provedor, ativa, ultima_sincronizacao FROM integracao WHERE excluido_em IS NULL ORDER BY ativa DESC, atualizado_em DESC LIMIT 1',
  );
  return r ? { ...r, ativa: !!r.ativa } : null;
}

export function integracaoAtiva(): Integracao | null {
  const i = integracao();
  return i?.ativa ? i : null;
}

export function ativarIntegracao(provedor: ProvedorSaude) {
  gravar(() => {
    const r = db().get<{ id: string }>('SELECT id FROM integracao WHERE provedor = ? AND excluido_em IS NULL', [provedor]);
    if (r) atualizar('integracao', r.id, { ativa: 1 });
    else inserir('integracao', { provedor, ativa: 1 });
  });
}

/**
 * Desliga a integração. Os dados já importados continuam; a energia do relógio deixa de valer para o
 * gasto (volta a estimativa), porque sem sincronizar ela ficaria desatualizada.
 */
export function desativarIntegracao() {
  gravar(() => {
    const i = integracao();
    if (!i) return;
    atualizar('integracao', i.id, { ativa: 0 });
    db().run('UPDATE gasto_ativo_diario SET excluido_em = ? WHERE excluido_em IS NULL', [agoraIso()]);
  });
}

/* ---------- utilidades ---------- */

const dataLocal = (d: Date) => hojeIso(d);
const fimDe = (inicio: string, min: number) => new Date(new Date(inicio).getTime() + min * 60_000);
const sobrepoe = (a0: Date, a1: Date, b0: Date, b1: Date) => a0 < b1 && b0 < a1;

type Pendente = { relogio: string; manual: string };
const lerLista = <T>(chave: string): T[] => {
  try {
    return JSON.parse(pref(chave) ?? '[]') as T[];
  } catch {
    return [];
  }
};
const PENDENTES = 'saude_duplicidades';
const RESOLVIDAS = 'saude_duplicidades_resolvidas';

/* ---------- aplicar ---------- */

export function aplicarDadosSaude(provedor: ProvedorSaude, dados: DadosSaude, opts: { lerCiclo: boolean; agora?: Date } = { lerCiclo: false }): ResumoSincronizacao {
  const agora = opts.agora ?? new Date();
  const r: ResumoSincronizacao = { dias: 0, aerobicosNovos: 0, aerobicosAtualizados: 0, sessoesComCalorias: 0, pesos: 0, ciclos: 0, duplicidades: 0 };
  gravar(() => {
    // Energia ativa por dia
    for (const e of dados.energia) {
      const kcal = Math.round(e.kcal);
      if (kcal <= 0) continue;
      const ex = db().get<{ id: string }>('SELECT id FROM gasto_ativo_diario WHERE data = ? AND origem = ?', [e.data, provedor]);
      if (ex) db().run('UPDATE gasto_ativo_diario SET energia_ativa_kcal = ?, sincronizado_em = ?, excluido_em = NULL, atualizado_em = ? WHERE id = ?', [kcal, agoraIso(agora), agoraIso(agora), ex.id]);
      else inserir('gasto_ativo_diario', { data: e.data, energia_ativa_kcal: kcal, origem: provedor, sincronizado_em: agoraIso(agora) });
      r.dias++;
    }

    for (const t of dados.treinos) {
      if (t.duracao_min <= 0) continue;
      if (t.categoria === 'forca') aplicarForca(t, r);
      else aplicarAerobico(provedor, t, r);
    }

    aplicarPesos(dados, r);
    if (opts.lerCiclo) aplicarMenstruacao(provedor, dados.menstruacao, r);

    const i = db().get<{ id: string }>('SELECT id FROM integracao WHERE provedor = ? AND excluido_em IS NULL', [provedor]);
    if (i) atualizar('integracao', i.id, { ultima_sincronizacao: agoraIso(agora) });
  });
  r.duplicidades = detectarDuplicidades();
  return r;
}

function aplicarAerobico(provedor: ProvedorSaude, t: TreinoExterno, r: ResumoSincronizacao) {
  const inicio = agoraIso(t.inicio);
  const kcal = t.calorias_kcal != null ? Math.round(t.calorias_kcal) : null;
  const ex = db().get<{ id: string; editado_pelo_usuario: number; excluido_em: string | null }>('SELECT id, editado_pelo_usuario, excluido_em FROM sessao_aerobico WHERE id_externo = ? AND origem = ?', [t.id, provedor]);
  if (ex) {
    // Apagado pelo usuário ou editado por ele: o relógio não passa por cima.
    if (ex.excluido_em || ex.editado_pelo_usuario) return;
    atualizar('sessao_aerobico', ex.id, { tipo: t.tipo, inicio, duracao_min: round1(t.duracao_min), distancia_km: t.distancia_km, fc_media_bpm: t.fc_media_bpm, calorias_gastas_kcal: kcal });
    r.aerobicosAtualizados++;
    return;
  }
  const estimado = kcal ?? estimarAerobico({ tipo: t.tipo, duracao_min: t.duracao_min, intensidade_escala: null, intensidade_pse: null, fc_media_bpm: t.fc_media_bpm }).kcal;
  // Se o aeróbico do relógio caiu dentro de um treino feito no app, fica ligado a ele.
  const sessao = sessaoNoHorario(t.inicio, t.fim);
  inserir('sessao_aerobico', {
    sessao_treino_id: sessao?.id ?? null,
    tipo: t.tipo,
    inicio,
    duracao_min: round1(t.duracao_min),
    distancia_km: t.distancia_km,
    fc_media_bpm: t.fc_media_bpm,
    calorias_gastas_kcal: estimado,
    origem: provedor,
    id_externo: t.id,
  });
  r.aerobicosNovos++;
}

function sessaoNoHorario(ini: Date, fim: Date) {
  const dia = dataLocal(ini);
  const cands = db().all<{ id: string; inicio: string; fim: string | null }>(
    "SELECT id, inicio, fim FROM sessao_treino WHERE excluido_em IS NULL AND status IN ('concluida','parcial') AND substr(inicio,1,10) BETWEEN ? AND ?",
    [hojeIso(new Date(ini.getTime() - 86_400_000)), dia],
  );
  return cands.find((s) => sobrepoe(new Date(s.inicio), s.fim ? new Date(s.fim) : fimDe(s.inicio, 60), ini, fim)) ?? null;
}

function aplicarForca(t: TreinoExterno, r: ResumoSincronizacao) {
  if (t.calorias_kcal == null) return;
  const s = sessaoNoHorario(t.inicio, t.fim);
  if (!s) return; // Treino de força só do relógio: as calorias já estão na energia ativa do dia.
  atualizar('sessao_treino', s.id, { calorias_gastas_kcal: Math.round(t.calorias_kcal), origem_gasto: 'integracao' });
  r.sessoesComCalorias++;
}

function aplicarPesos(dados: DadosSaude, r: ResumoSincronizacao) {
  // Uma pesagem por dia: a última do dia.
  const porDia = new Map<string, { kg: number; quando: Date }>();
  for (const p of dados.pesos) {
    const a = porDia.get(p.data);
    if (!a || p.quando > a.quando) porDia.set(p.data, { kg: p.kg, quando: p.quando });
  }
  for (const [data, p] of porDia) {
    const kg = Math.round(p.kg * 10) / 10;
    if (kg < 20 || kg > 400) continue;
    const manual = db().get<{ id: string }>("SELECT id FROM registro_peso WHERE data = ? AND origem IN ('manual','bioimpedancia') AND excluido_em IS NULL", [data]);
    if (manual) continue;
    const ex = db().get<{ id: string; peso_kg: number; excluido_em: string | null }>("SELECT id, peso_kg, excluido_em FROM registro_peso WHERE data = ? AND origem = 'integracao'", [data]);
    if (ex) {
      if (ex.excluido_em || ex.peso_kg === kg) continue;
      atualizar('registro_peso', ex.id, { peso_kg: kg });
    } else inserir('registro_peso', { data, peso_kg: kg, origem: 'integracao' });
    r.pesos++;
  }
}

/** Agrupa dias seguidos (com até 1 dia de folga) em menstruações. */
export function agruparMenstruacao(dias: DiaMenstruacao[]) {
  const ord = [...new Map(dias.map((d) => [d.data, d])).values()].sort((a, b) => a.data.localeCompare(b.data));
  const grupos: { inicio: string; fim: string; fluxos: DiaMenstruacao['fluxo'][] }[] = [];
  for (const d of ord) {
    const g = grupos[grupos.length - 1];
    const gap = g ? (new Date(`${d.data}T12:00:00`).getTime() - new Date(`${g.fim}T12:00:00`).getTime()) / 86_400_000 : 99;
    if (g && gap <= 2) {
      g.fim = d.data;
      g.fluxos.push(d.fluxo);
    } else grupos.push({ inicio: d.data, fim: d.data, fluxos: [d.fluxo] });
  }
  return grupos.map((g) => {
    const cont = new Map<string, number>();
    for (const f of g.fluxos) if (f) cont.set(f, (cont.get(f) ?? 0) + 1);
    const fluxo = [...cont.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { inicio: g.inicio, fim: g.fim, fluxo: fluxo as DiaMenstruacao['fluxo'] };
  });
}

function aplicarMenstruacao(provedor: ProvedorSaude, dias: DiaMenstruacao[], r: ResumoSincronizacao) {
  const hoje = hojeIso();
  for (const g of agruparMenstruacao(dias)) {
    const sobre = db().all<{ id: string; origem: string; data_inicio: string; data_fim: string | null }>(
      'SELECT id, origem, data_inicio, data_fim FROM ciclo_menstrual WHERE excluido_em IS NULL AND data_inicio <= ? AND COALESCE(data_fim, ?) >= ?',
      [g.fim, hoje, g.inicio],
    );
    if (sobre.some((c) => c.origem === 'manual')) continue; // o registro da usuária vale
    const meu = sobre.find((c) => c.origem === provedor);
    // Menstruação que termina hoje pode continuar: fica em aberto.
    const fim = g.fim >= hoje ? null : g.fim;
    if (meu) {
      if (meu.data_inicio === g.inicio && meu.data_fim === fim) continue;
      atualizar('ciclo_menstrual', meu.id, { data_inicio: g.inicio < meu.data_inicio ? g.inicio : meu.data_inicio, data_fim: fim, intensidade_fluxo: g.fluxo });
    } else inserir('ciclo_menstrual', { data_inicio: g.inicio, data_fim: fim, intensidade_fluxo: g.fluxo, origem: provedor, id_externo: `${provedor}:${g.inicio}` });
    r.ciclos++;
  }
}

/* ---------- Duplicidade (RN13) ---------- */

/** Procura aeróbicos manuais no mesmo horário de um do relógio. O manual sai da conta até o usuário decidir. */
export function detectarDuplicidades(): number {
  const pend = lerLista<Pendente>(PENDENTES);
  const resolvidas = new Set(lerLista<string>(RESOLVIDAS));
  const relogio = db().all<{ id: string; inicio: string; duracao_min: number }>("SELECT id, inicio, duracao_min FROM sessao_aerobico WHERE excluido_em IS NULL AND origem <> 'manual' AND editado_pelo_usuario = 0 AND inicio >= ?", [hojeIso(new Date(Date.now() - 60 * 86_400_000))]);
  if (!relogio.length) return pend.length;
  const manuais = db().all<{ id: string; inicio: string; duracao_min: number }>("SELECT id, inicio, duracao_min FROM sessao_aerobico WHERE excluido_em IS NULL AND origem = 'manual' AND inicio >= ?", [hojeIso(new Date(Date.now() - 61 * 86_400_000))]);
  let novas = 0;
  gravar(() => {
    for (const m of manuais) {
      const m0 = new Date(m.inicio);
      const m1 = fimDe(m.inicio, m.duracao_min);
      const w = relogio.find((x) => sobrepoe(m0, m1, new Date(x.inicio), fimDe(x.inicio, x.duracao_min)));
      if (!w || resolvidas.has(`${w.id}|${m.id}`) || pend.some((p) => p.manual === m.id)) continue;
      pend.push({ relogio: w.id, manual: m.id });
      excluir('sessao_aerobico', m.id); // não conta em dobro enquanto o usuário não decide
      novas++;
    }
    if (novas) definirPref(PENDENTES, JSON.stringify(pend));
  });
  return pend.length;
}

export type Duplicidade = { relogio: AerobicoResumo; manual: AerobicoResumo };
type AerobicoResumo = { id: string; tipo: string; inicio: string; duracao_min: number; distancia_km: number | null; calorias_gastas_kcal: number | null; origem: string };

export function duplicidadesPendentes(): Duplicidade[] {
  const um = (id: string) => db().get<AerobicoResumo>('SELECT id, tipo, inicio, duracao_min, distancia_km, calorias_gastas_kcal, origem FROM sessao_aerobico WHERE id = ?', [id]);
  return lerLista<Pendente>(PENDENTES)
    .map((p) => ({ relogio: um(p.relogio), manual: um(p.manual) }))
    .filter((d): d is Duplicidade => !!d.relogio && !!d.manual);
}

/**
 * Resolve a duplicidade. "Usar o meu" copia o que o usuário registrou para o registro do relógio e o
 * marca como editado, para a próxima sincronização não desfazer. "Manter relógio" só descarta o manual.
 */
export function resolverDuplicidade(manualId: string, usarMeu: boolean) {
  gravar(() => {
    const pend = lerLista<Pendente>(PENDENTES);
    const p = pend.find((x) => x.manual === manualId);
    if (!p) return;
    if (usarMeu) {
      const m = db().get<Record<string, unknown>>('SELECT * FROM sessao_aerobico WHERE id = ?', [p.manual]);
      if (m) {
        const campos = ['tipo', 'inicio', 'duracao_min', 'distancia_km', 'intensidade_escala', 'intensidade_pse', 'fc_media_bpm', 'inclinacao_pct', 'nivel_carga', 'calorias_gastas_kcal'];
        atualizar('sessao_aerobico', p.relogio, { ...Object.fromEntries(campos.map((c) => [c, m[c] as never])), editado_pelo_usuario: 1 });
      }
    }
    definirPref(PENDENTES, JSON.stringify(pend.filter((x) => x !== p)));
    definirPref(RESOLVIDAS, JSON.stringify([...lerLista<string>(RESOLVIDAS), `${p.relogio}|${p.manual}`].slice(-200)));
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;
