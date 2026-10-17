/**
 * Cálculos de negócio (seção "Dados calculados" do modelo de dados e RN do escopo).
 * Funções puras: recebem os dados e devolvem o resultado, sem ler o banco.
 */
import { diasEntre, paraData, somarDias } from './formato';

export type Sexo = 'feminino' | 'masculino';

export function idade(dataNascimento: string, hoje: string): number {
  const n = paraData(dataNascimento);
  const h = paraData(hoje);
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
}

/** RN15 */
export function imc(pesoKg: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return pesoKg / (m * m);
}

export function classeImc(v: number): string {
  if (v < 18.5) return 'Abaixo do peso';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Sobrepeso';
  return 'Obeso';
}

/** Mifflin-St Jeor (RN08). */
export function tmbMifflin(pesoKg: number, alturaCm: number, idadeAnos: number, sexo: Sexo): number {
  return 10 * pesoKg + 6.25 * alturaCm - 5 * idadeAnos + (sexo === 'masculino' ? 5 : -161);
}

type Faixa = [idadeMin: number, idadeMax: number, limites: [number, number, number]];
const GORDURA: Record<Sexo, Faixa[]> = {
  feminino: [
    [20, 39, [21, 33, 39]],
    [40, 59, [23, 34, 40]],
    [60, 79, [24, 36, 42]],
  ],
  masculino: [
    [20, 39, [8, 20, 25]],
    [40, 59, [11, 22, 28]],
    [60, 79, [13, 25, 30]],
  ],
};
const MUSCULO: Record<Sexo, Faixa[]> = {
  feminino: [
    [18, 39, [24.3, 30.4, 35.4]],
    [40, 59, [24.1, 30.2, 35.2]],
    [60, 80, [23.9, 30.0, 35.0]],
  ],
  masculino: [
    [18, 39, [33.3, 39.4, 44.1]],
    [40, 59, [33.1, 39.2, 43.9]],
    [60, 80, [32.9, 39.0, 43.7]],
  ],
};
const CLASSES = ['Baixo', 'Normal', 'Alto', 'Muito alto'];

function classificar(tab: Faixa[], idadeAnos: number, v: number): string | undefined {
  const f = tab.find(([a, b]) => idadeAnos >= a && idadeAnos <= b);
  if (!f) return undefined; // RN18
  const [l1, l2, l3] = f[2];
  return CLASSES[v < l1 ? 0 : v < l2 ? 1 : v < l3 ? 2 : 3];
}

/** RN16 */
export const classeGordura = (sexo: Sexo, idadeAnos: number, pct: number) => classificar(GORDURA[sexo], idadeAnos, pct);
export const classeMusculo = (sexo: Sexo, idadeAnos: number, pct: number) => classificar(MUSCULO[sexo], idadeAnos, pct);

/** RN17 */
export function classeVisceral(nivel: number): string {
  if (nivel <= 9) return 'Normal';
  if (nivel <= 14) return 'Alto';
  return 'Muito alto';
}

/* ---------- Gasto de atividades (Compendium of Physical Activities) ---------- */

export type TipoAerobico = 'esteira' | 'bicicleta' | 'eliptico' | 'corrida_rua' | 'caminhada' | 'outro';
export type Escala = 'leve' | 'moderada' | 'intensa';

export const MET_MUSCULACAO = 3.5; // 02054

const MET_AEROBICO: Record<TipoAerobico, [number, number, number]> = {
  caminhada: [2.8, 3.5, 5.0],
  corrida_rua: [7.0, 9.8, 11.5],
  esteira: [3.5, 6.0, 9.0],
  bicicleta: [3.5, 6.8, 8.8],
  eliptico: [4.0, 5.0, 7.0],
  outro: [3.5, 5.0, 7.0],
};

/** Escala a partir do que o usuário informou (escala, esforço 1–10 ou frequência cardíaca). */
export function escalaDe(o: { escala?: Escala | null; pse?: number | null; fc?: number | null; idade?: number }): Escala {
  if (o.escala) return o.escala;
  if (o.pse != null) return o.pse <= 3 ? 'leve' : o.pse <= 6 ? 'moderada' : 'intensa';
  if (o.fc != null) {
    const pct = o.fc / (220 - (o.idade ?? 30));
    return pct < 0.64 ? 'leve' : pct < 0.77 ? 'moderada' : 'intensa';
  }
  return 'moderada';
}

export function metAerobico(tipo: TipoAerobico, escala: Escala): number {
  return MET_AEROBICO[tipo][escala === 'leve' ? 0 : escala === 'moderada' ? 1 : 2];
}

/** kcal = MET × peso (kg) × horas */
export function kcalAtividade(met: number, pesoKg: number, minutos: number): number {
  return Math.round(met * pesoKg * (minutos / 60));
}

/* ---------- Treino ---------- */

/** 1RM estimado (Epley). */
export function umRm(carga: number, reps: number): number {
  return reps === 1 ? carga : carga * (1 + reps / 30);
}

/* ---------- Dieta ---------- */

/** RN10: dentro de ±7% da meta. */
export function diaNaDieta(consumido: number, meta: number | null): boolean {
  if (!meta) return false;
  return Math.abs(consumido - meta) <= meta * 0.07;
}

/* ---------- Metas ---------- */

/** Faixa de cor da barra (RNF11). */
export function statusMeta(progresso: number): 'far' | 'mid' | 'near' {
  return progresso < 0.4 ? 'far' : progresso < 0.8 ? 'mid' : 'near';
}

/* ---------- Ciclo menstrual (RF53) ---------- */

export type Ciclo = { data_inicio: string; data_fim: string | null };
export type FaseCiclo = { fase: 'Menstrual' | 'Folicular' | 'Ovulatória' | 'Lútea'; dia: number; duracaoCiclo: number; proxima: string };

const DURACAO_PADRAO = 28;
const MENSTRUACAO_PADRAO = 5;

/** Fase do ciclo numa data, pela média dos últimos ciclos registrados. */
export function faseDoCiclo(ciclos: Ciclo[], data: string): FaseCiclo | null {
  const ord = [...ciclos].filter((c) => c.data_inicio <= data).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  if (!ord.length) return null;
  const todos = [...ciclos].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  const duracoes: number[] = [];
  for (let i = 1; i < todos.length; i++) {
    const d = diasEntre(todos[i - 1].data_inicio, todos[i].data_inicio);
    if (d >= 15 && d <= 60) duracoes.push(d);
  }
  const ult = duracoes.slice(-6);
  const duracaoCiclo = ult.length ? Math.round(ult.reduce((a, b) => a + b, 0) / ult.length) : DURACAO_PADRAO;
  const menstruacoes = todos.filter((c) => c.data_fim).map((c) => diasEntre(c.data_inicio, c.data_fim!) + 1);
  const duracaoMenstr = menstruacoes.length ? Math.round(menstruacoes.reduce((a, b) => a + b, 0) / menstruacoes.length) : MENSTRUACAO_PADRAO;

  const atual = ord[ord.length - 1];
  const dia = diasEntre(atual.data_inicio, data) + 1;
  const proxima = somarDias(atual.data_inicio, duracaoCiclo);
  const emCurso = atual.data_fim ? data <= atual.data_fim : dia <= duracaoMenstr;
  const ovulacao = duracaoCiclo - 14;
  let fase: FaseCiclo['fase'];
  if (emCurso) fase = 'Menstrual';
  else if (dia < ovulacao - 1) fase = 'Folicular';
  else if (dia <= ovulacao + 1) fase = 'Ovulatória';
  else fase = 'Lútea';
  return { fase, dia, duracaoCiclo, proxima };
}
