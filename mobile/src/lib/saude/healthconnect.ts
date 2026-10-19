/**
 * Adaptador do Health Connect (Android) com react-native-health-connect.
 * Só existe no app instalável; fora dele responde "indisponível".
 */
import { hojeIso } from '@/db/conexao';
import type { TipoAerobico } from '@/lib/calculos';

import type { AdaptadorSaude, DadosSaude, DiaMenstruacao, TreinoExterno } from './tipos';

type HC = typeof import('react-native-health-connect');

function hc(): HC | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect') as HC;
  } catch {
    return null;
  }
}

/** ExerciseSessionRecord.exerciseType → tipo do app. */
const TIPOS: Record<number, { tipo: TipoAerobico; nome: string; forca?: boolean }> = {
  56: { tipo: 'corrida_rua', nome: 'Corrida' },
  57: { tipo: 'esteira', nome: 'Esteira' },
  79: { tipo: 'caminhada', nome: 'Caminhada' },
  37: { tipo: 'caminhada', nome: 'Trilha' },
  8: { tipo: 'bicicleta', nome: 'Ciclismo' },
  9: { tipo: 'bicicleta', nome: 'Bicicleta ergométrica' },
  25: { tipo: 'eliptico', nome: 'Elíptico' },
  53: { tipo: 'outro', nome: 'Remo' },
  54: { tipo: 'outro', nome: 'Remo ergômetro' },
  68: { tipo: 'outro', nome: 'Escada' },
  69: { tipo: 'outro', nome: 'Escada (aparelho)' },
  73: { tipo: 'outro', nome: 'Natação' },
  74: { tipo: 'outro', nome: 'Natação' },
  70: { tipo: 'outro', nome: 'Musculação', forca: true },
  81: { tipo: 'outro', nome: 'Musculação', forca: true },
  13: { tipo: 'outro', nome: 'Calistenia', forca: true },
  10: { tipo: 'outro', nome: 'Boot camp', forca: true },
  36: { tipo: 'outro', nome: 'HIIT', forca: true },
  48: { tipo: 'outro', nome: 'Pilates', forca: true },
};

type Permissao = import('react-native-health-connect').Permission;
const PERMISSOES = (lerCiclo: boolean): Permissao[] =>
  (['ActiveCaloriesBurned', 'ExerciseSession', 'Weight', 'HeartRate', 'Distance', ...(lerCiclo ? ['MenstruationFlow', 'MenstruationPeriod'] : [])] as Permissao['recordType'][]).map((recordType) => ({ accessType: 'read', recordType }));

async function iniciar(m: HC) {
  const status = await m.getSdkStatus();
  if (status !== m.SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  return m.initialize();
}

/** Lê todas as páginas de um tipo de registro. */
async function todos<T extends Parameters<HC['readRecords']>[0]>(m: HC, tipo: T, desde: Date, ate: Date) {
  const out: Awaited<ReturnType<typeof m.readRecords<T>>>['records'] = [];
  let pageToken: string | undefined;
  do {
    const r = await m.readRecords(tipo, { timeRangeFilter: { operator: 'between', startTime: desde.toISOString(), endTime: ate.toISOString() }, pageSize: 1000, pageToken });
    out.push(...r.records);
    pageToken = (r as { pageToken?: string }).pageToken || undefined;
  } while (pageToken);
  return out;
}

export const healthConnect: AdaptadorSaude = {
  provedor: 'health_connect',
  nome: 'Health Connect',

  async disponivel() {
    const m = hc();
    if (!m) return false;
    try {
      return await iniciar(m);
    } catch {
      return false;
    }
  },

  async conectar(lerCiclo) {
    const m = hc();
    if (!m || !(await iniciar(m))) return false;
    const dadas = await m.requestPermission(PERMISSOES(lerCiclo));
    return dadas.some((p) => 'recordType' in p && p.recordType === 'ActiveCaloriesBurned');
  },

  async ler(desde, ate, lerCiclo): Promise<DadosSaude> {
    const m = hc();
    if (!m || !(await iniciar(m))) throw new Error('SEM_MODULO');
    const range = { operator: 'between' as const, startTime: desde.toISOString(), endTime: ate.toISOString() };

    // O Health Connect soma a energia sem duplicar quando relógio e celular gravam ao mesmo tempo.
    const grupos = await m.aggregateGroupByPeriod({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: range, timeRangeSlicer: { period: 'DAYS', length: 1 } }).catch(() => []);
    const energia = grupos.map((g) => ({ data: hojeIso(new Date(g.startTime)), kcal: g.result.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0 }));

    const sessoes = await todos(m, 'ExerciseSession', desde, ate).catch(() => []);
    const treinos: TreinoExterno[] = [];
    for (const s of sessoes) {
      const t = TIPOS[s.exerciseType] ?? { tipo: 'outro' as TipoAerobico, nome: s.title || 'Atividade' };
      const r = { operator: 'between' as const, startTime: s.startTime, endTime: s.endTime };
      const [cal, dist, fc] = await Promise.all([
        m.aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: r }).catch(() => null),
        m.aggregateRecord({ recordType: 'Distance', timeRangeFilter: r }).catch(() => null),
        m.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: r }).catch(() => null),
      ]);
      const ini = new Date(s.startTime);
      const fim = new Date(s.endTime);
      const kcal = cal?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
      const km = dist?.DISTANCE?.inKilometers;
      treinos.push({
        id: s.metadata?.id ?? `${s.startTime}-${s.exerciseType}`,
        categoria: t.forca ? 'forca' : 'aerobico',
        tipo: t.tipo,
        nome: t.nome,
        inicio: ini,
        fim,
        duracao_min: (fim.getTime() - ini.getTime()) / 60_000,
        distancia_km: km ? km : null,
        calorias_kcal: kcal ? kcal : null,
        fc_media_bpm: fc?.BPM_AVG ? Math.round(fc.BPM_AVG) : null,
        fonte: s.metadata?.dataOrigin ?? null,
      });
    }

    const ws = await todos(m, 'Weight', desde, ate).catch(() => []);
    const pesos = ws.map((w) => ({ id: w.metadata?.id ?? w.time, data: hojeIso(new Date(w.time)), kg: w.weight.inKilograms, quando: new Date(w.time) }));

    let menstruacao: DiaMenstruacao[] = [];
    if (lerCiclo) {
      const fl = await todos(m, 'MenstruationFlow', desde, ate).catch(() => []);
      const FLUXO = { 1: 'leve', 2: 'moderado', 3: 'intenso' } as const;
      menstruacao = fl.map((f) => ({ data: hojeIso(new Date(f.time)), fluxo: FLUXO[f.flow as 1 | 2 | 3] ?? null }));
      // Períodos marcados sem fluxo diário: cada dia do intervalo conta.
      const per = (await todos(m, 'MenstruationPeriod', desde, ate).catch(() => [])) as unknown as { startTime?: string; endTime?: string }[];
      for (const p of per) {
        if (!p.startTime || !p.endTime) continue;
        for (let d = new Date(p.startTime); d < new Date(p.endTime); d = new Date(d.getTime() + 86_400_000)) menstruacao.push({ data: hojeIso(d), fluxo: null });
      }
    }

    return { energia, treinos, pesos, menstruacao };
  },

  abrirAjustes() {
    hc()?.openHealthConnectSettings();
  },
};
