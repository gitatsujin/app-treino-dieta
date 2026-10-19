/**
 * Apple Saúde / Health Connect: conectar, sincronizar e sincronizar sozinho ao abrir o app.
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { usuario } from '@/db/perfil';

import { appleSaude } from './apple';
import { healthConnect } from './healthconnect';
import { aplicarDadosSaude, ativarIntegracao, integracaoAtiva, type ResumoSincronizacao } from './sincronizar';
import type { AdaptadorSaude } from './tipos';

export * from './sincronizar';
export type { ProvedorSaude } from './tipos';

export const adaptadorSaude: AdaptadorSaude | null = Platform.OS === 'ios' ? appleSaude : Platform.OS === 'android' ? healthConnect : null;
export const NOME_SAUDE = Platform.OS === 'android' ? 'Health Connect' : 'Apple Saúde';

const lerCiclo = () => !!usuario()?.ciclo_ativo;

/** Primeira leitura traz os últimos 60 dias; depois, desde a última (com 2 dias de folga para dados atrasados). */
const DIAS_INICIAIS = 60;

export async function saudeDisponivel() {
  return !!adaptadorSaude && (await adaptadorSaude.disponivel());
}

/** Pede a permissão do sistema, liga a integração e já faz a primeira leitura. */
export async function conectarSaude(): Promise<ResumoSincronizacao> {
  const a = adaptadorSaude;
  if (!a || !(await a.disponivel())) throw new Error(Platform.OS === 'android' ? 'Instale ou atualize o Health Connect pela Play Store.' : 'O Apple Saúde não está disponível neste aparelho.');
  const ok = await a.conectar(lerCiclo());
  if (!ok) throw new Error('A permissão não foi concedida.');
  ativarIntegracao(a.provedor);
  return sincronizarSaude(true);
}

let emAndamento: Promise<ResumoSincronizacao> | null = null;

export function sincronizarSaude(completa = false): Promise<ResumoSincronizacao> {
  if (emAndamento) return emAndamento;
  const i = integracaoAtiva();
  const a = adaptadorSaude;
  if (!i || !a || a.provedor !== i.provedor) return Promise.reject(new Error('Integração desligada.'));
  const ate = new Date();
  const desde = !completa && i.ultima_sincronizacao ? new Date(new Date(i.ultima_sincronizacao).getTime() - 2 * 86_400_000) : new Date(ate.getTime() - DIAS_INICIAIS * 86_400_000);
  desde.setHours(0, 0, 0, 0);
  const ciclo = lerCiclo();
  emAndamento = a
    .ler(desde, ate, ciclo)
    .then((dados) => aplicarDadosSaude(a.provedor, dados, { lerCiclo: ciclo }))
    .finally(() => {
      emAndamento = null;
    });
  return emAndamento;
}

/** Sincroniza ao abrir o app e ao voltar para ele, no máximo a cada 10 minutos. */
export function useSincronizacaoSaude(pronto: boolean) {
  useEffect(() => {
    if (!pronto || !adaptadorSaude) return;
    let ultima = 0;
    const tentar = () => {
      if (!integracaoAtiva() || Date.now() - ultima < 10 * 60_000) return;
      ultima = Date.now();
      sincronizarSaude().catch(() => {});
    };
    tentar();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tentar());
    return () => sub.remove();
  }, [pronto]);
}
