/**
 * Notificações locais (RF56–RF63) com expo-notifications: lê o estado do app, agenda os lembretes e
 * dispara os alertas na hora. Tudo no aparelho, sem servidor.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { aoMudar, hojeIso } from '@/db/conexao';
import { dietaAtiva, resumoDoDia } from '@/db/dieta';
import { metas, progresso } from '@/db/metas';
import { bios, definirPref, faseEm, pesoAtual, pref, usuario } from '@/db/perfil';
import { planoAtivo } from '@/db/treino';

import { alertasImediatos, completarConfig, planejar, type Agendada, type ConfigNotificacoes, type EstadoNotificacoes } from './planejar';

export * from './planejar';

type N = typeof import('expo-notifications');

/** O módulo nativo pode não existir (web) — nesse caso as notificações simplesmente não rodam. */
function modulo(): N | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as N;
  } catch {
    return null;
  }
}

/* ---------- Preferências ---------- */

export function configNotificacoes(): ConfigNotificacoes {
  try {
    return completarConfig(JSON.parse(pref('notificacoes') ?? 'null'));
  } catch {
    return completarConfig(null);
  }
}

export function salvarConfigNotificacoes(c: ConfigNotificacoes) {
  definirPref('notificacoes', JSON.stringify(c));
}

/* ---------- Permissão ---------- */

export type StatusPermissao = 'concedida' | 'negada' | 'pendente' | 'indisponivel';

export async function statusPermissao(): Promise<StatusPermissao> {
  const n = modulo();
  if (!n) return 'indisponivel';
  try {
    const p = await n.getPermissionsAsync();
    return p.granted ? 'concedida' : p.canAskAgain ? 'pendente' : 'negada';
  } catch {
    return 'indisponivel';
  }
}

export async function pedirPermissao(): Promise<StatusPermissao> {
  const n = modulo();
  if (!n) return 'indisponivel';
  const p = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  if (p.granted) await reagendar();
  return p.granted ? 'concedida' : 'negada';
}

/* ---------- Estado do app → plano ---------- */

export function estadoAtual(agora = new Date()): EstadoNotificacoes {
  const hoje = hojeIso(agora);
  const u = usuario();
  return {
    config: configNotificacoes(),
    agora,
    hoje,
    planoTreino: planoAtivo()?.nome ?? null,
    refeicoes: dietaAtiva()?.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario })) ?? [],
    ultimoPeso: pesoAtual()?.data ?? null,
    ultimaBio: bios()[0]?.data ?? null,
    metasComPrazo: metas('ativa')
      .filter((m) => m.prazo)
      .map((m) => ({ id: m.id, nome: progresso(m, hoje).titulo, prazo: m.prazo! })),
    cicloAtivo: !!u?.ciclo_ativo,
    proximaMenstruacao: faseEm(hoje)?.proxima ?? null,
  };
}

const CANAL = 'lembretes';

function gatilho(n: N, a: Agendada): import('expo-notifications').NotificationTriggerInput {
  const T = n.SchedulableTriggerInputTypes;
  const canal = Platform.OS === 'android' ? { channelId: CANAL } : {};
  if (a.gatilho.tipo === 'semanal') return { type: T.WEEKLY, weekday: a.gatilho.diaSemana, hour: a.gatilho.hora, minute: a.gatilho.minuto, ...canal };
  if (a.gatilho.tipo === 'diario') return { type: T.DAILY, hour: a.gatilho.hora, minute: a.gatilho.minuto, ...canal };
  return { type: T.DATE, date: a.gatilho.quando, ...canal };
}

let preparado = false;
async function preparar(n: N) {
  if (preparado) return;
  preparado = true;
  // Com o app aberto, mostra o aviso no topo como faria fora dele.
  n.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  if (Platform.OS === 'android') await n.setNotificationChannelAsync(CANAL, { name: 'Lembretes', importance: n.AndroidImportance.DEFAULT });
}

/** Refaz todos os lembretes a partir do estado atual (é barato: são poucos). */
export async function reagendar(): Promise<Agendada[]> {
  const n = modulo();
  if (!n || (await statusPermissao()) !== 'concedida') return [];
  await preparar(n);
  const plano = planejar(estadoAtual());
  await n.cancelAllScheduledNotificationsAsync();
  for (const a of plano) {
    await n.scheduleNotificationAsync({ identifier: a.id, content: { title: a.titulo, body: a.corpo, data: { rota: a.rota } }, trigger: gatilho(n, a) }).catch(() => {});
  }
  return plano;
}

/* ---------- Alertas na hora (RF58, RF59) ---------- */

const AVISADOS = 'notificacoes_avisados';

export async function verificarAlertas() {
  const n = modulo();
  if (!n || (await statusPermissao()) !== 'concedida') return;
  const hoje = hojeIso();
  const r = resumoDoDia(hoje);
  let avisados: string[] = [];
  try {
    avisados = JSON.parse(pref(AVISADOS) ?? '[]');
  } catch {
    avisados = [];
  }
  const ativas = metas('ativa').filter((m) => m.tipo !== 'frequencia' && progresso(m, hoje).p >= 1);
  const hojeAtingidas = metas('atingida').filter((m) => m.atingida_em === hoje);
  const alertas = alertasImediatos({
    config: configNotificacoes(),
    hoje,
    kcalHoje: r.kcal,
    metaKcal: r.meta,
    metasAtingidas: [...ativas, ...hojeAtingidas].map((m) => ({ id: m.id, nome: progresso(m, hoje).titulo })),
    avisados: new Set(avisados),
  });
  if (!alertas.length) return;
  await preparar(n);
  for (const a of alertas) await n.scheduleNotificationAsync({ content: { title: a.titulo, body: a.corpo, data: { rota: a.rota } }, trigger: null }).catch(() => {});
  definirPref(AVISADOS, JSON.stringify([...avisados, ...alertas.map((a) => a.chave)].slice(-300)));
}

/* ---------- Ligação com o app ---------- */

/**
 * Mantém os lembretes em dia: ao abrir, ao voltar para o app e alguns segundos depois de cada
 * gravação (treino, refeição, peso, metas…). Tocar numa notificação abre a tela certa.
 */
export function useNotificacoes(pronto: boolean) {
  useEffect(() => {
    const n = modulo();
    if (!pronto || !n) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const atualizar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        verificarAlertas().catch(() => {});
        reagendar().catch(() => {});
      }, 2500);
    };
    atualizar();
    const pararDb = aoMudar(atualizar);
    const app = AppState.addEventListener('change', (s) => s === 'active' && atualizar());
    const abrir = (rota: unknown) => {
      if (typeof rota !== 'string') return;
      n.clearLastNotificationResponse();
      setTimeout(() => router.push(rota as never), 300);
    };
    const toque = n.addNotificationResponseReceivedListener((r) => abrir(r.notification.request.content.data?.rota));
    // App aberto pela notificação estando fechado.
    const ultima = n.getLastNotificationResponse();
    if (ultima) abrir(ultima.notification.request.content.data?.rota);
    return () => {
      if (timer) clearTimeout(timer);
      pararDb();
      app.remove();
      toque.remove();
    };
  }, [pronto]);
}
