/** Exportação dos dados do usuário em CSV ou JSON (RF67, portabilidade LGPD). Gera o conteúdo; a tela grava e compartilha. */
import { db } from './conexao';

export type Categoria = 'treinos' | 'dieta' | 'medidas' | 'metas' | 'ciclo';
export type Arquivo = { nome: string; conteudo: string; linhas: number };

type Linha = Record<string, string | number | null>;

const CONSULTAS: Record<Categoria, [nome: string, sql: string, campoData: string][]> = {
  treinos: [
    [
      'series',
      `SELECT substr(st.inicio,1,10) AS data, st.inicio, st.status, tm.nome AS treino, e.nome AS exercicio, x.numero AS serie, x.carga_kg, x.repeticoes
       FROM serie x JOIN sessao_exercicio se ON se.id = x.sessao_exercicio_id JOIN sessao_treino st ON st.id = se.sessao_treino_id
       JOIN exercicio e ON e.id = se.exercicio_id LEFT JOIN treino_modelo tm ON tm.id = st.treino_modelo_id
       WHERE x.excluido_em IS NULL AND se.excluido_em IS NULL AND st.excluido_em IS NULL`,
      'substr(st.inicio,1,10)',
    ],
    [
      'sessoes',
      `SELECT substr(st.inicio,1,10) AS data, st.inicio, st.fim, st.status, tm.nome AS treino, st.calorias_gastas_kcal
       FROM sessao_treino st LEFT JOIN treino_modelo tm ON tm.id = st.treino_modelo_id
       WHERE st.excluido_em IS NULL AND st.status IN ('concluida','parcial')`,
      'substr(st.inicio,1,10)',
    ],
    [
      'aerobicos',
      `SELECT substr(inicio,1,10) AS data, inicio, tipo, duracao_min, distancia_km, intensidade_escala, intensidade_pse, fc_media_bpm, inclinacao_pct, nivel_carga, calorias_gastas_kcal, origem
       FROM sessao_aerobico WHERE excluido_em IS NULL`,
      'substr(inicio,1,10)',
    ],
  ],
  dieta: [
    [
      'consumo',
      `SELECT c.data, c.horario, c.refeicao_nome AS refeicao, a.nome AS alimento, a.marca, c.quantidade_g,
              ROUND(COALESCE((SELECT valor_por_100g FROM alimento_nutriente WHERE alimento_id = a.id AND nutriente_id = 'energia'), 0) * c.quantidade_g / 100) AS kcal,
              ROUND(COALESCE((SELECT valor_por_100g FROM alimento_nutriente WHERE alimento_id = a.id AND nutriente_id = 'proteina'), 0) * c.quantidade_g / 100, 1) AS proteina_g,
              ROUND(COALESCE((SELECT valor_por_100g FROM alimento_nutriente WHERE alimento_id = a.id AND nutriente_id = 'carboidrato'), 0) * c.quantidade_g / 100, 1) AS carboidrato_g,
              ROUND(COALESCE((SELECT valor_por_100g FROM alimento_nutriente WHERE alimento_id = a.id AND nutriente_id = 'gordura'), 0) * c.quantidade_g / 100, 1) AS gordura_g
       FROM consumo c JOIN alimento a ON a.id = c.alimento_id WHERE c.excluido_em IS NULL`,
      'c.data',
    ],
    [
      'dieta',
      `SELECT d.nome AS dieta, r.nome AS refeicao, r.horario, a.nome AS alimento, i.quantidade_g
       FROM refeicao_modelo_item i JOIN refeicao_modelo r ON r.id = i.refeicao_modelo_id JOIN dieta d ON d.id = r.dieta_id JOIN alimento a ON a.id = i.alimento_id
       WHERE i.excluido_em IS NULL AND r.excluido_em IS NULL AND d.excluido_em IS NULL AND d.ativa = 1`,
      '',
    ],
  ],
  medidas: [
    ['pesagens', `SELECT data, peso_kg, origem FROM registro_peso WHERE excluido_em IS NULL`, 'data'],
    [
      'bioimpedancia',
      `SELECT data, peso_kg, cintura_cm, gordura_pct, musculo_esqueletico_pct, metabolismo_repouso_kcal, idade_biologica, gordura_visceral_nivel FROM bioimpedancia WHERE excluido_em IS NULL`,
      'data',
    ],
  ],
  metas: [
    [
      'metas',
      `SELECT m.tipo, e.nome AS exercicio, m.carga_alvo_kg, m.treinos_semana, m.aerobicos_semana, m.peso_alvo_kg, m.dias_dieta_alvo, m.data_inicio, m.prazo, m.status, m.atingida_em
       FROM meta m LEFT JOIN exercicio e ON e.id = m.exercicio_id WHERE m.excluido_em IS NULL`,
      'm.data_inicio',
    ],
  ],
  ciclo: [
    ['ciclo', `SELECT data_inicio, data_fim, intensidade_fluxo, origem FROM ciclo_menstrual WHERE excluido_em IS NULL`, 'data_inicio'],
    ['sintomas', `SELECT data, sintoma FROM sintoma_ciclo WHERE excluido_em IS NULL`, 'data'],
  ],
};

function consultar(sql: string, campoData: string, desde?: string): Linha[] {
  const filtro = desde && campoData ? ` AND ${campoData} >= ?` : '';
  return db().all<Linha>(`${sql}${filtro} ORDER BY 1`, desde && campoData ? [desde] : []);
}

export function contar(c: Categoria, desde?: string): number {
  return CONSULTAS[c].reduce((t, [, sql, cd]) => t + consultar(sql, cd, desde).length, 0);
}

const celula = (v: string | number | null) => {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV com ponto e vírgula e vírgula decimal, como o Excel em português espera. */
function csv(linhas: Linha[]): string {
  if (!linhas.length) return '';
  const cols = Object.keys(linhas[0]);
  return '﻿' + [cols.join(';'), ...linhas.map((l) => cols.map((c) => celula(l[c])).join(';'))].join('\n');
}

export function gerarExportacao(categorias: Categoria[], formato: 'csv' | 'json', desde: string | undefined, sufixo: string): Arquivo[] {
  if (formato === 'json') {
    const dados: Record<string, Linha[]> = {};
    let n = 0;
    for (const c of categorias)
      for (const [nome, sql, cd] of CONSULTAS[c]) {
        dados[nome] = consultar(sql, cd, desde);
        n += dados[nome].length;
      }
    const perfil = db().get<Linha>('SELECT nome, data_nascimento, sexo, altura_cm, meta_calorias_kcal FROM usuario LIMIT 1') ?? null;
    return [{ nome: `meus-dados-${sufixo}.json`, conteudo: JSON.stringify({ exportado_em: new Date().toISOString(), periodo_desde: desde ?? null, perfil, ...dados }, null, 2), linhas: n }];
  }
  const out: Arquivo[] = [];
  for (const c of categorias)
    for (const [nome, sql, cd] of CONSULTAS[c]) {
      const linhas = consultar(sql, cd, desde);
      if (linhas.length) out.push({ nome: `${nome}-${sufixo}.csv`, conteudo: csv(linhas), linhas: linhas.length });
    }
  return out;
}
