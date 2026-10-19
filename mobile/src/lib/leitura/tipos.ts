/** Formato comum dos dados lidos, venham da IA (servidor) ou do reconhecimento no aparelho. */
export type Alvo = 'treino' | 'dieta' | 'bio' | 'rotulo';
export type Provedor = 'claude' | 'gemini' | 'openai';

export type LidoTreino = {
  nome_plano: string | null;
  treinos: {
    nome: string | null;
    itens: {
      exercicio: string;
      aerobico: boolean;
      series: number | null;
      reps_min: number | null;
      reps_max: number | null;
      carga_kg: number | null;
      duracao_min: number | null;
      observacao: string | null;
      duvida: boolean;
    }[];
  }[];
};

export type LidoDieta = {
  nome: string | null;
  refeicoes: { nome: string; horario: string | null; itens: { alimento: string; quantidade_g: number | null; medida: string | null; duvida: boolean }[] }[];
};

export type LidoBio = {
  data: string | null;
  peso_kg: number | null;
  cintura_cm: number | null;
  gordura_pct: number | null;
  musculo_esqueletico_pct: number | null;
  metabolismo_repouso_kcal: number | null;
  idade_biologica: number | null;
  gordura_visceral_nivel: number | null;
};

export type LidoRotulo = {
  nome: string | null;
  marca: string | null;
  porcao_g: number | null;
  medida_caseira: string | null;
  por_porcao: { energia_kcal: number | null; proteina_g: number | null; carboidrato_g: number | null; gordura_g: number | null; fibra_g: number | null; sodio_mg: number | null };
};

export type Lido = { treino: LidoTreino; dieta: LidoDieta; bio: LidoBio; rotulo: LidoRotulo };

export type Arquivo = { uri: string; mime: string; nome: string };

export type Leitura<A extends Alvo = Alvo> = {
  alvo: A;
  dados: Lido[A];
  /** 'ia' = servidor com IA; 'aparelho' = reconhecimento de texto no celular, sem internet. */
  via: 'ia' | 'aparelho';
  provedor?: Provedor;
  modelo?: string;
  arquivo: Arquivo;
  importacaoId: string;
};
