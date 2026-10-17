/**
 * Esquema do banco local (modelo-de-dados.md). Cada migração roda uma vez,
 * controlada pelo PRAGMA user_version. Nunca altere uma migração já publicada:
 * crie a próxima da lista.
 */
const AUD = `criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, excluido_em TEXT`;
const USU = `usuario_id TEXT NOT NULL`;

const V1 = `
CREATE TABLE usuario (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('feminino','masculino')),
  altura_cm REAL NOT NULL CHECK (altura_cm > 0),
  meta_calorias_kcal INTEGER,
  ciclo_ativo INTEGER NOT NULL DEFAULT 0 CHECK (ciclo_ativo IN (0,1) AND (ciclo_ativo = 0 OR sexo = 'feminino')),
  ${AUD}
);

CREATE TABLE bioimpedancia (
  id TEXT PRIMARY KEY, ${USU},
  data TEXT NOT NULL,
  peso_kg REAL NOT NULL CHECK (peso_kg > 0),
  cintura_cm REAL,
  gordura_pct REAL CHECK (gordura_pct BETWEEN 0 AND 100),
  musculo_esqueletico_pct REAL CHECK (musculo_esqueletico_pct BETWEEN 0 AND 100),
  metabolismo_repouso_kcal INTEGER CHECK (metabolismo_repouso_kcal > 0),
  idade_biologica INTEGER,
  gordura_visceral_nivel INTEGER CHECK (gordura_visceral_nivel BETWEEN 1 AND 30),
  importacao_id TEXT,
  ${AUD}
);

CREATE TABLE registro_peso (
  id TEXT PRIMARY KEY, ${USU},
  data TEXT NOT NULL,
  peso_kg REAL NOT NULL CHECK (peso_kg > 0),
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','bioimpedancia','integracao')),
  bioimpedancia_id TEXT REFERENCES bioimpedancia(id),
  ${AUD}
);
CREATE INDEX ix_peso_data ON registro_peso(data);

CREATE TABLE exercicio (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  nome TEXT NOT NULL,
  grupo_muscular TEXT NOT NULL,
  grupos_secundarios TEXT,
  equipamento TEXT,
  instrucoes TEXT,
  midia_uri TEXT,
  codigo_met TEXT,
  fonte TEXT NOT NULL CHECK (fonte IN ('base_aberta','usuario')),
  id_externo TEXT,
  ${AUD}
);

CREATE TABLE importacao (
  id TEXT PRIMARY KEY, ${USU},
  alvo TEXT NOT NULL CHECK (alvo IN ('plano_treino','dieta','bioimpedancia','alimento_rotulo')),
  formato TEXT NOT NULL CHECK (formato IN ('foto','pdf')),
  arquivo_uri TEXT,
  status TEXT NOT NULL CHECK (status IN ('processando','aguardando_revisao','confirmada','descartada','erro')),
  resultado_json TEXT,
  ${AUD}
);

CREATE TABLE plano_treino (
  id TEXT PRIMARY KEY, ${USU},
  nome TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  autor_id TEXT,
  importacao_id TEXT REFERENCES importacao(id),
  ${AUD}
);

CREATE TABLE treino_modelo (
  id TEXT PRIMARY KEY, ${USU},
  plano_treino_id TEXT NOT NULL REFERENCES plano_treino(id),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  ${AUD}
);

CREATE TABLE treino_modelo_item (
  id TEXT PRIMARY KEY, ${USU},
  treino_modelo_id TEXT NOT NULL REFERENCES treino_modelo(id),
  exercicio_id TEXT REFERENCES exercicio(id),
  tipo_aerobico TEXT,
  ordem INTEGER NOT NULL,
  series_previstas INTEGER CHECK (series_previstas > 0),
  reps_min INTEGER,
  reps_max INTEGER,
  carga_prevista_kg REAL,
  duracao_prevista_min REAL,
  observacao TEXT,
  ${AUD},
  CHECK (exercicio_id IS NOT NULL OR tipo_aerobico IS NOT NULL)
);

CREATE TABLE sessao_treino (
  id TEXT PRIMARY KEY, ${USU},
  treino_modelo_id TEXT REFERENCES treino_modelo(id),
  inicio TEXT NOT NULL,
  fim TEXT,
  status TEXT NOT NULL CHECK (status IN ('em_andamento','pausada','concluida','parcial')),
  pausada_em TEXT,
  segundos_pausada INTEGER NOT NULL DEFAULT 0,
  calorias_gastas_kcal INTEGER,
  origem_gasto TEXT CHECK (origem_gasto IN ('estimativa','integracao')),
  ${AUD}
);
CREATE INDEX ix_sessao_inicio ON sessao_treino(inicio);

CREATE TABLE sessao_exercicio (
  id TEXT PRIMARY KEY, ${USU},
  sessao_treino_id TEXT NOT NULL REFERENCES sessao_treino(id),
  exercicio_id TEXT NOT NULL REFERENCES exercicio(id),
  treino_modelo_item_id TEXT REFERENCES treino_modelo_item(id),
  ordem INTEGER NOT NULL,
  ${AUD}
);
CREATE INDEX ix_sessao_ex ON sessao_exercicio(sessao_treino_id);
CREATE INDEX ix_sessao_ex_exercicio ON sessao_exercicio(exercicio_id);

CREATE TABLE serie (
  id TEXT PRIMARY KEY, ${USU},
  sessao_exercicio_id TEXT NOT NULL REFERENCES sessao_exercicio(id),
  numero INTEGER NOT NULL,
  carga_kg REAL NOT NULL CHECK (carga_kg >= 0),
  repeticoes INTEGER NOT NULL CHECK (repeticoes > 0),
  ${AUD}
);
CREATE INDEX ix_serie ON serie(sessao_exercicio_id);

CREATE TABLE sessao_aerobico (
  id TEXT PRIMARY KEY, ${USU},
  sessao_treino_id TEXT REFERENCES sessao_treino(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('esteira','bicicleta','eliptico','corrida_rua','caminhada','outro')),
  inicio TEXT NOT NULL,
  duracao_min REAL NOT NULL CHECK (duracao_min > 0),
  distancia_km REAL,
  intensidade_escala TEXT CHECK (intensidade_escala IN ('leve','moderada','intensa')),
  intensidade_pse INTEGER CHECK (intensidade_pse BETWEEN 1 AND 10),
  fc_media_bpm INTEGER,
  inclinacao_pct REAL,
  nivel_carga REAL,
  calorias_gastas_kcal INTEGER,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','apple_saude','health_connect')),
  id_externo TEXT,
  editado_pelo_usuario INTEGER NOT NULL DEFAULT 0,
  ${AUD}
);
CREATE INDEX ix_aerobico_inicio ON sessao_aerobico(inicio);

CREATE TABLE meta (
  id TEXT PRIMARY KEY, ${USU},
  tipo TEXT NOT NULL CHECK (tipo IN ('carga','frequencia','peso','dieta')),
  exercicio_id TEXT REFERENCES exercicio(id),
  carga_alvo_kg REAL,
  treinos_semana INTEGER,
  aerobicos_semana INTEGER,
  peso_alvo_kg REAL,
  peso_inicial_kg REAL,
  dias_dieta_alvo INTEGER,
  data_inicio TEXT NOT NULL,
  prazo TEXT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','atingida','cancelada')),
  atingida_em TEXT,
  ${AUD},
  CHECK (tipo <> 'carga' OR (exercicio_id IS NOT NULL AND carga_alvo_kg IS NOT NULL)),
  CHECK (tipo <> 'frequencia' OR (treinos_semana IS NOT NULL OR aerobicos_semana IS NOT NULL)),
  CHECK (tipo <> 'peso' OR peso_alvo_kg IS NOT NULL),
  CHECK (tipo <> 'dieta' OR dias_dieta_alvo IS NOT NULL)
);

CREATE TABLE nutriente (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL CHECK (unidade IN ('kcal','g','mg','mcg')),
  categoria TEXT NOT NULL CHECK (categoria IN ('energia','macro','micro')),
  recomendado_dia REAL,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE alimento (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  nome TEXT NOT NULL,
  marca TEXT,
  fonte TEXT NOT NULL CHECK (fonte IN ('tbca','base_app','open_food_facts','rotulo','manual')),
  codigo_tbca TEXT UNIQUE,
  codigo_barras TEXT UNIQUE,
  porcao_padrao_g REAL,
  medida_caseira TEXT,
  ${AUD}
);
CREATE INDEX ix_alimento_nome ON alimento(nome);

CREATE TABLE alimento_nutriente (
  alimento_id TEXT NOT NULL REFERENCES alimento(id),
  nutriente_id TEXT NOT NULL REFERENCES nutriente(id),
  valor_por_100g REAL NOT NULL CHECK (valor_por_100g >= 0),
  PRIMARY KEY (alimento_id, nutriente_id)
);

CREATE TABLE dieta (
  id TEXT PRIMARY KEY, ${USU},
  nome TEXT NOT NULL,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0,1)),
  autor_id TEXT,
  importacao_id TEXT REFERENCES importacao(id),
  ${AUD}
);

CREATE TABLE refeicao_modelo (
  id TEXT PRIMARY KEY, ${USU},
  dieta_id TEXT NOT NULL REFERENCES dieta(id),
  nome TEXT NOT NULL,
  horario TEXT,
  ordem INTEGER NOT NULL,
  ${AUD}
);

CREATE TABLE refeicao_modelo_item (
  id TEXT PRIMARY KEY, ${USU},
  refeicao_modelo_id TEXT NOT NULL REFERENCES refeicao_modelo(id),
  alimento_id TEXT NOT NULL REFERENCES alimento(id),
  quantidade_g REAL NOT NULL CHECK (quantidade_g > 0),
  ${AUD}
);

CREATE TABLE consumo (
  id TEXT PRIMARY KEY, ${USU},
  data TEXT NOT NULL,
  horario TEXT,
  refeicao_modelo_item_id TEXT REFERENCES refeicao_modelo_item(id),
  refeicao_nome TEXT,
  alimento_id TEXT NOT NULL REFERENCES alimento(id),
  quantidade_g REAL NOT NULL CHECK (quantidade_g > 0),
  ${AUD}
);
CREATE INDEX ix_consumo_data ON consumo(data);

CREATE TABLE ciclo_menstrual (
  id TEXT PRIMARY KEY, ${USU},
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  intensidade_fluxo TEXT CHECK (intensidade_fluxo IN ('leve','moderado','intenso')),
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','apple_saude','health_connect')),
  id_externo TEXT,
  ${AUD},
  CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE TABLE sintoma_ciclo (
  id TEXT PRIMARY KEY, ${USU},
  ciclo_menstrual_id TEXT NOT NULL REFERENCES ciclo_menstrual(id),
  data TEXT NOT NULL,
  sintoma TEXT NOT NULL CHECK (sintoma IN ('colica','fadiga','dor_cabeca','inchaco','outro')),
  ${AUD}
);

CREATE TABLE integracao (
  id TEXT PRIMARY KEY, ${USU},
  provedor TEXT NOT NULL UNIQUE CHECK (provedor IN ('apple_saude','health_connect')),
  ativa INTEGER NOT NULL DEFAULT 0,
  ultima_sincronizacao TEXT,
  ${AUD}
);

CREATE TABLE gasto_ativo_diario (
  id TEXT PRIMARY KEY, ${USU},
  data TEXT NOT NULL,
  energia_ativa_kcal INTEGER NOT NULL CHECK (energia_ativa_kcal >= 0),
  origem TEXT NOT NULL CHECK (origem IN ('apple_saude','health_connect')),
  sincronizado_em TEXT,
  ${AUD},
  UNIQUE (usuario_id, data, origem)
);

-- Preferências locais do aparelho (tema, unidades, consentimento). Não sobem para a nuvem.
CREATE TABLE preferencia (
  chave TEXT PRIMARY KEY,
  valor TEXT
);
`;

export const MIGRACOES: string[] = [V1];
