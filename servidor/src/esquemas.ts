/**
 * O que a IA deve devolver para cada tipo de importação. Os mesmos esquemas valem para os três provedores
 * (Claude por ferramenta, Gemini por responseSchema e GPT por json_schema estrito).
 * Regra: campos que não aparecem no documento vêm como null, nunca inventados.
 */
export type Alvo = 'treino' | 'dieta' | 'bio' | 'rotulo';

type Schema = Record<string, unknown>;
const num = { type: ['number', 'null'] };
const int = { type: ['integer', 'null'] };
const str = { type: ['string', 'null'] };
const obj = (properties: Record<string, Schema>): Schema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items: Schema): Schema => ({ type: 'array', items });

export const ESQUEMAS: Record<Alvo, Schema> = {
  treino: obj({
    nome_plano: str,
    treinos: arr(
      obj({
        nome: str,
        itens: arr(
          obj({
            exercicio: { type: 'string' },
            aerobico: { type: 'boolean' },
            series: int,
            reps_min: int,
            reps_max: int,
            carga_kg: num,
            duracao_min: num,
            observacao: str,
            duvida: { type: 'boolean' },
          }),
        ),
      }),
    ),
  }),
  dieta: obj({
    nome: str,
    refeicoes: arr(
      obj({
        nome: { type: 'string' },
        horario: str,
        itens: arr(obj({ alimento: { type: 'string' }, quantidade_g: num, medida: str, duvida: { type: 'boolean' } })),
      }),
    ),
  }),
  bio: obj({
    data: str,
    peso_kg: num,
    cintura_cm: num,
    gordura_pct: num,
    musculo_esqueletico_pct: num,
    metabolismo_repouso_kcal: num,
    idade_biologica: num,
    gordura_visceral_nivel: num,
  }),
  rotulo: obj({
    nome: str,
    marca: str,
    porcao_g: num,
    medida_caseira: str,
    por_porcao: obj({ energia_kcal: num, proteina_g: num, carboidrato_g: num, gordura_g: num, fibra_g: num, sodio_mg: num }),
  }),
};

const BASE =
  'Você lê documentos em português do Brasil para um app de treino e dieta. Responda só com os dados pedidos. ' +
  'Nunca invente: o que não estiver legível ou não existir no documento fica null. Use ponto como separador decimal.';

export const INSTRUCOES: Record<Alvo, string> = {
  treino:
    `${BASE} O documento é uma ficha de treino de academia. Separe cada treino (A, B, C, ou dias da semana) e liste os exercícios na ordem. ` +
    'Para "4x10" use series=4, reps_min=10, reps_max=10; para "3x8-12" ou "3x8 a 12" use reps_min=8, reps_max=12. ' +
    'Aeróbicos (esteira, bike, elíptico, corrida, caminhada) têm aerobico=true e duracao_min quando houver. ' +
    'Escreva o nome do exercício por extenso em português (ex.: "Supino reto com barra"). Marque duvida=true quando a leitura for incerta. ' +
    'Em "nome" do treino, use o grupo muscular ou o título (ex.: "Peito e tríceps"), sem a letra.',
  dieta:
    `${BASE} O documento é um plano alimentar de nutricionista. Liste as refeições na ordem do dia, com horário no formato HH:MM quando houver. ` +
    'Em cada alimento, converta a quantidade para gramas em quantidade_g quando for possível com segurança (ml de líquido = g); ' +
    'guarde a medida original em "medida" (ex.: "2 fatias", "1 concha"). Quando houver opções ("ou"), use só a primeira e marque duvida=true.',
  bio:
    `${BASE} O documento é um laudo de bioimpedância. Data no formato AAAA-MM-DD. "Massa muscular" em kg não é músculo esquelético em %: ` +
    'só preencha musculo_esqueletico_pct se o laudo der a porcentagem. Metabolismo basal/em repouso em kcal. "Idade metabólica" = idade_biologica.',
  rotulo:
    `${BASE} A imagem é a tabela nutricional de uma embalagem. Use os valores POR PORÇÃO (não os de %VD). porcao_g é o tamanho da porção em gramas ` +
    '(ou ml). medida_caseira é o texto entre parênteses da porção (ex.: "1 unidade"). Nome e marca só se aparecerem.',
};
