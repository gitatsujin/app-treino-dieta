/**
 * Adaptador do Apple Saúde (HealthKit) com @kingstinct/react-native-healthkit.
 * O módulo nativo só existe no app instalável; no Expo Go e na web ele não carrega e o adaptador
 * responde "indisponível".
 */
import { Linking } from 'react-native';

import { hojeIso } from '@/db/conexao';
import type { TipoAerobico } from '@/lib/calculos';

import type { AdaptadorSaude, DadosSaude, DiaMenstruacao, TreinoExterno } from './tipos';

type HK = typeof import('@kingstinct/react-native-healthkit');

function hk(): HK | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit') as HK;
  } catch {
    return null;
  }
}

const ENERGIA = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const PESO = 'HKQuantityTypeIdentifierBodyMass' as const;
const FC = 'HKQuantityTypeIdentifierHeartRate' as const;
const TREINO = 'HKWorkoutTypeIdentifier' as const;
const FLUXO = 'HKCategoryTypeIdentifierMenstrualFlow' as const;

/** HKWorkoutActivityType → tipo do app. Força e treinos mistos só emprestam as calorias à sessão do app. */
const TIPOS: Record<number, { tipo: TipoAerobico; nome: string; forca?: boolean }> = {
  37: { tipo: 'corrida_rua', nome: 'Corrida' },
  52: { tipo: 'caminhada', nome: 'Caminhada' },
  24: { tipo: 'caminhada', nome: 'Trilha' },
  13: { tipo: 'bicicleta', nome: 'Ciclismo' },
  16: { tipo: 'eliptico', nome: 'Elíptico' },
  35: { tipo: 'outro', nome: 'Remo' },
  44: { tipo: 'outro', nome: 'Escada' },
  46: { tipo: 'outro', nome: 'Natação' },
  73: { tipo: 'outro', nome: 'Cardio' },
  50: { tipo: 'outro', nome: 'Musculação', forca: true },
  20: { tipo: 'outro', nome: 'Treino funcional', forca: true },
  59: { tipo: 'outro', nome: 'Core', forca: true },
  11: { tipo: 'outro', nome: 'Cross training', forca: true },
  63: { tipo: 'outro', nome: 'HIIT', forca: true },
};

type Qtd = { quantity: number; unit: string } | undefined;
const kcalDe = (q: Qtd) => (!q ? null : /kJ/i.test(q.unit) ? q.quantity / 4.184 : q.quantity);
const kmDe = (q: Qtd) => (!q ? null : q.unit === 'm' ? q.quantity / 1000 : q.unit === 'mi' ? q.quantity * 1.609344 : q.unit === 'km' ? q.quantity : q.quantity / 1000);
const minDe = (q: Qtd) => (!q ? 0 : q.unit === 'min' ? q.quantity : q.unit === 'hr' ? q.quantity * 60 : q.quantity / 60);

function inicioDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const appleSaude: AdaptadorSaude = {
  provedor: 'apple_saude',
  nome: 'Apple Saúde',

  async disponivel() {
    const m = hk();
    if (!m) return false;
    try {
      return await m.isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },

  async conectar(lerCiclo) {
    const m = hk();
    if (!m) return false;
    // O iOS não conta ao app o que foi negado na leitura (privacidade): o pedido só diz que foi mostrado.
    return m.requestAuthorization({ toRead: [ENERGIA, TREINO, PESO, FC, ...(lerCiclo ? [FLUXO] : [])] });
  },

  async ler(desde, ate, lerCiclo): Promise<DadosSaude> {
    const m = hk();
    if (!m) throw new Error('SEM_MODULO');
    const filtro = { date: { startDate: desde, endDate: ate } };

    const dias = await m.queryStatisticsCollectionForQuantity(ENERGIA, ['cumulativeSum'], inicioDoDia(desde), { day: 1 }, { filter: filtro, unit: 'kcal' }).catch(() => []);
    const energia = dias
      .filter((d) => d.startDate && d.sumQuantity)
      .map((d) => ({ data: hojeIso(d.startDate as Date), kcal: d.sumQuantity!.quantity }));

    const ws = await m.queryWorkoutSamples({ limit: -1, ascending: true, filter: filtro }).catch(() => []);
    const treinos: TreinoExterno[] = [];
    for (const w of ws) {
      const t = TIPOS[w.workoutActivityType as number] ?? { tipo: 'outro' as TipoAerobico, nome: 'Atividade' };
      const indoor = (w.metadata as Record<string, unknown> | undefined)?.HKIndoorWorkout === true;
      let fc: number | null = null;
      try {
        const s = await w.getStatistic(FC, 'count/min');
        fc = s?.averageQuantity ? Math.round(s.averageQuantity.quantity) : null;
      } catch {
        fc = null;
      }
      treinos.push({
        id: w.uuid,
        categoria: t.forca ? 'forca' : 'aerobico',
        tipo: t.tipo === 'corrida_rua' && indoor ? 'esteira' : t.tipo === 'bicicleta' && indoor ? 'bicicleta' : t.tipo,
        nome: t.nome,
        inicio: new Date(w.startDate),
        fim: new Date(w.endDate),
        duracao_min: minDe(w.duration as Qtd),
        distancia_km: kmDe(w.totalDistance as Qtd),
        calorias_kcal: kcalDe(w.totalEnergyBurned as Qtd),
        fc_media_bpm: fc,
        fonte: w.sourceRevision?.source?.name ?? null,
      });
    }

    const ps = await m.queryQuantitySamples(PESO, { limit: -1, unit: 'kg', filter: filtro }).catch(() => []);
    const pesos = ps.map((p) => ({ id: p.uuid, data: hojeIso(new Date(p.startDate)), kg: p.quantity, quando: new Date(p.startDate) }));

    let menstruacao: DiaMenstruacao[] = [];
    if (lerCiclo) {
      const fs = await m.queryCategorySamples(FLUXO, { limit: -1, filter: filtro }).catch(() => []);
      // HKCategoryValueVaginalBleeding: 1 sem especificar, 2 leve, 3 moderado, 4 intenso, 5 nenhum.
      menstruacao = fs
        .filter((f) => Number(f.value) !== 5)
        .map((f) => ({ data: hojeIso(new Date(f.startDate)), fluxo: ({ 2: 'leve', 3: 'moderado', 4: 'intenso' } as const)[Number(f.value) as 2 | 3 | 4] ?? null }));
    }

    return { energia, treinos, pesos, menstruacao };
  },

  abrirAjustes() {
    // O app Saúde é onde se revêem as permissões (Compartilhamento › Apps › Treino e Dieta).
    Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
  },
};
