/** Transforma o que foi lido em rascunhos que as telas de edição mostram para revisão (RN01). */
import { buscarAlimentos, valoresDoAlimento } from '@/db/dieta';
import { AEROBICOS, exercicios } from '@/db/treino';

import type { TipoAerobico } from '../calculos';
import { campo } from '../formato';
import { bioLida, chave, rascunhoDieta, rascunhoPlano, rotuloLido, type ItemRascunho } from '../rascunhos';
import { melhor } from './associar';
import type { Leitura } from './tipos';

const TIPOS_AER: [RegExp, TipoAerobico][] = [
  [/esteira/i, 'esteira'],
  [/bike|bicicleta|spinning/i, 'bicicleta'],
  [/el[íi]ptico|transport/i, 'eliptico'],
  [/corrida/i, 'corrida_rua'],
  [/caminhada/i, 'caminhada'],
];

export function aplicarTreino(l: Leitura<'treino'>) {
  const catalogo = exercicios();
  const treinos = l.dados.treinos.filter((t) => t.itens.length);
  rascunhoPlano.definir({
    nome: l.dados.nome_plano?.trim() || 'Plano importado',
    atual: 0,
    importacao: { id: l.importacaoId, via: l.via },
    treinos: treinos.map((t) => ({
      chave: chave(),
      nome: t.nome?.trim() ?? '',
      itens: t.itens.map((i): ItemRascunho => {
        if (i.aerobico) {
          const tipo = TIPOS_AER.find(([r]) => r.test(i.exercicio))?.[1] ?? 'outro';
          return { chave: chave(), exercicio_id: null, nome: AEROBICOS[tipo], tipo_aerobico: tipo, series: '', reps: '', carga: '', duracao: campo(i.duracao_min), revisar: i.duvida };
        }
        const m = melhor(i.exercicio, catalogo);
        const reps = i.reps_min == null ? '' : i.reps_max != null && i.reps_max !== i.reps_min ? `${i.reps_min}–${i.reps_max}` : String(i.reps_min);
        return {
          chave: chave(),
          exercicio_id: m?.item.id ?? null,
          nome: m?.item.nome ?? i.exercicio,
          tipo_aerobico: null,
          series: campo(i.series ?? 3),
          reps: reps || '10',
          carga: campo(i.carga_kg),
          duracao: '',
          revisar: i.duvida || !m || m.nota < 0.85 || i.series == null || i.reps_min == null,
        };
      }),
    })),
  });
}

export function aplicarDieta(l: Leitura<'dieta'>) {
  const base = buscarAlimentos('', 'todos');
  const naoEncontrados: string[] = [];
  rascunhoDieta.definir({
    nome: l.dados.nome?.trim() || 'Dieta importada',
    atual: 0,
    importacao: { id: l.importacaoId, via: l.via },
    refeicoes: l.dados.refeicoes.map((r) => ({
      chave: chave(),
      nome: r.nome,
      horario: r.horario ?? '',
      itens: r.itens.flatMap((i) => {
        const m = melhor(i.alimento, base, { alimento: true });
        if (!m) {
          naoEncontrados.push(`${i.alimento}${i.medida ? ` (${i.medida})` : i.quantidade_g ? ` (${i.quantidade_g} g)` : ''} · ${r.nome}`);
          return [];
        }
        const g = i.quantidade_g ?? m.item.porcao_padrao_g ?? 100;
        return [
          {
            chave: chave(),
            alimento_id: m.item.id,
            nome: m.item.nome,
            gramas: campo(Math.round(g)),
            kcal100: valoresDoAlimento(m.item.id).energia ?? 0,
            lido: i.alimento + (i.medida ? ` · ${i.medida}` : ''),
            revisar: i.duvida || m.nota < 0.85 || i.quantidade_g == null,
          },
        ];
      }),
    })),
    naoEncontrados,
  });
}

export const aplicarBio = (l: Leitura<'bio'>) => bioLida.definir({ importacaoId: l.importacaoId, via: l.via, dados: l.dados });
export const aplicarRotulo = (l: Leitura<'rotulo'>) => rotuloLido.definir({ importacaoId: l.importacaoId, via: l.via, dados: l.dados });
