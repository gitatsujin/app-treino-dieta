/**
 * Notificações locais (RF56–RF63): decide o que avisar e quando. Função pura, sem módulo nativo —
 * o agendamento de fato fica em index.ts. Tudo é gerado no próprio aparelho (RF63).
 */
import { somarDias } from '@/lib/formato';

/* ---------- Preferências (RF62) ---------- */

export type ConfigNotificacoes = {
  /** RF56: dias da semana (0 = domingo … 6 = sábado) e horário. */
  treino: { ativo: boolean; dias: number[]; hora: string };
  /** RF57: na hora de cada refeição da dieta. */
  refeicoes: { ativo: boolean };
  /** RF58: meta atingida e meta a 3 dias do prazo. */
  metas: { ativo: boolean };
  /** RF59: calorias do dia acima da margem de +7% da meta. */
  calorias: { ativo: boolean };
  /** RF60: pesagem a cada N dias. */
  peso: { ativo: boolean; dias: number };
  /** RF60: bioimpedância a cada N meses. */
  bio: { ativo: boolean; meses: number };
  /** RF61: N dias antes da menstruação prevista. */
  ciclo: { ativo: boolean; diasAntes: number };
  /** Hora dos lembretes de data (pesagem, bio, prazo de meta, ciclo). */
  horaLembretes: string;
};

export const CONFIG_PADRAO: ConfigNotificacoes = {
  treino: { ativo: false, dias: [1, 2, 3, 4, 5], hora: '18:00' },
  refeicoes: { ativo: true },
  metas: { ativo: true },
  calorias: { ativo: true },
  peso: { ativo: true, dias: 15 },
  bio: { ativo: true, meses: 3 },
  ciclo: { ativo: true, diasAntes: 2 },
  horaLembretes: '09:00',
};

/** Junta o que está salvo com o padrão (campos novos ganham o valor padrão). */
export function completarConfig(salva: Partial<ConfigNotificacoes> | null | undefined): ConfigNotificacoes {
  const c = { ...CONFIG_PADRAO } as Record<string, unknown>;
  for (const [k, v] of Object.entries(salva ?? {})) {
    const base = (CONFIG_PADRAO as Record<string, unknown>)[k];
    c[k] = base && typeof base === 'object' && !Array.isArray(base) && v && typeof v === 'object' ? { ...base, ...v } : (v ?? base);
  }
  return c as ConfigNotificacoes;
}

/* ---------- O que agendar ---------- */

export type Gatilho = { tipo: 'semanal'; diaSemana: number; hora: number; minuto: number } | { tipo: 'diario'; hora: number; minuto: number } | { tipo: 'data'; quando: Date };

export type Agendada = { id: string; titulo: string; corpo: string; gatilho: Gatilho; rota: string };

export type EstadoNotificacoes = {
  config: ConfigNotificacoes;
  agora: Date;
  hoje: string;
  planoTreino: string | null;
  refeicoes: { nome: string; horario: string | null }[];
  ultimoPeso: string | null;
  ultimaBio: string | null;
  metasComPrazo: { id: string; nome: string; prazo: string }[];
  cicloAtivo: boolean;
  proximaMenstruacao: string | null;
};

const hm = (h: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h);
  return m ? { hora: Math.min(23, Number(m[1])), minuto: Math.min(59, Number(m[2])) } : { hora: 9, minuto: 0 };
};
const emData = (dia: string, hora: string) => {
  const { hora: h, minuto } = hm(hora);
  return new Date(`${dia}T${String(h).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`);
};
const diasDesde = (dia: string, quando: Date) => Math.round((quando.getTime() - new Date(`${dia}T00:00:00`).getTime()) / 86_400_000);
const mesesDesde = (dia: string, quando: Date) => {
  const m = Math.max(1, Math.round(diasDesde(dia, quando) / 30.4));
  return `${m} ${m === 1 ? 'mês' : 'meses'}`;
};
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * Lembrete de algo que vence de tempos em tempos (pesagem, bioimpedância): na data em que vence e,
 * se já passou, a cada `repetir` dias até o usuário registrar.
 */
function proximoVencimento(ultimo: string, intervalo: number, repetir: number, e: EstadoNotificacoes): Date | null {
  let dia = somarDias(ultimo, intervalo);
  let quando = emData(dia, e.config.horaLembretes);
  for (let i = 0; quando <= e.agora && i < 400; i++) {
    dia = somarDias(dia, repetir);
    quando = emData(dia, e.config.horaLembretes);
  }
  return quando > e.agora ? quando : null;
}

export function planejar(e: EstadoNotificacoes): Agendada[] {
  const c = e.config;
  const out: Agendada[] = [];

  if (c.treino.ativo) {
    const { hora, minuto } = hm(c.treino.hora);
    for (const d of [...new Set(c.treino.dias)].sort()) {
      if (d < 0 || d > 6) continue;
      out.push({
        id: `treino-${d}`,
        titulo: 'Hora do treino',
        corpo: e.planoTreino ? `Seu treino de ${DIAS[d]} do plano ${e.planoTreino} está esperando.` : 'Bora registrar o treino de hoje?',
        gatilho: { tipo: 'semanal', diaSemana: d + 1, hora, minuto },
        rota: '/treino',
      });
    }
  }

  if (c.refeicoes.ativo) {
    e.refeicoes.forEach((r, i) => {
      if (!r.horario || !/^\d{1,2}:\d{2}$/.test(r.horario)) return;
      out.push({ id: `refeicao-${i}`, titulo: `${r.nome} · ${r.horario}`, corpo: 'Hora da refeição. Depois de comer, registre no app para manter o dia em dia.', gatilho: { tipo: 'diario', ...hm(r.horario) }, rota: '/dieta' });
    });
  }

  if (c.metas.ativo) {
    for (const m of e.metasComPrazo) {
      const quando = emData(somarDias(m.prazo, -3), c.horaLembretes);
      if (quando > e.agora) out.push({ id: `meta-prazo-${m.id}`, titulo: 'Prazo da meta chegando', corpo: `Faltam 3 dias para o prazo da meta: ${m.nome}.`, gatilho: { tipo: 'data', quando }, rota: '/metas' });
    }
  }

  if (c.peso.ativo && e.ultimoPeso && c.peso.dias > 0) {
    const quando = proximoVencimento(e.ultimoPeso, c.peso.dias, 3, e);
    if (quando) out.push({ id: 'peso', titulo: 'Hora de se pesar', corpo: `Já faz ${diasDesde(e.ultimoPeso, quando)} dias desde a última pesagem. Registre seu peso para acompanhar a evolução.`, gatilho: { tipo: 'data', quando }, rota: '/perfil/peso' });
  }

  if (c.bio.ativo && e.ultimaBio && c.bio.meses > 0) {
    const quando = proximoVencimento(e.ultimaBio, Math.round(c.bio.meses * 30.4), 7, e);
    if (quando) out.push({ id: 'bio', titulo: 'Nova bioimpedância', corpo: `Seu último exame foi há ${mesesDesde(e.ultimaBio, quando)}. Que tal fazer um novo para ver a evolução?`, gatilho: { tipo: 'data', quando }, rota: '/perfil/bioimpedancia' });
  }

  if (c.ciclo.ativo && e.cicloAtivo && e.proximaMenstruacao) {
    const quando = emData(somarDias(e.proximaMenstruacao, -c.ciclo.diasAntes), c.horaLembretes);
    // Texto discreto: aparece na tela bloqueada (RN20).
    if (quando > e.agora) out.push({ id: 'ciclo', titulo: 'Lembrete do ciclo', corpo: c.ciclo.diasAntes === 1 ? 'A próxima menstruação está prevista para amanhã.' : `A próxima menstruação está prevista para daqui a ${c.ciclo.diasAntes} dias.`, gatilho: { tipo: 'data', quando }, rota: '/perfil/ciclo' });
  }

  return out;
}

/* ---------- Alertas imediatos (RF58, RF59) ---------- */

export type EstadoAlertas = {
  config: ConfigNotificacoes;
  hoje: string;
  kcalHoje: number;
  metaKcal: number | null;
  metasAtingidas: { id: string; nome: string }[];
  /** Chaves já avisadas (para não repetir). */
  avisados: Set<string>;
};

export type Alerta = { chave: string; titulo: string; corpo: string; rota: string };

export function alertasImediatos(e: EstadoAlertas): Alerta[] {
  const out: Alerta[] = [];
  if (e.config.calorias.ativo && e.metaKcal && e.kcalHoje > e.metaKcal * 1.07) {
    const chave = `calorias-${e.hoje}`;
    if (!e.avisados.has(chave))
      out.push({ chave, titulo: 'Calorias acima da meta', corpo: `Você já consumiu ${Math.round(e.kcalHoje)} kcal hoje, acima da margem de 7% da meta de ${Math.round(e.metaKcal)} kcal.`, rota: '/dieta' });
  }
  if (e.config.metas.ativo)
    for (const m of e.metasAtingidas) {
      const chave = `meta-${m.id}`;
      if (!e.avisados.has(chave)) out.push({ chave, titulo: 'Meta atingida! 🎉', corpo: `Você chegou lá: ${m.nome}.`, rota: '/' });
    }
  return out;
}
