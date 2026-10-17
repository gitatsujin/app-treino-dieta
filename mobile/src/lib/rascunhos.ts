import type { TipoAerobico } from './calculos';
import { criarRascunho } from './rascunho';

/** Item do plano em edição (texto como o usuário digita). */
export type ItemRascunho = {
  chave: string;
  exercicio_id: string | null;
  nome: string;
  tipo_aerobico: TipoAerobico | null;
  series: string;
  reps: string;
  carga: string;
  duracao: string;
};
export type TreinoRascunho = { chave: string; id?: string; nome: string; itens: ItemRascunho[] };
export type PlanoRascunho = { nome: string; treinos: TreinoRascunho[]; atual: number };

export const rascunhoPlano = criarRascunho<PlanoRascunho | null>(null);

/** Exercício escolhido para o formulário de meta de carga. */
export const exercicioDaMeta = criarRascunho<{ id: string; nome: string } | null>(null);

/** Refeição da dieta em edição. */
export type ItemDietaRascunho = { chave: string; alimento_id: string; nome: string; gramas: string; kcal100: number };
export type RefeicaoRascunho = { chave: string; id?: string; nome: string; horario: string; itens: ItemDietaRascunho[] };
export type DietaRascunho = { nome: string; refeicoes: RefeicaoRascunho[]; atual: number };
export const rascunhoDieta = criarRascunho<DietaRascunho | null>(null);

let n = 0;
export const chave = () => `k${Date.now().toString(36)}${(n++).toString(36)}`;

/** "10–12" ou "10-12" → [10, 12]; "10" → [10, 10]. */
export function lerReps(t: string): [number | null, number | null] {
  const m = t.replace(/\s/g, '').match(/^(\d+)(?:[–\-a](\d+))?$/);
  if (!m) return [null, null];
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return a <= b ? [a, b] : [b, a];
}

/** Exercício recém-criado: a tela de busca o seleciona ao voltar. */
export const exercicioCriado = criarRascunho<{ id: string; nome: string } | null>(null);

/** Alimento recém-cadastrado: a tela de adicionar o seleciona ao voltar. */
export const alimentoCriado = criarRascunho<string | null>(null);
