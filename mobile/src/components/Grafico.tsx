import { LineChart } from '@/components/ui';
import { paraData } from '@/lib/formato';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Escala "redonda" para o gráfico de linha a partir dos valores. */
export function escala(valores: number[], passoMin = 1) {
  const lo = Math.min(...valores);
  const hi = Math.max(...valores);
  const amp = Math.max(hi - lo, passoMin * 2);
  const passo = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map((x) => x * passoMin).find((x) => amp / x <= 4) ?? amp / 4;
  const min = Math.floor((lo - passo * 0.5) / passo) * passo;
  const max = Math.ceil((hi + passo * 0.5) / passo) * passo;
  const ticks: number[] = [];
  for (let t = max; t >= min - 1e-9; t -= passo) ticks.push(Math.round(t * 100) / 100);
  return { min, max, ticks };
}

/** Rótulos de mês no eixo (início, meio e fim). */
export function rotulosMes(datas: string[]): string[] {
  if (!datas.length) return [];
  const m = (d: string) => MESES[paraData(d).getMonth()];
  const unicos = [...new Set(datas.map(m))];
  if (unicos.length <= 3) return unicos;
  return [unicos[0], unicos[Math.floor(unicos.length / 2)], unicos[unicos.length - 1]];
}

/** Gráfico de linha com escala automática; precisa de ao menos 2 pontos. */
export function GraficoLinha({ valores, datas, formato, alvo }: { valores: number[]; datas: string[]; formato?: (v: number) => string; alvo?: number }) {
  if (valores.length < 2) return null;
  const e = escala(alvo != null ? [...valores, alvo] : valores);
  return <LineChart data={valores} labels={rotulosMes(datas)} min={e.min} max={e.max} ticks={e.ticks} format={formato} />;
}
