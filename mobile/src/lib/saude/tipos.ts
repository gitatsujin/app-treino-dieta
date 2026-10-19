/**
 * Integração com Apple Saúde (iOS) e Health Connect (Android) — RF44, RF45, RF55, RN11, RN13.
 * Cada plataforma tem um adaptador que devolve os dados neste formato comum; a gravação no banco
 * (sincronizar.ts) não sabe de onde vieram.
 */
import type { TipoAerobico } from '@/lib/calculos';

export type ProvedorSaude = 'apple_saude' | 'health_connect';

/** Treino gravado no app de saúde (normalmente pelo relógio). */
export type TreinoExterno = {
  id: string;
  /** 'aerobico' vira um registro de aeróbico; 'forca' só empresta as calorias à sessão do app no mesmo horário. */
  categoria: 'aerobico' | 'forca';
  tipo: TipoAerobico;
  /** Nome legível do tipo original (ex.: "Corrida", "HIIT"). */
  nome: string;
  inicio: Date;
  fim: Date;
  duracao_min: number;
  distancia_km: number | null;
  calorias_kcal: number | null;
  fc_media_bpm: number | null;
  /** Nome do app ou aparelho que gravou (ex.: "Apple Watch de Brenno"). */
  fonte: string | null;
};

export type PesoExterno = { id: string; data: string; kg: number; quando: Date };

/** Um dia com menstruação registrada no app de saúde. */
export type DiaMenstruacao = { data: string; fluxo: 'leve' | 'moderado' | 'intenso' | null };

export type DadosSaude = {
  /** Energia ativa por dia (sem o metabolismo basal), já somada pelo app de saúde sem duplicar fontes. */
  energia: { data: string; kcal: number }[];
  treinos: TreinoExterno[];
  pesos: PesoExterno[];
  menstruacao: DiaMenstruacao[];
};

export interface AdaptadorSaude {
  provedor: ProvedorSaude;
  nome: string;
  /** O módulo nativo existe e o app de saúde está disponível neste aparelho. */
  disponivel(): Promise<boolean>;
  /** Mostra o pedido de permissão do sistema. */
  conectar(lerCiclo: boolean): Promise<boolean>;
  ler(desde: Date, ate: Date, lerCiclo: boolean): Promise<DadosSaude>;
  /** Abre a tela do sistema onde o usuário revê as permissões. */
  abrirAjustes(): void;
}
