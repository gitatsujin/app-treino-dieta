import { WeekStrip } from '@/components/ui';
import { hojeIso } from '@/db/conexao';
import { diasDaDieta } from '@/db/dieta';
import { semana } from '@/db/treino';
import { paraData, somarDias } from '@/lib/formato';

const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Semana atual (segunda a domingo): dias de treino e dias com a dieta na meta. */
export function Semana({ dieta = true, data = hojeIso() }: { dieta?: boolean; data?: string }) {
  const s = semana(data);
  const datas = LETRAS.map((_, i) => somarDias(s.inicio, i));
  const naDieta = dieta ? diasDaDieta(datas) : [];
  const hoje = hojeIso();
  return (
    <WeekStrip
      days={datas.map((d, i) => ({
        label: LETRAS[i],
        day: paraData(d).getDate(),
        trained: s.diasComTreino.has(d),
        dietOk: naDieta[i] === true,
        today: d === hoje,
        future: d > hoje,
      }))}
    />
  );
}
