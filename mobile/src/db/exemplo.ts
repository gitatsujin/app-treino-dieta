/** Dados de exemplo para testar o app (só no modo de desenvolvimento). Gera três semanas de histórico. */
import { kcalAtividade, MET_MUSCULACAO } from '@/lib/calculos';
import { somarDias } from '@/lib/formato';

import { agoraIso, db, gravar, hojeIso, inserir } from './conexao';
import { salvarDieta, dietaAtiva } from './dieta';
import { salvarMeta } from './metas';
import { definirMetaCalorias, pesoAtual, registrarPeso, salvarBio } from './perfil';
import { estimarAerobico, planoAtivo, salvarPlano } from './treino';

const em = (data: string, h: number, m = 0) => {
  const [a, mm, d] = data.split('-').map(Number);
  return agoraIso(new Date(a, mm - 1, d, h, m));
};

const ex = (id: string, series: number, rmin: number, rmax: number, carga: number) => ({
  exercicio_id: `ex-${id}`,
  tipo_aerobico: null,
  series_previstas: series,
  reps_min: rmin,
  reps_max: rmax,
  carga_prevista_kg: carga,
  duracao_prevista_min: null,
});

export function carregarExemplo() {
  gravar(() => {
    const hoje = hojeIso();
    if (!planoAtivo()) {
      salvarPlano({
        nome: 'Plano ABC · Hipertrofia',
        treinos: [
          { nome: 'Peito e tríceps', itens: [ex('supino-reto', 4, 8, 10, 70), ex('supino-inclinado-halteres', 3, 10, 12, 26), ex('crucifixo-maquina', 3, 12, 12, 45), ex('triceps-polia', 3, 12, 12, 30), ex('triceps-frances', 3, 10, 10, 14)] },
          {
            nome: 'Costas e bíceps',
            itens: [
              ex('puxada-frontal', 4, 10, 12, 55),
              ex('remada-curvada', 4, 8, 10, 40),
              ex('remada-baixa', 3, 10, 12, 50),
              ex('rosca-direta', 3, 10, 10, 14),
              ex('rosca-martelo', 3, 12, 12, 12),
              { exercicio_id: null, tipo_aerobico: 'esteira', series_previstas: null, reps_min: null, reps_max: null, carga_prevista_kg: null, duracao_prevista_min: 20 },
            ],
          },
          { nome: 'Pernas', itens: [ex('agachamento', 4, 8, 10, 90), ex('leg-press', 4, 10, 12, 180), ex('cadeira-extensora', 3, 12, 12, 45), ex('mesa-flexora', 3, 12, 12, 40), ex('panturrilha-em-pe', 4, 15, 15, 60)] },
        ],
      });
    }
    const plano = planoAtivo()!;
    const peso = pesoAtual()?.peso_kg ?? 78;

    // Treinos: segunda, quarta e sexta das últimas 3 semanas, com carga subindo aos poucos.
    const temHistorico = !!db().get('SELECT id FROM sessao_treino WHERE excluido_em IS NULL AND substr(inicio,1,10) < ? LIMIT 1', [hoje]);
    let n = 0;
    for (let d = 21; d >= 1 && !temHistorico; d--) {
      const data = somarDias(hoje, -d);
      const dow = new Date(`${data}T12:00:00`).getDay();
      if (![1, 3, 5].includes(dow)) continue;
      const t = plano.treinos[n % plano.treinos.length];
      const progresso = Math.floor(n / 3) * 2.5;
      n++;
      const sid = inserir('sessao_treino', { treino_modelo_id: t.id, inicio: em(data, 18, 5), fim: em(data, 19, 0), status: 'concluida', origem_gasto: 'estimativa', calorias_gastas_kcal: kcalAtividade(MET_MUSCULACAO, peso, 55) });
      t.itens
        .filter((i) => i.exercicio_id)
        .forEach((i, ordem) => {
          const se = inserir('sessao_exercicio', { sessao_treino_id: sid, exercicio_id: i.exercicio_id, treino_modelo_item_id: i.id, ordem });
          for (let s = 1; s <= (i.series_previstas ?? 3); s++) {
            const carga = Math.max(0, (i.carga_prevista_kg ?? 20) - 5 + progresso);
            inserir('serie', { sessao_exercicio_id: se, numero: s, carga_kg: carga, repeticoes: Math.max(1, (i.reps_max ?? 10) - (s > 2 ? 1 : 0)) });
          }
        });
      const aer = t.itens.find((i) => i.tipo_aerobico);
      if (aer) {
        const a = { tipo: 'esteira' as const, duracao_min: 20, intensidade_escala: 'moderada' as const, intensidade_pse: null, fc_media_bpm: null };
        inserir('sessao_aerobico', { ...a, sessao_treino_id: sid, inicio: em(data, 19, 0), distancia_km: 2.4, inclinacao_pct: 6, calorias_gastas_kcal: estimarAerobico(a).kcal, origem: 'manual' });
      }
    }
    // Corridas aos sábados.
    for (const d of temHistorico ? [] : [3, 10, 17]) {
      const data = somarDias(hoje, -d);
      const a = { tipo: 'corrida_rua' as const, duracao_min: 30, intensidade_escala: null, intensidade_pse: 7, fc_media_bpm: null };
      inserir('sessao_aerobico', { ...a, sessao_treino_id: null, inicio: em(data, 8, 0), distancia_km: 5, calorias_gastas_kcal: estimarAerobico(a).kcal, origem: 'manual' });
    }

    // Dieta e consumo dos últimos 10 dias.
    if (!dietaAtiva()) {
      salvarDieta({
        nome: 'Plano Hipertrofia',
        refeicoes: [
          { nome: 'Café da manhã', horario: '07:30', itens: [{ alimento_id: 'al-pao-integral', quantidade_g: 50 }, { alimento_id: 'al-ovo-mexido', quantidade_g: 100 }, { alimento_id: 'al-leite-integral', quantidade_g: 200 }] },
          { nome: 'Lanche da manhã', horario: '10:00', itens: [{ alimento_id: 'al-whey', quantidade_g: 30 }, { alimento_id: 'al-banana', quantidade_g: 90 }, { alimento_id: 'al-pasta-amendoim', quantidade_g: 15 }] },
          {
            nome: 'Almoço',
            horario: '12:30',
            itens: [
              { alimento_id: 'al-arroz-integral', quantidade_g: 150 },
              { alimento_id: 'al-feijao-carioca', quantidade_g: 100 },
              { alimento_id: 'al-frango-peito', quantidade_g: 150 },
              { alimento_id: 'al-alface', quantidade_g: 30 },
              { alimento_id: 'al-azeite', quantidade_g: 8 },
            ],
          },
          { nome: 'Lanche da tarde', horario: '16:00', itens: [{ alimento_id: 'al-iogurte-natural', quantidade_g: 170 }, { alimento_id: 'al-aveia', quantidade_g: 30 }, { alimento_id: 'al-banana', quantidade_g: 90 }] },
          { nome: 'Jantar', horario: '20:00', itens: [{ alimento_id: 'al-batata-doce', quantidade_g: 200 }, { alimento_id: 'al-tilapia', quantidade_g: 150 }, { alimento_id: 'al-legumes', quantidade_g: 100 }] },
        ],
      });
    }
    const dieta = dietaAtiva()!;
    for (let d = 10; d >= 1; d--) {
      const data = somarDias(hoje, -d);
      const ja = db().get<{ n: number }>('SELECT COUNT(*) AS n FROM consumo WHERE data = ? AND excluido_em IS NULL', [data])?.n ?? 0;
      if (ja) continue;
      dieta.refeicoes.forEach((r, ri) => {
        if (d % 4 === 0 && ri === 3) return; // alguns dias pula o lanche (fora da margem)
        for (const i of r.itens) inserir('consumo', { data, horario: r.horario, refeicao_modelo_item_id: i.id, refeicao_nome: r.nome, alimento_id: i.alimento_id, quantidade_g: i.quantidade_g });
      });
      if (d % 3 === 0) inserir('consumo', { data, horario: '15:10', refeicao_nome: null, alimento_id: 'al-chocolate', quantidade_g: 25 });
    }
    definirMetaCalorias(null);

    // Pesagens semanais e uma bioimpedância.
    [28, 21, 14, 7].forEach((d, i) => registrarPeso(peso + 1.6 - i * 0.4, somarDias(hoje, -d)));
    if (!db().get('SELECT id FROM bioimpedancia WHERE excluido_em IS NULL LIMIT 1')) {
      salvarBio({ data: somarDias(hoje, -45), peso_kg: peso + 1.2, cintura_cm: 85, gordura_pct: 19.1, musculo_esqueletico_pct: 37.6, metabolismo_repouso_kcal: 1760, idade_biologica: 23, gordura_visceral_nivel: 7, });
    }
    registrarPeso(peso, hoje);

    // Metas.
    if (!db().get("SELECT id FROM meta WHERE excluido_em IS NULL LIMIT 1")) {
      const base = { exercicio_id: null, carga_alvo_kg: null, treinos_semana: null, aerobicos_semana: null, peso_alvo_kg: null, dias_dieta_alvo: null, prazo: null };
      salvarMeta({ ...base, tipo: 'carga', exercicio_id: 'ex-supino-reto', carga_alvo_kg: 80, prazo: somarDias(hoje, 45) });
      salvarMeta({ ...base, tipo: 'frequencia', treinos_semana: 4, aerobicos_semana: 2 });
      salvarMeta({ ...base, tipo: 'peso', peso_alvo_kg: Math.round(peso - 3), prazo: somarDias(hoje, 75) });
      salvarMeta({ ...base, tipo: 'dieta', dias_dieta_alvo: 14 });
    }
  });
}
